/**
 * Re-exports from the canonical workflow domain models.
 * Components should import from here to follow ISP (Interface Segregation).
 */


// ─────────────────────────────────────────────────────────────────────────────
// Integration Registry Types
// ─────────────────────────────────────────────────────────────────────────────


/**
 * Shared context passed from WorkflowBuilder → every step component.
 * This is the "contract" each integration step must accept.
 */
export interface StepContext {
  /** The active workflow node being configured */
  node: WorkflowNodeData;
  /** All available events for this node's app */
  events: WorkflowEvent[];
  /** Currently selected event label */
  selectedEvent: string | null;
  /** Callback to update the selected event on the node */
  onEventSelect: (event: string) => void;
  /** Callback to switch back to the app-selector panel */
  onChangeApp: () => void;
  /** Whether the node is a Trigger (vs Action) */
  isTrigger: boolean;
  /** Skip the test step and advance to next node directly */
  onSkipTest: () => void;
  /** Save data into the node's formData */
  onFormDataChange: (data: Record<string, any>) => void;
  /**
   * Flattened fields from the upstream trigger's test payload.
   * Action nodes use this to populate variable-picker dropdowns.
   */
  triggerFields: Array<{ id: string; label: string; description: string }>;
  /**
   * The webhook ID of the trigger node.
   * Action nodes use this to fetch live webhook requests for the variable picker.
   */
  triggerWebhookId?: string;
  /**
   * Raw webhook sample for auto-map: prefers `trigger.config.testPayload` (Test tab),
   * then `trigger.sample_payload` when loaded from API.
   */
  triggerTestPayload?: unknown;
  /**
   * Full list of trigger samples for non-webhook triggers (ServiceM8, Commusoft, …).
   * Sourced from `trigger.config.testSamples`. The picker uses this to render
   * one row per record instead of a single synthetic "Sample record".
   */
  triggerTestSamples?: unknown[];
  /** Trigger node id for templates such as `{{triggerId__fieldKey}}` */
  triggerNodeId?: string;
}

/**
 * Each integration step component must accept StepContext (plus any extras it
 * registers in its own `extraProps` record).
 * We use `any` here so individual integrations can extend freely without the
 * registry needing to know about them.
 */
export type StepComponent = React.ComponentType<any>;

/**
 * Per-integration lifecycle hooks called by the WorkflowBuilder.
 */
export interface IntegrationLifecycle {
  /**
   * Called when the user clicks "Continue" on the Setup step.
   * Return `false` to block navigation (e.g. validation failed).
   */
  onSetupContinue?: (node: WorkflowNodeData) => boolean | Promise<boolean>;

  /**
   * Called when the user clicks "Continue" on the Configure step.
   */
  onConfigureContinue?: (node: WorkflowNodeData) => boolean | Promise<boolean>;

  /**
   * Called when the user clicks "Continue" on the Test step.
   * Return `false` to block navigation.
   */
  onTestContinue?: (node: WorkflowNodeData) => boolean | Promise<boolean>;
}

/**
 * A fully self-contained integration descriptor that the registry holds.
 *
 * Adding a new integration = creating one of these objects and registering it.
 * `workflowView.tsx` never needs to change.
 */
export interface IntegrationDescriptor {
  /** Human-readable name exactly matching the app label in the EventSelector */
  label: string;

  // ── Step Components ──────────────────────────────────────────────────────
  /** Component rendered inside the Setup tab */
  SetupStep: StepComponent;
  /** Component rendered inside the Configure tab */
  ConfigureStep: StepComponent;
  /** Component rendered inside the Test tab */
  TestStep: StepComponent;

  // ── Hook Factory ─────────────────────────────────────────────────────────
  /**
   * A React hook (must follow Rules of Hooks) that returns the extra props
   * each step needs beyond the shared `StepContext`.
   *
   * Example: the Webhook integration returns `{ webhookUrl, testStatus, … }`.
   * Return an empty object `{}` if a step needs no extra data.
   */
  useStepProps: (step: ConfigStep, context: StepContext) => {
    setup?: Record<string, unknown>;
    configure?: Record<string, unknown>;
    test?: Record<string, unknown>;
    /** Dynamic metadata for the sidebar's footer button at this specific moment */
    footer?: {
      label?: string;
      disabled?: boolean;
      variant?: "default" | "orange" | "blue" | "ghost";
      /**
       * When layout is "test-controls", the footer renders two columns:
       * [Test trigger (primary, left)] + [Continue (outline, right)]
       * Continue is wired to the WorkflowBuilder's handleContinue. onTestTrigger
       * must be a stable function reference (e.g. from useCallback with stable deps).
       */
      layout?: "single" | "test-controls";
      onTestTrigger?: () => void;
    };
  };

  // ── Lifecycle (optional) ─────────────────────────────────────────────────
  lifecycle?: IntegrationLifecycle;
}


import { LucideIcon } from "lucide-react";
import { ConfigStep } from "../components/event-sidebar/eventSidebar";

export type NodeType = "trigger" | "action";

export interface WorkflowEvent {
  title: string;
  description: string;
  type: "Instant" | "Polling" | "Action";
}

/** JSON-serializable form — safe to pass through API responses */
export interface IntegrationAppRaw {
  id: string;
  label: string;
  iconName: string;
  color: string;
  events: WorkflowEvent[];
}

/** Client-side form — icon resolved from ICON_REGISTRY */
export interface IntegrationApp extends Omit<IntegrationAppRaw, "iconName"> {
  icon: LucideIcon;
  iconName: string;
}

export interface WorkflowNodeData {
  id: string
  type: "trigger" | "action"
  index: number
  label: string
  description: string
  // integration
  appLabel?: string
  eventLabel?: string
  // ui
  appIcon?: any
  appColor?: string
  // important
  config?: Record<string, any>
  // NEW FIELD
  nodeType?: "trigger" | "action"
  // NEW FIELD
  integrationType?: string
  // NEW FIELD
  status?: "draft" | "configured" | "tested"
  // workflow this node belongs to
  workflowId?: string
  userId?: string
  output_schema?: Record<string, null>
  sample_payload?: Record<string, any>
}

export interface WebhookRequest {
  id: string;
  name: string;
  timestamp: string;
  data: any;
}

export type WebhookTestStatus = 'idle' | 'testing' | 'success' | 'no_request';


// ─────────────────────────────────────────────────────────────────────────────
// Execution Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Execution {
  id: string;
  workflow_id: string;
  status: "running" | "success" | "failed";
  trigger_payload?: Record<string, any>;
  started_at: string;
  finished_at?: string;
}

export interface ExecutionStep {
  id: string;
  execution_id: string;
  workflow_node_id: string;
  status: "pending" | "running" | "success" | "failed";
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  node_label?: string;
}

export interface ExecutionDetail extends Execution {
  steps: ExecutionStep[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Field Mapping Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldMapping {
  id?: string;
  workflow_node_id: string;
  source_field: string;
  destination_field: string;
}
