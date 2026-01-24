"use client";

import { cn } from "@/lib/utils";

interface HealthDistributionProps {
  healthy: number;
  atRisk: number;
  critical: number;
}

export function HealthDistribution({ healthy, atRisk, critical }: HealthDistributionProps) {
  const total = healthy + atRisk + critical;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="font-semibold mb-4">Customer Health Distribution</h3>

      {/* Bar visualization */}
      <div className="h-8 rounded-full overflow-hidden flex mb-4">
        <div
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${(healthy / total) * 100}%` }}
        />
        <div
          className="bg-yellow-500 transition-all duration-500"
          style={{ width: `${(atRisk / total) * 100}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${(critical / total) * 100}%` }}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-secondary">Healthy</span>
          </div>
          <p className="text-xl font-bold text-green-500">{healthy}%</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-secondary">At Risk</span>
          </div>
          <p className="text-xl font-bold text-yellow-500">{atRisk}%</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm text-secondary">Critical</span>
          </div>
          <p className="text-xl font-bold text-red-500">{critical}%</p>
        </div>
      </div>
    </div>
  );
}
