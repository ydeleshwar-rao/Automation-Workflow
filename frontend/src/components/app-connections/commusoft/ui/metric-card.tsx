import { Card, CardContent } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
}

export function MetricCard({ title, value, icon, iconBg }: MetricCardProps) {
  return (
    <Card className="border border-border/50 shadow-sm bg-card rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn("p-2.5 rounded-lg shrink-0", iconBg || "bg-primary/10")}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 truncate">
              {title}
            </p>
            <h3 className="text-xl font-bold text-foreground truncate">
              {value}
            </h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
