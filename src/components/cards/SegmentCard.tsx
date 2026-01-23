"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentCardProps {
  name: string;
  customerCount: number;
  revenue: number;
  revenueShare: number;
  churnRate: number;
  onClick?: () => void;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  }
  return `€${value.toFixed(0)}`;
}

export function SegmentCard({
  name,
  customerCount,
  revenue,
  revenueShare,
  churnRate,
  onClick,
  className,
}: SegmentCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-start rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-white/20",
        className
      )}
    >
      <div className="flex w-full items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p>{customerCount.toLocaleString()} customers</p>
        <p>
          {formatCurrency(revenue)} ({revenueShare.toFixed(1)}%)
        </p>
        <p>Churn: {churnRate.toFixed(1)}%/mo</p>
      </div>
    </button>
  );
}
