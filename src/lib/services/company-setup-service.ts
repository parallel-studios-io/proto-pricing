import Anthropic from "@anthropic-ai/sdk";
import type {
  CompanyProfile,
  MarketContext,
  CompetitorProfile,
  StrategicPositioning,
} from "@/types/company-profile";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================================================
// STAGE 1: Generate CompanyProfile from natural language description
// =============================================================================

const PROFILE_GENERATION_PROMPT = `You are a B2B SaaS pricing analyst. Given a company description, generate a structured CompanyProfile JSON that will be used to create a synthetic dataset for pricing analysis.

IMPORTANT RULES:
- Generate 3-5 customer segments with realistic distributions
- Segments customer_share values MUST sum to exactly 1.0
- Segments revenue_share values MUST sum to exactly 1.0
- Follow a Pareto pattern: top 5-10% of customers should drive 50-70% of revenue
- Generate 3-6 pricing tiers ordered from lowest to highest
- Tier customer_share values MUST sum to exactly 1.0
- Tier revenue_share values MUST sum to exactly 1.0
- Include 3-10 products that represent the company's offering
- All monetary values should be realistic for the market
- total_arr should be consistent with segments (sum of segment avg_mrr * customer_count * 12)
- total_customers should equal the sum implied by segments

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):

{
  "name": "Company Name",
  "description": "One paragraph description",
  "website": "https://...",
  "country": "Country Name",
  "currency": "USD",
  "currency_symbol": "$",
  "business_model": "subscription" | "usage_based" | "hybrid" | "marketplace",
  "primary_value_metric": "e.g. seats, API calls, storage GB",
  "secondary_value_metrics": ["metric1", "metric2"],
  "total_customers": number,
  "total_arr": number,
  "avg_deal_size": number,
  "segments": [
    {
      "name": "Segment Name",
      "description": "Description",
      "customer_share": 0.0-1.0,
      "revenue_share": 0.0-1.0,
      "avg_mrr": number,
      "churn_rate": 0.0-1.0 (monthly),
      "expansion_rate": 0.0-1.0 (monthly),
      "value_drivers": ["driver1", "driver2"],
      "company_size": "startup" | "smb" | "mid_market" | "enterprise"
    }
  ],
  "products": [
    {
      "name": "Product Name",
      "type": "subscription" | "usage" | "one_time",
      "base_price": number,
      "unit_label": "optional - e.g. seat, call, GB"
    }
  ],
  "pricing_tiers": [
    {
      "name": "Tier Name",
      "price_monthly": number,
      "price_annual": number (optional),
      "features": ["feature1", "feature2"],
      "value_metric_limits": { "metric_name": number_or_"unlimited" },
      "customer_share": 0.0-1.0,
      "revenue_share": 0.0-1.0,
      "position": number (1 = lowest)
    }
  ]
}`;

export async function generateCompanyProfile(
  description: string
): Promise<CompanyProfile> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: PROFILE_GENERATION_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a CompanyProfile for this business:\n\n${description}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse the JSON response - strip any markdown fencing if present
  const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
  const profile: CompanyProfile = JSON.parse(jsonStr);

  // Ensure required fields have defaults
  if (!profile.market_context) profile.market_context = undefined;
  if (!profile.competitors) profile.competitors = undefined;
  if (!profile.strategic_positioning) profile.strategic_positioning = undefined;

  return profile;
}

// =============================================================================
// STAGE 2: Enrich profile with market research via web search
// =============================================================================

const MARKET_RESEARCH_PROMPT = `You are a B2B SaaS market research analyst. You have been given a company profile. Your job is to research the competitive landscape, market context, and strategic positioning.

Use the web_search tool to research:
1. The company's 3-5 main competitors and their pricing pages
2. Market size (TAM) and growth rate for this category
3. Key market trends and buying factors

Return your findings as a JSON object with this structure (no markdown, no explanation, ONLY JSON):

{
  "market_context": {
    "market_category": "string",
    "tam_estimate": "string like $4.2B",
    "growth_rate": "string like 12% CAGR",
    "market_structure": "Fragmented | Oligopolistic | Consolidated | ...",
    "key_trends": ["trend1", "trend2", ...],
    "buying_factors": ["factor1", "factor2", ...]
  },
  "competitors": [
    {
      "name": "Competitor Name",
      "website": "https://...",
      "positioning": "One-line positioning",
      "pricing_model": "e.g. Freemium + usage",
      "price_range": "e.g. $0-499/mo",
      "key_differentiators": ["diff1", "diff2"],
      "estimated_market_share": "optional, e.g. 15%"
    }
  ],
  "strategic_positioning": {
    "value_proposition": "One sentence",
    "target_segments": ["segment1", "segment2"],
    "key_advantages": ["advantage1", "advantage2"],
    "key_risks": ["risk1", "risk2"],
    "pricing_philosophy": "Value-based | Penetration | Premium | Competitive"
  }
}`;

interface MarketResearchResult {
  market_context: MarketContext;
  competitors: CompetitorProfile[];
  strategic_positioning: StrategicPositioning;
}

export async function enrichWithMarketResearch(
  profile: CompanyProfile
): Promise<CompanyProfile> {
  const companyContext = `Company: ${profile.name}
Description: ${profile.description}
Business model: ${profile.business_model}
Primary value metric: ${profile.primary_value_metric}
Country: ${profile.country}
Currency: ${profile.currency}
ARR: ${profile.currency_symbol}${profile.total_arr.toLocaleString()}
Segments: ${profile.segments.map((s) => s.name).join(", ")}
Pricing tiers: ${profile.pricing_tiers.map((t) => `${t.name} (${profile.currency_symbol}${t.price_monthly}/mo)`).join(", ")}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: MARKET_RESEARCH_PROMPT,
      messages: [
        {
          role: "user",
          content: `Research the market for this company:\n\n${companyContext}`,
        },
      ],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
    });

    // Extract the text response (may be after tool use blocks)
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.warn("No text response from market research, using profile as-is");
      return profile;
    }

    const jsonStr = textBlock.text.replace(/```json\n?|\n?```/g, "").trim();
    const research: MarketResearchResult = JSON.parse(jsonStr);

    return {
      ...profile,
      market_context: research.market_context ?? profile.market_context,
      competitors: research.competitors ?? profile.competitors,
      strategic_positioning:
        research.strategic_positioning ?? profile.strategic_positioning,
    };
  } catch (error) {
    console.warn("Market research enrichment failed, continuing with profile as-is:", error);
    return profile;
  }
}
