"use client";

import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { API_ROUTES } from "@/src/constants/api.constants";
import { clearProfile, saveSession, saveProfile } from "@/src/store/localStorage";
import { createClient } from "@/src/lib/supabase/client";

function getCookieMaxAgeSeconds(expiresAt: unknown): number {
  if (typeof expiresAt === "number") {
    const expiresUnix =
      expiresAt > 1_000_000_000_000 ? Math.floor(expiresAt / 1000) : expiresAt;
    return Math.max(0, Math.floor(expiresUnix - Date.now() / 1000));
  }
  if (typeof expiresAt === "string") {
    const parsed = Date.parse(expiresAt);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.floor(parsed / 1000 - Date.now() / 1000));
    }
  }
  return 24 * 60 * 60;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Login — get tokens
      const { data: loginRes } = await axios.post(API_ROUTES.AUTH.LOGIN, {
        email,
        password,
      });

      if (!loginRes?.success) {
        throw new Error(loginRes?.message || "Login failed");
      }

      const { user_id, email: userEmail, access_token, refresh_token, expires_at } =
        loginRes.data;

      // 2. Fetch profile using the new access token
      const { data: profileRes } = await axios.get(API_ROUTES.AUTH.PROFILE, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!profileRes?.success) {
        throw new Error(profileRes?.message || "Failed to load profile");
      }

      const p = profileRes.data.profile;

      // 3. Persist session + profile
      saveSession({
        userId: user_id,
        email: userEmail,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_at,
      });

      clearProfile();
      saveProfile({
        userId: p.id,
        clientKey: p.clientkey ?? "",
        email: p.email,
        firstName: p.first_name,
        lastName: p.last_name,
        role: p.role,
        phone: p.phone,
        companyName: p.company_name,
        avatarUrl: p.avatar_url,
        websiteUrl: p.website_url,
        jobAppType: p.job_app_type,
      });

      // Set Supabase session so the browser client is authenticated
      const supabase = createClient();
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      // Bridge custom auth to server-side route guard.
      if (typeof document !== "undefined") {
        const maxAge = getCookieMaxAgeSeconds(expires_at);
        document.cookie = `jm_access_token=${encodeURIComponent(
          access_token
        )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
        window.dispatchEvent(new Event("refresh-integrations"));
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? err.message
          : err instanceof Error
          ? err.message
          : "An error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
