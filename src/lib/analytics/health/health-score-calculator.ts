/**
 * Health Score Calculator
 * Calculates composite health scores for customers
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface CustomerHealthScore {
  customerId: string;
  scoreDate: Date;
  // Component scores (0-100)
  usageScore: number;
  engagementScore: number;
  financialScore: number;
  // Composite health score (0-100)
  healthScore: number;
  // Trend
  trend: "improving" | "stable" | "declining";
  trendVelocity: number;
  // Predictive signals (0-1)
  upgradeReadiness: number;
  churnRisk: number;
  expansionPotential: number;
  // Detected patterns
  detectedPatterns: string[];
}

export interface HealthScoreAnalysisResult {
  scores: CustomerHealthScore[];
  distribution: {
    healthy: number; // 70-100
    atRisk: number; // 40-69
    critical: number; // 0-39
  };
  avgHealthScore: number;
  trendBreakdown: {
    improving: number;
    stable: number;
    declining: number;
  };
  insights: string[];
}

interface CustomerData {
  id: string;
  mrr: number;
  tenure: number;
  status: string;
  segment: string | null;
  recentExpansion: number;
  recentContraction: number;
  previousHealthScore: number | null;
}

/**
 * Calculate health scores for all active customers
 */
export async function calculateHealthScores(
  supabase: DbClient,
  organizationId: string
): Promise<HealthScoreAnalysisResult> {
  const scoreDate = new Date();

  // Get customer data
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, tenure_months, status, segment_id")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  type CustomerHealth = { id: string; mrr: number | null; tenure_months: number | null; status: string | null; segment_id: string | null };
  const customers = (customersRaw || []) as CustomerHealth[];

  if (customers.length === 0) {
    return {
      scores: [],
      distribution: { healthy: 0, atRisk: 0, critical: 0 },
      avgHealthScore: 0,
      trendBreakdown: { improving: 0, stable: 0, declining: 0 },
      insights: ["No active customers to analyze."],
    };
  }

  // Get recent expansion/contraction events
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: expansionEventsRaw } = await supabase
    .from("customer_expansion_events")
    .select("customer_id, delta_mrr")
    .eq("organization_id", organizationId)
    .gte("occurred_at", threeMonthsAgo.toISOString());

  type ExpansionEvent = { customer_id: string; delta_mrr: number | null };
  const expansionEvents = (expansionEventsRaw || []) as ExpansionEvent[];

  const expansionByCustomer = new Map<string, { expansion: number; contraction: number }>();
  for (const event of expansionEvents) {
    if (!expansionByCustomer.has(event.customer_id)) {
      expansionByCustomer.set(event.customer_id, { expansion: 0, contraction: 0 });
    }
    const data = expansionByCustomer.get(event.customer_id)!;
    const delta = Number(event.delta_mrr) || 0;
    if (delta > 0) {
      data.expansion += delta;
    } else {
      data.contraction += Math.abs(delta);
    }
  }

  // Get previous health scores for trend calculation
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: previousScoresRaw } = await supabase
    .from("customer_health_scores")
    .select("customer_id, health_score")
    .eq("organization_id", organizationId)
    .eq("score_date", yesterday.toISOString().split("T")[0]);

  type PrevScore = { customer_id: string; health_score: number | null };
  const previousScores = (previousScoresRaw || []) as PrevScore[];

  const previousScoreMap = new Map<string, number>();
  for (const score of previousScores) {
    previousScoreMap.set(score.customer_id, Number(score.health_score) || 0);
  }

  // Get segment names
  const { data: segmentsRaw } = await supabase
    .from("segments")
    .select("id, name")
    .eq("organization_id", organizationId);

  type SegmentBasic = { id: string; name: string };
  const segments = (segmentsRaw || []) as SegmentBasic[];
  const segmentMap = new Map(segments.map((s) => [s.id, s.name]));

  // Calculate scores for each customer
  const scores: CustomerHealthScore[] = [];

  for (const customer of customers) {
    const expData = expansionByCustomer.get(customer.id) || { expansion: 0, contraction: 0 };

    const customerData: CustomerData = {
      id: customer.id,
      mrr: Number(customer.mrr) || 0,
      tenure: customer.tenure_months || 0,
      status: customer.status || "active",
      segment: customer.segment_id ? segmentMap.get(customer.segment_id) || null : null,
      recentExpansion: expData.expansion,
      recentContraction: expData.contraction,
      previousHealthScore: previousScoreMap.get(customer.id) || null,
    };

    const score = calculateIndividualHealthScore(customerData);
    scores.push(score);
  }

  // Calculate distribution
  const healthy = scores.filter((s) => s.healthScore >= 70).length;
  const atRisk = scores.filter((s) => s.healthScore >= 40 && s.healthScore < 70).length;
  const critical = scores.filter((s) => s.healthScore < 40).length;

  // Calculate average
  const avgHealthScore =
    scores.reduce((sum, s) => sum + s.healthScore, 0) / scores.length;

  // Calculate trend breakdown
  const improving = scores.filter((s) => s.trend === "improving").length;
  const stable = scores.filter((s) => s.trend === "stable").length;
  const declining = scores.filter((s) => s.trend === "declining").length;

  // Generate insights
  const insights = generateHealthInsights(scores, {
    healthy,
    atRisk,
    critical,
    avgHealthScore,
    improving,
    declining,
  });

  return {
    scores,
    distribution: { healthy, atRisk, critical },
    avgHealthScore,
    trendBreakdown: { improving, stable, declining },
    insights,
  };
}

