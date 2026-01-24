"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout";
import {
  MetricCard,
  ConcentrationAlert,
  SegmentGrid,
  QuickActions,
} from "@/components/overview";
import type { Segment } from "@/types";
import { Loader2, AlertCircle, Database } from "lucide-react";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  }
  return `€${value.toFixed(0)}`;
}

interface AnalyticsData {
  segments: Segment[];
  totalMrr: number;
  totalCustomers: number;
  nrr: number;
  avgLtv: number;
  topSegmentShare: number;
  enterpriseCustomerShare: number;
  bottomHalfShare: number;
}

interface DatabaseSegment {
  id: string;
  name: string;
  description: string | null;
  customer_count: number;
  total_revenue: number | null;
  avg_mrr: number | null;
  avg_ltv: number | null;
  median_ltv: number | null;
  retention_rate: number | null;
  churn_rate: number | null;
  expansion_rate: number | null;
  liveCustomerCount?: number;
}

interface EconomicsSnapshot {
  total_mrr: number;
  total_arr: number;
  total_customers: number;
  active_customers: number;
  net_revenue_retention: number;
  gross_revenue_retention: number;
  avg_ltv: number;
  avg_mrr: number;
}

export default function OverviewPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [needsSeed, setNeedsSeed] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const orgId = DEMO_ORGANIZATION_ID;

      // Fetch segments and economics data in parallel
      const [segmentsRes, economicsRes] = await Promise.all([
        fetch(`/api/analytics/segments?organizationId=${orgId}`),
        fetch(`/api/analytics/economics?organizationId=${orgId}`),
      ]);

      const segmentsData = await segmentsRes.json();
      const economicsData = await economicsRes.json();

      if (segmentsRes.status !== 200 || economicsRes.status !== 200) {
        throw new Error(segmentsData.error || economicsData.error || "Failed to fetch data");
      }

      const dbSegments: DatabaseSegment[] = segmentsData.segments || [];
      const snapshot: EconomicsSnapshot | null = economicsData.snapshot;
      const mrrBySegment: Record<string, { mrr: number; count: number }> = economicsData.mrrBySegment || {};

      // Check if we have data
      if (dbSegments.length === 0 && !snapshot) {
        setNeedsSeed(true);
        setLoading(false);
        return;
      }

      setNeedsSeed(false);

      // Calculate totals from mrrBySegment if no snapshot
      const totalMrr = snapshot?.total_mrr ||
        Object.values(mrrBySegment).reduce((sum, s) => sum + s.mrr, 0);
      const totalCustomers = snapshot?.active_customers ||
        segmentsData.totalCustomers ||
        Object.values(mrrBySegment).reduce((sum, s) => sum + s.count, 0);

      // Convert database segments to UI format
      const segments: Segment[] = dbSegments.map((seg) => {
        const segmentMrr = mrrBySegment[seg.name]?.mrr || 0;
        const segmentCount = seg.liveCustomerCount || seg.customer_count || 0;
        const revenue = Number(seg.total_revenue) || segmentMrr * 12;
        const revenueShare = totalMrr > 0 ? (segmentMrr / totalMrr) * 100 : 0;

        return {
          id: seg.id,
          name: seg.name,
          description: seg.description || "",
          customerCount: segmentCount,
          revenue: Math.round(revenue),
          revenueShare: Math.round(revenueShare * 10) / 10,
          avgMrr: Math.round(Number(seg.avg_mrr) || (segmentCount > 0 ? segmentMrr / segmentCount : 0)),
          avgLtv: Math.round(Number(seg.avg_ltv) || 0),
          medianLtv: Math.round(Number(seg.median_ltv) || 0),
          retentionRate: Number(seg.retention_rate) || 0.9,
          churnRate: Number(seg.churn_rate) || 5,
          expansionRate: Number(seg.expansion_rate) || 10,
          criteria: {},
        };
      });

      // Calculate concentration metrics
      const sortedSegments = [...segments].sort((a, b) => b.revenueShare - a.revenueShare);
      const topSegmentShare = sortedSegments[0]?.revenueShare || 0;
      const bottomHalfShare = sortedSegments
        .slice(Math.ceil(sortedSegments.length / 2))
        .reduce((sum, s) => sum + s.revenueShare, 0);

      // Find enterprise segment for customer concentration
      const enterpriseSegment = segments.find(
        (s) => s.name.toLowerCase().includes("enterprise") || s.name.toLowerCase().includes("large")
      );
      const enterpriseCustomerShare = enterpriseSegment && totalCustomers > 0
        ? (enterpriseSegment.customerCount / totalCustomers) * 100
        : sortedSegments[0] && totalCustomers > 0
          ? (sortedSegments[0].customerCount / totalCustomers) * 100
          : 10;

      setData({
        segments,
        totalMrr,
        totalCustomers,
        nrr: snapshot?.net_revenue_retention || 105,
        avgLtv: snapshot?.avg_ltv || (segments.length > 0
          ? segments.reduce((sum, s) => sum + s.avgLtv, 0) / segments.length
          : 0),
        topSegmentShare,
        enterpriseCustomerShare,
        bottomHalfShare,
      });

      setLastSynced(new Date());
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setError(null);

    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: DEMO_ORGANIZATION_ID,
          clearExisting: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to seed database");
      }

      // Refresh data after seeding
      await fetchData();
    } catch (err) {
      console.error("Error seeding database:", err);
      setError(err instanceof Error ? err.message : "Failed to seed database");
    } finally {
      setSeeding(false);
    }
  };

  const refreshData = () => {
    fetchData();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Overview" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  // Needs seed state
  if (needsSeed) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Overview" subtitle="Setup required" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Database className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h2 className="text-xl font-semibold mb-2">No Data Found</h2>
            <p className="text-secondary mb-6">
              Your database is empty. Seed it with demo data to get started.
            </p>
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Seeding Database...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Seed Demo Data
                </>
              )}
            </button>
            {error && (
              <p className="mt-4 text-red-500 text-sm">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Overview" subtitle="Error loading data" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
            <p className="text-secondary mb-4">{error}</p>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Overview"
        subtitle={lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : ""}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard
              label="Total MRR"
              value={formatCurrency(data.totalMrr)}
              trend={{ value: 3.2, isPositive: true }}
            />
            <MetricCard
              label="Customers"
              value={data.totalCustomers.toLocaleString()}
            />
            <MetricCard
              label="NRR"
              value={`${Math.round(data.nrr)}%`}
              trend={{ value: 2, isPositive: true }}
            />
            <MetricCard
              label="Avg LTV"
              value={formatCurrency(data.avgLtv)}
            />
          </div>

          {/* Concentration Alert */}
          <ConcentrationAlert
            topPercentCustomers={Math.round(data.enterpriseCustomerShare)}
            topPercentRevenue={Math.round(data.topSegmentShare)}
            bottomPercentCustomers={50}
            bottomPercentRevenue={Math.round(data.bottomHalfShare * 10) / 10}
          />

          {/* Segments */}
          <SegmentGrid
            segments={data.segments}
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
