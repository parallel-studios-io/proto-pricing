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
