-- Migration: Initial Schema
-- Creates organizations and membership tables

-- Organizations table (multi-tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members (user-org mapping)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- API connections (Stripe, HubSpot, etc.)
CREATE TABLE api_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'hubspot')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  credentials_encrypted TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(organization_id), ARRAY[]::UUID[])
  FROM organization_members
  WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check organization access
CREATE OR REPLACE FUNCTION has_organization_access(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check admin access
CREATE OR REPLACE FUNCTION has_admin_access(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_connections_updated_at
  BEFORE UPDATE ON api_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX idx_api_connections_org ON api_connections(organization_id);
-- Migration: Stripe Data Tables
-- Modeled on Stripe API objects

-- Stripe Customers
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  description TEXT,
  phone TEXT,
  address JSONB,
  currency TEXT DEFAULT 'eur',
  balance BIGINT DEFAULT 0,
  delinquent BOOLEAN DEFAULT FALSE,
  default_source TEXT,
  invoice_prefix TEXT,
  invoice_settings JSONB,
  metadata JSONB DEFAULT '{}',
  stripe_created TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, stripe_id)
);

-- Stripe Products
CREATE TABLE stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  default_price_id TEXT,
  unit_label TEXT,
  statement_descriptor TEXT,
  tax_code TEXT,
  images TEXT[],
  metadata JSONB DEFAULT '{}',
  stripe_created TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, stripe_id)
);

-- Stripe Prices
CREATE TABLE stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_id TEXT NOT NULL,
  product_id UUID REFERENCES stripe_products(id) ON DELETE SET NULL,
  stripe_product_id TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  currency TEXT NOT NULL,
  unit_amount BIGINT,
  unit_amount_decimal TEXT,
  type TEXT CHECK (type IN ('one_time', 'recurring')),
  billing_scheme TEXT CHECK (billing_scheme IN ('per_unit', 'tiered')),
  recurring_interval TEXT CHECK (recurring_interval IN ('day', 'week', 'month', 'year')),
  recurring_interval_count INT,
  recurring_usage_type TEXT CHECK (recurring_usage_type IN ('licensed', 'metered')),
  tiers JSONB,
  tiers_mode TEXT CHECK (tiers_mode IN ('graduated', 'volume')),
  transform_quantity JSONB,
  metadata JSONB DEFAULT '{}',
  stripe_created TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, stripe_id)
);

-- Stripe Subscriptions
CREATE TABLE stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_id TEXT NOT NULL,
  customer_id UUID REFERENCES stripe_customers(id) ON DELETE SET NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ended_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  collection_method TEXT DEFAULT 'charge_automatically',
  default_payment_method TEXT,
  billing_cycle_anchor TIMESTAMPTZ,
  days_until_due INT,
  metadata JSONB DEFAULT '{}',
  stripe_created TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, stripe_id)
);

-- Stripe Subscription Items
CREATE TABLE stripe_subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_id TEXT NOT NULL,
  subscription_id UUID REFERENCES stripe_subscriptions(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  price_id UUID REFERENCES stripe_prices(id) ON DELETE SET NULL,
  stripe_price_id TEXT NOT NULL,
  quantity INT DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  stripe_created TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, stripe_id)
);

-- Stripe Invoices
CREATE TABLE stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_id TEXT NOT NULL,
  customer_id UUID REFERENCES stripe_customers(id) ON DELETE SET NULL,
  stripe_customer_id TEXT NOT NULL,
  subscription_id UUID REFERENCES stripe_subscriptions(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  status TEXT CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  collection_method TEXT,
  currency TEXT,
  amount_due BIGINT,
  amount_paid BIGINT,
  amount_remaining BIGINT,
  subtotal BIGINT,
  subtotal_excluding_tax BIGINT,
  tax BIGINT,
  total BIGINT,
  total_excluding_tax BIGINT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  number TEXT,
  metadata JSONB DEFAULT '{}',
  stripe_created TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, stripe_id)
);

-- Stripe Invoice Line Items
CREATE TABLE stripe_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_id TEXT NOT NULL,
  invoice_id UUID REFERENCES stripe_invoices(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL,
  type TEXT CHECK (type IN ('invoiceitem', 'subscription')),
  description TEXT,
  currency TEXT,
  amount BIGINT,
  quantity INT,
  price_id UUID REFERENCES stripe_prices(id) ON DELETE SET NULL,
  stripe_price_id TEXT,
  subscription_item_id UUID REFERENCES stripe_subscription_items(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  proration BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, stripe_id)
);

