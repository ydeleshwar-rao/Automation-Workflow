"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { AssignmentsTab } from "@/src/components/admin/access/AssignmentsTab"
import { PermissionsTab } from "@/src/components/admin/access/PermissionsTab"

type TabKey = "assignments" | "permissions"

const TABS: { key: TabKey; label: string }[] = [
  { key: "assignments", label: "Developer Assignments" },
  { key: "permissions", label: "Permissions" },
]

export default function AdminAccessPage() {
  const [active, setActive] = useState<TabKey>("assignments")

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>

      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Access Control</h1>
        <p className="text-sm text-muted-foreground">
          Assign developers to clients and manage per-page permissions.
        </p>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active === tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                active === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {active === "assignments" ? <AssignmentsTab /> : <PermissionsTab />}
    </div>
  )
}
