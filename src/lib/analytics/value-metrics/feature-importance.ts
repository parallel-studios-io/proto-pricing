/**
 * Feature Importance Analyzer
 * Ranks metrics by their predictive power for business outcomes
 */

import type { MetricCorrelation } from "./correlation-analyzer";

export interface FeatureImportance {
  metricName: string;
  metricDescription: string;
  importanceScore: number; // 0-1
  rank: number;
  predictiveFor: ("retention" | "expansion" | "churn")[];
  confidence: "high" | "medium" | "low";
  actionability: "high" | "medium" | "low";
  recommendation: string;
}

export interface FeatureImportanceResult {
  rankings: FeatureImportance[];
  primaryValueMetric: FeatureImportance | null;
  secondaryValueMetrics: FeatureImportance[];
  insights: string[];
}

/**
 * Calculate feature importance from correlation analysis
 */
export function calculateFeatureImportance(
  correlations: MetricCorrelation[]
): FeatureImportanceResult {
  if (correlations.length === 0) {
    return {
      rankings: [],
      primaryValueMetric: null,
      secondaryValueMetrics: [],
      insights: ["No correlation data available for feature importance analysis."],
    };
  }

  const rankings: FeatureImportance[] = correlations.map((c) => {
    // Calculate overall importance score
    const retentionImpact = Math.abs(c.correlationToRetention) * (c.pValueRetention < 0.05 ? 1 : 0.5);
    const expansionImpact = Math.abs(c.correlationToExpansion) * (c.pValueExpansion < 0.05 ? 1 : 0.5);
    const churnImpact = Math.abs(c.correlationToChurn) * (c.pValueChurn < 0.05 ? 1 : 0.5);

    // Weight retention and expansion higher than churn (positive signals are more actionable)
    const importanceScore =
      retentionImpact * 0.4 + expansionImpact * 0.35 + churnImpact * 0.25;

    // Determine what this metric predicts
    const predictiveFor: ("retention" | "expansion" | "churn")[] = [];
    if (c.pValueRetention < 0.05 && Math.abs(c.correlationToRetention) > 0.2) {
      predictiveFor.push("retention");
    }
    if (c.pValueExpansion < 0.05 && Math.abs(c.correlationToExpansion) > 0.2) {
      predictiveFor.push("expansion");
    }
    if (c.pValueChurn < 0.05 && Math.abs(c.correlationToChurn) > 0.2) {
      predictiveFor.push("churn");
    }

    // Confidence based on sample size and p-values
    const minPValue = Math.min(c.pValueRetention, c.pValueExpansion, c.pValueChurn);
    let confidence: "high" | "medium" | "low" = "low";
    if (c.sampleSize >= 100 && minPValue < 0.01) {
      confidence = "high";
    } else if (c.sampleSize >= 50 && minPValue < 0.05) {
      confidence = "medium";
    }

    // Actionability based on metric type
    const actionability = getActionability(c.metricName);

    // Generate recommendation
    const recommendation = generateRecommendation(c, predictiveFor);

    return {
      metricName: c.metricName,
      metricDescription: c.metricDescription,
      importanceScore,
      rank: 0, // Will be set after sorting
      predictiveFor,
      confidence,
      actionability,
      recommendation,
    };
  });

  // Sort by importance and assign ranks
  rankings.sort((a, b) => b.importanceScore - a.importanceScore);
  rankings.forEach((r, i) => (r.rank = i + 1));

  // Identify primary and secondary value metrics
  const highImportance = rankings.filter((r) => r.importanceScore >= 0.3 && r.confidence !== "low");
  const primaryValueMetric = highImportance[0] || null;
  const secondaryValueMetrics = highImportance.slice(1, 4);

  // Generate insights
  const insights = generateFeatureInsights(rankings, primaryValueMetric, secondaryValueMetrics);

  return {
    rankings,
    primaryValueMetric,
    secondaryValueMetrics,
    insights,
  };
}

/**
 * Determine actionability of a metric
 */
function getActionability(metricName: string): "high" | "medium" | "low" {
  // High actionability: metrics we can directly influence
  const highActionability = [
    "api_calls",
    "active_users",
    "feature_adoption",
    "login_frequency",
    "usage_score",
    "seats_used",
  ];

  // Medium actionability: indirectly influenceable
  const mediumActionability = [
    "mrr",
    "tenure_months",
    "support_tickets",
    "engagement_score",
  ];

  const lowerName = metricName.toLowerCase();

  for (const high of highActionability) {
    if (lowerName.includes(high)) return "high";
  }

  for (const medium of mediumActionability) {
    if (lowerName.includes(medium)) return "medium";
  }

  return "low";
}

