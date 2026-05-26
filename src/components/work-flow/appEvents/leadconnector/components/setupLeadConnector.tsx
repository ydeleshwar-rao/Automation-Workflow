"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { LcEventSelectorPopup } from "./LcEventSelectorPopup";
import { AppSection, SelectSection } from "@/src/components/work-flow/appEvents/mail/components/shared/SelectorFields";
import { useLeadsHubStatus } from "@/src/components/app-connections/leadshubs/hooks/useLeadsHubStatus";
import { useActionEventTypes } from "@/src/components/app-connections/leadshubs/hooks/useActionEventTypes";

interface LeadConnectorSetupStepProps {
  selectedEvent: string | null;
  onEventSelect: (event: string) => void;
  selectedApp: { label: string; icon: any; color: string };
  isTrigger: boolean;
  onChangeApp?: () => void;
}

export function LeadConnectorSetupStep({
  selectedEvent,
  onEventSelect,
  selectedApp,
  isTrigger,
  onChangeApp,
}: LeadConnectorSetupStepProps) {
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false);

  const { connected: isConnected } = useLeadsHubStatus();
  const { events, isLoading } = useActionEventTypes(isTrigger);

  const AppIcon = selectedApp.icon || Link2;

  // selectedEvent holds the action_key — look up the human-readable label for display
  const displayLabel = events.find((e) => e.id === selectedEvent)?.label ?? selectedEvent;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <AppSection
        appName="LeadConnector"
        appIcon={AppIcon}
        onOverride={onChangeApp}
        connected={isConnected}
      />

      <SelectSection
        label="Action event"
        value={displayLabel}
        placeholder="Choose an event"
        onClick={() => setIsEventPopupOpen(!isEventPopupOpen)}
        isOpen={isEventPopupOpen}
      />

      <LcEventSelectorPopup
        isOpen={isEventPopupOpen}
        onClose={() => setIsEventPopupOpen(false)}
        onSelect={onEventSelect}
        selectedEvent={selectedEvent}
        events={events}
        isLoading={isLoading}
      />
    </div>
  );
}
