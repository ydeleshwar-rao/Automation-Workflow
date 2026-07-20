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
    nodeType: "harness-prompt",
    label: "Harness Prompt",
    description: "Run a prompt engine flow through the AI Harness",
    category: "ai",
    icon: "AI",
    defaultConfig: {
      model: "gpt-4o-mini",
      systemPrompt: "You are a helpful assistant.",
      userTemplate: "{{input}}",
      temperature: 0.7,
      maxTokens: 1024,
      complexity: 5,
    },
  },
  {
    nodeType: "harness-chain",
    label: "Harness Chain",
    description: "Run sequential prompt steps through the AI Harness",
    category: "ai",
    icon: "CH",
    defaultConfig: {
      model: "gpt-4o-mini",
      promptTemplate: "{{input}}",
      steps: '[{"name":"step_1","prompt_template":"{{input}}","complexity":5,"temperature":0.7,"max_tokens":1024}]',
    },
  },
  {
    nodeType: "harness-rag",
    label: "Harness RAG",
    description: "Answer from indexed documents through the AI Harness",
    category: "ai",
    icon: "RG",
    defaultConfig: {
      model: "gpt-4o-mini",
      systemPrompt: "Answer using only the provided context. If unsure, say so.",
      topK: 4,
      chunkSize: 512,
      chunkOverlap: 50,
      temperature: 0.3,
      maxTokens: 1024,
      complexity: 5,
    },
  },
  {
    nodeType: "harness-agent",
    label: "Harness Agent",
    description: "Run an agent engine flow through the AI Harness",
    category: "ai",
    icon: "AG",
    defaultConfig: {
      model: "gpt-4o-mini",
      instructions: "Complete the user request.",
      tools: '["datetime","calculator"]',
      maxIterations: 10,
      temperature: 0.7,
      maxTokens: 2048,
      complexity: 8,
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
