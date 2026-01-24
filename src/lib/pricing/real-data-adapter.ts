/**
 * Real Data Adapter for Pricing Analysis
 *
 * Converts Supabase data into the format expected by the pricing flow engine.
 * This allows the pricing analysis to use actual calculated data from the database
 * instead of synthetic generated data.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  DetectedSegment,
  UnitEconomics,
  PricingStructure,
  PricingTier,
  ValueMetric,
  ConcentrationMetrics,
  PriceSensitivityModel,
} from "@/types/pricing-flow";

export interface RealDataResult {
  segments: DetectedSegment[];
  economics: UnitEconomics;
  pricingStructure: PricingStructure;
  summary: {
    totalCustomers: number;
    totalMrr: number;
    totalArr: number;
    nrr: number;
    avgLtv: number;
  };
}

/**
 * Fetch real segments from the database and convert to DetectedSegment format
 */
async function fetchSegments(
  supabase: SupabaseClient,
  organizationId: string
): Promise<DetectedSegment[]> {
  const { data: segments, error } = await supabase
    .from("segments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("total_revenue", { ascending: false });

  if (error || !segments) {
    console.error("Failed to fetch segments:", error);
    return [];
  }

  // Get customer counts per segment
  const { data: customers } = await supabase
    .from("unified_customers")
    .select("segment_id, mrr, ltv")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  const customersBySegment: Record<string, { count: number; totalMrr: number; totalLtv: number }> = {};
  for (const customer of customers || []) {
    const segId = customer.segment_id || "unknown";
    if (!customersBySegment[segId]) {
      customersBySegment[segId] = { count: 0, totalMrr: 0, totalLtv: 0 };
    }
    customersBySegment[segId].count++;
    customersBySegment[segId].totalMrr += Number(customer.mrr) || 0;
    customersBySegment[segId].totalLtv += Number(customer.ltv) || 0;
  }

  const totalRevenue = segments.reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0);

  return segments.map((segment) => {
    const segmentCustomers = customersBySegment[segment.id] || { count: 0, totalMrr: 0, totalLtv: 0 };
    const avgLtv = segmentCustomers.count > 0 ? segmentCustomers.totalLtv / segmentCustomers.count : 0;

    return {
      id: segment.id,
      name: segment.name,
      criteria: {
        mrr_range: segment.mrr_range || undefined,
        behavior: segment.behavior_pattern || undefined,
      },
      customer_count: segmentCustomers.count || Number(segment.customer_count) || 0,
      revenue_share: totalRevenue > 0 ? (Number(segment.total_revenue) || 0) / totalRevenue : 0,
      avg_ltv: avgLtv || Number(segment.avg_ltv) || 0,
      ltv_distribution: {
        p25: Math.round(avgLtv * 0.5),
        p50: Math.round(avgLtv),
        p75: Math.round(avgLtv * 1.5),
        p90: Math.round(avgLtv * 2),
      },
      retention_curve: segment.retention_curve || [1, 0.95, 0.90, 0.85, 0.80, 0.75, 0.72, 0.70, 0.68, 0.66, 0.64, 0.62],
      expansion_rate: Number(segment.expansion_rate) || 0.1,
      value_drivers: segment.value_drivers || ["Volume", "Reliability", "Integration"],
    };
  });
}

/**
 * Fetch real economics data from the database
 */
