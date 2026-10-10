import { Users, PlusCircle, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

const quickActions = [
  {
    title: "Create New User",
    description: "Add a client or staff member",
    href: "/admin/users",
    icon: PlusCircle,
  },
  {
    title: "Access Control",
    description: "Assign developers and manage page permissions",
    href: "/admin/access",
    icon: Users,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">

      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background p-5 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)] transition-all hover:border-primary/30 hover:shadow-[0_4px_24px_0_hsl(var(--foreground)/0.10)] hover:bg-muted/30"
            >
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border/60 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-200">
                <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
