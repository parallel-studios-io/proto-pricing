/**
 * Retention Metrics Calculator
 * Calculates NRR, GRR, and churn rates from customer data
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface RetentionMetrics {
  // Net Revenue Retention (NRR)
  // (StartingMRR + Expansion - Contraction - Churn) / StartingMRR
  netRevenueRetention: number;

  // Gross Revenue Retention (GRR)
  // (StartingMRR - Contraction - Churn) / StartingMRR
  grossRevenueRetention: number;

  // Logo churn (customer count)
  logoChurnRate: number;
  logoChurnCount: number;

  // Revenue churn
  revenueChurnRate: number;
  revenueChurnAmount: number;

  // Expansion metrics
  expansionRate: number;
  expansionAmount: number;

  // Contraction metrics
  contractionRate: number;
  contractionAmount: number;

  // Period info
  periodStart: string;
  periodEnd: string;
  startingMrr: number;
  endingMrr: number;
  startingCustomerCount: number;
  endingCustomerCount: number;
}

export interface ChurnAnalysis {
  overallChurnRate: number;
  churnBySegment: Record<string, number>;
  churnByTier: Record<string, number>;
  churnByTenure: {
    lessThan3Months: number;
    threeToSixMonths: number;
    sixToTwelveMonths: number;
    moreThanTwelveMonths: number;
  };
  avgTimeToChurn: number; // months
  topChurnReasons: { reason: string; count: number }[];
}

/**
 * Calculate retention metrics for a period
 */
