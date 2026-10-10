"use client";

import { useEffect, useRef, useState } from "react";

// ── Tab definitions ───────────────────────────────────────────
const TABS = [
  {
    id: "scheduling",
    label: "Scheduling",
    heading: "Schedule jobs in seconds",
    description:
      "Drag-and-drop your jobs across a live calendar. Auto-assign the nearest available technician, avoid clashes and send instant confirmation to your team.",
    cta: "Explore Scheduling",
    accentColor: "#6366f1",
    visual: <SchedulingVisual />,
  },
  {
    id: "workforce",
    label: "Workforce",
    heading: "Manage your field teams",
    description:
      "Track technician availability, certifications and job load in real time. Make the right assignment every time with a single dashboard.",
    cta: "Manage Teams",
    accentColor: "#8b5cf6",
    visual: <WorkforceVisual />,
  },
  {
    id: "finance",
    label: "Finance",
    heading: "Quotes, invoices & payments",
    description:
      "Generate professional quotes on-site, convert them to invoices instantly and accept payments in the field. All synced with your accounting software.",
    cta: "See Finance Tools",
    accentColor: "#06b6d4",
    visual: <FinanceVisual />,
  },
  {
    id: "clients",
    label: "Clients",
    heading: "Build lasting client relationships",
    description:
      "Keep full job history, communications and site notes for every client. Set up automated reminders, follow-ups and satisfaction surveys.",
    cta: "Explore Client CRM",
    accentColor: "#10b981",
    visual: <ClientsVisual />,
  },
  {
    id: "reporting",
    label: "Reporting",
    heading: "Insights that drive decisions",
    description:
      "Real-time dashboards for revenue, job completion rates, technician performance and more. Export any report in one click.",
    cta: "View Reports",
    accentColor: "#f59e0b",
    visual: <ReportingVisual />,
  },
  {
    id: "compliance",
    label: "Compliance",
    heading: "Stay safe, stay compliant",
    description:
      "Digital SWMS, safety checklists and certification tracking built into every job. Get alerted before anything expires.",
    cta: "Explore Compliance",
    accentColor: "#ef4444",
    visual: <ComplianceVisual />,
  },
  {
    id: "automation",
    label: "Automation",
    heading: "Automate your whole workflow",
    description:
      "Build no-code automation flows triggered by job status, time, or external events. Reduce admin time and human error across every process.",
    cta: "Start Automating",
    accentColor: "#a855f7",
    visual: <AutomationVisual />,
  },
] as const;

// ── Tab visuals ───────────────────────────────────────────────

