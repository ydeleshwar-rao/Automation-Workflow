// node-catalog.ts — every available node type shown in the node palette

import type { NodeCategory } from "./types";

export interface NodeDefinition {
  nodeType:    string;
  label:       string;
  description: string;
  category:    NodeCategory;
  icon:        string;   // emoji
  defaultConfig: Record<string, unknown>;
}

// ── TRIGGER ──────────────────────────────────────────────────────────────────
const TRIGGERS: NodeDefinition[] = [
  {
    nodeType: "manual-trigger",
    label: "Manual Trigger",
    description: "Start the flow manually by clicking Run",
    category: "trigger",
    icon: "⚡",
    defaultConfig: {},
  },
  {
    nodeType: "schedule-trigger",
    label: "Schedule",
    description: "Run on a cron schedule (e.g. every hour)",
    category: "trigger",
    icon: "🕐",
    defaultConfig: { cron: "0 * * * *" },
  },
  {
    nodeType: "webhook-trigger",
    label: "Webhook",
    description: "Triggered by an incoming HTTP POST",
    category: "trigger",
    icon: "🔗",
    defaultConfig: { method: "POST", path: "" },
  },
  {
    nodeType: "form-trigger",
    label: "Form Submit",
    description: "Triggered when a form is submitted",
    category: "trigger",
    icon: "📋",
    defaultConfig: {},
  },
];

