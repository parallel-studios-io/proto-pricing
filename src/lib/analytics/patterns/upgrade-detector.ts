/**
 * Upgrade Detector
 * Identifies customers showing upgrade readiness signals
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface UpgradeSignal {
  customerId: string;
  signalType:
    | "usage_limit_approaching"
    | "rapid_growth"
    | "feature_exploration"
    | "support_inquiry"
    | "tenure_milestone";
  confidence: number; // 0-1
  details: string;
  detectedAt: Date;
}

export interface UpgradeCandidate {
  customerId: string;
  customerName: string;
  currentTier: string;
  currentMrr: number;
  signals: UpgradeSignal[];
  overallScore: number; // 0-100
  recommendedAction: string;
  potentialMrrIncrease: number;
}

export interface UpgradeAnalysisResult {
  candidates: UpgradeCandidate[];
  totalPotentialMrr: number;
  signalDistribution: Record<string, number>;
  insights: string[];
}

/**
 * Detect customers ready for upgrade
 */
export async function detectUpgradeCandidates(
  supabase: DbClient,
  organizationId: string,
  options: {
    minConfidence?: number;
    maxCandidates?: number;
  } = {}
): Promise<UpgradeAnalysisResult> {
  const minConfidence = options.minConfidence ?? 0.5;
  const maxCandidates = options.maxCandidates ?? 50;

  // Get active customers with their tiers
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select(`
      id,
      name,
      mrr,
      tenure_months,
      current_tier_id,
      segment_id,
      status
    `)
    .eq("organization_id", organizationId)
    .eq("status", "active");

  type CustomerUpgrade = {
    id: string;
    name: string | null;
    mrr: number | null;
    tenure_months: number | null;
    current_tier_id: string | null;
    segment_id: string | null;
    status: string | null;
  };
  const customers = (customersRaw || []) as CustomerUpgrade[];

  if (customers.length === 0) {
    return {
      candidates: [],
      totalPotentialMrr: 0,
      signalDistribution: {},
      insights: [],
    };
  }

  // Get tier information
  const { data: tiersRaw } = await supabase
    .from("pricing_tiers")
    .select("id, name, price_monthly, position, value_metric_limits")
    .eq("organization_id", organizationId)
    .order("position", { ascending: true });

  type TierData = { id: string; name: string; price_monthly: number | null; position: number; value_metric_limits: Record<string, unknown> | null };
  const tiers = (tiersRaw || []) as TierData[];

  const tierMap = new Map(tiers.map((t) => [t.id, t]));
  const tiersByPosition = [...tiers].sort((a, b) => a.position - b.position);

  // Get recent expansion events
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: recentExpansionsRaw } = await supabase
    .from("customer_expansion_events")
    .select("customer_id, delta_mrr, occurred_at")
    .eq("organization_id", organizationId)
    .gte("occurred_at", threeMonthsAgo.toISOString());

  type ExpansionEvent = { customer_id: string; delta_mrr: number | null; occurred_at: string | null };
  const recentExpansions = (recentExpansionsRaw || []) as ExpansionEvent[];

  // Calculate growth per customer
  const customerGrowth = new Map<string, number>();
  for (const event of recentExpansions) {
    const current = customerGrowth.get(event.customer_id) || 0;
    customerGrowth.set(event.customer_id, current + (Number(event.delta_mrr) || 0));
  }

  // Detect signals for each customer
  const allCandidates: UpgradeCandidate[] = [];

  for (const customer of customers) {
    const currentTier = customer.current_tier_id ? tierMap.get(customer.current_tier_id) : null;
    const signals: UpgradeSignal[] = [];
    const mrr = Number(customer.mrr) || 0;

    // Signal 1: Rapid growth (>20% MRR increase in 3 months)
    const growth = customerGrowth.get(customer.id) || 0;
    const growthRate = mrr > 0 ? growth / mrr : 0;

    if (growthRate >= 0.2) {
      signals.push({
        customerId: customer.id,
        signalType: "rapid_growth",
        confidence: Math.min(growthRate, 0.95),
        details: `MRR grew by ${(growthRate * 100).toFixed(0)}% in the last 3 months`,
        detectedAt: new Date(),
      });
    }

    // Signal 2: Tenure milestone (6, 12, 18, 24 months)
    const tenure = customer.tenure_months || 0;
    const milestones = [6, 12, 18, 24];
    for (const milestone of milestones) {
      if (tenure >= milestone && tenure < milestone + 2) {
        signals.push({
          customerId: customer.id,
          signalType: "tenure_milestone",
          confidence: 0.6,
          details: `${milestone}-month tenure milestone reached`,
          detectedAt: new Date(),
        });
        break;
      }
    }

    // Signal 3: Usage approaching limits (simulated - would use actual usage data)
    // In production, this would check actual usage against tier limits
    if (currentTier && currentTier.value_metric_limits) {
      const limits = currentTier.value_metric_limits as Record<string, unknown>;
      if (Object.keys(limits).length > 0) {
        // Simulate usage check - in production would query actual usage
        const usageRatio = 0.5 + Math.random() * 0.5; // Simulated
        if (usageRatio > 0.8) {
          signals.push({
            customerId: customer.id,
            signalType: "usage_limit_approaching",
            confidence: usageRatio,
            details: `Approaching ${(usageRatio * 100).toFixed(0)}% of tier limits`,
            detectedAt: new Date(),
          });
        }
      }
    }

    // Signal 4: High-value on low tier
    if (currentTier && tiersByPosition.length > 1) {
      const currentPosition = currentTier.position;
      const isLowestTiers = currentPosition <= 2;
      const isHighMrr = mrr >= 500; // Threshold for "high" MRR

      if (isLowestTiers && isHighMrr) {
        signals.push({
          customerId: customer.id,
          signalType: "feature_exploration",
          confidence: 0.7,
          details: `High-value customer (€${mrr}/mo) on entry-level tier`,
          detectedAt: new Date(),
        });
      }
    }

    // Only include if has signals above threshold
    const qualifyingSignals = signals.filter((s) => s.confidence >= minConfidence);

    if (qualifyingSignals.length > 0) {
      // Calculate overall score
      const avgConfidence =
        qualifyingSignals.reduce((sum, s) => sum + s.confidence, 0) / qualifyingSignals.length;
      const signalBonus = Math.min(qualifyingSignals.length * 10, 30);
      const overallScore = Math.round(avgConfidence * 70 + signalBonus);

      // Find next tier for potential MRR increase
      let nextTier = null;
      if (currentTier) {
        nextTier = tiersByPosition.find((t) => t.position > currentTier.position);
      } else if (tiersByPosition.length > 0) {
        nextTier = tiersByPosition[0];
      }

      const potentialIncrease = nextTier
        ? Number(nextTier.price_monthly) - mrr
        : mrr * 0.5; // Estimate 50% increase

      allCandidates.push({
        customerId: customer.id,
        customerName: customer.name || "Unknown",
        currentTier: currentTier?.name || "Unknown",
        currentMrr: mrr,
        signals: qualifyingSignals,
        overallScore,
        recommendedAction: generateRecommendedAction(qualifyingSignals),
        potentialMrrIncrease: Math.max(0, potentialIncrease),
      });
    }
  }

  // Sort by score and limit
  allCandidates.sort((a, b) => b.overallScore - a.overallScore);
  const candidates = allCandidates.slice(0, maxCandidates);

  // Calculate totals and distribution
  const totalPotentialMrr = candidates.reduce((sum, c) => sum + c.potentialMrrIncrease, 0);

  const signalDistribution: Record<string, number> = {};
  for (const candidate of candidates) {
    for (const signal of candidate.signals) {
      signalDistribution[signal.signalType] = (signalDistribution[signal.signalType] || 0) + 1;
    }
  }

  // Generate insights
  const insights = generateUpgradeInsights(candidates, signalDistribution, totalPotentialMrr);

  return {
    candidates,
    totalPotentialMrr,
    signalDistribution,
    insights,
  };
}

