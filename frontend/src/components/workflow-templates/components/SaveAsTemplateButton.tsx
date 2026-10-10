"use client";

import { useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { SaveAsTemplateModal } from "./SaveAsTemplateModal";

interface Props {
  workflowId: string | null;
  workflowName?: string;
}

export function SaveAsTemplateButton({ workflowId, workflowName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!workflowId}
        title={workflowId ? "Save this workflow as a reusable template" : "Select a workflow first"}
        className="nm-btn flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        Save as Template
      </button>
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
