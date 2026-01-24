/**
 * Ontology Service
 * High-level operations for managing the business ontology
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Ontology, Segment, PricingTier } from "@/types/database";
import {
  getSegments,
  createSegment,
  updateSegment,
  archiveSegment,
} from "@/lib/db/ontology/segments";
import {
  getPricingTiers,
  createPricingTier,
  updatePricingTier,
  archivePricingTier,
} from "@/lib/db/ontology/tiers";
import { getValueMetrics } from "@/lib/db/ontology/value-metrics";
import { getPatterns } from "@/lib/db/ontology/patterns";
import { getLatestEconomicsSnapshot } from "@/lib/db/ontology/economics";
import {
  createOntologySnapshot,
  getCurrentOntology,
} from "@/lib/db/ontology/snapshots";

type DbClient = SupabaseClient<Database>;

/**
 * Get the full current ontology for an organization
 */
export async function getOntology(
  supabase: DbClient,
  organizationId: string
): Promise<Ontology> {
  return getCurrentOntology(supabase, organizationId);
}

/**
 * Update a segment with automatic snapshot creation
 */
export async function updateSegmentWithSnapshot(
  supabase: DbClient,
  organizationId: string,
  segmentId: string,
  updates: Partial<Segment>,
  options?: {
    triggeredBy?: string;
    reason?: string;
    createSnapshot?: boolean;
  }
): Promise<{ segment: Segment; snapshotId?: string }> {
  const segment = await updateSegment(
    supabase,
    organizationId,
    segmentId,
    updates,
    options?.triggeredBy || "user",
    options?.reason
  );

  let snapshotId: string | undefined;
  if (options?.createSnapshot !== false) {
    const snapshot = await createOntologySnapshot(supabase, organizationId, {
      description: `Updated segment: ${segment.name}`,
      triggeredBy: options?.triggeredBy || "user",
      triggerDetails: {
        action: "segment_update",
        segment_id: segmentId,
        changes: Object.keys(updates),
      },
    });
    snapshotId = snapshot.id;
  }

  return { segment, snapshotId };
}

/**
 * Create a new segment with automatic snapshot creation
 */
export async function createSegmentWithSnapshot(
  supabase: DbClient,
  organizationId: string,
  segmentData: Omit<
    Database["public"]["Tables"]["segments"]["Insert"],
    "organization_id"
  >,
  options?: {
    triggeredBy?: string;
    createSnapshot?: boolean;
  }
): Promise<{ segment: Segment; snapshotId?: string }> {
  const segment = await createSegment(
    supabase,
    organizationId,
    segmentData,
    options?.triggeredBy || "user"
  );

  let snapshotId: string | undefined;
  if (options?.createSnapshot !== false) {
    const snapshot = await createOntologySnapshot(supabase, organizationId, {
      description: `Created segment: ${segment.name}`,
      triggeredBy: options?.triggeredBy || "user",
      triggerDetails: {
        action: "segment_create",
        segment_id: segment.id,
      },
    });
    snapshotId = snapshot.id;
  }

  return { segment, snapshotId };
}

/**
 * Archive a segment with automatic snapshot creation
 */
export async function archiveSegmentWithSnapshot(
  supabase: DbClient,
  organizationId: string,
  segmentId: string,
  options?: {
    triggeredBy?: string;
    reason?: string;
    createSnapshot?: boolean;
  }
): Promise<{ snapshotId?: string }> {
  await archiveSegment(
    supabase,
    organizationId,
    segmentId,
    options?.triggeredBy || "user",
    options?.reason
  );

  let snapshotId: string | undefined;
  if (options?.createSnapshot !== false) {
    const snapshot = await createOntologySnapshot(supabase, organizationId, {
      description: `Archived segment`,
      triggeredBy: options?.triggeredBy || "user",
      triggerDetails: {
        action: "segment_archive",
        segment_id: segmentId,
        reason: options?.reason,
      },
    });
    snapshotId = snapshot.id;
  }

  return { snapshotId };
}

/**
 * Update a pricing tier with automatic snapshot creation
 */
export async function updatePricingTierWithSnapshot(
  supabase: DbClient,
  organizationId: string,
  tierId: string,
  updates: Partial<PricingTier>,
  options?: {
    triggeredBy?: string;
    reason?: string;
    createSnapshot?: boolean;
  }
): Promise<{ tier: PricingTier; snapshotId?: string }> {
  const tier = await updatePricingTier(
    supabase,
    organizationId,
    tierId,
    updates,
    options?.triggeredBy || "user",
    options?.reason
  );

  let snapshotId: string | undefined;
  if (options?.createSnapshot !== false) {
    const snapshot = await createOntologySnapshot(supabase, organizationId, {
      description: `Updated tier: ${tier.name}`,
      triggeredBy: options?.triggeredBy || "user",
      triggerDetails: {
        action: "tier_update",
        tier_id: tierId,
        changes: Object.keys(updates),
      },
    });
    snapshotId = snapshot.id;
  }

  return { tier, snapshotId };
}

/**
 * Create a new pricing tier with automatic snapshot creation
 */
