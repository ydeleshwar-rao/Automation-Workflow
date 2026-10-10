// node-catalog.ts — every available node type shown in the node palette

import type { NodeCategory } from "./types";

export interface NodeDefinition {
  nodeType:    string;
  label:       string;
  description: string;
  hint?:        string;
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
    nodeType: "harness-prompt",
    label: "Prompt Engine",
    description: "Single LLM call with templates and optional JSON output",
    hint: "Use for one focused AI task: classify, summarize, write, extract, or answer from the current input. Input is {{input}} plus variables; output is text or JSON when output_schema is set.",
    category: "ai",
    icon: "PR",
    defaultConfig: {
      system_prompt: "You are a helpful assistant.",
      user_template: "{{input}}",
      variables: "[]",
      output_schema: "",
      temperature: 0.7,
      max_tokens: 1024,
      complexity: 5,
    },
  },
  {
    nodeType: "harness-chain",
    label: "Chain Engine",
    description: "Run ordered LLM steps where each step feeds the next",
    hint: "Use when a task needs stages, like classify -> research -> draft -> format. Each step can reference {{input}} and previous step names.",
    category: "ai",
    icon: "CH",
    defaultConfig: {
      steps: '[{"name":"step_1","prompt_template":"{{input}}","complexity":5,"temperature":0.7,"max_tokens":1024}]',
    },
  },
  {
    nodeType: "harness-rag",
    label: "RAG Engine",
    description: "Answer questions from uploaded/indexed documents",
    hint: "Use when the AI must stay grounded in documents. Upload docs for the flow first; runtime input is the question, output includes answer and sources.",
    category: "ai",
    icon: "RG",
    defaultConfig: {
      system_prompt: "Answer using only the provided context. If unsure, say so.",
      top_k: 4,
      chunk_size: 512,
      chunk_overlap: 50,
      temperature: 0.3,
      max_tokens: 1024,
      complexity: 5,
    },
  },
  {
    nodeType: "harness-agent",
    label: "Agent Engine",
    description: "Autonomous ReAct agent with built-in/custom tools",
    hint: "Use for tasks that need decisions and tool use, like calling APIs, parsing JSON, calculating, or checking current time. Keep max_iterations bounded.",
    category: "ai",
    icon: "AG",
    defaultConfig: {
      instructions: "Complete the user request.",
      tools: '["datetime","calculator"]',
      custom_tools: "[]",
      mcp_servers: "[]",
      max_iterations: 10,
      temperature: 0.7,
      max_tokens: 2048,
      complexity: 8,
    },
  },
  {
    nodeType: "harness-stream",
    label: "Stream Engine",
    description: "Prompt engine that streams tokens as they arrive",
    hint: "Use for chat or long responses where the user should see partial output immediately. Same prompt template idea as Prompt Engine, but execution can stream.",
    category: "ai",
    icon: "ST",
    defaultConfig: {
      system_prompt: "You are a helpful assistant.",
      user_template: "{{input}}",
      variables: "[]",
      complexity: 5,
      temperature: 0.7,
      max_tokens: 1024,
    },
  },
  {
    nodeType: "harness-vision",
    label: "Vision Engine",
    description: "Analyze images with a multimodal model",
    hint: "Use when input includes image_url or image_base64 in variables. Good for invoice parsing, screenshot reading, product inspection, and visual QA.",
    category: "ai",
    icon: "VI",
    defaultConfig: {
      system_prompt: "Analyze the provided image and respond helpfully.",
      user_template: "{{input}}",
      output_schema: "",
      complexity: 7,
      temperature: 0.7,
      max_tokens: 1024,
    },
  },
  {
    nodeType: "harness-graph-rag",
    label: "Graph RAG Engine",
    description: "RAG with entity/relation hints from indexed knowledge",
    hint: "Use for knowledge bases where relationships matter, such as people, companies, tickets, products, or policies. It retrieves chunks plus graph hints.",
    category: "ai",
    icon: "GR",
    defaultConfig: {
      system_prompt: "Answer using only the provided knowledge graph context. If unsure, say so.",
      chunk_size: 512,
      chunk_overlap: 50,
      top_k: 4,
      hop_depth: 1,
      extract_entities: true,
      complexity: 5,
      temperature: 0.3,
      max_tokens: 1024,
    },
  },
  {
    nodeType: "harness-multi-agent",
    label: "Multi Agent Engine",
    description: "Run a crew of agents in pipeline, parallel, or supervisor mode",
    hint: "Use when one task benefits from multiple specialist roles, like researcher + writer + reviewer. Pipeline is predictable; parallel is faster; supervisor is flexible.",
    category: "ai",
    icon: "MA",
    defaultConfig: {
      supervisor_instructions: "Coordinate the agents to complete the task as thoroughly as possible.",
      mode: "pipeline",
      max_rounds: 3,
      agents: '[{"name":"researcher","instructions":"Research the task carefully.","tools":[],"complexity":7,"temperature":0.7,"max_tokens":1024},{"name":"writer","instructions":"Turn the research into a clear final answer.","tools":[],"complexity":7,"temperature":0.7,"max_tokens":1024}]',
      complexity: 7,
      temperature: 0.7,
      max_tokens: 2048,
    },
  },
  {
    nodeType: "harness-dspy",
    label: "DSPy Engine",
    description: "Declarative LLM program with input/output fields",
    hint: "Use when you want a repeatable structured AI program. Define input_fields, output_fields, examples, and whether to use chain_of_thought.",
    category: "ai",
    icon: "DP",
    defaultConfig: {
      program_type: "chain_of_thought",
      task_description: "Complete the requested task.",
      input_fields: '["input"]',
      output_fields: '["output"]',
      examples: "[]",
      complexity: 5,
      temperature: 0.7,
      max_tokens: 1024,
    },
  },
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
