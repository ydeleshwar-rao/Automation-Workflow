"use client";

import { LoginHeader } from "@/src/components/onboarding/login/LoginHeader";
import { LivePreview } from "@/src/components/onboarding/features/LivePreview";
import { SetupAdminForm } from "@/src/components/onboarding/setup/SetupAdminForm";

export default function SetupPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      <section className="min-h-screen flex flex-col lg:flex-row">

        {/* ── Left Panel ─────────────────────────────────────────── */}
        <div className="relative w-full lg:w-[460px] xl:w-[540px] bg-card text-card-foreground flex flex-col">
          <LoginHeader />

          <div className="flex flex-1 flex-col items-start justify-center px-10 sm:px-16 py-24">
            <div className="w-full max-w-[360px]">
              <SetupAdminForm />
            </div>
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────────────── */}
        <div className="flex-1 bg-accent/40 bg-dotted-pattern flex flex-col items-center justify-center px-10 xl:px-16 py-16">
          <LivePreview />
        </div>

      </section>
    </div>
  );
}
