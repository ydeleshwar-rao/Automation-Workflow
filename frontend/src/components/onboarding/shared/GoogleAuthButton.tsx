"use client";

import { useState } from "react";
import { SsoProviderButton } from "./SsoButtons";

type GoogleAuthButtonProps = {
  className?: string;
  label?: string;
};

/** Single Google button — prefer <SsoButtons /> to also offer Microsoft. */
export function GoogleAuthButton({
  className = "",
  label = "Continue with Google",
}: GoogleAuthButtonProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <SsoProviderButton provider="google" label={label} onError={setError} />
      {error && (
        <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
