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
