import { SignUpForm } from "@/src/components/auth/sign-up-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center gap-2 self-center mb-2">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">
            Job Management
          </span>
        </Link>
        <SignUpForm />
      </div>
    </div>
  );
}
