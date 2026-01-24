/**
 * Analytics Engine
 * Main orchestrator for all analytics computations
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Re-export everything from submodules
export * from "./economics";
export * from "./segmentation";
export * from "./patterns";
export * from "./value-metrics";
export * from "./health/health-score-calculator";

// Import types for use in this file
import type { CohortData, LTVMetrics, RetentionMetrics, MRRGrowthMetrics } from "./economics";
import type { SegmentationAnalysisResult } from "./segmentation";
import type { UpgradeAnalysisResult, ChurnAnalysisResult, SeasonalAnalysisResult } from "./patterns";
import type { CorrelationAnalysisResult, FeatureImportanceResult } from "./value-metrics";
import type { HealthScoreAnalysisResult } from "./health/health-score-calculator";

type DbClient = SupabaseClient<Database>;

export interface AnalyticsRunProgress {
  runId: string;
  status: "running" | "completed" | "failed";
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  startedAt: Date;
  completedAt?: Date;
  results?: FullAnalyticsResult;
  error?: string;
}

export interface FullAnalyticsResult {
  economics: {
    cohortRetention: CohortData[];
    ltv: LTVMetrics;
    retention: RetentionMetrics;
    mrrGrowth: MRRGrowthMetrics;
  };
  segmentation: SegmentationAnalysisResult;
  patterns: {
    upgrades: UpgradeAnalysisResult;
    churnRisk: ChurnAnalysisResult;
    seasonality: SeasonalAnalysisResult;
  };
  valueMetrics: CorrelationAnalysisResult;
  health: HealthScoreAnalysisResult;
  summary: OntologySummary;
}

export interface OntologySummary {
  generatedAt: Date;
  customerCount: number;
  totalMrr: number;
  segmentCount: number;
  keyInsights: string[];
  healthDistribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
  primaryValueMetric: string | null;
  topPatterns: string[];
}

/**
 * Run full analytics pipeline
 */
