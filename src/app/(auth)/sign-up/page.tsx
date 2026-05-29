"use client";

import { LoginHeader } from "@/src/components/onboarding/login/LoginHeader";
import { LoginFooter } from "@/src/components/onboarding/login/LoginFooter";
import { LivePreview } from "@/src/components/onboarding/features/LivePreview";
import { CreateAccountForm } from "@/src/components/onboarding/signup/CreateAccountForm";

export default function SignUpPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      <section className="min-h-screen flex flex-col lg:flex-row">

        {/* ── Left Panel ─────────────────────────────────────────── */}
        <div className="relative w-full lg:w-[460px] xl:w-[520px] bg-card text-card-foreground flex flex-col">
          <LoginHeader />

          <div className="flex flex-1 flex-col items-start justify-center px-10 sm:px-16 py-24">
            <div className="w-full max-w-[340px]">
              <CreateAccountForm />
              <LoginFooter />
            </div>
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────────────── */}
        <div className="flex-1 bg-accent/40 bg-dotted-pattern flex flex-col items-center justify-center px-10 xl:px-16 py-16">
          <LivePreview />

          <button
            type="button"
            onClick={() => {
              document
                .getElementById("feature-section")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="mt-10 flex flex-col items-center gap-2 animate-bounce cursor-pointer rounded-full px-3 py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Scroll to feature section"
          >
            <p className="text-xs text-muted-foreground tracking-widest uppercase">
              scroll to explore
            </p>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4 text-muted-foreground"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>

      </section>
    </div>
  );
}
