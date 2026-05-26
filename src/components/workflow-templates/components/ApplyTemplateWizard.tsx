"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import { getActiveUserId } from "@/src/store/localStorage";
import { setStoredWorkflowId } from "@/src/components/work-flow/uiOrchestrator/workflowStorage";
import {
  useApplyTemplateMutation,
  useGetTemplateQuery,
} from "../apiIntegrations/workflowTemplateApi";
import type { CredentialOverrides, TemplateNode } from "../types";
import { CredentialSelector } from "./CredentialSelector";

type Step = "name" | "credentials" | "review";

interface Props {
  templateId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplyTemplateWizard({ templateId, isOpen, onClose }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading, isFetching } = useGetTemplateQuery(templateId ?? "", {
    skip: !templateId || !isOpen,
  });
  const template = data?.data ?? null;

  const [applyTemplate, { isLoading: isApplying }] = useApplyTemplateMutation();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [overrides, setOverrides] = useState<CredentialOverrides>({});

  useEffect(() => {
    if (isOpen && template) {
      setStep("name");
      setName(`${template.name} — Copy`);
      setTag(template.tag ?? "");
      setOverrides({});
    }
  }, [isOpen, template]);

  const nodesNeedingCreds = useMemo<TemplateNode[]>(
    () => (template?.nodes ?? []).filter((n) => (n.required_credentials ?? []).length > 0),
    [template]
  );

  const totalCredentialFields = useMemo(
    () =>
      nodesNeedingCreds.reduce(
        (acc, n) => acc + (n.required_credentials?.length ?? 0),
        0
      ),
    [nodesNeedingCreds]
  );

  const filledCredentialFields = useMemo(() => {
    let count = 0;
    nodesNeedingCreds.forEach((node) => {
      node.required_credentials.forEach(({ field }) => {
        if (overrides[node.id]?.[field]) count += 1;
      });
    });
    return count;
  }, [nodesNeedingCreds, overrides]);

  const allCredentialsFilled = filledCredentialFields === totalCredentialFields;

  const handleOverrideChange = (nodeId: string, field: string, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [nodeId]: { ...(prev[nodeId] ?? {}), [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!template) return;
    const userId = getActiveUserId();
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }
    if (!name.trim()) {
      toast.error("Workflow name is required");
      return;
    }
    if (!allCredentialsFilled) {
      toast.error("Fill in all required credentials");
      setStep("credentials");
      return;
    }

    try {
      const result = await applyTemplate({
        id: template.id,
        body: {
          name: name.trim(),
          user_id: userId,
          tag: tag.trim() || undefined,
          credential_overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        },
      }).unwrap();

      const newId = result.data.workflow.id;
      toast.success("Workflow created from template");
      setStoredWorkflowId(newId);
      onClose();
      router.push(`/dashboard/workflow`);
    } catch {
      toast.error("Could not apply template");
    }
  };

  const goNext = () => {
    if (step === "name") {
      if (!name.trim()) {
        toast.error("Workflow name is required");
        return;
      }
      setStep(nodesNeedingCreds.length > 0 ? "credentials" : "review");
    } else if (step === "credentials") {
      if (!allCredentialsFilled) {
        toast.error("Fill in all required credentials");
        return;
      }
      setStep("review");
    }
  };

  const goBack = () => {
    if (step === "review") {
      setStep(nodesNeedingCreds.length > 0 ? "credentials" : "name");
    } else if (step === "credentials") {
      setStep("name");
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {template ? `Apply "${template.name}"` : "Apply template"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Clones nodes & field mappings — only credentials need to be provided.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator
          step={step}
          hasCredentials={nodesNeedingCreds.length > 0}
          filled={filledCredentialFields}
          total={totalCredentialFields}
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {(isLoading || isFetching) && !template ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading template…
            </div>
          ) : !template ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Template not found</div>
          ) : step === "name" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  New workflow name <span className="text-destructive">*</span>
                </label>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Lead Flow"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Tag{" "}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. client-acme"
                />
              </div>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{template.nodes.length}</span> nodes
                and <span className="font-semibold text-foreground">{template.mappings.length}</span>{" "}
                mapping groups will be cloned.
              </div>
            </div>
          ) : step === "credentials" ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Connect the nodes that need credentials. Field mappings from the original workflow
                are already preserved.
              </p>
              {nodesNeedingCreds.map((node) => (
                <div
                  key={node.id}
                  className="rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {formatIntegration(node.integration_key)}
                        {node.action_key && (
                          <span className="text-muted-foreground"> → {formatAction(node.action_key)}</span>
                        )}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {node.type} • position {node.position}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {node.required_credentials.map((cred) => (
                      <div key={`${node.id}:${cred.field}`}>
                        <label className="mb-1 block text-xs font-medium text-foreground">
                          {prettyLabel(cred.field)}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            ({cred.type})
                          </span>
                        </label>
                        <CredentialSelector
                          credentialType={cred.type}
                          fieldKey={cred.field}
                          value={overrides[node.id]?.[cred.field] ?? ""}
                          onChange={(v) => handleOverrideChange(node.id, cred.field, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <SummaryRow label="Workflow name" value={name.trim()} />
              {tag.trim() && <SummaryRow label="Tag" value={tag.trim()} />}
              <SummaryRow label="Node count" value={String(template.nodes.length)} />
              <SummaryRow
                label="Credentials assigned"
                value={`${filledCredentialFields} / ${totalCredentialFields}`}
              />
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                The cloned workflow will be created in <strong>draft</strong> status. Activate it
                from the builder when you're ready.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3">
          <Button
            variant="outline"
            onClick={step === "name" ? onClose : goBack}
            disabled={isApplying}
          >
            {step === "name" ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </>
            )}
          </Button>

          {step === "review" ? (
            <Button
              onClick={handleSubmit}
              disabled={isApplying || !template}
            >
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Create workflow
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!template}
            >
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function StepIndicator({
  step,
  hasCredentials,
  filled,
  total,
}: {
  step: Step;
  hasCredentials: boolean;
  filled: number;
  total: number;
}) {
  const steps: { key: Step; label: string }[] = [
    { key: "name", label: "Name & owner" },
    ...(hasCredentials
      ? [{ key: "credentials" as Step, label: `Credentials (${filled}/${total})` }]
      : []),
    { key: "review", label: "Review" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-6 py-3">
      {steps.map((s, idx) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
              idx < currentIndex
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : idx === currentIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {idx < currentIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
          </div>
          <span
            className={cn(
              "text-xs font-medium",
              idx === currentIndex ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {s.label}
          </span>
          {idx < steps.length - 1 && (
            <span className="mx-1 text-muted-foreground/40">—</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function formatIntegration(key: string): string {
  return key
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
function formatAction(key: string): string {
  return key.replace(/_/g, " ");
}
function prettyLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
