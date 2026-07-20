"use client";

import { cn }            from "@/src/lib/utils";
import { Button }        from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input }         from "@/src/components/ui/input";
import { Label }         from "@/src/components/ui/label";
import Link              from "next/link";
import { useRouter }     from "next/navigation";
import { useState }      from "react";
import { useDispatch }   from "react-redux";
import axios             from "axios";
import { API_ROUTES }    from "@/src/constants/api.constants";
import { persistLoginResponse } from "@/src/services/auth.service";
import { setUserFromLogin }     from "@/src/store/accessSlice";
import type { AppDispatch }     from "@/src/store/store";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router   = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // POST /auth/login → { access_token, refresh_token, expires_in, user: { id, email, role, permissions } }
      const { data: res } = await axios.post(API_ROUTES.AUTH.LOGIN, { email, password });

      if (!res?.success) {
        throw new Error(res?.message ?? "Login failed");
      }

      const loginData = res.data as {
        expires_in:    number;
        user: {
          id:          string;
          email:       string;
          role:        string;
          permissions: string[];
          full_name?:  string;
          avatar_url?: string | null;
        };
      };

      // 1. Persist non-token user metadata for page reloads
      persistLoginResponse(loginData);

      // 2. Seed Redux access state immediately (no extra API call)
      dispatch(setUserFromLogin({
        user: {
          id:          loginData.user.id,
          email:       loginData.user.email,
          role:        loginData.user.role as "admin" | "developer",
          permissions: loginData.user.permissions,
        },
      }));

      // 3. Redirect based on role
      router.refresh();
      if (loginData.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
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
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access the platform
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
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
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
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-red-500 rounded-md bg-red-50 px-3 py-2 border border-red-200">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