export async function runFullAnalytics(
  supabase: DbClient,
  organizationId: string,
  options: {
    onProgress?: (progress: AnalyticsRunProgress) => void;
  } = {}
): Promise<FullAnalyticsResult> {
  const runId = crypto.randomUUID();
  const startedAt = new Date();

  const progress: AnalyticsRunProgress = {
    runId,
    status: "running",
    currentStep: "Initializing",
    totalSteps: 8,
    completedSteps: 0,
    startedAt,
  };

  const updateProgress = (step: string, completed: number) => {
    progress.currentStep = step;
    progress.completedSteps = completed;
    options.onProgress?.(progress);
  };

  // Log run start
  await supabase.from("analytics_run_log").insert({
    id: runId,
    organization_id: organizationId,
    run_type: "full_refresh",
    status: "running",
    total_steps: 8,
    completed_steps: 0,
    current_step: "Initializing",
  } as never);

  try {
    // Dynamic imports to avoid circular dependencies
    const economicsModule = await import("./economics");
    const segmentationModule = await import("./segmentation");
    const patternsModule = await import("./patterns");
    const valueMetricsModule = await import("./value-metrics");
    const healthModule = await import("./health/health-score-calculator");

    // Step 1: Cohort Retention Analysis
    updateProgress("Analyzing cohort retention", 0);
    const cohortData = await economicsModule.analyzeCohortRetention(supabase, organizationId);
    await economicsModule.storeCohortRetention(supabase, organizationId, cohortData);
    updateProgress("Cohort retention complete", 1);

    // Step 2: LTV Calculation
    updateProgress("Calculating LTV metrics", 1);
    const ltvMetrics = await economicsModule.calculateLTV(supabase, organizationId);
    updateProgress("LTV calculation complete", 2);

    // Step 3: Retention Metrics
    updateProgress("Computing retention metrics", 2);
    const retentionMetrics = await economicsModule.calculateRetentionMetrics(supabase, organizationId);
    const mrrGrowthMetrics = await economicsModule.calculateMRRGrowthMetrics(supabase, organizationId);
    updateProgress("Retention metrics complete", 3);

    // Step 4: Segmentation Analysis
    updateProgress("Running segmentation analysis", 3);
    const segmentationResult = await segmentationModule.runSegmentationAnalysis(supabase, organizationId);
    await segmentationModule.assignCustomersToSegments(supabase, organizationId, segmentationResult);
    const rfmScores = await segmentationModule.calculateRFMScores(supabase, organizationId);
    await segmentationModule.storeRFMScores(supabase, organizationId, rfmScores);
    updateProgress("Segmentation complete", 4);

    // Step 5: Pattern Detection
    updateProgress("Detecting behavioral patterns", 4);
    const upgradeResult = await patternsModule.detectUpgradeCandidates(supabase, organizationId);
    await patternsModule.storeUpgradePatterns(supabase, organizationId, upgradeResult);
    const churnResult = await patternsModule.detectChurnRisk(supabase, organizationId);
    await patternsModule.storeChurnPatterns(supabase, organizationId, churnResult);
    const seasonalResult = await patternsModule.analyzeSeasonality(supabase, organizationId);
    await patternsModule.storeSeasonalPatterns(supabase, organizationId, seasonalResult);
    updateProgress("Pattern detection complete", 5);

    // Step 6: Value Metric Discovery
    updateProgress("Analyzing value metrics", 5);
    const correlationResult = await valueMetricsModule.analyzeMetricCorrelations(supabase, organizationId);
    await valueMetricsModule.storeCorrelationResults(supabase, organizationId, correlationResult);
    const featureImportance = valueMetricsModule.calculateFeatureImportance(correlationResult.correlations);
    updateProgress("Value metrics complete", 6);

    // Step 7: Health Scoring
    updateProgress("Calculating health scores", 6);
    const healthResult = await healthModule.calculateHealthScores(supabase, organizationId);
    await healthModule.storeHealthScores(supabase, organizationId, healthResult.scores);
    updateProgress("Health scores complete", 7);

    // Step 8: Create Ontology Summary
    updateProgress("Generating ontology summary", 7);
    const summary = createOntologySummary(
      segmentationResult,
      upgradeResult,
      churnResult,
      featureImportance,
      healthResult
    );

    // Create economics snapshot
    await createEconomicsSnapshot(supabase, organizationId, {
      ltvMetrics,
      retentionMetrics,
      mrrGrowthMetrics,
      healthResult,
    });

    updateProgress("Complete", 8);

    const result: FullAnalyticsResult = {
      economics: {
        cohortRetention: cohortData,
        ltv: ltvMetrics,
        retention: retentionMetrics,
        mrrGrowth: mrrGrowthMetrics,
      },
      segmentation: segmentationResult,
      patterns: {
        upgrades: upgradeResult,
        churnRisk: churnResult,
        seasonality: seasonalResult,
      },
      valueMetrics: correlationResult,
      health: healthResult,
      summary,
    };

    // Update run log
    await supabase
      .from("analytics_run_log")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_steps: 8,
        current_step: "Complete",
        result_summary: summary,
      } as never)
      .eq("id", runId);

    progress.status = "completed";
    progress.completedAt = new Date();
    progress.results = result;
    options.onProgress?.(progress);

    return result;
  } catch (error) {
    // Log failure
    await supabase
      .from("analytics_run_log")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_details: [{ error: error instanceof Error ? error.message : "Unknown error" }],
      } as never)
      .eq("id", runId);

    progress.status = "failed";
    progress.error = error instanceof Error ? error.message : "Unknown error";
    options.onProgress?.(progress);

    throw error;
  }
}

/**
 * Create ontology summary from analysis results
 */
