"use client";

import React, { useMemo } from "react";
import { Link2 } from "lucide-react";

import { useCommusoftStatus } from "@/src/components/app-connections/commusoft/hooks/useCommusoftStatus";
import { FieldDrivenConfigureStep } from "../../shared/configure/FieldDrivenConfigureStep";
import type { AutoMapPolicy } from "../../shared/configure/useFieldDrivenConfigForm";
import type { IntegrationOptionsByFieldName } from "../../shared/configure/integrationField.types";
import { COMMUSOFT_EVENT_FIELDS } from "./configure/fields";
import { CommusoftSelectOption, useGetCommusoftCustomerTypeOptionsQuery } from "../apiIntegrations/commusoftApi";

const NO_CUSTOMER_TYPE_OPTIONS: CommusoftSelectOption[] = [];
const CUSTOMER_TYPE_FIELD_NAME = "customer_type";

const COMMUSOFT_AUTO_MAP_POLICY: AutoMapPolicy = {
  shouldAutoMapSelectFields: true,
  // The backend looks customer types up by exact description, so a guessed value would fail.
  fieldsFallingBackToFirstOption: [CUSTOMER_TYPE_FIELD_NAME],
};

function CheckingConnectionNotice() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
      <div className="w-6 h-6 rounded-full border-2 border-border border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Checking Commusoft connection...</p>
    </div>
  );
}

function ConnectCommusoftFirstNotice() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4 animate-in fade-in duration-500">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Link2 className="w-7 h-7 text-primary" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-bold text-foreground">Connect to Commusoft first</p>
        <p className="text-xs text-muted-foreground max-w-[260px]">
          Go to Connections and connect your Commusoft account before configuring this step.
        </p>
      </div>
    </div>
  );
}

function getConnectionGate(isCheckingConnection: boolean, isConnected: boolean): React.ReactNode {
  if (isCheckingConnection) return <CheckingConnectionNotice />;
  if (!isConnected) return <ConnectCommusoftFirstNotice />;
  return null;
}

interface CommusoftConfigureStepProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>, isValid: boolean) => void;
  webhookId?: string;
  selectedEvent?: string | null;
  /** From StepContext — live trigger payload (canvas state), not Redux nodes */
  triggerTestPayload?: unknown;
  triggerTestSamples?: unknown[];
}

export function CommusoftConfigureStep(props: CommusoftConfigureStepProps) {
  const { connected: isCommusoftConnected, isLoading: isCheckingConnection } = useCommusoftStatus();

  const { data: customerTypeOptions = NO_CUSTOMER_TYPE_OPTIONS } = useGetCommusoftCustomerTypeOptionsQuery(
    undefined,
    { skip: !isCommusoftConnected }
  );

  const optionsByFieldName: IntegrationOptionsByFieldName = useMemo(
    () => ({ [CUSTOMER_TYPE_FIELD_NAME]: customerTypeOptions }),
    [customerTypeOptions]
  );

  return (
    <FieldDrivenConfigureStep
      {...props}
      fieldsByEvent={COMMUSOFT_EVENT_FIELDS}
      optionsByFieldName={optionsByFieldName}
      autoMapPolicy={COMMUSOFT_AUTO_MAP_POLICY}
      connectionGate={getConnectionGate(isCheckingConnection, isCommusoftConnected)}
    />
  );
}
