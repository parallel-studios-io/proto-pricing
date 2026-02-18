/**
 * Ontology Service
 * High-level operations for managing the business ontology
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Ontology, Segment, PricingTier, Competitor } from "@/types/database";
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
import { getCompetitors } from "@/lib/db/ontology/competitors";
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
  const [ontology, competitors] = await Promise.all([
    getOntology(supabase, organizationId),
    getCompetitors(supabase, organizationId, { activeOnly: true }),
  ]);

  // Resolve currency symbol from company profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: org } = await db
    .from("organizations")
    .select("company_profile")
    .eq("id", organizationId)
    .single();
  const cs = (org?.company_profile?.currency_symbol as string) || "€";

  const sections: string[] = [];

  // Key Metrics
  if (ontology.economics) {
    sections.push(`### Key Metrics
- Total Customers: ${ontology.economics.total_customers.toLocaleString()}
- MRR: ${cs}${ontology.economics.total_mrr.toLocaleString()}
- ARR: ${cs}${ontology.economics.total_arr.toLocaleString()}
- Net Revenue Retention: ${ontology.economics.net_revenue_retention || "N/A"}%
- Concentration Risk: ${ontology.economics.concentration_risk_level || "unknown"}`);
  }

  // Pricing Tiers
  if (ontology.tiers.length > 0) {
    const tierRows = ontology.tiers
      .sort((a, b) => a.position - b.position)
      .map(
        (t) =>
          `| ${t.name} | ${cs}${t.price_monthly} | ${t.customer_count.toLocaleString()} | ${cs}${t.total_revenue.toLocaleString()} | ${(t.revenue_share * 100).toFixed(1)}% |`
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
          `| ${s.name} | ${s.customer_count.toLocaleString()} | ${cs}${s.avg_mrr.toLocaleString()} | ${cs}${s.avg_ltv.toLocaleString()} | ${(s.churn_rate * 100).toFixed(1)}% |`
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

  // Competitors
  if (competitors.length > 0) {
    const competitorRows = competitors
      .map(
        (c: Competitor) =>
          `| ${c.name} | ${c.pricing_model || "N/A"} | ${c.positioning || "N/A"} | ${c.price_range || "N/A"} |`
      )
      .join("\n");

    sections.push(`### Competitors

| Name | Pricing Model | Positioning | Price Range |
|------|---------------|-------------|-------------|
${competitorRows}`);
  }

  // Market Context (from economics snapshot)
  if (ontology.economics?.market_context) {
    const mc = ontology.economics.market_context as Record<string, unknown>;
    const lines: string[] = [];
    if (mc.market_category) lines.push(`- Market Category: ${mc.market_category}`);
    if (mc.tam_estimate) lines.push(`- TAM: ${mc.tam_estimate}`);
    if (mc.growth_rate) lines.push(`- Market Growth Rate: ${mc.growth_rate}`);
    if (Array.isArray(mc.key_trends) && mc.key_trends.length > 0) {
      lines.push(`- Key Trends: ${mc.key_trends.join(", ")}`);
    }
    if (Array.isArray(mc.buying_factors) && mc.buying_factors.length > 0) {
      lines.push(`- Buying Factors: ${mc.buying_factors.join(", ")}`);
    }
    if (lines.length > 0) {
      sections.push(`### Market Context\n${lines.join("\n")}`);
    }
  }

  // Strategic Positioning (from economics snapshot)
  if (ontology.economics?.strategic_positioning) {
    const sp = ontology.economics.strategic_positioning as Record<string, unknown>;
    const lines: string[] = [];
    if (sp.value_proposition) lines.push(`- Value Proposition: ${sp.value_proposition}`);
    if (Array.isArray(sp.key_advantages) && sp.key_advantages.length > 0) {
      lines.push(`- Key Advantages: ${sp.key_advantages.join(", ")}`);
    }
    if (Array.isArray(sp.key_risks) && sp.key_risks.length > 0) {
      lines.push(`- Key Risks: ${sp.key_risks.join(", ")}`);
    }
    if (sp.pricing_philosophy) lines.push(`- Pricing Philosophy: ${sp.pricing_philosophy}`);
    if (lines.length > 0) {
      sections.push(`### Strategic Positioning\n${lines.join("\n")}`);
    }
  }

  return sections.join("\n\n");
}
