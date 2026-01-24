/**
 * RFM Analyzer
 * Recency, Frequency, Monetary analysis for customer segmentation
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface RFMScore {
  customerId: string;
  recencyDays: number;
  frequencyCount: number;
  monetaryValue: number;
  recencyScore: number; // 1-5
  frequencyScore: number; // 1-5
  monetaryScore: number; // 1-5
  rfmScore: number; // composite (e.g., 555 = best)
  rfmSegment: RFMSegment;
}

export type RFMSegment =
  | "champions"
  | "loyal_customers"
  | "potential_loyalists"
  | "recent_customers"
  | "promising"
  | "needs_attention"
  | "about_to_sleep"
  | "at_risk"
  | "cant_lose_them"
  | "hibernating"
  | "lost";

interface RFMInput {
  customerId: string;
  lastTransactionDate: Date | null;
  transactionCount: number;
  totalRevenue: number;
}

/**
 * Calculate RFM scores for all customers
 */
export async function calculateRFMScores(
  supabase: DbClient,
  organizationId: string,
  options: {
    lookbackMonths?: number;
  } = {}
): Promise<RFMScore[]> {
  const lookbackMonths = options.lookbackMonths ?? 12;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

  // Get transaction data per customer
  const { data: transactionsRaw } = await supabase
    .from("transactions")
    .select("customer_id, amount, occurred_at")
    .eq("organization_id", organizationId)
    .gte("occurred_at", cutoffDate.toISOString());

  type Transaction = { customer_id: string; amount: number | null; occurred_at: string };
  const transactions = (transactionsRaw || []) as Transaction[];

  // Aggregate by customer
  const customerData = new Map<
    string,
    {
      lastTransaction: Date | null;
      transactionCount: number;
      totalRevenue: number;
    }
  >();

  for (const tx of transactions) {
    if (!customerData.has(tx.customer_id)) {
      customerData.set(tx.customer_id, {
        lastTransaction: null,
        transactionCount: 0,
        totalRevenue: 0,
      });
    }

    const data = customerData.get(tx.customer_id)!;
    const txDate = new Date(tx.occurred_at);

    if (!data.lastTransaction || txDate > data.lastTransaction) {
      data.lastTransaction = txDate;
    }

    data.transactionCount++;
    data.totalRevenue += Number(tx.amount) || 0;
  }

  // If no transactions, fall back to customer MRR data
  if (customerData.size === 0) {
    const { data: customersRaw } = await supabase
      .from("unified_customers")
      .select("id, mrr, created_at, tenure_months")
      .eq("organization_id", organizationId)
      .eq("status", "active");

    type CustomerRfm = { id: string; mrr: number | null; created_at: string; tenure_months: number | null };
    const customers = (customersRaw || []) as CustomerRfm[];

    for (const customer of customers) {
      const tenureMonths = customer.tenure_months || 0;
      const mrr = Number(customer.mrr) || 0;

      customerData.set(customer.id, {
        lastTransaction: new Date(), // Assume active = recent
        transactionCount: tenureMonths, // Use tenure as proxy
        totalRevenue: mrr * tenureMonths, // Estimated lifetime revenue
      });
    }
  }

  // Convert to input format
  const inputs: RFMInput[] = Array.from(customerData.entries()).map(([id, data]) => ({
    customerId: id,
    lastTransactionDate: data.lastTransaction,
    transactionCount: data.transactionCount,
    totalRevenue: data.totalRevenue,
  }));

  return calculateRFMFromInputs(inputs);
}

/**
 * Calculate RFM scores from prepared input data
 */
export function calculateRFMFromInputs(inputs: RFMInput[]): RFMScore[] {
  if (inputs.length === 0) return [];

  const now = new Date();

  // Calculate raw values
  const rawData = inputs.map((input) => {
    const recencyDays = input.lastTransactionDate
      ? Math.floor((now.getTime() - input.lastTransactionDate.getTime()) / (24 * 60 * 60 * 1000))
      : 365; // Max recency if no transaction

    return {
      customerId: input.customerId,
      recencyDays,
      frequencyCount: input.transactionCount,
      monetaryValue: input.totalRevenue,
    };
  });

  // Calculate quintile thresholds for each dimension
  const recencyValues = rawData.map((d) => d.recencyDays).sort((a, b) => a - b);
  const frequencyValues = rawData.map((d) => d.frequencyCount).sort((a, b) => a - b);
  const monetaryValues = rawData.map((d) => d.monetaryValue).sort((a, b) => a - b);

  const recencyQuintiles = calculateQuintiles(recencyValues);
  const frequencyQuintiles = calculateQuintiles(frequencyValues);
  const monetaryQuintiles = calculateQuintiles(monetaryValues);

  // Score each customer
  return rawData.map((data) => {
    // Recency: lower is better (inverted scoring)
    const recencyScore = 6 - getQuintile(data.recencyDays, recencyQuintiles);

    // Frequency: higher is better
    const frequencyScore = getQuintile(data.frequencyCount, frequencyQuintiles);

    // Monetary: higher is better
    const monetaryScore = getQuintile(data.monetaryValue, monetaryQuintiles);

    const rfmScore = recencyScore * 100 + frequencyScore * 10 + monetaryScore;
    const rfmSegment = classifyRFMSegment(recencyScore, frequencyScore, monetaryScore);

    return {
      customerId: data.customerId,
      recencyDays: data.recencyDays,
      frequencyCount: data.frequencyCount,
      monetaryValue: data.monetaryValue,
      recencyScore,
      frequencyScore,
      monetaryScore,
      rfmScore,
      rfmSegment,
    };
  });
}

/**
 * Calculate quintile thresholds
 */
