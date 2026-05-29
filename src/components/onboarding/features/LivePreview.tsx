"use client";

import { useEffect, useRef, useState } from "react";

// ── Count-up — runs ONCE on mount, then shows live value ──────
function useCountUpOnce(initialTarget: number, duration = 1400, delay = 0) {
  const [display, setDisplay] = useState(0);
  const done = useRef(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (done.current) return;

    const timeout = setTimeout(() => {
      let startTime: number | null = null;

      const step = (ts: number) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        const eased = 1 - Math.pow(2, -10 * progress); // easeOutExpo
        setDisplay(Math.round(eased * initialTarget));

        if (progress < 1) {
          raf.current = requestAnimationFrame(step);
        } else {
          done.current = true;
        }
      };

      raf.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []); // ← empty deps: only fires once on mount

  return done.current ? null : display; // null = animation done, show live value
}

// ── Data ──────────────────────────────────────────────────────
const INITIAL_METRICS = {
  activeJobs:  { value: 124, delta: 12 },
  teamMembers: { value: 38,  delta: 4  },
  completed:   { value: 89,  delta: 3  },
};

const PROGRESS_ROWS = [
  { label: "Electrical", pct: 92 },
  { label: "Plumbing",   pct: 78 },
  { label: "HVAC",       pct: 85 },
];

const JOBS = [
  { title: "Plumbing repair – Unit 4B",    status: "In Progress", assignee: "MR", color: "bg-primary" },
  { title: "HVAC inspection – Building A", status: "Scheduled",   assignee: "SK", color: "bg-accent-foreground" },
  { title: "Electrical fit-out – Level 2", status: "Completed",   assignee: "JT", color: "bg-chart-2" },
  { title: "Roof maintenance – Site C",    status: "Pending",     assignee: "AL", color: "bg-muted-foreground" },
];

const STATUS_COLOR: Record<string, string> = {
  "In Progress": "bg-primary/10 text-primary",
  "Scheduled":   "bg-accent text-accent-foreground",
  "Completed":   "bg-secondary text-secondary-foreground",
  "Pending":     "bg-muted text-muted-foreground",
};

// ── Stat card ─────────────────────────────────────────────────
function StatCard({
  label, liveValue, liveDelta, suffix, delay, initialValue, initialDelta,
}: {
  label: string; liveValue: number; liveDelta: number;
  suffix: string; delay: number; initialValue: number; initialDelta: number;
}) {
  const animVal   = useCountUpOnce(initialValue, 1400, delay);
  const animDelta = useCountUpOnce(initialDelta, 1000, delay + 200);

  // While animating show animated value; after done show live value
  const displayVal   = animVal   !== null ? animVal   : liveValue;
  const displayDelta = animDelta !== null ? animDelta : liveDelta;

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground tabular-nums transition-all duration-300">
        {displayVal}{suffix}
      </p>
      <p className="text-xs font-medium text-primary tabular-nums">
        +{displayDelta}{suffix}
      </p>
    </div>
  );
}

// ── Progress bar — grows 0 → pct once on mount ────────────────
function ProgressBar({ label, pct, delay }: { label: string; pct: number; delay: number }) {
  const [width, setWidth] = useState(0);
  const [count, setCount] = useState(0);
  const barDone = useRef(false);

  // Grow bar: double-rAF ensures browser paints 0% before transitioning
  useEffect(() => {
    if (barDone.current) return;
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWidth(pct);
          barDone.current = true;
        });
      });
    }, delay);
    return () => clearTimeout(t);
  }, []); // ← once only

  // Count-up number in sync with bar
  useEffect(() => {
    const duration = 1200;
    let startTime: number | null = null;
    let raf: number;

    const t = setTimeout(() => {
      const step = (ts: number) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        const eased = 1 - Math.pow(2, -10 * progress);
        setCount(Math.round(eased * pct));
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);

    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []); // ← once only

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</p>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent-foreground"
          style={{
            width: `${width}%`,
            transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <p className="text-xs font-semibold text-foreground w-8 text-right tabular-nums">
        {count}%
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export function LivePreview() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const nextCompleted = Math.min(99, prev.completed.value + (Math.random() > 0.65 ? 1 : 0));
        return {
          activeJobs:  { value: prev.activeJobs.value + 1 + Math.floor(Math.random() * 2), delta: prev.activeJobs.delta + (Math.random() > 0.55 ? 1 : 0) },
          teamMembers: { value: prev.teamMembers.value + (Math.random() > 0.7 ? 1 : 0),    delta: prev.teamMembers.delta + (Math.random() > 0.8 ? 1 : 0)  },
          completed:   { value: nextCompleted, delta: nextCompleted - 89 },
        };
      });
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const statDefs = [
    { key: "activeJobs",  label: "Active Jobs",  suffix: "",  initial: INITIAL_METRICS.activeJobs  },
    { key: "teamMembers", label: "Team Members", suffix: "",  initial: INITIAL_METRICS.teamMembers },
    { key: "completed",   label: "Completed",    suffix: "%", initial: INITIAL_METRICS.completed   },
  ];

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Live preview</p>
          <h3 className="text-foreground font-bold text-lg leading-tight mt-0.5">Job Dashboard</h3>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {statDefs.map((s, i) => (
          <StatCard
            key={s.key}
            label={s.label}
            suffix={s.suffix}
            liveValue={metrics[s.key as keyof typeof metrics].value}
            liveDelta={metrics[s.key as keyof typeof metrics].delta}
            initialValue={s.initial.value}
            initialDelta={s.initial.delta}
            delay={i * 120}
          />
        ))}
      </div>

      {/* Job list */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <p className="text-sm font-semibold text-foreground">Recent Jobs</p>
        </div>
        <div className="divide-y divide-border/60">
          {JOBS.map((job) => (
            <div key={job.title} className="flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${job.color}`} />
                <p className="text-sm text-foreground truncate">{job.title}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLOR[job.status]}`}>
                  {job.status}
                </span>
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {job.assignee}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bars */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">Monthly completion rate</p>
        <div className="flex flex-col gap-3">
          {PROGRESS_ROWS.map((row, i) => (
            <ProgressBar key={row.label} label={row.label} pct={row.pct} delay={400 + i * 180} />
          ))}
        </div>
      </div>

    </div>
  );
}
