import {
  MessageSquare,
  Activity,
  Webhook,
  Mail,
  Calendar,
  MessageCircle,
  Wallet,
  Banknote,
  LucideIcon,
} from "lucide-react";

/**
 * IconRegistry maps string icon names to actual Lucide components.
 * Follows OCP: add new icons here without touching any component.
 */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  MessageSquare,
  Activity,
  Webhook,
  Mail,
  Calendar,
  MessageCircle,
  Wallet,
  Banknote,
};

export function resolveIcon(name?: string): LucideIcon {
  if (!name) return Webhook;
  return ICON_REGISTRY[name] ?? Webhook;
}
