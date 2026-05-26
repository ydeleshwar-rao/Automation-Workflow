import { Activity, Database, LayoutGrid, MessageSquare } from "lucide-react";
import { API_ROUTES } from "@/src/constants/api.constants";
import type { AppDef } from "../types/app-def.types";

export const applications: AppDef[] = [
  {
    id: "servicem8",
    name: "ServiceM8",
    category: "Job Management",
    icon: MessageSquare,
    image: "/image_3_servicem8.png",
    color: "bg-[#7cc736]",
    iconColor: "text-white",
    href: API_ROUTES.SERVICEM8.CONNECT,
    connectType: "oauth-popup",
    accentColor: "#7cc736",
    description:
      "Connect your ServiceM8 account to sync jobs, customers, and field service data.",
    scopes: "Jobs, Customers, Schedules",
  },
  {
    id: "leadshub",
    name: "LeadsHub",
    category: "Lead Management",
    icon: Database,
    image: "/image_2_leads_hub.png",
    color: "bg-[#3fbfbb]",
    iconColor: "text-white",
    href: API_ROUTES.GHL.CONNECT,
    connectType: "oauth-popup",
    accentColor: "#3fbfbb",
    description:
      "Connect LeadsHub (GoHighLevel) to sync your CRM contacts, leads, and campaigns.",
    scopes: "Contacts, Campaigns, Conversations",
  },
  {
    id: "simpro",
    name: "simPRO",
    category: "Job Management",
    icon: LayoutGrid,
    image: "/simpro.png",
    color: "bg-[#0b5cff]",
    iconColor: "text-white",
    href: API_ROUTES.SIMPRO.CONNECT,
    connectType: "oauth-window",
    accentColor: "#0b5cff",
    description:
      "Connect your simPRO instance to sync jobs, quotes, and service management data.",
    scopes: "Jobs, Quotes, Customers",
  },
  {
    id: "commusoft",
    name: "Commusoft",
    category: "Job Management",
    icon: Activity,
    image: "/image_1_commusoft.png",
    color: "bg-[#f58320]",
    iconColor: "text-white",
    connectType: "credentials",
    accentColor: "#f58320",
    description:
      "Connect your Commusoft account using your login credentials to sync jobs and customers.",
  },
];
