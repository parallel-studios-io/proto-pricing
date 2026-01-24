/**
 * Economics Analytics Module
 * Exports all economics-related analytics functions
 */

export {
  analyzeCohortRetention,
  buildRetentionCurves,
  calculateAggregateRetention,
  storeCohortRetention,
  type CohortData,
  type CohortRetentionCurve,
  type AggregateRetentionMetrics,
} from "./cohort-analyzer";

export {
  calculateLTV,
  type LTVMetrics,
  type LTVCalculationOptions,
} from "./ltv-calculator";

export {
  calculateRetentionMetrics,
  analyzeChurn,
  calculateSegmentRetention,
  type RetentionMetrics,
  type ChurnAnalysis,
} from "./retention-metrics";

export {
  calculateMRRMovements,
  calculateMRRWaterfall,
  calculateMRRGrowthMetrics,
  calculateMRRBySegment,
  type MRRMovement,
  type MRRGrowthMetrics,
} from "./mrr-movements";
