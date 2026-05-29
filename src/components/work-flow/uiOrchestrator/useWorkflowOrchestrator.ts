// new code redux store for workflow builder
"use client";

/**
 * useWorkflowOrchestrator
 * ─────────────────────────────────────────────────────────────
 * Single hook that drives all workflow-builder state + backend sync.
 *
 * Backend integration:
 *  • RTK Query for workflows list, create, update
 *  • RTK Query for node CRUD (create / update / delete)
 *  • RTK Query for executions list + detail
 *  • Local state for active selections and in-flight canvas state
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  setWorkflow,
  setWorkflowStatus,
  setNodes,
  addNode as addNodeAction,
  updateNode as updateNodeAction,
  deleteNode as deleteNodeAction,
  setActiveExecutionId,
  setActiveView,
} from "../store/workflowBuilderSlice";

import {
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,
  useActivateWorkflowMutation,
  useCreateNodeMutation,
  useUpdateNodeMutation,
  useDeleteNodeMutation,
  useGetExecutionsQuery,
  useGetExecutionDetailQuery,
  useTestWorkflowMutation,
  useGetWorkflowNodesQuery,
  useSaveMappingsMutation,
  useCreatePollingSubscriptionMutation,
  CreateMappingPayload,
} from "../apiIntegrations/workflowApi";
import {
  useGetFoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useAssignTagToWorkflowMutation,
  useRemoveTagFromWorkflowMutation,
} from "../apiIntegrations/folderTagApi";
import { useUpdateWebhookResponseMutation } from "../appEvents/webhook/apiIntegrations/webhookApi";

import { IntegrationApp, WorkflowEvent, WorkflowNodeData } from "./types";
import { getIntegration } from "./registry";

import { resolveIcon } from "@/src/lib/icon-registry";
import { toast } from "sonner";

const apps: IntegrationApp[] = WORKFLOW_APPS.map(a => ({ ...a, icon: resolveIcon(a.iconName) }));
const tools: IntegrationApp[] = BUILT_IN_TOOLS.map(t => ({ ...t, icon: resolveIcon(t.iconName) }));
import { ConfigStep } from "../components/event-sidebar/eventSidebar";
import { webhookEngine, getCachedWebhookData } from "@/src/components/work-flow/appEvents/webhook/apiIntegrations/webhook.engine";
import {
  getStoredWorkflowId,
  setStoredWorkflowId,
  getStoredActiveView,
  setStoredActiveView,
} from "./workflowStorage";
import { BUILT_IN_TOOLS, WORKFLOW_APPS } from "@/src/constants/intigrationApp.constants";
import { loadProfile, getActiveUserId } from "@/src/store/localStorage";
// ─────────────────────────────────────────────────────────────────────────────

/** The blank canvas shown when a workflow has no configured nodes yet */
const defaultNodes = (): WorkflowNodeData[] => [
  {
    id: "trigger",
    type: "trigger",
    nodeType: "trigger",
    index: 1,
    label: "Trigger",
    description: "Select the event that starts your workflow",
    config: {},
    status: "draft",
  },
  {
    id: "action-1",
    type: "action",
    nodeType: "action",
    index: 2,
    label: "Action",
    description: "Select the event for your zap to run",
    config: {},
    status: "draft",
  },
];

/**
 * Flattens a nested JSON object into an array of variable picker items.
 * e.g. { name: "John", address: { city: "NY" } }
 *   → [{ id:"name", label:"Name", description:"John" },
 *      { id:"address.city", label:"Address › City", description:"NY" }]
 */
function flattenPayload(
  obj: Record<string, any>,
  prefix = "",
  result: Array<{ id: string; label: string; description: string }> = []
): Array<{ id: string; label: string; description: string }> {
  if (!obj || typeof obj !== "object") return result;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    const readableLabel = path
      .split(".")
      .map((s) => s.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim())
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" › ");
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      flattenPayload(v, path, result);
    } else {
      result.push({ id: path, label: readableLabel, description: String(v ?? "") });
    }
  }
  return result;
}

/** Resolve all {{map:id|label|value}} tokens to their plain value and remove empty fields */
function resolveConfigForSave(config: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {};

  const walk = (obj: Record<string, any>) => {
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === "string") {
        const clean = val
          .replace(/\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g, (_, v) => v)
          .trim();
        if (clean !== "") resolved[key] = clean;
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        walk(val);
      } else if (val !== null && val !== undefined && val !== "") {
        resolved[key] = val;
      }
    }
  };

  walk(config);
  return resolved;
}

/** Build output_schema: destination field keys that have mapped tokens, all set to null */
function extractOutputSchema(config: Record<string, any>): Record<string, null> {
  const schema: Record<string, null> = {};

  const walk = (obj: Record<string, any>) => {
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === "string" && /\{\{map:[^|]*\|[^|]*\|[^}]*\}\}/.test(val)) {
        schema[key] = null;
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        walk(val);
      }
    }
  };

  walk(config);
  return schema;
}

