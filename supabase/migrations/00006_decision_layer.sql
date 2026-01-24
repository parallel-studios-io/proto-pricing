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
