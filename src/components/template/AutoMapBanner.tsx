"use client";

import { cn } from "@/src/lib/utils";

export interface AutoMapBannerProps {
  isAutoMapped: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onReset: () => void;
}

export function AutoMapBanner({ isAutoMapped, isEditing, onEdit, onReset }: AutoMapBannerProps) {
  if (!isAutoMapped) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
        "border-violet-200 bg-violet-50 text-violet-900"
      )}
    >
      {isEditing ? (
        <>
          <span>Editing — changes override auto-fill</span>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-md border border-violet-300 bg-white px-2 py-1 text-violet-800 hover:bg-violet-100"
          >
            Reset to auto-fill
          </button>
        </>
      ) : (
        <>
          <span>Auto-filled from webhook test data</span>
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-md border border-violet-300 bg-white px-2 py-1 text-violet-800 hover:bg-violet-100"
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}