-- Apply updated_at triggers
CREATE TRIGGER update_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_products_updated_at
  BEFORE UPDATE ON stripe_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_prices_updated_at
  BEFORE UPDATE ON stripe_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON stripe_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_subscription_items_updated_at
  BEFORE UPDATE ON stripe_subscription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_invoices_updated_at
  BEFORE UPDATE ON stripe_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_stripe_customers_org ON stripe_customers(organization_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(organization_id, stripe_id);
CREATE INDEX idx_stripe_customers_email ON stripe_customers(organization_id, email);
CREATE INDEX idx_stripe_products_org ON stripe_products(organization_id);
CREATE INDEX idx_stripe_prices_org ON stripe_prices(organization_id);
CREATE INDEX idx_stripe_prices_product ON stripe_prices(organization_id, product_id);
CREATE INDEX idx_stripe_subscriptions_org ON stripe_subscriptions(organization_id);
CREATE INDEX idx_stripe_subscriptions_customer ON stripe_subscriptions(organization_id, customer_id);
CREATE INDEX idx_stripe_invoices_org ON stripe_invoices(organization_id);
CREATE INDEX idx_stripe_invoices_customer ON stripe_invoices(organization_id, customer_id);
CREATE INDEX idx_stripe_invoice_line_items_org ON stripe_invoice_line_items(organization_id);
CREATE INDEX idx_stripe_invoice_line_items_invoice ON stripe_invoice_line_items(organization_id, invoice_id);
-- Migration: HubSpot Data Tables
-- Modeled on HubSpot API objects

-- HubSpot Contacts
CREATE TABLE hubspot_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hubspot_id TEXT NOT NULL,
  email TEXT,
  firstname TEXT,
  lastname TEXT,
  phone TEXT,
  company TEXT,
  jobtitle TEXT,
  lifecycle_stage TEXT,
  lead_status TEXT,
  hs_lead_status TEXT,
  associated_company_id TEXT,
  owner_id TEXT,
  properties JSONB DEFAULT '{}',
  hubspot_created TIMESTAMPTZ,
  hubspot_updated TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, hubspot_id)
);

-- HubSpot Companies
CREATE TABLE hubspot_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hubspot_id TEXT NOT NULL,
  name TEXT,
  domain TEXT,
  industry TEXT,
  type TEXT,
  description TEXT,
  numberofemployees INT,
  annualrevenue NUMERIC(15, 2),
  phone TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  website TEXT,
  owner_id TEXT,
  lifecycle_stage TEXT,
  properties JSONB DEFAULT '{}',
  hubspot_created TIMESTAMPTZ,
  hubspot_updated TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, hubspot_id)
);

-- HubSpot Deals
CREATE TABLE hubspot_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hubspot_id TEXT NOT NULL,
  dealname TEXT,
  amount NUMERIC(15, 2),
  dealstage TEXT,
  pipeline TEXT,
  closedate TIMESTAMPTZ,
  hs_deal_stage_probability NUMERIC(5, 2),
  deal_currency_code TEXT,
  owner_id TEXT,
  associated_company_id TEXT,
  properties JSONB DEFAULT '{}',
  hubspot_created TIMESTAMPTZ,
  hubspot_updated TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, hubspot_id)
);

-- HubSpot Contact-Company Associations
CREATE TABLE hubspot_contact_company_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES hubspot_contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES hubspot_companies(id) ON DELETE CASCADE,
  association_type TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, contact_id, company_id)
);

-- HubSpot Deal-Contact Associations
CREATE TABLE hubspot_deal_contact_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES hubspot_deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES hubspot_contacts(id) ON DELETE CASCADE,
  association_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, deal_id, contact_id)
);

-- Apply updated_at triggers
CREATE TRIGGER update_hubspot_contacts_updated_at
  BEFORE UPDATE ON hubspot_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hubspot_companies_updated_at
  BEFORE UPDATE ON hubspot_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hubspot_deals_updated_at
  BEFORE UPDATE ON hubspot_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_hubspot_contacts_org ON hubspot_contacts(organization_id);
CREATE INDEX idx_hubspot_contacts_hubspot_id ON hubspot_contacts(organization_id, hubspot_id);
CREATE INDEX idx_hubspot_contacts_email ON hubspot_contacts(organization_id, email);
CREATE INDEX idx_hubspot_companies_org ON hubspot_companies(organization_id);
CREATE INDEX idx_hubspot_companies_hubspot_id ON hubspot_companies(organization_id, hubspot_id);
CREATE INDEX idx_hubspot_companies_domain ON hubspot_companies(organization_id, domain);
CREATE INDEX idx_hubspot_deals_org ON hubspot_deals(organization_id);
CREATE INDEX idx_hubspot_deals_hubspot_id ON hubspot_deals(organization_id, hubspot_id);
CREATE INDEX idx_hubspot_contact_company_assoc_org ON hubspot_contact_company_associations(organization_id);
CREATE INDEX idx_hubspot_deal_contact_assoc_org ON hubspot_deal_contact_associations(organization_id);
-- Migration: Unified Data Layer
-- Normalized customer records merging Stripe + HubSpot

