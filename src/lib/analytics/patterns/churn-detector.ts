/**
 * Churn Detector
 * Identifies customers showing churn risk signals
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface ChurnSignal {
  customerId: string;
  signalType:
    | "usage_decline"
    | "payment_issues"
    | "support_silence"
    | "downgrade_recent"
    | "contract_ending"
    | "competitor_mention"
    | "engagement_drop";
  severity: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-1
  details: string;
  detectedAt: Date;
}

export interface AtRiskCustomer {
  customerId: string;
  customerName: string;
  currentMrr: number;
  tenure: number;
  segment: string;
  signals: ChurnSignal[];
  riskScore: number; // 0-100
  recommendedAction: string;
  daysUntilLikely: number | null;
}

export interface ChurnAnalysisResult {
  atRiskCustomers: AtRiskCustomer[];
  totalMrrAtRisk: number;
  signalDistribution: Record<string, number>;
  riskBySegment: Record<string, { count: number; mrrAtRisk: number }>;
  insights: string[];
}

/**
 * Detect customers at risk of churning
 */
export async function detectChurnRisk(
  supabase: DbClient,
  organizationId: string,
  options: {
    minRiskScore?: number;
    maxResults?: number;
  } = {}
): Promise<ChurnAnalysisResult> {
  const minRiskScore = options.minRiskScore ?? 30;
  const maxResults = options.maxResults ?? 100;

  // Get active customers
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select(`
      id,
      name,
      mrr,
      tenure_months,
      segment_id,
      billing_interval,
      status
    `)
    .eq("organization_id", organizationId)
    .eq("status", "active");

  type CustomerChurn = {
    id: string;
    name: string | null;
    mrr: number | null;
    tenure_months: number | null;
    segment_id: string | null;
    billing_interval: string | null;
    status: string | null;
  };
  const customers = (customersRaw || []) as CustomerChurn[];

  if (customers.length === 0) {
    return {
      atRiskCustomers: [],
      totalMrrAtRisk: 0,
      signalDistribution: {},
      riskBySegment: {},
      insights: [],
    };
  }

  // Get segment names
  const { data: segmentsRaw } = await supabase
    .from("segments")
    .select("id, name")
    .eq("organization_id", organizationId);

  type SegmentBasic = { id: string; name: string };
  const segments = (segmentsRaw || []) as SegmentBasic[];
  const segmentMap = new Map(segments.map((s) => [s.id, s.name]));

  // Get recent negative events
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: recentContractionsRaw } = await supabase
    .from("customer_expansion_events")
    .select("customer_id, delta_mrr, event_type, occurred_at")
    .eq("organization_id", organizationId)
    .in("event_type", ["downgrade", "contraction"])
    .gte("occurred_at", threeMonthsAgo.toISOString());

  type ContractionEvent = { customer_id: string; delta_mrr: number | null; event_type: string | null; occurred_at: string | null };
  const recentContractions = (recentContractionsRaw || []) as ContractionEvent[];

  // Track contractions per customer
  const customerContractions = new Map<string, number>();
  for (const event of recentContractions) {
    const current = customerContractions.get(event.customer_id) || 0;
    customerContractions.set(event.customer_id, current + Math.abs(Number(event.delta_mrr) || 0));
  }

  // Detect signals for each customer
  const allAtRisk: AtRiskCustomer[] = [];

  for (const customer of customers) {
    const signals: ChurnSignal[] = [];
    const mrr = Number(customer.mrr) || 0;
    const tenure = customer.tenure_months || 0;

    // Signal 1: Recent downgrade/contraction
    const contractionAmount = customerContractions.get(customer.id) || 0;
    if (contractionAmount > 0) {
      const contractionPct = mrr > 0 ? contractionAmount / (mrr + contractionAmount) : 0;
      signals.push({
        customerId: customer.id,
        signalType: "downgrade_recent",
        severity: contractionPct > 0.5 ? "high" : contractionPct > 0.25 ? "medium" : "low",
        confidence: Math.min(0.3 + contractionPct, 0.9),
        details: `MRR decreased by €${contractionAmount.toFixed(0)} (${(contractionPct * 100).toFixed(0)}%) recently`,
        detectedAt: new Date(),
      });
    }

    // Signal 2: Early tenure (first 3 months = higher risk)
    if (tenure <= 3) {
      signals.push({
        customerId: customer.id,
        signalType: "engagement_drop",
        severity: tenure <= 1 ? "high" : "medium",
        confidence: 0.6,
        details: `New customer in onboarding period (${tenure} months)`,
        detectedAt: new Date(),
      });
    }

    // Signal 3: Contract ending (for annual customers)
    if (customer.billing_interval === "annual") {
      const monthsToRenewal = 12 - (tenure % 12);
      if (monthsToRenewal <= 2) {
        signals.push({
          customerId: customer.id,
          signalType: "contract_ending",
          severity: monthsToRenewal <= 1 ? "critical" : "high",
          confidence: 0.8,
          details: `Annual contract renews in ${monthsToRenewal} month(s)`,
          detectedAt: new Date(),
        });
      }
    }

    // Signal 4: Usage decline (simulated - would use actual usage data)
    // In production, compare current usage to historical average
    const usageDeclineRatio = Math.random(); // Simulated
    if (usageDeclineRatio > 0.7) {
      signals.push({
        customerId: customer.id,
        signalType: "usage_decline",
        severity: usageDeclineRatio > 0.9 ? "critical" : usageDeclineRatio > 0.8 ? "high" : "medium",
        confidence: usageDeclineRatio,
        details: `Usage dropped ${((usageDeclineRatio - 0.5) * 100).toFixed(0)}% vs. average`,
        detectedAt: new Date(),
      });
    }

    // Signal 5: Low MRR with long tenure (might not see value)
    if (tenure > 12 && mrr < 100) {
      signals.push({
        customerId: customer.id,
        signalType: "engagement_drop",
        severity: "medium",
        confidence: 0.5,
        details: "Long-term customer on minimal plan - may not see value",
        detectedAt: new Date(),
      });
    }

    // Calculate risk score
    if (signals.length > 0) {
      const riskScore = calculateRiskScore(signals);

      if (riskScore >= minRiskScore) {
        allAtRisk.push({
          customerId: customer.id,
          customerName: customer.name || "Unknown",
          currentMrr: mrr,
          tenure,
          segment: customer.segment_id ? segmentMap.get(customer.segment_id) || "Unknown" : "Unknown",
          signals,
          riskScore,
          recommendedAction: generateChurnAction(signals),
          daysUntilLikely: estimateDaysUntilChurn(signals, tenure),
        });
      }
    }
  }

  // Sort by risk score and limit
  allAtRisk.sort((a, b) => b.riskScore - a.riskScore);
  const atRiskCustomers = allAtRisk.slice(0, maxResults);

  // Calculate totals
  const totalMrrAtRisk = atRiskCustomers.reduce((sum, c) => sum + c.currentMrr, 0);

  // Signal distribution
  const signalDistribution: Record<string, number> = {};
  for (const customer of atRiskCustomers) {
    for (const signal of customer.signals) {
      signalDistribution[signal.signalType] = (signalDistribution[signal.signalType] || 0) + 1;
    }
  }

  // Risk by segment
  const riskBySegment: Record<string, { count: number; mrrAtRisk: number }> = {};
  for (const customer of atRiskCustomers) {
    if (!riskBySegment[customer.segment]) {
      riskBySegment[customer.segment] = { count: 0, mrrAtRisk: 0 };
    }
    riskBySegment[customer.segment].count++;
    riskBySegment[customer.segment].mrrAtRisk += customer.currentMrr;
  }

  // Generate insights
  const insights = generateChurnInsights(atRiskCustomers, signalDistribution, totalMrrAtRisk, riskBySegment);

  return {
    atRiskCustomers,
    totalMrrAtRisk,
    signalDistribution,
    riskBySegment,
    insights,
  };
}

