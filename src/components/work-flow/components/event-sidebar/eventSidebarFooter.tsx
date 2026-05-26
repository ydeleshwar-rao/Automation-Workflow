
import { Button } from "@/src/components/ui/button";
import { ConfigStep } from "./eventSidebar";

interface EventSidebarFooterProps  {
currentStep: ConfigStep,
setStep: (step: ConfigStep) => void
onContinue?: (step: ConfigStep) => void;
footer?: React.ReactNode;
}
export function EventSidebarFooter({
currentStep,
setStep,
onContinue,
footer

}:EventSidebarFooterProps){

    return(
        <div className="flex-shrink-0 border-t border-border/60 bg-muted/20 px-3 py-2">
                  {footer ? (
                    footer
                  ) : (
                    <Button
                      // onClick={() => {
                      //   if (currentStep === "setup") setStep("configure");
                      //   else if (currentStep === "configure") setStep("test");
                      //   else onContinue?.();
                      // }}
                      onClick={() => {
                            onContinue?.(currentStep);
                          }}
                      className="h-9 w-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                    >
                      {currentStep === "test" ? "Continue" : "Continue"}
                    </Button>
                  )}
                </div>
    )
}