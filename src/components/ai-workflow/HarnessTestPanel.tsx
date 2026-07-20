"use client";

import React, { useMemo, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { AlertCircle, CheckCircle2, FlaskConical, Loader2, Play, X } from "lucide-react";
import { toast } from "sonner";
import type { AiNodeData, AiWorkflowListItem } from "@/src/lib/ai-workflow/types";
import {
  buildHarnessFlowPayload,
  getHarnessCandidateNodes,
  getMissingHarnessCapabilities,
} from "@/src/lib/ai-workflow/harnessAdapter";
import {
  useCreateHarnessFlowMutation,
  useExecuteHarnessFlowMutation,
  useHealthQuery,
} from "./aiHarnessApi";
import { cn } from "@/src/lib/utils";

interface HarnessTestPanelProps {
  workflow: AiWorkflowListItem | undefined;
  nodes: Node<AiNodeData>[];
  edges: Edge[];
  onClose: () => void;
}

export function HarnessTestPanel({ workflow, nodes, edges, onClose }: HarnessTestPanelProps) {
  const supportedNodes = useMemo(() => getHarnessCandidateNodes(nodes), [nodes]);
  const missingNodes = useMemo(() => getMissingHarnessCapabilities(nodes), [nodes]);
  const [selectedNodeId, setSelectedNodeId] = useState(supportedNodes[0]?.id ?? "");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiBase, setApiBase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [input, setInput] = useState("Summarise this workflow test in one sentence.");
  const [variables, setVariables] = useState("{}");
  const [result, setResult] = useState<unknown>(null);

  const { data: health, isFetching: isChecking } = useHealthQuery();
  const [createFlow, createState] = useCreateHarnessFlowMutation();
  const [executeFlow, executeState] = useExecuteHarnessFlowMutation();

  const selectedNode = supportedNodes.find((node) => node.id === selectedNodeId) ?? supportedNodes[0];
  const isBusy = createState.isLoading || executeState.isLoading;

  const runHarnessTest = async () => {
    if (!selectedNode) {
      toast.error("Add a harness-compatible AI node first");
      return;
    }

    let parsedVariables: Record<string, unknown> = {};
    try {
      parsedVariables = variables.trim() ? JSON.parse(variables) : {};
    } catch {
      toast.error("Variables must be valid JSON");
      return;
    }

    try {
      const payload = buildHarnessFlowPayload(
        workflow?.name ?? "AI Workflow",
        selectedNode,
        { model, apiBase: apiBase.trim() || undefined, apiKey: apiKey.trim() || undefined },
        edges
      );
      const flow = await createFlow(payload).unwrap();
      const execution = await executeFlow({
        flowId: flow.id,
        body: { input, variables: parsedVariables, stream: false },
      }).unwrap();
      setResult(execution);
      toast.success("Harness test completed");
    } catch (error) {
      setResult(error);
      toast.error("Harness test failed");
    }
  };

  return (
    <aside className="w-[340px] flex flex-col h-full bg-[hsl(var(--surface))] border-l border-black/8 dark:border-white/5 shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/5">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <div>
            <p className="text-[12px] font-bold text-foreground">AI Harness Test</p>
            <p className="text-[10.5px] text-muted-foreground">
              {isChecking ? "Checking engine..." : health?.status === "ok" ? `Connected v${health.version}` : "Engine not reachable"}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="nm-btn w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
        <Field label="Harness node">
          <select
            value={selectedNode?.id ?? ""}
            onChange={(event) => setSelectedNodeId(event.target.value)}
            className="nm-inset rounded-xl h-9 px-3 w-full bg-transparent text-[12px] font-medium focus:outline-none"
          >
            {supportedNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.data.label} ({node.data.nodeType})
              </option>
            ))}
          </select>
        </Field>

        <div className={cn("rounded-xl px-3 py-2 flex gap-2 text-[11px]", health?.status === "ok" ? "bg-green-500/10 text-green-700" : "bg-yellow-500/10 text-yellow-700")}>
          {health?.status === "ok" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          <span>Set `NEXT_PUBLIC_AI_HARNESS_URL` if your FastAPI harness is not running on `http://localhost:8000`.</span>
        </div>

        <Field label="Model">
          <input value={model} onChange={(event) => setModel(event.target.value)} className="nm-inset rounded-xl h-9 px-3 w-full bg-transparent text-[12px] focus:outline-none" />
        </Field>

        <Field label="API base optional">
          <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} placeholder="http://localhost:11434/v1" className="nm-inset rounded-xl h-9 px-3 w-full bg-transparent text-[12px] focus:outline-none" />
        </Field>

        <Field label="API key optional">
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" className="nm-inset rounded-xl h-9 px-3 w-full bg-transparent text-[12px] focus:outline-none" />
        </Field>

        <Field label="Test input">
          <textarea rows={4} value={input} onChange={(event) => setInput(event.target.value)} className="nm-inset rounded-xl px-3 py-2 w-full bg-transparent text-[12px] focus:outline-none resize-none" />
        </Field>

        <Field label="Variables JSON">
          <textarea rows={3} value={variables} onChange={(event) => setVariables(event.target.value)} className="nm-inset rounded-xl px-3 py-2 w-full bg-transparent text-[12px] focus:outline-none resize-none font-mono" />
        </Field>

        {missingNodes.length > 0 && (
          <div className="nm-inset rounded-xl p-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Not harness executable yet</p>
            <div className="space-y-1">
              {missingNodes.slice(0, 5).map((node) => (
                <p key={node.id} className="text-[11px] text-muted-foreground truncate">{node.label} ({node.nodeType})</p>
              ))}
            </div>
          </div>
        )}

        {result !== null && (
          <pre className="nm-inset rounded-xl p-3 text-[11px] overflow-auto max-h-[260px] whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <div className="px-4 py-3 border-t border-black/8 dark:border-white/5">
        <button
          onClick={runHarnessTest}
          disabled={isBusy || !selectedNode}
          className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          Create Flow & Test
        </button>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
