"use client";

import { ExternalLink, Zap } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import type { AppDef } from "../types/app-def.types";

type OAuthInlinePanelProps = {
  app: AppDef;
  onConnect: () => void;
  onCancel: () => void;
};

export function OAuthInlinePanel({
  app,
  onConnect,
  onCancel,
}: OAuthInlinePanelProps) {
  return (
    <div
      className="border-t px-5 py-5 animate-in slide-in-from-top-2 duration-300"
      style={{ borderColor: `${app.accentColor}30`, background: `${app.accentColor}08` }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1 space-y-1.5">
          <p className="text-[13px] font-semibold text-foreground">{app.description}</p>
          {app.scopes && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3 w-3 shrink-0" style={{ color: app.accentColor }} />
              <span>
                <span className="font-semibold">Permissions:</span> {app.scopes}
              </span>
            </p>
          )}
          <p className="text-[10px] text-muted-foreground italic">
            You will be redirected to {app.name} to authorize access.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            size="sm"
            className="h-9 px-6 font-bold rounded-lg shadow-md text-[12px] uppercase tracking-wide text-white"
            style={{ background: app.accentColor }}
            onClick={onConnect}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-2" />
            Connect {app.name}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-4 text-[12px] font-medium text-muted-foreground"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
