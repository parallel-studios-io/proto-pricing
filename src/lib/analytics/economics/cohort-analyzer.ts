/**
 * Cohort Retention Analyzer
 * Tracks customer and revenue retention by acquisition cohort
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface CohortData {
  cohortMonth: string; // YYYY-MM
  monthOffset: number;
  cohortSize: number;
  retainedCount: number;
  retentionRate: number;
  cohortStartingMrr: number;
  retainedMrr: number;
  revenueRetentionRate: number;
}

export interface CohortRetentionCurve {
  cohortMonth: string;
  cohortSize: number;
  startingMrr: number;
  retentionByMonth: number[]; // Array of retention rates by month offset
  revenueRetentionByMonth: number[];
}

export interface AggregateRetentionMetrics {
  avgRetentionByMonth: number[];
  avgRevenueRetentionByMonth: number[];
  medianRetentionByMonth: number[];
  cohortCount: number;
  totalCustomersAnalyzed: number;
}

/**
 * Analyze cohort retention from unified customer data
 */
export async function analyzeCohortRetention(
  supabase: DbClient,
  organizationId: string,
  options: {
    lookbackMonths?: number;
    maxMonthsToTrack?: number;
  } = {}
): Promise<CohortData[]> {
  const lookbackMonths = options.lookbackMonths ?? 24;
  const maxMonthsToTrack = options.maxMonthsToTrack ?? 12;

  // Get all customers with their creation dates and current status
  const { data: customersData, error } = await supabase
    .from("unified_customers")
    .select("id, created_at, mrr, status, churned_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!customersData || customersData.length === 0) return [];

  // Type assertion for customer data
  type CustomerData = {
    id: string;
    created_at: string;
    mrr: number | null;
    status: string | null;
    churned_at: string | null;
  };
  const customers = customersData as CustomerData[];

  // Group customers by cohort month
  const cohorts = new Map<
    string,
    {
      customers: typeof customers;
      startingMrr: number;
    }
  >();

  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

  for (const customer of customers) {
    const createdAt = new Date(customer.created_at);
    if (createdAt < cutoffDate) continue;

    const cohortKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;

    if (!cohorts.has(cohortKey)) {
      cohorts.set(cohortKey, { customers: [], startingMrr: 0 });
    }

    const cohort = cohorts.get(cohortKey)!;
    cohort.customers.push(customer);
    cohort.startingMrr += Number(customer.mrr) || 0;
  }

  // Calculate retention for each cohort at each month offset
  const results: CohortData[] = [];

  for (const [cohortMonth, cohort] of cohorts) {
    const cohortDate = new Date(cohortMonth + "-01");
    const monthsSinceCohort = Math.floor(
      (now.getTime() - cohortDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );

    for (let offset = 0; offset <= Math.min(monthsSinceCohort, maxMonthsToTrack); offset++) {
      const checkDate = new Date(cohortDate);
      checkDate.setMonth(checkDate.getMonth() + offset);

      // Count retained customers at this offset
      let retainedCount = 0;
      let retainedMrr = 0;

      for (const customer of cohort.customers) {
        const isRetained = isCustomerRetainedAt(customer, checkDate);
        if (isRetained) {
          retainedCount++;
          retainedMrr += Number(customer.mrr) || 0;
        }
      }

      results.push({
        cohortMonth,
        monthOffset: offset,
        cohortSize: cohort.customers.length,
        retainedCount,
        retentionRate: cohort.customers.length > 0 ? retainedCount / cohort.customers.length : 0,
        cohortStartingMrr: cohort.startingMrr,
        retainedMrr,
        revenueRetentionRate: cohort.startingMrr > 0 ? retainedMrr / cohort.startingMrr : 0,
      });
    }
  }

  return results;
}

/**
 * Check if a customer was retained at a specific date
 */
function isCustomerRetainedAt(
  customer: { status: string | null; churned_at: string | null; created_at: string },
  checkDate: Date
): boolean {
  const createdAt = new Date(customer.created_at);

  // Not yet a customer at check date
  if (createdAt > checkDate) return false;

  // If never churned and currently active, retained
  if (customer.status === "active" && !customer.churned_at) return true;

  // If churned, check if churn happened after check date
  if (customer.churned_at) {
    const churnedAt = new Date(customer.churned_at);
    return churnedAt > checkDate;
  }

  // Default: assume retained if not explicitly churned
  return customer.status === "active";
}

/**
 * Build retention curves for each cohort
 */
export function buildRetentionCurves(cohortData: CohortData[]): CohortRetentionCurve[] {
  const curvesByMonth = new Map<string, CohortRetentionCurve>();

  for (const data of cohortData) {
    if (!curvesByMonth.has(data.cohortMonth)) {
      curvesByMonth.set(data.cohortMonth, {
        cohortMonth: data.cohortMonth,
        cohortSize: data.cohortSize,
        startingMrr: data.cohortStartingMrr,
        retentionByMonth: [],
        revenueRetentionByMonth: [],
      });
    }

    const curve = curvesByMonth.get(data.cohortMonth)!;

    // Ensure array is long enough
    while (curve.retentionByMonth.length <= data.monthOffset) {
      curve.retentionByMonth.push(0);
      curve.revenueRetentionByMonth.push(0);
    }

    curve.retentionByMonth[data.monthOffset] = data.retentionRate;
    curve.revenueRetentionByMonth[data.monthOffset] = data.revenueRetentionRate;
  }

  return Array.from(curvesByMonth.values()).sort((a, b) =>
    a.cohortMonth.localeCompare(b.cohortMonth)
  );
}

/**
 * Calculate aggregate retention metrics across all cohorts
 */
export function calculateAggregateRetention(
  curves: CohortRetentionCurve[]
): AggregateRetentionMetrics {
  if (curves.length === 0) {
    return {
      avgRetentionByMonth: [],
      avgRevenueRetentionByMonth: [],
      medianRetentionByMonth: [],
      cohortCount: 0,
      totalCustomersAnalyzed: 0,
    };
  }

  // Find max month offset across all curves
  const maxOffset = Math.max(...curves.map((c) => c.retentionByMonth.length));

  const avgRetentionByMonth: number[] = [];
  const avgRevenueRetentionByMonth: number[] = [];
  const medianRetentionByMonth: number[] = [];

  for (let offset = 0; offset < maxOffset; offset++) {
    const retentionValues: number[] = [];
    const revenueRetentionValues: number[] = [];

    for (const curve of curves) {
      if (offset < curve.retentionByMonth.length) {
        retentionValues.push(curve.retentionByMonth[offset]);
        revenueRetentionValues.push(curve.revenueRetentionByMonth[offset]);
      }
    }

    avgRetentionByMonth.push(
      retentionValues.length > 0
        ? retentionValues.reduce((a, b) => a + b, 0) / retentionValues.length
        : 0
    );

    avgRevenueRetentionByMonth.push(
      revenueRetentionValues.length > 0
        ? revenueRetentionValues.reduce((a, b) => a + b, 0) / revenueRetentionValues.length
        : 0
    );

    // Calculate median
    retentionValues.sort((a, b) => a - b);
    const mid = Math.floor(retentionValues.length / 2);
    medianRetentionByMonth.push(
      retentionValues.length > 0
        ? retentionValues.length % 2 === 0
          ? (retentionValues[mid - 1] + retentionValues[mid]) / 2
          : retentionValues[mid]
        : 0
    );
  }

  return {
    avgRetentionByMonth,
    avgRevenueRetentionByMonth,
    medianRetentionByMonth,
    cohortCount: curves.length,
    totalCustomersAnalyzed: curves.reduce((sum, c) => sum + c.cohortSize, 0),
  };
}

/**
 * Store cohort retention data in the database
 */
export async function storeCohortRetention(
  supabase: DbClient,
  organizationId: string,
  cohortData: CohortData[]
): Promise<void> {
  if (cohortData.length === 0) return;

  const records = cohortData.map((d) => ({
    organization_id: organizationId,
    cohort_month: d.cohortMonth + "-01", // Convert to date
    month_offset: d.monthOffset,
    cohort_size: d.cohortSize,
    retained_count: d.retainedCount,
    retention_rate: d.retentionRate,
    cohort_starting_mrr: d.cohortStartingMrr,
    retained_mrr: d.retainedMrr,
    revenue_retention_rate: d.revenueRetentionRate,
    computed_at: new Date().toISOString(),
  }));

  // Upsert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from("cohort_retention_data")
      .upsert(batch as never[], {
        onConflict: "organization_id,cohort_month,month_offset",
      });

    if (error) throw error;
  }
}
