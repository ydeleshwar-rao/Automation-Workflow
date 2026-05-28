import { ConfigStep } from "./eventSidebar";

interface EventSidebarFooterProps {
  currentStep: ConfigStep;
  setStep: (step: ConfigStep) => void;
  onContinue?: (step: ConfigStep) => void;
  footer?: React.ReactNode;
}

export function EventSidebarFooter({
  currentStep,
  setStep,
  onContinue,
  footer,
}: EventSidebarFooterProps) {
  return (
    <div className="flex-shrink-0 border-t border-black/8 dark:border-white/5 bg-[hsl(var(--surface))] px-4 py-3">
      {footer ? (
        footer
      ) : (
        <button
          onClick={() => onContinue?.(currentStep)}
          className="h-10 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-[3px_3px_8px_rgba(99,102,241,0.4),-2px_-2px_6px_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_12px_rgba(99,102,241,0.5),-3px_-3px_8px_rgba(255,255,255,0.12)]"
        >
          Continue
        </button>
      )}
    </div>
  );
}
