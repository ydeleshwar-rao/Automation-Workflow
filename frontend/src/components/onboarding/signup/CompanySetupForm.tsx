"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";
import { SsoButtons } from "../shared/SsoButtons";

const BENEFITS = [
  "Employees sign in with their existing work account",
  "Only people from your company domain can join",
  "New employees get no access until you grant it",
];

/** "For my company": creates a company workspace bound to the admin's Google Workspace / Microsoft 365. */
export function CompanySetupForm() {
  const [organizationName, setOrganizationName] = useState("");

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Set up your company</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your company&apos;s Google Workspace or Microsoft 365. You&apos;ll be the workspace admin.
        </p>
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
            {benefit}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="company-name" className="text-sm font-medium text-foreground">Company name</label>
        <input
          id="company-name"
          type="text"
          placeholder="Acme Ltd"
          autoComplete="organization"
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          className="w-full bg-background border border-border/70 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <p className="mt-5 mb-3 text-xs text-muted-foreground">Sign in with your <span className="font-semibold text-foreground">work</span> account:</p>
      <SsoButtons
        intent="company-setup"
        organizationName={organizationName.trim()}
        validate={() => (organizationName.trim() ? null : "Enter your company name first.")}
      />
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Personal accounts (gmail.com, outlook.com…) can&apos;t be used to set up a company — they create a personal workspace instead.
      </p>

      <div className="mt-6 rounded-xl border border-border/70 bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          No Google Workspace or Microsoft 365?{" "}
          <Link href="/setup" className="font-semibold text-primary hover:text-primary/80">
            Set up with email and password
          </Link>
          . You can connect company sign-in later from Admin → Company SSO.
        </p>
      </div>
    </div>
  );
}
