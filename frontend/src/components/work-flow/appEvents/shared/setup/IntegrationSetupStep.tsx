"use client";

import { useState } from "react";
import { Link2, type LucideIcon } from "lucide-react";
import { AppSection, SelectSection } from "@/src/components/work-flow/appEvents/mail/components/shared/SelectorFields";
import { useIntegrationStatus } from "@/src/components/app-connections/hooks/useIntegrationStatus";
import type { IntegrationAppId } from "@/src/components/app-connections/apiIntegrations/integrationsApi";
import {
  useActionEventOptions,
  type ActionEventIntegrationSlug,
} from "@/src/components/work-flow/apiIntegrations/actionEventTypesApi";
import { ConnectInlineSection } from "@/src/components/work-flow/appEvents/shared/ConnectInlineSection";
import { IntegrationEventSelectorPopup } from "./IntegrationEventSelectorPopup";

const EVENT_PLACEHOLDER = "Choose an event";

export interface EventFieldLabels {
  trigger: string;
  action: string;
}

const DEFAULT_EVENT_FIELD_LABELS: EventFieldLabels = {
  trigger: "Trigger event",
  action: "Action event",
};

/** Everything that distinguishes one integration's Setup step from another's. */
export interface IntegrationSetupConfig {
  appId: IntegrationAppId;
  /** Name shown in the "App" section. */
  appName: string;
  /** Name shown in the connect prompt; defaults to `appName`. */
  connectAppName?: string;
  appImage: string;
  accentColor: string;
  actionEventSlug: ActionEventIntegrationSlug;
  eventFieldLabels?: EventFieldLabels;
}

export interface IntegrationSetupStepProps {
  selectedEvent: string | null;
  onEventSelect: (event: string) => void;
  selectedApp: { label: string; icon?: LucideIcon; color: string };
  isTrigger: boolean;
  onChangeApp?: () => void;
}

interface ConfiguredIntegrationSetupStepProps extends IntegrationSetupStepProps {
  config: IntegrationSetupConfig;
}

/** Setup step shared by integrations whose events come from the action-event catalogue. */
export function IntegrationSetupStep({
  config,
  selectedEvent,
  onEventSelect,
  selectedApp,
  isTrigger,
  onChangeApp,
}: ConfiguredIntegrationSetupStepProps) {
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false);

  const { isConnected } = useIntegrationStatus(config.appId);
  const { events, isLoading } = useActionEventOptions(config.actionEventSlug, isTrigger);

  const AppIcon = selectedApp.icon || Link2;
  const displayLabel = events.find((event) => event.id === selectedEvent)?.label ?? selectedEvent;
  const eventFieldLabels = config.eventFieldLabels ?? DEFAULT_EVENT_FIELD_LABELS;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <AppSection
        appName={config.appName}
        appIcon={AppIcon}
        onOverride={onChangeApp}
        connected={isConnected}
      />

      {!isConnected && (
        <ConnectInlineSection
          appId={config.appId}
          appName={config.connectAppName ?? config.appName}
          accentColor={config.accentColor}
          appImage={config.appImage}
        />
      )}

      {isConnected && (
        <>
          <SelectSection
            label={isTrigger ? eventFieldLabels.trigger : eventFieldLabels.action}
            value={displayLabel}
            placeholder={EVENT_PLACEHOLDER}
            onClick={() => setIsEventPopupOpen(!isEventPopupOpen)}
            isOpen={isEventPopupOpen}
          />

          <IntegrationEventSelectorPopup
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