function createOntologySummary(
  segmentation: SegmentationAnalysisResult,
  upgrades: UpgradeAnalysisResult,
  churnRisk: ChurnAnalysisResult,
  featureImportance: FeatureImportanceResult,
  health: HealthScoreAnalysisResult
): OntologySummary {
  // Collect all insights
  const allInsights: string[] = [];

  // Add health insights
  allInsights.push(...health.insights.slice(0, 2));

  // Add pattern insights
  if (upgrades.insights.length > 0) {
    allInsights.push(upgrades.insights[0]);
  }
  if (churnRisk.insights.length > 0) {
    allInsights.push(churnRisk.insights[0]);
  }

  // Add feature importance insights
  if (featureImportance.insights.length > 0) {
    allInsights.push(featureImportance.insights[0]);
  }

  // Top patterns
  const topPatterns: string[] = [];
  if (upgrades.candidates.length > 0) {
    topPatterns.push(`${upgrades.candidates.length} upgrade candidates identified`);
  }
  if (churnRisk.atRiskCustomers.length > 0) {
    topPatterns.push(`${churnRisk.atRiskCustomers.length} customers at churn risk`);
  }

  return {
    generatedAt: new Date(),
    customerCount: health.scores.length,
    totalMrr: segmentation.segments.reduce((sum, s) => sum + s.totalRevenue, 0),
    segmentCount: segmentation.segments.length,
    keyInsights: allInsights.slice(0, 5),
    healthDistribution: health.distribution,
    primaryValueMetric: featureImportance.primaryValueMetric?.metricDescription || null,
    topPatterns,
  };
}

/**
 * Create economics snapshot
 */
async function createEconomicsSnapshot(
  supabase: DbClient,
  organizationId: string,
  data: {
    ltvMetrics: LTVMetrics;
    retentionMetrics: RetentionMetrics;
    mrrGrowthMetrics: MRRGrowthMetrics;
    healthResult: HealthScoreAnalysisResult;
  }
): Promise<void> {
  const snapshot = {
    organization_id: organizationId,
    snapshot_date: new Date().toISOString().split("T")[0],
    total_mrr: data.mrrGrowthMetrics.currentMrr,
    total_arr: data.mrrGrowthMetrics.currentMrr * 12,
    total_customers: data.healthResult.scores.length,
    net_revenue_retention: data.retentionMetrics.netRevenueRetention * 100,
    gross_revenue_retention: data.retentionMetrics.grossRevenueRetention * 100,
    mrr_growth_rate: data.retentionMetrics.expansionRate * 100,
    top_10_pct_revenue_share: data.mrrGrowthMetrics.mrrConcentration.top10Percent,
    top_customer_revenue_share: data.mrrGrowthMetrics.mrrConcentration.top10Percent,
    hhi_index: data.mrrGrowthMetrics.mrrConcentration.giniCoefficient * 10000,
    concentration_risk_level: getConcentrationRiskLevel(
      data.mrrGrowthMetrics.mrrConcentration.top10Percent
    ),
    concentration_description: `Top 10% contributes ${(data.mrrGrowthMetrics.mrrConcentration.top10Percent * 100).toFixed(0)}% of revenue`,
    segment_economics: [],
    price_sensitivity_model: {},
  };

  await supabase.from("economics_snapshots").insert(snapshot as never);
}

function getConcentrationRiskLevel(top10Share: number): "low" | "moderate" | "high" | "critical" {
  if (top10Share > 0.7) return "critical";
  if (top10Share > 0.5) return "high";
  if (top10Share > 0.3) return "moderate";
  return "low";
}

/**
 * Get latest analytics results for an organization
 */
export async function getLatestAnalytics(
  supabase: DbClient,
  organizationId: string
): Promise<{
  lastRun: Date | null;
  status: string;
  summary: OntologySummary | null;
}> {
  const { data: dataRaw } = await supabase
    .from("analytics_run_log")
    .select("*")
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (!dataRaw) {
    return {
      lastRun: null,
      status: "never_run",
      summary: null,
    };
  }

  type AnalyticsLog = { started_at: string; status: string; result_summary: OntologySummary | null };
  const data = dataRaw as AnalyticsLog;

  return {
    lastRun: new Date(data.started_at),
    status: data.status,
    summary: data.result_summary || null,
  };
}
