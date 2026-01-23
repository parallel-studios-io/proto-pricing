"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout";
import {
  MetricCard,
  ConcentrationAlert,
  SegmentGrid,
  QuickActions,
} from "@/components/overview";
import { generateMyParcelData, type GeneratedMyParcelData } from "@/lib/generators/myparcel";
import type { Segment } from "@/types";
import { Loader2 } from "lucide-react";

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  }
  return `€${value.toFixed(0)}`;
}

// Convert generated segments to the UI Segment type
function convertSegments(data: GeneratedMyParcelData): Segment[] {
  return data.segments.map((seg) => ({
    id: seg.id,
    name: seg.name,
    description: seg.value_drivers.join(", "),
    customerCount: seg.customer_count,
    revenue: Math.round(seg.revenue_share * data.summary.totalArr),
    revenueShare: seg.revenue_share * 100,
    avgMrr: Math.round((seg.revenue_share * data.summary.totalMrr) / seg.customer_count),
    avgLtv: Math.round(seg.avg_ltv),
    medianLtv: Math.round(seg.ltv_distribution.p50),
    retentionRate: seg.retention_curve[11] || 0.9,
    churnRate: (1 - (seg.retention_curve[0] || 0.95)) * 100,
    expansionRate: seg.expansion_rate * 100,
    criteria: {
      companySize: seg.criteria.size ? [seg.criteria.size] : undefined,
    },
  }));
}

export default function OverviewPage() {
  const [data, setData] = useState<GeneratedMyParcelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  useEffect(() => {
    // Generate fresh data on mount
    const generatedData = generateMyParcelData();
    setData(generatedData);
    setLastSynced(new Date());
    setLoading(false);
  }, []);

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      const generatedData = generateMyParcelData();
      setData(generatedData);
      setLastSynced(new Date());
      setLoading(false);
    }, 500);
  };

  if (loading || !data) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Overview" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  const segments = convertSegments(data);

  // Calculate concentration metrics
  const sortedSegments = [...data.segments].sort(
    (a, b) => b.revenue_share - a.revenue_share
  );
  const topSegmentShare = sortedSegments[0]?.revenue_share || 0;
  const bottomHalfShare =
    sortedSegments
      .slice(Math.ceil(sortedSegments.length / 2))
      .reduce((sum, s) => sum + s.revenue_share, 0) * 100;

  // Estimate top customer concentration (enterprise segment is ~2.5% of customers with ~80% revenue)
  const enterpriseSegment = data.segments.find((s) => s.id === "enterprise");
  const customerShareTop = enterpriseSegment
    ? (enterpriseSegment.customer_count / data.summary.totalCustomers) * 100
    : 12;

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Overview"
        subtitle={`Last synced: ${lastSynced.toLocaleTimeString()}`}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard
              label="Total MRR"
              value={formatCurrency(data.summary.totalMrr)}
              trend={{ value: 3.2, isPositive: true }}
            />
            <MetricCard
              label="Customers"
              value={data.summary.totalCustomers.toLocaleString()}
            />
            <MetricCard
              label="NRR"
              value={`${data.summary.nrr}%`}
              trend={{ value: 2, isPositive: true }}
            />
            <MetricCard
              label="Avg LTV"
              value={formatCurrency(data.summary.avgLtv)}
            />
          </div>

          {/* Concentration Alert */}
          <ConcentrationAlert
            topPercentCustomers={Math.round(customerShareTop)}
            topPercentRevenue={Math.round(topSegmentShare * 100)}
            bottomPercentCustomers={50}
            bottomPercentRevenue={Math.round(bottomHalfShare * 10) / 10}
          />

          {/* Segments */}
          <SegmentGrid
            segments={segments}
            onSegmentClick={(segment) => {
              console.log("Clicked segment:", segment.name);
            }}
          />

          {/* Quick Actions */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
            <QuickActions onRefresh={refreshData} />
          </div>
        </div>
      </div>
    </div>
  );
}
