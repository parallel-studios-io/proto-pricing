/**
 * Pricing Decision Flow Engine
 *
 * Implements the 7-step pricing analysis flow:
 * 1. Ingest & Normalize
 * 2. Segment Detection
 * 3. Pricing Structure Mapping
 * 4. Unit Economics Calculation
 * 5. Option Generation
 * 6. Council Evaluation
 * 7. Decision Record
 */

import {
  PricingFlowState,
  PricingOption,
  PricingChange,
  ImpactModel,
  CouncilEvaluation,
  AgentView,
  CouncilRecommendation,
  DecisionRecord,
  DetectedSegment,
  UnitEconomics,
  PricingStructure,
} from "@/types/pricing-flow";

import {
  generateMyParcelData,
  GeneratedMyParcelData,
} from "@/lib/generators/myparcel";

// =============================================================================
// FLOW STATE MANAGEMENT
// =============================================================================

export function createFlowState(organizationId: string): PricingFlowState {
  return {
    current_step: 1,
    started_at: new Date(),
    organization_id: organizationId,
  };
}

export function advanceStep(state: PricingFlowState): PricingFlowState {
  if (state.current_step < 7) {
    return {
      ...state,
      current_step: (state.current_step + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    };
  }
  return {
    ...state,
    completed_at: new Date(),
  };
}

// =============================================================================
// STEP 1-4: DATA PROCESSING (Uses generators)
// =============================================================================

export async function runDataProcessingSteps(
  state: PricingFlowState
): Promise<PricingFlowState> {
  // Generate all data at once using our MyParcel generator
  const data = generateMyParcelData();

  return {
    ...state,
    current_step: 4,
    unified_customers: data.customers,
    segments: data.segments,
    pricing_structure: data.pricingStructure,
    economics: data.economics,
  };
}

// =============================================================================
// STEP 5: OPTION GENERATION
// =============================================================================

export function generatePricingOptions(
  segments: DetectedSegment[],
  economics: UnitEconomics,
  pricingStructure: PricingStructure
): PricingOption[] {
  const options: PricingOption[] = [];

  // Option 1: Platform Minimum Fee
  // Address the unprofitable bottom 50%
  const hobbySegment = segments.find((s) => s.id === "hobby");
  const smallSegment = segments.find((s) => s.id === "small");

  if (hobbySegment && smallSegment) {
    const affectedCustomers =
      hobbySegment.customer_count + Math.floor(smallSegment.customer_count * 0.5);
    const expectedChurnRate = 0.25; // 25% of affected will churn
    const minimumFee = 4.95;
    const remainingCustomers = affectedCustomers * (1 - expectedChurnRate);
    const newRevenue = remainingCustomers * minimumFee * 12;

    options.push({
      id: "platform-minimum",
      type: "minimum",
      description:
        "Introduce a €4.95/month platform minimum for all accounts. Addresses unprofitable long-tail while maintaining accessibility.",
      changes: [
        {
          type: "minimum",
          target: "all",
          from: "€0",
          to: "€4.95/mo",
          description: "New platform minimum fee for all accounts",
        },
        {
          type: "feature",
          target: "Free tier",
          from: "Free",
          to: "Starter (€4.95)",
          description: "Rename Free tier to Starter with minimum fee",
        },
      ],
      impact_model: {
        expected_arr_change: Math.round(newRevenue * 0.7), // Conservative
        expected_arr_change_percent: 2.5,
        optimistic_arr_change: Math.round(newRevenue),
        pessimistic_arr_change: Math.round(newRevenue * 0.4),
        expected_churn_increase: expectedChurnRate,
        time_to_full_impact_months: 6,
        confidence: 0.75,
      },
      risk_profile: "moderate",
      complexity: "low",
    });
  }

  // Option 2: Value Metric Shift - Labels as primary
  options.push({
    id: "usage-pricing",
    type: "value_metric_change",
    description:
      "Shift to pure usage-based pricing with per-label fees. Aligns revenue directly with customer value received.",
    changes: [
      {
        type: "structure",
        target: "pricing_model",
        from: "Subscription + Usage",
        to: "Pure Usage",
        description: "Remove subscription tiers, charge per label only",
      },
      {
        type: "price",
        target: "per_label",
        from: "€0.65-1.00",
        to: "€0.85 flat",
        description: "Standardized per-label pricing across all volumes",
      },
    ],
    impact_model: {
      expected_arr_change: -150000, // Slight decrease initially
      expected_arr_change_percent: -1.5,
      optimistic_arr_change: 200000,
      pessimistic_arr_change: -400000,
      expected_churn_increase: 0.02,
      time_to_full_impact_months: 12,
      confidence: 0.55,
    },
    risk_profile: "high",
    complexity: "high",
  });

  // Option 3: Enterprise Tier Enhancement
  const enterpriseSegment = segments.find((s) => s.id === "enterprise");
  if (enterpriseSegment) {
    const enterpriseRevenue = enterpriseSegment.revenue_share;
    const priceIncreasePercent = 0.15;
    const expectedRetention = 0.95;

    options.push({
      id: "enterprise-premium",
      type: "price_increase",
      description:
        "15% price increase on enterprise tier with enhanced SLA and dedicated support. Captures more value from highest-value segment.",
      changes: [
        {
          type: "price",
          target: "Max tier",
          from: "€249.95",
          to: "€299.95",
          description: "20% price increase on Max tier",
        },
        {
          type: "price",
          target: "Premium tier",
          from: "€99.95",
          to: "€119.95",
          description: "20% price increase on Premium tier",
        },
        {
          type: "feature",
          target: "Enterprise",
          from: "Standard SLA",
          to: "99.9% SLA + Priority Support",
          description: "Enhanced service level for premium tiers",
        },
      ],
      impact_model: {
        expected_arr_change: Math.round(
          enterpriseRevenue * 10_000_000 * priceIncreasePercent * expectedRetention
        ),
        expected_arr_change_percent: 8.5,
        optimistic_arr_change: Math.round(
          enterpriseRevenue * 10_000_000 * priceIncreasePercent
        ),
        pessimistic_arr_change: Math.round(
          enterpriseRevenue * 10_000_000 * priceIncreasePercent * 0.7
        ),
        expected_churn_increase: 0.005,
        time_to_full_impact_months: 3,
        confidence: 0.85,
      },
      risk_profile: "low",
      complexity: "low",
    });
  }

  // Option 4: Good-Better-Best Restructure
  options.push({
    id: "tier-restructure",
    type: "packaging",
    description:
      "Simplify to 3 tiers (Starter, Growth, Enterprise) with clearer value differentiation. Reduces complexity and improves upgrade path.",
    changes: [
      {
        type: "tier",
        target: "Free + Start",
        from: "2 tiers",
        to: "Starter (€14.95)",
        description: "Merge Free and Start into new Starter tier",
      },
      {
        type: "tier",
        target: "Plus + Premium",
        from: "2 tiers",
        to: "Growth (€79.95)",
        description: "Merge Plus and Premium into new Growth tier",
      },
      {
        type: "tier",
        target: "Max",
        from: "Max (€249.95)",
        to: "Enterprise (€349.95)",
        description: "Rebrand Max as Enterprise with enhanced features",
      },
    ],
    impact_model: {
      expected_arr_change: 450000,
      expected_arr_change_percent: 4.2,
      optimistic_arr_change: 750000,
      pessimistic_arr_change: 150000,
      expected_churn_increase: 0.03,
      time_to_full_impact_months: 9,
      confidence: 0.65,
    },
    risk_profile: "moderate",
    complexity: "medium",
  });

  return options;
}

// =============================================================================
// STEP 6: COUNCIL EVALUATION
// =============================================================================

export function evaluateWithCouncil(
  option: PricingOption,
  segments: DetectedSegment[],
  economics: UnitEconomics
): CouncilEvaluation {
  // CFO Lens - Finance
  const financeView = evaluateAsFinance(option, economics);

  // CRO Lens - Growth
  const growthView = evaluateAsGrowth(option, segments);

  // CPO Lens - Product
  const productView = evaluateAsProduct(option, segments);

  // CSO Lens - Strategy
  const strategyView = evaluateAsStrategy(option, economics);

  // Synthesize recommendation
  const recommendation = synthesizeRecommendation(
    option,
    [financeView, growthView, productView, strategyView]
  );

  return {
    option_id: option.id,
    finance_view: financeView,
    growth_view: growthView,
    product_view: productView,
    strategy_view: strategyView,
    recommendation,
  };
}

function evaluateAsFinance(option: PricingOption, economics: UnitEconomics): AgentView {
  const impact = option.impact_model;

  let reasoning = "";
  let recommendation: AgentView["recommendation"] = "neutral";
  const keyPoints: string[] = [];

  // Evaluate revenue impact
  if (impact.expected_arr_change_percent > 5) {
    keyPoints.push(`Strong revenue uplift of ${impact.expected_arr_change_percent}%`);
    recommendation = "support";
  } else if (impact.expected_arr_change_percent > 0) {
    keyPoints.push(`Modest revenue increase of ${impact.expected_arr_change_percent}%`);
  } else {
    keyPoints.push(`Revenue risk of ${impact.expected_arr_change_percent}%`);
    recommendation = "oppose";
  }

  // Evaluate confidence
  if (impact.confidence > 0.8) {
    keyPoints.push("High confidence in projections based on historical data");
    if (recommendation === "support") recommendation = "strongly_support";
  } else if (impact.confidence < 0.6) {
    keyPoints.push("Low confidence - limited data for accurate modeling");
    if (recommendation === "support") recommendation = "neutral";
  }

  // Evaluate concentration risk
  if (option.type === "price_increase" && economics.concentration.risk_level === "critical") {
    keyPoints.push("Warning: High revenue concentration increases risk of price increase");
  }

  // Cash flow timing
  if (impact.time_to_full_impact_months > 6) {
    keyPoints.push(`Extended timeline (${impact.time_to_full_impact_months}mo) delays cash flow benefit`);
  }

  reasoning = `From a financial perspective, this option shows ${
    impact.expected_arr_change > 0 ? "positive" : "negative"
  } revenue impact with ${impact.confidence > 0.7 ? "reasonable" : "uncertain"} confidence. ` +
    `The ${option.risk_profile} risk profile is ${
      option.risk_profile === "low" ? "acceptable" : "a concern"
    } given current margin pressures.`;

  return {
    agent: "CFO",
    reasoning,
    key_points: keyPoints,
    recommendation,
    impact: {
      arr_change: impact.expected_arr_change,
      margin_impact: option.type === "price_increase" ? "Positive" : "Neutral",
      cash_flow_timing: `${impact.time_to_full_impact_months} months`,
    },
    confidence: impact.confidence,
  };
}

function evaluateAsGrowth(option: PricingOption, segments: DetectedSegment[]): AgentView {
  const keyPoints: string[] = [];
  let recommendation: AgentView["recommendation"] = "neutral";

  // Evaluate churn impact
  const churnIncrease = option.impact_model.expected_churn_increase;
  if (churnIncrease > 0.1) {
    keyPoints.push(`High churn risk (${(churnIncrease * 100).toFixed(0)}%) threatens customer base`);
    recommendation = "oppose";
  } else if (churnIncrease > 0.05) {
    keyPoints.push(`Moderate churn risk (${(churnIncrease * 100).toFixed(0)}%) requires mitigation`);
  } else {
    keyPoints.push(`Low churn impact (${(churnIncrease * 100).toFixed(1)}%) is manageable`);
    recommendation = "support";
  }

  // Evaluate segment impact
  const growingSegment = segments.find((s) => s.id === "growing");
  if (growingSegment && option.type === "minimum") {
    keyPoints.push("May create friction for scaling webshops - our growth engine");
  }

  // Evaluate competitive position
  if (option.type === "price_increase") {
    keyPoints.push("Price increase may impact competitive win rate");
  }

  // Expansion revenue
  if (option.type === "packaging" || option.type === "value_metric_change") {
    keyPoints.push("Clearer upgrade path could improve expansion revenue");
    if (recommendation !== "oppose") recommendation = "support";
  }

  const reasoning = `From a growth perspective, the ${(churnIncrease * 100).toFixed(1)}% expected churn increase ` +
    `${churnIncrease < 0.05 ? "is acceptable" : "is concerning"}. ` +
    `${option.type === "minimum" ? "The platform minimum may deter some potential customers but filters for quality." : ""}`;

  return {
    agent: "CRO",
    reasoning,
    key_points: keyPoints,
    recommendation,
    impact: {
      churn_risk: `${(churnIncrease * 100).toFixed(1)}%`,
      segment_impact: option.type === "minimum" ? "Hobby/Small" : "All segments",
      competitive_position: option.type === "price_increase" ? "Weakened" : "Maintained",
    },
    confidence: 0.7,
  };
}

function evaluateAsProduct(option: PricingOption, segments: DetectedSegment[]): AgentView {
  const keyPoints: string[] = [];
  let recommendation: AgentView["recommendation"] = "neutral";

  // Value metric alignment
  if (option.type === "value_metric_change") {
    keyPoints.push("Usage-based pricing aligns cost with value delivered");
    recommendation = "strongly_support";
  }

  // Packaging clarity
  if (option.type === "packaging") {
    keyPoints.push("Simplified tier structure improves upgrade path clarity");
    recommendation = "support";
  }

  // Customer experience
  if (option.type === "minimum") {
    keyPoints.push("Platform minimum creates friction for trial/evaluation");
    keyPoints.push("May need free trial period to maintain conversion");
  }

  // Feature bundling
  if (option.changes.some((c) => c.type === "feature")) {
    keyPoints.push("Feature changes require product development coordination");
  }

  const reasoning = `From a product perspective, ${
    option.type === "value_metric_change"
      ? "usage-based pricing best aligns with how customers perceive value"
      : option.type === "packaging"
      ? "simpler packaging reduces decision complexity"
      : "the change has moderate product implications"
  }. Customer experience impact should be carefully managed through communication.`;

  return {
    agent: "CPO",
    reasoning,
    key_points: keyPoints,
    recommendation,
    impact: {
      value_alignment: option.type === "value_metric_change" ? "Strong" : "Moderate",
      ux_impact: option.type === "minimum" ? "Negative friction" : "Neutral",
      upgrade_clarity: option.type === "packaging" ? "Improved" : "Unchanged",
    },
    confidence: 0.75,
  };
}

function evaluateAsStrategy(option: PricingOption, economics: UnitEconomics): AgentView {
  const keyPoints: string[] = [];
  let recommendation: AgentView["recommendation"] = "neutral";

  // Long-term positioning
  if (option.type === "minimum") {
    keyPoints.push("Platform minimum signals market maturity and quality positioning");
    recommendation = "support";
  }

  // Concentration risk
  if (economics.concentration.risk_level === "critical" || economics.concentration.risk_level === "high") {
    if (option.type === "price_increase") {
      keyPoints.push("Price increase on concentrated revenue base increases risk");
      recommendation = "oppose";
    } else if (option.type === "minimum") {
      keyPoints.push("Minimum fee could improve segment diversification long-term");
      recommendation = "support";
    }
  }

  // Reversibility
  if (option.complexity === "high") {
    keyPoints.push("Complex change is difficult to reverse - limits strategic optionality");
  } else {
    keyPoints.push("Change is reversible - maintains strategic flexibility");
  }

  // Market timing
  keyPoints.push(
    option.risk_profile === "low"
      ? "Low-risk approach suitable for current market conditions"
      : "Higher-risk approach requires strong market position"
  );

  const reasoning = `From a strategic perspective, this option ${
    option.type === "minimum"
      ? "positions us as a premium platform while addressing profitability"
      : option.type === "price_increase"
      ? "captures more value but increases concentration risk"
      : "provides tactical improvement without major strategic shift"
  }. The ${option.complexity} complexity ${
    option.complexity === "low" ? "allows quick iteration" : "requires careful execution"
  }.`;

  return {
    agent: "CSO",
    reasoning,
    key_points: keyPoints,
    recommendation,
    impact: {
      market_position: option.type === "minimum" ? "Premium" : "Unchanged",
      reversibility: option.complexity === "low" ? "High" : "Low",
      strategic_optionality: option.complexity === "high" ? "Reduced" : "Maintained",
    },
    confidence: 0.7,
  };
}

function synthesizeRecommendation(
  option: PricingOption,
  views: AgentView[]
): CouncilRecommendation {
  // Score the views
  const scoreMap: Record<AgentView["recommendation"], number> = {
    strongly_support: 2,
    support: 1,
    neutral: 0,
    oppose: -1,
    strongly_oppose: -2,
  };

  const totalScore = views.reduce((sum, v) => sum + scoreMap[v.recommendation], 0);
  const avgScore = totalScore / views.length;

  // Determine consensus
  const recommendations = views.map((v) => v.recommendation);
  const hasOpposition = recommendations.some((r) => r === "oppose" || r === "strongly_oppose");
  const hasSupport = recommendations.some((r) => r === "support" || r === "strongly_support");

  let consensus: CouncilRecommendation["consensus"];
  if (avgScore >= 1.5) consensus = "strong";
  else if (avgScore >= 0.5) consensus = "moderate";
  else if (hasOpposition && hasSupport) consensus = "divided";
  else consensus = "weak";

  // Build reasoning chain
  const reasoningChain: string[] = [];

  if (avgScore > 0) {
    reasoningChain.push(`Overall positive assessment (score: ${avgScore.toFixed(1)}/2)`);
  } else {
    reasoningChain.push(`Mixed or negative assessment (score: ${avgScore.toFixed(1)}/2)`);
  }

  // Add key insights from each view
  for (const view of views) {
    if (view.key_points.length > 0) {
      reasoningChain.push(`${view.agent}: ${view.key_points[0]}`);
    }
  }

  // Identify trade-offs
  const tradeOffs: string[] = [];
  if (option.impact_model.expected_churn_increase > 0.02) {
    tradeOffs.push("Revenue growth vs. customer retention");
  }
  if (option.complexity !== "low") {
    tradeOffs.push("Implementation effort vs. speed to value");
  }
  if (hasOpposition && hasSupport) {
    tradeOffs.push("Conflicting stakeholder priorities");
  }

  // Generate summary
  let summary: string;
  if (avgScore >= 1) {
    summary = `The council recommends proceeding with "${option.description.substring(0, 50)}..." ` +
      `with ${consensus} consensus. Expected ARR impact: €${option.impact_model.expected_arr_change.toLocaleString()}.`;
  } else if (avgScore >= 0) {
    summary = `The council has mixed views on this option. Consider modifications or alternative approaches ` +
      `before proceeding. Key concern: ${views.find((v) => scoreMap[v.recommendation] < 0)?.key_points[0] || "risk profile"}.`;
  } else {
    summary = `The council does not recommend this option in its current form. ` +
      `Primary concerns: ${views.filter((v) => scoreMap[v.recommendation] < 0).map((v) => v.key_points[0]).join("; ")}.`;
  }

  return {
    option_id: option.id,
    consensus,
    reasoning_chain: reasoningChain,
    trade_offs: tradeOffs,
    summary,
  };
}

// =============================================================================
// STEP 7: DECISION RECORD
// =============================================================================

export function createDecisionRecord(
  question: string,
  options: PricingOption[],
  chosenOptionId: string,
  reasoning: string,
  ontologySnapshotId: string
): DecisionRecord {
  return {
    id: `dec_${Math.random().toString(36).substring(2, 10)}`,
    timestamp: new Date(),
    question,
    options_considered: options.map((o) => o.id),
    chosen_option: chosenOptionId,
    reasoning,
    ontology_snapshot_id: ontologySnapshotId,
  };
}

// =============================================================================
// FULL FLOW EXECUTION
// =============================================================================

export interface FlowResult {
  state: PricingFlowState;
  data: GeneratedMyParcelData;
  options: PricingOption[];
  evaluations: CouncilEvaluation[];
  recommendedOption: PricingOption | null;
}

export async function runFullPricingFlow(organizationId: string): Promise<FlowResult> {
  // Generate data
  const data = generateMyParcelData();

  // Create flow state
  let state = createFlowState(organizationId);

  // Update state with data
  state = {
    ...state,
    current_step: 4,
    unified_customers: data.customers,
    segments: data.segments,
    pricing_structure: data.pricingStructure,
    economics: data.economics,
  };

  // Generate options
  const options = generatePricingOptions(
    data.segments,
    data.economics,
    data.pricingStructure
  );

  state = {
    ...state,
    current_step: 5,
    options,
  };

  // Evaluate each option with council
  const evaluations: CouncilEvaluation[] = options.map((option) =>
    evaluateWithCouncil(option, data.segments, data.economics)
  );

  // Find recommended option (highest consensus with positive score)
  const scoredOptions = evaluations.map((e, i) => ({
    evaluation: e,
    option: options[i],
    score:
      e.recommendation.consensus === "strong"
        ? 4
        : e.recommendation.consensus === "moderate"
        ? 3
        : e.recommendation.consensus === "weak"
        ? 1
        : 0,
  }));

  scoredOptions.sort((a, b) => b.score - a.score);
  const recommendedOption = scoredOptions[0]?.option || null;

  state = {
    ...state,
    current_step: 6,
    evaluation: evaluations[0],
  };

  return {
    state,
    data,
    options,
    evaluations,
    recommendedOption,
  };
}
