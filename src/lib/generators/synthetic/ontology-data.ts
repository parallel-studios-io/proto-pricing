/**
 * Synthetic Ontology Data Generator
 * Generates initial ontology state (segments, tiers, patterns, etc.)
 * Based on MyParcel.nl business model
 */

import { v4 as uuidv4 } from "uuid";
import type {
  Database,
  Segment,
  PricingTier,
  ValueMetric,
  Pattern,
  EconomicsSnapshot,
  SegmentCriteria,
} from "@/types/database";
import type { CompanyProfile } from "@/types/company-profile";

export interface GeneratedOntologyData {
  segments: Database["public"]["Tables"]["segments"]["Insert"][];
  tiers: Database["public"]["Tables"]["pricing_tiers"]["Insert"][];
  valueMetrics: Database["public"]["Tables"]["value_metrics"]["Insert"][];
  patterns: Database["public"]["Tables"]["patterns"]["Insert"][];
  economicsSnapshot: Database["public"]["Tables"]["economics_snapshots"]["Insert"];
}

// Segment definitions
const SEGMENT_DEFINITIONS = [
  {
    name: "Enterprise",
    description:
      "High-volume e-commerce businesses with complex shipping needs and enterprise integrations",
    criteria: {
      company_size: ["mid_market", "enterprise"],
      mrr_range: [5000, 50000],
      behavior: "high_volume",
    } as SegmentCriteria,
    customerPct: 0.025,
    revenuePct: 0.55,
    avgMrr: 15000,
    avgLtv: 180000,
    churnRate: 0.005,
    expansionRate: 0.15,
    retentionCurve: [1, 0.99, 0.98, 0.97, 0.96, 0.95, 0.94, 0.93, 0.92, 0.91, 0.9, 0.89],
    valueDrivers: ["API integrations", "Custom carrier contracts", "Dedicated support"],
  },
  {
    name: "Growing Webshops",
    description:
      "Scaling e-commerce businesses experiencing rapid growth in shipping volume",
    criteria: {
      company_size: ["smb", "mid_market"],
      mrr_range: [500, 5000],
      behavior: "growing",
    } as SegmentCriteria,
    customerPct: 0.1,
    revenuePct: 0.3,
    avgMrr: 1500,
    avgLtv: 15000,
    churnRate: 0.02,
    expansionRate: 0.25,
    retentionCurve: [1, 0.98, 0.96, 0.94, 0.92, 0.9, 0.88, 0.86, 0.84, 0.82, 0.8, 0.78],
    valueDrivers: ["Multi-carrier options", "Tracking features", "Returns handling"],
  },
  {
    name: "Small Senders",
    description:
      "Small businesses with moderate shipping needs and price sensitivity",
    criteria: {
      company_size: ["startup", "smb"],
      mrr_range: [50, 500],
      behavior: "stable",
    } as SegmentCriteria,
    customerPct: 0.375,
    revenuePct: 0.12,
    avgMrr: 150,
    avgLtv: 1200,
    churnRate: 0.04,
    expansionRate: 0.1,
    retentionCurve: [1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68, 0.64, 0.6, 0.56],
    valueDrivers: ["Competitive pricing", "Easy-to-use portal", "Basic tracking"],
  },
  {
    name: "Hobby/Dormant",
    description:
      "Occasional sellers and dormant accounts with minimal activity",
    criteria: {
      company_size: ["startup"],
      mrr_range: [0, 50],
      behavior: "declining",
    } as SegmentCriteria,
    customerPct: 0.5,
    revenuePct: 0.03,
    avgMrr: 10,
    avgLtv: 80,
    churnRate: 0.08,
    expansionRate: 0.02,
    retentionCurve: [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36, 0.28, 0.2, 0.12],
    valueDrivers: ["Free tier availability", "No commitment"],
  },
];

