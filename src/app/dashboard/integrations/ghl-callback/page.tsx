import { redirect } from "next/navigation";

export default function GhlCallbackRedirect() {
  redirect("/dashboard/connections/ghl-callback");
}
