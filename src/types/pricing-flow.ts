/**
 * Proto Pricing Decision Flow Schema
 * Based on the 7-step flow: Ingest → Segment → Pricing → Economics → Options → Council → Decision
 */

// =============================================================================
// LAYER 1: RECORD (Source Data)
// =============================================================================

export interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  created: number;
  currency: string;
  metadata: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customer_id: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  plan_id: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  quantity: number;
}

export interface StripeInvoice {
  id: string;
  customer_id: string;
  subscription_id?: string;
  amount_paid: number;
  currency: string;
  created: number;
  status: "paid" | "open" | "void" | "uncollectible";
  lines: {
    product_id: string;
    description: string;
    amount: number;
    quantity: number;
  }[];
}

export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  unit_label?: string;
  active: boolean;
  metadata: Record<string, string>;
}

export interface CRMContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_id?: string;
  lifecycle_stage?: string;
  lead_source?: string;
}

export interface CRMCompany {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  employee_count?: number;
  annual_revenue?: number;
  country?: string;
}

// =============================================================================
// STEP 1: INGEST & NORMALIZE (Output)
// =============================================================================

export interface UnifiedCustomer {
  id: string;
  stripe_id?: string;
  crm_id?: string;

  // Identity
  name: string;
  email: string;
  company_name?: string;

  // Segment assignment
  segment_id?: string;

  // Financial
  mrr: number;
  ltv: number;
  tenure_months: number;

  // Plan
  plan_id?: string;
  billing_interval: "monthly" | "annual";

  // Expansion tracking
  expansion_events: ExpansionEvent[];

  // Metadata
  industry?: string;
  company_size?: "startup" | "smb" | "mid_market" | "enterprise";
  country?: string;
}

export interface ExpansionEvent {
  date: Date;
  type: "upgrade" | "expansion" | "contraction" | "downgrade";
  from_mrr: number;
  to_mrr: number;
  reason?: string;
}

export interface TransactionStream {
  customer_id: string;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  type: "subscription" | "one_time" | "usage" | "refund";
  product_id: string;
  quantity?: number;
}

export interface ProductCatalog {
  id: string;
  name: string;
  type: "subscription" | "usage" | "one_time";
  base_price: number;
  billing_interval?: "monthly" | "annual";
  usage_unit?: string;
  tier_id?: string;
}

// =============================================================================
// STEP 2: SEGMENT DETECTION (Output)
// =============================================================================

export interface DetectedSegment {
  id: string;
  name: string;

  // Criteria that defines this segment
  criteria: SegmentCriteria;

  // Metrics
  customer_count: number;
  revenue_share: number; // 0-1

  // Economics
  avg_ltv: number;
  ltv_distribution: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  retention_curve: number[]; // 12 months of retention rates
  expansion_rate: number; // Annual

  // Value drivers - what makes them buy/stay
  value_drivers: string[];
}

export interface SegmentCriteria {
  size?: "startup" | "smb" | "mid_market" | "enterprise";
  industry?: string[];
  behavior?: "high_volume" | "growing" | "stable" | "declining";
  mrr_range?: [number, number];
  tenure_range?: [number, number]; // months
}

// =============================================================================
// STEP 3: PRICING STRUCTURE MAPPING (Output)
// =============================================================================

export interface PricingStructure {
  model_type: "flat" | "tiered" | "usage_based" | "hybrid";

  // Value metrics - what drives pricing
  value_metrics: ValueMetric[];

  // Tiers
  tiers: PricingTier[];

  // Discounting patterns
  discount_patterns: DiscountPattern[];
}

export interface ValueMetric {
  id: string;
  name: string;
  type: "primary" | "secondary";

  // How well it correlates with customer expansion
  correlation_to_expansion: number; // -1 to 1

  // How it's measured
  measurement_method: string;

  // Examples
  examples: string[];
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  billing_interval: "monthly" | "annual";

  // What's included
  value_metric_limits: Record<string, number | "unlimited">;
  features: string[];

  // Current performance
  customer_count: number;
  revenue: number;
  revenue_share: number;

  // Position in lineup
  position: number; // 1 = entry, higher = premium
}

export interface DiscountPattern {
  type: "annual" | "volume" | "negotiated" | "promotional";
  avg_discount_percent: number;
  frequency: number; // % of customers receiving this
  segment_correlation: string[]; // which segments get this
}

// =============================================================================
// STEP 4: UNIT ECONOMICS CALCULATION (Output)
// =============================================================================

export interface UnitEconomics {
  // Per-segment ARPU
  arpu_by_segment: Record<string, number>;

  // Per-segment LTV
  ltv_by_segment: Record<string, number>;

  // Churn by tier
  churn_by_tier: Record<string, number>;

  // Concentration risk
  concentration: ConcentrationMetrics;

  // Price sensitivity model
  sensitivity_model: PriceSensitivityModel;
}

export interface ConcentrationMetrics {
  // Revenue concentration
  top_10_percent_revenue_share: number;
  top_customer_revenue_share: number;

  // HHI index (0-10000)
  hhi_index: number;

