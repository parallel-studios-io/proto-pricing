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
