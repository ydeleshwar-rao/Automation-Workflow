"use client";

import React from "react";
import { Tags } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/src/components/ui/switch";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { useUpdateTagSettingsMutation } from "@/src/components/work-flow/apiIntegrations/folderTagApi";

/** The organization-wide switch: when off, the Tags field and tag filter disappear from the workflow builder. */
export function TagSettingsCard({ isEnabled }: { isEnabled: boolean }) {
  const [updateTagSettings, { isLoading }] = useUpdateTagSettingsMutation();

  const toggleTags = async (shouldEnable: boolean) => {
    try {
      await updateTagSettings({ enabled: shouldEnable }).unwrap();
      toast.success(shouldEnable ? "Workflow tags turned on" : "Workflow tags turned off");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update the tag setting"));
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-5">
      <div className="flex items-start gap-4">
        <Tags className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Use tags on workflows</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When on, people can pick from the tags below when they create a workflow, and filter workflows by tag.
            When off, tags are hidden in the workflow builder. Existing tags are kept.
          </p>
        </div>
        <Switch
          checked={isEnabled}
          disabled={isLoading}
          onCheckedChange={toggleTags}
          aria-label="Use tags on workflows"
        />
      </div>
    </section>
  );
}
