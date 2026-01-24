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