  // Segment concentration
  segment_shares: Record<string, number>;

  // Risk assessment
  risk_level: "low" | "moderate" | "high" | "critical";
  risk_description: string;
}

export interface PriceSensitivityModel {
  // How different segments respond to price changes
  segment_elasticity: Record<string, number>; // -2 to 0 typically

  // Estimated churn impact per % price increase
  churn_per_percent_increase: Record<string, number>;

  // Sweet spots
  optimal_price_ranges: Record<string, [number, number]>;
}

// =============================================================================
// STEP 5: OPTION GENERATION (Output)
// =============================================================================

export interface PricingOption {
  id: string;
  type: "price_increase" | "new_tier" | "value_metric_change" | "packaging" | "minimum";

  // Description
  description: string;

  // What changes
  changes: PricingChange[];

  // Impact model
  impact_model: ImpactModel;

  // Risk profile
  risk_profile: "low" | "moderate" | "high";

  // Complexity to implement
  complexity: "low" | "medium" | "high";
}

export interface PricingChange {
  type: "price" | "structure" | "tier" | "feature" | "minimum";
  target: string; // tier name, segment name, or "all"
  from: string | number;
  to: string | number;
  description: string;
}

export interface ImpactModel {
  // Revenue impact
  expected_arr_change: number;
  expected_arr_change_percent: number;

  // Range
  optimistic_arr_change: number;
  pessimistic_arr_change: number;

  // Churn impact
  expected_churn_increase: number;

  // Timeline
  time_to_full_impact_months: number;

  // Confidence
  confidence: number; // 0-1
}

// =============================================================================
// STEP 6: COUNCIL EVALUATION (Output)
// =============================================================================

export interface CouncilEvaluation {
  option_id: string;

  // Four agent perspectives
  finance_view: AgentView;
  growth_view: AgentView;
  product_view: AgentView;
  strategy_view: AgentView;

  // Synthesis
  recommendation: CouncilRecommendation;
}

export interface AgentView {
  agent: "CFO" | "CRO" | "CPO" | "CSO";

  // Their assessment
  reasoning: string;

  // Specific concerns or opportunities
  key_points: string[];

  // Their vote
  recommendation: "strongly_support" | "support" | "neutral" | "oppose" | "strongly_oppose";

  // Impact from their lens
  impact: Record<string, string | number>;

  // Confidence in their assessment
  confidence: number;
}

export interface CouncilRecommendation {
  // Which option to pursue
  option_id: string;

  // Consensus level
  consensus: "strong" | "moderate" | "weak" | "divided";

  // Reasoning chain
  reasoning_chain: string[];

  // Key trade-offs surfaced
  trade_offs: string[];

  // Suggested modifications
  modifications?: string[];

  // Final recommendation
  summary: string;
}

// =============================================================================
// STEP 7: DECISION RECORD (Output)
// =============================================================================

export interface DecisionRecord {
  id: string;
  timestamp: Date;

  // The question asked
  question: string;

  // Options that were considered
  options_considered: string[]; // option IDs

  // What was chosen
  chosen_option: string;
  reasoning: string;

  // Snapshot of ontology at decision time
  ontology_snapshot_id: string;

  // Outcome tracking (populated later)
  outcome?: DecisionOutcome;
}

export interface DecisionOutcome {
  measured_at: Date;

  // Actual vs predicted
  actual_arr_change: number;
  predicted_arr_change: number;

  actual_churn_change: number;
  predicted_churn_change: number;

  // Assessment
  accuracy_score: number;
  learnings: string[];
}

// =============================================================================
// FULL FLOW STATE
// =============================================================================

export interface PricingFlowState {
  // Current step
  current_step: 1 | 2 | 3 | 4 | 5 | 6 | 7;

  // Step outputs
  unified_customers?: UnifiedCustomer[];
  transaction_streams?: TransactionStream[];
  product_catalog?: ProductCatalog[];

  segments?: DetectedSegment[];

  pricing_structure?: PricingStructure;

  economics?: UnitEconomics;

  options?: PricingOption[];

  evaluation?: CouncilEvaluation;

  decision?: DecisionRecord;

  // Metadata
  started_at: Date;
  completed_at?: Date;
  organization_id: string;
}

// =============================================================================
// MYPARCEL-SPECIFIC TYPES
// =============================================================================

export interface MyParcelProduct {
  id: string;
  name: string;
  carrier: "PostNL" | "DHL" | "DPD" | "UPS";
  type: "parcel" | "letterbox" | "pallet";
  destination: "domestic" | "eu" | "world";
  base_price: number;
  weight_limit_kg: number;
}

export interface MyParcelSubscription {
  tier: "Free" | "Start" | "Plus" | "Premium" | "Max";
  monthly_price: number;
  included_labels: number | "unlimited";
  discount_per_label: number;
  features: string[];
}

export interface MyParcelCustomerUsage {
  customer_id: string;
  month: string; // YYYY-MM
  labels_domestic: number;
  labels_eu: number;
  labels_world: number;
  carriers_used: string[];
  avg_parcel_weight: number;
  return_labels: number;
}
