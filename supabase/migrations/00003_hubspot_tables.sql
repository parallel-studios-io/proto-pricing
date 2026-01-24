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
