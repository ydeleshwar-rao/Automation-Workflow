import { IntegrationAppRaw } from "../components/work-flow/uiOrchestrator/types";

/**
 * Apps store iconName as a string for JSON-serializability.
 * The client resolves the string back to a component via ICON_REGISTRY.
 */
export const WORKFLOW_APPS: IntegrationAppRaw[] = [
  { 
    id: "servicem8",
    label: "ServiceM8", 
    iconName: "MessageSquare", 
    color: "bg-green-50 border-green-200 text-[#7cc736]",
    events: [
      { title: "New Job", description: "Triggers when a new job is created.", type: "Instant" },
      { title: "Job Completed", description: "Triggers when a job status is set to Completed.", type: "Instant" },
      { title: "New Client", description: "Triggers when a new client is added.", type: "Polling" }
    ]
  },
  { 
    id: "leadshub",
    label: "LeadsHub", 
    iconName: "Activity", 
    color: "bg-cyan-50 border-cyan-200 text-[#3fbfbb]",
    events: [
      { title: "New Lead", description: "Triggers when a new lead is captured.", type: "Instant" },
      { title: "Lead Updated", description: "Triggers when lead information changes.", type: "Instant" }
    ]
  },
  { 
    id: "commusoft",
    label: "Commusoft", 
    iconName: "Calendar", 
    color: "bg-orange-50 border-orange-200 text-[#f68b1e]",
    events: [
      { title: "New Job", description: "Triggers when a new job is created.", type: "Instant" },
      { title: "Job Updated", description: "Triggers when job information changes.", type: "Polling" }
    ]
  }
];

export const BUILT_IN_TOOLS: IntegrationAppRaw[] = [
  { 
    id: "webhooks",
    label: "Webhooks", 
    iconName: "Webhook", 
    color: "bg-orange-50 border-orange-200 text-orange-600",
    events: [
      { title: "Catch Hook", description: "Triggers when a POST, PUT, or GET request is made.", type: "Instant" },
    ]
  },
  { 
    id: "email",
    label: "Email", 
    iconName: "Mail", 
    color: "bg-blue-50 border-blue-200 text-blue-600",
    events: [
      { title: "Send Email", description: "Sends an email through your account.", type: "Action" },
    ]
  }
];
