"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { generateEmailTemplate } from "@/src/components/template/generateEmailTemplate";
import { Plus, X } from "lucide-react";
import { useUpdateNodeMutation } from "@/src/components/work-flow/apiIntegrations/workflowApi";
import { ConfigField, ConfigTextArea } from "../../../components/ChipTextField";
import { WorkflowSection } from "../../../components/SectionWrapper";
import { WebhookVariablePicker } from "@/src/components/work-flow/components/WebhookVariablePicker";
import { HtmlTemplateBuilder } from "./HtmlTemplateBuilder";
import { formatCamelCaseLabel } from "../../shared/configure/fieldLabel";
import { USER_EDIT_SET_VALUE_OPTIONS, useVariablePicker } from "../../shared/configure/useVariablePicker";
import { hasSuggestedValue, isBlankFormValue, useWebhookAutoMap } from "../../shared/configure/useWebhookAutoMap";

// ─── Validation ──────────────────────────────────────────────────────────────

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const variableRegex = /\{\{.*?\}\}/;

function resolveFormValues(values: Partial<MailFormData>): Partial<MailFormData> {
  // Don't resolve {{map:...}} tokens — they match variableRegex as-is, so
  // emailOrVariable fields accept them regardless of the sample value.
  // Only trim leading/trailing whitespace from plain static text.
  const resolved: Partial<MailFormData> = {};
  for (const key in values) {
    const formKey = key as MailFieldName;
    const value = values[formKey];
    resolved[formKey] = typeof value === "string" ? value.trim() : value;
  }
  return resolved;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const emailOrVariable = z
  .string()
  .min(1, "Required")
  .refine((value) => variableRegex.test(value) || emailRegex.test(value), {
    message: "Invalid email address or variable",
  });

const optionalEmailOrVariable = z
  .string()
  .optional()
  .refine((value) => !value || variableRegex.test(value) || emailRegex.test(value), {
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
type MailFieldName = keyof MailFormData;

const MAIL_CONFIGURE_FIELD_KEYS: MailFieldName[] = [
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

/** First non-blank value among the payload's real email keys. */
function findRecipientEmail(cleanedPayload: Record<string, unknown>): unknown {
  return MAIL_TO_PAYLOAD_KEYS.map((payloadKey) => cleanedPayload[payloadKey]).find(
    (payloadValue) => !isBlankFormValue(payloadValue)
  );
}

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

    const found = Object.entries(payload).find(([key]) => {
      const nk = key.toLowerCase().replace(/[^a-z0-9]/g, "_");
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
  const [updateNode] = useUpdateNodeMutation();
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

  const { suggestedValues, cleanedPayload, claimUnappliedPayload } = useWebhookAutoMap(
    MAIL_CONFIGURE_FIELD_KEYS,
    triggerTestPayload
  );

  useEffect(() => {
    if (!claimUnappliedPayload()) return;

    MAIL_CONFIGURE_FIELD_KEYS.forEach((key) => {
      const suggested = key === "to" ? findRecipientEmail(cleanedPayload) : suggestedValues[key];
      if (!hasSuggestedValue(suggested) || !isBlankFormValue(getValues(key))) return;
      setValue(key, String(suggested), { shouldValidate: true, shouldDirty: false });
    });

    void tryApplyGeneratedHtmlEmail(getValues, setValue, triggerNodeId, cleanedPayload);
  }, [claimUnappliedPayload, suggestedValues, cleanedPayload, getValues, setValue, triggerNodeId]);

  React.useEffect(() => {
    const resolved = resolveFormValues(formValues);
    const result = mailSchema.safeParse(resolved);
    onChange(formValues, result.success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedValues]);

  React.useEffect(() => {
    trigger();
  }, [trigger]);

  const [showBuilder, setShowBuilder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const getFieldValue = useCallback((fieldName: MailFieldName) => getValues(fieldName), [getValues]);
  const setFieldValue = useCallback(
    (fieldName: MailFieldName, value: string) => setValue(fieldName, value, USER_EDIT_SET_VALUE_OPTIONS),
    [setValue]
  );
  const { openVariablePicker, pickerProps } = useVariablePicker({ getFieldValue, setFieldValue });

  const handlePlusClick = useCallback(
    (event: React.MouseEvent, fieldName: MailFieldName) =>
      openVariablePicker(event, fieldName, formatCamelCaseLabel(fieldName)),
    [openVariablePicker]
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <form className="space-y-6">
          <Controller name="fromName" control={control} render={({ field }) => (
            <ConfigField label="From Name" required value={field.value || ""} onChange={field.onChange}
              onPlusClick={(event) => handlePlusClick(event, "fromName")} error={errors.fromName?.message} />
          )} />
          <Controller name="fromEmail" control={control} render={({ field }) => (
            <ConfigField label="From Email" required value={field.value || ""} onChange={field.onChange}
              onPlusClick={(event) => handlePlusClick(event, "fromEmail")} error={errors.fromEmail?.message} />
          )} />
          <Controller name="replyTo" control={control} render={({ field }) => (
            <ConfigField label="Reply To" value={field.value || ""} onChange={field.onChange}
              onPlusClick={(event) => handlePlusClick(event, "replyTo")} error={errors.replyTo?.message} />
          )} />
          <Controller name="to" control={control} render={({ field }) => (
            <ConfigField label="To" required value={field.value || ""} onChange={field.onChange}
              onPlusClick={(event) => handlePlusClick(event, "to")} error={errors.to?.message} />
          )} />
          <Controller name="cc" control={control} render={({ field }) => (
            <ConfigField label="Cc" value={field.value || ""} onChange={field.onChange}
              onPlusClick={(event) => handlePlusClick(event, "cc")} error={errors.cc?.message} />
          )} />
          <Controller name="bcc" control={control} render={({ field }) => (
            <ConfigField label="Bcc" value={field.value || ""} onChange={field.onChange}
              onPlusClick={(event) => handlePlusClick(event, "bcc")} error={errors.bcc?.message} />
          )} />
          <Controller name="subject" control={control} render={({ field }) => (
            <ConfigField label="Subject" required value={field.value || ""} onChange={field.onChange}
              onPlusClick={(event) => handlePlusClick(event, "subject")} error={errors.subject?.message} />
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
                onPlusClick={(event) => handlePlusClick(event, "body")}
                error={errors.body?.message}
              />
            )}
          />
          <Controller
            name="htmlBody"
            control={control}
            render={() => (
              <>
                <WorkflowSection label="HTML Body">
                  <div className="flex flex-row items-center gap-2">
                    <div className="flex shrink-0 flex-row items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowBuilder(true)}
                          className="flex h-9 items-center rounded-xl px-4 nm-primary-btn text-xs font-semibold whitespace-nowrap"
                        >
                          Build Template
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPreview(true)}
                          className="nm-btn flex h-9 items-center rounded-xl px-4 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
                        >
                          Preview
                        </button>
                      </div>
                    <button
                      type="button"
                      onClick={(event) => handlePlusClick(event, "htmlBody")}
                      className="nm-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-primary transition-all"
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
              onPlusClick={(event) => handlePlusClick(event, "attachment")} error={errors.attachment?.message} />
          )} />
      </form>

      {showBuilder && (
        <HtmlTemplateBuilder
          initialHtml={watchedHtmlBody}
          webhookId={webhookId}
          triggerTestPayload={triggerTestPayload}
          triggerTestSamples={triggerTestSamples}
          cleanedFlat={cleanedPayload}
          onSave={(html) => {
            setValue("htmlBody", html, { shouldValidate: true, shouldDirty: true });
            setShowBuilder(false);

            const updatedValues = { ...getValues(), htmlBody: html };
            const result = mailSchema.safeParse(resolveFormValues(updatedValues));
            void Promise.resolve(onChange(updatedValues, result.success)).catch(() => {});

            if (activeNodeId) {
              void updateNode({ id: activeNodeId, patch: { config: updatedValues } })
                .unwrap()
                .catch(console.error);
            }
          }}
          onClose={() => setShowBuilder(false)}
        />
      )}

      <WebhookVariablePicker
        {...pickerProps}
        webhookId={webhookId}
        triggerTestPayload={triggerTestPayload}
        triggerTestSamples={triggerTestSamples}
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
            className="z-[1000] flex h-[80vh] w-[800px] max-w-[90vw] flex-col nm-card rounded-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-black/8 dark:border-white/5 px-5 py-3.5">
              <h2 id="email-preview-title" className="text-sm font-bold text-foreground">
                Email Preview
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="nm-btn flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-all"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              <iframe
                srcDoc={resolveTemplateVars(watchedHtmlBody || "", cleanedPayload)}
                className="h-full w-full border-0"
                title="Email Preview"
              />
            </div>
            <footer className="flex shrink-0 justify-end border-t border-black/8 dark:border-white/5 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="nm-btn flex h-8 items-center rounded-xl px-4 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
