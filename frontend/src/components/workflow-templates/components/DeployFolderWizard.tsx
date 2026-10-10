"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Rocket,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input }  from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import type { RootState } from "@/src/store/store";
import { useGetIntegrationStatusQuery } from "../apiIntegrations/templateFolderApi";
import { useApplyTemplateMutation } from "../apiIntegrations/workflowTemplateApi";
import type { WorkflowTemplate } from "../types";

// ── All known checkable integrations ─────────────────────────────────────────
const ALL_INTEGRATIONS = [
  { key: "service_m8", label: "ServiceM8" },
  { key: "leadshub",   label: "LeadHub" },
  { key: "commusoft",  label: "Commusoft" },
  { key: "simpro",     label: "Simpro" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  folderId: string | null;
  folderName: string;
  folderTemplates: WorkflowTemplate[];
  isOpen: boolean;
  onClose: () => void;
}

type Step = "configure" | "results";

interface DeployResult {
  template_id: string;
  template_name: string;
  workflow_name?: string;
  status: "pending" | "running" | "success" | "error";
  error?: string;
}

export function DeployFolderWizard({
  folderId,
  folderName,
  folderTemplates,
  isOpen,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Current user — templates are always deployed to the logged-in user's account
  const currentUser = useSelector((s: RootState) => s.access.user);

  const [step, setStep] = useState<Step>("configure");
  const [namePrefix, setNamePrefix] = useState("");
  const [results, setResults] = useState<DeployResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; succeeded: number; failed: number } | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // ── Which integrations the user wants to check ────────────────────────────
  const [checkedIntegrations, setCheckedIntegrations] = useState<string[]>([]);

  const [applyTemplate] = useApplyTemplateMutation();

  // ── Fetch status for manually selected integrations ───────────────────────
  const {
    data: statusData,
    isLoading: loadingStatus,
    isFetching: fetchingStatus,
    isError: statusError,
  } = useGetIntegrationStatusQuery(
    { userId: currentUser?.id ?? "", integrations: checkedIntegrations },
    { skip: !currentUser?.id || checkedIntegrations.length === 0 }
  );

  const integrationStatus = statusData?.data ?? {};
  const statusResolved = !loadingStatus && !fetchingStatus && !!statusData;

  const missingIntegrations = statusResolved
    ? checkedIntegrations.filter((key) => !integrationStatus[key]?.connected)
    : [];

  const allCheckedConnected =
    statusResolved &&
    checkedIntegrations.length > 0 &&
    missingIntegrations.length === 0;

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setStep("configure");
      setNamePrefix("");
      setResults([]);
      setSummary(null);
      setIsDeploying(false);
      setCheckedIntegrations([]);
    }
  }, [isOpen]);

  const activeTemplates = folderTemplates.filter((t) => t.status === "active");

  const toggleIntegration = (key: string) => {
    setCheckedIntegrations((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ── Deploy sequentially ───────────────────────────────────────────────────
  const handleDeploy = async () => {
    if (!currentUser?.id || activeTemplates.length === 0) return;

    const initial: DeployResult[] = activeTemplates.map((t) => ({
      template_id: t.id,
      template_name: t.name,
      status: "pending",
    }));
    setResults(initial);
    setStep("results");
    setIsDeploying(true);

    let succeeded = 0;
    let failed = 0;

    for (const template of activeTemplates) {
      const workflowName = namePrefix.trim()
        ? `${namePrefix.trim()} — ${template.name}`
        : template.name;

      setResults((prev) =>
        prev.map((r) => (r.template_id === template.id ? { ...r, status: "running" } : r))
      );

      try {
        const res = await applyTemplate({
          id: template.id,
          body: { name: workflowName, user_id: currentUser!.id },
        }).unwrap();

        succeeded++;
        setResults((prev) =>
          prev.map((r) =>
            r.template_id === template.id
              ? { ...r, status: "success", workflow_name: res.data?.workflow?.name ?? workflowName }
              : r
          )
        );
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : "Could not create workflow";
        setResults((prev) =>
          prev.map((r) =>
            r.template_id === template.id ? { ...r, status: "error", error: msg } : r
          )
        );
      }
    }

    setSummary({ total: activeTemplates.length, succeeded, failed });
    setIsDeploying(false);

    if (failed === 0) {
      toast.success(
        `All ${activeTemplates.length} draft workflow${activeTemplates.length === 1 ? "" : "s"} created successfully`
      );
    } else {
      toast.warning(`${succeeded} created, ${failed} failed`);
    }
  };

  if (!mounted || !isOpen) return null;

  const canDeploy = !!currentUser?.id && activeTemplates.length > 0;
  // Block deploy only when checked integrations are not all connected
  const hasUnresolvedWarning =
    checkedIntegrations.length > 0 && statusResolved && missingIntegrations.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
              <Rocket className="h-5 w-5 text-indigo-500" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Deploy &ldquo;{folderName}&rdquo;
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeTemplates.length} active template{activeTemplates.length === 1 ? "" : "s"} →
                draft workflows for your account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "configure" ? (
            <div className="space-y-5">
              {/* Templates preview */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Templates in this folder
                </p>
                <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
                  {folderTemplates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No templates.</p>
                  ) : (
                    folderTemplates.map((tpl) => (
                      <div key={tpl.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-foreground">{tpl.name}</span>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            tpl.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {tpl.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {folderTemplates.some((t) => t.status !== "active") && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Only active templates will be deployed.
                  </p>
                )}
              </div>

              {/* Integration checker */}
              {currentUser?.id && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Check integrations
                    </p>
                    <span className="text-[10px] text-muted-foreground">optional</span>
                  </div>

                  {/* App checkboxes */}
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="mb-2.5 text-xs text-muted-foreground">
                      Select the apps this template family needs — we'll check if they are connected to your account.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_INTEGRATIONS.map(({ key, label }) => {
                        const isChecked = checkedIntegrations.includes(key);
                        const status = integrationStatus[key];
                        const connected = statusResolved && isChecked && status?.connected === true;
                        const notConnected = statusResolved && isChecked && !status?.connected;
                        const needsReauth = statusResolved && isChecked && status?.needs_reauth === true;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleIntegration(key)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-all",
                              isChecked
                                ? connected
                                  ? "border-emerald-500/40 bg-emerald-500/5"
                                  : notConnected
                                  ? "border-destructive/30 bg-destructive/5"
                                  : "border-primary/40 bg-primary/5"
                                : "border-border bg-background hover:border-foreground/20 hover:bg-muted/30"
                            )}
                          >
                            {/* Checkbox indicator */}
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                isChecked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background"
                              )}
                            >
                              {isChecked && (
                                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>

                            <span className="flex-1 font-medium text-foreground">{label}</span>

                            {/* Live status icon */}
                            {isChecked && (loadingStatus || fetchingStatus) && (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                            )}
                            {isChecked && statusResolved && (
                              needsReauth ? (
                                <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                              ) : connected ? (
                                <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              ) : (
                                <WifiOff className="h-3.5 w-3.5 shrink-0 text-destructive" />
                              )
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Status error */}
                    {statusError && checkedIntegrations.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Could not check integration status. Please try again.
                      </div>
                    )}
                  </div>

                  {/* Result summary */}
                  {statusResolved && checkedIntegrations.length > 0 && (
                    <div className="mt-2">
                      {missingIntegrations.length > 0 ? (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <div className="text-xs text-amber-700 dark:text-amber-300">
                            <p className="font-semibold">
                              {missingIntegrations.length === 1
                                ? `${ALL_INTEGRATIONS.find((a) => a.key === missingIntegrations[0])?.label ?? missingIntegrations[0]} is not connected`
                                : `${missingIntegrations.length} integrations not connected`}
                            </p>
                            <p className="mt-0.5">
                              Workflows will be created as <strong>drafts</strong>. Connect{" "}
                              {missingIntegrations
                                .map((k) => ALL_INTEGRATIONS.find((a) => a.key === k)?.label ?? k)
                                .join(", ")}{" "}
                              from the Connections page before activating.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          All selected integrations are connected — ready to deploy.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Name prefix */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Name Prefix{" "}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  value={namePrefix}
                  onChange={(e) => setNamePrefix(e.target.value)}
                  placeholder='e.g. "Acme" → "Acme — Welcome Email"'
                />
              </div>

              {/* Draft notice */}
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Draft mode:</span> All workflows
                are created as drafts. The client or developer reviews, tests, then activates each
                workflow manually.
              </div>

              {activeTemplates.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No active templates — nothing will be deployed.
                </div>
              )}
            </div>
          ) : (
            /* Results — live progress */
            <div className="space-y-4">
              {summary && !isDeploying && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {summary.succeeded} / {summary.total} draft workflows created
                    </p>
                    {summary.failed > 0 && (
                      <p className="text-xs text-destructive">{summary.failed} failed</p>
                    )}
                  </div>
                  {summary.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
              )}

              {isDeploying && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating workflows one by one…
                </div>
              )}

              <div className="space-y-1.5">
                {results.map((r) => (
                  <div
                    key={r.template_id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                      r.status === "error"
                        ? "border-destructive/30 bg-destructive/5"
                        : r.status === "success"
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : r.status === "running"
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/40 bg-muted/20"
                    )}
                  >
                    <div className="mt-0.5 h-4 w-4 shrink-0">
                      {r.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {r.status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {r.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      {r.status === "pending" && (
                        <div className="h-4 w-4 rounded-full border-2 border-border/60" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {r.template_name}
                      </p>
                      {r.status === "success" && r.workflow_name && (
                        <p className="truncate text-xs text-muted-foreground">
                          → {r.workflow_name}{" "}
                          <span className="rounded-sm bg-muted px-1 py-px text-[10px]">draft</span>
                        </p>
                      )}
                      {r.status === "error" && r.error && (
                        <p className="text-xs text-destructive">{r.error}</p>
                      )}
                      {r.status === "pending" && (
                        <p className="text-xs text-muted-foreground/60">Waiting…</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Post-deploy guidance */}
              {summary && !isDeploying && summary.succeeded > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Next steps</p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                    {missingIntegrations.length > 0 && (
                      <li>
                        Client connects{" "}
                        <span className="font-medium text-foreground">
                          {missingIntegrations
                            .map((k) => ALL_INTEGRATIONS.find((a) => a.key === k)?.label ?? k)
                            .join(", ")}
                        </span>
                      </li>
                    )}
                    <li>Developer / client opens each workflow and tests it</li>
                    <li>Activate the workflow when satisfied</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={onClose} disabled={isDeploying}>
            {step === "results" && !isDeploying ? "Close" : "Cancel"}
          </Button>

          {step === "configure" && (
            <div className="flex items-center gap-2">
              {!canDeploy ? null : hasUnresolvedWarning ? (
                <Button variant="outline" onClick={handleDeploy} className="gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Deploy anyway (draft)
                </Button>
              ) : (
                <Button onClick={handleDeploy} disabled={!canDeploy} className="gap-1.5">
                  <Rocket className="h-4 w-4" />
                  Deploy {activeTemplates.length} workflow{activeTemplates.length === 1 ? "" : "s"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
