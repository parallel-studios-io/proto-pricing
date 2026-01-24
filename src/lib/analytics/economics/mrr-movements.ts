/**
 * MRR Movements Calculator
 * Calculates MRR waterfall: New, Expansion, Contraction, Churn, Reactivation
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface MRRMovement {
  period: string; // YYYY-MM
  startingMrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnMrr: number;
  reactivationMrr: number;
  netNewMrr: number;
  endingMrr: number;
  // Counts
  newCustomers: number;
  expansionCustomers: number;
  contractionCustomers: number;
  churnedCustomers: number;
  reactivatedCustomers: number;
}

export interface MRRGrowthMetrics {
  currentMrr: number;
  previousMrr: number;
  mrrGrowthRate: number;
  momGrowthRate: number;
  yoyGrowthRate: number;
  quickRatio: number; // (New + Expansion + Reactivation) / (Contraction + Churn)
  avgMrrPerCustomer: number;
  mrrConcentration: {
    top10Percent: number;
    top20Percent: number;
    giniCoefficient: number;
  };
}

/**
 * Calculate MRR movements for a period
 */
export async function calculateMRRMovements(
  supabase: DbClient,
  organizationId: string,
  options: {
    periodStart?: Date;
    periodEnd?: Date;
  } = {}
): Promise<MRRMovement> {
  const now = new Date();
  const periodEnd = options.periodEnd ?? now;
  const periodStart =
    options.periodStart ??
    new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

  const periodKey = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;

  // Get previous period's ending state
  const previousEnd = new Date(periodStart);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const { data: previousCustomersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, status")
    .eq("organization_id", organizationId)
    .lte("created_at", previousEnd.toISOString());

  type CustomerBasic = { id: string; mrr: number | null; status: string | null };
  const previousCustomers = (previousCustomersRaw || []) as CustomerBasic[];

  const previousActive = previousCustomers.filter((c) => c.status === "active");
  const previousMrrMap = new Map(previousActive.map((c) => [c.id, Number(c.mrr) || 0]));
  const startingMrr = Array.from(previousMrrMap.values()).reduce((a, b) => a + b, 0);

  // Get customers created in this period (new)
  const { data: newCustomersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, status")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", periodEnd.toISOString());

  const newCustomers = (newCustomersRaw || []) as CustomerBasic[];
  const newMrr = newCustomers.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
  const newCustomerCount = newCustomers.length;

  // Get expansion/contraction events
  const { data: expansionEventsRaw } = await supabase
    .from("customer_expansion_events")
    .select("customer_id, event_type, delta_mrr")
    .eq("organization_id", organizationId)
    .gte("occurred_at", periodStart.toISOString())
    .lte("occurred_at", periodEnd.toISOString());

  type ExpansionEvent = { customer_id: string; event_type: string | null; delta_mrr: number | null };
  const expansionEvents = (expansionEventsRaw || []) as ExpansionEvent[];

  let expansionMrr = 0;
  let contractionMrr = 0;
  const expansionCustomerIds = new Set<string>();
  const contractionCustomerIds = new Set<string>();

  for (const event of expansionEvents) {
    const delta = Number(event.delta_mrr) || 0;

    if (event.event_type === "upgrade" || event.event_type === "expansion") {
      expansionMrr += delta;
      expansionCustomerIds.add(event.customer_id);
    } else if (event.event_type === "downgrade" || event.event_type === "contraction") {
      contractionMrr += Math.abs(delta);
      contractionCustomerIds.add(event.customer_id);
    }
  }

  // Get churned customers
  const { data: currentCustomersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, status, churned_at")
    .eq("organization_id", organizationId)
    .eq("status", "churned")
    .gte("churned_at", periodStart.toISOString())
    .lte("churned_at", periodEnd.toISOString());

  type CustomerChurn = { id: string; mrr: number | null; status: string | null; churned_at: string | null };
  const currentCustomers = (currentCustomersRaw || []) as CustomerChurn[];

  // Only count churn from customers that existed before this period
  const churnedFromExisting = currentCustomers.filter((c) => previousMrrMap.has(c.id));
  const churnMrr = churnedFromExisting.reduce((sum, c) => sum + (previousMrrMap.get(c.id) || 0), 0);
  const churnedCustomerCount = churnedFromExisting.length;

  // Get reactivations (customers who were churned and came back)
  // TODO: Track reactivations more precisely with a status change log
  const reactivationMrr = 0;
  const reactivatedCount = 0;

  // Calculate net new MRR
  const netNewMrr = newMrr + expansionMrr + reactivationMrr - contractionMrr - churnMrr;
  const endingMrr = startingMrr + netNewMrr;

  return {
    period: periodKey,
    startingMrr,
    newMrr,
    expansionMrr,
    contractionMrr,
    churnMrr,
    reactivationMrr,
    netNewMrr,
    endingMrr,
    newCustomers: newCustomerCount,
    expansionCustomers: expansionCustomerIds.size,
    contractionCustomers: contractionCustomerIds.size,
    churnedCustomers: churnedCustomerCount,
    reactivatedCustomers: reactivatedCount,
  };
}

/**
 * Calculate MRR movements for multiple periods (waterfall)
 */
export async function calculateMRRWaterfall(
  supabase: DbClient,
  organizationId: string,
  options: {
    months?: number;
  } = {}
): Promise<MRRMovement[]> {
  const months = options.months ?? 12;
  const results: MRRMovement[] = [];

  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const movement = await calculateMRRMovements(supabase, organizationId, {
      periodStart,
      periodEnd,
    });

    results.push(movement);
  }

  return results;
}

/**
 * Calculate MRR growth and concentration metrics
 */
export async function calculateMRRGrowthMetrics(
  supabase: DbClient,
  organizationId: string
): Promise<MRRGrowthMetrics> {
  // Get current customers
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  type CustomerMrr = { id: string; mrr: number | null };
  const customers = (customersRaw || []) as CustomerMrr[];
  const mrrValues = customers.map((c) => Number(c.mrr) || 0).sort((a, b) => b - a);
  const currentMrr = mrrValues.reduce((a, b) => a + b, 0);

  // Get previous month's MRR
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const previousMovement = await calculateMRRMovements(supabase, organizationId, {
    periodEnd: oneMonthAgo,
  });
  const previousMrr = previousMovement.endingMrr || currentMrr;

  // Get YoY comparison
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const yearAgoMovement = await calculateMRRMovements(supabase, organizationId, {
    periodEnd: oneYearAgo,
  });
  const yearAgoMrr = yearAgoMovement.endingMrr || currentMrr;

  // Calculate current period movements for quick ratio
  const currentMovement = await calculateMRRMovements(supabase, organizationId);

  const gains = currentMovement.newMrr + currentMovement.expansionMrr + currentMovement.reactivationMrr;
  const losses = currentMovement.contractionMrr + currentMovement.churnMrr;
  const quickRatio = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;

  // Calculate concentration
  const customerCount = mrrValues.length;
  const top10Count = Math.max(1, Math.ceil(customerCount * 0.1));
  const top20Count = Math.max(1, Math.ceil(customerCount * 0.2));

  const top10Revenue = mrrValues.slice(0, top10Count).reduce((a, b) => a + b, 0);
  const top20Revenue = mrrValues.slice(0, top20Count).reduce((a, b) => a + b, 0);

  const top10Percent = currentMrr > 0 ? top10Revenue / currentMrr : 0;
  const top20Percent = currentMrr > 0 ? top20Revenue / currentMrr : 0;

  // Calculate Gini coefficient
  const giniCoefficient = calculateGini(mrrValues);

  return {
    currentMrr,
    previousMrr,
    mrrGrowthRate: previousMrr > 0 ? (currentMrr - previousMrr) / previousMrr : 0,
    momGrowthRate: previousMrr > 0 ? (currentMrr - previousMrr) / previousMrr : 0,
    yoyGrowthRate: yearAgoMrr > 0 ? (currentMrr - yearAgoMrr) / yearAgoMrr : 0,
    quickRatio,
    avgMrrPerCustomer: customerCount > 0 ? currentMrr / customerCount : 0,
    mrrConcentration: {
      top10Percent,
      top20Percent,
      giniCoefficient,
    },
  };
}

/**
 * Calculate Gini coefficient for revenue concentration
 * 0 = perfect equality, 1 = perfect inequality
 */
function calculateGini(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((a, b) => a + b, 0);

  if (total === 0) return 0;

  let sumOfDifferences = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfDifferences += Math.abs(sorted[i] - sorted[j]);
    }
  }

  return sumOfDifferences / (2 * n * total);
}

