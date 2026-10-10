"use client";

import React from "react";
import { Mail } from "lucide-react";
import { GlobalLoader } from "@/src/components/ui/global-loader";

export function MailConnectionLoader({ isOpen }: { isOpen: boolean }) {
  return (
    <GlobalLoader
      isOpen={isOpen}
      title="Connecting SMTP Account"
      description="We're securely verifying your credentials and establishing a connection to your mail server..."
      icon={<Mail className="w-10 h-10 text-[#4f46e5] animate-bounce" />}
    />
  );
}

