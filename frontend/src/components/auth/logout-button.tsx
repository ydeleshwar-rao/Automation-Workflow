"use client";

import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "next/navigation";
import { clearBrowserDataOnLogout, clearProfile, clearSession } from "@/src/store/localStorage";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearSession();
    clearProfile();
    await clearBrowserDataOnLogout();
    router.push("/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
