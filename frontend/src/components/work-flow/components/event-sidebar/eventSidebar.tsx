"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Maximize2,
  ChevronRight,
  Pencil,
  Webhook,
  Check,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { BreadcrumbTabs } from "@/src/components/ui/breadcrumb-tabs";
import { cn } from "@/src/lib/utils";
import { IntegrationApp } from "@/src/components/work-flow/uiOrchestrator/types";
import { EventSideBarContent } from "./eventSideBarContent";
import { EventSidebarFooter } from "./eventSidebarFooter";
import { EventSidebarHeader } from "./eventSidebarHeader";


export type ConfigStep = "setup" | "configure" | "test";

interface EventSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApp?: {
    label: string;
    icon: any;
    color: string;
  };
  isTrigger?: boolean;
  onContinue?: () => void;
  isLoading?: boolean;

  // New dynamic props
  title?: string;
  nodeIndex?: number;
  activeStep?: ConfigStep;
  onStepChange?: (step: ConfigStep) => void;

  // Content for each step
  renderSetup?: () => React.ReactNode;
  renderConfigure?: () => React.ReactNode;
  renderTest?: () => React.ReactNode;

  // Footer
  footer?: React.ReactNode;
}

export function EventSidebar({
  isOpen,
  onClose,
  selectedApp,
  isTrigger,
  onContinue,
  isLoading = false,
  title,
  nodeIndex = 1,
  activeStep: externalStep,
  onStepChange,
  renderSetup,
  renderConfigure,
  renderTest,
  footer,
}: EventSidebarProps) {
  const [internalStep, setInternalStep] = useState<ConfigStep>("setup");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title || "");

  const currentStep = externalStep || internalStep;
  const setStep = onStepChange || setInternalStep;

  useEffect(() => {
    if (title) setEditedTitle(title);
  }, [title]);

  if (!isOpen) return null;

  const steps: { id: ConfigStep; label: string }[] = [
    { id: "setup", label: "Setup" },
    { id: "configure", label: "Configure" },
    { id: "test", label: "Test" },
  ];

  const handleStepClick = (stepId: ConfigStep) => {
    // Basic logic: only allow going back or staying on current step
    // In a real app, you'd check if the step is "complete"
    setStep(stepId);
  };

  const getStepStatus = (stepId: ConfigStep) => {
    const stepOrder: ConfigStep[] = ["setup", "configure", "test"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };
  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-[450px] flex-col font-sans pointer-events-none">
      <div className="h-full w-full pointer-events-auto relative flex flex-col overflow-hidden rounded-l-2xl animate-in slide-in-from-right duration-300 ease-out nm-sidebar">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-[2px] transition-all">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Loading configuration...
              </span>
            </div>
          </div>
        )}

        {/* Header (Fixed) */}
      
        <EventSidebarHeader
             selectedApp={selectedApp}
              isEditingTitle={isEditingTitle}
              editedTitle={editedTitle}
              setEditedTitle={setEditedTitle}
              setIsEditingTitle={setIsEditingTitle}
              nodeIndex={nodeIndex}
              isTrigger={isTrigger}
              onClose={onClose}
        />
        {/* Tabs / Breadcrumbs (Fixed) */}
        <BreadcrumbTabs
          steps={steps}
          onStepClick={handleStepClick}
          getStepStatus={getStepStatus}
        />

        <EventSideBarContent
          currentStep={currentStep}
          renderSetup={renderSetup}
          renderConfigure={renderConfigure}
          renderTest={renderTest}
        />

        {/* Footer (Fixed) */}
        <EventSidebarFooter
          currentStep={currentStep}
          setStep={setStep}
          onContinue={onContinue}
          footer={footer}
        />
  
      </div>
    </div>
  );
}
