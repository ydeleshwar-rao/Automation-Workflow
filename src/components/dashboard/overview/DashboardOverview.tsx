"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Briefcase, DollarSign, CheckCircle2, Users, Loader2 } from "lucide-react";
import { useUser } from "../profile/hooks/useUser";
import { useDashboardJobs } from "./hooks/useDashboardJobs";
import { IntegrationSwitcher } from "./components/IntegrationSwitcher";
import { useAppSelector } from "@/src/store/hooks";
import { selectActiveApp, selectAppStatusLoaded } from "@/src/store/appStatusSlice";
import type { JobsFilters, Period } from "@/src/types/dashboard.types";

// ── Sparkline SVG ─────────────────────────────────────────────
function Sparkline({ data, color, fill }: { data: number[]; color: string; fill: string }) {
  const w = 90; const h = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1 || 1)) * w,
    h - ((v - min) / range) * (h - 4) - 2,
  ]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Custom tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">
            {p.name === "revenue" ? `$${p.value.toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
// Renders only the data we actually have: label, value, and a sparkline iff
// real time-series numbers are available. No synthetic trend text.
function StatCard({
  label, value, sparkData, color, fill, icon: Icon,
}: {
  label: string;
  value: string;
  sparkData?: number[];
  color: string;
  fill: string;
  icon: React.ElementType;
}) {
  const hasSpark = !!sparkData && sparkData.length > 0;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
        {hasSpark && <Sparkline data={sparkData!} color={color} fill={fill} />}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ── Period filter pill ────────────────────────────────────────
function PeriodFilter({ active, onChange }: { active: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {(["week", "month", "year"] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
            active === p
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Status filter dropdown ────────────────────────────────────
function StatusFilter({
  options, value, onChange,
}: {
  options: string[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  if (options.length === 0) return null;
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      <option value="">All statuses</option>
      {options.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

// ── Time-based greeting ───────────────────────────────────────
// 5:00–11:59  → Good morning
// 12:00–16:59 → Good afternoon
// 17:00–04:59 → Good evening
function getTimeOfDayGreeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-semibold text-foreground">{message}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function DashboardOverview() {
  const { profile } = useUser();
  const activeApp = useAppSelector(selectActiveApp);
  const statusLoaded = useAppSelector(selectAppStatusLoaded);

  const [period, setPeriod] = useState<Period>("month");
  const [pendingPeriod, setPendingPeriod] = useState<Period>("week");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Greeting auto-refreshes once a minute so the label flips at the
  // morning/afternoon/evening boundary without needing a page reload.
  const [greeting, setGreeting] = useState<string>(() => getTimeOfDayGreeting());
  useEffect(() => {
    const tick = () => setGreeting(getTimeOfDayGreeting());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const filters = useMemo<JobsFilters>(
    () => ({
      period,
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [period, statusFilter],
  );

  const { jobs, aggregates, isLoading, error, appLabel } = useDashboardJobs(filters);

  const firstName = profile?.first_name || "there";
  const totJobs = aggregates.kpis.total_jobs;
  const totRev = aggregates.kpis.total_revenue;
  const compRate = aggregates.kpis.completion_pct;
  const activeTeams = aggregates.kpis.active_teams;

  const activityData = aggregates.activity;
  const pendData =
    pendingPeriod === "week"
      ? aggregates.pending_by_day
      : aggregates.activity.map((b) => ({ ...b }));
  const pendTotal = pendData.reduce((s, d) => s + d.jobs, 0);
  const urgentPct =
    pendTotal > 0
      ? Math.round((pendData.reduce((s, d) => s + d.pending, 0) / pendTotal) * 100)
      : 0;

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => set.add(j.status));
    return [...set].sort();
  }, [jobs]);

  // Sparklines are derived directly from real activity buckets — no synthetic
  // padding. If a series has no data, the StatCard hides its sparkline.
  const sparkJobs      = activityData.map((b) => b.jobs);
  const sparkRevenue   = activityData.map((b) => b.revenue);
  const sparkCompleted = activityData.map((b) => b.completed);

  const donutTotal = aggregates.job_status.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">

      {/* Greeting + integration switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {appLabel
              ? `Live data from ${appLabel} — here's what's happening with your jobs today.`
              : "Connect an integration to see your jobs."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Syncing…
            </span>
          )}
          <IntegrationSwitcher />
        </div>
      </div>

      {/* No active app — empty state */}
      {statusLoaded && !activeApp && (
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <EmptyState
            message="No integration connected"
            hint="Connect ServiceM8, Commusoft or another app from the integrations page to populate this dashboard."
          />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl px-3 py-2">
          Failed to load data: {error}
        </div>
      )}

      {/* Dashboard body — only render when an app is selected */}
      {activeApp && (
      <>
      {/* ── Row 1: Main chart + activity panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Main area chart */}
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Job Activity</p>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-2xl font-bold text-foreground">{totJobs} jobs</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ${totRev.toLocaleString()} total revenue
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusFilter options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
              <PeriodFilter active={period} onChange={setPeriod} />
            </div>
          </div>

          {activityData.length === 0 ? (
            <EmptyState message="No job activity for this period" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="jobs"      stroke="#6366f1" strokeWidth={2} fill="url(#gJobs)"      dot={false} activeDot={{ r: 5, fill: "#6366f1" }} />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#gCompleted)" dot={false} activeDot={{ r: 5, fill: "#10b981" }} />
                </AreaChart>
              </ResponsiveContainer>

              <div className="flex items-center gap-4 mt-3">
                {[{ color: "#6366f1", label: "Total Jobs" }, { color: "#10b981", label: "Completed" }].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* By Category panel */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">By Category</p>
            <span className="text-xs text-muted-foreground capitalize">This {period}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 border-y border-border">
            {[
              { label: "Jobs",    val: `${totJobs}` },
              { label: "Revenue", val: `$${Math.round(totRev / 1000)}k` },
              { label: "Done",    val: `${compRate}%` },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-base font-bold text-foreground">{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {aggregates.by_category.length === 0 ? (
            <EmptyState message="No category data" />
          ) : (
            <div className="flex flex-col gap-3 flex-1">
              {aggregates.by_category.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <p className="text-xs font-medium text-foreground">{cat.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">${cat.revenue.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{cat.jobs} jobs</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Jobs"   value={String(totJobs)}
          sparkData={sparkJobs}
          color="#6366f1" fill="#6366f110"
          icon={Briefcase}
        />
        <StatCard
          label="Revenue"      value={`$${Math.round(totRev / 1000)}k`}
          sparkData={sparkRevenue}
          color="#10b981" fill="#10b98110"
          icon={DollarSign}
        />
        <StatCard
          label="Completion"   value={`${compRate}%`}
          sparkData={sparkCompleted}
          color="#f59e0b" fill="#f59e0b10"
          icon={CheckCircle2}
        />
        <StatCard
          label="Customers" value={String(activeTeams)}
          color="#06b6d4" fill="#06b6d410"
          icon={Users}
        />
      </div>

      {/* ── Row 3: Pending chart + donut ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Pending / urgent chart */}
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending Jobs</p>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-2xl font-bold text-foreground">{urgentPct}%</p>
                {urgentPct > 0 && (
                  <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">Urgent</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">of jobs need immediate attention</p>
            </div>
            <PeriodFilter active={pendingPeriod} onChange={setPendingPeriod} />
          </div>

          {pendData.length === 0 ? (
            <EmptyState message="No pending data" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={pendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pending" stroke="#ef4444" strokeWidth={2} fill="url(#gPending)" dot={false} activeDot={{ r: 5, fill: "#ef4444" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut + team */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <p className="text-sm font-semibold text-foreground">Job Status</p>

          {aggregates.job_status.length === 0 ? (
            <EmptyState message="No jobs to display" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative w-24 h-24 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={aggregates.job_status} cx="50%" cy="50%" innerRadius={28} outerRadius={42} dataKey="value" strokeWidth={0}>
                      {aggregates.job_status.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs font-bold text-foreground text-center leading-tight">
                    {donutTotal}<br />
                    <span className="text-[9px] text-muted-foreground font-normal">total</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                {aggregates.job_status.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <p className="text-[11px] text-muted-foreground">{d.name}</p>
                    </div>
                    <p className="text-[11px] font-semibold text-foreground">{d.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground font-medium mb-2.5">Top Performers</p>
            {aggregates.top_performers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No performer data yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {aggregates.top_performers.map((t) => (
                  <div key={t.staff_id} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
                      {t.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.jobs} jobs</p>
                    </div>
                    <p className="text-xs font-semibold text-foreground">${t.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}

    </div>
  );
}