// ── AI / LLM ─────────────────────────────────────────────────────────────────
const AI_NODES: NodeDefinition[] = [
  {
    nodeType: "openai-chat",
    label: "OpenAI Chat",
    description: "Send a prompt to GPT-4o and get a response",
    category: "ai",
    icon: "🤖",
    defaultConfig: { model: "gpt-4o", systemPrompt: "", userPrompt: "", temperature: 0.7 },
  },
  {
    nodeType: "claude-chat",
    label: "Claude",
    description: "Chat with Anthropic Claude (Sonnet 4.6)",
    category: "ai",
    icon: "🧠",
    defaultConfig: { model: "claude-sonnet-4-6", systemPrompt: "", userPrompt: "", maxTokens: 1024 },
  },
  {
    nodeType: "gemini-chat",
    label: "Gemini",
    description: "Generate text with Google Gemini",
    category: "ai",
    icon: "✨",
    defaultConfig: { model: "gemini-1.5-pro", prompt: "" },
  },
  {
    nodeType: "ai-classifier",
    label: "AI Classifier",
    description: "Classify text into predefined categories",
    category: "ai",
    icon: "🏷️",
    defaultConfig: { categories: [], inputField: "" },
  },
  {
    nodeType: "ai-extractor",
    label: "AI Data Extractor",
    description: "Extract structured data from unstructured text",
    category: "ai",
    icon: "🔍",
    defaultConfig: { schema: {}, inputField: "" },
  },
  {
    nodeType: "ai-summariser",
    label: "AI Summariser",
    description: "Summarise long text into key points",
    category: "ai",
    icon: "📝",
    defaultConfig: { style: "bullet", maxLength: 200, inputField: "" },
  },
  {
    nodeType: "ai-image",
    label: "Image Generation",
    description: "Generate images using DALL·E 3",
    category: "ai",
    icon: "🎨",
    defaultConfig: { model: "dall-e-3", prompt: "", size: "1024x1024" },
  },
  {
    nodeType: "ai-vision",
    label: "Vision Analysis",
    description: "Analyse an image with GPT-4o Vision",
    category: "ai",
    icon: "👁️",
    defaultConfig: { prompt: "Describe this image", imageUrl: "" },
  },
  // ── AI Engines ─────────────────────────────────────────────────────────
  {
    nodeType: "prompt-engine",
    label: "Prompt Engine",
    description: "Single LLM call driven by a template with variables",
    category: "ai",
    icon: "📝",
    defaultConfig: { system_prompt: "", user_template: "{{input}}", variables: [], output_schema: "", complexity: 5, temperature: 0.7, max_tokens: 2000 },
  },
  {
    nodeType: "chain-engine",
    label: "Chain Engine",
    description: "Sequential LLM steps — each output feeds the next",
    category: "ai",
    icon: "🔗",
    defaultConfig: { steps: [{ name: "Step 1", prompt_template: "{{input}}", complexity: 5, temperature: 0.7, max_tokens: 1000, output_schema: "" }] },
  },
  {
    nodeType: "rag-engine",
    label: "RAG Engine",
    description: "Retrieval-augmented generation from your documents",
    category: "ai",
    icon: "📚",
    defaultConfig: { system_prompt: "Answer using only the provided context.", chunk_size: 512, top_k: 5, complexity: 6, temperature: 0.3, max_tokens: 2000 },
  },
  {
    nodeType: "stream-engine",
    label: "Stream Engine",
    description: "Real-time token streaming via SSE",
    category: "ai",
    icon: "🌊",
    defaultConfig: { system_prompt: "", user_template: "{{input}}", variables: [], complexity: 5, temperature: 0.7, max_tokens: 2000 },
  },
  {
    nodeType: "vision-engine",
    label: "Vision Engine",
    description: "Multimodal image + text analysis",
    category: "ai",
    icon: "👁️",
    defaultConfig: { system_prompt: "Analyze the provided image.", user_template: "Describe this image: {{image_url}}", variables: ["image_url"], output_schema: "", image_source: "url", complexity: 7, temperature: 0.5, max_tokens: 1000 },
  },
  {
    nodeType: "agent-engine",
    label: "Agent Engine",
    description: "Autonomous AI agent with tools and ReAct loop",
    category: "ai",
    icon: "🤖",
    defaultConfig: { instructions: "You are a helpful AI assistant.", tools: [], custom_tools: [], mcp_servers: [], max_iterations: 10, complexity: 8, temperature: 0.5, max_tokens: 4000 },
  },
  {
    nodeType: "graph-rag-engine",
    label: "Graph RAG Engine",
    description: "RAG with entity relationship graph traversal",
    category: "ai",
    icon: "🕸️",
    defaultConfig: { system_prompt: "Answer using the provided context.", chunk_size: 512, top_k: 5, hop_depth: 2, complexity: 7, temperature: 0.3, max_tokens: 2000 },
  },
  {
    nodeType: "multi-agent-engine",
    label: "Multi-Agent Engine",
    description: "Crew of AI agents — pipeline, parallel, or supervisor mode",
    category: "ai",
    icon: "👥",
    defaultConfig: { mode: "pipeline", agents: [{ name: "Agent 1", instructions: "", tools: [], custom_tools: [], complexity: 6, temperature: 0.7, max_tokens: 2000 }, { name: "Agent 2", instructions: "", tools: [], custom_tools: [], complexity: 6, temperature: 0.7, max_tokens: 2000 }], supervisor_instructions: "", complexity: 7, temperature: 0.7, max_tokens: 2000, max_rounds: 5 },
  },
  {
    nodeType: "dspy-engine",
    label: "DSPy Engine",
    description: "Auto-optimized LLM programs with few-shot examples",
    category: "ai",
    icon: "🧠",
    defaultConfig: { program_type: "predict", task_description: "", input_fields: ["input"], output_fields: ["output"], examples: [], complexity: 5, temperature: 0.0, max_tokens: 2000 },
  },
  {
    nodeType: "sql-engine",
    label: "SQL Engine",
    description: "Natural language → SQL query → execute → explain results",
    category: "ai",
    icon: "🗄️",
    defaultConfig: { db_url: "", system_prompt: "You are a SQL expert. Convert the user's natural language question into a valid SQL SELECT query. Return ONLY the SQL query — no markdown, no explanation.", allowed_tables: [], schema_hint: "", auto_schema: true, max_rows: 100, safe_mode: true, explain_results: true, complexity: 5, temperature: 0.0, max_tokens: 1024 },
  },
  {
    nodeType: "nosql-engine",
    label: "NoSQL Engine",
    description: "Natural language → MongoDB / Redis / Elasticsearch query → execute → explain",
    category: "ai",
    icon: "🔀",
    defaultConfig: { db_type: "mongodb", connection_url: "", database: "", collection: "", es_index: "", schema_hint: "", max_results: 100, safe_mode: true, explain_results: true, complexity: 5, temperature: 0.0, max_tokens: 1024 },
  },
];

// ── ACTIONS ───────────────────────────────────────────────────────────────────
const ACTION_NODES: NodeDefinition[] = [
  {
    nodeType: "send-email",
    label: "Send Email",
    description: "Send an email via SMTP",
    category: "action",
    icon: "📧",
    defaultConfig: { to: "", subject: "", body: "" },
  },
  {
    nodeType: "http-request",
    label: "HTTP Request",
    description: "Make a GET / POST / PUT / DELETE call",
    category: "action",
    icon: "🌐",
    defaultConfig: { method: "GET", url: "", headers: {}, body: "" },
  },
  {
    nodeType: "create-sm8-job",
    label: "Create ServiceM8 Job",
    description: "Create a new job in ServiceM8",
    category: "action",
    icon: "🔧",
    defaultConfig: { status: "Quote", description: "" },
  },
  {
    nodeType: "create-lead",
    label: "Create LeadsHub Contact",
    description: "Add a contact to LeadsHub CRM",
    category: "action",
    icon: "👤",
    defaultConfig: { firstName: "", lastName: "", email: "" },
  },
  {
    nodeType: "google-sheets",
    label: "Google Sheets",
    description: "Append a row to a Google Sheet",
    category: "action",
    icon: "📊",
    defaultConfig: { spreadsheetId: "", range: "Sheet1!A1", values: [] },
  },
  {
    nodeType: "slack-message",
    label: "Slack Message",
    description: "Post a message to a Slack channel",
    category: "action",
    icon: "💬",
    defaultConfig: { channel: "#general", message: "" },
  },
  {
    nodeType: "whatsapp-message",
    label: "WhatsApp Message",
    description: "Send a WhatsApp message",
    category: "action",
    icon: "📱",
    defaultConfig: { to: "", message: "" },
  },
];