-- Products (unified catalog)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_product_id UUID REFERENCES stripe_products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT CHECK (product_type IN ('subscription', 'usage', 'one_time')),
  base_price NUMERIC(15, 2),
  currency TEXT DEFAULT 'eur',
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'annual')),
  usage_unit TEXT,
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified Customers (single source of truth)
CREATE TABLE unified_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source references
  stripe_customer_id UUID REFERENCES stripe_customers(id) ON DELETE SET NULL,
  hubspot_contact_id UUID REFERENCES hubspot_contacts(id) ON DELETE SET NULL,
  hubspot_company_id UUID REFERENCES hubspot_companies(id) ON DELETE SET NULL,

  -- Identity
  name TEXT NOT NULL,
  email TEXT,
  company_name TEXT,

  -- Segment assignment (will reference segments table after it's created)
  segment_id UUID,

  -- Financial metrics
  mrr NUMERIC(15, 2) DEFAULT 0,
  arr NUMERIC(15, 2) GENERATED ALWAYS AS (mrr * 12) STORED,
  ltv NUMERIC(15, 2) DEFAULT 0,
  tenure_months INT DEFAULT 0,

  -- Plan info (will reference pricing_tiers table after it's created)
  current_tier_id UUID,
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'annual')),

  -- Company attributes
  industry TEXT,
  company_size TEXT CHECK (company_size IN ('startup', 'smb', 'mid_market', 'enterprise')),
  country TEXT,
  employee_count INT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'churned', 'at_risk')),
  churned_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Expansion Events
CREATE TABLE customer_expansion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES unified_customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('upgrade', 'downgrade', 'expansion', 'contraction')),
  from_mrr NUMERIC(15, 2) NOT NULL,
  to_mrr NUMERIC(15, 2) NOT NULL,
  delta_mrr NUMERIC(15, 2) GENERATED ALWAYS AS (to_mrr - from_mrr) STORED,
  from_tier_id UUID,
  to_tier_id UUID,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (unified from Stripe invoices)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES unified_customers(id) ON DELETE CASCADE,

  -- Source reference
  stripe_invoice_id UUID REFERENCES stripe_invoices(id) ON DELETE SET NULL,
  stripe_invoice_line_item_id UUID REFERENCES stripe_invoice_line_items(id) ON DELETE SET NULL,

  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'usage', 'one_time', 'refund')),
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'eur',
  quantity INT DEFAULT 1,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_customers_updated_at
  BEFORE UPDATE ON unified_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_unified_customers_org ON unified_customers(organization_id);
CREATE INDEX idx_unified_customers_stripe ON unified_customers(organization_id, stripe_customer_id);
CREATE INDEX idx_unified_customers_hubspot ON unified_customers(organization_id, hubspot_contact_id);
CREATE INDEX idx_unified_customers_segment ON unified_customers(organization_id, segment_id);
CREATE INDEX idx_unified_customers_tier ON unified_customers(organization_id, current_tier_id);
CREATE INDEX idx_unified_customers_mrr ON unified_customers(organization_id, mrr DESC);
CREATE INDEX idx_unified_customers_status ON unified_customers(organization_id, status);
CREATE INDEX idx_customer_expansion_events_org ON customer_expansion_events(organization_id);
CREATE INDEX idx_customer_expansion_events_customer ON customer_expansion_events(organization_id, customer_id);
CREATE INDEX idx_customer_expansion_events_date ON customer_expansion_events(organization_id, occurred_at DESC);
CREATE INDEX idx_transactions_org ON transactions(organization_id);
CREATE INDEX idx_transactions_customer ON transactions(organization_id, customer_id);
CREATE INDEX idx_transactions_date ON transactions(organization_id, occurred_at DESC);
CREATE INDEX idx_transactions_type ON transactions(organization_id, transaction_type);
-- Migration: Ontology Layer
-- Segments, tiers, patterns, metrics, economics

-- Segments (customer cohorts)
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Criteria (JSON for flexibility)
  criteria JSONB NOT NULL DEFAULT '{}',

  -- Metrics (updated by analysis)
  customer_count INT DEFAULT 0,
  total_revenue NUMERIC(15, 2) DEFAULT 0,
  revenue_share NUMERIC(5, 4) DEFAULT 0,

  -- Economics
  avg_mrr NUMERIC(15, 2) DEFAULT 0,
  avg_ltv NUMERIC(15, 2) DEFAULT 0,
  median_ltv NUMERIC(15, 2) DEFAULT 0,
  retention_rate NUMERIC(5, 4) DEFAULT 0,
  churn_rate NUMERIC(5, 4) DEFAULT 0,
  expansion_rate NUMERIC(5, 4) DEFAULT 0,

  -- LTV Distribution
  ltv_p25 NUMERIC(15, 2),
  ltv_p50 NUMERIC(15, 2),
  ltv_p75 NUMERIC(15, 2),
  ltv_p90 NUMERIC(15, 2),

  -- Retention curve (12 months)
  retention_curve NUMERIC(5, 4)[] DEFAULT ARRAY[]::NUMERIC[],

  -- Value drivers
  value_drivers TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status
  is_system_generated BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing Tiers
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly NUMERIC(15, 2) NOT NULL,
  price_annual NUMERIC(15, 2),
  annual_discount_percent NUMERIC(5, 2) DEFAULT 0,

  -- Features and limits
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  value_metric_limits JSONB DEFAULT '{}',

  -- Performance metrics (updated by analysis)
  customer_count INT DEFAULT 0,
  total_revenue NUMERIC(15, 2) DEFAULT 0,
  revenue_share NUMERIC(5, 4) DEFAULT 0,

  -- Position in lineup
  position INT NOT NULL DEFAULT 1,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Value Metrics