function SchedulingVisual() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const jobs = [
    { day: 0, top: 10, label: "Plumbing – Unit 4B", color: "#6366f1" },
    { day: 1, top: 10, label: "HVAC – Bldg A",      color: "#8b5cf6" },
    { day: 1, top: 38, label: "Electrical – L2",    color: "#06b6d4" },
    { day: 2, top: 10, label: "Roof – Site C",       color: "#10b981" },
    { day: 3, top: 10, label: "Gas fit – Unit 1",    color: "#f59e0b" },
    { day: 4, top: 10, label: "Inspection – HQ",     color: "#6366f1" },
  ];
  return (
    <div className="w-full h-full flex flex-col gap-3 p-5">
      <div className="flex gap-2 text-xs font-semibold text-muted-foreground px-1">
        {days.map((d) => <div key={d} className="flex-1 text-center">{d}</div>)}
      </div>
      <div className="flex gap-2 flex-1 relative">
        {days.map((_, di) => (
          <div key={di} className="flex-1 rounded-lg bg-muted/50 border border-border/50 relative min-h-[120px]">
            {jobs.filter((j) => j.day === di).map((j) => (
              <div
                key={j.label}
                className="absolute left-1 right-1 rounded px-1.5 py-1 text-[10px] font-medium text-white truncate"
                style={{ top: `${j.top}px`, backgroundColor: j.color }}
              >
                {j.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        3 jobs auto-assigned today
      </div>
    </div>
  );
}

function WorkforceVisual() {
  const team = [
    { name: "Marcus R.",  role: "Electrician",  status: "On Job",   pct: 80, color: "#6366f1" },
    { name: "Sarah K.",   role: "Plumber",       status: "Available",pct: 0,  color: "#10b981" },
    { name: "Jason T.",   role: "HVAC Tech",     status: "Driving",  pct: 60, color: "#f59e0b" },
    { name: "Aisha L.",   role: "Supervisor",    status: "On Job",   pct: 95, color: "#6366f1" },
  ];
  return (
    <div className="w-full flex flex-col gap-3 p-5">
      {team.map((m) => (
        <div key={m.name} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {m.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{m.name}</p>
            <p className="text-[10px] text-muted-foreground">{m.role}</p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: m.status === "Available" ? "hsl(142 71% 45% / 0.15)" : "hsl(244 75% 59% / 0.12)",
              color: m.status === "Available" ? "#10b981" : "#6366f1",
            }}
          >
            {m.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function FinanceVisual() {
  const bars = [
    { month: "Jan", val: 62 },
    { month: "Feb", val: 75 },
    { month: "Mar", val: 55 },
    { month: "Apr", val: 88 },
    { month: "May", val: 70 },
    { month: "Jun", val: 95 },
  ];
  return (
    <div className="w-full flex flex-col gap-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Revenue MTD",   value: "$48,200", up: true  },
          { label: "Outstanding",   value: "$6,400",  up: false },
          { label: "Invoices sent", value: "34",      up: true  },
          { label: "Avg job value", value: "$1,418",  up: true  },
        ].map((c) => (
          <div key={c.label} className="bg-muted/40 rounded-xl p-3 border border-border/50">
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
            <p className="text-base font-bold text-foreground">{c.value}</p>
            <p className={`text-[10px] font-medium ${c.up ? "text-green-500" : "text-red-400"}`}>
              {c.up ? "▲" : "▼"} this month
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {bars.map((b) => (
          <div key={b.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-sm bg-primary/70" style={{ height: `${b.val * 0.56}px` }} />
            <p className="text-[9px] text-muted-foreground">{b.month}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientsVisual() {
  const clients = [
    { name: "Greenfield Corp",   jobs: 14, status: "Active",   last: "2d ago" },
    { name: "Sunrise Properties",jobs: 9,  status: "Active",   last: "5d ago" },
    { name: "Metro Constructions",jobs: 22, status: "VIP",     last: "1d ago" },
    { name: "BlueSky Realty",    jobs: 6,  status: "Inactive", last: "3w ago" },
  ];
  const statusStyle: Record<string, string> = {
    Active:   "bg-green-500/10 text-green-600",
    VIP:      "bg-primary/10 text-primary",
    Inactive: "bg-muted text-muted-foreground",
  };
  return (
    <div className="w-full flex flex-col gap-2 p-5">
      {clients.map((c) => (
        <div key={c.name} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/50">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground flex-shrink-0">
            {c.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
            <p className="text-[10px] text-muted-foreground">{c.jobs} jobs · {c.last}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyle[c.status]}`}>
            {c.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function ReportingVisual() {
  const metrics = [
    { label: "Job completion",  pct: 94, color: "#6366f1" },
    { label: "On-time rate",    pct: 87, color: "#10b981" },
    { label: "Client sat.",     pct: 91, color: "#f59e0b" },
    { label: "Tech utilisation",pct: 78, color: "#06b6d4" },
  ];
  return (
    <div className="w-full flex flex-col gap-3 p-5">
      <div className="grid grid-cols-2 gap-2 mb-1">
        {[
          { label: "Jobs this week", value: "47" },
          { label: "Avg duration",   value: "2.4h" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/40 rounded-xl p-3 border border-border/50 text-center">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      {metrics.map((m) => (
        <div key={m.label} className="flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground w-28 flex-shrink-0">{m.label}</p>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
          </div>
          <p className="text-[10px] font-semibold text-foreground w-7 text-right">{m.pct}%</p>
        </div>
      ))}
    </div>
  );
}

function ComplianceVisual() {
  const checks = [
    { label: "SWMS submitted",       done: true  },
    { label: "PPE checklist signed", done: true  },
    { label: "Site induction",        done: true  },
    { label: "Cert expiry review",    done: false },
    { label: "Incident report filed", done: true  },
  ];
  const certs = [
    { name: "Marcus R.", cert: "Elect. Licence", days: 42, warn: false },
    { name: "Jason T.",  cert: "Gas Cert",       days: 8,  warn: true  },
  ];
  return (
    <div className="w-full flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2.5 bg-muted/40 rounded-lg px-3 py-2 border border-border/40">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${c.done ? "bg-green-500" : "bg-muted border border-border"}`}>
              {c.done && <svg viewBox="0 0 12 12" fill="white" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <p className={`text-xs ${c.done ? "text-foreground" : "text-muted-foreground"}`}>{c.label}</p>
          </div>
        ))}
      </div>
      {certs.map((c) => (
        <div key={c.name} className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-xs ${c.warn ? "bg-red-500/5 border-red-500/30" : "bg-muted/30 border-border/40"}`}>
          <p className="font-medium text-foreground flex-1">{c.name} · {c.cert}</p>
          <span className={`font-semibold ${c.warn ? "text-red-500" : "text-muted-foreground"}`}>
            {c.warn ? "⚠ " : ""}{c.days}d
          </span>
        </div>
      ))}
    </div>
  );
}

function AutomationVisual() {
  const steps = [
    { icon: "⚡", label: "Job marked complete",   color: "#6366f1" },
    { icon: "📄", label: "Invoice auto-generated", color: "#8b5cf6" },
    { icon: "📧", label: "Email sent to client",   color: "#06b6d4" },
    { icon: "⭐", label: "Review request sent",    color: "#f59e0b" },
  ];
  return (
    <div className="w-full flex flex-col items-center gap-1 p-5">
      {steps.map((s, i) => (
        <div key={s.label} className="w-full flex flex-col items-center">
          <div className="w-full flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5 border border-border/50">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: `${s.color}1a` }}>
              {s.icon}
            </div>
            <p className="text-xs font-medium text-foreground">{s.label}</p>
            <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
          </div>
          {i < steps.length - 1 && (
            <div className="w-px h-3 bg-border" />
          )}
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Triggered automatically — zero admin
      </p>
    </div>
  );
}

// ── Reveal hook ───────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

// ── Main component ────────────────────────────────────────────
export function SolutionsSection() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const skipInitialTabScrollIntoView = useRef(true);
  const heading = useReveal();
  const content = useReveal(0.05);

  const tab = TABS[active];

  function switchTab(index: number) {
    if (index === active || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setActive(index);
      setAnimating(false);
    }, 180);
  }

  // Scroll active tab into view when switching tabs (not on mount — avoids scrolling the page past the login form)
  useEffect(() => {
    if (skipInitialTabScrollIntoView.current) {
      skipInitialTabScrollIntoView.current = false;
      return;
    }
    const el = tabsRef.current?.querySelector(`[data-active="true"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 px-4">

      {/* Header */}
      <div
        ref={heading.ref}
        className="text-center"
        style={{
          opacity: heading.visible ? 1 : 0,
          transform: heading.visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.55s ease, transform 0.55s ease",
        }}
      >
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Solutions</p>
        <h2 className="text-foreground text-2xl sm:text-3xl font-bold leading-snug mb-4">
          Everything your field team needs,
          <br className="hidden sm:block" /> in one platform
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
          From scheduling to compliance, every part of your operation is connected,
          automated and visible in real time.
        </p>
      </div>

      {/* Tab bar */}
      <div
        ref={tabsRef}
        className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border pb-0"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            data-active={i === active}
            onClick={() => switchTab(i)}
            className={`
              relative flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-t-lg
              transition-colors duration-200 outline-none
              ${i === active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            {t.label}
            {/* Active underline */}
            {i === active && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
                style={{ transition: "none" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        ref={content.ref}
        style={{
          opacity: content.visible ? (animating ? 0 : 1) : 0,
          transform: content.visible ? (animating ? "translateY(8px)" : "translateY(0)") : "translateY(24px)",
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
      >
        {/* Visual panel */}
        <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm bg-card min-h-[300px] flex flex-col">
          {/* Gradient accent top bar */}
          <div
            className="h-1 w-full"
            style={{ background: `linear-gradient(90deg, ${tab.accentColor}, ${tab.accentColor}88)` }}
          />
          {tab.visual}
        </div>

        {/* Text panel */}
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-snug mb-3">
              {tab.heading}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {tab.description}
            </p>
          </div>

          {/* Feature bullets */}
          <ul className="flex flex-col gap-2">
            {getFeatureBullets(tab.id).map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-foreground">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${tab.accentColor}22` }}
                >
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none"
                    stroke={tab.accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </span>
                {b}
              </li>
            ))}
          </ul>

          <button
            className="self-start px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
            style={{ backgroundColor: tab.accentColor }}
          >
            {tab.cta}
          </button>
        </div>
      </div>

    </div>
  );
}

// ── Bullet points per tab ─────────────────────────────────────
function getFeatureBullets(id: string): string[] {
  const map: Record<string, string[]> = {
    scheduling:  ["Live calendar with drag-and-drop", "Auto-assign by location & skill", "SMS confirmations to technicians"],
    workforce:   ["Real-time GPS tracking", "Cert & licence expiry alerts",  "Workload balancing across teams"],
    finance:     ["On-site quote generation",        "One-click invoice from job",      "Stripe & accounting integrations"],
    clients:     ["Full job history per client",     "Automated follow-up reminders",   "Satisfaction surveys after jobs"],
    reporting:   ["Live KPI dashboards",             "Technician performance reports",  "Export to PDF or CSV anytime"],
    compliance:  ["Digital SWMS & checklists",       "Cert tracking with reminders",    "Audit-ready incident reports"],
    automation:  ["No-code workflow builder",        "Trigger by status, time or event","Connect 100+ apps via webhooks"],
  };
  return map[id] ?? [];
}
