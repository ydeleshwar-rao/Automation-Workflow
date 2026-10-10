"use client";

import { BaseNode } from "./base-node";

interface ActionNodeProps {
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

export function ActionNode({ 
  index = 2, 
  description = "Select the event for your workflow to run",
  onClick,
  onDelete,
  onDuplicate,
  ...props
}: ActionNodeProps) {
  return (
    <BaseNode
      type="action"
      label="Action"
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

