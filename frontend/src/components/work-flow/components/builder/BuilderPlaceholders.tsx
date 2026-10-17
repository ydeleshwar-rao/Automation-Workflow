import React from "react";
import { Activity, Zap } from "lucide-react";

/** Dotted grid behind the canvas and its empty state. */
export const CANVAS_BACKGROUND_CLASS =
  "bg-muted/30 [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1px)] [background-size:20px_20px]";

export function NoWorkflowSelected() {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-5 ${CANVAS_BACKGROUND_CLASS}`}>
      <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center">
        <Zap className="h-9 w-9 text-primary/60" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">No workflow selected</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Create a new workflow or pick one from the sidebar to start building.
        </p>
      </div>
    </div>
  );
}

interface MonitorEmptyStateProps {
  title: string;
  hint: string;
  iconSizeClass: string;
}

export function MonitorEmptyState({ title, hint, iconSizeClass }: MonitorEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Activity className={`${iconSizeClass} text-muted-foreground/40`} />
      <div className="text-center px-8">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
    </div>
  );
}
