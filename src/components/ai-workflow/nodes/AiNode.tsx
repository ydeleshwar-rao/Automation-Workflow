"use client";
import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { AiNodeData } from "@/src/lib/ai-workflow/types";

export function AiNode(props: NodeProps & { data: AiNodeData }) {
  return <BaseNode {...props} />;
}