// Tier definitions
const TIER_DEFINITIONS = [
  {
    name: "Standaard",
    description: "Free tier for occasional senders",
    priceMonthly: 0,
    priceAnnual: 0,
    features: [
      "Up to 50 labels/month",
      "PostNL domestic shipping",
      "Basic tracking",
      "Email support",
    ],
    valueLimits: { labels: 50, carriers: 1, integrations: 0 } as Record<string, number | "unlimited">,
    position: 1,
    customerPct: 0.63,
    revenuePct: 0.015,
  },
  {
    name: "Start",
    description: "For small businesses starting to scale",
    priceMonthly: 25,
    priceAnnual: 270,
    features: [
      "Up to 500 labels/month",
      "PostNL + DHL",
      "Advanced tracking",
      "Returns portal",
      "Priority email support",
    ],
    valueLimits: { labels: 500, carriers: 2, integrations: 1 } as Record<string, number | "unlimited">,
    position: 2,
    customerPct: 0.22,
    revenuePct: 0.04,
  },
  {
    name: "Plus",
    description: "For growing webshops with regular shipping needs",
    priceMonthly: 50,
    priceAnnual: 540,
    features: [
      "Up to 2,000 labels/month",
      "All carriers",
      "API access",
      "Batch processing",
      "Phone support",
    ],
    valueLimits: { labels: 2000, carriers: "unlimited", integrations: 3 } as Record<string, number | "unlimited">,
    position: 3,
    customerPct: 0.08,
    revenuePct: 0.1,
  },
  {
    name: "Premium",
    description: "For high-volume businesses requiring advanced features",
    priceMonthly: 75,
    priceAnnual: 810,
    features: [
      "Up to 10,000 labels/month",
      "All carriers + negotiated rates",
      "Full API access",
      "Custom integrations",
      "Dedicated support",
    ],
    valueLimits: { labels: 10000, carriers: "unlimited", integrations: "unlimited" } as Record<string, number | "unlimited">,
    position: 4,
    customerPct: 0.05,
    revenuePct: 0.35,
  },
  {
    name: "Max",
    description: "Enterprise tier with unlimited capacity and premium support",
    priceMonthly: 125,
    priceAnnual: 1350,
    features: [
      "Unlimited labels",
      "All carriers + best rates",
      "Full API + webhooks",
      "Custom development",
      "24/7 dedicated support",
      "SLA guarantee",
    ],
    valueLimits: { labels: "unlimited", carriers: "unlimited", integrations: "unlimited" } as Record<string, number | "unlimited">,
    position: 5,
    customerPct: 0.02,
    revenuePct: 0.495,
  },
];

// Pattern definitions
const PATTERN_DEFINITIONS = [
  {
    type: "upgrade_trigger" as const,
    name: "Volume Threshold Reached",
    description: "Customer consistently exceeds 80% of their tier label limit",
    frequency: 0.35,
    confidence: 0.85,
    recommendedAction: "Proactive outreach with upgrade offer and ROI calculation",
    patternDefinition: {
      trigger: "label_usage > tier_limit * 0.8",
      consecutive_months: 2,
    },
  },
  {
    type: "churn_signal" as const,
    name: "Declining Usage Pattern",
    description: "Customer usage drops by 50%+ over 3 consecutive months",
    frequency: 0.12,
    confidence: 0.78,
    recommendedAction: "Customer success intervention with re-engagement campaign",
    patternDefinition: {
      trigger: "month_over_month_decline > 0.2",
      consecutive_months: 3,
    },
  },
  {
    type: "expansion_ready" as const,
    name: "Multi-Carrier Interest",
    description: "Customer starts using multiple carriers after single-carrier usage",
    frequency: 0.22,
    confidence: 0.72,
    recommendedAction: "Present tier upgrade with carrier diversity benefits",
    patternDefinition: {
      trigger: "carrier_count > previous_carrier_count",
      new_carriers: 2,
    },
  },
  {
    type: "seasonal" as const,
    name: "Q4 Volume Spike",
    description: "Significant increase in shipping volume during holiday season",
    frequency: 0.65,
    confidence: 0.92,
    recommendedAction: "Pre-season tier upgrade offers with Q4 projections",
    patternDefinition: {
      months: [10, 11, 12],
      volume_multiplier: 2.5,
    },
  },
  {
    type: "discount_sensitive" as const,
    name: "Annual Plan Responders",
    description: "Customers who convert when offered annual discount",
    frequency: 0.28,
    confidence: 0.68,
    recommendedAction: "Target with annual plan promotion at renewal",
    patternDefinition: {
      discount_threshold: 0.1,
      response_rate: 0.35,
    },
  },
];

