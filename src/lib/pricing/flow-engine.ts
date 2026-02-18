/**
 * Pricing Decision Flow Engine
 *
 * Implements the 7-step pricing analysis flow:
 * 1. Ingest & Normalize
 * 2. Segment Detection
 * 3. Pricing Structure Mapping
 * 4. Unit Economics Calculation
 * 5. Option Generation
 * 6. Council Evaluation
 * 7. Decision Record
 *
 * All data is pulled from the ontology — no raw DB queries or hardcoded company references.
 * The engine has full strategic context: competitors, market, and positioning.
 */

import {
  PricingFlowState,
  PricingOption,
  CouncilEvaluation,
  AgentView,
  CouncilRecommendation,
  DecisionRecord,
  DetectedSegment,
  UnitEconomics,
  PricingStructure,
  CompetitiveContext,
} from "@/types/pricing-flow";

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPricingDataFromOntology, OntologyDataResult } from "@/lib/pricing/ontology-to-flow";

// =============================================================================
// FLOW STATE MANAGEMENT
// =============================================================================

export function createFlowState(organizationId: string): PricingFlowState {
  return {
    current_step: 1,
    started_at: new Date(),
    organization_id: organizationId,
  };
}

export function advanceStep(state: PricingFlowState): PricingFlowState {
  if (state.current_step < 7) {
    return {
      ...state,
      current_step: (state.current_step + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    };
  }
  return {
    ...state,
    completed_at: new Date(),
  };
}

// =============================================================================
// STEP 1-4: DATA PROCESSING (Ontology-backed)
// =============================================================================

export async function runDataProcessingSteps(
  state: PricingFlowState,
  supabase: SupabaseClient
): Promise<PricingFlowState> {
  const data = await loadPricingDataFromOntology(supabase, state.organization_id);

  if (!data || data.segments.length === 0) {
    throw new Error("No company data found. Please set up a company first via /api/company/setup.");
  }

  return {
    ...state,
    current_step: 4,
    segments: data.segments,
    pricing_structure: data.pricingStructure,
    economics: data.economics,
  };
}

// =============================================================================
// HELPERS — dynamic segment lookup
// =============================================================================

/** Lowest-revenue segment (long-tail / hobby) */
function findLowestValueSegment(segments: DetectedSegment[]): DetectedSegment | undefined {
  return [...segments].sort((a, b) => a.revenue_share - b.revenue_share)[0];
}

/** Second-lowest-revenue segment */
function findSecondLowestValueSegment(segments: DetectedSegment[]): DetectedSegment | undefined {
  const sorted = [...segments].sort((a, b) => a.revenue_share - b.revenue_share);
  return sorted[1];
}

/** Highest-revenue segment (enterprise) */
function findHighestValueSegment(segments: DetectedSegment[]): DetectedSegment | undefined {
  return [...segments].sort((a, b) => b.revenue_share - a.revenue_share)[0];
}

/** Highest-expansion segment (growth engine) */
function findHighestExpansionSegment(segments: DetectedSegment[]): DetectedSegment | undefined {
  return [...segments].sort((a, b) => b.expansion_rate - a.expansion_rate)[0];
}

/** Format competitor pricing for descriptions */
function competitorPricingSummary(ctx: CompetitiveContext): string {
  const withPricing = ctx.competitors.filter((c) => c.price_range);
  if (withPricing.length === 0) return "";
  return withPricing.map((c) => `${c.name} (${c.price_range})`).join(", ");
}

// =============================================================================
// STEP 5: OPTION GENERATION (data-driven + competitive context)
// =============================================================================

export function generatePricingOptions(
  segments: DetectedSegment[],
  economics: UnitEconomics,
  pricingStructure: PricingStructure,
  competitiveContext?: CompetitiveContext
): PricingOption[] {
  const options: PricingOption[] = [];
  const tiers = pricingStructure.tiers;
  const lowestTier = tiers[0];
  const highestTier = tiers[tiers.length - 1];
  const midTier = tiers[Math.floor(tiers.length / 2)];
  const ctx = competitiveContext;

  const totalArr = Object.entries(economics.arpu_by_segment)
    .reduce((sum, [segId, arpu]) => {
      const seg = segments.find((s) => s.id === segId);
      return sum + arpu * (seg?.customer_count || 0) * 12;
    }, 0);

  // Build competitive pricing reference
  const compPricing = ctx ? competitorPricingSummary(ctx) : "";

  // Option 1: Platform Minimum Fee
  const bottomSegment = findLowestValueSegment(segments);
  const secondBottomSegment = findSecondLowestValueSegment(segments);

  if (bottomSegment && secondBottomSegment) {
    const affectedCustomers =
      bottomSegment.customer_count + Math.floor(secondBottomSegment.customer_count * 0.5);
    const expectedChurnRate = 0.25;
    const minimumFee = lowestTier && lowestTier.price > 0
      ? Math.round(lowestTier.price * 0.5)
      : (midTier ? Math.round(midTier.price * 0.1) : 4.95);
    const remainingCustomers = affectedCustomers * (1 - expectedChurnRate);
    const newRevenue = remainingCustomers * minimumFee * 12;

    // Competitive note for minimum fee
    const competitorsWithFree = ctx?.competitors.filter((c) =>
      c.price_range?.toLowerCase().includes("0") || c.pricing_model?.toLowerCase().includes("free")
    ) || [];
    const competitorNote = competitorsWithFree.length > 0
      ? ` Competitors with free tiers: ${competitorsWithFree.map((c) => c.name).join(", ")}.`
      : "";

    options.push({
      id: "platform-minimum",
      type: "minimum",
      description:
        `Introduce a ${minimumFee}/month platform minimum for all accounts. Addresses unprofitable long-tail while maintaining accessibility.${competitorNote}`,
      changes: [
        {
          type: "minimum",
          target: "all",
          from: `${lowestTier?.price || 0}`,
          to: `${minimumFee}/mo`,
          description: "New platform minimum fee for all accounts",
        },
        {
          type: "feature",
          target: lowestTier?.name || "Free tier",
          from: lowestTier?.name || "Free",
          to: `Starter (${minimumFee})`,
          description: `Convert ${lowestTier?.name || "Free"} tier to paid minimum`,
        },
      ],
      impact_model: {
        expected_arr_change: Math.round(newRevenue * 0.7),
        expected_arr_change_percent: totalArr > 0 ? Math.round((newRevenue * 0.7 / totalArr) * 100 * 10) / 10 : 2.5,
        optimistic_arr_change: Math.round(newRevenue),
        pessimistic_arr_change: Math.round(newRevenue * 0.4),
        expected_churn_increase: expectedChurnRate,
        time_to_full_impact_months: 6,
        confidence: 0.75,
      },
      risk_profile: "moderate",
      complexity: "low",
    });
  }

  // Option 2: Value Metric Shift
  const primaryMetric = pricingStructure.value_metrics.find((m) => m.type === "primary");
  const metricName = primaryMetric?.name || "usage";

  // Check if competitors use usage-based pricing
  const usageCompetitors = ctx?.competitors.filter((c) =>
    c.pricing_model?.toLowerCase().includes("usage") || c.pricing_model?.toLowerCase().includes("per-")
  ) || [];
  const usageNote = usageCompetitors.length > 0
    ? ` ${usageCompetitors.map((c) => c.name).join(" and ")} already use${usageCompetitors.length === 1 ? "s" : ""} usage-based models.`
    : "";

  // Market trends that support usage pricing
  const usageTrends = ctx?.market?.key_trends.filter((t) =>
    t.toLowerCase().includes("api") || t.toLowerCase().includes("usage") || t.toLowerCase().includes("consumption")
  ) || [];
  const trendNote = usageTrends.length > 0 ? ` Market trend: ${usageTrends[0]}.` : "";

  options.push({
    id: "usage-pricing",
    type: "value_metric_change",
    description:
      `Shift to pure usage-based pricing based on ${metricName}. Aligns revenue directly with customer value received.${usageNote}${trendNote}`,
    changes: [
      {
        type: "structure",
        target: "pricing_model",
        from: pricingStructure.model_type,
        to: "Pure Usage",
        description: `Remove subscription tiers, charge per ${metricName} only`,
      },
      {
        type: "price",
        target: `per_${metricName.toLowerCase().replace(/\s+/g, "_")}`,
        from: "Variable",
        to: "Flat rate",
        description: `Standardized per-${metricName.toLowerCase()} pricing across all volumes`,
      },
    ],
    impact_model: {
      expected_arr_change: Math.round(totalArr * -0.015),
      expected_arr_change_percent: -1.5,
      optimistic_arr_change: Math.round(totalArr * 0.02),
      pessimistic_arr_change: Math.round(totalArr * -0.04),
      expected_churn_increase: 0.02,
      time_to_full_impact_months: 12,
      confidence: usageCompetitors.length > 0 ? 0.6 : 0.55,
    },
    risk_profile: "high",
    complexity: "high",
  });

  // Option 3: Top-Tier Price Increase
  const topSegment = findHighestValueSegment(segments);
  if (topSegment && highestTier) {
    const priceIncreasePercent = 0.15;
    const expectedRetention = 0.95;
    const topSegmentArr = topSegment.revenue_share * totalArr;

    const topTierNewPrice = Math.round(highestTier.price * 1.2);
    const secondHighestTier = tiers.length > 1 ? tiers[tiers.length - 2] : null;
    const secondTierNewPrice = secondHighestTier ? Math.round(secondHighestTier.price * 1.2) : null;

    // Competitive price comparison for top tier
    const compNote = compPricing ? ` Competitor pricing: ${compPricing}.` : "";

    const changes: PricingOption["changes"] = [
      {
        type: "price",
        target: highestTier.name,
        from: `${highestTier.price}`,
        to: `${topTierNewPrice}`,
        description: `20% price increase on ${highestTier.name} tier`,
      },
    ];

    if (secondHighestTier && secondTierNewPrice) {
      changes.push({
        type: "price",
        target: secondHighestTier.name,
        from: `${secondHighestTier.price}`,
        to: `${secondTierNewPrice}`,
        description: `20% price increase on ${secondHighestTier.name} tier`,
      });
    }

    changes.push({
      type: "feature",
      target: topSegment.name,
      from: "Standard SLA",
      to: "99.9% SLA + Priority Support",
      description: "Enhanced service level for premium tiers",
    });

    options.push({
      id: "enterprise-premium",
      type: "price_increase",
      description:
        `15% price increase on ${topSegment.name} segment tiers with enhanced SLA and dedicated support. Captures more value from highest-value segment.${compNote}`,
      changes,
      impact_model: {
        expected_arr_change: Math.round(topSegmentArr * priceIncreasePercent * expectedRetention),
        expected_arr_change_percent: Math.round(topSegment.revenue_share * priceIncreasePercent * expectedRetention * 100 * 10) / 10,
        optimistic_arr_change: Math.round(topSegmentArr * priceIncreasePercent),
        pessimistic_arr_change: Math.round(topSegmentArr * priceIncreasePercent * 0.7),
        expected_churn_increase: 0.005,
        time_to_full_impact_months: 3,
        confidence: 0.85,
      },
      risk_profile: "low",
      complexity: "low",
    });
  }

  // Option 4: Good-Better-Best Restructure
  if (tiers.length >= 3) {
    const lowTiers = tiers.slice(0, Math.ceil(tiers.length / 3));
    const midTiers = tiers.slice(Math.ceil(tiers.length / 3), Math.ceil((tiers.length * 2) / 3));
    const highTiers = tiers.slice(Math.ceil((tiers.length * 2) / 3));

    const starterPrice = Math.round((lowTiers.reduce((s, t) => s + t.price, 0) / lowTiers.length) * 1.1);
    const growthPrice = Math.round((midTiers.reduce((s, t) => s + t.price, 0) / midTiers.length) * 1.15);
    const enterprisePrice = highTiers.length > 0
      ? Math.round((highTiers.reduce((s, t) => s + t.price, 0) / highTiers.length) * 1.3)
      : growthPrice * 3;

    // Check if competitors use tiered models
    const tieredCompetitors = ctx?.competitors.filter((c) =>
      c.pricing_model?.toLowerCase().includes("tier") || c.pricing_model?.toLowerCase().includes("subscription")
    ) || [];
    const tierNote = tieredCompetitors.length > 0
      ? ` Aligns with competitor models (${tieredCompetitors.map((c) => c.name).join(", ")}).`
      : "";

    options.push({
      id: "tier-restructure",
      type: "packaging",
      description:
        `Simplify to 3 tiers (Starter, Growth, Enterprise) with clearer value differentiation. Reduces complexity and improves upgrade path.${tierNote}`,
      changes: [
        {
          type: "tier",
          target: lowTiers.map((t) => t.name).join(" + "),
          from: `${lowTiers.length} tier${lowTiers.length > 1 ? "s" : ""}`,
          to: `Starter (${starterPrice})`,
          description: `Merge ${lowTiers.map((t) => t.name).join(" and ")} into Starter tier`,
        },
        {
          type: "tier",
          target: midTiers.map((t) => t.name).join(" + "),
          from: `${midTiers.length} tier${midTiers.length > 1 ? "s" : ""}`,
          to: `Growth (${growthPrice})`,
          description: `Merge ${midTiers.map((t) => t.name).join(" and ")} into Growth tier`,
        },
        {
          type: "tier",
          target: highTiers.map((t) => t.name).join(" + ") || "Top tier",
          from: highTiers.length > 0 ? `${highTiers[highTiers.length - 1].name} (${highTiers[highTiers.length - 1].price})` : "N/A",
          to: `Enterprise (${enterprisePrice})`,
          description: `Rebrand as Enterprise with enhanced features`,
        },
      ],
      impact_model: {
        expected_arr_change: Math.round(totalArr * 0.042),
        expected_arr_change_percent: 4.2,
        optimistic_arr_change: Math.round(totalArr * 0.075),
        pessimistic_arr_change: Math.round(totalArr * 0.015),
        expected_churn_increase: 0.03,
        time_to_full_impact_months: 9,
        confidence: 0.65,
      },
      risk_profile: "moderate",
      complexity: "medium",
    });
  }

  return options;
}

// =============================================================================
// STEP 6: COUNCIL EVALUATION (with competitive context)
// =============================================================================

export function evaluateWithCouncil(
  option: PricingOption,
  segments: DetectedSegment[],
  economics: UnitEconomics,
  competitiveContext?: CompetitiveContext
): CouncilEvaluation {
  const ctx = competitiveContext;
  const financeView = evaluateAsFinance(option, economics, ctx);
  const growthView = evaluateAsGrowth(option, segments, ctx);
  const productView = evaluateAsProduct(option, ctx);
  const strategyView = evaluateAsStrategy(option, economics, ctx);

  const recommendation = synthesizeRecommendation(
    option,
    [financeView, growthView, productView, strategyView]
  );

  return {
    option_id: option.id,
    finance_view: financeView,
    growth_view: growthView,
    product_view: productView,
    strategy_view: strategyView,
    recommendation,
  };
}

function evaluateAsFinance(
  option: PricingOption,
  economics: UnitEconomics,
  ctx?: CompetitiveContext
): AgentView {
  const impact = option.impact_model;

  let recommendation: AgentView["recommendation"] = "neutral";
  const keyPoints: string[] = [];

  if (impact.expected_arr_change_percent > 5) {
    keyPoints.push(`Strong revenue uplift of ${impact.expected_arr_change_percent}%`);
    recommendation = "support";
  } else if (impact.expected_arr_change_percent > 0) {
    keyPoints.push(`Modest revenue increase of ${impact.expected_arr_change_percent}%`);
  } else {
    keyPoints.push(`Revenue risk of ${impact.expected_arr_change_percent}%`);
    recommendation = "oppose";
  }

  if (impact.confidence > 0.8) {
    keyPoints.push("High confidence in projections based on historical data");
    if (recommendation === "support") recommendation = "strongly_support";
  } else if (impact.confidence < 0.6) {
    keyPoints.push("Low confidence - limited data for accurate modeling");
    if (recommendation === "support") recommendation = "neutral";
  }

  if (option.type === "price_increase" && economics.concentration.risk_level === "critical") {
    keyPoints.push("Warning: High revenue concentration increases risk of price increase");
  }

  if (impact.time_to_full_impact_months > 6) {
    keyPoints.push(`Extended timeline (${impact.time_to_full_impact_months}mo) delays cash flow benefit`);
  }

  // Market context for financial projections
  if (ctx?.market?.growth_rate) {
    keyPoints.push(`Market growing at ${ctx.market.growth_rate} — ${impact.expected_arr_change > 0 ? "favorable" : "challenging"} backdrop for pricing changes`);
  }

  const reasoning = `From a financial perspective, this option shows ${
    impact.expected_arr_change > 0 ? "positive" : "negative"
  } revenue impact with ${impact.confidence > 0.7 ? "reasonable" : "uncertain"} confidence. ` +
    `The ${option.risk_profile} risk profile is ${
      option.risk_profile === "low" ? "acceptable" : "a concern"
    } given current margin pressures.` +
    (ctx?.market?.tam_estimate ? ` TAM of ${ctx.market.tam_estimate} provides headroom for growth.` : "");

  return {
    agent: "CFO",
    reasoning,
    key_points: keyPoints,
    recommendation,
    impact: {
      arr_change: impact.expected_arr_change,
      margin_impact: option.type === "price_increase" ? "Positive" : "Neutral",
      cash_flow_timing: `${impact.time_to_full_impact_months} months`,
    },
    confidence: impact.confidence,
  };
}

function evaluateAsGrowth(
  option: PricingOption,
  segments: DetectedSegment[],
  ctx?: CompetitiveContext
): AgentView {
  const keyPoints: string[] = [];
  let recommendation: AgentView["recommendation"] = "neutral";

  const churnIncrease = option.impact_model.expected_churn_increase;
  if (churnIncrease > 0.1) {
    keyPoints.push(`High churn risk (${(churnIncrease * 100).toFixed(0)}%) threatens customer base`);
    recommendation = "oppose";
  } else if (churnIncrease > 0.05) {
    keyPoints.push(`Moderate churn risk (${(churnIncrease * 100).toFixed(0)}%) requires mitigation`);
  } else {
    keyPoints.push(`Low churn impact (${(churnIncrease * 100).toFixed(1)}%) is manageable`);
    recommendation = "support";
  }

  const growthSegment = findHighestExpansionSegment(segments);
  if (growthSegment && option.type === "minimum") {
    keyPoints.push(`May create friction for ${growthSegment.name} segment — the growth engine`);
  }

  // Competitor-aware growth assessment
  if (option.type === "price_increase" && ctx?.competitors.length) {
    const competitorNames = ctx.competitors.slice(0, 3).map((c) => c.name).join(", ");
    keyPoints.push(`Price increase may shift win rate vs. ${competitorNames}`);
  } else if (option.type === "price_increase") {
    keyPoints.push("Price increase may impact competitive win rate");
  }

  if (option.type === "packaging" || option.type === "value_metric_change") {
    keyPoints.push("Clearer upgrade path could improve expansion revenue");
    if (recommendation !== "oppose") recommendation = "support";
  }

  // Buying factors that affect growth
  if (ctx?.market?.buying_factors.length) {
    const pricingFactor = ctx.market.buying_factors.find((f) =>
      f.toLowerCase().includes("pric") || f.toLowerCase().includes("cost")
    );
    if (pricingFactor && option.type === "price_increase") {
      keyPoints.push(`"${pricingFactor}" is a key buying factor — price sensitivity is real`);
    }
  }

  const lowestSegment = findLowestValueSegment(segments);
  const secondLowest = findSecondLowestValueSegment(segments);
  const affectedNames = [lowestSegment?.name, secondLowest?.name].filter(Boolean).join("/");

  const competitorRef = ctx?.competitors.length
    ? ` against competitors like ${ctx.competitors[0].name}`
    : "";

  const reasoning = `From a growth perspective, the ${(churnIncrease * 100).toFixed(1)}% expected churn increase ` +
    `${churnIncrease < 0.05 ? "is acceptable" : "is concerning"}${competitorRef}. ` +
    `${option.type === "minimum" ? "The platform minimum may deter some potential customers but filters for quality." : ""}`;

  return {
    agent: "CRO",
    reasoning,
    key_points: keyPoints,
    recommendation,
    impact: {
      churn_risk: `${(churnIncrease * 100).toFixed(1)}%`,
      segment_impact: option.type === "minimum" ? affectedNames || "Low-value segments" : "All segments",
      competitive_position: option.type === "price_increase"
        ? (ctx?.competitors.length ? `At risk vs. ${ctx.competitors[0].name}` : "Weakened")
        : "Maintained",
    },
    confidence: 0.7,
  };
}

function evaluateAsProduct(option: PricingOption, ctx?: CompetitiveContext): AgentView {
  const keyPoints: string[] = [];
  let recommendation: AgentView["recommendation"] = "neutral";

  if (option.type === "value_metric_change") {
    keyPoints.push("Usage-based pricing aligns cost with value delivered");
    recommendation = "strongly_support";
  }

  if (option.type === "packaging") {
    keyPoints.push("Simplified tier structure improves upgrade path clarity");
    recommendation = "support";
  }

  if (option.type === "minimum") {
    keyPoints.push("Platform minimum creates friction for trial/evaluation");
    keyPoints.push("May need free trial period to maintain conversion");
  }

  if (option.changes.some((c) => c.type === "feature")) {
    keyPoints.push("Feature changes require product development coordination");
  }

  // Compare against competitor differentiators
  if (ctx?.competitors.length) {
    const allDifferentiators = ctx.competitors.flatMap((c) => c.key_differentiators);
    if (allDifferentiators.length > 0 && option.type === "packaging") {
      keyPoints.push(`Packaging should differentiate from competitor features: ${allDifferentiators.slice(0, 3).join(", ")}`);
    }
  }

  // Position our advantages
  if (ctx?.positioning?.key_advantages.length && option.type === "price_increase") {
    keyPoints.push(`Price increase justified by advantages: ${ctx.positioning.key_advantages.slice(0, 2).join(", ")}`);
  }

  const reasoning = `From a product perspective, ${
    option.type === "value_metric_change"
      ? "usage-based pricing best aligns with how customers perceive value"
      : option.type === "packaging"
      ? "simpler packaging reduces decision complexity"
      : "the change has moderate product implications"
  }. Customer experience impact should be carefully managed through communication.` +
    (ctx?.positioning?.value_proposition ? ` Our value proposition — "${ctx.positioning.value_proposition}" — should guide messaging.` : "");

  return {
    agent: "CPO",
    reasoning,
    key_points: keyPoints,
    recommendation,
    impact: {
      value_alignment: option.type === "value_metric_change" ? "Strong" : "Moderate",
      ux_impact: option.type === "minimum" ? "Negative friction" : "Neutral",
      upgrade_clarity: option.type === "packaging" ? "Improved" : "Unchanged",
    },
    confidence: 0.75,
  };
}

function evaluateAsStrategy(
  option: PricingOption,
  economics: UnitEconomics,
  ctx?: CompetitiveContext
): AgentView {
  const keyPoints: string[] = [];
  let recommendation: AgentView["recommendation"] = "neutral";

  if (option.type === "minimum") {
    keyPoints.push("Platform minimum signals market maturity and quality positioning");
    recommendation = "support";
  }

  if (economics.concentration.risk_level === "critical" || economics.concentration.risk_level === "high") {
    if (option.type === "price_increase") {
      keyPoints.push("Price increase on concentrated revenue base increases risk");
      recommendation = "oppose";
    } else if (option.type === "minimum") {
      keyPoints.push("Minimum fee could improve segment diversification long-term");
      recommendation = "support";
    }
  }

  // Competitive landscape assessment
  if (ctx?.competitors.length) {
    const competitorNames = ctx.competitors.map((c) => c.name).join(", ");
    if (option.type === "price_increase") {
      keyPoints.push(`Competitive landscape (${competitorNames}) limits pricing power — customers have alternatives`);
    } else if (option.type === "minimum") {
      const freemiumCompetitors = ctx.competitors.filter((c) =>
        c.pricing_model?.toLowerCase().includes("free")
      );
      if (freemiumCompetitors.length > 0) {
        keyPoints.push(`${freemiumCompetitors.map((c) => c.name).join(", ")} offer${freemiumCompetitors.length === 1 ? "s" : ""} freemium — minimum fee risks losing top-of-funnel`);
      }
    }
  }

  // Strategic positioning risks
  if (ctx?.positioning?.key_risks.length) {
    const relevantRisk = ctx.positioning.key_risks.find((r) => {
      const rl = r.toLowerCase();
      if (option.type === "price_increase") return rl.includes("concentration") || rl.includes("compet");
      if (option.type === "minimum") return rl.includes("free") || rl.includes("funnel");
      return false;
    });
    if (relevantRisk) {
      keyPoints.push(`Known risk: ${relevantRisk}`);
    }
  }

  // Pricing philosophy alignment
  if (ctx?.positioning?.pricing_philosophy) {
    const philosophy = ctx.positioning.pricing_philosophy.toLowerCase();
    if (option.type === "price_increase" && philosophy === "penetration") {
      keyPoints.push(`Price increase conflicts with current penetration pricing philosophy`);
      if (recommendation === "neutral") recommendation = "oppose";
    } else if (option.type === "minimum" && philosophy === "penetration") {
      keyPoints.push(`Platform minimum aligns with transitioning from penetration to value-based pricing`);
    }
  }

  if (option.complexity === "high") {
    keyPoints.push("Complex change is difficult to reverse — limits strategic optionality");
  } else {
    keyPoints.push("Change is reversible — maintains strategic flexibility");
  }

  const competitorClause = ctx?.competitors.length
    ? ` in a market with ${ctx.competitors.length} key competitors`
    : "";

  const reasoning = `From a strategic perspective, this option ${
    option.type === "minimum"
      ? "positions us as a premium platform while addressing profitability"
      : option.type === "price_increase"
      ? "captures more value but increases concentration risk"
      : "provides tactical improvement without major strategic shift"
  }${competitorClause}. The ${option.complexity} complexity ${
    option.complexity === "low" ? "allows quick iteration" : "requires careful execution"
  }.`;

  return {
    agent: "CSO",
    reasoning,
    key_points: keyPoints,
    recommendation,
    impact: {
      market_position: option.type === "minimum" ? "Premium" : "Unchanged",
      reversibility: option.complexity === "low" ? "High" : "Low",
      competitive_landscape: ctx?.competitors.length
        ? `${ctx.competitors.length} competitors: ${ctx.competitors.map((c) => c.name).join(", ")}`
        : "Unknown",
    },
    confidence: ctx?.competitors.length ? 0.8 : 0.7,
  };
}

function synthesizeRecommendation(
  option: PricingOption,
  views: AgentView[]
): CouncilRecommendation {
  const scoreMap: Record<AgentView["recommendation"], number> = {
    strongly_support: 2,
    support: 1,
    neutral: 0,
    oppose: -1,
    strongly_oppose: -2,
  };

  const totalScore = views.reduce((sum, v) => sum + scoreMap[v.recommendation], 0);
  const avgScore = totalScore / views.length;

  const recommendations = views.map((v) => v.recommendation);
  const hasOpposition = recommendations.some((r) => r === "oppose" || r === "strongly_oppose");
  const hasSupport = recommendations.some((r) => r === "support" || r === "strongly_support");

  let consensus: CouncilRecommendation["consensus"];
  if (avgScore >= 1.5) consensus = "strong";
  else if (avgScore >= 0.5) consensus = "moderate";
  else if (hasOpposition && hasSupport) consensus = "divided";
  else consensus = "weak";

  const reasoningChain: string[] = [];

  if (avgScore > 0) {
    reasoningChain.push(`Overall positive assessment (score: ${avgScore.toFixed(1)}/2)`);
  } else {
    reasoningChain.push(`Mixed or negative assessment (score: ${avgScore.toFixed(1)}/2)`);
  }

  for (const view of views) {
    if (view.key_points.length > 0) {
      reasoningChain.push(`${view.agent}: ${view.key_points[0]}`);
    }
  }

  const tradeOffs: string[] = [];
  if (option.impact_model.expected_churn_increase > 0.02) {
    tradeOffs.push("Revenue growth vs. customer retention");
  }
  if (option.complexity !== "low") {
    tradeOffs.push("Implementation effort vs. speed to value");
  }
  if (hasOpposition && hasSupport) {
    tradeOffs.push("Conflicting stakeholder priorities");
  }

  let summary: string;
  if (avgScore >= 1) {
    summary = `The council recommends proceeding with "${option.description.substring(0, 50)}..." ` +
      `with ${consensus} consensus. Expected ARR impact: ${option.impact_model.expected_arr_change.toLocaleString()}.`;
  } else if (avgScore >= 0) {
    summary = `The council has mixed views on this option. Consider modifications or alternative approaches ` +
      `before proceeding. Key concern: ${views.find((v) => scoreMap[v.recommendation] < 0)?.key_points[0] || "risk profile"}.`;
  } else {
    summary = `The council does not recommend this option in its current form. ` +
      `Primary concerns: ${views.filter((v) => scoreMap[v.recommendation] < 0).map((v) => v.key_points[0]).join("; ")}.`;
  }

  return {
    option_id: option.id,
    consensus,
    reasoning_chain: reasoningChain,
    trade_offs: tradeOffs,
    summary,
  };
}

// =============================================================================
// STEP 7: DECISION RECORD
// =============================================================================

export function createDecisionRecord(
  question: string,
  options: PricingOption[],
  chosenOptionId: string,
  reasoning: string,
  ontologySnapshotId: string
): DecisionRecord {
  return {
    id: `dec_${Math.random().toString(36).substring(2, 10)}`,
    timestamp: new Date(),
    question,
    options_considered: options.map((o) => o.id),
    chosen_option: chosenOptionId,
    reasoning,
    ontology_snapshot_id: ontologySnapshotId,
  };
}

// =============================================================================
// FULL FLOW EXECUTION (Ontology-backed)
// =============================================================================

export interface FlowResult {
  state: PricingFlowState;
  summary: OntologyDataResult["summary"];
  segments: DetectedSegment[];
  options: PricingOption[];
  evaluations: CouncilEvaluation[];
  recommendedOption: PricingOption | null;
  competitiveContext: CompetitiveContext;
}

export async function runFullPricingFlow(
  organizationId: string,
  supabase: SupabaseClient
): Promise<FlowResult> {
  const data = await loadPricingDataFromOntology(supabase, organizationId);

  if (!data || data.segments.length === 0) {
    throw new Error("No company data found. Please set up a company first.");
  }

  let state = createFlowState(organizationId);

  state = {
    ...state,
    current_step: 4,
    segments: data.segments,
    pricing_structure: data.pricingStructure,
    economics: data.economics,
  };

  const options = generatePricingOptions(
    data.segments,
    data.economics,
    data.pricingStructure,
    data.competitiveContext
  );

  state = {
    ...state,
    current_step: 5,
    options,
  };

  const evaluations: CouncilEvaluation[] = options.map((option) =>
    evaluateWithCouncil(option, data.segments, data.economics, data.competitiveContext)
  );

  const scoredOptions = evaluations.map((e, i) => ({
    evaluation: e,
    option: options[i],
    score:
      e.recommendation.consensus === "strong"
        ? 4
        : e.recommendation.consensus === "moderate"
        ? 3
        : e.recommendation.consensus === "weak"
        ? 1
        : 0,
  }));

  scoredOptions.sort((a, b) => b.score - a.score);
  const recommendedOption = scoredOptions[0]?.option || null;

  state = {
    ...state,
    current_step: 6,
    evaluation: evaluations[0],
  };

  return {
    state,
    summary: data.summary,
    segments: data.segments,
    options,
    evaluations,
    recommendedOption,
    competitiveContext: data.competitiveContext,
  };
}
