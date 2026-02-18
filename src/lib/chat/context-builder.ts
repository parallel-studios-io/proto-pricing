import type { GeneratedMyParcelData } from "@/lib/generators/myparcel";
import type { AgentId } from "@/types/agents";
import { AGENTS } from "@/types/agents";

/**
 * Build a data context string for the LLM system prompt (legacy in-memory version)
 * @deprecated Use buildOntologyContext from ontology-service.ts for database-backed context
 */
export function buildDataContext(data: GeneratedMyParcelData): string {
  const { summary, pricingStructure, segments, economics } = data;

  return `## Your Business Data

### Key Metrics
- Total Customers: ${summary.totalCustomers.toLocaleString()}
- Monthly Recurring Revenue (MRR): €${summary.totalMrr.toLocaleString()}
- Annual Recurring Revenue (ARR): €${summary.totalArr.toLocaleString()}
- Net Revenue Retention (NRR): ${summary.nrr}%
- Average Customer LTV: €${summary.avgLtv.toLocaleString()}

### Pricing Model
Type: ${pricingStructure.model_type} (subscription + usage-based per shipping label)

### Pricing Tiers
${pricingStructure.tiers
  .map(
    (t) =>
      `- **${t.name}**: €${t.price}/month | ${t.customer_count.toLocaleString()} customers | €${Math.round(t.revenue).toLocaleString()} revenue (${(t.revenue_share * 100).toFixed(1)}% of total)`
  )
  .join("\n")}

### Value Metrics
${pricingStructure.value_metrics
  .map(
    (v) =>
      `- **${v.name}** (${v.type}): ${v.measurement_method} | Correlation to expansion: ${(v.correlation_to_expansion * 100).toFixed(0)}%`
  )
  .join("\n")}

### Customer Segments
${segments
  .map(
    (s) =>
      `- **${s.name}** (${s.id}): ${s.customer_count.toLocaleString()} customers (${((s.customer_count / summary.totalCustomers) * 100).toFixed(1)}%) | ${(s.revenue_share * 100).toFixed(1)}% of revenue | Avg LTV: €${Math.round(s.avg_ltv).toLocaleString()} | Expansion rate: ${(s.expansion_rate * 100).toFixed(0)}%`
  )
  .join("\n")}

### Revenue Concentration
- Top 10% of customers: ${(economics.concentration.top_10_percent_revenue_share * 100).toFixed(1)}% of revenue
- Top customer: ${(economics.concentration.top_customer_revenue_share * 100).toFixed(2)}% of revenue
- HHI Index: ${Math.round(economics.concentration.hhi_index)} (${economics.concentration.risk_level} concentration risk)
- Assessment: ${economics.concentration.risk_description}

### Unit Economics by Segment
${Object.entries(economics.arpu_by_segment)
  .map(
    ([seg, arpu]) =>
      `- **${seg}**: ARPU €${Math.round(arpu).toLocaleString()}/month | LTV €${Math.round(economics.ltv_by_segment[seg]).toLocaleString()}`
  )
  .join("\n")}

### Churn Rates by Tier
${Object.entries(economics.churn_by_tier)
  .map(([tier, rate]) => `- **${tier}**: ${(rate * 100).toFixed(1)}%/month`)
  .join("\n")}

### Price Sensitivity by Segment
${Object.entries(economics.sensitivity_model.segment_elasticity)
  .map(
    ([seg, elasticity]) =>
      `- **${seg}**: Elasticity ${elasticity} | Churn per 1% price increase: ${(economics.sensitivity_model.churn_per_percent_increase[seg as keyof typeof economics.sensitivity_model.churn_per_percent_increase] * 100).toFixed(2)}%`
  )
  .join("\n")}`;
}

/**
 * Build agent-specific persona for the system prompt
 */
export function buildAgentPersona(agentId: AgentId): string {
  const agent = AGENTS[agentId];
  if (!agent) return "";

  return `
## Your Perspective
You are responding as the **${agent.title}** (${agent.id}).

Your areas of expertise:
${agent.expertise.map((e) => `- ${e}`).join("\n")}

When answering questions, consider:
${agent.evaluationCriteria.map((c) => `- ${c}`).join("\n")}

Focus your response through this lens while still providing helpful, data-driven answers.`;
}

/**
 * Build the complete system prompt with data context (legacy version)
 * @deprecated Use buildSystemPromptFromDb for database-backed context
 */
export function buildSystemPrompt(
  data: GeneratedMyParcelData,
  agentId?: AgentId
): string {
  const basePrompt = `You are a pricing analyst assistant for a shipping platform (similar to MyParcel.nl).
You have access to REAL business data and should answer questions with ACTUAL numbers from the data below.

${buildDataContext(data)}

## Instructions
- Always cite specific numbers from the data above
- Format currency with € symbol and thousand separators
- Format percentages with one decimal place
- Be concise but comprehensive
- If asked about something not in the data, say so clearly
- When discussing segments or tiers, use the exact names from the data`;

  if (agentId) {
    return basePrompt + buildAgentPersona(agentId);
  }

  return basePrompt;
}

/**
 * Build the complete system prompt using ontology context from database
 */
export function buildSystemPromptFromDb(
  ontologyContext: string,
  agentId?: AgentId,
  companyName?: string,
  currencySymbol?: string
): string {
  const name = companyName ?? "B2B SaaS company";
  const currency = currencySymbol ?? "€";

  const basePrompt = `You are a pricing analyst assistant for ${name}.
You have access to REAL business data from the database and should answer questions with ACTUAL numbers from the data below.

## Your Business Data

${ontologyContext}

## Instructions
- Always cite specific numbers from the data above
- Format currency with ${currency} symbol and thousand separators
- Format percentages with one decimal place
- Be concise but comprehensive
- If asked about something not in the data, say so clearly
- When discussing segments or tiers, use the exact names from the data
- You can reference the ontology data to answer questions about pricing strategy, customer segments, and business performance`;

  if (agentId) {
    return basePrompt + buildAgentPersona(agentId);
  }

  return basePrompt;
}
