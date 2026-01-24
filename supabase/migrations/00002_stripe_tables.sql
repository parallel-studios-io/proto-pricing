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
