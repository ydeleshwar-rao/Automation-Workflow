"use client";

import React, { useState } from "react";
import { Search, Check, Mail, Send, Info, ArrowRight } from "lucide-react";
import { Input } from "@/src/components/ui/input";

interface MailTestStepProps {
  data: Record<string, any>;
  testStatus: 'idle' | 'testing' | 'success' | 'failed';
}

function resolveToken(value: string): string {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g, (_, val) => val);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

const FIELD_LABELS: Record<string, string> = {
  fromName: "From Name",
  fromEmail: "From Email",
  replyTo: "Reply To",
  to: "To",
  cc: "CC",
  bcc: "BCC",
  subject: "Subject",
  body: "Body",
  htmlBody: "HTML Body",
  attachment: "Attachment",
  accountId: "Account ID",
  accountName: "Account Name",
};

export function MailTestStep({ data, testStatus }: MailTestStepProps) {
  const [search, setSearch] = useState("");

  const entries = Object.entries(data)
    .map(([key, val]) => ({
      key,
      label: FIELD_LABELS[key] ?? key,
      value: typeof val === "string" ? resolveToken(val) : String(val ?? ""),
    }))
    .filter(({ value }) => value !== "")
    .filter(({ label }) =>
      label.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center">
            <Send className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Send Email</p>
            <p className="text-[11px] text-muted-foreground">Review the data before sending</p>
          </div>
        </div>

        {/* Status */}
        {testStatus === 'testing' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-pulse">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin shrink-0" />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Sending email…</span>
          </div>
        )}
        {testStatus === 'success' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Email sent successfully!</span>
          </div>
        )}
        {testStatus === 'failed' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg">
            <Info className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-xs font-semibold text-destructive">Failed. Check your SMTP settings.</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search fields…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted border-border rounded-lg placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Scrollable field list */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-2">
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm italic py-10">No fields to display</p>
        ) : (
          entries.map(({ key, label, value }) => {
            const isHtml = key === "htmlBody";
            return (
              <div
                key={key}
                className="flex gap-3 p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted transition-all"
              >
                <div className="shrink-0 w-[110px]">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {isHtml ? (
                    <div className="max-h-36 overflow-y-auto no-scrollbar rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[13px] text-foreground font-medium break-words whitespace-pre-wrap leading-relaxed">
                        {stripHtml(value)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[13px] text-foreground font-medium break-words whitespace-pre-wrap leading-snug">
                      {value}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
