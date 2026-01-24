/**
 * Segment Assigner
 * Assigns customers to segments and updates the ontology
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { calculateRFMScores, type RFMScore } from "./rfm-analyzer";
import { performKMeansClustering, type ClusteringResult, type ClusteringFeatures } from "./clustering";
import { calculateRetentionMetrics, calculateLTV } from "../economics";

type DbClient = SupabaseClient<Database>;

export interface SegmentDefinition {
  name: string;
  description: string;
  criteria: {
    mrrRange?: { min?: number; max?: number };
    tenureRange?: { min?: number; max?: number };
    companySizes?: string[];
    rfmSegments?: string[];
  };
  customerCount: number;
  totalRevenue: number;
  avgMrr: number;
  avgLtv: number;
  churnRate: number;
  retentionCurve: number[];
}

export interface SegmentationAnalysisResult {
  segments: SegmentDefinition[];
  rfmAnalysis: {
    distribution: Record<string, number>;
    recommendations: { segment: string; action: string; count: number }[];
  };
  clusteringResult: ClusteringResult;
  qualityMetrics: {
    silhouetteScore: number;
    segmentCount: number;
    avgSegmentSize: number;
    economicsVariance: number;
  };
}

/**
 * Run full segmentation analysis
 */
export async function runSegmentationAnalysis(
  supabase: DbClient,
  organizationId: string
): Promise<SegmentationAnalysisResult> {
  // Step 1: Calculate RFM scores
  const rfmScores = await calculateRFMScores(supabase, organizationId);

  // Step 2: Get customer features for clustering
  const features = await getClusteringFeatures(supabase, organizationId);

  // Step 3: Perform clustering
  const clusteringResult = performKMeansClustering(features, {
    minK: 3,
    maxK: 6,
  });

  // Step 4: Build segment definitions from clusters
  const segments = await buildSegmentDefinitions(
    supabase,
    organizationId,
    clusteringResult,
    rfmScores
  );

  // Step 5: Calculate quality metrics
  const qualityMetrics = calculateQualityMetrics(segments, clusteringResult);

  // Step 6: Prepare RFM summary
  const rfmDistribution: Record<string, number> = {};
  for (const score of rfmScores) {
    rfmDistribution[score.rfmSegment] = (rfmDistribution[score.rfmSegment] || 0) + 1;
  }

  const rfmRecommendations = [
    { segment: "champions", action: "Nurture for referrals and case studies", count: rfmDistribution["champions"] || 0 },
    { segment: "at_risk", action: "Immediate win-back campaign needed", count: rfmDistribution["at_risk"] || 0 },
    { segment: "cant_lose_them", action: "Priority retention outreach", count: rfmDistribution["cant_lose_them"] || 0 },
  ].filter((r) => r.count > 0);

  return {
    segments,
    rfmAnalysis: {
      distribution: rfmDistribution,
      recommendations: rfmRecommendations,
    },
    clusteringResult,
    qualityMetrics,
  };
}

/**
 * Get customer features for clustering
 */
async function getClusteringFeatures(
  supabase: DbClient,
  organizationId: string
): Promise<ClusteringFeatures[]> {
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, tenure_months, company_size, status")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  type CustomerCluster = { id: string; mrr: number | null; tenure_months: number | null; company_size: string | null; status: string | null };
  const customers = (customersRaw || []) as CustomerCluster[];

  if (customers.length === 0) return [];

  // Get expansion events for growth rate calculation
  const { data: expansionEventsRaw } = await supabase
    .from("customer_expansion_events")
    .select("customer_id, delta_mrr, occurred_at")
    .eq("organization_id", organizationId);

  type ExpansionEvent = { customer_id: string; delta_mrr: number | null; occurred_at: string };
  const expansionEvents = (expansionEventsRaw || []) as ExpansionEvent[];

  // Calculate growth rate per customer
  const growthRates = new Map<string, number>();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const event of expansionEvents) {
    if (new Date(event.occurred_at) > sixMonthsAgo) {
      const current = growthRates.get(event.customer_id) || 0;
      growthRates.set(event.customer_id, current + (Number(event.delta_mrr) || 0));
    }
  }

  // Map company size to numeric
  const companySizeMap: Record<string, number> = {
    startup: 1,
    smb: 2,
    mid_market: 3,
    enterprise: 4,
  };

  return customers.map((c) => {
    const mrr = Number(c.mrr) || 0;
    const growthDelta = growthRates.get(c.id) || 0;
    const growthRate = mrr > 0 ? growthDelta / mrr : 0;

    return {
      customerId: c.id,
      mrr,
      tenure: c.tenure_months || 0,
      growthRate,
      companySize: companySizeMap[c.company_size || "smb"] || 2,
      usageScore: 50, // TODO: Get from actual usage data
    };
  });
}

