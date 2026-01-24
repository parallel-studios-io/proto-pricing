"use client";

import { cn } from "@/lib/utils";

interface InsightCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function InsightCard({
  label,
  value,
  subValue,
  trend,
  icon,
  className,
}: InsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-6",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-secondary mb-1">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subValue && <p className="text-sm text-muted mt-1">{subValue}</p>}
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1">
          <span
            className={cn(
              "text-sm font-medium",
              trend.isPositive ? "text-green-500" : "text-red-500"
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-sm text-muted">vs last period</span>
        </div>
      )}
    </div>
  );
}
