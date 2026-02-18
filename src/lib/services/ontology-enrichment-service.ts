import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyProfile } from "@/types/company-profile";

type DbClient = SupabaseClient;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * After data is seeded and analytics run, use Claude to enrich the ontology
 * with business-specific insights that algorithmic analysis can't provide.
 *
 * This adds:
 * - Richer segment descriptions with business context
 * - Actionable recommended_actions for each pattern
 * - Value driver refinements per segment
 */
export async function enrichOntologyWithClaude(
  supabase: DbClient,
  organizationId: string,
  profile: CompanyProfile
): Promise<void> {
  // Read current ontology from DB
  const [segmentsResult, patternsResult, economicsResult] = await Promise.all([
    supabase
      .from("segments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("patterns")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("economics_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const segments = segmentsResult.data || [];
  const patterns = patternsResult.data || [];
  const economics = economicsResult.data;

  if (segments.length === 0) {
    console.warn("No segments found to enrich");
    return;
  }

  // Build context for Claude
  const ontologyContext = buildEnrichmentContext(segments, patterns, economics, profile);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: ENRICHMENT_PROMPT,
      messages: [
        {
          role: "user",
          content: ontologyContext,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    const enrichment: EnrichmentResult = JSON.parse(jsonStr);

    // Apply enrichments to DB
    await applyEnrichments(supabase, organizationId, enrichment, segments, patterns);
  } catch (error) {
    console.warn("Ontology enrichment failed, continuing with algorithmic data:", error);
  }
}

// =============================================================================
// Prompt and types
// =============================================================================

const ENRICHMENT_PROMPT = `You are a B2B SaaS pricing strategist. You have been given an algorithmically-derived ontology for a business. Your job is to enrich it with strategic business insights.

For each segment, provide:
- A refined description (1-2 sentences, business-context-aware)
- Enriched value_drivers (3-5 specific, actionable value drivers)

For each pattern, provide:
- A refined recommended_action (specific, actionable, referencing the company's products/segments)

Return ONLY valid JSON (no markdown, no explanation):

{
  "segment_enrichments": [
    {
      "segment_name": "string (must match existing segment name exactly)",
      "description": "Enriched description",
      "value_drivers": ["driver1", "driver2", "driver3"]
    }
  ],
  "pattern_enrichments": [
    {
      "pattern_name": "string (must match existing pattern name exactly)",
      "recommended_action": "Enriched action"
    }
  ]
}`;

interface EnrichmentResult {
  segment_enrichments: Array<{
    segment_name: string;
    description: string;
    value_drivers: string[];
  }>;
  pattern_enrichments: Array<{
    pattern_name: string;
    recommended_action: string;
  }>;
}

// =============================================================================
// Helpers
// =============================================================================

function buildEnrichmentContext(
  segments: Array<{ name: string; customer_count: number; avg_mrr: number; churn_rate: number; revenue_share: number; value_drivers: string[] }>,
  patterns: Array<{ name: string; pattern_type: string; description: string; recommended_action?: string }>,
  economics: { total_mrr: number; total_customers: number; net_revenue_retention?: number } | null,
  profile: CompanyProfile
): string {
  const segmentLines = segments.map(
    (s) =>
      `- ${s.name}: ${s.customer_count} customers, ${profile.currency_symbol}${s.avg_mrr} avg MRR, ${(s.churn_rate * 100).toFixed(1)}% churn, ${(s.revenue_share * 100).toFixed(0)}% of revenue. Value drivers: ${s.value_drivers.join(", ")}`
  );

  const patternLines = patterns.map(
    (p) =>
      `- ${p.name} (${p.pattern_type}): ${p.description}. Current action: ${p.recommended_action || "none"}`
  );

  const competitorLines = (profile.competitors || []).map(
    (c) => `- ${c.name}: ${c.positioning} (${c.pricing_model})`
  );

  return `## Company: ${profile.name}
${profile.description}

Business model: ${profile.business_model}
Primary value metric: ${profile.primary_value_metric}
Total customers: ${economics?.total_customers || profile.total_customers}
Total MRR: ${profile.currency_symbol}${(economics?.total_mrr || profile.total_arr / 12).toLocaleString()}
NRR: ${economics?.net_revenue_retention || "N/A"}%

## Current Segments
${segmentLines.join("\n")}

## Detected Patterns
${patternLines.join("\n")}

## Competitors
${competitorLines.length > 0 ? competitorLines.join("\n") : "No competitor data available"}

## Market Context
${profile.market_context ? `Category: ${profile.market_context.market_category}\nTrends: ${profile.market_context.key_trends.join(", ")}` : "No market context available"}

## Strategic Positioning
${profile.strategic_positioning ? `Value prop: ${profile.strategic_positioning.value_proposition}\nAdvantages: ${profile.strategic_positioning.key_advantages.join(", ")}` : "No positioning data available"}`;
}

async function applyEnrichments(
  supabase: DbClient,
  organizationId: string,
  enrichment: EnrichmentResult,
  segments: Array<{ id: string; name: string }>,
  patterns: Array<{ id: string; name: string }>
): Promise<void> {
  // Apply segment enrichments
  for (const se of enrichment.segment_enrichments) {
    const segment = segments.find(
      (s) => s.name.toLowerCase() === se.segment_name.toLowerCase()
    );
    if (segment) {
      await supabase
        .from("segments")
        .update({
          description: se.description,
          value_drivers: se.value_drivers,
        })
        .eq("id", segment.id)
        .eq("organization_id", organizationId);
    }
  }

  // Apply pattern enrichments
  for (const pe of enrichment.pattern_enrichments) {
    const pattern = patterns.find(
      (p) => p.name.toLowerCase() === pe.pattern_name.toLowerCase()
    );
    if (pattern) {
      await supabase
        .from("patterns")
        .update({
          recommended_action: pe.recommended_action,
        })
        .eq("id", pattern.id)
        .eq("organization_id", organizationId);
    }
  }
}
