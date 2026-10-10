"use client";
import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { AiNodeData } from "@/src/lib/ai-workflow/types";

// Logic nodes (if/else, loop) may have multiple output handles in the future.
// For now, single output is fine.
export function LogicNode(props: NodeProps & { data: AiNodeData }) {
  return <BaseNode {...props} />;
}