/**
 * Build segment definitions from clustering results
 */
async function buildSegmentDefinitions(
  supabase: DbClient,
  organizationId: string,
  clusteringResult: ClusteringResult,
  rfmScores: RFMScore[]
): Promise<SegmentDefinition[]> {
  const segments: SegmentDefinition[] = [];

  // Map RFM scores by customer ID
  const rfmByCustomer = new Map(rfmScores.map((s) => [s.customerId, s]));

  // Get all customer data
  const { data: customersRaw } = await supabase
    .from("unified_customers")
    .select("id, mrr, tenure_months, company_size, status")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  type CustomerSegment = { id: string; mrr: number | null; tenure_months: number | null; company_size: string | null; status: string | null };
  const customers = (customersRaw || []) as CustomerSegment[];

  const customerById = new Map(customers.map((c) => [c.id, c]));

  for (const cluster of clusteringResult.clusters) {
    const clusterCustomers = cluster.members
      .map((id) => customerById.get(id))
      .filter((c) => c !== undefined);

    if (clusterCustomers.length === 0) continue;

    // Calculate segment economics
    const mrrValues = clusterCustomers.map((c) => Number(c!.mrr) || 0);
    const totalRevenue = mrrValues.reduce((a, b) => a + b, 0);
    const avgMrr = totalRevenue / clusterCustomers.length;

    // Get RFM segments for this cluster
    const clusterRfmSegments = cluster.members
      .map((id) => rfmByCustomer.get(id)?.rfmSegment)
      .filter((s) => s !== undefined) as string[];

    // Estimate churn and LTV (simplified - in production would use segment-specific cohort analysis)
    const churnRate = cluster.characteristics.avgTenure > 12 ? 0.03 : 0.08;
    const avgLtv = avgMrr * 12 * (1 / churnRate) * 0.7; // Simple LTV formula

    // Build retention curve (simplified decay)
    const retentionCurve: number[] = [];
    let retention = 1.0;
    for (let month = 0; month < 12; month++) {
      retentionCurve.push(retention);
      retention *= 1 - churnRate;
    }

    // Determine MRR range
    const minMrr = Math.min(...mrrValues);
    const maxMrr = Math.max(...mrrValues);

    // Get company sizes in this segment
    const companySizes = [
      ...new Set(clusterCustomers.map((c) => c!.company_size).filter((s): s is string => s !== null)),
    ];

    segments.push({
      name: cluster.suggestedName,
      description: cluster.suggestedDescription,
      criteria: {
        mrrRange: { min: minMrr, max: maxMrr },
        companySizes,
        rfmSegments: [...new Set(clusterRfmSegments)],
      },
      customerCount: clusterCustomers.length,
      totalRevenue,
      avgMrr,
      avgLtv,
      churnRate,
      retentionCurve,
    });
  }

  return segments;
}

/**
 * Calculate quality metrics for segmentation
 */
function calculateQualityMetrics(
  segments: SegmentDefinition[],
  clusteringResult: ClusteringResult
): {
  silhouetteScore: number;
  segmentCount: number;
  avgSegmentSize: number;
  economicsVariance: number;
} {
  if (segments.length === 0) {
    return {
      silhouetteScore: 0,
      segmentCount: 0,
      avgSegmentSize: 0,
      economicsVariance: 0,
    };
  }

  const totalCustomers = segments.reduce((sum, s) => sum + s.customerCount, 0);
  const avgSize = totalCustomers / segments.length;

  // Calculate variance in economics (higher is better - means segments are distinct)
  const avgMrrValues = segments.map((s) => s.avgMrr);
  const avgOfAvgMrr = avgMrrValues.reduce((a, b) => a + b, 0) / avgMrrValues.length;
  const variance =
    avgMrrValues.reduce((sum, v) => sum + (v - avgOfAvgMrr) ** 2, 0) / avgMrrValues.length;
  const normalizedVariance = Math.sqrt(variance) / avgOfAvgMrr; // CV - coefficient of variation

  return {
    silhouetteScore: clusteringResult.silhouetteScore,
    segmentCount: segments.length,
    avgSegmentSize: avgSize,
    economicsVariance: normalizedVariance,
  };
}