/** Convert A-Z, AA, AB … index to a letter label */
const indexToLabel = (n: number): string => {
  let label = "";
  let idx = n;
  while (idx >= 0) {
    label = String.fromCharCode(65 + (idx % 26)) + label;
    idx = Math.floor(idx / 26) - 1;
  }
  return label;
};
export function useWorkflowOrchestrator() {
  const dispatch = useAppDispatch();

  const isAdmin = useMemo(() => {
    const role = loadProfile()?.role ?? "";
    return role.toLowerCase() === "admin";
  }, []);

  // ── Redux slice state ──────────────────────────────────────────────────────
  const sliceWorkflow = useAppSelector((s) => s.workflowBuilder.workflow);
  const sliceNodes = useAppSelector((s) => s.workflowBuilder.nodes);
  const activeView = useAppSelector((s) => s.workflowBuilder.activeView);
  const activeExecutionId = useAppSelector(
    (s) => s.workflowBuilder.activeExecutionId
  );

  // ── Local UI state (not Redux — fast-path canvas interactions) ─────────────
  const [nodes, setLocalNodes] = useState<WorkflowNodeData[]>(sliceNodes);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<ConfigStep>("setup");

  // The currently selected workflow id — seeded from localStorage so the last
  // open workflow is automatically restored on page refresh.
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    sliceWorkflow.id ?? getStoredWorkflowId()
  );
  // console.log("workflow id from localStorage:", getStoredWorkflowId());

  // Persist selected workflow ID whenever it changes
  useEffect(() => {
    setStoredWorkflowId(selectedWorkflowId);
  }, [selectedWorkflowId]);

  // Restore activeView from localStorage on first mount
  useEffect(() => {
    const stored = getStoredActiveView();
    if (stored) dispatch(setActiveView(stored));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── RTK Query — Workflows ──────────────────────────────────────────────────
  const {
    data: workflowsData,
    refetch: refetchWorkflows,
  } = useGetWorkflowsQuery({ userId: getActiveUserId(), ...(isAdmin ? { role: "admin" } : {}) });

  const [createWorkflowMutation] = useCreateWorkflowMutation();
  const [updateWorkflowMutation] = useUpdateWorkflowMutation();
  const [deleteWorkflowMutation] = useDeleteWorkflowMutation();
  const [updateWebhookResponse] = useUpdateWebhookResponseMutation();

  // Derive the list the sidebar shows; fall back to empty array
  const workflows = useMemo(
    () =>
      (workflowsData?.data ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        status: w.status,
      })),
    [workflowsData]
  );

  // Keep the Redux slice in sync with the RTK Query cache for the *active*
  // workflow. Without this, status/name changes made elsewhere (Assets page,
  // another tab) won't reach the navbar — which reads from the slice.
  useEffect(() => {
    if (!selectedWorkflowId) return;
    const fresh = workflowsData?.data?.find((w) => w.id === selectedWorkflowId);
    if (!fresh) return;
    if (
      fresh.status !== sliceWorkflow.status ||
      fresh.name !== sliceWorkflow.name ||
      fresh.id !== sliceWorkflow.id
    ) {
      dispatch(
        setWorkflow({ id: fresh.id, name: fresh.name, status: fresh.status })
      );
    }
  }, [
    workflowsData,
    selectedWorkflowId,
    sliceWorkflow.id,
    sliceWorkflow.name,
    sliceWorkflow.status,
    dispatch,
  ]);

  // ── RTK Query — Folders ────────────────────────────────────────────────────
  const { data: foldersData } = useGetFoldersQuery({
    userId: getActiveUserId(),
    ...(isAdmin ? { role: "admin" } : {}),
  });
  const [createFolderMutation] = useCreateFolderMutation();
  const [updateFolderMutation] = useUpdateFolderMutation();
  const [deleteFolderMutation] = useDeleteFolderMutation();

  const folders = useMemo(
    () => (foldersData?.data ?? []).map((f) => ({ id: f.id, name: f.name })),
    [foldersData]
  );

  // ── RTK Query — Tags ──────────────────────────────────────────────────────
  const { data: tagsData } = useGetTagsQuery({
    userId: getActiveUserId(),
    ...(isAdmin ? { role: "admin" } : {}),
  });
  const [createTagMutation] = useCreateTagMutation();
  const [updateTagMutation] = useUpdateTagMutation();
  const [deleteTagMutation] = useDeleteTagMutation();
  const [assignTagToWorkflowMutation] = useAssignTagToWorkflowMutation();
  const [removeTagFromWorkflowMutation] = useRemoveTagFromWorkflowMutation();

  const tags = useMemo(
    () =>
      (tagsData?.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })),
    [tagsData]
  );

  // ── RTK Query — Nodes for selected workflow ────────────────────────────────
  const { data: workflowNodesData } = useGetWorkflowNodesQuery(
    selectedWorkflowId ?? "",
    { skip: !selectedWorkflowId }
  );

  // ── Sync fetched nodes → local canvas state ───────────────────────────────
  useEffect(() => {
    if (!workflowNodesData?.data) return;

    if (workflowNodesData.data.length > 0) {
      // Map backend records to canvas-friendly WorkflowNodeData
      const mapped: WorkflowNodeData[] = workflowNodesData.data.map((n, idx) => {
        let config = n.config ?? {};
        // Restore full webhook object from localStorage if backend only stored webhook_id
        if (n.type === "trigger" && config.webhook_id && !config.webhook) {
          const cached = getCachedWebhookData(n.id);

          if (cached) config = { ...config, webhook: cached };
        }
        return {
          id: n.id,
          type: n.type,
          nodeType: n.type,
          integrationType: n.integration_key,
          index: n.position ?? idx + 1,
          label: n.integration_key || (n.type === "trigger" ? "Trigger" : "Action"),
          appLabel: n.integration_key || undefined,
          eventLabel: n.action_key || undefined,
          description:
            n.type === "trigger"
              ? `Starts when something happens in ${n.integration_key}`
              : `Does something in ${n.integration_key}`,
          config,
          status: "draft",
          output_schema: n.output_schema,
          sample_payload: n.sample_payload,
        };
      });

      // Preserve in-memory test data (testSamples, testPayload) that is never
      // persisted to the backend. RTK Query refetches wipe localNodes — without
      // this merge, the variable picker loses all but the first trigger sample
      // every time the nodes query re-runs (e.g. after subscription creation).
      setLocalNodes((prev) =>
        mapped.map((newNode) => {
          const prevNode = prev.find((p) => p.id === newNode.id);
          if (!prevNode) return newNode;
          const mergedConfig: Record<string, any> = { ...newNode.config };
          if (prevNode.config?.testSamples !== undefined) {
            mergedConfig.testSamples = prevNode.config.testSamples;
          }
          if (prevNode.config?.testPayload !== undefined) {
            mergedConfig.testPayload = prevNode.config.testPayload;
          }
          return { ...newNode, config: mergedConfig };
        })
      );
    }
    // If empty, leave the blank defaultNodes() already set by loadWorkflow
  }, [workflowNodesData?.data]);

  // ── RTK Query — Node CRUD ─────────────────────────────────────────────────
  const [createNodeMutation] = useCreateNodeMutation();
  const [updateNodeMutation] = useUpdateNodeMutation();
  const [deleteNodeMutation] = useDeleteNodeMutation();
  const [saveMappingsMutation] = useSaveMappingsMutation();
  const [activateWorkflowMutation] = useActivateWorkflowMutation();
  const [createPollingSubscription] = useCreatePollingSubscriptionMutation();

  // ── RTK Query — Executions ────────────────────────────────────────────────
  const { data: executionsData } = useGetExecutionsQuery(
    selectedWorkflowId ?? "",
    { skip: !selectedWorkflowId || activeView !== "monitor" }
  );

  const { data: executionDetailData } = useGetExecutionDetailQuery(
    activeExecutionId ?? "",
    { skip: !activeExecutionId }
  );

  const [testWorkflowMutation, { isLoading: isTesting }] =
    useTestWorkflowMutation();

  const activeNode = nodes.find((n) => n.id === activeNodeId);
  const activeDescriptor = getIntegration(activeNode?.appLabel);

  // Flatten the trigger node's caught webhook payload so action nodes can
  // populate their variable-picker dropdowns with real field names.
  const triggerFields = useMemo(() => {
    const triggerNode = nodes.find((n) => n.type === "trigger");
    const cfg = triggerNode?.config;
    const payload =
      cfg?.testPayload ?? cfg?.test_payload ?? triggerNode?.sample_payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return [];
    return flattenPayload(payload);
  }, [nodes]);

  const events: WorkflowEvent[] = useMemo(() => {
    if (!activeNode?.appLabel) return [];
    const all = [...apps, ...tools];
    const normalizedLabel = activeNode.appLabel.toLowerCase();
    const found = all.find(
      (a: IntegrationApp) => a.label.toLowerCase() === normalizedLabel
    );
    return found?.events || [];
  }, [activeNode?.appLabel, apps, tools]);

  // ── Workflow CRUD ──────────────────────────────────────────────────────────

  const createWorkflow = useCallback(async (workflowName?: string, tagIds?: string[]) => {
    try {
      // Use provided name or auto-generate one
      let name = workflowName;
      if (!name || name.trim() === "") {
        const currentCount = workflowsData?.data?.length ?? 0;
        const autoLabel = indexToLabel(currentCount);
        name = `Workflow ${autoLabel}`;
      }

      const result = await createWorkflowMutation({
        name: name.trim(),
        user_id: getActiveUserId(),
      }).unwrap();

      // Link selected tags to the new workflow
      if (tagIds && tagIds.length > 0) {
        await Promise.allSettled(
          tagIds.map((tag_id) =>
            assignTagToWorkflowMutation({
              workflowId: result.data.id,
              tag_id,
            }).unwrap()
          )
        );
      }
  

      dispatch(setWorkflow({ id: result.data.id, name: result.data.name, status: result.data.status }));
      setSelectedWorkflowId(result.data.id);

      // Reset canvas to fresh blank nodes for the new workflow
      const fresh = defaultNodes();
      setLocalNodes(fresh);
      setActiveNodeId(null);
      setIsSidebarOpen(false);
      setIsSelectorOpen(false);
      setActiveStep("setup");

      toast.success(`"${result.data.name}" created`);
    } catch {
      toast.error("Workflow creation failed — backend unavailable");
    }
  }, [createWorkflowMutation, dispatch, workflowsData]);

  const loadWorkflow = useCallback(
    async (id: string) => {
      // If the same workflow is already loaded, do nothing
      if (id === selectedWorkflowId) return;

      setSelectedWorkflowId(id);

      // Update Redux with workflow meta
      const found = workflowsData?.data?.find((w) => w.id === id);
      if (found) {
        dispatch(
          setWorkflow({ id: found.id, name: found.name, status: found.status })
        );
      }

      // Reset all UI panel state so the canvas looks clean
      setActiveNodeId(null);
      setIsSidebarOpen(false);
      setIsSelectorOpen(false);
      setActiveStep("setup");

      // Reset canvas to blank defaults — the useEffect below will
      // overwrite once workflowNodesData arrives from the server.
      setLocalNodes(defaultNodes());
    },
    [workflowsData, dispatch, selectedWorkflowId]
  );

  // ── Publish: set workflow status to active ─────────────────────────────────

  const publishWorkflow = useCallback(async () => {
    if (!selectedWorkflowId) {
      toast.error("Save your workflow first");
      return;
    }
    try {
      await activateWorkflowMutation(selectedWorkflowId).unwrap();
      dispatch(setWorkflowStatus("active"));

      // Switch the trigger webhook to live mode so every incoming hit runs the workflow
      const triggerNode = nodes.find((n) => n.type === "trigger");
      const webhookId = triggerNode?.config?.webhook?.id;
      if (webhookId) {
        try {
          await updateWebhookResponse({ responseId: webhookId, payload: { mode: "live" } }).unwrap();
        } catch { /* best effort */ }
      }

      // Auto-subscribe trigger nodes for polling/webhook integrations.
      // Backend wraps polling.controller to route to webhook-engine when the
      // integration supports it (ServiceM8, Leadshub) and falls back to polling
      // (Commusoft). Idempotent on node_id, so re-publishing is safe.
      const POLLING_INTEGRATIONS = new Set(["service_m8", "leadshub", "commusoft", "simpro"]);

      console.log(
        `[publishWorkflow] scanning ${nodes.length} node(s) for auto-subscribe`,
        nodes.map((n) => ({
          id: n.id,
          type: n.type,
          integrationType: n.integrationType,
          eventLabel: n.eventLabel,
        }))
      );

      const triggerNodesWithEvent = nodes.filter(
        (n) =>
          n.type === "trigger" &&
          POLLING_INTEGRATIONS.has(n.integrationType ?? "") &&
          n.eventLabel
      );

      console.log(
        `[publishWorkflow] ${triggerNodesWithEvent.length} trigger node(s) eligible for auto-subscribe`
      );

      for (const n of triggerNodesWithEvent) {
        const eventKey = n.eventLabel!.toLowerCase().replace(/\s+/g, "_");
        const payload = {
          workflow_id: selectedWorkflowId,
          node_id: n.id,
          integration_key: n.integrationType!,
          event_key: eventKey,
          config: n.config ?? {},
        };
        console.log(`[publishWorkflow] → POST /polling/subscriptions`, payload);
        try {
          const res = await createPollingSubscription(payload).unwrap();
          console.log(`[publishWorkflow] ✓ subscribed`, res);
        } catch (err) {
          // Surface but don't block publish — user can still click Test to retry
          console.warn(
            `[publishWorkflow] ✖ auto-subscribe failed for node=${n.id} integration=${n.integrationType} event=${eventKey}`,
            err
          );
        }
      }

      toast.success("Workflow published and activated!");
    } catch {
      toast.error("Could not publish — backend unavailable");
    }
  }, [selectedWorkflowId, activateWorkflowMutation, dispatch, nodes, createPollingSubscription, updateWebhookResponse]);

  // ── Pause: set workflow status to paused ───────────────────────────────────

  const pauseWorkflow = useCallback(async () => {
    if (!selectedWorkflowId) {
      toast.error("Save your workflow first");
      return;
    }
    try {
      await updateWorkflowMutation({
        id: selectedWorkflowId,
        patch: { status: "paused" },
      }).unwrap();
      dispatch(setWorkflowStatus("paused"));

      // Switch the trigger webhook back to test mode so live hits don't execute the workflow
      const triggerNode = nodes.find((n) => n.type === "trigger");
      const webhookId = triggerNode?.config?.webhook?.id;
      if (webhookId) {
        try {
          await updateWebhookResponse({ responseId: webhookId, payload: { mode: "test" } }).unwrap();
        } catch { /* best effort */ }
      }

      toast.success("Workflow paused");
    } catch {
      toast.error("Could not pause — backend unavailable");
    }
  }, [selectedWorkflowId, updateWorkflowMutation, dispatch, nodes, updateWebhookResponse]);

  // ── Delete workflow ────────────────────────────────────────────────────────

  const deleteWorkflow = useCallback(
    async (id: string) => {
      try {
        await deleteWorkflowMutation(id).unwrap();
        // If the deleted workflow was selected, clear the canvas
        if (id === selectedWorkflowId) {
          setSelectedWorkflowId(null);
          dispatch(setWorkflow({ id: null, name: "", status: "draft" }));
          setLocalNodes(defaultNodes());
          setActiveNodeId(null);
          setIsSidebarOpen(false);
          setIsSelectorOpen(false);
        }
        toast.success("Workflow deleted");
      } catch {
        toast.error("Could not delete workflow — backend unavailable");
      }
    },
    [deleteWorkflowMutation, dispatch, selectedWorkflowId]
  );

  const renameWorkflow = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      try {
        await updateWorkflowMutation({ id, patch: { name: trimmed } }).unwrap();
        if (id === selectedWorkflowId) {
          dispatch(setWorkflow({ id, name: trimmed, status: sliceWorkflow.status ?? "draft" }));
        }
      } catch {
        toast.error("Could not rename workflow");
      }
    },
    [updateWorkflowMutation, selectedWorkflowId, sliceWorkflow.status, dispatch]
  );

  // ── Folder CRUD ───────────────────────────────────────────────────────────

  const createFolder = useCallback(
    async (name: string) => {
      try {
        await createFolderMutation({ name, user_id: getActiveUserId() }).unwrap();
        toast.success(`Folder "${name}" created`);
      } catch {
        toast.error("Could not create folder");
      }
    },
    [createFolderMutation]
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      try {
        await updateFolderMutation({ id, name }).unwrap();
        toast.success("Folder renamed");
      } catch {
        toast.error("Could not rename folder");
      }
    },
    [updateFolderMutation]
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      try {
        await deleteFolderMutation(id).unwrap();
        toast.success("Folder deleted");
      } catch {
        toast.error("Could not delete folder");
      }
    },
    [deleteFolderMutation]
  );

  // ── Tag CRUD ──────────────────────────────────────────────────────────────

  const createTag = useCallback(
    async (name: string, color?: string) => {
      try {
        const result = await createTagMutation({ name, color, user_id: getActiveUserId() }).unwrap();
        toast.success(`Tag "${name}" created`);
        return result.data;
      } catch {
        toast.error("Could not create tag");
        return null;
      }
    },
    [createTagMutation]
  );

  const updateTag = useCallback(
    async (id: string, patch: { name?: string; color?: string }) => {
      try {
        await updateTagMutation({ id, patch }).unwrap();
        toast.success("Tag updated");
      } catch {
        toast.error("Could not update tag");
      }
    },
    [updateTagMutation]
  );

  const deleteTag = useCallback(
    async (id: string) => {
      try {
        await deleteTagMutation(id).unwrap();
        toast.success("Tag deleted");
      } catch {
        toast.error("Could not delete tag");
      }
    },
    [deleteTagMutation]
  );

  const assignTagToWorkflow = useCallback(
    async (workflowId: string, tagId: string) => {
      try {
        await assignTagToWorkflowMutation({ workflowId, tag_id: tagId }).unwrap();
      } catch {
        toast.error("Could not assign tag");
      }
    },
    [assignTagToWorkflowMutation]
  );

  const removeTagFromWorkflow = useCallback(
    async (workflowId: string, tagId: string) => {
      try {
        await removeTagFromWorkflowMutation({ workflowId, tagId }).unwrap();
      } catch {
        toast.error("Could not remove tag");
      }
    },
    [removeTagFromWorkflowMutation]
  );

  // ── Test: fire a dry-run ───────────────────────────────────────────────────

  const testWorkflow = useCallback(async () => {
    if (!selectedWorkflowId) {
      toast.error("Save your workflow first");
      return;
    }
    try {
      await testWorkflowMutation(selectedWorkflowId).unwrap();
      toast.success("Test execution started — check the Monitor tab");
      dispatch(setActiveView("monitor"));
    } catch {
      toast.error("Test failed — backend unavailable");
    }
  }, [selectedWorkflowId, testWorkflowMutation, dispatch]);

  // ── Node Handlers ──────────────────────────────────────────────────────────

  const handleNodeClick = useCallback(
    (id: string) => {
      setActiveNodeId(id);
      const node = nodes.find((n) => n.id === id);
      if (!node?.appLabel) {
        setIsSelectorOpen(true);
      } else {
        setIsSidebarOpen(true);
        setActiveStep("setup");
      }
    },
    [nodes]
  );

  const handleAppSelect = useCallback(
    async (
      nodeId: string,
      app: { label: string; icon: any; color: string }
    ) => {
      const existingNode = nodes.find((n) => n.id === nodeId);
      const isChangingApp = !!existingNode?.appLabel;

      const updatedNodes = nodes.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          appLabel: app.label,
          appIcon: app.icon,
          appColor: app.color,
          integrationType: app.label.toLowerCase().replace(/\s+/g, "_"),
          label: app.label,
          // Reset event and config when switching apps
          ...(isChangingApp ? { eventLabel: undefined, config: {} } : {}),
          description:
            node.type === "trigger"
              ? `Starts when something happens in ${app.label}`
              : `Does something in ${app.label}`,
        };
      });
      setLocalNodes(updatedNodes);

      if (selectedWorkflowId) {
        try {
          const node = updatedNodes.find((n) => n.id === nodeId);
          if (node) {
            if (isChangingApp) {
              // Node already exists on backend — update it instead of creating a new one
              await updateNodeMutation({
                id: nodeId,
                patch: {
                  integration_key: app.label.toLowerCase().replace(/\s+/g, "_"),
                  action_key: "",
                  config: {},
                },
              }).unwrap();
            } else {
              // Brand new node — create on backend
              const result = await createNodeMutation({
                workflow_id: selectedWorkflowId,
                type: node.type,
                node_category: node.type,
                integration_key: app.label.toLowerCase().replace(/\s+/g, "_"),
                action_key: "",
                config: {},
                position: node.index,
                user_id: getActiveUserId(),
              }).unwrap();

              const backendId = result.data.id;
              setLocalNodes((prev) =>
                prev.map((n) => (n.id === nodeId ? { ...n, id: backendId } : n))
              );
              setActiveNodeId(backendId);
            }
          }
        } catch {
          // continue silently offline
        }
      }

      setIsSelectorOpen(false);
      setIsSidebarOpen(true);
      setActiveStep("setup");
    },
    [nodes, selectedWorkflowId, createNodeMutation, updateNodeMutation]
  );

  const handleAddAction = useCallback(
    (afterIndex: number) => {
      const newId = `action-${Date.now()}`;
      const newNode: WorkflowNodeData = {
        id: newId,
        type: "action",
        index: afterIndex + 1,
        label: "Action",
        description: "Select the event for your zap to run",
      };

      const newNodes = [...nodes];
      newNodes.splice(afterIndex, 0, newNode);
      const reindexed = newNodes.map((node, idx) => ({
        ...node,
        index: idx + 1,
      }));

      setLocalNodes(reindexed);
      setActiveNodeId(newId);
      setIsSelectorOpen(true);
    },
    [nodes]
  );

  const handleDeleteNode = useCallback(
    async (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (node?.type === "trigger") return;

      const filtered = nodes
        .filter((n) => n.id !== id)
        .map((n, idx) => ({ ...n, index: idx + 1 }));
      setLocalNodes(filtered);

      if (activeNodeId === id) {
        setActiveNodeId(null);
        setIsSidebarOpen(false);
        setIsSelectorOpen(false);
      }

      // Backend delete (best-effort)
      try {
        await deleteNodeMutation(id);
      } catch { }
    },
    [nodes, activeNodeId, deleteNodeMutation]
  );

  const handleDuplicateNode = useCallback(
    (id: string) => {
      const nodeIndex = nodes.findIndex((n) => n.id === id);
      if (nodeIndex === -1) return;

      const orig = nodes[nodeIndex];
      const newNode: WorkflowNodeData = {
        ...orig,
        id: `action-${Date.now()}`,
        index: nodeIndex + 2,
      };

      const newNodes = [...nodes];
      newNodes.splice(nodeIndex + 1, 0, newNode);
      setLocalNodes(newNodes.map((n, idx) => ({ ...n, index: idx + 1 })));
    },
    [nodes]
  );

  // ── Continue Logic ─────────────────────────────────────────────────────────

  // Config keys that are internal bookkeeping — never sent as field mappings
  const INTERNAL_KEYS = new Set([
    "accountId", "accountName", "webhook_id", "webhook", "testPayload",
  ]);

  /**
   * Converts a node's config into backend-ready mapping payloads.
   *
   * - Keys that start with "_" or are in INTERNAL_KEYS are skipped.
   * - A field containing a {{map:sourceField|label|value}} token  → dynamic mapping
   * - A field with a plain (non-empty, no token) string value     → static mapping
   *
   * One POST /nodes/:id/mappings call is made per field (batched by saveMappings).
   */
  const extractMappings = useCallback(
    (config: Record<string, any>, sourceNodeId: string): CreateMappingPayload[] => {
      const MAP_TOKEN = /\{\{map:([^|]*)\|[^|]*\|[^}]*\}\}/g;
      const mappings: CreateMappingPayload[] = [];

      const walk = (obj: Record<string, any>) => {
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith("_") || INTERNAL_KEYS.has(key)) continue;

          if (value && typeof value === "object" && !Array.isArray(value)) {
            walk(value);
            continue;
          }

          if (typeof value !== "string" || !value.trim()) continue;

          MAP_TOKEN.lastIndex = 0;
          const tokenMatches = Array.from(value.matchAll(MAP_TOKEN));

          if (tokenMatches.length === 0) {
            if (!value.includes("{{")) {
              // Plain static text (e.g. "leads@company.com") → static
              mappings.push({
                mapping_type: "static",
                static_value: value,
                destination_field: key,
              });
            }
            continue;
          }

          // Single token AND nothing else around it → pure dynamic (unchanged
          // behavior so legacy records keep their exact shape).
          const onlyToken = tokenMatches[0];
          const isPureDynamic =
            tokenMatches.length === 1 &&
            onlyToken.index === 0 &&
            onlyToken[0].length === value.length;

          if (isPureDynamic && onlyToken[1]) {
            mappings.push({
              mapping_type: "dynamic",
              source_node_id: sourceNodeId,
              source_field: onlyToken[1],
              destination_field: key,
            });
          } else {
            // Mixed content: static text + one or more {{map:...}} tokens, or
            // multiple tokens. Send the raw template; backend resolves each
            // token at execution time against the source node's output.
            mappings.push({
              mapping_type: "template",
              source_node_id: sourceNodeId,
              template: value,
              destination_field: key,
            });
          }
        }
      };

      walk(config);

      return mappings;
    },
    []
  );

  const handleContinue = useCallback(async () => {
    if (!activeNode) return;
    const lifecycle = activeDescriptor?.lifecycle;

    if (activeStep === "setup") {
      const canAdvance = lifecycle?.onSetupContinue
        ? await lifecycle.onSetupContinue(activeNode)
        : true;
      if (!canAdvance) {
        toast.error("Please select an event first");
        return;
      }
      if (activeNode.type === "trigger" && activeNode.appLabel?.toLowerCase().includes("webhook")) {
        const response = await webhookEngine.onSetup?.({ ...activeNode, workflowId: selectedWorkflowId ?? undefined, userId: getActiveUserId() || undefined });
        if (response) {
          // Store webhook metadata locally
          setLocalNodes((prev) =>
            prev.map((node) =>
              node.id === activeNode.id
                ? { ...node, config: { ...node.config, webhook: response } }
                : node
            )
          );
          // Link webhook_id to the trigger node on the backend
          try {
            await updateNodeMutation({
              id: activeNode.id,
              patch: { 
                action_key: activeNode.eventLabel?.toLowerCase().replace(/\s+/g, "_") ?? "",
                config: { webhook_id: response.id } },
            });
          } catch { /* best effort */ }

        }
      }
      // For non-webhook trigger nodes (e.g. ServiceM8 polling), persist action_key during setup
      if (activeNode.type === "trigger" && !activeNode.appLabel?.toLowerCase().includes("webhook")) {
        if (activeNode.eventLabel) {
          try {
            await updateNodeMutation({
              id: activeNode.id,
              patch: {
                action_key: activeNode.eventLabel.toLowerCase().replace(/\s+/g, "_"),
              },
            });
          } catch { /* best effort */ }
        }
      }

      // For action nodes, persist credentials/config + action_key collected during setup
      if (activeNode.type === "action") {
        // When it persists activeNode.config (credentials, account info, etc.) and action_key to the backend:
        const patch: Record<string, any> = {};
        if (activeNode.config && Object.keys(activeNode.config).length > 0) {
          patch.config = activeNode.config; 
        }
        if (activeNode.eventLabel) {
          patch.action_key = activeNode.eventLabel.toLowerCase().replace(/\s+/g, "_");  // set the action key
        }
        if (Object.keys(patch).length > 0) {
          try {
            console.log("Patching node with", patch,);
            await updateNodeMutation({ id: activeNode.id, patch });
          } catch { /* best effort */ }
        }
      }

      setActiveStep("configure");

    } else if (activeStep === "configure") {
      const canAdvance = lifecycle?.onConfigureContinue
        ? await lifecycle.onConfigureContinue(activeNode)
        : true;
      if (!canAdvance) return;

      // Persist configured form data to backend on Continue
      if (activeNode.config) {
        const { _formIsValid, ...rawConfig } = activeNode.config;
        if (_formIsValid) {
          try {
            console.log("SAVING TO BACKEND - htmlBody in config:", rawConfig?.htmlBody?.substring?.(0, 50))
            await updateNodeMutation({
              id: activeNode.id,
              patch: {
                config: rawConfig,
                sample_payload: resolveConfigForSave(rawConfig),
                output_schema: extractOutputSchema(rawConfig),
              },
            });
          } catch { /* best effort */ }
        }
      }

      // Save field mappings for action nodes
      if (activeNode.type === "action" && activeNode.config) {
        const triggerNodeId = nodes.find((n) => n.type === "trigger")?.id ?? "";
        const mappings = extractMappings(activeNode.config, triggerNodeId);
        if (mappings.length > 0) {
          try {
            await saveMappingsMutation({ nodeId: activeNode.id, mappings });
          } catch { /* best effort */ }
        }
      }

      setActiveStep("test");

    } else if (activeStep === "test") {

      // Advance to the next node
      const currentIndex = nodes.findIndex((n) => n.id === activeNode.id);
      let nextNode = nodes[currentIndex + 1];

      if (!nextNode) {
        const newId = `action-${Date.now()}`;
        nextNode = {
          id: newId,
          type: "action",
          index: nodes.length + 1,
          label: "Action",
          description: "Select the event for your zap to run",
        };
        setLocalNodes((prev) => [...prev, nextNode!]);
      }

      setActiveNodeId(nextNode.id);
      setActiveStep("setup");

      if (!nextNode.appLabel) {
        setIsSidebarOpen(false);
        setIsSelectorOpen(true);
      } else {
        setIsSidebarOpen(true);
        setIsSelectorOpen(false);
      }

      toast.success(`Step "${activeNode.label}" completed!`);
    }
  }, [
    activeNode,
    activeDescriptor,
    activeStep,
    nodes,
    updateNodeMutation,
    saveMappingsMutation,
    extractMappings,
  ]);

  const handleEventSelect = useCallback((nodeId: string, event: string) => {
    setLocalNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, eventLabel: event } : node
      )
    );
  }, []);

  const handleUpdateNodeData = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setLocalNodes((prev) => {
        const updated = prev.map((node) =>
          node.id === nodeId
            ? { ...node, config: { ...node.config, ...data } }
            : node
        );


        return updated;
      });
    },
    []
  );

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    // Canvas
    nodes,
    activeNode,
    activeDescriptor,
    events,
    activeStep,
    triggerFields,
    isSelectorOpen,
    isSidebarOpen,

    // Workflow list
    workflows,
    loadWorkflow,
    createWorkflow,
    deleteWorkflow,
    renameWorkflow,

    // Folders
    folders,
    createFolder,
    renameFolder,
    deleteFolder,

    // Tags
    tags,
    createTag,
    updateTag,
    deleteTag,
    assignTagToWorkflow,
    removeTagFromWorkflow,

    // Role
    isAdmin,

    // Current workflow meta
    currentWorkflowId: selectedWorkflowId,
    currentWorkflowStatus: sliceWorkflow.status,

    // UI view
    activeView,
    setActiveView: (v: "builder" | "monitor") => {
      setStoredActiveView(v);
      dispatch(setActiveView(v));
    },

    // Executions
    executions: executionsData?.data ?? [],
    activeExecutionId,
    executionDetail: executionDetailData?.data ?? null,
    setActiveExecutionId: (id: string | null) =>
      dispatch(setActiveExecutionId(id)),

    // Actions
    publishWorkflow,
    pauseWorkflow,
    testWorkflow,
    isTesting,

    // Node handlers
    setActiveStep,
    setIsSelectorOpen,
    setIsSidebarOpen,
    handleNodeClick,
    handleAddAction,
    handleDeleteNode,
    handleDuplicateNode,
    handleContinue,
    handleAppSelect,
    handleEventSelect,
    handleUpdateNodeData,
  };
}