CREATE TABLE value_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT CHECK (metric_type IN ('primary', 'secondary')),

  -- Correlation analysis
  correlation_to_expansion NUMERIC(5, 4),
  correlation_to_retention NUMERIC(5, 4),

  -- Measurement
  measurement_method TEXT,
  measurement_unit TEXT,

  -- Examples
  examples TEXT[] DEFAULT ARRAY[]::TEXT[],

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavioral Patterns
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'upgrade_trigger', 'churn_signal', 'expansion_ready',
    'seasonal', 'discount_sensitive', 'price_anchor'
  )),
  name TEXT NOT NULL,
  description TEXT,

  -- Scope
  affected_segments UUID[] DEFAULT ARRAY[]::UUID[],
  affected_tiers UUID[] DEFAULT ARRAY[]::UUID[],

  -- Metrics
  frequency NUMERIC(5, 4) DEFAULT 0,
  confidence NUMERIC(5, 4) DEFAULT 0,
  sample_size INT DEFAULT 0,

  -- Actions
  recommended_action TEXT,

  -- Pattern definition (for detection)
  pattern_definition JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT TRUE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregate Economics Snapshots
CREATE TABLE economics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Aggregate metrics
  total_mrr NUMERIC(15, 2) NOT NULL,
  total_arr NUMERIC(15, 2) NOT NULL,
  total_customers INT NOT NULL,

  -- Retention
  net_revenue_retention NUMERIC(6, 2),
  gross_revenue_retention NUMERIC(6, 2),
  mrr_growth_rate NUMERIC(6, 2),

  -- Concentration
  top_10_pct_revenue_share NUMERIC(5, 4),
  top_customer_revenue_share NUMERIC(5, 4),
  hhi_index NUMERIC(8, 2),
  concentration_risk_level TEXT CHECK (concentration_risk_level IN ('low', 'moderate', 'high', 'critical')),
  concentration_description TEXT,

  -- Segment economics (denormalized)
  segment_economics JSONB DEFAULT '[]',

  -- Price sensitivity
  price_sensitivity_model JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints to unified_customers now that tables exist
ALTER TABLE unified_customers
  ADD CONSTRAINT fk_unified_customers_segment
  FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE SET NULL;

ALTER TABLE unified_customers
  ADD CONSTRAINT fk_unified_customers_tier
  FOREIGN KEY (current_tier_id) REFERENCES pricing_tiers(id) ON DELETE SET NULL;

-- Add foreign key constraints to customer_expansion_events
ALTER TABLE customer_expansion_events
  ADD CONSTRAINT fk_expansion_events_from_tier
  FOREIGN KEY (from_tier_id) REFERENCES pricing_tiers(id) ON DELETE SET NULL;

ALTER TABLE customer_expansion_events
  ADD CONSTRAINT fk_expansion_events_to_tier
  FOREIGN KEY (to_tier_id) REFERENCES pricing_tiers(id) ON DELETE SET NULL;

-- Add tier_id column to products, then add foreign key
ALTER TABLE products ADD COLUMN tier_id UUID;

ALTER TABLE products
  ADD CONSTRAINT fk_products_tier
  FOREIGN KEY (tier_id) REFERENCES pricing_tiers(id) ON DELETE SET NULL;

-- Apply updated_at triggers
CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_tiers_updated_at
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_value_metrics_updated_at
  BEFORE UPDATE ON value_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patterns_updated_at
  BEFORE UPDATE ON patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_segments_org ON segments(organization_id);
CREATE INDEX idx_segments_active ON segments(organization_id, is_active);
CREATE INDEX idx_pricing_tiers_org ON pricing_tiers(organization_id);
CREATE INDEX idx_pricing_tiers_position ON pricing_tiers(organization_id, position);
CREATE INDEX idx_value_metrics_org ON value_metrics(organization_id);
CREATE INDEX idx_patterns_org ON patterns(organization_id);
CREATE INDEX idx_patterns_type ON patterns(organization_id, pattern_type);
CREATE INDEX idx_economics_snapshots_org ON economics_snapshots(organization_id);
CREATE INDEX idx_economics_snapshots_date ON economics_snapshots(organization_id, snapshot_date DESC);
-- Migration: Decision & Audit Layer
-- Snapshots, options, evaluations, decisions, audit log

-- Ontology Snapshots (versioned state)
CREATE TABLE ontology_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  version INT NOT NULL,
  description TEXT,

  -- Full ontology state (serialized)
  segments_snapshot JSONB NOT NULL,
  tiers_snapshot JSONB NOT NULL,
  economics_snapshot JSONB NOT NULL,
  patterns_snapshot JSONB NOT NULL,
  value_metrics_snapshot JSONB NOT NULL,

  -- Trigger info
  triggered_by TEXT,
  trigger_details JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, version)
);