/**
 * Assign customers to segments and update database
 */
export async function assignCustomersToSegments(
  supabase: DbClient,
  organizationId: string,
  analysisResult: SegmentationAnalysisResult
): Promise<void> {
  // First, upsert segment definitions
  for (const segment of analysisResult.segments) {
    const { data: existingSegmentRaw } = await supabase
      .from("segments")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", segment.name)
      .single();

    type ExistingSegment = { id: string };
    const existingSegment = existingSegmentRaw as ExistingSegment | null;

    const segmentData = {
      organization_id: organizationId,
      name: segment.name,
      description: segment.description,
      criteria: segment.criteria,
      customer_count: segment.customerCount,
      total_revenue: segment.totalRevenue,
      avg_mrr: segment.avgMrr,
      avg_ltv: segment.avgLtv,
      churn_rate: segment.churnRate,
      retention_curve: segment.retentionCurve,
      is_system_generated: true,
      is_active: true,
    };

    if (existingSegment) {
      await supabase
        .from("segments")
        .update(segmentData as never)
        .eq("id", existingSegment.id);
    } else {
      await supabase.from("segments").insert(segmentData as never);
    }
  }

  // Get segment IDs
  const { data: segmentsRaw } = await supabase
    .from("segments")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  type SegmentId = { id: string; name: string };
  const segments = (segmentsRaw || []) as SegmentId[];
  const segmentIdMap = new Map(segments.map((s) => [s.name, s.id]));

  // Update customer segment assignments
  for (const cluster of analysisResult.clusteringResult.clusters) {
    const segmentName = cluster.suggestedName;
    const segmentId = segmentIdMap.get(segmentName);

    if (!segmentId) continue;

    // Update in batches
    const batchSize = 500;
    for (let i = 0; i < cluster.members.length; i += batchSize) {
      const batch = cluster.members.slice(i, i + batchSize);
      await supabase
        .from("unified_customers")
        .update({ segment_id: segmentId } as never)
        .in("id", batch);
    }
  }
}

/**
 * Get segment insights summary
 */
export function getSegmentInsights(segments: SegmentDefinition[]): {
  totalCustomers: number;
  totalMrr: number;
  insights: string[];
} {
  const totalCustomers = segments.reduce((sum, s) => sum + s.customerCount, 0);
  const totalMrr = segments.reduce((sum, s) => sum + s.totalRevenue, 0);

  const insights: string[] = [];

  // Find highest value segment
  const highestMrr = segments.reduce((max, s) => (s.avgMrr > max.avgMrr ? s : max), segments[0]);
  if (highestMrr) {
    insights.push(
      `${highestMrr.name} has the highest average MRR (€${highestMrr.avgMrr.toFixed(0)}/mo) with ${highestMrr.customerCount} customers.`
    );
  }

  // Find segment with best retention
  const bestRetention = segments.reduce(
    (best, s) => (s.churnRate < best.churnRate ? s : best),
    segments[0]
  );
  if (bestRetention) {
    insights.push(
      `${bestRetention.name} has the lowest churn (${(bestRetention.churnRate * 100).toFixed(1)}%) - focus expansion here.`
    );
  }

  // Find segment with most customers
  const largest = segments.reduce(
    (max, s) => (s.customerCount > max.customerCount ? s : max),
    segments[0]
  );
  if (largest) {
    const pct = ((largest.customerCount / totalCustomers) * 100).toFixed(0);
    insights.push(
      `${largest.name} represents ${pct}% of customers (${largest.customerCount} accounts).`
    );
  }

  // Revenue concentration insight
  const sortedByRevenue = [...segments].sort((a, b) => b.totalRevenue - a.totalRevenue);
  if (sortedByRevenue.length >= 2) {
    const topShare = (sortedByRevenue[0].totalRevenue / totalMrr) * 100;
    insights.push(
      `Top segment (${sortedByRevenue[0].name}) contributes ${topShare.toFixed(0)}% of total MRR.`
    );
  }

  return {
    totalCustomers,
    totalMrr,
    insights,
  };
}
