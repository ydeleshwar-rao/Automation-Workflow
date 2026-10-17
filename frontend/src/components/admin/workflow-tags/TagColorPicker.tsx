"use client";

import React from "react";
import { cn } from "@/src/lib/utils";
import { TAG_COLORS } from "./tagColors";

interface TagColorPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
  isCompact?: boolean;
}

export function TagColorPicker({ selectedColor, onSelect, isCompact = false }: TagColorPickerProps) {
  return (
    <div className={cn("flex", isCompact ? "gap-0.5" : "gap-1")}>
      {TAG_COLORS.map((tagColor) => (
        <button
          key={tagColor}
          type="button"
          onClick={() => onSelect(tagColor)}
          aria-label={`Color ${tagColor}`}
          aria-pressed={selectedColor === tagColor}
          className={cn(
            "border-2 transition-all",
            isCompact ? "h-5 w-5 rounded" : "h-7 w-7 rounded-md",
            selectedColor === tagColor ? "scale-110 border-foreground" : "border-transparent hover:scale-105"
          )}
          style={{ backgroundColor: tagColor }}
        />
      ))}
    </div>
  );
}
