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
          className="nm-primary-btn h-10 w-full rounded-xl text-xs font-bold"
        >
          Continue
        </button>
      )}
    </div>
  );
}
