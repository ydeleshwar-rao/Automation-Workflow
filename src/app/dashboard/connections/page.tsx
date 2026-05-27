import { redirect } from "next/navigation";

/**
 * The central connections page has been removed.
 * Each integration is now managed from its own dedicated page:
 *   /dashboard/servicem8
 *   /dashboard/commusoft
 *   /dashboard/simpro
 *   /dashboard/leadshub
 */
export default function ConnectionsPage() {
  redirect("/dashboard");
}
