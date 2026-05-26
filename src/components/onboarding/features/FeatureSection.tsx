"use client";

import { useEffect, useRef, useState } from "react";
import { ReusableCard } from "./ReusableCard";

const FEATURES = [
  {
    iconBg: "hsl(var(--primary))",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
      </svg>
    ),
    title: "Build and manage jobs fast",
    description:
      "Create, assign and track jobs effortlessly. Visually design your workflow without complexity to save time.",
  },
  {
    iconBg: "hsl(var(--accent-foreground))",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
      </svg>
    ),
    title: "Streamline your workforce",
    description:
      "Automate job assignments, manage team availability and boost operational efficiency across every job.",
  },
  {
    iconBg: "hsl(var(--ring))",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
    title: "Full visibility and control",
    description:
      "Manage clients, jobs and your team with real-time status updates and a clear view of everything in motion.",
  },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function FeatureSection() {
  const heading = useReveal();
  const cta = useReveal();

  return (
    <div className="flex flex-col gap-10">
      <div
        ref={heading.ref}
        style={{
          opacity: heading.visible ? 1 : 0,
          transform: heading.visible ? "translateY(0px)" : "translateY(24px)",
          transition: "opacity 0.55s ease, transform 0.55s ease",
        }}
        className="text-center px-4"
      >
        <h2 className="text-foreground text-2xl font-bold leading-snug mb-3">
          Automate business processes
          <br />
          with confidence
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
          From a simple workflow, to managing AI automation systems across your
          entire business, make it happen with confidence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FEATURES.map((f, i) => (
          <ReusableCard
            key={f.title}
            iconBg={f.iconBg}
            icon={f.icon}
            title={f.title}
            description={f.description}
            delay={i * 100}
          />
        ))}
      </div>

      <div
        ref={cta.ref}
        style={{
          opacity: cta.visible ? 1 : 0,
          transform: cta.visible ? "translateY(0px)" : "translateY(16px)",
          transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
        }}
        className="flex justify-center pb-8"
      >
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-8 py-3 text-sm transition-colors cursor-pointer">
          Explore more
        </button>
      </div>
    </div>
  );
}
