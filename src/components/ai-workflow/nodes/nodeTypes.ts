import { TriggerNode }  from "./TriggerNode";
import { AiNode }       from "./AiNode";
import { ActionNode }   from "./ActionNode";
import { LogicNode }    from "./LogicNode";
import { EngineNode }   from "./EngineNode";

export const nodeTypes = {
  trigger:             TriggerNode,
  ai:                  AiNode,
  action:              ActionNode,
  logic:               LogicNode,
  transform:           ActionNode,
  code:                LogicNode,
  "prompt-engine":     EngineNode,
  "chain-engine":      EngineNode,
  "rag-engine":        EngineNode,
  "stream-engine":     EngineNode,
  "vision-engine":     EngineNode,
  "agent-engine":      EngineNode,
  "graph-rag-engine":  EngineNode,
  "multi-agent-engine": EngineNode,
  "dspy-engine":       EngineNode,
  "sql-engine":        EngineNode,
  "nosql-engine":      EngineNode,
} as const;
