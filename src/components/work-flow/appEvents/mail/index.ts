/**
 * Mail Integration — Registry Entry
 */

import { MailSetupStep } from "./components/setupEmail";
import { MailConfigureStep } from "./components/configureEmail";
import { MailTestStep } from "./components/testEmail";
import { useMail } from "@/src/components/work-flow/appEvents/mail/apiIntegrations/use-mail";
import { useMemo } from "react";

import type { ConfigStep } from "../../components/event-sidebar/eventSidebar";
import { IntegrationDescriptor, StepContext } from "../../uiOrchestrator/types";

function useMailStepProps(step: ConfigStep, context: StepContext) {
  const mail = useMail();

  // On reload, config has raw {{map:...}} tokens (chips), sample_payload has plain values.
  // Prefer config (tokens → chips rendered) and fall back to sample_payload for plain display.
  const restoredConfigData = useMemo(() => {
    const config = context.node.config || {};
    const sample = context.node.sample_payload || {};
    // If config has form fields (beyond accountId/accountName), it was saved with tokens — use it.
    const hasFormFields = Object.keys(config).some(
      (k) => k !== "accountId" && k !== "accountName" && k !== "webhook_id"
    );
    if (hasFormFields) return config;
    // Otherwise fall back to sample_payload (plain values, no chips — first time load)
    return { ...config, ...sample };
  }, [context.node.config, context.node.sample_payload]);

  const footer = useMemo(() => {
    if (step === "setup") {
      const hasAccount = !!context.node.config?.accountName;
      return {
        label: hasAccount ? "Continue" : "Connecting Account",
        disabled: !context.node.eventLabel,
        variant: "default" as const,
      };
    }
    if (step === "configure") {
      const config = context.node.config || {};
      const isValid = config._formIsValid === true;
      return {
        label: isValid ? "Continue" : "Finish required fields",
        disabled: !isValid,
        variant: "default" as const,
      };
    }
    if (step === "test") {
      if (mail.testStatus === 'idle') {
        return {
          layout: "test-controls" as const,
          onTestTrigger: () =>
            mail.sendTest(context.node.config || {}, context.triggerTestPayload),
        };
      }
      if (mail.testStatus === 'testing') {
        return {
          label: "Sending...",
          disabled: true,
          variant: "orange" as const,
        };
      }
      if (mail.testStatus === 'success') {
        return {
          layout: "test-controls" as const,
          onTestTrigger: () =>
            mail.sendTest(context.node.config || {}, context.triggerTestPayload),
        };
      }
    }
    return undefined;
  }, [step, context.node.eventLabel, context.node.config, mail]);

  return useMemo(() => ({
    setup: {
      selectedEvent: context.node.eventLabel ?? null,
      onEventSelect: context.onEventSelect, 
      selectedAccount: mail.accounts.find(a => a.id === context.node.config?.accountId) || null,
      onAccountSelect: (account: any) => {
        context.onFormDataChange({ accountId: account.id, accountName: account.username || account.name });
      },
      accounts: mail.accounts,
      isLoadingAccounts: mail.isLoading,
      onAddAccount: async (config: any) => {
        try {
          const newAccount = await mail.addAccount(config);
          // Automatically select the newly created account
          if (newAccount && newAccount.id) {
            context.onFormDataChange({ 
              accountId: newAccount.id, 
              accountName: newAccount.username || newAccount.name || config.user 
            });
          } else {
            context.onFormDataChange({ accountName: config.user || 'SMTP Account' });
          }
        } catch (err: any) {
          throw err;
        }
      },

      onRemoveAccount: (id: string) => {
        mail.removeAccount(id);
        context.onFormDataChange({ accountId: undefined, accountName: undefined });
      },
    },
    configure: {
      data: restoredConfigData,
      onChange: (data: any, isValid: boolean) => {
        context.onFormDataChange({ ...data, _formIsValid: isValid });
      },
      webhookId: context.triggerWebhookId,
      nodeId: context.node.id,
    },
    test: {
      data: context.node.sample_payload || context.node.config || {},
      onSkipTest: context.onSkipTest,
      testStatus: mail.testStatus,
    },
    footer,
  }), [mail, footer, restoredConfigData, context.node.eventLabel, context.triggerTestPayload, context.onEventSelect, context.onFormDataChange, context.onSkipTest]);
}

export const mailIntegration: IntegrationDescriptor = {
  label: "Email",
  SetupStep: MailSetupStep,
  ConfigureStep: MailConfigureStep,
  TestStep: MailTestStep,
  useStepProps: useMailStepProps,

  lifecycle: {
    onSetupContinue: (node) => {
      // Need both event and account to continue
      return !!node.eventLabel && !!node.config?.accountName;
    },
  },
};
