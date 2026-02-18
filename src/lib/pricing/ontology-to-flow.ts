/**
 * Ontology-to-Flow Mapper
 *
 * Loads pricing analysis data from the ontology layer instead of re-deriving
 * it from raw DB tables. Also pulls competitors, market context, and strategic
 * positioning so the flow engine has the full strategic picture.
 *
 * Replaces real-data-adapter.ts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DetectedSegment,
  UnitEconomics,
  PricingStructure,
  PricingTier as FlowPricingTier,
  ValueMetric as FlowValueMetric,
  ConcentrationMetrics,
  PriceSensitivityModel,
  CompetitiveContext,
} from "@/types/pricing-flow";
import type {
  Segment,
  PricingTier as DbPricingTier,
  ValueMetric as DbValueMetric,
  EconomicsSnapshot,
  Competitor,
} from "@/types/database";

import { getSegments } from "@/lib/db/ontology/segments";
import { getPricingTiers } from "@/lib/db/ontology/tiers";
import { getValueMetrics } from "@/lib/db/ontology/value-metrics";
import { getLatestEconomicsSnapshot } from "@/lib/db/ontology/economics";
import { getCompetitors } from "@/lib/db/ontology/competitors";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface OntologyDataResult {
  segments: DetectedSegment[];
  economics: UnitEconomics;
  pricingStructure: PricingStructure;
  competitiveContext: CompetitiveContext;
  summary: {
    totalCustomers: number;
    totalMrr: number;
    totalArr: number;
    nrr: number;
    avgLtv: number;
  };
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export async function loadPricingDataFromOntology(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OntologyDataResult | null> {
  try {
    // Fetch everything from the ontology in parallel
    const [dbSegments, dbTiers, dbMetrics, snapshot, dbCompetitors] =
      await Promise.all([
        getSegments(supabase, organizationId, { activeOnly: true }),
        getPricingTiers(supabase, organizationId, { activeOnly: true }),
        getValueMetrics(supabase, organizationId, { activeOnly: true }),
        getLatestEconomicsSnapshot(supabase, organizationId),
        getCompetitors(supabase, organizationId),
      ]);

    if (dbSegments.length === 0) {
      console.warn("No segments found — pricing analysis requires segment data");
      return null;
    }

    // Map segments
    const segments = mapSegments(dbSegments);

    // Map pricing structure
    const pricingStructure = mapPricingStructure(dbTiers, dbMetrics);

    // Map economics
    const economics = mapEconomics(snapshot, segments, dbTiers);

    // Map competitive context
    const competitiveContext = mapCompetitiveContext(dbCompetitors, snapshot);

    // Build summary from snapshot or derive from segments
    const totalCustomers = snapshot?.total_customers ?? segments.reduce((s, seg) => s + seg.customer_count, 0);
    const totalMrr = snapshot?.total_mrr ?? 0;
    const totalArr = snapshot?.total_arr ?? totalMrr * 12;
    const avgLtv = totalCustomers > 0
      ? segments.reduce((s, seg) => s + seg.avg_ltv * seg.customer_count, 0) / totalCustomers
      : 0;

    return {
      segments,
      economics,
      pricingStructure,
      competitiveContext,
      summary: {
        totalCustomers,
        totalMrr,
        totalArr,
        nrr: snapshot?.net_revenue_retention ?? 112,
        avgLtv: snapshot ? (totalCustomers > 0 ? avgLtv : 0) : avgLtv,
      },
    };
  } catch (error) {
    console.error("Failed to load pricing data from ontology:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapSegments(dbSegments: Segment[]): DetectedSegment[] {
  const totalRevenue = dbSegments.reduce((s, seg) => s + (seg.total_revenue || 0), 0);

  return dbSegments.map((seg) => ({
    id: seg.id,
    name: seg.name,
    criteria: {
      mrr_range: seg.criteria?.mrr_range,
      behavior: seg.criteria?.behavior,
    },
    customer_count: seg.customer_count,
    revenue_share: totalRevenue > 0 ? (seg.total_revenue || 0) / totalRevenue : seg.revenue_share || 0,
    avg_ltv: seg.avg_ltv || 0,
    ltv_distribution: {
      p25: seg.ltv_p25 ?? Math.round((seg.avg_ltv || 0) * 0.5),
      p50: seg.ltv_p50 ?? Math.round(seg.avg_ltv || 0),
      p75: seg.ltv_p75 ?? Math.round((seg.avg_ltv || 0) * 1.5),
      p90: seg.ltv_p90 ?? Math.round((seg.avg_ltv || 0) * 2),
    },
    retention_curve: seg.retention_curve?.length > 0
      ? seg.retention_curve
      : [1, 0.95, 0.90, 0.85, 0.80, 0.75, 0.72, 0.70, 0.68, 0.66, 0.64, 0.62],
    expansion_rate: seg.expansion_rate || 0.1,
    value_drivers: seg.value_drivers?.length > 0
      ? seg.value_drivers
      : ["Volume", "Reliability", "Integration"],
  }));
}

function mapPricingStructure(
  dbTiers: DbPricingTier[],
  dbMetrics: DbValueMetric[]
): PricingStructure {
  const tiers: FlowPricingTier[] = dbTiers.length > 0
    ? dbTiers.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price_monthly,
        billing_interval: "monthly" as const,
        value_metric_limits: t.value_metric_limits || {},
        features: t.features || [],
        customer_count: t.customer_count || 0,
        revenue: t.total_revenue || 0,
        revenue_share: t.revenue_share || 0,
        position: t.position,
      }))
    : getDefaultTiers();

  const valueMetrics: FlowValueMetric[] = dbMetrics.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.metric_type,
    correlation_to_expansion: m.correlation_to_expansion ?? 0.5,
    measurement_method: m.description || m.measurement_method || "Tracked via platform",
    examples: m.examples || [],
  }));

  return {
    model_type: "hybrid",
    value_metrics: valueMetrics,
    tiers,
    discount_patterns: [
      { type: "annual", avg_discount_percent: 15, frequency: 0.3, segment_correlation: ["enterprise"] },
      { type: "volume", avg_discount_percent: 10, frequency: 0.5, segment_correlation: ["enterprise", "growing"] },
    ],
  };
}

function mapEconomics(
  snapshot: EconomicsSnapshot | null,
  segments: DetectedSegment[],
  dbTiers: DbPricingTier[]
): UnitEconomics {
  // ARPU and LTV by segment from snapshot's segment_economics
  const arpuBySegment: Record<string, number> = {};
  const ltvBySegment: Record<string, number> = {};

  if (snapshot?.segment_economics) {
    for (const se of snapshot.segment_economics) {
      arpuBySegment[se.segment_id] = se.arpu;
      ltvBySegment[se.segment_id] = se.ltv;
    }
  }

  // Fill in any segments missing from the snapshot
  const totalArr = snapshot?.total_arr ?? 0;
  for (const seg of segments) {
    if (!(seg.id in arpuBySegment)) {
      arpuBySegment[seg.id] = seg.customer_count > 0
        ? (seg.revenue_share * totalArr) / 12 / seg.customer_count
        : 0;
    }
    if (!(seg.id in ltvBySegment)) {
      ltvBySegment[seg.id] = seg.avg_ltv;
    }
  }

  // Churn by tier (estimated from position — lower tiers churn more)
  const churnByTier: Record<string, number> = {};
  const totalTiers = dbTiers.length || 1;
  for (const tier of dbTiers) {
    const positionRatio = tier.position / totalTiers;
    churnByTier[tier.name] = Math.max(0.01, 0.08 - positionRatio * 0.07);
  }

  // Concentration metrics
  const top10PctShare = snapshot?.top_10_pct_revenue_share
    ?? (segments.length > 0 ? [...segments].sort((a, b) => b.revenue_share - a.revenue_share)[0].revenue_share : 0);

  const concentration: ConcentrationMetrics = {
    top_10_percent_revenue_share: top10PctShare,
    top_customer_revenue_share: snapshot?.top_customer_revenue_share ?? top10PctShare * 0.3,
    hhi_index: snapshot?.hhi_index
      ? Math.round(snapshot.hhi_index)
      : Math.round(segments.reduce((sum, s) => sum + Math.pow(s.revenue_share * 100, 2), 0)),
    segment_shares: Object.fromEntries(segments.map((s) => [s.id, s.revenue_share])),
    risk_level: snapshot?.concentration_risk_level
      ?? (top10PctShare > 0.7 ? "critical" : top10PctShare > 0.5 ? "high" : top10PctShare > 0.3 ? "moderate" : "low"),
    risk_description: snapshot?.concentration_description
      ?? (top10PctShare > 0.5
        ? `Top segment accounts for ${Math.round(top10PctShare * 100)}% of revenue — high concentration risk`
        : "Revenue is reasonably distributed across segments"),
  };

  // Price sensitivity model
  const sensitivityModel: PriceSensitivityModel = snapshot?.price_sensitivity_model &&
    Object.keys(snapshot.price_sensitivity_model).length > 0
    ? {
        segment_elasticity: Object.fromEntries(
          Object.entries(snapshot.price_sensitivity_model).map(([k, v]) => [k, v.elasticity])
        ),
        churn_per_percent_increase: Object.fromEntries(
          Object.entries(snapshot.price_sensitivity_model).map(([k, v]) => [k, v.churn_per_pct_increase])
        ),
        optimal_price_ranges: Object.fromEntries(
          Object.entries(snapshot.price_sensitivity_model)
            .filter(([, v]) => v.optimal_price_range)
            .map(([k, v]) => [k, v.optimal_price_range!])
        ),
      }
    : {
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

function mapCompetitiveContext(
  dbCompetitors: Competitor[],
  snapshot: EconomicsSnapshot | null
): CompetitiveContext {
  // Map competitor DB records
  const competitors = dbCompetitors.map((c) => ({
    name: c.name,
    positioning: c.positioning ?? undefined,
    pricing_model: c.pricing_model ?? undefined,
    price_range: c.price_range ?? undefined,
    key_differentiators: c.key_differentiators || [],
    estimated_market_share: c.estimated_market_share ?? undefined,
  }));

  // Market context from economics snapshot JSONB
  let market: CompetitiveContext["market"] = null;
  if (snapshot?.market_context) {
    const mc = snapshot.market_context as Record<string, unknown>;
    if (mc.market_category) {
      market = {
        category: String(mc.market_category),
        tam_estimate: String(mc.tam_estimate || ""),
        growth_rate: String(mc.growth_rate || ""),
        key_trends: Array.isArray(mc.key_trends) ? mc.key_trends.map(String) : [],
        buying_factors: Array.isArray(mc.buying_factors) ? mc.buying_factors.map(String) : [],
      };
    }
  }

  // Strategic positioning from economics snapshot JSONB
  let positioning: CompetitiveContext["positioning"] = null;
  if (snapshot?.strategic_positioning) {
    const sp = snapshot.strategic_positioning as Record<string, unknown>;
    if (sp.value_proposition) {
      positioning = {
        value_proposition: String(sp.value_proposition),
        target_segments: Array.isArray(sp.target_segments) ? sp.target_segments.map(String) : [],
        key_advantages: Array.isArray(sp.key_advantages) ? sp.key_advantages.map(String) : [],
        key_risks: Array.isArray(sp.key_risks) ? sp.key_risks.map(String) : [],
        pricing_philosophy: String(sp.pricing_philosophy || ""),
      };
    }
  }

  return { competitors, market, positioning };
}

// ---------------------------------------------------------------------------
// Fallback tiers (same as old adapter)
// ---------------------------------------------------------------------------

function getDefaultTiers(): FlowPricingTier[] {
  return [
    { id: "free", name: "Free", price: 0, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.02, position: 1 },
    { id: "starter", name: "Starter", price: 29, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.15, position: 2 },
    { id: "pro", name: "Pro", price: 99, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.35, position: 3 },
    { id: "enterprise", name: "Enterprise", price: 299, billing_interval: "monthly", value_metric_limits: {}, features: [], customer_count: 0, revenue: 0, revenue_share: 0.48, position: 4 },
  ];
}
