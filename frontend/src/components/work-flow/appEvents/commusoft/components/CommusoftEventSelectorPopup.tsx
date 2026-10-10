"use client";

import { SelectionPopup } from "@/src/components/ui/selection-popup";

interface ActionEventType {
  id: string;
  label: string;
  description?: string;
}

interface CommusoftEventSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (actionKey: string) => void;
  selectedEvent: string | null;
  events: ActionEventType[];
  isLoading: boolean;
}

export function CommusoftEventSelectorPopup({
  isOpen,
  onClose,
  onSelect,
  selectedEvent,
  events,
  isLoading,
}: CommusoftEventSelectorPopupProps) {
  return (
    <SelectionPopup
      isOpen={isOpen}
      onClose={onClose}
      onSelect={(item) => onSelect(item.id)}
      items={events}
      selectedId={selectedEvent ?? undefined}
      placeholder="Search events"
      title="Create"
      position={{ top: 240, right: 445 }}
      isLoading={isLoading}
      width="w-[380px]"
    />
  );
}
