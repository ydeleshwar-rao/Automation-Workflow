"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useUser } from "../hooks/useUser";

export function UserProfile() {
  const { profile } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (profile === null) {
      // Explicitly not logged in (localStorage had no session)
      router.push("/login");
    }
  }, [profile, router]);

  // undefined = still loading from localStorage
  if (profile === undefined) {
    return null;
  }

  // null = not authenticated, redirect is in-flight
  if (profile === null) {
    return null;
  }

  return (
    <section className="relative space-y-4 overflow-hidden rounded-2xl px-3 py-1 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-background/95 via-accent/25 to-background/95 px-5 py-4 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)] backdrop-blur-sm animate-float-in-soft">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-primary/15 text-primary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Account Center
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal and company details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-secondary/20 p-5 shadow-[0_2px_20px_0_hsl(var(--foreground)/0.08)] transition-transform duration-300 hover:-translate-y-0.5 animate-float-in-soft-delay-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                <UserRound className="h-3.5 w-3.5" />
              </span>
              Personal Info
            </h2>
            <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Basic
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Full name
              </p>
              <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-sm font-semibold text-foreground">
                {profile.full_name || "N/A"}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Email
              </p>
              <div className="break-all rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-sm font-semibold text-foreground">
                <span className="mr-1.5 inline-flex text-primary/80">
                  <Mail className="inline h-3.5 w-3.5" />
                </span>
                {profile.email || "N/A"}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Role
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                <ShieldCheck className="h-3 w-3" />
                {profile.role?.toUpperCase() || "USER"}
              </span>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-accent/20 p-5 shadow-[0_2px_20px_0_hsl(var(--foreground)/0.08)] transition-transform duration-300 hover:-translate-y-0.5 animate-float-in-soft-delay-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              Company Info
            </h2>
            <span className="rounded-lg border border-accent bg-accent/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
              Business
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Company
              </p>
              <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-sm font-semibold text-foreground">
                N/A
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Phone
              </p>
              <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-sm font-semibold text-foreground">
                <span className="mr-1.5 inline-flex text-accent-foreground/80">
                  <Phone className="inline h-3.5 w-3.5" />
                </span>
                N/A
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
