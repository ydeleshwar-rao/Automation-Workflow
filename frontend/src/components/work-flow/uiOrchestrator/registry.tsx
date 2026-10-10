"use client";

import React from "react";
import type { IntegrationDescriptor } from "./types";
import { webhookIntegration } from "../appEvents/webhook";
import { mailIntegration } from "../appEvents/mail";
import { leadConnectorIntegration } from "../appEvents/leadconnector";
import { serviceM8Integration } from "../appEvents/serviceM8";
import { commusoftIntegration } from "../appEvents/commusoft";
import { whatsappIntegration } from "../appEvents/whatsapp";

/**
 * Integration Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the SINGLE place where integrations are registered.
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ To add a NEW integration:                                                  │
 * │ 1. Create  src/components/work-flow/events/<name>/index.ts                  │
 * │    exporting an `IntegrationDescriptor`.                                   │
 * │ 2. Import it below and add it to `integrationRegistry`.                    │
 * │ That's it — workflowView.tsx needs zero changes.                            │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Higher-order component to create a pretty placeholder integration.
 */
const createPlaceholder = (label: string): IntegrationDescriptor => ({
  label,
  SetupStep: () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-8 animate-in fade-in duration-700">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
         <span className="text-2xl">⏳</span>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-slate-900">{label} Integration</h3>
        <p className="text-sm text-slate-500 max-w-[280px]">
          We&apos;re currently building the {label} integration. Check back soon for full workflow support!
        </p>
      </div>
    </div>
  ),
  ConfigureStep: () => <div className="p-8 text-center text-slate-400">Not available in preview</div>,
  TestStep: () => <div className="p-8 text-center text-slate-400">Not available in preview</div>,
  useStepProps: (step, context) => ({}),
});

/**
 * The registry maps an app label (must match what EventSelector returns)
 * to its IntegrationDescriptor.
 */
export const integrationRegistry: Record<string, IntegrationDescriptor> = {
  // Webhooks by Zapier / Webhooks / Webhook
  Webhooks: webhookIntegration,
  Webhook:  webhookIntegration,

  // Email integration
  Email: mailIntegration,
  Mail: mailIntegration,

  // Official integrations
  ServiceM8: serviceM8Integration,
  Commusoft: commusoftIntegration,
  WhatsApp: whatsappIntegration,
  // LeadsHub:  createPlaceholder("LeadsHub"),
  // GoHighLevel: createPlaceholder("GoHighLevel"),
  LeadsHub:  leadConnectorIntegration,  
    LeadConnector: leadConnectorIntegration,
    GoHighLevel: leadConnectorIntegration,
};

/**
 * Looks up an integration by label.
 * Performs a case-insensitive search and handles minor pluralization differences.
 */
export function getIntegration(label: string | undefined): IntegrationDescriptor | undefined {
  if (!label) return undefined;

  const normalized = label.trim().toLowerCase();

  // 1. Try exact key match (case-insensitive)
  const exactKey = Object.keys(integrationRegistry).find(
    (k) => k.toLowerCase() === normalized
  );
  if (exactKey) return integrationRegistry[exactKey];

  // 2. Try match against the .label property inside descriptors
  const labelMatch = Object.values(integrationRegistry).find(
    (d) => d.label.toLowerCase() === normalized
  );
  if (labelMatch) return labelMatch;

  // 3. Fallback: try singular/plural variation if it ends in 's'
  if (normalized.endsWith("s")) {
    const singular = normalized.slice(0, -1);
    const singularMatch = Object.values(integrationRegistry).find(
      (d) => d.label.toLowerCase() === singular
    );
    if (singularMatch) return singularMatch;
  }

  return undefined;
}
