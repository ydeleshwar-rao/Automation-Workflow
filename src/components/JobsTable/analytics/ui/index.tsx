"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
} from "lucide-react";

import type { JobRow } from "../../types";
import { useAnalytics } from "../hooks";

interface AnalyticsUIProps {
  jobs: JobRow[];
  loading: boolean;
  integrationName: string;
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-background p-6 rounded-xl border border-border/60 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)] flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </div>
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
    </div>
  );
}

export function AnalyticsUI({ jobs, loading, integrationName }: AnalyticsUIProps) {
  const { stats, chartData } = useAnalytics(jobs, loading);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="space-y-1">
          <div className="h-9 w-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
          ))}
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-5 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)] h-[260px] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-[28px] font-bold text-foreground tracking-tight">{integrationName} Jobs</h1>
        <p className="text-muted-foreground text-sm">View and manage your {integrationName} jobs and schedules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <MetricCard
          title="TOTAL REVENUE"
          value={`$${stats.revenue.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
        />
        <MetricCard title="TOTAL JOBS" value={stats.total} icon={<Briefcase className="h-6 w-6" />} />
        <MetricCard
          title="COMPLETED JOBS"
          value={stats.completed}
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <MetricCard title="ACTIVE JOBS" value={stats.active} icon={<Clock className="h-6 w-6" />} />
        <MetricCard
          title="NEW THIS WEEK"
          value={stats.newThisWeek}
          icon={<Calendar className="h-6 w-6" />}
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-background p-5 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
        <p className="text-sm font-semibold text-foreground mb-4">Job status distribution</p>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={200} minWidth={0}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: "12px",
                  boxShadow: "0 2px 16px 0 hsl(var(--foreground) / 0.08)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
