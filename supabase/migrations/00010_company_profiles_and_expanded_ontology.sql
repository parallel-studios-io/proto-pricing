-- Migration: Company Profiles and Expanded Ontology
-- Adds company_profile to organizations, creates competitors table,
-- and extends economics_snapshots with market/strategic context.

-- =============================================================================
-- 1. Extend organizations with company profile
-- =============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS company_profile JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS setup_status TEXT DEFAULT 'pending'
    CHECK (setup_status IN ('pending', 'generating', 'ready', 'error')),
  ADD COLUMN IF NOT EXISTS setup_error TEXT;

-- =============================================================================
-- 2. Competitors table
-- =============================================================================

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

-- Auto-update updated_at
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. Extend economics_snapshots with market & strategic context
-- =============================================================================

ALTER TABLE economics_snapshots
  ADD COLUMN IF NOT EXISTS market_context JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS strategic_positioning JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS competitor_summary JSONB DEFAULT NULL;

-- =============================================================================
-- 4. RLS for competitors table
-- =============================================================================

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitors_org_access"
  ON competitors FOR ALL
  USING (has_organization_access(organization_id));
