/**
 * Pattern Detection Module
 * Exports all pattern detection functions
 */

export {
  detectUpgradeCandidates,
  storeUpgradePatterns,
  type UpgradeSignal,
  type UpgradeCandidate,
  type UpgradeAnalysisResult,
} from "./upgrade-detector";

export {
  detectChurnRisk,
  storeChurnPatterns,
  type ChurnSignal,
  type AtRiskCustomer,
  type ChurnAnalysisResult,
} from "./churn-detector";

export {
  analyzeSeasonality,
  storeSeasonalPatterns,
  type SeasonalPattern,
  type MonthlyTrend,
  type SeasonalAnalysisResult,
} from "./seasonal-analyzer";
