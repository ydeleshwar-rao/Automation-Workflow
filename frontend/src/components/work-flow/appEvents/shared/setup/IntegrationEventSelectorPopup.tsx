"use client";

import { SelectionPopup } from "@/src/components/ui/selection-popup";
import type { ActionEventOption } from "@/src/components/work-flow/apiIntegrations/actionEventTypesApi";

const POPUP_TITLE = "Create";
const SEARCH_PLACEHOLDER = "Search events";
const POPUP_WIDTH_CLASS = "w-[380px]";
/** Anchors the popup beside the workflow sidebar's event field. */
const POPUP_POSITION = { top: 240, right: 445 };

interface IntegrationEventSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (actionKey: string) => void;
  selectedEvent: string | null;
  events: ActionEventOption[];
  isLoading: boolean;
}

/** Searchable list of an integration's trigger / action events. */
export function IntegrationEventSelectorPopup({
  isOpen,
  onClose,
  onSelect,
  selectedEvent,
  events,
  isLoading,
}: IntegrationEventSelectorPopupProps) {
  return (
    <SelectionPopup
      isOpen={isOpen}
      onClose={onClose}
      onSelect={(item) => onSelect(item.id)}
      items={events}
      selectedId={selectedEvent ?? undefined}
      placeholder={SEARCH_PLACEHOLDER}
      title={POPUP_TITLE}
      position={POPUP_POSITION}
      isLoading={isLoading}
      width={POPUP_WIDTH_CLASS}
    />
  );
}
