/**
 * Correlation Analyzer
 * Discovers correlations between usage metrics and business outcomes
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface MetricCorrelation {
  metricName: string;
  metricDescription: string;
  // Correlations (-1 to 1)
  correlationToRetention: number;
  correlationToExpansion: number;
  correlationToChurn: number;
  // Statistical significance (p-values)
  pValueRetention: number;
  pValueExpansion: number;
  pValueChurn: number;
  // Sample info
  sampleSize: number;
  analysisPeriodStart: string;
  analysisPeriodEnd: string;
}

export interface CorrelationAnalysisResult {
  correlations: MetricCorrelation[];
  topRetentionDrivers: MetricCorrelation[];
  topExpansionDrivers: MetricCorrelation[];
  topChurnPredictors: MetricCorrelation[];
  insights: string[];
}

interface CustomerMetrics {
  customerId: string;
  metrics: Record<string, number>;
  outcome: {
    retained: boolean;
    expanded: boolean;
    churned: boolean;
    expansionAmount: number;
  };
}

/**
 * Analyze correlations between metrics and outcomes
 */
export async function analyzeMetricCorrelations(
  supabase: DbClient,
  organizationId: string,
  options: {
    lookbackMonths?: number;
    minSampleSize?: number;
  } = {}
): Promise<CorrelationAnalysisResult> {
  const lookbackMonths = options.lookbackMonths ?? 12;
  const minSampleSize = options.minSampleSize ?? 30;

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);
  const periodStart = cutoffDate.toISOString();
  const periodEnd = new Date().toISOString();

  // Get customer data with outcomes
  const customerMetrics = await getCustomerMetricsWithOutcomes(
    supabase,
    organizationId,
    cutoffDate
  );

  if (customerMetrics.length < minSampleSize) {
    return {
      correlations: [],
      topRetentionDrivers: [],
      topExpansionDrivers: [],
      topChurnPredictors: [],
      insights: [
        `Insufficient sample size (${customerMetrics.length} customers). Need at least ${minSampleSize} for correlation analysis.`,
      ],
    };
  }

  // Get all available metric names
  const metricNames = new Set<string>();
  for (const customer of customerMetrics) {
    Object.keys(customer.metrics).forEach((m) => metricNames.add(m));
  }

  // Calculate correlations for each metric
  const correlations: MetricCorrelation[] = [];

  for (const metricName of metricNames) {
    const metricValues: number[] = [];
    const retentionOutcomes: number[] = [];
    const expansionOutcomes: number[] = [];
    const churnOutcomes: number[] = [];

    for (const customer of customerMetrics) {
      const value = customer.metrics[metricName];
      if (value !== undefined) {
        metricValues.push(value);
        retentionOutcomes.push(customer.outcome.retained ? 1 : 0);
        expansionOutcomes.push(customer.outcome.expansionAmount);
        churnOutcomes.push(customer.outcome.churned ? 1 : 0);
      }
    }

    if (metricValues.length < minSampleSize) continue;

    const retentionCorr = pearsonCorrelation(metricValues, retentionOutcomes);
    const expansionCorr = pearsonCorrelation(metricValues, expansionOutcomes);
    const churnCorr = pearsonCorrelation(metricValues, churnOutcomes);

    // Calculate p-values
    const n = metricValues.length;
    const pRetention = calculatePValue(retentionCorr, n);
    const pExpansion = calculatePValue(expansionCorr, n);
    const pChurn = calculatePValue(churnCorr, n);

    correlations.push({
      metricName,
      metricDescription: getMetricDescription(metricName),
      correlationToRetention: retentionCorr,
      correlationToExpansion: expansionCorr,
      correlationToChurn: churnCorr,
      pValueRetention: pRetention,
      pValueExpansion: pExpansion,
      pValueChurn: pChurn,
      sampleSize: n,
      analysisPeriodStart: periodStart,
      analysisPeriodEnd: periodEnd,
    });
  }

  // Sort and filter top drivers
  const significantCorrelations = correlations.filter(
    (c) => c.pValueRetention < 0.05 || c.pValueExpansion < 0.05 || c.pValueChurn < 0.05
  );

  const topRetentionDrivers = [...significantCorrelations]
    .filter((c) => c.pValueRetention < 0.05 && c.correlationToRetention > 0)
    .sort((a, b) => b.correlationToRetention - a.correlationToRetention)
    .slice(0, 5);

  const topExpansionDrivers = [...significantCorrelations]
    .filter((c) => c.pValueExpansion < 0.05 && c.correlationToExpansion > 0)
    .sort((a, b) => b.correlationToExpansion - a.correlationToExpansion)
    .slice(0, 5);

  const topChurnPredictors = [...significantCorrelations]
    .filter((c) => c.pValueChurn < 0.05 && c.correlationToChurn > 0)
    .sort((a, b) => b.correlationToChurn - a.correlationToChurn)
    .slice(0, 5);

  // Generate insights
  const insights = generateCorrelationInsights(
    topRetentionDrivers,
    topExpansionDrivers,
    topChurnPredictors
  );

  return {
    correlations,
    topRetentionDrivers,
    topExpansionDrivers,
    topChurnPredictors,
    insights,
  };
}

/**
 * Get customer metrics with their outcomes
 */