/**
 * Generate recommended action based on signals
 */
function generateRecommendedAction(signals: UpgradeSignal[]): string {
  const signalTypes = signals.map((s) => s.signalType);

  if (signalTypes.includes("usage_limit_approaching")) {
    return "Schedule call to discuss tier upgrade before limits are hit";
  }

  if (signalTypes.includes("rapid_growth")) {
    return "Proactive outreach to discuss scaling needs and premium features";
  }

  if (signalTypes.includes("tenure_milestone")) {
    return "Send anniversary message with upgrade incentive offer";
  }

  if (signalTypes.includes("feature_exploration")) {
    return "Demo advanced features and discuss value proposition";
  }

  return "Review account and identify upgrade opportunity";
}

/**
 * Generate insights from upgrade analysis
 */
function generateUpgradeInsights(
  candidates: UpgradeCandidate[],
  signalDistribution: Record<string, number>,
  totalPotentialMrr: number
): string[] {
  const insights: string[] = [];

  if (candidates.length > 0) {
    insights.push(
      `${candidates.length} customers identified as upgrade candidates with €${totalPotentialMrr.toFixed(0)} potential MRR increase.`
    );
  }

  const topSignal = Object.entries(signalDistribution).sort(([, a], [, b]) => b - a)[0];
  if (topSignal) {
    const [signalType, count] = topSignal;
    const signalLabel = signalType.replace(/_/g, " ");
    insights.push(`Most common signal: "${signalLabel}" detected in ${count} customers.`);
  }

  const highScoreCandidates = candidates.filter((c) => c.overallScore >= 80);
  if (highScoreCandidates.length > 0) {
    insights.push(
      `${highScoreCandidates.length} high-confidence candidates (score ≥80) should be prioritized.`
    );
  }

  return insights;
}

/**
 * Store detected patterns in the database
 */
export async function storeUpgradePatterns(
  supabase: DbClient,
  organizationId: string,
  result: UpgradeAnalysisResult
): Promise<void> {
  if (result.candidates.length === 0) return;

  // Store as pattern records
  const patternRecords = result.candidates.map((candidate) => ({
    organization_id: organizationId,
    pattern_type: "expansion_ready" as const,
    name: `Upgrade candidate: ${candidate.customerName}`,
    description: candidate.recommendedAction,
    affected_segments: [],
    affected_tiers: [],
    frequency: candidate.overallScore / 100,
    confidence: candidate.overallScore / 100,
    sample_size: candidate.signals.length,
    recommended_action: candidate.recommendedAction,
    pattern_definition: {
      signals: candidate.signals.map((s) => ({
        type: s.signalType,
        confidence: s.confidence,
        details: s.details,
      })),
      potentialMrrIncrease: candidate.potentialMrrIncrease,
    },
    is_active: true,
    detected_at: new Date().toISOString(),
  }));

  // Batch insert
  const batchSize = 50;
  for (let i = 0; i < patternRecords.length; i += batchSize) {
    const batch = patternRecords.slice(i, i + batchSize);
    await supabase.from("patterns").insert(batch as never[]);
  }
}