-- Pricing Options (generated recommendations)
CREATE TABLE pricing_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  option_type TEXT NOT NULL CHECK (option_type IN (
    'price_increase', 'new_tier', 'value_metric_change',
    'packaging', 'minimum', 'discount_strategy'
  )),
  description TEXT NOT NULL,

  -- What changes
  changes JSONB NOT NULL DEFAULT '[]',

  -- Impact model
  expected_arr_change NUMERIC(15, 2),
  expected_arr_change_percent NUMERIC(6, 2),
  optimistic_arr_change NUMERIC(15, 2),
  pessimistic_arr_change NUMERIC(15, 2),
  expected_churn_increase NUMERIC(5, 4),
  time_to_full_impact_months INT,
  confidence NUMERIC(5, 4),

  -- Risk assessment
  risk_profile TEXT CHECK (risk_profile IN ('low', 'moderate', 'high')),
  complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')),

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'rejected', 'implemented')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Council Evaluations
CREATE TABLE council_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pricing_option_id UUID NOT NULL REFERENCES pricing_options(id) ON DELETE CASCADE,

  -- Individual agent views
  agent_evaluations JSONB NOT NULL,

  -- Synthesis
  consensus_level TEXT CHECK (consensus_level IN ('strong', 'moderate', 'weak', 'divided')),
  reasoning_chain TEXT[],
  trade_offs TEXT[],
  modifications_suggested TEXT[],
  summary TEXT,

  overall_score NUMERIC(4, 2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision Records (full audit trail)
CREATE TABLE decision_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- The question/context
  question TEXT NOT NULL,
  context JSONB DEFAULT '{}',

  -- Options considered
  options_considered UUID[] NOT NULL,

  -- Decision
  chosen_option_id UUID REFERENCES pricing_options(id),
  reasoning TEXT NOT NULL,

  -- Snapshot reference
  ontology_snapshot_id UUID NOT NULL REFERENCES ontology_snapshots(id),

  -- Decision metadata
  decided_by TEXT,
  decision_confidence NUMERIC(5, 4),

  -- Outcome tracking (populated later)
  outcome_measured_at TIMESTAMPTZ,
  actual_arr_change NUMERIC(15, 2),
  actual_churn_change NUMERIC(5, 4),
  accuracy_score NUMERIC(5, 4),
  learnings TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ontology Change Audit Log (immutable)
CREATE TABLE ontology_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'archive')),

  -- Change details
  previous_state JSONB,
  new_state JSONB,
  changed_fields TEXT[],

  -- Context
  triggered_by TEXT NOT NULL,
  decision_record_id UUID REFERENCES decision_records(id),
  reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at triggers
CREATE TRIGGER update_pricing_options_updated_at
  BEFORE UPDATE ON pricing_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decision_records_updated_at
  BEFORE UPDATE ON decision_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_ontology_snapshots_org ON ontology_snapshots(organization_id);
CREATE INDEX idx_ontology_snapshots_version ON ontology_snapshots(organization_id, version DESC);
CREATE INDEX idx_pricing_options_org ON pricing_options(organization_id);
CREATE INDEX idx_pricing_options_status ON pricing_options(organization_id, status);
CREATE INDEX idx_council_evaluations_org ON council_evaluations(organization_id);
CREATE INDEX idx_council_evaluations_option ON council_evaluations(organization_id, pricing_option_id);
CREATE INDEX idx_decision_records_org ON decision_records(organization_id);
CREATE INDEX idx_decision_records_date ON decision_records(organization_id, created_at DESC);
CREATE INDEX idx_ontology_audit_log_entity ON ontology_audit_log(organization_id, entity_type, entity_id);
CREATE INDEX idx_ontology_audit_log_created ON ontology_audit_log(organization_id, created_at DESC);
-- Migration: Row-Level Security Policies
-- Enable RLS and create policies for all tables

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_contact_company_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_deal_contact_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_expansion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE economics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ontology_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ontology_audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Organizations Policies
-- =============================================================================
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT UNNEST(get_user_organization_ids())));

CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  USING (has_admin_access(id));

-- =============================================================================
-- Organization Members Policies
-- =============================================================================
CREATE POLICY "Users can view their org memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid() OR has_organization_access(organization_id));

CREATE POLICY "Admins can insert org memberships"
  ON organization_members FOR INSERT
  WITH CHECK (has_admin_access(organization_id));

CREATE POLICY "Admins can update org memberships"
  ON organization_members FOR UPDATE
  USING (has_admin_access(organization_id));

CREATE POLICY "Admins can delete org memberships"
  ON organization_members FOR DELETE
  USING (has_admin_access(organization_id));

-- =============================================================================
-- Generic Policy Template for Organization-Scoped Tables
-- =============================================================================

