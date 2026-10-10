"use client";

import React, { useState } from "react";
import { Webhook } from "lucide-react";
import { AppSection, SelectSection } from "@/src/components/work-flow/appEvents/mail/components/shared/SelectorFields";
import { SelectionPopup } from "@/src/components/ui/selection-popup";
import { WorkflowEvent } from "../../../uiOrchestrator/types";

interface WebhookSetupStepProps {
  selectedApp?: {
    label: string;
    icon: any;
    color: string;
  };
  isTrigger?: boolean;
  selectedEvent: string | null;
  events: WorkflowEvent[];
  onEventSelect: (event: string) => void;
  onChangeApp?: () => void;
  webhookCreated?: boolean;
}

export function WebhookSetupStep({
  selectedApp,
  isTrigger,
  selectedEvent,
  events,
  onEventSelect,
  onChangeApp,
  webhookCreated,
}: WebhookSetupStepProps) {
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false);

  const selectionItems = events.map((event) => ({
    id: event.title,
    label: event.title,
    description: event.description,
    icon: event.type === "Instant" ? (
      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded font-black uppercase tracking-tight">
        Instant
      </span>
    ) : null
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      <AppSection
        appName={`${selectedApp?.label || "Webhooks"}`}
        appIcon={selectedApp?.icon || Webhook}
        onOverride={onChangeApp}
      />

      {webhookCreated ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Webhook className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Webhook created</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">Your webhook trigger is already set up and ready.</p>
          </div>
        </div>
      ) : (
        <>
          <SelectSection
            label="Trigger event"
            value={selectedEvent}
            placeholder="Choose an event"
            onClick={() => setIsEventPopupOpen(!isEventPopupOpen)}
            isOpen={isEventPopupOpen}
          />

          <SelectionPopup
            isOpen={isEventPopupOpen}
            onClose={() => setIsEventPopupOpen(false)}
            onSelect={(item) => onEventSelect(item.label)}
            items={selectionItems}
            selectedId={selectedEvent || undefined}
            placeholder="Search events"
            title="Trigger Event"
            position={{ top: 220, right: 445 }}
          />
        </>
      )}
    </div>
  );
}

