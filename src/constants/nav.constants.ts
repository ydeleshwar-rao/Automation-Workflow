import {
  Activity,
  Calendar,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";
import { DASHBOARD_ROUTES } from "@/src/constants/domain.constants";

export const INTEGRATION_NAV = {
  SERVICEM8: {
    id: "servicem8",
    name: "ServiceM8",
    href: DASHBOARD_ROUTES.SERVICEM8,
    icon: MessageSquare,
    subItems: [{ name: "Charts", href: DASHBOARD_ROUTES.SERVICEM8 }],
  },
  COMMUSOFT: {
    id: "commusoft",
    name: "Commusoft",
    href: DASHBOARD_ROUTES.COMMUSOFT,
    icon: Calendar,
    subItems: [{ name: "Charts", href: DASHBOARD_ROUTES.COMMUSOFT }],
  },
  LEADSHUB: {
    id: "leadshub",
    name: "LeadsHub",
    href: DASHBOARD_ROUTES.LEADSHUB,
    icon: Activity,
    subItems: [],
  },
  SIMPRO: {
    id: "simpro",
    name: "simPRO",
    href: DASHBOARD_ROUTES.SIMPRO,
    icon: LayoutGrid,
    subItems: [{ name: "Charts", href: DASHBOARD_ROUTES.SIMPRO }],
  },
} as const;