export function generateOntologyData(
  organizationId: string,
  options?: {
    totalCustomers?: number;
    totalMrr?: number;
  }
): GeneratedOntologyData {
  const totalCustomers = options?.totalCustomers || 2700;
  const totalMrr = options?.totalMrr || 917000; // ~€917K MRR

  const segments: GeneratedOntologyData["segments"] = [];
  const segmentIds: Record<string, string> = {};

  // Generate segments
  for (const def of SEGMENT_DEFINITIONS) {
    const segmentId = uuidv4();
    segmentIds[def.name] = segmentId;

    const customerCount = Math.floor(totalCustomers * def.customerPct);
    const segmentRevenue = totalMrr * def.revenuePct;

    segments.push({
      organization_id: organizationId,
      name: def.name,
      description: def.description,
      criteria: def.criteria,
      customer_count: customerCount,
      total_revenue: segmentRevenue,
      revenue_share: def.revenuePct,
      avg_mrr: def.avgMrr,
      avg_ltv: def.avgLtv,
      median_ltv: def.avgLtv * 0.8,
      retention_rate: 1 - def.churnRate * 12,
      churn_rate: def.churnRate,
      expansion_rate: def.expansionRate,
      ltv_p25: def.avgLtv * 0.5,
      ltv_p50: def.avgLtv * 0.8,
      ltv_p75: def.avgLtv * 1.2,
      ltv_p90: def.avgLtv * 1.8,
      retention_curve: def.retentionCurve,
      value_drivers: def.valueDrivers,
      is_system_generated: true,
      is_active: true,
    });
  }

  // Generate pricing tiers
  const tiers: GeneratedOntologyData["tiers"] = [];
  const tierIds: Record<string, string> = {};

  for (const def of TIER_DEFINITIONS) {
    const tierId = uuidv4();
    tierIds[def.name] = tierId;

    const customerCount = Math.floor(totalCustomers * def.customerPct);
    const tierRevenue = totalMrr * def.revenuePct;

    tiers.push({
      organization_id: organizationId,
      name: def.name,
      description: def.description,
      price_monthly: def.priceMonthly,
      price_annual: def.priceAnnual,
      annual_discount_percent: def.priceMonthly > 0
        ? Math.round((1 - def.priceAnnual / (def.priceMonthly * 12)) * 100)
        : 0,
      features: def.features,
      value_metric_limits: def.valueLimits,
      customer_count: customerCount,
      total_revenue: tierRevenue,
      revenue_share: def.revenuePct,
      position: def.position,
      is_active: true,
    });
  }

  // Generate value metrics
  const valueMetrics: GeneratedOntologyData["valueMetrics"] = [
    {
      organization_id: organizationId,
      name: "Shipping Volume (Labels)",
      description: "Number of shipping labels created per month",
      metric_type: "primary",
      correlation_to_expansion: 0.85,
      correlation_to_retention: 0.72,
      measurement_method: "Count of labels created",
      measurement_unit: "labels/month",
      examples: ["50 labels = Standaard", "500 labels = Start", "2000+ labels = Plus or higher"],
      is_active: true,
    },
    {
      organization_id: organizationId,
      name: "Carrier Diversity",
      description: "Number of different carriers used",
      metric_type: "secondary",
      correlation_to_expansion: 0.45,
      correlation_to_retention: 0.38,
      measurement_method: "Count of unique carriers",
      measurement_unit: "carriers",
      examples: ["1 carrier = basic", "2-3 carriers = growing", "4+ carriers = enterprise"],
      is_active: true,
    },
    {
      organization_id: organizationId,
      name: "API Integration Depth",
      description: "Level of API usage and integration complexity",
      metric_type: "secondary",
      correlation_to_expansion: 0.65,
      correlation_to_retention: 0.82,
      measurement_method: "API calls per month + integration count",
      measurement_unit: "score (0-100)",
      examples: ["Portal only = 0", "Basic API = 30", "Full integration = 80+"],
      is_active: true,
    },
  ];

  // Generate patterns
  const patterns: GeneratedOntologyData["patterns"] = PATTERN_DEFINITIONS.map(
    (def) => ({
      organization_id: organizationId,
      pattern_type: def.type,
      name: def.name,
      description: def.description,
      affected_segments: Object.values(segmentIds),
      affected_tiers: Object.values(tierIds),
      frequency: def.frequency,
      confidence: def.confidence,
      sample_size: Math.floor(totalCustomers * def.frequency),
      recommended_action: def.recommendedAction,
      pattern_definition: def.patternDefinition,
      is_active: true,
      detected_at: new Date().toISOString(),
    })
  );

  // Generate economics snapshot
  const totalArr = totalMrr * 12;

  // Calculate concentration metrics
  const top10PctRevenueShare = 0.84; // Top 10% = 84% of revenue (Pareto)
  const topCustomerRevenueShare = 0.12; // Largest customer = 12%
  const hhiIndex = 850; // Moderate concentration

  const economicsSnapshot: GeneratedOntologyData["economicsSnapshot"] = {
    organization_id: organizationId,
    snapshot_date: new Date().toISOString().split("T")[0],
    total_mrr: totalMrr,
    total_arr: totalArr,
    total_customers: totalCustomers,
    net_revenue_retention: 112, // 112% NRR
    gross_revenue_retention: 95, // 95% GRR
    mrr_growth_rate: 8.5, // 8.5% monthly growth
    top_10_pct_revenue_share: top10PctRevenueShare,
    top_customer_revenue_share: topCustomerRevenueShare,
    hhi_index: hhiIndex,
    concentration_risk_level: "moderate",
    concentration_description:
      "Moderate concentration with healthy enterprise segment. Top 10% of customers generate 84% of revenue.",
    segment_economics: SEGMENT_DEFINITIONS.map((def) => ({
      segment_id: segmentIds[def.name],
      mrr: totalMrr * def.revenuePct,
      arpu: def.avgMrr,
      ltv: def.avgLtv,
      churn_rate: def.churnRate,
      expansion_rate: def.expansionRate,
    })),
    price_sensitivity_model: {
      enterprise: {
        elasticity: -0.3,
        churn_per_pct_increase: 0.001,
        optimal_price_range: [100, 200],
      },
      growing: {
        elasticity: -0.6,
        churn_per_pct_increase: 0.005,
        optimal_price_range: [50, 100],
      },
      small: {
        elasticity: -1.2,
        churn_per_pct_increase: 0.015,
        optimal_price_range: [25, 50],
      },
      hobby: {
        elasticity: -2.0,
        churn_per_pct_increase: 0.04,
        optimal_price_range: [0, 25],
      },
    },
  };

  return {
    segments,
    tiers,
    valueMetrics,
    patterns,
    economicsSnapshot,
  };
}