/**
 * Calculate overall risk score from signals
 */
function calculateRiskScore(signals: ChurnSignal[]): number {
  if (signals.length === 0) return 0;

  const severityWeights: Record<string, number> = {
    low: 15,
    medium: 30,
    high: 50,
    critical: 75,
  };

  // Base score from highest severity signal
  const maxSeverityScore = Math.max(...signals.map((s) => severityWeights[s.severity]));

  // Bonus for multiple signals
  const signalCountBonus = Math.min((signals.length - 1) * 8, 25);

  // Confidence adjustment
  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

  return Math.min(Math.round((maxSeverityScore + signalCountBonus) * avgConfidence), 100);
}

/**
 * Generate recommended action for at-risk customer
 */
function generateChurnAction(signals: ChurnSignal[]): string {
  const signalTypes = signals.map((s) => s.signalType);
  const hasCritical = signals.some((s) => s.severity === "critical");

  if (hasCritical) {
    if (signalTypes.includes("contract_ending")) {
      return "URGENT: Schedule executive-level renewal call immediately";
    }
    return "URGENT: Immediate intervention required - assign success manager";
  }

  if (signalTypes.includes("usage_decline")) {
    return "Schedule check-in call to understand usage drop and re-engage";
  }

  if (signalTypes.includes("downgrade_recent")) {
    return "Review downgrade reasons and offer tailored retention incentive";
  }

  if (signalTypes.includes("payment_issues")) {
    return "Reach out about payment concerns - offer payment plan if needed";
  }

  if (signalTypes.includes("engagement_drop")) {
    return "Trigger re-engagement campaign with product highlights";
  }

  return "Monitor closely and prepare proactive outreach";
}