export async function calculateRetentionMetrics(
  supabase: DbClient,
  organizationId: string,
  options: {
    periodStart?: Date;
    periodEnd?: Date;
  } = {}
): Promise<RetentionMetrics> {
  const now = new Date();
  const periodEnd = options.periodEnd ?? now;
  const periodStart = options.periodStart ?? new Date(now.setMonth(now.getMonth() - 1));

  const periodStartStr = periodStart.toISOString();
  const periodEndStr = periodEnd.toISOString();

  // Get starting state: customers active at period start
  const { data: startingCustomersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, status, churned_at")
    .eq("organization_id", organizationId)
    .lte("created_at", periodStartStr);

  type CustomerRetention = { id: string; mrr: number | null; status: string | null; churned_at: string | null };
  const startingCustomers = (startingCustomersRaw || []) as CustomerRetention[];

  // Filter to those that were active at period start
  const activeAtStart = startingCustomers.filter((c) => {
    if (c.status === "churned" && c.churned_at) {
      return new Date(c.churned_at) > periodStart;
    }
    return c.status === "active";
  });

  const startingMrr = activeAtStart.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  const startingCustomerCount = activeAtStart.length;

  // Get current state
  const { data: currentCustomersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, status, churned_at")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  const currentCustomers = (currentCustomersRaw || []) as CustomerRetention[];
  const endingMrr = currentCustomers.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  const endingCustomerCount = currentCustomers.length;

  // Get expansion/contraction events in the period
  const { data: expansionEventsRaw } = await supabase
    .from("customer_expansion_events")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("occurred_at", periodStartStr)
    .lte("occurred_at", periodEndStr);

  type ExpansionEvent = { delta_mrr: number | null };
  const expansionEvents = (expansionEventsRaw || []) as ExpansionEvent[];

  // Calculate expansion and contraction
  let expansionAmount = 0;
  let contractionAmount = 0;

  for (const event of expansionEvents) {
    const delta = Number(event.delta_mrr) || 0;
    if (delta > 0) {
      expansionAmount += delta;
    } else {
      contractionAmount += Math.abs(delta);
    }
  }

  // Calculate churned customers and revenue
  const churnedInPeriod = activeAtStart.filter((c) => {
    if (c.status === "churned" && c.churned_at) {
      const churnDate = new Date(c.churned_at);
      return churnDate >= periodStart && churnDate <= periodEnd;
    }
    return false;
  });

  const logoChurnCount = churnedInPeriod.length;
  const revenueChurnAmount = churnedInPeriod.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);

  // Calculate rates
  const logoChurnRate = startingCustomerCount > 0 ? logoChurnCount / startingCustomerCount : 0;
  const revenueChurnRate = startingMrr > 0 ? revenueChurnAmount / startingMrr : 0;
  const expansionRate = startingMrr > 0 ? expansionAmount / startingMrr : 0;
  const contractionRate = startingMrr > 0 ? contractionAmount / startingMrr : 0;

  // Calculate NRR and GRR
  const netRevenueRetention =
    startingMrr > 0
      ? (startingMrr + expansionAmount - contractionAmount - revenueChurnAmount) / startingMrr
      : 1;

  const grossRevenueRetention =
    startingMrr > 0 ? (startingMrr - contractionAmount - revenueChurnAmount) / startingMrr : 1;

  return {
    netRevenueRetention,
    grossRevenueRetention,
    logoChurnRate,
    logoChurnCount,
    revenueChurnRate,
    revenueChurnAmount,
    expansionRate,
    expansionAmount,
    contractionRate,
    contractionAmount,
    periodStart: periodStartStr,
    periodEnd: periodEndStr,
    startingMrr,
    endingMrr,
    startingCustomerCount,
    endingCustomerCount,
  };
}

/**
 * Analyze churn patterns by segment, tier, and tenure
 */
export async function analyzeChurn(
  supabase: DbClient,
  organizationId: string,
  options: {
    lookbackMonths?: number;
  } = {}
): Promise<ChurnAnalysis> {
  const lookbackMonths = options.lookbackMonths ?? 12;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

  // Get all customers with churn data
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("id, segment_id, current_tier_id, tenure_months, status, churned_at, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", cutoffDate.toISOString());

  type CustomerChurnData = {
    id: string;
    segment_id: string | null;
    current_tier_id: string | null;
    tenure_months: number | null;
    status: string | null;
    churned_at: string | null;
    created_at: string;
  };
  const customers = (customersRaw || []) as CustomerChurnData[];

  if (customers.length === 0) {
    return {
      overallChurnRate: 0,
      churnBySegment: {},
      churnByTier: {},
      churnByTenure: {
        lessThan3Months: 0,
        threeToSixMonths: 0,
        sixToTwelveMonths: 0,
        moreThanTwelveMonths: 0,
      },
      avgTimeToChurn: 0,
      topChurnReasons: [],
    };
  }

  // Get segment and tier names
  const { data: segmentsRaw } = await supabase
    .from("segments")
    .select("id, name")
    .eq("organization_id", organizationId);

  const { data: tiersRaw } = await supabase
    .from("pricing_tiers")
    .select("id, name")
    .eq("organization_id", organizationId);

  type SegmentBasic = { id: string; name: string };
  type TierBasic = { id: string; name: string };
  const segments = (segmentsRaw || []) as SegmentBasic[];
  const tiers = (tiersRaw || []) as TierBasic[];

  const segmentMap = new Map(segments.map((s) => [s.id, s.name]));
  const tierMap = new Map(tiers.map((t) => [t.id, t.name]));

  // Calculate overall churn
  const totalCustomers = customers.length;
  const churnedCustomers = customers.filter((c) => c.status === "churned");
  const overallChurnRate = totalCustomers > 0 ? churnedCustomers.length / totalCustomers : 0;

  // Churn by segment
  const churnBySegment: Record<string, number> = {};
  const segmentCounts = new Map<string, { total: number; churned: number }>();

  for (const customer of customers) {
    const segmentName = customer.segment_id ? segmentMap.get(customer.segment_id) || "Unknown" : "Unknown";

    if (!segmentCounts.has(segmentName)) {
      segmentCounts.set(segmentName, { total: 0, churned: 0 });
    }

    const counts = segmentCounts.get(segmentName)!;
    counts.total++;
    if (customer.status === "churned") counts.churned++;
  }

  for (const [name, counts] of segmentCounts) {
    churnBySegment[name] = counts.total > 0 ? counts.churned / counts.total : 0;
  }

  // Churn by tier
  const churnByTier: Record<string, number> = {};
  const tierCounts = new Map<string, { total: number; churned: number }>();

  for (const customer of customers) {
    const tierName = customer.current_tier_id ? tierMap.get(customer.current_tier_id) || "Unknown" : "Unknown";

    if (!tierCounts.has(tierName)) {
      tierCounts.set(tierName, { total: 0, churned: 0 });
    }

    const counts = tierCounts.get(tierName)!;
    counts.total++;
    if (customer.status === "churned") counts.churned++;
  }

  for (const [name, counts] of tierCounts) {
    churnByTier[name] = counts.total > 0 ? counts.churned / counts.total : 0;
  }

  // Churn by tenure
  const tenureBuckets = {
    lessThan3Months: { total: 0, churned: 0 },
    threeToSixMonths: { total: 0, churned: 0 },
    sixToTwelveMonths: { total: 0, churned: 0 },
    moreThanTwelveMonths: { total: 0, churned: 0 },
  };

  for (const customer of customers) {
    const tenure = customer.tenure_months || 0;
    let bucket: keyof typeof tenureBuckets;

    if (tenure < 3) bucket = "lessThan3Months";
    else if (tenure < 6) bucket = "threeToSixMonths";
    else if (tenure < 12) bucket = "sixToTwelveMonths";
    else bucket = "moreThanTwelveMonths";

    tenureBuckets[bucket].total++;
    if (customer.status === "churned") tenureBuckets[bucket].churned++;
  }

  const churnByTenure = {
    lessThan3Months:
      tenureBuckets.lessThan3Months.total > 0
        ? tenureBuckets.lessThan3Months.churned / tenureBuckets.lessThan3Months.total
        : 0,
    threeToSixMonths:
      tenureBuckets.threeToSixMonths.total > 0
        ? tenureBuckets.threeToSixMonths.churned / tenureBuckets.threeToSixMonths.total
        : 0,
    sixToTwelveMonths:
      tenureBuckets.sixToTwelveMonths.total > 0
        ? tenureBuckets.sixToTwelveMonths.churned / tenureBuckets.sixToTwelveMonths.total
        : 0,
    moreThanTwelveMonths:
      tenureBuckets.moreThanTwelveMonths.total > 0
        ? tenureBuckets.moreThanTwelveMonths.churned / tenureBuckets.moreThanTwelveMonths.total
        : 0,
  };

  // Average time to churn
  const churnTenures = churnedCustomers
    .filter((c) => c.churned_at && c.created_at)
    .map((c) => {
      const created = new Date(c.created_at);
      const churned = new Date(c.churned_at!);
      return (churned.getTime() - created.getTime()) / (30 * 24 * 60 * 60 * 1000);
    });

  const avgTimeToChurn =
    churnTenures.length > 0 ? churnTenures.reduce((a, b) => a + b, 0) / churnTenures.length : 0;

  // TODO: Get churn reasons from customer metadata or expansion events
  const topChurnReasons: { reason: string; count: number }[] = [];

  return {
    overallChurnRate,
    churnBySegment,
    churnByTier,
    churnByTenure,
    avgTimeToChurn,
    topChurnReasons,
  };
}

/**
 * Calculate retention metrics for a specific segment
 */
export async function calculateSegmentRetention(
  supabase: DbClient,
  organizationId: string,
  segmentId: string,
  options: {
    periodStart?: Date;
    periodEnd?: Date;
  } = {}
): Promise<RetentionMetrics> {
  const now = new Date();
  const periodEnd = options.periodEnd ?? now;
  const periodStart = options.periodStart ?? new Date(now.setMonth(now.getMonth() - 1));

  const periodStartStr = periodStart.toISOString();
  const periodEndStr = periodEnd.toISOString();

  // Get starting state for segment
  const { data: startingCustomersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, status, churned_at")
    .eq("organization_id", organizationId)
    .eq("segment_id", segmentId)
    .lte("created_at", periodStartStr);

  type CustomerSegmentRetention = { id: string; mrr: number | null; status: string | null; churned_at: string | null };
  const startingCustomers = (startingCustomersRaw || []) as CustomerSegmentRetention[];

  // Same calculation logic as above, but filtered by segment
  const activeAtStart = startingCustomers.filter((c) => {
    if (c.status === "churned" && c.churned_at) {
      return new Date(c.churned_at) > periodStart;
    }
    return c.status === "active";
  });

  const startingMrr = activeAtStart.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  const startingCustomerCount = activeAtStart.length;

  const { data: currentCustomersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, status, churned_at")
    .eq("organization_id", organizationId)
    .eq("segment_id", segmentId)
    .eq("status", "active");

  const currentCustomers = (currentCustomersRaw || []) as CustomerSegmentRetention[];
  const endingMrr = currentCustomers.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  const endingCustomerCount = currentCustomers.length;

  // Get expansion events for segment customers
  const customerIds = activeAtStart.map((c) => c.id);

  const { data: expansionEventsRaw } = await supabase
    .from("customer_expansion_events")
    .select("*")
    .eq("organization_id", organizationId)
    .in("customer_id", customerIds)
    .gte("occurred_at", periodStartStr)
    .lte("occurred_at", periodEndStr);

  type ExpansionEventSegment = { delta_mrr: number | null };
  const expansionEvents = (expansionEventsRaw || []) as ExpansionEventSegment[];

  let expansionAmount = 0;
  let contractionAmount = 0;

  for (const event of expansionEvents) {
    const delta = Number(event.delta_mrr) || 0;
    if (delta > 0) {
      expansionAmount += delta;
    } else {
      contractionAmount += Math.abs(delta);
    }
  }

  const churnedInPeriod = activeAtStart.filter((c) => {
    if (c.status === "churned" && c.churned_at) {
      const churnDate = new Date(c.churned_at);
      return churnDate >= periodStart && churnDate <= periodEnd;
    }
    return false;
  });

  const logoChurnCount = churnedInPeriod.length;
  const revenueChurnAmount = churnedInPeriod.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);

  const logoChurnRate = startingCustomerCount > 0 ? logoChurnCount / startingCustomerCount : 0;
  const revenueChurnRate = startingMrr > 0 ? revenueChurnAmount / startingMrr : 0;
  const expansionRate = startingMrr > 0 ? expansionAmount / startingMrr : 0;
  const contractionRate = startingMrr > 0 ? contractionAmount / startingMrr : 0;

  const netRevenueRetention =
    startingMrr > 0
      ? (startingMrr + expansionAmount - contractionAmount - revenueChurnAmount) / startingMrr
      : 1;

  const grossRevenueRetention =
    startingMrr > 0 ? (startingMrr - contractionAmount - revenueChurnAmount) / startingMrr : 1;

  return {
    netRevenueRetention,
    grossRevenueRetention,
    logoChurnRate,
    logoChurnCount,
    revenueChurnRate,
    revenueChurnAmount,
    expansionRate,
    expansionAmount,
    contractionRate,
    contractionAmount,
    periodStart: periodStartStr,
    periodEnd: periodEndStr,
    startingMrr,
    endingMrr,
    startingCustomerCount,
    endingCustomerCount,
  };
}