// ── LOGIC ─────────────────────────────────────────────────────────────────────
const LOGIC_NODES: NodeDefinition[] = [
  {
    nodeType: "if-else",
    label: "If / Else",
    description: "Branch based on a condition",
    category: "logic",
    icon: "🔀",
    defaultConfig: { condition: "", truePath: "true", falsePath: "false" },
  },
  {
    nodeType: "switch",
    label: "Switch",
    description: "Route to one of many branches",
    category: "logic",
    icon: "🔄",
    defaultConfig: { field: "", cases: [] },
  },
  {
    nodeType: "loop",
    label: "Loop / For Each",
    description: "Iterate over an array of items",
    category: "logic",
    icon: "🔁",
    defaultConfig: { arrayField: "" },
  },
  {
    nodeType: "wait",
    label: "Wait",
    description: "Pause execution for a set time",
    category: "logic",
    icon: "⏳",
    defaultConfig: { delay: 5, unit: "seconds" },
  },
  {
    nodeType: "merge",
    label: "Merge",
    description: "Combine data from multiple branches",
    category: "logic",
    icon: "🔀",
    defaultConfig: { mode: "merge" },
  },
];

// ── TRANSFORM ─────────────────────────────────────────────────────────────────
const TRANSFORM_NODES: NodeDefinition[] = [
  {
    nodeType: "set-variable",
    label: "Set Variable",
    description: "Set or transform field values",
    category: "transform",
    icon: "✏️",
    defaultConfig: { fields: [] },
  },
  {
    nodeType: "json-parse",
    label: "JSON Parse / Stringify",
    description: "Parse a JSON string or stringify an object",
    category: "transform",
    icon: "{ }",
    defaultConfig: { operation: "parse", field: "" },
  },
  {
    nodeType: "filter",
    label: "Filter",
    description: "Keep only items matching a condition",
    category: "transform",
    icon: "🔍",
    defaultConfig: { condition: "" },
  },
  {
    nodeType: "format-date",
    label: "Format Date",
    description: "Convert or format a date value",
    category: "transform",
    icon: "📅",
    defaultConfig: { inputField: "", outputFormat: "YYYY-MM-DD" },
  },
];

// ── CODE ──────────────────────────────────────────────────────────────────────
const CODE_NODES: NodeDefinition[] = [
  {
    nodeType: "js-code",
    label: "JavaScript",
    description: "Run custom JavaScript code",
    category: "code",
    icon: "JS",
    defaultConfig: { code: "// Access input via $input\nreturn $input;" },
  },
  {
    nodeType: "expression",
    label: "Expression",
    description: "Evaluate a template expression",
    category: "code",
    icon: "=",
    defaultConfig: { expression: "" },
  },
];

// ── Catalog ───────────────────────────────────────────────────────────────────
export const NODE_CATALOG: NodeDefinition[] = [
  ...TRIGGERS,
  ...AI_NODES,
  ...ACTION_NODES,
  ...LOGIC_NODES,
  ...TRANSFORM_NODES,
  ...CODE_NODES,
];

export const CATALOG_BY_CATEGORY: Record<NodeCategory, NodeDefinition[]> = {
  trigger:   TRIGGERS,
  ai:        AI_NODES,
  action:    ACTION_NODES,
  logic:     LOGIC_NODES,
  transform: TRANSFORM_NODES,
  code:      CODE_NODES,
};

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  trigger:   "Triggers",
  ai:        "AI / LLM",
  action:    "Actions",
  logic:     "Logic & Flow",
  transform: "Transform",
  code:      "Code",
};

export const CATEGORY_EMOJIS: Record<NodeCategory, string> = {
  trigger:   "⚡",
  ai:        "🤖",
  action:    "🔌",
  logic:     "🔀",
  transform: "⚙️",
  code:      "💻",
};