export async function createPricingTierWithSnapshot(
  supabase: DbClient,
  organizationId: string,
  tierData: Omit<
    Database["public"]["Tables"]["pricing_tiers"]["Insert"],
    "organization_id"
  >,
  options?: {
    triggeredBy?: string;
    createSnapshot?: boolean;
  }
): Promise<{ tier: PricingTier; snapshotId?: string }> {
  const tier = await createPricingTier(
    supabase,
    organizationId,
    tierData,
    options?.triggeredBy || "user"
  );

  let snapshotId: string | undefined;
  if (options?.createSnapshot !== false) {
    const snapshot = await createOntologySnapshot(supabase, organizationId, {
      description: `Created tier: ${tier.name}`,
      triggeredBy: options?.triggeredBy || "user",
      triggerDetails: {
        action: "tier_create",
        tier_id: tier.id,
      },
    });
    snapshotId = snapshot.id;
  }

  return { tier, snapshotId };
}

/**
 * Get summary statistics for the ontology
 */
export async function getOntologySummary(
  supabase: DbClient,
  organizationId: string
): Promise<{
  segments: { total: number; active: number };
  tiers: { total: number; active: number };
  patterns: { total: number; active: number };
  valueMetrics: { total: number; active: number };
  economics: {
    totalMrr: number;
    totalArr: number;
    totalCustomers: number;
    concentrationRisk: string;
  } | null;
}> {
  const [segments, tiers, patterns, valueMetrics, economics] =
    await Promise.all([
      getSegments(supabase, organizationId),
      getPricingTiers(supabase, organizationId),
      getPatterns(supabase, organizationId),
      getValueMetrics(supabase, organizationId),
      getLatestEconomicsSnapshot(supabase, organizationId),
    ]);

  return {
    segments: {
      total: segments.length,
      active: segments.filter((s) => s.is_active).length,
    },
    tiers: {
      total: tiers.length,
      active: tiers.filter((t) => t.is_active).length,
    },
    patterns: {
      total: patterns.length,
      active: patterns.filter((p) => p.is_active).length,
    },
    valueMetrics: {
      total: valueMetrics.length,
      active: valueMetrics.filter((v) => v.is_active).length,
    },
    economics: economics
      ? {
          totalMrr: economics.total_mrr,
          totalArr: economics.total_arr,
          totalCustomers: economics.total_customers,
          concentrationRisk: economics.concentration_risk_level || "unknown",
        }
      : null,
  };
}

/**
 * Build context string for LLM from ontology data
 * This replaces the old in-memory data context builder
 */
export async function buildOntologyContext(
  supabase: DbClient,
  organizationId: string
): Promise<string> {
  const ontology = await getOntology(supabase, organizationId);

  const sections: string[] = [];

  // Key Metrics
  if (ontology.economics) {
    sections.push(`### Key Metrics
- Total Customers: ${ontology.economics.total_customers.toLocaleString()}
- MRR: €${ontology.economics.total_mrr.toLocaleString()}
- ARR: €${ontology.economics.total_arr.toLocaleString()}
- Net Revenue Retention: ${ontology.economics.net_revenue_retention || "N/A"}%
- Concentration Risk: ${ontology.economics.concentration_risk_level || "unknown"}`);
  }

  // Pricing Tiers
  if (ontology.tiers.length > 0) {
    const tierRows = ontology.tiers
      .sort((a, b) => a.position - b.position)
      .map(
        (t) =>
          `| ${t.name} | €${t.price_monthly} | ${t.customer_count.toLocaleString()} | €${t.total_revenue.toLocaleString()} | ${(t.revenue_share * 100).toFixed(1)}% |`
      )
      .join("\n");

    sections.push(`### Pricing Tiers

| Tier | Monthly Fee | Customers | Monthly Revenue | % of Total Revenue |
|------|-------------|-----------|-----------------|-------------------|
${tierRows}`);
  }

  // Customer Segments
  if (ontology.segments.length > 0) {
    const segmentRows = ontology.segments
      .map(
        (s) =>
          `| ${s.name} | ${s.customer_count.toLocaleString()} | €${s.avg_mrr.toLocaleString()} | €${s.avg_ltv.toLocaleString()} | ${(s.churn_rate * 100).toFixed(1)}% |`
      )
      .join("\n");

    sections.push(`### Customer Segments

| Segment | Customers | Avg MRR | Avg LTV | Monthly Churn |
|---------|-----------|---------|---------|---------------|
${segmentRows}`);
  }

  // Value Metrics
  if (ontology.valueMetrics.length > 0) {
    const metricsText = ontology.valueMetrics
      .map(
        (v) =>
          `- **${v.name}** (${v.metric_type}): ${v.description} - ${(v.correlation_to_expansion || 0) * 100}% correlation to expansion`
      )
      .join("\n");

    sections.push(`### Value Metrics
${metricsText}`);
  }

  // Behavioral Patterns
  if (ontology.patterns.length > 0) {
    const patternsText = ontology.patterns
      .map(
        (p) =>
          `- **${p.name}** (${p.pattern_type}): ${p.description} - ${(p.confidence * 100).toFixed(0)}% confidence`
      )
      .join("\n");

    sections.push(`### Behavioral Patterns
${patternsText}`);
  }

  return sections.join("\n\n");
}