/**
 * Calculate health score for an individual customer
 */
function calculateIndividualHealthScore(data: CustomerData): CustomerHealthScore {
  // Usage Score (simulated - in production would use actual usage data)
  const usageScore = calculateUsageScore(data);

  // Engagement Score
  const engagementScore = calculateEngagementScore(data);

  // Financial Score
  const financialScore = calculateFinancialScore(data);

  // Composite health score (weighted average)
  const healthScore = Math.round(usageScore * 0.35 + engagementScore * 0.35 + financialScore * 0.3);

  // Calculate trend
  const { trend, trendVelocity } = calculateTrend(data.previousHealthScore, healthScore);

  // Predictive signals
  const upgradeReadiness = calculateUpgradeReadiness(data, healthScore);
  const churnRisk = calculateChurnRisk(data, healthScore);
  const expansionPotential = calculateExpansionPotential(data, healthScore);

  // Detect patterns
  const detectedPatterns = detectPatterns(data, healthScore, churnRisk, upgradeReadiness);

  return {
    customerId: data.id,
    scoreDate: new Date(),
    usageScore,
    engagementScore,
    financialScore,
    healthScore,
    trend,
    trendVelocity,
    upgradeReadiness,
    churnRisk,
    expansionPotential,
    detectedPatterns,
  };
}

/**
 * Calculate usage score component
 */