-- API Connections
CREATE POLICY "api_connections_select" ON api_connections FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "api_connections_insert" ON api_connections FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "api_connections_update" ON api_connections FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "api_connections_delete" ON api_connections FOR DELETE
  USING (has_admin_access(organization_id));

-- Stripe Customers
CREATE POLICY "stripe_customers_select" ON stripe_customers FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_customers_insert" ON stripe_customers FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "stripe_customers_update" ON stripe_customers FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_customers_delete" ON stripe_customers FOR DELETE
  USING (has_admin_access(organization_id));

-- Stripe Products
CREATE POLICY "stripe_products_select" ON stripe_products FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_products_insert" ON stripe_products FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "stripe_products_update" ON stripe_products FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_products_delete" ON stripe_products FOR DELETE
  USING (has_admin_access(organization_id));

-- Stripe Prices
CREATE POLICY "stripe_prices_select" ON stripe_prices FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_prices_insert" ON stripe_prices FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "stripe_prices_update" ON stripe_prices FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_prices_delete" ON stripe_prices FOR DELETE
  USING (has_admin_access(organization_id));

-- Stripe Subscriptions
CREATE POLICY "stripe_subscriptions_select" ON stripe_subscriptions FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_subscriptions_insert" ON stripe_subscriptions FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "stripe_subscriptions_update" ON stripe_subscriptions FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_subscriptions_delete" ON stripe_subscriptions FOR DELETE
  USING (has_admin_access(organization_id));

-- Stripe Subscription Items
CREATE POLICY "stripe_subscription_items_select" ON stripe_subscription_items FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_subscription_items_insert" ON stripe_subscription_items FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "stripe_subscription_items_update" ON stripe_subscription_items FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_subscription_items_delete" ON stripe_subscription_items FOR DELETE
  USING (has_admin_access(organization_id));

-- Stripe Invoices
CREATE POLICY "stripe_invoices_select" ON stripe_invoices FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_invoices_insert" ON stripe_invoices FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "stripe_invoices_update" ON stripe_invoices FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_invoices_delete" ON stripe_invoices FOR DELETE
  USING (has_admin_access(organization_id));

-- Stripe Invoice Line Items
CREATE POLICY "stripe_invoice_line_items_select" ON stripe_invoice_line_items FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_invoice_line_items_insert" ON stripe_invoice_line_items FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "stripe_invoice_line_items_update" ON stripe_invoice_line_items FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "stripe_invoice_line_items_delete" ON stripe_invoice_line_items FOR DELETE
  USING (has_admin_access(organization_id));

-- HubSpot Contacts
CREATE POLICY "hubspot_contacts_select" ON hubspot_contacts FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "hubspot_contacts_insert" ON hubspot_contacts FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "hubspot_contacts_update" ON hubspot_contacts FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "hubspot_contacts_delete" ON hubspot_contacts FOR DELETE
  USING (has_admin_access(organization_id));

-- HubSpot Companies
CREATE POLICY "hubspot_companies_select" ON hubspot_companies FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "hubspot_companies_insert" ON hubspot_companies FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "hubspot_companies_update" ON hubspot_companies FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "hubspot_companies_delete" ON hubspot_companies FOR DELETE
  USING (has_admin_access(organization_id));

-- HubSpot Deals
CREATE POLICY "hubspot_deals_select" ON hubspot_deals FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "hubspot_deals_insert" ON hubspot_deals FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "hubspot_deals_update" ON hubspot_deals FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "hubspot_deals_delete" ON hubspot_deals FOR DELETE
  USING (has_admin_access(organization_id));

-- HubSpot Associations
CREATE POLICY "hubspot_contact_company_assoc_select" ON hubspot_contact_company_associations FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "hubspot_contact_company_assoc_insert" ON hubspot_contact_company_associations FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "hubspot_contact_company_assoc_delete" ON hubspot_contact_company_associations FOR DELETE
  USING (has_admin_access(organization_id));

CREATE POLICY "hubspot_deal_contact_assoc_select" ON hubspot_deal_contact_associations FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "hubspot_deal_contact_assoc_insert" ON hubspot_deal_contact_associations FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "hubspot_deal_contact_assoc_delete" ON hubspot_deal_contact_associations FOR DELETE
  USING (has_admin_access(organization_id));

-- Products
CREATE POLICY "products_select" ON products FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "products_update" ON products FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "products_delete" ON products FOR DELETE
  USING (has_admin_access(organization_id));

-- Unified Customers
CREATE POLICY "unified_customers_select" ON unified_customers FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "unified_customers_insert" ON unified_customers FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "unified_customers_update" ON unified_customers FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "unified_customers_delete" ON unified_customers FOR DELETE
  USING (has_admin_access(organization_id));

-- Customer Expansion Events
CREATE POLICY "customer_expansion_events_select" ON customer_expansion_events FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "customer_expansion_events_insert" ON customer_expansion_events FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "customer_expansion_events_delete" ON customer_expansion_events FOR DELETE
  USING (has_admin_access(organization_id));