function calculateQuintiles(sortedValues: number[]): number[] {
  if (sortedValues.length === 0) return [0, 0, 0, 0, 0];

  const n = sortedValues.length;
  return [
    sortedValues[Math.floor(n * 0.2)] || 0,
    sortedValues[Math.floor(n * 0.4)] || 0,
    sortedValues[Math.floor(n * 0.6)] || 0,
    sortedValues[Math.floor(n * 0.8)] || 0,
    sortedValues[n - 1] || 0,
  ];
}

/**
 * Get quintile (1-5) for a value
 */
function getQuintile(value: number, quintiles: number[]): number {
  if (value <= quintiles[0]) return 1;
  if (value <= quintiles[1]) return 2;
  if (value <= quintiles[2]) return 3;
  if (value <= quintiles[3]) return 4;
  return 5;
}

/**
 * Classify customer into RFM segment based on scores
 */
function classifyRFMSegment(r: number, f: number, m: number): RFMSegment {
  // Champions: Recent, frequent, high value
  if (r >= 4 && f >= 4 && m >= 4) return "champions";

  // Loyal Customers: Frequent buyers, may not be recent
  if (f >= 4 && m >= 3) return "loyal_customers";

  // Can't Lose Them: High value but churning
  if (r <= 2 && f >= 4 && m >= 4) return "cant_lose_them";

  // At Risk: Recent purchase history declining
  if (r <= 2 && f >= 2 && m >= 3) return "at_risk";

  // Potential Loyalists: Recent, frequent, moderate value
  if (r >= 4 && f >= 3 && m >= 2) return "potential_loyalists";

  // Recent Customers: Just started
  if (r >= 4 && f <= 2) return "recent_customers";

  // Promising: Recent but low frequency/value
  if (r >= 3 && f <= 2 && m <= 2) return "promising";

  // Needs Attention: Above average but not engaged
  if (r >= 3 && f >= 3 && m >= 2) return "needs_attention";

  // About to Sleep: Below average on all
  if (r <= 2 && f <= 2 && m >= 2) return "about_to_sleep";

  // Hibernating: Low on all fronts
  if (r <= 2 && f <= 2 && m <= 2) return "hibernating";

  // Lost: Very inactive
  if (r <= 1) return "lost";

  return "needs_attention";
}

/**
 * Store RFM scores in the database
 */
export async function storeRFMScores(
  supabase: DbClient,
  organizationId: string,
  scores: RFMScore[]
): Promise<void> {
  if (scores.length === 0) return;

  const records = scores.map((s) => ({
    organization_id: organizationId,
    customer_id: s.customerId,
    recency_days: s.recencyDays,
    frequency_count: s.frequencyCount,
    monetary_value: s.monetaryValue,
    recency_score: s.recencyScore,
    frequency_score: s.frequencyScore,
    monetary_score: s.monetaryScore,
    rfm_segment: s.rfmSegment,
    computed_at: new Date().toISOString(),
  }));

  // Upsert in batches
  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from("customer_rfm_scores")
      .upsert(batch as never[], {
        onConflict: "organization_id,customer_id",
      });

    if (error) throw error;
  }
}

/**
 * Get RFM segment distribution
 */
export function getRFMDistribution(scores: RFMScore[]): Record<RFMSegment, number> {
  const distribution: Record<RFMSegment, number> = {
    champions: 0,
    loyal_customers: 0,
    potential_loyalists: 0,
    recent_customers: 0,
    promising: 0,
    needs_attention: 0,
    about_to_sleep: 0,
    at_risk: 0,
    cant_lose_them: 0,
    hibernating: 0,
    lost: 0,
  };

  for (const score of scores) {
    distribution[score.rfmSegment]++;
  }

  return distribution;
}

/**
 * Get segment recommendations based on RFM analysis
 */
export function getRFMRecommendations(
  scores: RFMScore[]
): { segment: RFMSegment; action: string; priority: "high" | "medium" | "low"; count: number }[] {
  const distribution = getRFMDistribution(scores);

  const recommendations: {
    segment: RFMSegment;
    action: string;
    priority: "high" | "medium" | "low";
    count: number;
  }[] = [];

  if (distribution.cant_lose_them > 0) {
    recommendations.push({
      segment: "cant_lose_them",
      action: "Urgent outreach required. These are high-value customers showing churn signals.",
      priority: "high",
      count: distribution.cant_lose_them,
    });
  }

  if (distribution.at_risk > 0) {
    recommendations.push({
      segment: "at_risk",
      action: "Re-engagement campaign. Send win-back offers before they churn.",
      priority: "high",
      count: distribution.at_risk,
    });
  }

  if (distribution.champions > 0) {
    recommendations.push({
      segment: "champions",
      action: "Nurture and reward. Excellent candidates for referral programs and case studies.",
      priority: "medium",
      count: distribution.champions,
    });
  }

  if (distribution.potential_loyalists > 0) {
    recommendations.push({
      segment: "potential_loyalists",
      action: "Offer loyalty incentives. These customers can become champions with the right push.",
      priority: "medium",
      count: distribution.potential_loyalists,
    });
  }

  if (distribution.recent_customers > 0) {
    recommendations.push({
      segment: "recent_customers",
      action: "Onboarding optimization. Ensure strong first experience to drive repeat engagement.",
      priority: "medium",
      count: distribution.recent_customers,
    });
  }

  if (distribution.hibernating > 0 || distribution.lost > 0) {
    recommendations.push({
      segment: "hibernating",
      action: "Consider removing from active campaigns. Focus resources on higher-potential segments.",
      priority: "low",
      count: distribution.hibernating + distribution.lost,
    });
  }

  return recommendations;
}
