"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabaseClient = createClient();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabaseClient.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (data.session) {
          setReady(true);
        } else {
          setError(
            sessionError?.message ??
              "Invalid or expired reset link. Please request a new one.",
          );
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords must match");
      return;
    }

    const { error: updateError } = await supabaseClient.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Password updated successfully");
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        {error ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="text-sm text-red-500">{error}</div>
            <Link href="/login" className="text-sm text-foreground underline underline-offset-4">
              Back to login
            </Link>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Checking session...</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full flex-col">
      <main className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Reset Your Password</CardTitle>
              <CardDescription>Please enter your new password below.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="New password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Confirm password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                        onClick={() => setShowConfirm((prev) => !prev)}
                        className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-300"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error ? <p className="text-sm text-red-500">{error}</p> : null}
                  {success ? <p className="text-sm text-green-600">{success}</p> : null}

                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Save new password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
