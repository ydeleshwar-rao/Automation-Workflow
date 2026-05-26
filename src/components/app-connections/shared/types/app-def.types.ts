import type { LucideIcon } from "lucide-react";

export type AppDef = {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  image?: string;
  color: string;
  iconColor: string;
  href?: string;
  connectType: "oauth-popup" | "oauth-window" | "credentials";
  accentColor: string;
  description: string;
  scopes?: string;
};