-- Transactions
CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "transactions_delete" ON transactions FOR DELETE
  USING (has_admin_access(organization_id));

-- Segments
CREATE POLICY "segments_select" ON segments FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "segments_insert" ON segments FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "segments_update" ON segments FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "segments_delete" ON segments FOR DELETE
  USING (has_admin_access(organization_id));

-- Pricing Tiers
CREATE POLICY "pricing_tiers_select" ON pricing_tiers FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "pricing_tiers_insert" ON pricing_tiers FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "pricing_tiers_update" ON pricing_tiers FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "pricing_tiers_delete" ON pricing_tiers FOR DELETE
  USING (has_admin_access(organization_id));

-- Value Metrics
CREATE POLICY "value_metrics_select" ON value_metrics FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "value_metrics_insert" ON value_metrics FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "value_metrics_update" ON value_metrics FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "value_metrics_delete" ON value_metrics FOR DELETE
  USING (has_admin_access(organization_id));

-- Patterns
CREATE POLICY "patterns_select" ON patterns FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "patterns_insert" ON patterns FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "patterns_update" ON patterns FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "patterns_delete" ON patterns FOR DELETE
  USING (has_admin_access(organization_id));

-- Economics Snapshots
CREATE POLICY "economics_snapshots_select" ON economics_snapshots FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "economics_snapshots_insert" ON economics_snapshots FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "economics_snapshots_delete" ON economics_snapshots FOR DELETE
  USING (has_admin_access(organization_id));

-- Ontology Snapshots
CREATE POLICY "ontology_snapshots_select" ON ontology_snapshots FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "ontology_snapshots_insert" ON ontology_snapshots FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "ontology_snapshots_delete" ON ontology_snapshots FOR DELETE
  USING (has_admin_access(organization_id));

-- Pricing Options
CREATE POLICY "pricing_options_select" ON pricing_options FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "pricing_options_insert" ON pricing_options FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "pricing_options_update" ON pricing_options FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "pricing_options_delete" ON pricing_options FOR DELETE
  USING (has_admin_access(organization_id));

-- Council Evaluations
CREATE POLICY "council_evaluations_select" ON council_evaluations FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "council_evaluations_insert" ON council_evaluations FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "council_evaluations_delete" ON council_evaluations FOR DELETE
  USING (has_admin_access(organization_id));

-- Decision Records
CREATE POLICY "decision_records_select" ON decision_records FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "decision_records_insert" ON decision_records FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
CREATE POLICY "decision_records_update" ON decision_records FOR UPDATE
  USING (has_organization_access(organization_id));
CREATE POLICY "decision_records_delete" ON decision_records FOR DELETE
  USING (has_admin_access(organization_id));

-- Ontology Audit Log (read-only, no updates/deletes)
CREATE POLICY "ontology_audit_log_select" ON ontology_audit_log FOR SELECT
  USING (has_organization_access(organization_id));
CREATE POLICY "ontology_audit_log_insert" ON ontology_audit_log FOR INSERT
  WITH CHECK (has_organization_access(organization_id));
-- Note: No UPDATE or DELETE policies - audit log is immutable
-- Migration: Seed Demo Organization
-- Creates a demo organization for testing without auth

-- Create demo organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'MyParcel Demo',
  'myparcel-demo',
  '{"demo": true, "scale": 0.1}'
)
ON CONFLICT (slug) DO NOTHING;

-- Note: Additional seed data (customers, products, ontology) will be
-- populated via the /api/seed endpoint which runs the synthetic data generators
-- Migration: Analytics Tables
-- Tables for storing computed analytics results

-- Cohort retention data (cached analysis results)
CREATE TABLE cohort_retention_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Cohort definition
  cohort_month DATE NOT NULL,
  month_offset INT NOT NULL, -- 0 = acquisition month, 1 = first month after, etc.

  -- Customer counts
  cohort_size INT NOT NULL,
  retained_count INT NOT NULL,
  churned_count INT GENERATED ALWAYS AS (cohort_size - retained_count) STORED,

  -- Rates
  retention_rate NUMERIC(5, 4), -- 0.0000 to 1.0000

  -- Revenue tracking
  cohort_starting_mrr NUMERIC(15, 2),
  retained_mrr NUMERIC(15, 2),
  revenue_retention_rate NUMERIC(5, 4),

  -- Metadata
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, cohort_month, month_offset)
);

-- Customer health scores (daily snapshots)
CREATE TABLE customer_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES unified_customers(id) ON DELETE CASCADE,

  score_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Component scores (0-100)
  usage_score NUMERIC(5, 2),
  engagement_score NUMERIC(5, 2),
  financial_score NUMERIC(5, 2),

  -- Composite health score (0-100)
  health_score NUMERIC(5, 2) NOT NULL,

  -- Trend analysis
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  trend_velocity NUMERIC(5, 2), -- rate of change

  -- Predictive signals (0.00-1.00 probability)
  upgrade_readiness NUMERIC(3, 2),
  churn_risk NUMERIC(3, 2),
  expansion_potential NUMERIC(3, 2),

  -- Flags for pattern detection
  detected_patterns TEXT[] DEFAULT ARRAY[]::TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, customer_id, score_date)
);

