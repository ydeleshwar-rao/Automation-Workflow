import React from "react";

interface ConfigureStepNoticeProps {
  title: string;
  description: React.ReactNode;
}

/** Centered message shown instead of a Configure form (no event chosen, nothing to configure, …). */
export function ConfigureStepNotice({ title, description }: ConfigureStepNoticeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
