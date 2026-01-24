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
