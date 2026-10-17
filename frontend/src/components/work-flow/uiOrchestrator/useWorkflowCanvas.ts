import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useCreateNodeMutation,
  useDeleteNodeMutation,
  useGetWorkflowNodesQuery,
  useUpdateNodeMutation,
} from "../apiIntegrations/workflowApi";
import { BUILT_IN_TOOLS, WORKFLOW_APPS } from "@/src/constants/intigrationApp.constants";
import { getIntegration } from "./registry";
import type { WorkflowEvent, WorkflowNodeData } from "./types";
import type { NodePanels } from "./useNodePanels";
import {
  createBlankActionNode,
  createDefaultNodes,
  describeNode,
  findTriggerNode,
  getTriggerSamplePayload,
  isPersistedNodeId,
  keepUnsavedTestData,
  mapBackendNodeToCanvas,
  reindexNodes,
  toSnakeCaseKey,
  toVariablePickerItems,
} from "./workflowNode.utils";

export interface SelectedApp {
  label: string;
  icon: WorkflowNodeData["appIcon"];
  color: string;
}

const ALL_APPS = [...WORKFLOW_APPS, ...BUILT_IN_TOOLS];

function findAppEvents(appLabel: string | undefined): WorkflowEvent[] {
  if (!appLabel) return [];
  const normalizedLabel = appLabel.toLowerCase();
  return ALL_APPS.find((app) => app.label.toLowerCase() === normalizedLabel)?.events ?? [];
}

/** Applies an app choice to a node; switching apps clears the previous event and config. */
function withSelectedApp(node: WorkflowNodeData, app: SelectedApp): WorkflowNodeData {
  const isChangingApp = Boolean(node.appLabel);
  return {
    ...node,
    appLabel: app.label,
    appIcon: app.icon,
    appColor: app.color,
    integrationType: toSnakeCaseKey(app.label),
    label: app.label,
    description: describeNode(node.type, app.label),
    ...(isChangingApp ? { eventLabel: undefined, config: {} } : {}),
  };
}