// =============================================================================
// PROFILE-DRIVEN GENERATOR
// =============================================================================

/**
 * Map a CompanySegmentProfile.company_size to SegmentCriteria company_size array.
 */
function mapCompanySize(
  size: string
): ("startup" | "smb" | "mid_market" | "enterprise")[] {
  switch (size) {
    case "enterprise":
      return ["mid_market", "enterprise"];
    case "mid_market":
      return ["smb", "mid_market"];
    case "smb":
      return ["startup", "smb"];
    case "startup":
      return ["startup"];
    default:
      return ["smb"];
  }
}

/**
 * Infer a behavior label from segment metrics.
 */
function inferBehavior(
  seg: CompanyProfile["segments"][number]
): "high_volume" | "growing" | "stable" | "declining" {
  if (seg.expansion_rate > 0.15) return "high_volume";
  if (seg.expansion_rate > 0.08) return "growing";
  if (seg.churn_rate > 0.05) return "declining";
  return "stable";
}

/**
 * Build a synthetic retention curve from a monthly churn rate.
 * Returns an array of 12 values (month 0 = 1.0, decaying).
 */
function buildRetentionCurve(monthlyChurn: number): number[] {
  const curve: number[] = [];
  let retained = 1;
  for (let m = 0; m < 12; m++) {
    curve.push(parseFloat(retained.toFixed(4)));
    retained *= 1 - monthlyChurn;
  }
  return curve;
}

