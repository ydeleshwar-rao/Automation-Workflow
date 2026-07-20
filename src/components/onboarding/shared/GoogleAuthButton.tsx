"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

type GoogleAuthButtonProps = {
  className?: string;
  label?: string;
};

export function GoogleAuthButton({
  className = "",
  label = "Continue with Google",
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isLoading}
        className="w-full rounded-xl border border-border/70 bg-background px-5 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-3"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#4285F4] shadow-sm">
            G
          </span>
        )}
        {isLoading ? "Opening Google..." : label}
      </button>
      {error && (
        <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
