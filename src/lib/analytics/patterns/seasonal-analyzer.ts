/**
 * Seasonal Analyzer
 * Detects seasonality patterns in revenue and customer behavior
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export interface SeasonalPattern {
  patternType: "monthly" | "quarterly" | "annual";
  peakPeriods: string[];
  troughPeriods: string[];
  amplitude: number; // % deviation from mean
  confidence: number;
  description: string;
}

export interface MonthlyTrend {
  month: number; // 1-12
  avgMrr: number;
  avgNewCustomers: number;
  avgChurn: number;
  seasonalIndex: number; // 1.0 = average, >1 = above average
}

export interface SeasonalAnalysisResult {
  hasSeasonality: boolean;
  patterns: SeasonalPattern[];
  monthlyTrends: MonthlyTrend[];
  bestMonthsForAcquisition: number[];
  worstMonthsForChurn: number[];
  insights: string[];
}

/**
 * Analyze seasonality in business metrics
 */
export async function analyzeSeasonality(
  supabase: DbClient,
  organizationId: string,
  options: {
    lookbackMonths?: number;
    minDataPoints?: number;
  } = {}
): Promise<SeasonalAnalysisResult> {
  const lookbackMonths = options.lookbackMonths ?? 24;
  const minDataPoints = options.minDataPoints ?? 12;

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

  // Get historical MRR data from economics snapshots
  const { data: snapshotsRaw } = await supabase
    .from("economics_snapshots")
    .select("snapshot_date, total_mrr, total_customers")
    .eq("organization_id", organizationId)
    .gte("snapshot_date", cutoffDate.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });

  type Snapshot = { snapshot_date: string; total_mrr: number | null; total_customers: number | null };
  const snapshots = (snapshotsRaw || []) as Snapshot[];

  // Get customer creation dates
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("created_at, churned_at, mrr")
    .eq("organization_id", organizationId)
    .gte("created_at", cutoffDate.toISOString());

  type CustomerSeasonal = { created_at: string; churned_at: string | null; mrr: number | null };
  const customers = (customersRaw || []) as CustomerSeasonal[];

  // Group data by month
  const monthlyData = new Map<
    string,
    {
      mrr: number[];
      newCustomers: number;
      churns: number;
    }
  >();

  // Initialize all months
  for (let i = 0; i < lookbackMonths; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyData.set(key, { mrr: [], newCustomers: 0, churns: 0 });
  }

  // Add snapshot MRR data
  for (const snapshot of snapshots) {
    const date = new Date(snapshot.snapshot_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyData.has(key)) {
      monthlyData.get(key)!.mrr.push(Number(snapshot.total_mrr) || 0);
    }
  }

  // Add customer creation/churn data
  for (const customer of customers) {
    const createdDate = new Date(customer.created_at);
    const createdKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyData.has(createdKey)) {
      monthlyData.get(createdKey)!.newCustomers++;
    }

    if (customer.churned_at) {
      const churnDate = new Date(customer.churned_at);
      const churnKey = `${churnDate.getFullYear()}-${String(churnDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData.has(churnKey)) {
        monthlyData.get(churnKey)!.churns++;
      }
    }
  }

  // Check if we have enough data
  const dataPoints = Array.from(monthlyData.values()).filter((d) => d.mrr.length > 0).length;
  if (dataPoints < minDataPoints) {
    return {
      hasSeasonality: false,
      patterns: [],
      monthlyTrends: [],
      bestMonthsForAcquisition: [],
      worstMonthsForChurn: [],
      insights: ["Insufficient historical data for seasonal analysis. Need at least 12 months."],
    };
  }

  // Calculate monthly averages (grouped by month number)
  const monthlyAverages = new Map<
    number,
    {
      mrrValues: number[];
      newCustomerValues: number[];
      churnValues: number[];
    }
  >();

  for (let month = 1; month <= 12; month++) {
    monthlyAverages.set(month, { mrrValues: [], newCustomerValues: [], churnValues: [] });
  }

  for (const [key, data] of monthlyData) {
    const month = parseInt(key.split("-")[1]);
    const monthData = monthlyAverages.get(month)!;

    if (data.mrr.length > 0) {
      monthData.mrrValues.push(data.mrr.reduce((a, b) => a + b, 0) / data.mrr.length);
    }
    monthData.newCustomerValues.push(data.newCustomers);
    monthData.churnValues.push(data.churns);
  }

  // Calculate seasonal indices
  const monthlyTrends: MonthlyTrend[] = [];
  let totalAvgMrr = 0;
  let totalAvgNew = 0;
  let totalAvgChurn = 0;
  let monthCount = 0;

  for (let month = 1; month <= 12; month++) {
    const data = monthlyAverages.get(month)!;

    const avgMrr =
      data.mrrValues.length > 0
        ? data.mrrValues.reduce((a, b) => a + b, 0) / data.mrrValues.length
        : 0;
    const avgNew =
      data.newCustomerValues.length > 0
        ? data.newCustomerValues.reduce((a, b) => a + b, 0) / data.newCustomerValues.length
        : 0;
    const avgChurn =
      data.churnValues.length > 0
        ? data.churnValues.reduce((a, b) => a + b, 0) / data.churnValues.length
        : 0;

    if (avgMrr > 0) {
      totalAvgMrr += avgMrr;
      totalAvgNew += avgNew;
      totalAvgChurn += avgChurn;
      monthCount++;
    }

    monthlyTrends.push({
      month,
      avgMrr,
      avgNewCustomers: avgNew,
      avgChurn,
      seasonalIndex: 1.0, // Will be calculated below
    });
  }

  // Calculate overall averages
  const overallAvgMrr = monthCount > 0 ? totalAvgMrr / monthCount : 0;
  const overallAvgNew = monthCount > 0 ? totalAvgNew / monthCount : 0;
  const overallAvgChurn = monthCount > 0 ? totalAvgChurn / monthCount : 0;

  // Update seasonal indices
  for (const trend of monthlyTrends) {
    trend.seasonalIndex = overallAvgMrr > 0 ? trend.avgMrr / overallAvgMrr : 1.0;
  }

  // Detect patterns
  const patterns = detectPatterns(monthlyTrends);

  // Find best/worst months
  const sortedByNew = [...monthlyTrends].sort((a, b) => b.avgNewCustomers - a.avgNewCustomers);
  const sortedByChurn = [...monthlyTrends].sort((a, b) => b.avgChurn - a.avgChurn);

  const bestMonthsForAcquisition = sortedByNew.slice(0, 3).map((t) => t.month);
  const worstMonthsForChurn = sortedByChurn.slice(0, 3).map((t) => t.month);

  // Generate insights
  const insights = generateSeasonalInsights(
    patterns,
    monthlyTrends,
    bestMonthsForAcquisition,
    worstMonthsForChurn
  );

  return {
    hasSeasonality: patterns.length > 0,
    patterns,
    monthlyTrends,
    bestMonthsForAcquisition,
    worstMonthsForChurn,
    insights,
  };
}

/**
 * Detect seasonal patterns from monthly data
 */
function detectPatterns(monthlyTrends: MonthlyTrend[]): SeasonalPattern[] {
  const patterns: SeasonalPattern[] = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Find peaks and troughs
  const indices = monthlyTrends.map((t) => t.seasonalIndex);
  const mean = 1.0;
  const stdDev = Math.sqrt(
    indices.reduce((sum, i) => sum + (i - mean) ** 2, 0) / indices.length
  );

  // Significant deviation threshold
  const threshold = 0.15; // 15% deviation

  // Monthly pattern (monthly peaks/troughs)
  const peakMonths = monthlyTrends
    .filter((t) => t.seasonalIndex > mean + threshold)
    .map((t) => monthNames[t.month - 1]);
  const troughMonths = monthlyTrends
    .filter((t) => t.seasonalIndex < mean - threshold)
    .map((t) => monthNames[t.month - 1]);

  if (peakMonths.length > 0 || troughMonths.length > 0) {
    const amplitude = stdDev * 100;

    patterns.push({
      patternType: "monthly",
      peakPeriods: peakMonths,
      troughPeriods: troughMonths,
      amplitude,
      confidence: Math.min(0.5 + amplitude / 50, 0.95),
      description: `Monthly variation detected. Peak months: ${peakMonths.join(", ") || "None"}. Low months: ${troughMonths.join(", ") || "None"}.`,
    });
  }

  // Quarterly pattern
  const quarters = [
    { name: "Q1", months: [1, 2, 3] },
    { name: "Q2", months: [4, 5, 6] },
    { name: "Q3", months: [7, 8, 9] },
    { name: "Q4", months: [10, 11, 12] },
  ];

  const quarterlyIndices = quarters.map((q) => {
    const qMonths = monthlyTrends.filter((t) => q.months.includes(t.month));
    return {
      name: q.name,
      avgIndex: qMonths.reduce((sum, t) => sum + t.seasonalIndex, 0) / qMonths.length,
    };
  });

  const peakQuarters = quarterlyIndices
    .filter((q) => q.avgIndex > mean + threshold)
    .map((q) => q.name);
  const troughQuarters = quarterlyIndices
    .filter((q) => q.avgIndex < mean - threshold)
    .map((q) => q.name);

  if (peakQuarters.length > 0 || troughQuarters.length > 0) {
    const qIndices = quarterlyIndices.map((q) => q.avgIndex);
    const qStdDev = Math.sqrt(
      qIndices.reduce((sum, i) => sum + (i - mean) ** 2, 0) / qIndices.length
    );

    patterns.push({
      patternType: "quarterly",
      peakPeriods: peakQuarters,
      troughPeriods: troughQuarters,
      amplitude: qStdDev * 100,
      confidence: 0.7,
      description: `Quarterly pattern detected. Strong quarters: ${peakQuarters.join(", ") || "None"}. Weak quarters: ${troughQuarters.join(", ") || "None"}.`,
    });
  }

  // Annual pattern (year-end effects)
  const yearEndMonths = monthlyTrends.filter((t) => [11, 12, 1].includes(t.month));
  const midYearMonths = monthlyTrends.filter((t) => [6, 7, 8].includes(t.month));

  const yearEndAvg =
    yearEndMonths.length > 0
      ? yearEndMonths.reduce((sum, t) => sum + t.seasonalIndex, 0) / yearEndMonths.length
      : 1;
  const midYearAvg =
    midYearMonths.length > 0
      ? midYearMonths.reduce((sum, t) => sum + t.seasonalIndex, 0) / midYearMonths.length
      : 1;

  if (Math.abs(yearEndAvg - midYearAvg) > 0.2) {
    patterns.push({
      patternType: "annual",
      peakPeriods: yearEndAvg > midYearAvg ? ["Year-end (Nov-Jan)"] : ["Mid-year (Jun-Aug)"],
      troughPeriods: yearEndAvg < midYearAvg ? ["Year-end (Nov-Jan)"] : ["Mid-year (Jun-Aug)"],
      amplitude: Math.abs(yearEndAvg - midYearAvg) * 100,
      confidence: 0.6,
      description: `Annual pattern: ${yearEndAvg > midYearAvg ? "Year-end" : "Mid-year"} performance is typically stronger.`,
    });
  }

  return patterns;
}

/**
 * Generate insights from seasonal analysis
 */
function generateSeasonalInsights(
  patterns: SeasonalPattern[],
  monthlyTrends: MonthlyTrend[],
  bestMonths: number[],
  worstMonths: number[]
): string[] {
  const insights: string[] = [];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (patterns.length === 0) {
    insights.push("No significant seasonal patterns detected in the data.");
    return insights;
  }

  // Pattern descriptions
  for (const pattern of patterns) {
    if (pattern.amplitude > 10) {
      insights.push(pattern.description);
    }
  }

  // Best months for acquisition
  if (bestMonths.length > 0) {
    const bestMonthNames = bestMonths.map((m) => monthNames[m - 1]).slice(0, 2);
    insights.push(
      `Best months for customer acquisition: ${bestMonthNames.join(" and ")}. Plan campaigns accordingly.`
    );
  }

  // Churn risk months
  if (worstMonths.length > 0) {
    const worstMonthNames = worstMonths.map((m) => monthNames[m - 1]).slice(0, 2);
    insights.push(
      `Highest churn typically in ${worstMonthNames.join(" and ")}. Increase retention efforts during these periods.`
    );
  }

  return insights;
}

/**
 * Store seasonal patterns in the database
 */
export async function storeSeasonalPatterns(
  supabase: DbClient,
  organizationId: string,
  result: SeasonalAnalysisResult
): Promise<void> {
  if (result.patterns.length === 0) return;

  const patternRecords = result.patterns.map((pattern) => ({
    organization_id: organizationId,
    pattern_type: "seasonal" as const,
    name: `Seasonal: ${pattern.patternType} pattern`,
    description: pattern.description,
    affected_segments: [],
    affected_tiers: [],
    frequency: pattern.amplitude / 100,
    confidence: pattern.confidence,
    sample_size: result.monthlyTrends.length,
    recommended_action:
      pattern.patternType === "monthly"
        ? "Align marketing campaigns with peak periods"
        : "Plan resource allocation around seasonal trends",
    pattern_definition: {
      patternType: pattern.patternType,
      peakPeriods: pattern.peakPeriods,
      troughPeriods: pattern.troughPeriods,
      amplitude: pattern.amplitude,
      monthlyTrends: result.monthlyTrends,
    },
    is_active: true,
    detected_at: new Date().toISOString(),
  }));

  await supabase.from("patterns").insert(patternRecords as never[]);
}