/**
 * Generate universal pattern definitions with profile-aware descriptions.
 */
function buildProfilePatterns(
  profile: CompanyProfile,
  segmentIds: string[],
  tierIds: string[],
  totalCustomers: number,
  organizationId: string
): GeneratedOntologyData["patterns"] {
  const metric = profile.primary_value_metric;

  const defs = [
    {
      type: "upgrade_trigger" as const,
      name: "Usage Threshold Reached",
      description: `Customer consistently exceeds 80% of their tier ${metric} limit`,
      frequency: 0.35,
      confidence: 0.85,
      recommendedAction: "Proactive outreach with upgrade offer and ROI calculation",
      patternDefinition: {
        trigger: `${metric}_usage > tier_limit * 0.8`,
        consecutive_months: 2,
      },
    },
    {
      type: "churn_signal" as const,
      name: "Declining Usage Pattern",
      description: `Customer ${metric} usage drops by 50%+ over 3 consecutive months`,
      frequency: 0.12,
      confidence: 0.78,
      recommendedAction: "Customer success intervention with re-engagement campaign",
      patternDefinition: {
        trigger: "month_over_month_decline > 0.2",
        consecutive_months: 3,
      },
    },
    {
      type: "expansion_ready" as const,
      name: "Feature Adoption Signal",
      description: `Customer starts using secondary value metrics (${profile.secondary_value_metrics.join(", ")})`,
      frequency: 0.22,
      confidence: 0.72,
      recommendedAction: "Present tier upgrade with expanded feature benefits",
      patternDefinition: {
        trigger: "secondary_metric_adoption > previous",
        new_metrics: 2,
      },
    },
    {
      type: "seasonal" as const,
      name: "Q4 Volume Spike",
      description: `Significant increase in ${metric} volume during holiday / peak season`,
      frequency: 0.65,
      confidence: 0.92,
      recommendedAction: "Pre-season tier upgrade offers with Q4 projections",
      patternDefinition: {
        months: [10, 11, 12],
        volume_multiplier: 2.5,
      },
    },
    {
      type: "discount_sensitive" as const,
      name: "Annual Plan Responders",
      description: "Customers who convert when offered annual billing discount",
      frequency: 0.28,
      confidence: 0.68,
      recommendedAction: "Target with annual plan promotion at renewal",
      patternDefinition: {
        discount_threshold: 0.1,
        response_rate: 0.35,
      },
    },
  ];

  return defs.map((def) => ({
    organization_id: organizationId,
    pattern_type: def.type,
    name: def.name,
    description: def.description,
    affected_segments: segmentIds,
    affected_tiers: tierIds,
    frequency: def.frequency,
    confidence: def.confidence,
    sample_size: Math.floor(totalCustomers * def.frequency),
    recommended_action: def.recommendedAction,
    pattern_definition: def.patternDefinition,
    is_active: true,
    detected_at: new Date().toISOString(),
  }));
}

/**
 * Generate ontology data from a CompanyProfile instead of hardcoded definitions.
 * The original generateOntologyData() above is preserved for backward compatibility.
 */