async function getCustomerMetricsWithOutcomes(
  supabase: DbClient,
  organizationId: string,
  cutoffDate: Date
): Promise<CustomerMetrics[]> {
  // Get customers that existed at cutoff
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, tenure_months, company_size, status, churned_at")
    .eq("organization_id", organizationId)
    .lte("created_at", cutoffDate.toISOString());

  type CustomerCorrelation = { id: string; mrr: number | null; tenure_months: number | null; company_size: string | null; status: string | null; churned_at: string | null };
  const customers = (customersRaw || []) as CustomerCorrelation[];

  if (customers.length === 0) return [];

  // Get expansion events after cutoff
  const { data: expansionsRaw } = await supabase
    .from("customer_expansion_events")
    .select("customer_id, delta_mrr")
    .eq("organization_id", organizationId)
    .gte("occurred_at", cutoffDate.toISOString());

  type ExpansionCorrelation = { customer_id: string; delta_mrr: number | null };
  const expansions = (expansionsRaw || []) as ExpansionCorrelation[];

  const expansionByCustomer = new Map<string, number>();
  for (const e of expansions) {
    const delta = Number(e.delta_mrr) || 0;
    if (delta > 0) {
      expansionByCustomer.set(e.customer_id, (expansionByCustomer.get(e.customer_id) || 0) + delta);
    }
  }

  // Build metrics for each customer
  const result: CustomerMetrics[] = [];

  for (const customer of customers) {
    const mrr = Number(customer.mrr) || 0;
    const tenure = customer.tenure_months || 0;
    const companySizeMap: Record<string, number> = {
      startup: 1,
      smb: 2,
      mid_market: 3,
      enterprise: 4,
    };
    const companySize = companySizeMap[customer.company_size || "smb"] || 2;

    // Determine outcomes
    const churned = customer.status === "churned";
    const churnedAfterCutoff =
      churned && customer.churned_at && new Date(customer.churned_at) > cutoffDate;
    const expansionAmount = expansionByCustomer.get(customer.id) || 0;

    result.push({
      customerId: customer.id,
      metrics: {
        mrr,
        tenure_months: tenure,
        company_size: companySize,
        mrr_per_employee: mrr / Math.max(companySize * 10, 1), // Rough estimate
        // In production, would include actual usage metrics:
        // api_calls_monthly, active_users, feature_adoption, etc.
      },
      outcome: {
        retained: !churnedAfterCutoff,
        expanded: expansionAmount > 0,
        churned: churnedAfterCutoff || false,
        expansionAmount,
      },
    });
  }

  return result;
}

/**
 * Calculate Pearson correlation coefficient
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Calculate p-value for correlation (using t-distribution approximation)
 */
function calculatePValue(r: number, n: number): number {
  if (n <= 2) return 1;

  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;

  // Simple approximation of two-tailed p-value
  // In production, would use proper t-distribution CDF
  const absT = Math.abs(t);

  // Rough p-value approximation
  if (absT > 3.5) return 0.001;
  if (absT > 2.5) return 0.01;
  if (absT > 2.0) return 0.05;
  if (absT > 1.5) return 0.1;
  return 0.5;
}

/**
 * Get human-readable metric description
 */
function getMetricDescription(metricName: string): string {
  const descriptions: Record<string, string> = {
    mrr: "Monthly Recurring Revenue",
    tenure_months: "Customer tenure in months",
    company_size: "Company size category",
    mrr_per_employee: "MRR per estimated employee",
    api_calls_monthly: "API calls per month",
    active_users: "Monthly active users",
    feature_adoption: "Feature adoption score",
    support_tickets: "Support tickets opened",
    login_frequency: "Average logins per week",
  };

  return descriptions[metricName] || metricName.replace(/_/g, " ");
}

/**
 * Generate insights from correlation analysis
 */
function generateCorrelationInsights(
  retentionDrivers: MetricCorrelation[],
  expansionDrivers: MetricCorrelation[],
  churnPredictors: MetricCorrelation[]
): string[] {
  const insights: string[] = [];

  if (retentionDrivers.length > 0) {
    const top = retentionDrivers[0];
    insights.push(
      `${top.metricDescription} has the strongest correlation with retention (r=${top.correlationToRetention.toFixed(2)}). Focus on improving this metric.`
    );
  }

  if (expansionDrivers.length > 0) {
    const top = expansionDrivers[0];
    insights.push(
      `${top.metricDescription} is the best predictor of expansion revenue (r=${top.correlationToExpansion.toFixed(2)}). Target customers high on this metric for upgrades.`
    );
  }

  if (churnPredictors.length > 0) {
    const top = churnPredictors[0];
    insights.push(
      `Watch ${top.metricDescription} as an early churn warning (r=${top.correlationToChurn.toFixed(2)} with churn).`
    );
  }

  if (retentionDrivers.length === 0 && expansionDrivers.length === 0) {
    insights.push(
      "No statistically significant correlations found. Consider adding more usage metrics for better analysis."
    );
  }

  return insights;
}

/**
 * Store correlation results in the database
 */
export async function storeCorrelationResults(
  supabase: DbClient,
  organizationId: string,
  result: CorrelationAnalysisResult
): Promise<void> {
  if (result.correlations.length === 0) return;

  const records = result.correlations.map((c) => ({
    organization_id: organizationId,
    metric_name: c.metricName,
    metric_description: c.metricDescription,
    correlation_to_retention: c.correlationToRetention,
    correlation_to_expansion: c.correlationToExpansion,
    correlation_to_churn: c.correlationToChurn,
    p_value_retention: c.pValueRetention,
    p_value_expansion: c.pValueExpansion,
    p_value_churn: c.pValueChurn,
    sample_size: c.sampleSize,
    analysis_period_start: c.analysisPeriodStart,
    analysis_period_end: c.analysisPeriodEnd,
    computed_at: new Date().toISOString(),
  }));

  // Upsert
  await supabase.from("value_metric_correlations").upsert(records as never[], {
    onConflict: "organization_id,metric_name",
  });
}