function calculateUsageScore(data: CustomerData): number {
  // In production, this would use actual usage metrics
  // For now, simulate based on available data

  let score = 50; // Base score

  // Higher MRR suggests more value derived
  if (data.mrr >= 1000) score += 15;
  else if (data.mrr >= 500) score += 10;
  else if (data.mrr >= 100) score += 5;

  // Longer tenure suggests sustained usage
  if (data.tenure >= 24) score += 15;
  else if (data.tenure >= 12) score += 10;
  else if (data.tenure >= 6) score += 5;

  // Recent expansion indicates increasing usage
  if (data.recentExpansion > 0) score += 10;

  // Recent contraction indicates decreasing usage
  if (data.recentContraction > 0) score -= 15;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate engagement score component
 */
function calculateEngagementScore(data: CustomerData): number {
  // In production, would use login frequency, feature adoption, etc.
  let score = 50;

  // Tenure suggests ongoing engagement
  if (data.tenure >= 12) score += 20;
  else if (data.tenure >= 6) score += 10;
  else if (data.tenure < 2) score -= 10; // New customers still onboarding

  // Expansion indicates engagement
  if (data.recentExpansion > 0) score += 15;

  // Contraction suggests disengagement
  if (data.recentContraction > 0) score -= 20;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate financial score component
 */
function calculateFinancialScore(data: CustomerData): number {
  let score = 50;

  // MRR level
  if (data.mrr >= 5000) score += 25;
  else if (data.mrr >= 1000) score += 15;
  else if (data.mrr >= 500) score += 10;
  else if (data.mrr < 100) score -= 10;

  // Growth trajectory
  const netChange = data.recentExpansion - data.recentContraction;
  const growthRate = data.mrr > 0 ? netChange / data.mrr : 0;

  if (growthRate > 0.1) score += 15;
  else if (growthRate > 0) score += 5;
  else if (growthRate < -0.1) score -= 15;
  else if (growthRate < 0) score -= 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate trend from previous score
 */
function calculateTrend(
  previousScore: number | null,
  currentScore: number
): { trend: "improving" | "stable" | "declining"; trendVelocity: number } {
  if (previousScore === null) {
    return { trend: "stable", trendVelocity: 0 };
  }

  const delta = currentScore - previousScore;

  if (delta > 5) {
    return { trend: "improving", trendVelocity: delta };
  } else if (delta < -5) {
    return { trend: "declining", trendVelocity: delta };
  } else {
    return { trend: "stable", trendVelocity: delta };
  }
}

/**
 * Calculate upgrade readiness probability
 */
function calculateUpgradeReadiness(data: CustomerData, healthScore: number): number {
  let readiness = 0;

  // Healthy customers more likely to upgrade
  if (healthScore >= 70) readiness += 0.3;
  else if (healthScore >= 50) readiness += 0.1;

  // Recent expansion shows growth appetite
  if (data.recentExpansion > 0) readiness += 0.2;

  // Longer tenure customers are more stable for upgrades
  if (data.tenure >= 6) readiness += 0.2;

  // Higher MRR customers have budget
  if (data.mrr >= 500) readiness += 0.1;

  return Math.min(1, readiness);
}

/**
 * Calculate churn risk probability
 */
function calculateChurnRisk(data: CustomerData, healthScore: number): number {
  let risk = 0;

  // Low health score indicates risk
  if (healthScore < 40) risk += 0.4;
  else if (healthScore < 60) risk += 0.2;

  // Recent contraction is a strong signal
  if (data.recentContraction > 0) risk += 0.3;

  // Very new customers have higher churn risk
  if (data.tenure < 3) risk += 0.15;

  // Very low MRR might indicate disengagement
  if (data.mrr < 50) risk += 0.1;

  return Math.min(1, risk);
}

/**
 * Calculate expansion potential probability
 */
function calculateExpansionPotential(data: CustomerData, healthScore: number): number {
  let potential = 0;

  // Healthy customers can expand
  if (healthScore >= 70) potential += 0.3;
  else if (healthScore >= 50) potential += 0.15;

  // Already growing
  if (data.recentExpansion > 0) potential += 0.2;

  // Mid-tenure customers often expand
  if (data.tenure >= 6 && data.tenure <= 18) potential += 0.2;

  // Lower MRR = more room to grow
  if (data.mrr < 500) potential += 0.1;

  return Math.min(1, potential);
}

/**
 * Detect active patterns for a customer
 */
function detectPatterns(
  data: CustomerData,
  healthScore: number,
  churnRisk: number,
  upgradeReadiness: number
): string[] {
  const patterns: string[] = [];

  if (churnRisk >= 0.5) {
    patterns.push("churn_signal");
  }

  if (upgradeReadiness >= 0.5) {
    patterns.push("expansion_ready");
  }

  if (data.tenure <= 3 && healthScore < 50) {
    patterns.push("onboarding_risk");
  }

  if (data.recentContraction > 0) {
    patterns.push("downgrade_recent");
  }

  if (healthScore >= 80 && data.tenure >= 12) {
    patterns.push("champion_customer");
  }

  return patterns;
}

/**
 * Generate insights from health score analysis
 */
function generateHealthInsights(
  scores: CustomerHealthScore[],
  summary: {
    healthy: number;
    atRisk: number;
    critical: number;
    avgHealthScore: number;
    improving: number;
    declining: number;
  }
): string[] {
  const insights: string[] = [];
  const total = scores.length;

  // Overall health
  const healthyPct = ((summary.healthy / total) * 100).toFixed(0);
  insights.push(
    `${summary.healthy} customers (${healthyPct}%) are healthy. Average health score: ${summary.avgHealthScore.toFixed(0)}/100.`
  );

  // Critical attention
  if (summary.critical > 0) {
    insights.push(
      `⚠️ ${summary.critical} customers in critical health (score <40). Immediate intervention recommended.`
    );
  }

  // Trend summary
  if (summary.declining > summary.improving) {
    insights.push(
      `Concerning trend: ${summary.declining} customers declining vs ${summary.improving} improving.`
    );
  } else if (summary.improving > summary.declining) {
    insights.push(
      `Positive momentum: ${summary.improving} customers improving vs ${summary.declining} declining.`
    );
  }

  // High churn risk
  const highChurnRisk = scores.filter((s) => s.churnRisk >= 0.5);
  if (highChurnRisk.length > 0) {
    insights.push(
      `${highChurnRisk.length} customers flagged as high churn risk (probability ≥50%).`
    );
  }

  // Upgrade ready
  const upgradeReady = scores.filter((s) => s.upgradeReadiness >= 0.5);
  if (upgradeReady.length > 0) {
    insights.push(
      `${upgradeReady.length} customers show high upgrade readiness - prime candidates for expansion.`
    );
  }

  return insights;
}

/**
 * Store health scores in the database
 */
export async function storeHealthScores(
  supabase: DbClient,
  organizationId: string,
  scores: CustomerHealthScore[]
): Promise<void> {
  if (scores.length === 0) return;

  const records = scores.map((s) => ({
    organization_id: organizationId,
    customer_id: s.customerId,
    score_date: s.scoreDate.toISOString().split("T")[0],
    usage_score: s.usageScore,
    engagement_score: s.engagementScore,
    financial_score: s.financialScore,
    health_score: s.healthScore,
    trend: s.trend,
    trend_velocity: s.trendVelocity,
    upgrade_readiness: s.upgradeReadiness,
    churn_risk: s.churnRisk,
    expansion_potential: s.expansionPotential,
    detected_patterns: s.detectedPatterns,
  }));

  // Upsert in batches
  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await supabase.from("customer_health_scores").upsert(batch as never[], {
      onConflict: "organization_id,customer_id,score_date",
    });
  }
}
