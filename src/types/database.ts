// =============================================================================
// DATABASE TYPES - Supabase schema types
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
}

export interface ApiConnection {
  id: string;
  organization_id: string;
  provider: "stripe" | "hubspot";
  status: "pending" | "connected" | "error" | "disconnected";
  credentials_encrypted?: string;
  last_sync_at?: string;
  sync_status?: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// STRIPE DATA TYPES
// =============================================================================

export interface StripeCustomer {
  id: string;
  organization_id: string;
  stripe_id: string;
  email?: string;
  name?: string;
  description?: string;
  phone?: string;
  address?: Json;
  currency: string;
  balance: number;
  delinquent: boolean;
  default_source?: string;
  invoice_prefix?: string;
  invoice_settings?: Json;
  metadata: Json;
  stripe_created?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface StripeProduct {
  id: string;
  organization_id: string;
  stripe_id: string;
  name: string;
  description?: string;
  active: boolean;
  default_price_id?: string;
  unit_label?: string;
  statement_descriptor?: string;
  tax_code?: string;
  images?: string[];
  metadata: Json;
  stripe_created?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface StripePrice {
  id: string;
  organization_id: string;
  stripe_id: string;
  product_id?: string;
  stripe_product_id: string;
  active: boolean;
  currency: string;
  unit_amount?: number;
  unit_amount_decimal?: string;
  type: "one_time" | "recurring";
  billing_scheme: "per_unit" | "tiered";
  recurring_interval?: "day" | "week" | "month" | "year";
  recurring_interval_count?: number;
  recurring_usage_type?: "licensed" | "metered";
  tiers?: Json;
  tiers_mode?: "graduated" | "volume";
  transform_quantity?: Json;
  metadata: Json;
  stripe_created?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface StripeSubscription {
  id: string;
  organization_id: string;
  stripe_id: string;
  customer_id?: string;
  stripe_customer_id: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
  current_period_start?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  cancel_at_period_end: boolean;
  ended_at?: string;
  trial_start?: string;
  trial_end?: string;
  collection_method: string;
  default_payment_method?: string;
  billing_cycle_anchor?: string;
  days_until_due?: number;
  metadata: Json;
  stripe_created?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface StripeSubscriptionItem {
  id: string;
  organization_id: string;
  stripe_id: string;
  subscription_id?: string;
  stripe_subscription_id: string;
  price_id?: string;
  stripe_price_id: string;
  quantity: number;
  metadata: Json;
  stripe_created?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface StripeInvoice {
  id: string;
  organization_id: string;
  stripe_id: string;
  customer_id?: string;
  stripe_customer_id: string;
  subscription_id?: string;
  stripe_subscription_id?: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  collection_method?: string;
  currency?: string;
  amount_due?: number;
  amount_paid?: number;
  amount_remaining?: number;
  subtotal?: number;
  subtotal_excluding_tax?: number;
  tax?: number;
  total?: number;
  total_excluding_tax?: number;
  period_start?: string;
  period_end?: string;
  due_date?: string;
  paid_at?: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  number?: string;
  metadata: Json;
  stripe_created?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface StripeInvoiceLineItem {
  id: string;
  organization_id: string;
  stripe_id: string;
  invoice_id?: string;
  stripe_invoice_id: string;
  type: "invoiceitem" | "subscription";
  description?: string;
  currency?: string;
  amount?: number;
  quantity?: number;
  price_id?: string;
  stripe_price_id?: string;
  subscription_item_id?: string;
  period_start?: string;
  period_end?: string;
  proration: boolean;
  metadata: Json;
  synced_at: string;
  created_at: string;
}

// =============================================================================
// HUBSPOT DATA TYPES
// =============================================================================

export interface HubSpotContact {
  id: string;
  organization_id: string;
  hubspot_id: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  jobtitle?: string;
  lifecycle_stage?: string;
  lead_status?: string;
  hs_lead_status?: string;
  associated_company_id?: string;
  owner_id?: string;
  properties: Json;
  hubspot_created?: string;
  hubspot_updated?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface HubSpotCompany {
  id: string;
  organization_id: string;
  hubspot_id: string;
  name?: string;
  domain?: string;
  industry?: string;
  type?: string;
  description?: string;
  numberofemployees?: number;
  annualrevenue?: number;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  website?: string;
  owner_id?: string;
  lifecycle_stage?: string;
  properties: Json;
  hubspot_created?: string;
  hubspot_updated?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface HubSpotDeal {
  id: string;
  organization_id: string;
  hubspot_id: string;
  dealname?: string;
  amount?: number;
  dealstage?: string;
  pipeline?: string;
  closedate?: string;
  hs_deal_stage_probability?: number;
  deal_currency_code?: string;
  owner_id?: string;
  associated_company_id?: string;
  properties: Json;
  hubspot_created?: string;
  hubspot_updated?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// UNIFIED DATA TYPES
// =============================================================================

export interface Product {
  id: string;
  organization_id: string;
  stripe_product_id?: string;
  name: string;
  description?: string;
  product_type: "subscription" | "usage" | "one_time";
  base_price?: number;
  currency: string;
  billing_interval?: "monthly" | "annual";
  usage_unit?: string;
  tier_id?: string;
  active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface UnifiedCustomer {
  id: string;
  organization_id: string;
  stripe_customer_id?: string;
  hubspot_contact_id?: string;
  hubspot_company_id?: string;
  name: string;
  email?: string;
  company_name?: string;
  segment_id?: string;
  mrr: number;
  arr: number; // Generated column
  ltv: number;
  tenure_months: number;
  current_tier_id?: string;
  billing_interval?: "monthly" | "annual";
  industry?: string;
  company_size?: "startup" | "smb" | "mid_market" | "enterprise";
  country?: string;
  employee_count?: number;
  status: "active" | "churned" | "at_risk";
  churned_at?: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface CustomerExpansionEvent {
  id: string;
  organization_id: string;
  customer_id: string;
  event_type: "upgrade" | "downgrade" | "expansion" | "contraction";
  from_mrr: number;
  to_mrr: number;
  delta_mrr: number; // Generated column
  from_tier_id?: string;
  to_tier_id?: string;
  reason?: string;
  occurred_at: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  organization_id: string;
  customer_id: string;
  stripe_invoice_id?: string;
  stripe_invoice_line_item_id?: string;
  transaction_type: "subscription" | "usage" | "one_time" | "refund";
  amount: number;
  currency: string;
  quantity: number;
  product_id?: string;
  occurred_at: string;
  created_at: string;
}

// =============================================================================
// ONTOLOGY TYPES
// =============================================================================

export interface SegmentCriteria {
  company_size?: ("startup" | "smb" | "mid_market" | "enterprise")[];
  mrr_range?: [number, number];
  tenure_range?: [number, number];
  industry?: string[];
  behavior?: "high_volume" | "growing" | "stable" | "declining";
}

export interface Segment {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  customer_count: number;
  total_revenue: number;
  revenue_share: number;
  avg_mrr: number;
  avg_ltv: number;
  median_ltv: number;
  retention_rate: number;
  churn_rate: number;
  expansion_rate: number;
  ltv_p25?: number;
  ltv_p50?: number;
  ltv_p75?: number;
  ltv_p90?: number;
  retention_curve: number[];
  value_drivers: string[];
  is_system_generated: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingTier {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_annual?: number;
  annual_discount_percent: number;
  features: string[];
  value_metric_limits: Record<string, number | "unlimited">;
  customer_count: number;
  total_revenue: number;
  revenue_share: number;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ValueMetric {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  metric_type: "primary" | "secondary";
  correlation_to_expansion?: number;
  correlation_to_retention?: number;
  measurement_method?: string;
  measurement_unit?: string;
  examples: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pattern {
  id: string;
  organization_id: string;
  pattern_type:
    | "upgrade_trigger"
    | "churn_signal"
    | "expansion_ready"
    | "seasonal"
    | "discount_sensitive"
    | "price_anchor";
  name: string;
  description?: string;
  affected_segments: string[];
  affected_tiers: string[];
  frequency: number;
  confidence: number;
  sample_size: number;
  recommended_action?: string;
  pattern_definition: Json;
  is_active: boolean;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface SegmentEconomics {
  segment_id: string;
  mrr: number;
  arpu: number;
  ltv: number;
  churn_rate: number;
  expansion_rate: number;
}

export interface PriceSensitivity {
  elasticity: number;
  churn_per_pct_increase: number;
  optimal_price_range?: [number, number];
}

export interface EconomicsSnapshot {
  id: string;
  organization_id: string;
  snapshot_date: string;
  total_mrr: number;
  total_arr: number;
  total_customers: number;
  net_revenue_retention?: number;
  gross_revenue_retention?: number;
  mrr_growth_rate?: number;
  top_10_pct_revenue_share?: number;
  top_customer_revenue_share?: number;
  hhi_index?: number;
  concentration_risk_level?: "low" | "moderate" | "high" | "critical";
  concentration_description?: string;
  segment_economics: SegmentEconomics[];
  price_sensitivity_model: Record<string, PriceSensitivity>;
  created_at: string;
}

// =============================================================================
// DECISION & AUDIT TYPES
// =============================================================================

export interface OntologySnapshot {
  id: string;
  organization_id: string;
  version: number;
  description?: string;
  segments_snapshot: Json;
  tiers_snapshot: Json;
  economics_snapshot: Json;
  patterns_snapshot: Json;
  value_metrics_snapshot: Json;
  triggered_by?: string;
  trigger_details: Json;
  created_at: string;
}

export interface PricingChange {
  type: "price" | "structure" | "tier" | "feature" | "minimum";
  target: string;
  from: string | number;
  to: string | number;
  description: string;
}

export interface PricingOption {
  id: string;
  organization_id: string;
  option_type:
    | "price_increase"
    | "new_tier"
    | "value_metric_change"
    | "packaging"
    | "minimum"
    | "discount_strategy";
  description: string;
  changes: PricingChange[];
  expected_arr_change?: number;
  expected_arr_change_percent?: number;
  optimistic_arr_change?: number;
  pessimistic_arr_change?: number;
  expected_churn_increase?: number;
  time_to_full_impact_months?: number;
  confidence?: number;
  risk_profile: "low" | "moderate" | "high";
  complexity: "low" | "medium" | "high";
  status: "draft" | "proposed" | "approved" | "rejected" | "implemented";
  created_at: string;
  updated_at: string;
}

export interface AgentEvaluation {
  reasoning: string;
  recommendation:
    | "strongly_support"
    | "support"
    | "neutral"
    | "oppose"
    | "strongly_oppose";
  confidence: number;
  key_points: string[];
  risks?: string[];
  impact: Record<string, string | number>;
}

export interface CouncilEvaluation {
  id: string;
  organization_id: string;
  pricing_option_id: string;
  agent_evaluations: Record<string, AgentEvaluation>;
  consensus_level: "strong" | "moderate" | "weak" | "divided";
  reasoning_chain: string[];
  trade_offs: string[];
  modifications_suggested: string[];
  summary?: string;
  overall_score: number;
  created_at: string;
}

export interface DecisionRecord {
  id: string;
  organization_id: string;
  question: string;
  context: Json;
  options_considered: string[];
  chosen_option_id?: string;
  reasoning: string;
  ontology_snapshot_id: string;
  decided_by?: string;
  decision_confidence?: number;
  outcome_measured_at?: string;
  actual_arr_change?: number;
  actual_churn_change?: number;
  accuracy_score?: number;
  learnings: string[];
  created_at: string;
  updated_at: string;
}

export interface OntologyAuditLog {
  id: string;
  organization_id: string;
  entity_type: "segment" | "tier" | "pattern" | "value_metric" | "economics";
  entity_id: string;
  action: "create" | "update" | "delete" | "archive";
  previous_state?: Json;
  new_state?: Json;
  changed_fields: string[];
  triggered_by: string;
  decision_record_id?: string;
  reason?: string;
  created_at: string;
}

// =============================================================================
// SUPABASE DATABASE TYPE
// =============================================================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Organization, "id">>;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Omit<OrganizationMember, "id" | "created_at">;
        Update: Partial<Omit<OrganizationMember, "id">>;
      };
      api_connections: {
        Row: ApiConnection;
        Insert: Omit<ApiConnection, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ApiConnection, "id">>;
      };
      stripe_customers: {
        Row: StripeCustomer;
        Insert: Omit<
          StripeCustomer,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<StripeCustomer, "id">>;
      };
      stripe_products: {
        Row: StripeProduct;
        Insert: Omit<
          StripeProduct,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<StripeProduct, "id">>;
      };
      stripe_prices: {
        Row: StripePrice;
        Insert: Omit<
          StripePrice,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<StripePrice, "id">>;
      };
      stripe_subscriptions: {
        Row: StripeSubscription;
        Insert: Omit<
          StripeSubscription,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<StripeSubscription, "id">>;
      };
      stripe_subscription_items: {
        Row: StripeSubscriptionItem;
        Insert: Omit<
          StripeSubscriptionItem,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<StripeSubscriptionItem, "id">>;
      };
      stripe_invoices: {
        Row: StripeInvoice;
        Insert: Omit<
          StripeInvoice,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<StripeInvoice, "id">>;
      };
      stripe_invoice_line_items: {
        Row: StripeInvoiceLineItem;
        Insert: Omit<StripeInvoiceLineItem, "id" | "created_at" | "synced_at">;
        Update: Partial<Omit<StripeInvoiceLineItem, "id">>;
      };
      hubspot_contacts: {
        Row: HubSpotContact;
        Insert: Omit<
          HubSpotContact,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<HubSpotContact, "id">>;
      };
      hubspot_companies: {
        Row: HubSpotCompany;
        Insert: Omit<
          HubSpotCompany,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<HubSpotCompany, "id">>;
      };
      hubspot_deals: {
        Row: HubSpotDeal;
        Insert: Omit<
          HubSpotDeal,
          "id" | "created_at" | "updated_at" | "synced_at"
        >;
        Update: Partial<Omit<HubSpotDeal, "id">>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id">>;
      };
      unified_customers: {
        Row: UnifiedCustomer;
        Insert: Omit<UnifiedCustomer, "id" | "arr" | "created_at" | "updated_at">;
        Update: Partial<Omit<UnifiedCustomer, "id" | "arr">>;
      };
      customer_expansion_events: {
        Row: CustomerExpansionEvent;
        Insert: Omit<CustomerExpansionEvent, "id" | "delta_mrr" | "created_at">;
        Update: never; // Expansion events are immutable
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at">;
        Update: never; // Transactions are immutable
      };
      segments: {
        Row: Segment;
        Insert: Omit<Segment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Segment, "id">>;
      };
      pricing_tiers: {
        Row: PricingTier;
        Insert: Omit<PricingTier, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<PricingTier, "id">>;
      };
      value_metrics: {
        Row: ValueMetric;
        Insert: Omit<ValueMetric, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ValueMetric, "id">>;
      };
      patterns: {
        Row: Pattern;
        Insert: Omit<Pattern, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Pattern, "id">>;
      };
      economics_snapshots: {
        Row: EconomicsSnapshot;
        Insert: Omit<EconomicsSnapshot, "id" | "created_at">;
        Update: never; // Snapshots are immutable
      };
      ontology_snapshots: {
        Row: OntologySnapshot;
        Insert: Omit<OntologySnapshot, "id" | "created_at">;
        Update: never; // Snapshots are immutable
      };
      pricing_options: {
        Row: PricingOption;
        Insert: Omit<PricingOption, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<PricingOption, "id">>;
      };
      council_evaluations: {
        Row: CouncilEvaluation;
        Insert: Omit<CouncilEvaluation, "id" | "created_at">;
        Update: never; // Evaluations are immutable
      };
      decision_records: {
        Row: DecisionRecord;
        Insert: Omit<DecisionRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DecisionRecord, "id">>;
      };
      ontology_audit_log: {
        Row: OntologyAuditLog;
        Insert: Omit<OntologyAuditLog, "id" | "created_at">;
        Update: never; // Audit logs are immutable
      };
    };
  };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

// Full ontology structure for reasoning
export interface Ontology {
  segments: Segment[];
  tiers: PricingTier[];
  valueMetrics: ValueMetric[];
  patterns: Pattern[];
  economics: EconomicsSnapshot | null;
}

// Demo organization ID (constant)
export const DEMO_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";