/** The nodes on the canvas: loaded from the server, edited locally, saved per action. */
export function useWorkflowCanvas(workflowId: string | null, userId: string, panels: NodePanels) {
  const [nodes, setNodes] = useState<WorkflowNodeData[]>(createDefaultNodes);
  const [nodesWorkflowId, setNodesWorkflowId] = useState(workflowId);
  const { activeNodeId, setActiveNodeId, openNode, showStepSidebar, closePanels } = panels;

  // Switching workflow resets the canvas during render (no flash of the previous workflow's nodes)
  if (workflowId !== nodesWorkflowId) {
    setNodesWorkflowId(workflowId);
    setNodes(createDefaultNodes());
    closePanels();
  }

  const { data: serverNodesResponse } = useGetWorkflowNodesQuery(workflowId ?? "", { skip: !workflowId });
  const [createNodeRequest] = useCreateNodeMutation();
  const [updateNodeRequest] = useUpdateNodeMutation();
  const [deleteNodeRequest] = useDeleteNodeMutation();

  useEffect(() => {
    const serverNodes = serverNodesResponse?.data;
    // An empty workflow keeps the blank default canvas
    if (!serverNodes || serverNodes.length === 0) return;
    const canvasNodes = serverNodes.map(mapBackendNodeToCanvas);
    setNodes((previousNodes) => keepUnsavedTestData(canvasNodes, previousNodes));
  }, [serverNodesResponse]);

  const activeNode = nodes.find((node) => node.id === activeNodeId);
  const activeDescriptor = getIntegration(activeNode?.appLabel);
  const events = useMemo(() => findAppEvents(activeNode?.appLabel), [activeNode?.appLabel]);

  // Action nodes map fields from the trigger's sample payload
  const triggerFields = useMemo(() => {
    const samplePayload = getTriggerSamplePayload(findTriggerNode(nodes));
    const isRecord = typeof samplePayload === "object" && samplePayload !== null && !Array.isArray(samplePayload);
    return isRecord ? toVariablePickerItems(samplePayload as Record<string, unknown>) : [];
  }, [nodes]);

  const replaceNodeId = useCallback((localId: string, backendId: string) => {
    setNodes((previousNodes) => previousNodes.map((node) => (node.id === localId ? { ...node, id: backendId } : node)));
    setActiveNodeId((currentId) => (currentId === localId ? backendId : currentId));
  }, [setActiveNodeId]);

  /** Creates the node on the backend and swaps its local placeholder id for the real one. */
  const saveNewNode = useCallback(
    async (node: WorkflowNodeData) => {
      if (!workflowId) return;
      const { data: savedNode } = await createNodeRequest({
        workflow_id: workflowId,
        type: node.type,
        node_category: node.type,
        integration_key: node.integrationType ?? "",
        action_key: node.eventLabel ? toSnakeCaseKey(node.eventLabel) : "",
        config: node.config ?? {},
        position: node.index,
        user_id: userId,
      }).unwrap();
      replaceNodeId(node.id, savedNode.id);
    },
    [workflowId, userId, createNodeRequest, replaceNodeId]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = nodes.find((candidateNode) => candidateNode.id === nodeId);
      if (node) openNode(node);
    },
    [nodes, openNode]
  );

  const handleAppSelect = useCallback(
    async (nodeId: string, app: SelectedApp) => {
      const existingNode = nodes.find((node) => node.id === nodeId);
      if (!existingNode) return;
      const updatedNode = withSelectedApp(existingNode, app);
      setNodes((previousNodes) => previousNodes.map((node) => (node.id === nodeId ? updatedNode : node)));
      showStepSidebar();

      try {
        if (isPersistedNodeId(nodeId)) {
          await updateNodeRequest({
            id: nodeId,
            patch: { integration_key: updatedNode.integrationType, action_key: "", config: {} },
          }).unwrap();
        } else {
          await saveNewNode(updatedNode);
        }
      } catch {
        // The step's Continue saves again and reports failures; keep the user's choice on the canvas
      }
    },
    [nodes, showStepSidebar, updateNodeRequest, saveNewNode]
  );

  const handleAddAction = useCallback(
    (afterIndex: number) => {
      const newNode = createBlankActionNode(afterIndex + 1);
      setNodes((previousNodes) => {
        const withNewNode = [...previousNodes];
        withNewNode.splice(afterIndex, 0, newNode);
        return reindexNodes(withNewNode);
      });
      openNode(newNode);
    },
    [openNode]
  );

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((candidateNode) => candidateNode.id === nodeId);
      if (!node || node.type === "trigger") return;

      setNodes((previousNodes) => reindexNodes(previousNodes.filter((remainingNode) => remainingNode.id !== nodeId)));
      if (activeNodeId === nodeId) closePanels();
      if (!isPersistedNodeId(nodeId)) return;

      try {
        await deleteNodeRequest(nodeId).unwrap();
      } catch {
        // Best effort: the node is already gone from the canvas
      }
    },
    [nodes, activeNodeId, closePanels, deleteNodeRequest]
  );

  const handleDuplicateNode = useCallback(
    async (nodeId: string) => {
      const nodePosition = nodes.findIndex((node) => node.id === nodeId);
      if (nodePosition === -1) return;
      const duplicateNode: WorkflowNodeData = { ...nodes[nodePosition], id: createBlankActionNode(0).id };

      setNodes((previousNodes) => {
        const withDuplicate = [...previousNodes];
        withDuplicate.splice(nodePosition + 1, 0, duplicateNode);
        return reindexNodes(withDuplicate);
      });

      if (!duplicateNode.appLabel) return;
      try {
        await saveNewNode({ ...duplicateNode, index: nodePosition + 2 });
      } catch {
        // Saved later when the user continues through its steps
      }
    },
    [nodes, saveNewNode]
  );

  const handleEventSelect = useCallback((nodeId: string, eventLabel: string) => {
    setNodes((previousNodes) => previousNodes.map((node) => (node.id === nodeId ? { ...node, eventLabel } : node)));
  }, []);

  const handleUpdateNodeData = useCallback((nodeId: string, configPatch: Record<string, unknown>) => {
    setNodes((previousNodes) =>
      previousNodes.map((node) => (node.id === nodeId ? { ...node, config: { ...node.config, ...configPatch } } : node))
    );
  }, []);

  /** Moves to the node after `currentNodeId`, appending a blank action when it was the last one. */
  const goToNextNode = useCallback(
    (currentNodeId: string) => {
      const currentPosition = nodes.findIndex((node) => node.id === currentNodeId);
      const nextNode = nodes[currentPosition + 1] ?? createBlankActionNode(nodes.length + 1);
      if (!nodes.includes(nextNode)) setNodes((previousNodes) => [...previousNodes, nextNode]);
      openNode(nextNode);
    },
    [nodes, openNode]
  );

  return {
    nodes,
    activeNode,
    activeDescriptor,
    events,
    triggerFields,
    handleNodeClick,
    handleAppSelect,
    handleAddAction,
    handleDeleteNode,
    handleDuplicateNode,
    handleEventSelect,
    handleUpdateNodeData,
    goToNextNode,
  };
}

export type WorkflowCanvas = ReturnType<typeof useWorkflowCanvas>;
