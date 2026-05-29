export interface PromptEngineConfig {
  system_prompt: string;
  user_template: string;
  variables: string[];
  output_schema: string;
  complexity: number;
  temperature: number;
  max_tokens: number;
}

export interface ChainStep {
  name: string;
  prompt_template: string;
  complexity: number;
  temperature: number;
  max_tokens: number;
  output_schema: string;
}

export interface ChainEngineConfig {
  steps: ChainStep[];
}

export interface RagEngineConfig {
  system_prompt: string;
  chunk_size: number;
  top_k: number;
  complexity: number;
  temperature: number;
  max_tokens: number;
}

export type StreamEngineConfig = PromptEngineConfig;

export interface VisionEngineConfig extends PromptEngineConfig {
  image_source: 'url' | 'base64';
}

export type BuiltInTool = 'http_request' | 'calculator' | 'datetime' | 'json_parser';

export interface CustomTool {
  name: string;
  description: string;
  url: string;
}

export interface McpServer {
  name: string;
  url: string;
}

export interface AgentEngineConfig {
  instructions: string;
  tools: BuiltInTool[];
  custom_tools: CustomTool[];
  mcp_servers: McpServer[];
  max_iterations: number;
  complexity: number;
  temperature: number;
  max_tokens: number;
}

export interface GraphRagEngineConfig extends RagEngineConfig {
  hop_depth: number;
}

export type AgentMode = 'pipeline' | 'parallel' | 'supervisor';

export interface AgentRoleConfig {
  name: string;
  instructions: string;
  tools: BuiltInTool[];
  custom_tools: CustomTool[];
  complexity: number;
  temperature: number;
  max_tokens: number;
}

export interface MultiAgentEngineConfig {
  mode: AgentMode;
  agents: AgentRoleConfig[];
  supervisor_instructions: string;
  complexity: number;
  temperature: number;
  max_tokens: number;
  max_rounds: number;
}

export type ProgramType = 'predict' | 'chain_of_thought';

export interface DSPyExample {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
}

export interface DSPyEngineConfig {
  program_type: ProgramType;
  task_description: string;
  input_fields: string[];
  output_fields: string[];
  examples: DSPyExample[];
  complexity: number;
  temperature: number;
  max_tokens: number;
}

export const BUILT_IN_TOOLS: { id: BuiltInTool; label: string; description: string }[] = [
  { id: 'http_request', label: 'HTTP Request', description: 'Call any URL (GET/POST/PUT/DELETE)' },
  { id: 'calculator',   label: 'Calculator',   description: 'Evaluate math expressions safely' },
  { id: 'datetime',     label: 'Date & Time',  description: 'Get current UTC timestamp' },
  { id: 'json_parser',  label: 'JSON Parser',  description: 'Parse JSON and extract by dot-path' },
];

export interface SqlEngineConfig {
  db_url: string;
  system_prompt: string;
  allowed_tables: string[];
  schema_hint: string;
  auto_schema: boolean;
  max_rows: number;
  safe_mode: boolean;
  explain_results: boolean;
  complexity: number;
  temperature: number;
  max_tokens: number;
}

export type NoSqlDbType = 'mongodb' | 'redis' | 'elasticsearch';

export interface NoSqlEngineConfig {
  db_type: NoSqlDbType;
  connection_url: string;
  database: string;
  collection: string;
  es_index: string;
  schema_hint: string;
  max_results: number;
  safe_mode: boolean;
  explain_results: boolean;
  complexity: number;
  temperature: number;
  max_tokens: number;
}

export type EngineNodeType =
  | 'prompt-engine'
  | 'chain-engine'
  | 'rag-engine'
  | 'stream-engine'
  | 'vision-engine'
  | 'agent-engine'
  | 'graph-rag-engine'
  | 'multi-agent-engine'
  | 'dspy-engine'
  | 'sql-engine'
  | 'nosql-engine';