export function generateOntologyDataFromProfile(
  organizationId: string,
  profile: CompanyProfile,
  options?: { totalCustomers?: number; totalMrr?: number }
): GeneratedOntologyData {
  // Calculate total MRR from profile: sum of (segment.customer_share * total_customers * segment.avg_mrr)
  const derivedTotalMrr = profile.segments.reduce(
    (sum, seg) =>
      sum + seg.customer_share * profile.total_customers * seg.avg_mrr,
    0
  );

  const totalCustomers = options?.totalCustomers || profile.total_customers;
  const totalMrr = options?.totalMrr || derivedTotalMrr;

  // ── 1. Build segments from profile.segments ────────────────────────────

  const segments: GeneratedOntologyData["segments"] = [];
  const segmentIds: Record<string, string> = {};

  for (const seg of profile.segments) {
    const segmentId = uuidv4();
    segmentIds[seg.name] = segmentId;

    const customerCount = Math.floor(totalCustomers * seg.customer_share);
    const segmentRevenue = totalMrr * seg.revenue_share;
    const avgLtv =
      seg.churn_rate > 0
        ? Math.round(seg.avg_mrr / seg.churn_rate)
        : seg.avg_mrr * 24;

    segments.push({
      organization_id: organizationId,
      name: seg.name,
      description: seg.description,
      criteria: {
        company_size: mapCompanySize(seg.company_size),
        mrr_range: [
          Math.floor(seg.avg_mrr * 0.2),
          Math.floor(seg.avg_mrr * 3),
        ],
        behavior: inferBehavior(seg),
      } as SegmentCriteria,
      customer_count: customerCount,
      total_revenue: segmentRevenue,
      revenue_share: seg.revenue_share,
      avg_mrr: seg.avg_mrr,
      avg_ltv: avgLtv,
      median_ltv: avgLtv * 0.8,
      retention_rate: 1 - seg.churn_rate * 12,
      churn_rate: seg.churn_rate,
      expansion_rate: seg.expansion_rate,
      ltv_p25: avgLtv * 0.5,
      ltv_p50: avgLtv * 0.8,
      ltv_p75: avgLtv * 1.2,
      ltv_p90: avgLtv * 1.8,
      retention_curve: buildRetentionCurve(seg.churn_rate),
      value_drivers: seg.value_drivers,
      is_system_generated: true,
      is_active: true,
    });
  }

  // ── 2. Build tiers from profile.pricing_tiers ─────────────────────────

  const tiers: GeneratedOntologyData["tiers"] = [];
  const tierIds: Record<string, string> = {};

  for (const tier of profile.pricing_tiers) {
    const tierId = uuidv4();
    tierIds[tier.name] = tierId;

    const customerCount = Math.floor(totalCustomers * tier.customer_share);
    const tierRevenue = totalMrr * tier.revenue_share;

    const priceAnnual =
      tier.price_annual ?? (tier.price_monthly > 0 ? Math.floor(tier.price_monthly * 12 * 0.9) : 0);
    const annualDiscount =
      tier.price_monthly > 0
        ? Math.round((1 - priceAnnual / (tier.price_monthly * 12)) * 100)
        : 0;

    tiers.push({
      organization_id: organizationId,
      name: tier.name,
      description: `${tier.name} tier - ${tier.features.slice(0, 2).join(", ")}`,
      price_monthly: tier.price_monthly,
      price_annual: priceAnnual,
      annual_discount_percent: annualDiscount,
      features: tier.features,
      value_metric_limits: tier.value_metric_limits,
      customer_count: customerCount,
      total_revenue: tierRevenue,
      revenue_share: tier.revenue_share,
      position: tier.position,
      is_active: true,
    });
  }

  // ── 3. Build value metrics ────────────────────────────────────────────

  const valueMetrics: GeneratedOntologyData["valueMetrics"] = [
    {
      organization_id: organizationId,
      name: profile.primary_value_metric,
      description: `Primary value metric: ${profile.primary_value_metric}`,
      metric_type: "primary",
      correlation_to_expansion: 0.85,
      correlation_to_retention: 0.72,
      measurement_method: `Count of ${profile.primary_value_metric}`,
      measurement_unit: `${profile.primary_value_metric}/month`,
      examples: profile.pricing_tiers.slice(0, 3).map((t) => {
        const limit = t.value_metric_limits[
          Object.keys(t.value_metric_limits)[0]
        ];
        return `${limit === "unlimited" ? "Unlimited" : limit} = ${t.name}`;
      }),
      is_active: true,
    },
    ...profile.secondary_value_metrics.map((metric, idx) => ({
      organization_id: organizationId,
      name: metric,
      description: `Secondary value metric: ${metric}`,
      metric_type: "secondary" as const,
      correlation_to_expansion: parseFloat((0.5 - idx * 0.1).toFixed(2)),
      correlation_to_retention: parseFloat((0.4 - idx * 0.05).toFixed(2)),
      measurement_method: `Measurement of ${metric}`,
      measurement_unit: metric,
      examples: [],
      is_active: true,
    })),
  ];

  // ── 4. Build patterns ──────────────────────────────────────────────────

  const patterns = buildProfilePatterns(
    profile,
    Object.values(segmentIds),
    Object.values(tierIds),
    totalCustomers,
    organizationId
  );

  // ── 5. Build economics snapshot ────────────────────────────────────────

  const totalArr = totalMrr * 12;

  // Concentration metrics derived from segment data
  const sortedByRevShare = [...profile.segments].sort(
    (a, b) => b.revenue_share - a.revenue_share
  );
  const topSegmentRevShare = sortedByRevShare[0]?.revenue_share || 0;
  const top10PctRevenueShare = Math.min(
    0.95,
    topSegmentRevShare + (sortedByRevShare[1]?.revenue_share || 0) * 0.5
  );

  // HHI approximation: sum of squared revenue shares (scaled to 10000)
  const hhiIndex = Math.round(
    profile.segments.reduce(
      (sum, seg) => sum + Math.pow(seg.revenue_share * 100, 2),
      0
    )
  );
  const concentrationLevel =
    hhiIndex > 2500 ? "high" : hhiIndex > 1500 ? "moderate" : "low";

  const segmentEconomics = profile.segments.map((seg) => ({
    segment_id: segmentIds[seg.name],
    mrr: totalMrr * seg.revenue_share,
    arpu: seg.avg_mrr,
    ltv:
      seg.churn_rate > 0
        ? Math.round(seg.avg_mrr / seg.churn_rate)
        : seg.avg_mrr * 24,
    churn_rate: seg.churn_rate,
    expansion_rate: seg.expansion_rate,
  }));

  // Price sensitivity model from segment data
  const priceSensitivityModel: Record<
    string,
    {
      elasticity: number;
      churn_per_pct_increase: number;
      optimal_price_range: [number, number];
    }
  > = {};
  for (const seg of profile.segments) {
    // Higher churn rate = more price sensitive
    const elasticity = parseFloat((-0.3 - seg.churn_rate * 30).toFixed(2));
    const churnPerPct = parseFloat((seg.churn_rate * 0.5).toFixed(4));
    // Find the tier range that fits this segment's avg_mrr
    const lowerPrice = Math.floor(seg.avg_mrr * 0.3);
    const upperPrice = Math.floor(seg.avg_mrr * 1.5);
    priceSensitivityModel[seg.name] = {
      elasticity,
      churn_per_pct_increase: churnPerPct,
      optimal_price_range: [lowerPrice, upperPrice],
    };
  }

  const economicsSnapshot: GeneratedOntologyData["economicsSnapshot"] = {
    organization_id: organizationId,
    snapshot_date: new Date().toISOString().split("T")[0],
    total_mrr: totalMrr,
    total_arr: totalArr,
    total_customers: totalCustomers,
    net_revenue_retention: 112,
    gross_revenue_retention: 95,
    mrr_growth_rate: 8.5,
    top_10_pct_revenue_share: top10PctRevenueShare,
    top_customer_revenue_share: topSegmentRevShare * 0.3,
    hhi_index: hhiIndex,
    concentration_risk_level: concentrationLevel,
    concentration_description: `${concentrationLevel.charAt(0).toUpperCase() + concentrationLevel.slice(1)} concentration. Top segment (${sortedByRevShare[0]?.name}) generates ${Math.round(topSegmentRevShare * 100)}% of revenue.`,
    segment_economics: segmentEconomics,
    price_sensitivity_model: priceSensitivityModel,
    ...(profile.market_context
      ? { market_context: profile.market_context as unknown as import("@/types/database").Json }
      : {}),
    ...(profile.strategic_positioning
      ? { strategic_positioning: profile.strategic_positioning as unknown as import("@/types/database").Json }
      : {}),
    ...(profile.competitors
      ? {
          competitor_summary: profile.competitors.map((c) => ({
            name: c.name,
            positioning: c.positioning,
            pricing_model: c.pricing_model,
          })) as unknown as import("@/types/database").Json,
        }
      : {}),
  };

  return {
    segments,
    tiers,
    valueMetrics,
    patterns,
    economicsSnapshot,
  };
}
