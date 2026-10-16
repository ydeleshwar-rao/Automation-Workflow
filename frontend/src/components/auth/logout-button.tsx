"use client";

import { Button } from "@/src/components/ui/button";
import { useRouter } from "next/navigation";
import { logout } from "@/src/services/auth.service";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return <Button onClick={handleLogout}>Logout</Button>;
}
