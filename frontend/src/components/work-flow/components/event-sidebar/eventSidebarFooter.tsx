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
          className="h-10 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground transition-all border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[5px_5px_0_hsl(var(--foreground))] dark:border-border dark:shadow-[3px_3px_0_hsl(var(--border))] dark:hover:shadow-[5px_5px_0_hsl(var(--border))]"
        >
          Continue
        </button>
      )}
    </div>
  );
}
