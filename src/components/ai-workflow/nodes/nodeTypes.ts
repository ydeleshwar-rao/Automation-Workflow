// nodeTypes.ts — React Flow nodeTypes registry
// Map every category to the right neumorphic component.

import { TriggerNode }  from "./TriggerNode";
import { AiNode }       from "./AiNode";
import { ActionNode }   from "./ActionNode";
import { LogicNode }    from "./LogicNode";

// We reuse the same components for transform & code
export const nodeTypes = {
  trigger:   TriggerNode,
  ai:        AiNode,
  action:    ActionNode,
  logic:     LogicNode,
  transform: ActionNode,   // same shape, different colour
  code:      LogicNode,    // same shape, different colour
} as const;