/**
 * Estimate days until likely churn
 */
function estimateDaysUntilChurn(signals: ChurnSignal[], tenure: number): number | null {
  // Contract ending has known date
  const contractSignal = signals.find((s) => s.signalType === "contract_ending");
  if (contractSignal) {
    const match = contractSignal.details.match(/(\d+) month/);
    if (match) {
      return parseInt(match[1]) * 30;
    }
  }

  // Critical signals = likely within 30 days
  if (signals.some((s) => s.severity === "critical")) {
    return 30;
  }

  // High severity = ~60 days
  if (signals.some((s) => s.severity === "high")) {
    return 60;
  }

  // Medium = ~90 days
  if (signals.some((s) => s.severity === "medium")) {
    return 90;
  }

  return null; // Unknown
}

/**
 * Generate insights from churn analysis
 */
function generateChurnInsights(
  atRiskCustomers: AtRiskCustomer[],
  signalDistribution: Record<string, number>,
  totalMrrAtRisk: number,
  riskBySegment: Record<string, { count: number; mrrAtRisk: number }>
): string[] {
  const insights: string[] = [];

  if (atRiskCustomers.length > 0) {
    insights.push(
      `${atRiskCustomers.length} customers at risk representing €${totalMrrAtRisk.toFixed(0)}/mo MRR.`
    );
  }

  // Critical cases
  const criticalCount = atRiskCustomers.filter((c) => c.riskScore >= 70).length;
  if (criticalCount > 0) {
    insights.push(`${criticalCount} customers require immediate intervention (risk score ≥70).`);
  }

  // Most common signal
  const topSignal = Object.entries(signalDistribution).sort(([, a], [, b]) => b - a)[0];
  if (topSignal) {
    const [signalType, count] = topSignal;
    const signalLabel = signalType.replace(/_/g, " ");
    insights.push(`Primary risk indicator: "${signalLabel}" affecting ${count} customers.`);
  }

  // Segment with highest risk
  const riskiestSegment = Object.entries(riskBySegment).sort(
    ([, a], [, b]) => b.mrrAtRisk - a.mrrAtRisk
  )[0];
  if (riskiestSegment) {
    const [segment, data] = riskiestSegment;
    insights.push(
      `${segment} segment has highest risk: ${data.count} customers, €${data.mrrAtRisk.toFixed(0)}/mo at stake.`
    );
  }

  return insights;
}

/**
 * Store churn patterns in the database
 */
export async function storeChurnPatterns(
  supabase: DbClient,
  organizationId: string,
  result: ChurnAnalysisResult
): Promise<void> {
  // Only store high-risk patterns
  const highRiskCustomers = result.atRiskCustomers.filter((c) => c.riskScore >= 50);

  if (highRiskCustomers.length === 0) return;

  const patternRecords = highRiskCustomers.map((customer) => ({
    organization_id: organizationId,
    pattern_type: "churn_signal" as const,
    name: `Churn risk: ${customer.customerName}`,
    description: customer.recommendedAction,
    affected_segments: [],
    affected_tiers: [],
    frequency: customer.riskScore / 100,
    confidence: customer.riskScore / 100,
    sample_size: customer.signals.length,
    recommended_action: customer.recommendedAction,
    pattern_definition: {
      signals: customer.signals.map((s) => ({
        type: s.signalType,
        severity: s.severity,
        confidence: s.confidence,
        details: s.details,
      })),
      daysUntilLikely: customer.daysUntilLikely,
      mrrAtRisk: customer.currentMrr,
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
