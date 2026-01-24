/**
 * Segmentation Analytics Module
 * Exports all segmentation-related analytics functions
 */

export {
  calculateRFMScores,
  calculateRFMFromInputs,
  storeRFMScores,
  getRFMDistribution,
  getRFMRecommendations,
  type RFMScore,
  type RFMSegment,
} from "./rfm-analyzer";

export {
  performKMeansClustering,
  type ClusteringFeatures,
  type Cluster,
  type ClusteringResult,
} from "./clustering";

export {
  runSegmentationAnalysis,
  assignCustomersToSegments,
  getSegmentInsights,
  type SegmentDefinition,
  type SegmentationAnalysisResult,
} from "./segment-assigner";
