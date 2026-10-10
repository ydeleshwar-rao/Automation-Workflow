import Link from "next/link";

export function LoginFooter() {
  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <p className="text-muted-foreground text-xs text-center max-w-xs leading-relaxed">
        By continuing, you agree to our{" "}
        <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
