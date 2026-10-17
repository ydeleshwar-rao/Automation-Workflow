"use client";

import { useMemo } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useGetSmtpConnectionsQuery } from "@/src/components/work-flow/appEvents/mail/apiIntegrations/mailApi";
import type { SmtpConnection } from "@/src/components/work-flow/appEvents/mail/apiIntegrations/types/mailApis.type";

interface Props {
  /** Credential type hint (e.g. "smtp", "webhook", "oauth") */
  credentialType: string;
  /** Field key the backend expects (e.g. "smtp_id", "webhook_id") */
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
}

type SmtpOption = { id: string; label: string };

function toSmtpOption(connection: SmtpConnection): SmtpOption {
  const label = connection.name && connection.host ? `${connection.name} (${connection.host})` : connection.name || connection.host || connection.id;
  return { id: connection.id, label };
}

/**
 * Renders the correct picker for a credential field required by a template
 * node. When the backend type is known (smtp), fetches a list of user-owned
 * connections. For other types, falls back to a plain ID input so users can
 * paste credentials created elsewhere.
 */
export function CredentialSelector({ credentialType, fieldKey, value, onChange }: Props) {
  const type = credentialType.toLowerCase();

  if (type === "smtp") {
    return <SmtpPicker value={value} onChange={onChange} fieldKey={fieldKey} />;
  }

  return (
    <GenericIdInput
      value={value}
      onChange={onChange}
      fieldKey={fieldKey}
      credentialType={credentialType}
    />
  );
}

function SmtpPicker({
  value,
  onChange,
  fieldKey,
}: {
  value: string;
  onChange: (value: string) => void;
  fieldKey: string;
}) {
  const { data: connections, isLoading: loading, isError } = useGetSmtpConnectionsQuery();
  const options = useMemo(() => (connections ?? []).map(toSmtpOption), [connections]);
  const error = isError ? "Could not load SMTP connections" : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading SMTP connections…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{error}. Paste an SMTP connection ID instead:</span>
        <input
          className="ml-auto w-40 rounded border border-amber-300 bg-white px-2 py-1 text-xs"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="smtp-uuid"
        />
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        No SMTP connections yet — add one under the Mail integration, then come back.
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
      data-field={fieldKey}
    >
      <option value="">Select an SMTP connection…</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function GenericIdInput({
  value,
  onChange,
  fieldKey,
  credentialType,
}: {
  value: string;
  onChange: (value: string) => void;
  fieldKey: string;
  credentialType: string;
}) {
  return (
    <div className="space-y-1">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`Paste ${credentialType} ID`}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
        data-field={fieldKey}
      />
      <p className="text-[10px] text-muted-foreground">
        Paste the {credentialType} record ID you want this node to use for this new workflow.
      </p>
    </div>
  );
}