/**
 * Calculate MRR by segment
 */
export async function calculateMRRBySegment(
  supabase: DbClient,
  organizationId: string
): Promise<Record<string, { mrr: number; customerCount: number; avgMrr: number }>> {
  // Get segment names
  const { data: segmentsRaw } = await supabase
    .from("segments")
    .select("id, name")
    .eq("organization_id", organizationId);

  type SegmentBasic = { id: string; name: string };
  const segments = (segmentsRaw || []) as SegmentBasic[];
  const segmentMap = new Map(segments.map((s) => [s.id, s.name]));

  // Get customers with MRR
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("segment_id, mrr")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  type CustomerSegmentMrr = { segment_id: string | null; mrr: number | null };
  const customers = (customersRaw || []) as CustomerSegmentMrr[];

  const result: Record<string, { mrr: number; customerCount: number; avgMrr: number }> = {};

  for (const customer of customers) {
    const segmentName = customer.segment_id
      ? segmentMap.get(customer.segment_id) || "Unknown"
      : "Unknown";

    if (!result[segmentName]) {
      result[segmentName] = { mrr: 0, customerCount: 0, avgMrr: 0 };
    }

    result[segmentName].mrr += Number(customer.mrr) || 0;
    result[segmentName].customerCount++;
  }

  // Calculate averages
  for (const segment of Object.keys(result)) {
    result[segment].avgMrr =
      result[segment].customerCount > 0
        ? result[segment].mrr / result[segment].customerCount
        : 0;
  }

  return result;
}
