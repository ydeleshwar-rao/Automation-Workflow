"use client";

import { useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SaveAsTemplateModal } from "./SaveAsTemplateModal";

interface Props {
  workflowId: string | null;
  workflowName?: string;
}

export function SaveAsTemplateButton({ workflowId, workflowName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!workflowId}
        title={workflowId ? "Save this workflow as a reusable template" : "Select a workflow first"}
        className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        Save as Template
      </Button>
      {workflowId && (
        <SaveAsTemplateModal
          isOpen={open}
          onClose={() => setOpen(false)}
          sourceWorkflowId={workflowId}
          defaultName={workflowName ? `${workflowName} Template` : ""}
        />
      )}
    </>
  );
}
