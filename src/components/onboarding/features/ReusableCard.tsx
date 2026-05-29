"use client";

import { useEffect, useRef, useState } from "react";

interface ReusableCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  delay?: number;
}

export function ReusableCard({
  icon,
  iconBg,
  title,
  description,
  delay = 0,
}: ReusableCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(28px)",
        transition: "opacity 0.55s ease, transform 0.55s ease",
      }}
      className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border flex flex-col gap-4"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-foreground font-semibold text-base leading-snug">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
