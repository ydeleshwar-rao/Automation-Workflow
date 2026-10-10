"use client";

import dynamic from "next/dynamic";
import WorkflowLoading from "./loading";

const WorkflowBuilder = dynamic(
  () =>
    import("@/src/components/work-flow/WorkflowBuilder").then(
      (m) => m.WorkflowBuilder,
    ),
  {
    ssr: false,
    loading: () => <WorkflowLoading />,
  },
);

export default function WorkflowPage() {
  return <WorkflowBuilder />;
}
