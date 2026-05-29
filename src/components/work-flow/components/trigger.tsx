"use client";

import { BaseNode } from "./base-node";

interface TriggerNodeProps {
  index?: number;
  description?: string;
  onClick?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  appLabel?: string;
  appIcon?: any;
  appColor?: string;
  eventLabel?: string;
  isActive?: boolean;
}

export function TriggerNode({ 
  index = 1, 
  description = "Select the event that starts your workflow",
  onClick,
  onDelete,
  onDuplicate,
  ...props
}: TriggerNodeProps) {
  return (
    <BaseNode
      type="trigger"
      label="Trigger"
      index={index}
      description={description}
      onClick={onClick}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      appLabel={props.appLabel}
      appIcon={props.appIcon}
      appColor={props.appColor}
      eventLabel={props.eventLabel}
      isActive={props.isActive}
    />
  );
}

