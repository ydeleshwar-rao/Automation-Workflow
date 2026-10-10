"use client";

/**
 * IntegrationStepRenderer
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the correct step component for the active integration by calling the
 * integration's `useStepProps` hook and merging the result with the shared
 * StepContext props.
 *
 * This component owns the hook call so that React's Rules of Hooks are always
 * satisfied — the hook is called unconditionally at the top of this component,
 * irrespective of which step is currently active.
 *
 * WorkflowBuilder simply renders <IntegrationStepRenderer> and passes the
 * step name; it never imports any integration-specific component or hook.
 */

import React from "react";
import type { IntegrationDescriptor, StepContext } from "../uiOrchestrator/types";
import type { ConfigStep } from "./event-sidebar/eventSidebar";
import { toast } from "sonner";

interface IntegrationStepRendererProps {
  /** The resolved descriptor from the registry (may be undefined if not found) */
  descriptor: IntegrationDescriptor | undefined;
  /** Which of the three steps to render */
  step: ConfigStep;
  /** Shared context derived from WorkflowBuilder state */
  context: StepContext;
  /** Callback to update the sidebar footer (e.g. for dynamic button labels) */
  onUpdateFooter?: (footer: any) => void;
}

/** Props for the inner renderer — descriptor is guaranteed non-null here. */
interface RendererInnerProps extends IntegrationStepRendererProps {
  descriptor: IntegrationDescriptor;
}

/**
 * Structural compare for footer values. Treats function-valued fields
 * (handlers like onTestTrigger) as always equal, since their identity changes
 * on every render but doesn't represent a semantic change worth propagating.
 */
function isFooterEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const av = aObj[key];
    const bv = bObj[key];
    if (typeof av === "function" && typeof bv === "function") continue;
    if (!Object.is(av, bv)) return false;
  }
  return true;
}

/**
 * Inner component: receives a *defined* descriptor and calls its hook.
 * Separated so the hook is always called in the same render order (Rules of Hooks).
 */
function RendererInner({
  descriptor,
  step,
  context,
  onUpdateFooter,
}: RendererInnerProps) {
  // Always call the hook unconditionally (Rules of Hooks)
  const extraProps = descriptor.useStepProps(step, context);

  // Sync footer config upwards whenever it changes.
  // Integrations often rebuild `footer` on every render (useMemo deps include
  // unstable parent-provided callbacks), so we structurally compare — otherwise
  // setDynamicFooter fires forever and React throws "Maximum update depth exceeded".
  const lastFooterRef = React.useRef<unknown>(undefined);
  React.useEffect(() => {
    const next = extraProps.footer;
    if (isFooterEqual(lastFooterRef.current, next)) return;
    lastFooterRef.current = next;
    onUpdateFooter?.(next);
  }, [extraProps.footer, onUpdateFooter]);

  const { SetupStep, ConfigureStep, TestStep } = descriptor;

  // const sharedProps = {
  //   selectedApp: {
  //     label: context.node.appLabel ?? "",
  //     icon: context.node.appIcon,
  //     color: context.node.appColor ?? "",
  //   },
  //   isTrigger: context.isTrigger,
  //   selectedEvent: context.selectedEvent,
  //   events: context.events,
  //   onEventSelect: context.onEventSelect,
  //   onChangeApp: context.onChangeApp,
  //   // Provide dropdown state via extraProps.setup if the integration needs it
  //   ...(extraProps.setup ?? {}),
  // };

  const sharedProps = {
  ...(extraProps.setup ?? {}),

  selectedApp: {
    label: context.node.appLabel ?? "",
    icon: context.node.appIcon,
    color: context.node.appColor ?? "",
  },
  isTrigger: context.isTrigger,
  selectedEvent: context.selectedEvent,
  events: context.events,
  onEventSelect: context.onEventSelect,
  onChangeApp: context.onChangeApp,
  triggerTestPayload: context.triggerTestPayload,
  triggerTestSamples: context.triggerTestSamples,
  triggerNodeId: context.triggerNodeId,
};

  if (step === "setup") {
    return <SetupStep {...sharedProps} />;
  }

  if (step === "configure") {
    return <ConfigureStep {...sharedProps} {...(extraProps.configure ?? {})} />;
  }

  // step === "test"
  const testExtraProps = extraProps.test ?? ({} as Record<string, unknown>);
  // Wrap _copyUrl with a toast if the integration provided it
  const copyUrlWithToast =
    typeof testExtraProps._copyUrl === "function"
      ? () => {
          (testExtraProps._copyUrl as () => void)();
          toast.success("URL copied to clipboard");
        }
      : undefined;

  const { _copyUrl: _ignored, ...safeTestProps } = testExtraProps;

  return (
    <TestStep
      {...sharedProps}
      {...safeTestProps}
      {...(copyUrlWithToast ? { onCopyUrl: copyUrlWithToast } : {})}
    />
  );
}

/**
 * Public component — handles the missing-descriptor fallback gracefully.
 */
export function IntegrationStepRenderer(props: IntegrationStepRendererProps) {
  // Sync missing descriptor with a cleared footer
  React.useEffect(() => {
    if (!props.descriptor) {
      props.onUpdateFooter?.(null);
    }
  }, [props.descriptor, props.onUpdateFooter]);

  if (!props.descriptor) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50 p-8">
        <p className="text-sm font-medium text-slate-600">
          No integration found for this app. Please select a different app.
        </p>
      </div>
    );
  }

  return (
    <RendererInner
      key={props.descriptor.label}
      {...props}
      descriptor={props.descriptor}
    />
  );
}
