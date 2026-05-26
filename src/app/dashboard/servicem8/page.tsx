"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { Servicem8JobsView } from "@/src/components/dashboard";
import { Loader2, RefreshCcw, Plus, Table as TableIcon, Code } from "lucide-react";
import { Button } from "@/src/components/ui/button";

function ServiceM8Content() {
  return (
    <div className="flex-1 overflow-hidden bg-[hsl(var(--surface))]">
      <Servicem8JobsView />
    </div>
  );
}

export default function ServiceM8Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ServiceM8Content />
    </Suspense>
  );
}
