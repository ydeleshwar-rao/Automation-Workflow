"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User } from "lucide-react";
import { CreateAccountForm } from "./CreateAccountForm";
import { CompanySetupForm } from "./CompanySetupForm";

type AccountType = "individual" | "company";

const CHOICES: { type: AccountType; title: string; description: string; icon: typeof User }[] = [
  {
    type: "individual",
    title: "For myself",
    description: "A personal workspace. Sign up with email, Google or Microsoft.",
    icon: User,
  },
  {
    type: "company",
    title: "For my company",
    description: "Your team signs in with Google Workspace or Microsoft 365. Only your employees can join.",
    icon: Building2,
  },
];

/** /sign-up → choose individual or company; ?type=individual|company opens a form directly. */
export function SignUpFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get("type") as AccountType | null;

  const choose = (next: AccountType | null) => router.replace(next ? `/sign-up?type=${next}` : "/sign-up", { scroll: false });

  if (type === "individual" || type === "company") {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => choose(null)}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Choose account type
        </button>
        {type === "individual" ? <CreateAccountForm /> : <CompanySetupForm />}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Create an account</h2>
        <p className="mt-1 text-sm text-muted-foreground">How will you use the workspace?</p>
      </div>

      <div className="flex flex-col gap-3">
        {CHOICES.map((choice) => (
          <button
            key={choice.type}
            type="button"
            onClick={() => choose(choice.type)}
            className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
              <choice.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{choice.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{choice.description}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
