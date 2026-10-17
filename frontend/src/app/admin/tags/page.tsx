import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkflowTagsManager } from "@/src/components/admin/workflow-tags/WorkflowTagsManager";

export default function AdminWorkflowTagsPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>

      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Workflow Tags</h1>
        <p className="text-sm text-muted-foreground">
          Create the tags your team uses to label workflows, and choose whether tags are used at all.
          Only admins can create, rename or delete tags.
        </p>
      </div>

      <WorkflowTagsManager />
    </div>
  );
}