async function fetchEconomics(
  supabase: SupabaseClient,
  organizationId: string,
  segments: DetectedSegment[]
): Promise<UnitEconomics> {
  // Get latest economics snapshot
  const { data: snapshot } = await supabase
    .from("economics_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  // Calculate ARPU and LTV by segment
  const arpuBySegment: Record<string, number> = {};
  const ltvBySegment: Record<string, number> = {};
  const churnByTier: Record<string, number> = {};

  for (const segment of segments) {
    arpuBySegment[segment.id] = segment.customer_count > 0
      ? (segment.revenue_share * (snapshot?.total_arr || 10000000)) / 12 / segment.customer_count
      : 0;
    ltvBySegment[segment.id] = segment.avg_ltv;
  }

  // Default tier churn rates if not available
  churnByTier["Standaard"] = 0.08;
  churnByTier["Start"] = 0.05;
  churnByTier["Plus"] = 0.03;
  churnByTier["Premium"] = 0.02;
  churnByTier["Max"] = 0.01;

  // Calculate concentration metrics
  const sortedSegments = [...segments].sort((a, b) => b.revenue_share - a.revenue_share);
  const top10PctShare = sortedSegments.length > 0 ? sortedSegments[0].revenue_share : 0;

  const concentration: ConcentrationMetrics = {
    top_10_percent_revenue_share: top10PctShare,
    top_customer_revenue_share: top10PctShare * 0.3, // Estimate
    hhi_index: Math.round(segments.reduce((sum, s) => sum + Math.pow(s.revenue_share * 100, 2), 0)),
    segment_shares: Object.fromEntries(segments.map((s) => [s.id, s.revenue_share])),
    risk_level: top10PctShare > 0.7 ? "critical" : top10PctShare > 0.5 ? "high" : top10PctShare > 0.3 ? "moderate" : "low",
    risk_description: top10PctShare > 0.5
      ? `Top segment accounts for ${Math.round(top10PctShare * 100)}% of revenue - high concentration risk`
      : "Revenue is reasonably distributed across segments",
  };

  // Price sensitivity model (estimated based on segment characteristics)
  const sensitivityModel: PriceSensitivityModel = {
    segment_elasticity: Object.fromEntries(
      segments.map((s) => [s.id, s.revenue_share > 0.5 ? -0.3 : s.revenue_share > 0.2 ? -0.5 : -0.8])
    ),
    churn_per_percent_increase: Object.fromEntries(
      segments.map((s) => [s.id, s.revenue_share > 0.5 ? 0.002 : s.revenue_share > 0.2 ? 0.005 : 0.01])
    ),
    optimal_price_ranges: Object.fromEntries(
      segments.map((s) => [s.id, [arpuBySegment[s.id] * 0.8, arpuBySegment[s.id] * 1.2] as [number, number]])
    ),
  };

  return {
    arpu_by_segment: arpuBySegment,
    ltv_by_segment: ltvBySegment,
    churn_by_tier: churnByTier,
    concentration,
    sensitivity_model: sensitivityModel,
  };
}

/**
 * Fetch real pricing structure from the database
 */
async function fetchPricingStructure(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PricingStructure> {
  // Get pricing tiers
  const { data: tiers } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("position", { ascending: true });

  // Get customer counts per tier
  const { data: customers } = await supabase
    .from("unified_customers")
    .select("plan_id, mrr")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  const customersByTier: Record<string, { count: number; revenue: number }> = {};
  for (const customer of customers || []) {
    const tierId = customer.plan_id || "unknown";
    if (!customersByTier[tierId]) {
      customersByTier[tierId] = { count: 0, revenue: 0 };
    }
    customersByTier[tierId].count++;
    customersByTier[tierId].revenue += (Number(customer.mrr) || 0) * 12;
  }

  const totalRevenue = Object.values(customersByTier).reduce((sum, t) => sum + t.revenue, 0);

  const pricingTiers: PricingTier[] = (tiers || []).map((tier, index) => ({
    id: tier.id,
    name: tier.name,
    price: Number(tier.base_price) || 0,
    billing_interval: "monthly" as const,
    value_metric_limits: tier.limits || {},
    features: tier.features || [],
    customer_count: customersByTier[tier.id]?.count || 0,
    revenue: customersByTier[tier.id]?.revenue || 0,
    revenue_share: totalRevenue > 0 ? (customersByTier[tier.id]?.revenue || 0) / totalRevenue : 0,
    position: index + 1,
  }));

  // Default value metrics for shipping platform
  const valueMetrics: ValueMetric[] = [
    {
      id: "shipping_volume",
      name: "Shipping Volume",
      type: "primary",
      correlation_to_expansion: 0.85,
      measurement_method: "Monthly label count",
      examples: ["Labels printed", "Shipments created"],
    },
    {
      id: "carrier_diversity",
      name: "Carrier Diversity",
      type: "secondary",
      correlation_to_expansion: 0.6,
      measurement_method: "Number of carriers used",
      examples: ["PostNL", "DHL", "DPD", "UPS"],
    },
  ];

  return {
    model_type: "hybrid",
    value_metrics: valueMetrics,
    tiers: pricingTiers.length > 0 ? pricingTiers : getDefaultTiers(),
    discount_patterns: [
      { type: "annual", avg_discount_percent: 15, frequency: 0.3, segment_correlation: ["enterprise"] },
      { type: "volume", avg_discount_percent: 10, frequency: 0.5, segment_correlation: ["enterprise", "growing"] },
    ],
  };
}

/**
 * Default tiers if none in database
 */
function getDefaultTiers(): PricingTier[] {
  return [
    { id: "standaard", name: "Standaard", price: 0, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.4, position: 1 },
    { id: "start", name: "Start", price: 25, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.25, position: 2 },
    { id: "plus", name: "Plus", price: 50, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.20, position: 3 },
    { id: "premium", name: "Premium", price: 75, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.12, position: 4 },
    { id: "max", name: "Max", price: 125, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.03, position: 5 },
  ];
}

/**
 * Main function to fetch all real data needed for pricing analysis
 */
export async function fetchRealPricingData(
  supabase: SupabaseClient,
  organizationId: string
): Promise<RealDataResult | null> {
  try {
    // Fetch segments first (needed for economics)
    const segments = await fetchSegments(supabase, organizationId);

    if (segments.length === 0) {
      console.warn("No segments found - pricing analysis requires segment data");
      return null;
    }

    // Fetch economics and pricing structure
    const [economics, pricingStructure] = await Promise.all([
      fetchEconomics(supabase, organizationId, segments),
      fetchPricingStructure(supabase, organizationId),
    ]);

    // Calculate summary metrics
    const totalCustomers = segments.reduce((sum, s) => sum + s.customer_count, 0);
    const totalMrr = Object.values(economics.arpu_by_segment).reduce((sum, arpu, i) => {
      return sum + arpu * segments[i]?.customer_count || 0;
    }, 0);

    // Get actual totals from economics snapshot if available
    const { data: snapshot } = await supabase
      .from("economics_snapshots")
      .select("total_mrr, total_arr, avg_ltv")
      .eq("organization_id", organizationId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    const summary = {
      totalCustomers,
      totalMrr: snapshot?.total_mrr || totalMrr,
      totalArr: snapshot?.total_arr || totalMrr * 12,
      nrr: 112, // Default - would need NRR calculation
      avgLtv: snapshot?.avg_ltv || (totalCustomers > 0 ? segments.reduce((sum, s) => sum + s.avg_ltv * s.customer_count, 0) / totalCustomers : 0),
    };

    return {
      segments,
      economics,
      pricingStructure,
      summary,
    };
  } catch (error) {
    console.error("Failed to fetch real pricing data:", error);
    return null;
  }
}
