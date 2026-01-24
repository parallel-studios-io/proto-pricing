/**
 * LTV Calculator
 * Calculates customer lifetime value using retention curves and ARPU
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { analyzeCohortRetention, buildRetentionCurves, calculateAggregateRetention } from "./cohort-analyzer";

type DbClient = SupabaseClient<Database>;

export interface LTVMetrics {
  // Core LTV values
  avgLtv: number;
  medianLtv: number;
  ltvP25: number;
  ltvP75: number;
  ltvP90: number;

  // LTV by segment
  ltvBySegment: Record<string, number>;

  // Inputs used
  avgArpu: number;
  avgLifetimeMonths: number;
  grossMargin: number;

  // Method used
  calculationMethod: "retention_curve" | "churn_based" | "simple";
}

export interface LTVCalculationOptions {
  // Gross margin (0-1), defaults to 0.70 for SaaS
  grossMargin?: number;
  // Discount rate for NPV calculation (0-1), defaults to 0.10
  discountRate?: number;
  // Max months to project, defaults to 60
  maxProjectionMonths?: number;
}

/**
 * Calculate LTV using the retention curve method (most accurate)
 * LTV = Sum of (Retention[N] × ARPU × GrossMargin × DiscountFactor[N])
 */
export async function calculateLTV(
  supabase: DbClient,
  organizationId: string,
  options: LTVCalculationOptions = {}
): Promise<LTVMetrics> {
  const grossMargin = options.grossMargin ?? 0.70;
  const discountRate = options.discountRate ?? 0.10;
  const maxProjectionMonths = options.maxProjectionMonths ?? 60;

  // Get cohort retention data
  const cohortData = await analyzeCohortRetention(supabase, organizationId);
  const curves = buildRetentionCurves(cohortData);
  const aggregateRetention = calculateAggregateRetention(curves);

  // Get customer ARPU data
  const { data: customersData, error } = await supabase
    .from("unified_customers")
    .select("id, mrr, segment_id, status")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) throw error;

  type CustomerMrr = { id: string; mrr: number | null; segment_id: string | null; status: string | null };
  const activeCustomers = (customersData || []) as CustomerMrr[];
  const totalMrr = activeCustomers.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  const avgArpu = activeCustomers.length > 0 ? totalMrr / activeCustomers.length : 0;

  // If we have retention curves, use them for LTV calculation
  if (aggregateRetention.avgRetentionByMonth.length > 0) {
    const retentionCurve = aggregateRetention.avgRetentionByMonth;

    // Project retention curve forward if needed
    const projectedCurve = projectRetentionCurve(retentionCurve, maxProjectionMonths);

    // Calculate LTV using the retention curve
    const ltv = calculateLTVFromCurve(projectedCurve, avgArpu, grossMargin, discountRate);

    // Calculate LTV by segment
    const ltvBySegment = await calculateLTVBySegment(
      supabase,
      organizationId,
      projectedCurve,
      grossMargin,
      discountRate
    );

    // Calculate lifetime months
    const avgLifetimeMonths = calculateExpectedLifetimeMonths(projectedCurve);

    // Calculate distribution from individual customers
    const individualLTVs = activeCustomers.map((c) => {
      const customerMrr = Number(c.mrr) || 0;
      return calculateLTVFromCurve(projectedCurve, customerMrr, grossMargin, discountRate);
    });

    individualLTVs.sort((a, b) => a - b);

    return {
      avgLtv: ltv,
      medianLtv: getPercentile(individualLTVs, 50),
      ltvP25: getPercentile(individualLTVs, 25),
      ltvP75: getPercentile(individualLTVs, 75),
      ltvP90: getPercentile(individualLTVs, 90),
      ltvBySegment,
      avgArpu,
      avgLifetimeMonths,
      grossMargin,
      calculationMethod: "retention_curve",
    };
  }

  // Fallback: churn-based LTV calculation
  return calculateChurnBasedLTV(supabase, organizationId, avgArpu, grossMargin);
}

/**
 * Calculate LTV from a retention curve
 */
function calculateLTVFromCurve(
  retentionCurve: number[],
  arpu: number,
  grossMargin: number,
  discountRate: number
): number {
  let ltv = 0;
  const monthlyDiscount = discountRate / 12;

  for (let month = 0; month < retentionCurve.length; month++) {
    const retention = retentionCurve[month];
    const discountFactor = 1 / Math.pow(1 + monthlyDiscount, month);
    ltv += retention * arpu * grossMargin * discountFactor;
  }

  return ltv;
}

/**
 * Project a retention curve forward using exponential decay
 */
function projectRetentionCurve(curve: number[], targetLength: number): number[] {
  if (curve.length >= targetLength) {
    return curve.slice(0, targetLength);
  }

  const result = [...curve];

  // Calculate decay rate from the last few months
  const lookback = Math.min(3, curve.length - 1);
  let decaySum = 0;
  let decayCount = 0;

  for (let i = curve.length - lookback; i < curve.length - 1; i++) {
    if (curve[i] > 0 && curve[i + 1] > 0) {
      decaySum += curve[i + 1] / curve[i];
      decayCount++;
    }
  }

  const avgDecayRate = decayCount > 0 ? decaySum / decayCount : 0.95;

  // Project forward
  let lastValue = curve[curve.length - 1];
  for (let i = curve.length; i < targetLength; i++) {
    lastValue *= avgDecayRate;
    result.push(Math.max(lastValue, 0.01)); // Floor at 1%
  }

  return result;
}

