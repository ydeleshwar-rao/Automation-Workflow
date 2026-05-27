"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Sm8EventSelectorPopup } from "./Sm8EventSelectorPopup";
import { AppSection, SelectSection } from "@/src/components/work-flow/appEvents/mail/components/shared/SelectorFields";
import { useServiceM8Status } from "@/src/components/app-connections/servicem8/hooks/useServiceM8Status";
import { useServiceM8ActionEventTypes } from "@/src/components/app-connections/servicem8/hooks/useServiceM8ActionEventTypes";
import { ConnectInlineSection } from "@/src/components/work-flow/appEvents/shared/ConnectInlineSection";

interface ServiceM8SetupStepProps {
  selectedEvent: string | null;
  onEventSelect: (event: string) => void;
  selectedApp: { label: string; icon: any; color: string };
  isTrigger: boolean;
  onChangeApp?: () => void;
}

export function ServiceM8SetupStep({
  selectedEvent,
  onEventSelect,
  selectedApp,
  isTrigger,
  onChangeApp,
}: ServiceM8SetupStepProps) {
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false);

  const { connected: isConnected } = useServiceM8Status();
  const { events, isLoading } = useServiceM8ActionEventTypes(isTrigger);

  const AppIcon = selectedApp.icon || Link2;
  const displayLabel = events.find((e) => e.id === selectedEvent)?.label ?? selectedEvent;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <AppSection
        appName="ServiceM8"
        appIcon={AppIcon}
        onOverride={onChangeApp}
        connected={isConnected}
      />

      {/* ── Connect prompt (shown only when not connected) ── */}
      {!isConnected && (
        <ConnectInlineSection
          appId="servicem8"
          appName="ServiceM8"
          accentColor="#7cc736"
          appImage="/image_3_servicem8.png"
        />
      )}

      {/* ── Event picker (shown only when connected) ── */}
      {isConnected && (
        <>
          <SelectSection
            label={isTrigger ? "Trigger event" : "Action event"}
            value={displayLabel}
            placeholder="Choose an event"
            onClick={() => setIsEventPopupOpen(!isEventPopupOpen)}
            isOpen={isEventPopupOpen}
          />

          <Sm8EventSelectorPopup
            isOpen={isEventPopupOpen}
            onClose={() => setIsEventPopupOpen(false)}
            onSelect={onEventSelect}
            selectedEvent={selectedEvent}
            events={events}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
