"use client";
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/src/lib/utils";
import { flattenWebhookPayload } from "@/src/components/template/autoMapper";
import { generateEmailTemplate } from "@/src/components/template/generateEmailTemplate";
import { useAutoMap } from "@/src/components/template/useAutoMap";
import { Plus, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import axiosInstance from "@/src/services/apiClient";
import { ConfigField, ConfigTextArea } from "../../../components/ChipTextField";
import { WorkflowSection } from "../../../components/SectionWrapper";
import {
  WebhookVariablePicker,
  VariableField,
} from "@/src/components/work-flow/components/WebhookVariablePicker";
import { HtmlTemplateBuilder } from "./HtmlTemplateBuilder";

// ─── Validation ──────────────────────────────────────────────────────────────

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const variableRegex = /\{\{.*?\}\}/;

function resolveFormValues(values: Partial<MailFormData>): Partial<MailFormData> {
  const resolved: Partial<MailFormData> = {};
  for (const key in values) {
    const k = key as keyof MailFormData;
    const val = values[k];
    // Don't resolve {{map:...}} tokens — they match variableRegex as-is, so
    // emailOrVariable fields accept them regardless of the sample value.
    // Only trim leading/trailing whitespace from plain static text.
    resolved[k] = typeof val === "string" ? val.trim() : (val as any);
  }
  return resolved;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const emailOrVariable = z
  .string()
  .min(1, "Required")
  .refine((val) => variableRegex.test(val) || emailRegex.test(val), {
    message: "Invalid email address or variable",
  });

const optionalEmailOrVariable = z
  .string()
  .optional()
  .refine((val) => !val || variableRegex.test(val) || emailRegex.test(val), {
    message: "Invalid email address or variable",
  });

const mailSchema = z.object({
  fromName: z.string().min(1, "From Name is required"),
  fromEmail: emailOrVariable,
  replyTo: optionalEmailOrVariable,
  to: emailOrVariable,
  cc: optionalEmailOrVariable,
  bcc: optionalEmailOrVariable,
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body content is required"),
  htmlBody: z.string().optional(),
  attachment: z.string().optional(),
});

type MailFormData = z.infer<typeof mailSchema>;

const MAIL_CONFIGURE_FIELD_KEYS: (keyof MailFormData)[] = [
  "fromName",
  "fromEmail",
  "replyTo",
  "to",
  "cc",
  "bcc",
  "subject",
  "body",
  "htmlBody",
  "attachment",
];

/** "To" must come from real email keys on the payload, never fuzzy-matched scalars like "yes". */
const MAIL_TO_PAYLOAD_KEYS = [
  "emailaddress",
  "email",
  "email_address",
  "to_email",
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MailConfigureStepProps {
  data: Partial<MailFormData>;
  onChange: (data: Partial<MailFormData>, isValid: boolean) => void;
  webhookId?: string;
  nodeId?: string;
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
  triggerNodeId?: string;
}

async function tryApplyGeneratedHtmlEmail(
  getValues: () => MailFormData,
  setValue: (
    name: keyof MailFormData,
    value: string,
    opts?: { shouldValidate?: boolean; shouldDirty?: boolean }
  ) => void,
  triggerNodeId: string | undefined,
  cleanedFlat: Record<string, unknown>
): Promise<void> {
  if (!triggerNodeId || String(triggerNodeId).trim() === "") return;
  if (!cleanedFlat || Object.keys(cleanedFlat).length === 0) return;
  const htmlCur = (getValues().htmlBody || "").trim();
  if (htmlCur !== "") return;

  const html = await generateEmailTemplate({
    nodeId: triggerNodeId,
    payload: cleanedFlat,
    title: getValues().subject || undefined,
  });
  setValue("htmlBody", html, { shouldValidate: true, shouldDirty: false });

  const bodyCur = (getValues().body || "").trim();
  if (bodyCur === "") {
    setValue("body", "Please see the HTML body for formatted submission details.", {
      shouldValidate: true,
      shouldDirty: false,
    });
  }
}

function resolveTemplateVars(html: string, payload: Record<string, unknown>): string {
  if (!html) return "<p style='padding:20px;color:#999'>No HTML template yet.</p>";
  return html.replace(/\{\{([^}]+)\}\}/g, (match, token) => {
    const keyPart = token
      .replace(/^[\w-]+-[\w-]+-[\w-]+-[\w-]+-[\w-]+__/, "")
      .replace(/^[\w]+__/, "");

    if (!keyPart) return match;

    const normalizedKey = keyPart.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const found = Object.entries(payload).find(([k]) => {
      const nk = k.toLowerCase().replace(/[^a-z0-9]/g, "_");
      return (
        nk === normalizedKey ||
        nk.endsWith("__" + normalizedKey) ||
        nk.endsWith("_" + normalizedKey)
      );
    });

    return found ? String(found[1]) : match;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MailConfigureStep({
  data,
  onChange,
  webhookId,
  nodeId,
  triggerTestPayload,
  triggerTestSamples,
  triggerNodeId,
}: MailConfigureStepProps) {
  const activeNodeId = nodeId;
  const {
    control,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<MailFormData>({
    resolver: zodResolver(mailSchema),
    mode: "onChange",
    defaultValues: {
      fromName: data.fromName || "",
      fromEmail: data.fromEmail || "",
      replyTo: data.replyTo || "",
      to: data.to || "",
      cc: data.cc || "",
      bcc: data.bcc || "",
      subject: data.subject || "",
      body: data.body || "",
      htmlBody: data.htmlBody || "",
      attachment: data.attachment || "",
    },
  });

  const formValues = watch();
  const watchedHtmlBody = watch("htmlBody");
  const serializedValues = JSON.stringify(formValues);

  const fieldKeys = useMemo(
    () => MAIL_CONFIGURE_FIELD_KEYS.map((k) => String(k)),
    []
  );

  const webhookFlat = useMemo(() => {
    const raw = triggerTestPayload;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return flattenWebhookPayload(raw as Record<string, unknown>);
  }, [triggerTestPayload]);

  const cleanedFlat = Object.fromEntries(
    Object.entries(webhookFlat).map(([k, v]) => [
      k.replace(/^[\w-]+?__/, ""),
      v,
    ]),
  );

  const auto = useAutoMap(fieldKeys, cleanedFlat);
  const webhookPayloadKey = useMemo(() => JSON.stringify(webhookFlat), [webhookFlat]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- debug: log when webhook payload changes; cleanedFlat follows webhookFlat
  useEffect(() => {
    console.log("cleanedFlat keys sample:", Object.keys(cleanedFlat).slice(0, 10));
    console.log(
      "resolving token test:",
      resolveTemplateVars("{{355283184__firstname}}", cleanedFlat),
    );
  }, [webhookPayloadKey]);
  const appliedPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auto.isAutoMapped) return;
    if (!webhookPayloadKey || webhookPayloadKey === "{}") return;
    if (appliedPayloadRef.current === webhookPayloadKey) return;
    appliedPayloadRef.current = webhookPayloadKey;

    fieldKeys.forEach((key) => {
      let suggested: unknown;
      if (key === "to") {
        suggested = undefined;
        for (const pk of MAIL_TO_PAYLOAD_KEYS) {
          const v = cleanedFlat[pk];
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            suggested = v;
            break;
          }
        }
      } else {
        suggested = auto.formValues[key];
      }
      if (suggested === undefined || suggested === null || String(suggested) === "") return;
      const current = getValues(key as keyof MailFormData);
      const curStr = current === undefined || current === null ? "" : String(current).trim();
      if (curStr !== "") return;
      setValue(key as keyof MailFormData, String(suggested), {
        shouldValidate: true,
        shouldDirty: false,
      });
    });

    if (auto.isAutoMapped) {
      void tryApplyGeneratedHtmlEmail(getValues, setValue, triggerNodeId, cleanedFlat);
    }
  }, [
    webhookPayloadKey,
    auto.isAutoMapped,
    auto.formValues,
    fieldKeys,
    getValues,
    setValue,
    triggerNodeId,
    triggerTestPayload,
  ]);

  React.useEffect(() => {
    const resolved = resolveFormValues(formValues);
    const result = mailSchema.safeParse(resolved);
    onChange(formValues, result.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedValues]);

  React.useEffect(() => {
    trigger();
  }, [trigger]);

  // ── Popup state ──────────────────────────────────────────────────────────

  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    fieldName: keyof MailFormData | null;
    position: { top: number; right: number };
  }>({ isOpen: false, fieldName: null, position: { top: 0, right: 0 } });

  const [showBuilder, setShowBuilder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handlePlusClick = useCallback(
    (e: React.MouseEvent, fieldName: keyof MailFormData) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setPopupState({
        isOpen: true,
        fieldName,
        position: { top: rect.top, right: window.innerWidth - rect.left + 10 },
      });
    },
    []
  );

  const closePopup = useCallback(() => {
    setPopupState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const onSelectField = useCallback(
    (field: VariableField) => {
      if (!popupState.fieldName) return;
      const currentValue = getValues(popupState.fieldName) || "";
      const token = `{{map:${field.id}|${field.label}|${field.description}}}`;
      setValue(popupState.fieldName, `${currentValue}${token}`, {
        shouldValidate: true,
        shouldDirty: true,
      });
      closePopup();
    },
    [popupState.fieldName, getValues, setValue, closePopup]
  );

  const fieldLabel = popupState.fieldName
    ? popupState.fieldName
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase())
    : "";

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <form className="space-y-6">
          <Controller name="fromName" control={control} render={({ field }) => (
            <ConfigField label="From Name" required value={field.value || ""} onChange={field.onChange}
              onPlusClick={(e) => handlePlusClick(e, "fromName")} error={errors.fromName?.message} />
          )} />
          <Controller name="fromEmail" control={control} render={({ field }) => (
            <ConfigField label="From Email" required value={field.value || ""} onChange={field.onChange}
              onPlusClick={(e) => handlePlusClick(e, "fromEmail")} error={errors.fromEmail?.message} />
          )} />
          <Controller name="replyTo" control={control} render={({ field }) => (
            <ConfigField label="Reply To" value={field.value || ""} onChange={field.onChange}
              onPlusClick={(e) => handlePlusClick(e, "replyTo")} error={errors.replyTo?.message} />
          )} />
          <Controller name="to" control={control} render={({ field }) => (
            <ConfigField label="To" required value={field.value || ""} onChange={field.onChange}
              onPlusClick={(e) => handlePlusClick(e, "to")} error={errors.to?.message} />
          )} />
          <Controller name="cc" control={control} render={({ field }) => (
            <ConfigField label="Cc" value={field.value || ""} onChange={field.onChange}
              onPlusClick={(e) => handlePlusClick(e, "cc")} error={errors.cc?.message} />
          )} />
          <Controller name="bcc" control={control} render={({ field }) => (
            <ConfigField label="Bcc" value={field.value || ""} onChange={field.onChange}
              onPlusClick={(e) => handlePlusClick(e, "bcc")} error={errors.bcc?.message} />
          )} />
          <Controller name="subject" control={control} render={({ field }) => (
            <ConfigField label="Subject" required value={field.value || ""} onChange={field.onChange}
              onPlusClick={(e) => handlePlusClick(e, "subject")} error={errors.subject?.message} />
          )} />
          <Controller
            name="body"
            control={control}
            render={({ field }) => (
              <ConfigTextArea
                label="Body"
                required
                value={field.value || ""}
                onChange={field.onChange}
                onPlusClick={(e) => handlePlusClick(e, "body")}
                error={errors.body?.message}
              />
            )}
          />
          <Controller
            name="htmlBody"
            control={control}
            render={({ field }) => (
              <>
                <WorkflowSection label="HTML Body">
                  <div className="flex flex-row items-center gap-2">
                    <div className="flex shrink-0 flex-row items-center gap-2">
                        <Button
                          type="button"
                          variant="default"
                          className="whitespace-nowrap"
                          onClick={() => setShowBuilder(true)}
                        >
                          Build Template
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="whitespace-nowrap"
                          onClick={() => setShowPreview(true)}
                        >
                          Preview
                        </Button>
                      </div>
                    <button
                      type="button"
                      onClick={(e) => handlePlusClick(e, "htmlBody")}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground shadow-sm transition-all hover:border-primary hover:bg-background hover:text-primary"
                      aria-label="Insert variable"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </WorkflowSection>
                {errors.htmlBody?.message && (
                  <p className="mt-1 text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                    {errors.htmlBody.message}
                  </p>
                )}
              </>
            )}
          />
          <Controller name="attachment" control={control} render={({ field }) => (
            <ConfigField label="Attachment" value={field.value || ""} onChange={field.onChange}
              onPlusClick={(e) => handlePlusClick(e, "attachment")} error={errors.attachment?.message} />
          )} />
      </form>

      {showBuilder && (
        <HtmlTemplateBuilder
          initialHtml={watchedHtmlBody}
          webhookId={webhookId}
          triggerTestPayload={triggerTestPayload}
          triggerTestSamples={triggerTestSamples}
          cleanedFlat={cleanedFlat}
          onSave={(html) => {
            setValue("htmlBody", html, { shouldValidate: true, shouldDirty: true });
            setShowBuilder(false);

            const updatedValues = { ...getValues(), htmlBody: html };
            const result = mailSchema.safeParse(resolveFormValues(updatedValues));
            void Promise.resolve(onChange(updatedValues, result.success)).catch(() => {});

            if (activeNodeId) {
              void axiosInstance
                .patch(`/automation/nodes/update/${activeNodeId}`, { config: updatedValues })
                .catch(console.error);
            }
          }}
          onClose={() => setShowBuilder(false)}
        />
      )}

      <WebhookVariablePicker
        isOpen={popupState.isOpen}
        fieldLabel={fieldLabel}
        position={popupState.position}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
        onSelect={onSelectField}
        onClose={closePopup}
      />

      {showPreview && (
        <div
          role="presentation"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60"
          onClick={() => setShowPreview(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-preview-title"
            className="z-[1000] flex h-[80vh] w-[800px] max-w-[90vw] flex-col rounded-xl bg-background border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b p-4">
              <h2 id="email-preview-title" className="text-lg font-semibold">
                Email Preview
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              <iframe
                srcDoc={resolveTemplateVars(watchedHtmlBody || "", cleanedFlat)}
                className="h-full w-full border-0"
                title="Email Preview"
              />
            </div>
            <footer className="flex shrink-0 justify-end border-t p-4">
              <button type="button" onClick={() => setShowPreview(false)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