/**
 * Generate a recommendation for a metric
 */
function generateRecommendation(
  correlation: MetricCorrelation,
  predictiveFor: ("retention" | "expansion" | "churn")[]
): string {
  if (predictiveFor.length === 0) {
    return "Monitor this metric but no strong predictive relationship found.";
  }

  const metricName = correlation.metricDescription;

  if (predictiveFor.includes("retention") && correlation.correlationToRetention > 0) {
    return `Increase ${metricName} to improve retention. Consider gamification or onboarding improvements.`;
  }

  if (predictiveFor.includes("expansion") && correlation.correlationToExpansion > 0) {
    return `Customers with high ${metricName} are prime upgrade candidates. Use as trigger for sales outreach.`;
  }

  if (predictiveFor.includes("churn") && correlation.correlationToChurn > 0) {
    return `High ${metricName} correlates with churn. Investigate if this indicates frustration or underuse.`;
  }

  if (predictiveFor.includes("churn") && correlation.correlationToChurn < 0) {
    return `Low ${metricName} is an early churn warning. Set up alerts for customers below threshold.`;
  }

  return `Track ${metricName} as a key health indicator across the customer base.`;
}

/**
 * Generate insights from feature importance analysis
 */
function generateFeatureInsights(
  rankings: FeatureImportance[],
  primary: FeatureImportance | null,
  secondary: FeatureImportance[]
): string[] {
  const insights: string[] = [];

  if (primary) {
    insights.push(
      `Primary value metric: ${primary.metricDescription} (importance score: ${(primary.importanceScore * 100).toFixed(0)}%). ${primary.recommendation}`
    );
  }

  if (secondary.length > 0) {
    const names = secondary.map((s) => s.metricDescription).join(", ");
    insights.push(`Secondary value metrics to track: ${names}.`);
  }

  // Find most actionable high-importance metric
  const actionableMetrics = rankings.filter(
    (r) => r.actionability === "high" && r.importanceScore > 0.2
  );
  if (actionableMetrics.length > 0) {
    insights.push(
      `Most actionable lever: ${actionableMetrics[0].metricDescription}. This is directly influenceable and predictive.`
    );
  }

  // Check for leading indicators of churn
  const churnIndicators = rankings.filter(
    (r) => r.predictiveFor.includes("churn") && r.confidence !== "low"
  );
  if (churnIndicators.length > 0) {
    insights.push(
      `Leading churn indicators: ${churnIndicators.map((c) => c.metricDescription).join(", ")}. Set up monitoring alerts.`
    );
  }

  return insights;
}

/**
 * Create value metrics for the ontology based on importance analysis
 */
export function createValueMetricDefinitions(
  result: FeatureImportanceResult
): Array<{
  name: string;
  description: string;
  metricType: "primary" | "secondary";
  correlationToExpansion: number;
  correlationToRetention: number;
  measurementMethod: string;
  examples: string[];
}> {
  const definitions: Array<{
    name: string;
    description: string;
    metricType: "primary" | "secondary";
    correlationToExpansion: number;
    correlationToRetention: number;
    measurementMethod: string;
    examples: string[];
  }> = [];

  // Add primary metric
  if (result.primaryValueMetric) {
    const pm = result.primaryValueMetric;
    definitions.push({
      name: pm.metricDescription,
      description: pm.recommendation,
      metricType: "primary",
      correlationToExpansion: 0, // Would be populated from correlation data
      correlationToRetention: 0,
      measurementMethod: `Track ${pm.metricName} through product analytics`,
      examples: [`Current correlation shows ${pm.confidence} confidence in predictive power`],
    });
  }

  // Add secondary metrics
  for (const sm of result.secondaryValueMetrics) {
    definitions.push({
      name: sm.metricDescription,
      description: sm.recommendation,
      metricType: "secondary",
      correlationToExpansion: 0,
      correlationToRetention: 0,
      measurementMethod: `Monitor ${sm.metricName} alongside primary metric`,
      examples: [],
    });
  }

  return definitions;
}