/**
 * Calculate expected lifetime in months from retention curve
 */
function calculateExpectedLifetimeMonths(retentionCurve: number[]): number {
  // Lifetime = Sum of retention rates (each retention rate is probability of being alive)
  return retentionCurve.reduce((sum, r) => sum + r, 0);
}

/**
 * Calculate LTV by segment
 */
async function calculateLTVBySegment(
  supabase: DbClient,
  organizationId: string,
  retentionCurve: number[],
  grossMargin: number,
  discountRate: number
): Promise<Record<string, number>> {
  // Get segments with their names
  const { data: segmentsData } = await supabase
    .from("segments")
    .select("id, name")
    .eq("organization_id", organizationId);

  type SegmentData = { id: string; name: string };
  const segments = (segmentsData || []) as SegmentData[];
  if (segments.length === 0) return {};

  // Get customers grouped by segment
  const { data: customersData } = await supabase
    .from("unified_customers")
    .select("segment_id, mrr")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  type CustomerSegment = { segment_id: string | null; mrr: number | null };
  const customers = (customersData || []) as CustomerSegment[];
  if (customers.length === 0) return {};

  // Calculate ARPU per segment
  const segmentArpu = new Map<string, { total: number; count: number }>();

  for (const customer of customers) {
    if (!customer.segment_id) continue;

    if (!segmentArpu.has(customer.segment_id)) {
      segmentArpu.set(customer.segment_id, { total: 0, count: 0 });
    }

    const data = segmentArpu.get(customer.segment_id)!;
    data.total += Number(customer.mrr) || 0;
    data.count++;
  }

  // Calculate LTV for each segment
  const result: Record<string, number> = {};

  for (const segment of segments) {
    const arpuData = segmentArpu.get(segment.id);
    if (!arpuData || arpuData.count === 0) continue;

    const arpu = arpuData.total / arpuData.count;
    // TODO: Use segment-specific retention curves when available
    result[segment.name] = calculateLTVFromCurve(retentionCurve, arpu, grossMargin, discountRate);
  }

  return result;
}

/**
 * Fallback: Calculate LTV using simple churn-based formula
 * LTV = ARPU × GrossMargin / ChurnRate
 */
async function calculateChurnBasedLTV(
  supabase: DbClient,
  organizationId: string,
  avgArpu: number,
  grossMargin: number
): Promise<LTVMetrics> {
  // Get churn data
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, created_at, churned_at, status")
    .eq("organization_id", organizationId);

  type CustomerChurn = { id: string; mrr: number | null; created_at: string; churned_at: string | null; status: string | null };
  const customers = (customersRaw || []) as CustomerChurn[];

  if (customers.length === 0) {
    return {
      avgLtv: 0,
      medianLtv: 0,
      ltvP25: 0,
      ltvP75: 0,
      ltvP90: 0,
      ltvBySegment: {},
      avgArpu: 0,
      avgLifetimeMonths: 0,
      grossMargin,
      calculationMethod: "simple",
    };
  }

  // Calculate monthly churn rate
  const totalCustomers = customers.length;
  const churnedCustomers = customers.filter((c) => c.status === "churned").length;

  // Calculate average tenure for churned customers
  const churnedWithTenure = customers.filter((c) => c.status === "churned" && c.churned_at);
  let avgTenureMonths = 12; // Default

  if (churnedWithTenure.length > 0) {
    const totalTenure = churnedWithTenure.reduce((sum, c) => {
      const created = new Date(c.created_at);
      const churned = new Date(c.churned_at!);
      return sum + (churned.getTime() - created.getTime()) / (30 * 24 * 60 * 60 * 1000);
    }, 0);
    avgTenureMonths = totalTenure / churnedWithTenure.length;
  }

  // Monthly churn rate
  const monthlyChurnRate =
    churnedCustomers > 0 && totalCustomers > 0
      ? churnedCustomers / totalCustomers / avgTenureMonths
      : 0.05; // Default 5% if no data

  // LTV = ARPU × GrossMargin / ChurnRate
  const avgLtv = monthlyChurnRate > 0 ? (avgArpu * grossMargin) / monthlyChurnRate : avgArpu * grossMargin * 24;

  // Calculate individual LTVs for distribution
  const individualLTVs = customers
    .filter((c) => c.status === "active")
    .map((c) => {
      const mrr = Number(c.mrr) || 0;
      return monthlyChurnRate > 0 ? (mrr * grossMargin) / monthlyChurnRate : mrr * grossMargin * 24;
    });

  individualLTVs.sort((a, b) => a - b);

  return {
    avgLtv,
    medianLtv: getPercentile(individualLTVs, 50),
    ltvP25: getPercentile(individualLTVs, 25),
    ltvP75: getPercentile(individualLTVs, 75),
    ltvP90: getPercentile(individualLTVs, 90),
    ltvBySegment: {},
    avgArpu,
    avgLifetimeMonths: monthlyChurnRate > 0 ? 1 / monthlyChurnRate : 24,
    grossMargin,
    calculationMethod: "churn_based",
  };
}

/**
 * Get percentile value from sorted array
 */
function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;

  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sortedArray[lower];

  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}
