"use client";

import React from "react";
import { SelectionPopup } from "@/src/components/ui/selection-popup";

interface EventSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (event: string) => void;
  selectedEvent: string | null;
}

export function EventSelectorPopup({
  isOpen,
  onClose,
  onSelect,
  selectedEvent,
}: EventSelectorPopupProps) {
  const events = [
    {
      id: "send_email",
      label: "Send Email",
      description: "Sends a plaintext email from a specific SMTP server.",
    },
  ];

  return (
    <SelectionPopup
      isOpen={isOpen}
      onClose={onClose}
      onSelect={(item) => onSelect(item.label)}
      items={events}
      selectedId={events.find(e => e.label === selectedEvent)?.id}
      placeholder="Search events"
      title="Create"
      position={{ top: 240, right: 445 }}
    />
  );
}

