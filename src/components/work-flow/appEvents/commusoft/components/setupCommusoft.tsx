"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { CommusoftEventSelectorPopup } from "./CommusoftEventSelectorPopup";
import { AppSection, SelectSection } from "@/src/components/work-flow/appEvents/mail/components/shared/SelectorFields";
import { useCommusoftStatus } from "@/src/components/app-connections/commusoft/hooks/useCommusoftStatus";
import { useCommusoftActionEventTypes } from "@/src/components/app-connections/commusoft/hooks/useCommusoftActionEventTypes";

interface CommusoftSetupStepProps {
  selectedEvent: string | null;
  onEventSelect: (event: string) => void;
  selectedApp: { label: string; icon: any; color: string };
  isTrigger: boolean;
  onChangeApp?: () => void;
}

export function CommusoftSetupStep({
  selectedEvent,
  onEventSelect,
  selectedApp,
  isTrigger,
  onChangeApp,
}: CommusoftSetupStepProps) {
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false);

  const { connected: isConnected } = useCommusoftStatus();
  // Backend exposes triggers and actions on separate endpoints; pick based on node kind.
  const { events, isLoading } = useCommusoftActionEventTypes(isTrigger);

  const AppIcon = selectedApp.icon || Link2;

  const displayLabel = events.find((e) => e.id === selectedEvent)?.label ?? selectedEvent;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <AppSection
        appName="Commusoft"
        appIcon={AppIcon}
        onOverride={onChangeApp}
        connected={isConnected}
      />

      <SelectSection
        label={isTrigger ? "Trigger event" : "Action event"}
        value={displayLabel}
        placeholder="Choose an event"
        onClick={() => setIsEventPopupOpen(!isEventPopupOpen)}
        isOpen={isEventPopupOpen}
      />

      <CommusoftEventSelectorPopup
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
