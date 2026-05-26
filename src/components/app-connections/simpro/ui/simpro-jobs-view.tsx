"use client";

import { useState } from "react";
import {
  RefreshCcw,
  Briefcase,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  LayoutGrid,
} from "lucide-react";

import { useSimProJobs } from "../hooks/useSimProJobs";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { MetricCard } from "./metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/components/ui/card";
import { DashboardPageSkeleton } from "@/src/components/ui/skeleton-loader";

export function SimproJobsView() {
  const { jobs, isLoading, isError, error, refetch } = useSimProJobs();

  if (isLoading) {
    return <DashboardPageSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center max-w-md mx-auto">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <RefreshCcw className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="text-foreground font-bold mb-2">Sync Failed</h2>
          <p className="text-sm text-muted-foreground mb-4">{(error as any)?.message || "Failed to fetch simPRO jobs"}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="h-9 border-border">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: jobs?.length || 0,
    active: jobs?.filter(j => j.Status.Name !== "Completed").length || 0,
    completed: jobs?.filter(j => j.Status.Name === "Completed").length || 0,
    revenue: jobs?.reduce((sum, j) => sum + (j.Total?.IncTax || 0), 0) || 0,
    thisMonth: jobs?.filter(j => {
      const date = new Date(j.DateModified);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length || 0,
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full bg-transparent font-sans text-foreground animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-blue-500/10 overflow-hidden border border-border/50">
            <img src="/simpro.png" alt="simPRO" className="h-full w-full object-contain p-1.5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground -mb-0.5">
              simPRO Dashboard
            </h1>
            <p className="text-[13px] text-muted-foreground font-medium">
              Real-time job management and synchronization.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 gap-2 border-border/50 hover:bg-card shadow-sm font-bold text-[12px] uppercase tracking-wider" 
            onClick={() => refetch()} 
            disabled={isLoading}
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Sync Now
          </Button>
          <Button size="sm" className="h-10 gap-2 bg-[#0b5cff] hover:bg-[#004ce6] shadow-md shadow-blue-500/10 font-bold text-[12px] uppercase tracking-wider">
            Create New Job
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Jobs"
          value={stats.total.toLocaleString()}
          icon={<Briefcase className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <MetricCard
          title="In Progress"
          value={stats.active.toLocaleString()}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Finalized"
          value={stats.completed.toLocaleString()}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <MetricCard
          title="Total Revenue"
          value={`£${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
        <MetricCard
          title="Updated Monthly"
          value={stats.thisMonth.toLocaleString()}
          icon={<Calendar className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
        />
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {jobs?.map((job) => (
          <Card key={job.ID} className="border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden bg-card/60 backdrop-blur-sm">
            <div className="h-1 bg-[#0b5cff] opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="p-5 pb-2">
              <div className="flex justify-between items-start mb-2">
                <div className="px-2 py-1 rounded bg-[#0b5cff]/5 border border-[#0b5cff]/10 text-[#0b5cff] text-[10px] font-bold uppercase tracking-wider">
                  #{job.ID}
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight",
                  job.Status.Name === "Completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                )}>
                  {job.Status.Name}
                </div>
              </div>
              <CardTitle className="text-lg font-bold group-hover:text-[#0b5cff] transition-colors truncate">
                {job.Name || "Unnamed Job"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Customer</p>
                    <p className="text-sm font-semibold truncate leading-none">{job.Customer.Name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Site</p>
                    <p className="text-sm font-semibold truncate leading-none">{job.Site.Name}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Total Value</p>
                  <p className="text-lg font-bold text-foreground">£{job.Total.IncTax.toLocaleString()}</p>
                </div>
                <Button variant="ghost" className="text-[#0b5cff] hover:text-[#0b5cff] hover:bg-[#0b5cff]/5 text-[11px] font-bold uppercase p-0 h-auto tracking-widest">
                  View Details →
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!jobs || jobs.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 bg-card/40 border border-dashed border-border rounded-3xl">
          <Briefcase className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-1">No Jobs Found</h3>
          <p className="text-sm text-muted-foreground">Successfully connected, but no job data was returned from simPRO.</p>
        </div>
      )}
    </div>
  );
}
