"use client";

import { Check, Info, MessageCircle, Send } from "lucide-react";

interface WhatsAppTestStepProps {
  data: Record<string, unknown>;
  testStatus?: "idle" | "testing" | "success" | "failed";
  isTrigger?: boolean;
}

export function WhatsAppTestStep({
  data,
  testStatus = "idle",
  isTrigger = false,
}: WhatsAppTestStepProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-500">
      <div className="p-6 space-y-4 border-b border-black/8 dark:border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#25D366] flex items-center justify-center shadow-sm">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {isTrigger ? "Test WhatsApp Trigger" : "Send WhatsApp Message"}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isTrigger
                ? "Incoming WhatsApp messages will be received through your webhook."
                : "Testing will send this message through the connected phone."}
            </p>
          </div>
        </div>

        {testStatus === "testing" && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl animate-pulse">
            <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-[13px] font-bold text-primary">Sending WhatsApp message...</span>
          </div>
        )}

        {testStatus === "success" && (
          <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-xl">
            <Check className="w-4 h-4 text-success" />
            <span className="text-[13px] font-bold text-success">WhatsApp test completed successfully.</span>
          </div>
        )}

        {testStatus === "failed" && (
          <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <Info className="w-4 h-4 text-destructive" />
            <span className="text-[13px] font-bold text-destructive">WhatsApp test failed. Check phone connection and fields.</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-3">
        <div className="nm-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Send className="h-4 w-4 text-[#25D366]" />
            Message Preview
          </div>
          <p className="text-xs text-muted-foreground">To</p>
          <p className="text-sm font-semibold text-foreground break-words">{data?.to || "Not set"}</p>
          <p className="text-xs text-muted-foreground pt-2">Message</p>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{data?.message || "No message configured"}</p>
        </div>
      </div>
    </div>
  );
}
