export interface Customer {
  id: string;
  name: string;
  email: string;
  segmentId: string;
  currentTierId?: string;
  mrr: number;
  ltv: number;
  tenureMonths: number;
  companySize?: string;
  industry?: string;
  region?: string;
  createdAt: Date;
  churnedAt?: Date;
}

export interface Segment {
  id: string;
  name: string;
  description: string;

  // Metrics
  customerCount: number;
  revenue: number;
  revenueShare: number; // Percentage of total

  // Economics
  avgMrr: number;
  avgLtv: number;
  medianLtv: number;

  // Retention
  retentionRate: number; // 12-month
  churnRate: number; // Monthly
  expansionRate: number; // Annual expansion revenue %

  // Criteria
  criteria: {
    mrrRange?: [number, number];
    companySize?: string[];
    industry?: string[];
  };
}

export interface Tier {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  annualDiscountPercent: number;
  features: string[];
  customerCount: number;
  revenue: number;
  revenueShare: number;
  position: number; // 1 = lowest tier
}

export interface Economics {
  // Aggregate
  totalMrr: number;
  totalArr: number;
  totalCustomers: number;

  // Retention
  netRevenueRetention: number; // NRR
  grossRevenueRetention: number; // GRR
  mrrGrowthRate: number;

  // Concentration
  concentration: {
    top10PercentRevenueShare: number;
    topCustomerRevenueShare: number;
    segmentHhi: number; // Herfindahl-Hirschman Index
  };

  // By segment
  segmentEconomics: {
    segmentId: string;
    customerCount: number;
    mrr: number;
    avgArpu: number;
    ltv: number;
    churnRate: number;
    expansionRate: number;
  }[];
}

export interface Pattern {
  id: string;
  type: "upgrade_trigger" | "churn_signal" | "expansion_ready" | "seasonal" | "discount_sensitive";
  name: string;
  description: string;
  affectedSegments: string[];
  frequency: number;
  confidence: number;
  recommendedAction?: string;
}

export interface Ontology {
  id: string;
  organizationId: string;

  segments: Segment[];
  tiers: Tier[];
  economics: Economics;
  patterns: Pattern[];

  lastUpdated: Date;
}

// Demo data types
export interface DemoMetrics {
  totalMrr: number;
  totalCustomers: number;
  nrr: number;
  avgLtv: number;
  lastSynced: Date;
}

export interface ConcentrationAlert {
  topPercentCustomers: number;
  topPercentRevenue: number;
  bottomPercentCustomers: number;
  bottomPercentRevenue: number;
  isExtreme: boolean;
  message: string;
}
