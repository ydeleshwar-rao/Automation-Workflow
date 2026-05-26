import { Users, Briefcase, TrendingUp, PlusCircle, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

const stats = [
  {
    title: "Total Clients",
    value: "12",
    description: "Active user accounts",
    icon: Users,
    iconClass: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
  {
    title: "Active Jobs",
    value: "45",
    description: "Current projects in progress",
    icon: Briefcase,
    iconClass: "text-indigo-500",
    iconBg: "bg-indigo-500/10",
  },
  {
    title: "Growth",
    value: "+24%",
    description: "Increase this month",
    icon: TrendingUp,
    iconClass: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
];

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-border/60 bg-background shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)] p-5 flex items-start gap-4 transition-shadow hover:shadow-[0_4px_24px_0_hsl(var(--foreground)/0.10)]"
          >
            <div className={`flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}>
              <stat.icon className={`h-5 w-5 ${stat.iconClass}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {stat.title}
              </p>
              <p className="mt-1 text-3xl font-bold text-foreground leading-none">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

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