-- RFM scores (computed periodically)
CREATE TABLE customer_rfm_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES unified_customers(id) ON DELETE CASCADE,

  computed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Raw values
  recency_days INT NOT NULL, -- days since last transaction
  frequency_count INT NOT NULL, -- number of transactions in period
  monetary_value NUMERIC(15, 2) NOT NULL, -- total spend in period

  -- Quintile scores (1-5)
  recency_score INT CHECK (recency_score BETWEEN 1 AND 5),
  frequency_score INT CHECK (frequency_score BETWEEN 1 AND 5),
  monetary_score INT CHECK (monetary_score BETWEEN 1 AND 5),

  -- Composite RFM score
  rfm_score INT GENERATED ALWAYS AS (recency_score * 100 + frequency_score * 10 + monetary_score) STORED,

  -- Segment classification based on RFM
  rfm_segment TEXT CHECK (rfm_segment IN (
    'champions', 'loyal_customers', 'potential_loyalists',
    'recent_customers', 'promising', 'needs_attention',
    'about_to_sleep', 'at_risk', 'cant_lose_them',
    'hibernating', 'lost'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, customer_id)
);

-- Value metric correlations (computed analysis)
CREATE TABLE value_metric_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  metric_name TEXT NOT NULL,
  metric_description TEXT,

  -- Correlation to outcomes
  correlation_to_retention NUMERIC(5, 4), -- -1 to 1
  correlation_to_expansion NUMERIC(5, 4),
  correlation_to_churn NUMERIC(5, 4),

  -- Statistical significance
  p_value_retention NUMERIC(10, 8),
  p_value_expansion NUMERIC(10, 8),
  p_value_churn NUMERIC(10, 8),

  -- Predictive power
  feature_importance_rank INT,
  predictive_power NUMERIC(5, 4), -- 0 to 1

  -- Sample info
  sample_size INT NOT NULL,
  analysis_period_start DATE,
  analysis_period_end DATE,

  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, metric_name)
);

-- Analytics run log (tracks computation jobs)
CREATE TABLE analytics_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  run_type TEXT NOT NULL CHECK (run_type IN (
    'full_refresh', 'cohort_retention', 'segmentation',
    'pattern_detection', 'health_scores', 'value_metrics',
    'economics_snapshot'
  )),

  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Progress tracking (for UI)
  total_steps INT,
  completed_steps INT DEFAULT 0,
  current_step TEXT,

  -- Results summary
  records_processed INT,
  errors_count INT DEFAULT 0,
  error_details JSONB DEFAULT '[]',

  -- Output references
  result_summary JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cohort_retention_org ON cohort_retention_data(organization_id);
CREATE INDEX idx_cohort_retention_month ON cohort_retention_data(organization_id, cohort_month);
CREATE INDEX idx_customer_health_org ON customer_health_scores(organization_id);
CREATE INDEX idx_customer_health_date ON customer_health_scores(organization_id, score_date DESC);
CREATE INDEX idx_customer_health_customer ON customer_health_scores(customer_id, score_date DESC);
CREATE INDEX idx_customer_health_risk ON customer_health_scores(organization_id, churn_risk DESC) WHERE churn_risk > 0.5;
CREATE INDEX idx_customer_rfm_org ON customer_rfm_scores(organization_id);
CREATE INDEX idx_customer_rfm_segment ON customer_rfm_scores(organization_id, rfm_segment);
CREATE INDEX idx_value_correlations_org ON value_metric_correlations(organization_id);
CREATE INDEX idx_analytics_run_org ON analytics_run_log(organization_id);
CREATE INDEX idx_analytics_run_status ON analytics_run_log(organization_id, status, started_at DESC);

-- =============================================================================
-- Migration 00010: Company Profiles and Expanded Ontology
-- =============================================================================

-- 1. Extend organizations with company profile
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS company_profile JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS setup_status TEXT DEFAULT 'pending'
    CHECK (setup_status IN ('pending', 'generating', 'ready', 'error')),
  ADD COLUMN IF NOT EXISTS setup_error TEXT;

-- 2. Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  positioning TEXT,
  pricing_model TEXT,
  price_range TEXT,
  key_differentiators TEXT[] DEFAULT ARRAY[]::TEXT[],
  estimated_market_share TEXT,
  source TEXT DEFAULT 'claude_research',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitors_org ON competitors(organization_id);
CREATE INDEX IF NOT EXISTS idx_competitors_active ON competitors(organization_id, is_active);

CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Extend economics_snapshots with market & strategic context
ALTER TABLE economics_snapshots
  ADD COLUMN IF NOT EXISTS market_context JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS strategic_positioning JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS competitor_summary JSONB DEFAULT NULL;

-- 4. RLS for competitors table
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitors_org_access"
  ON competitors FOR ALL
  USING (has_organization_access(organization_id));
