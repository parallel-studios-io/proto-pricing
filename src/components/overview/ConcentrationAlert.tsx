"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConcentrationAlertProps {
  topPercentCustomers: number;
  topPercentRevenue: number;
  bottomPercentCustomers: number;
  bottomPercentRevenue: number;
  className?: string;
}

export function ConcentrationAlert({
  topPercentCustomers,
  topPercentRevenue,
  bottomPercentCustomers,
  bottomPercentRevenue,
  className,
}: ConcentrationAlertProps) {
  const isExtreme = topPercentRevenue > 70 && topPercentCustomers < 20;

  if (!isExtreme) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-500/30 bg-amber-500/10 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
        <div>
          <h3 className="font-semibold text-amber-500">Concentration Alert</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {topPercentRevenue}% of revenue comes from {topPercentCustomers}% of customers
          </p>
          <p className="text-sm text-muted-foreground">
            Bottom {bottomPercentCustomers}% generates only {bottomPercentRevenue}% — may be unprofitable
          </p>
        </div>
      </div>
    </div>
  );
}
