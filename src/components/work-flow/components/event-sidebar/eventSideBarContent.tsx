import { Check, Pencil, Webhook } from "lucide-react";


interface EventSideBarFooterProps {
currentStep: string,
 renderSetup?: () => React.ReactNode;
  renderConfigure?: () => React.ReactNode;
  renderTest?: () => React.ReactNode;
}
export function EventSideBarContent ({
    currentStep,
    renderSetup,
    renderConfigure,
    renderTest
}:EventSideBarFooterProps){
    return(
          <div className="pointer-events-none flex min-h-0 flex-1 flex-col overflow-x-hidden">
                  <div className="pointer-events-auto relative flex h-full min-h-0 flex-1 flex-col bg-background">
                    {currentStep === "setup" && (
                      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
                        {renderSetup ? (
                          renderSetup()
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                            <div className="rounded-full bg-muted/50 p-4">
                              <Webhook className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Setup content goes here
                            </p>
                          </div>
                        )}
                      </div>
                    )}
        
                    {currentStep === "configure" && (
                      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
                        {renderConfigure ? (
                          renderConfigure()
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                            <div className="rounded-full bg-muted/50 p-4">
                              <Pencil className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Configuration content goes here
                            </p>
                          </div>
                        )}
                      </div>
                    )}
        
                    {currentStep === "test" && (
                      <div className="flex flex-1 flex-col min-h-0 bg-background">
                        {renderTest ? (
                          renderTest()
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <div className="rounded-full bg-muted/50 p-4">
                              <Check className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Testing content goes here
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
    )
} 