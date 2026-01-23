/**
 * MyParcel.nl Synthetic Data Generator
 *
 * Generates realistic data mimicking MyParcel's shipping platform business:
 * - €110M revenue, 27K customers
 * - Extreme Pareto: 80% revenue from 12% of customers
 * - 4 segments: Enterprise, Growing Webshops, Small Senders, Hobby/Dormant
 */

import {
  UnifiedCustomer,
  TransactionStream,
  Transaction,
  ProductCatalog,
  DetectedSegment,
  PricingStructure,
  PricingTier,
  ValueMetric,
  UnitEconomics,
  MyParcelProduct,
  MyParcelSubscription,
  MyParcelCustomerUsage,
  ExpansionEvent,
} from "@/types/pricing-flow";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Scale factors (set to 0.1 for demo = 10% of real business)
  scale: 0.1,

  // Real business metrics
  totalRevenue: 110_000_000, // €110M ARR
  totalCustomers: 27_000,

  // Segment distribution (% of customers, % of revenue)
  segments: {
    enterprise: { customerShare: 0.025, revenueShare: 0.80, churnRate: 0.005 },
    growing: { customerShare: 0.10, revenueShare: 0.12, churnRate: 0.02 },
    small: { customerShare: 0.375, revenueShare: 0.065, churnRate: 0.05 },
    hobby: { customerShare: 0.50, revenueShare: 0.015, churnRate: 0.08 },
  },

  // Subscription tiers (matching actual MyParcel pricing)
  subscriptionTiers: [
    { name: "Standaard", price: 0, labelDiscount: 0, share: 0.40 },
    { name: "Start", price: 25, labelDiscount: 0.10, share: 0.25 },
    { name: "Plus", price: 50, labelDiscount: 0.15, share: 0.20 },
    { name: "Premium", price: 75, labelDiscount: 0.20, share: 0.12 },
    { name: "Max", price: 125, labelDiscount: 0.25, share: 0.03 },
  ],
};

// =============================================================================
// PRODUCT CATALOG
// =============================================================================

export function generateProductCatalog(): ProductCatalog[] {
  const products: MyParcelProduct[] = [
    // PostNL Products
    { id: "postnl-domestic", name: "PostNL Domestic Parcel", carrier: "PostNL", type: "parcel", destination: "domestic", base_price: 6.95, weight_limit_kg: 23 },
    { id: "postnl-letterbox", name: "PostNL Letterbox", carrier: "PostNL", type: "letterbox", destination: "domestic", base_price: 4.15, weight_limit_kg: 2 },
    { id: "postnl-eu", name: "PostNL EU Parcel", carrier: "PostNL", type: "parcel", destination: "eu", base_price: 13.50, weight_limit_kg: 23 },
    { id: "postnl-world", name: "PostNL World Parcel", carrier: "PostNL", type: "parcel", destination: "world", base_price: 24.95, weight_limit_kg: 20 },

    // DHL Products
    { id: "dhl-domestic", name: "DHL For You", carrier: "DHL", type: "parcel", destination: "domestic", base_price: 6.75, weight_limit_kg: 31.5 },
    { id: "dhl-letterbox", name: "DHL Letterbox", carrier: "DHL", type: "letterbox", destination: "domestic", base_price: 3.95, weight_limit_kg: 2 },
    { id: "dhl-eu", name: "DHL Europlus", carrier: "DHL", type: "parcel", destination: "eu", base_price: 12.25, weight_limit_kg: 31.5 },

    // DPD Products
    { id: "dpd-domestic", name: "DPD Home", carrier: "DPD", type: "parcel", destination: "domestic", base_price: 7.25, weight_limit_kg: 31.5 },
    { id: "dpd-eu", name: "DPD Classic", carrier: "DPD", type: "parcel", destination: "eu", base_price: 14.95, weight_limit_kg: 31.5 },

    // UPS Products
    { id: "ups-domestic", name: "UPS Standard", carrier: "UPS", type: "parcel", destination: "domestic", base_price: 8.95, weight_limit_kg: 30 },
    { id: "ups-express", name: "UPS Express", carrier: "UPS", type: "parcel", destination: "eu", base_price: 21.85, weight_limit_kg: 30 },
  ];

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    type: "usage" as const,
    base_price: p.base_price,
    usage_unit: "label",
  }));
}

export function generateSubscriptionTiers(): MyParcelSubscription[] {
  return [
    {
      tier: "Standaard",
      monthly_price: 0,
      included_labels: 0,
      discount_per_label: 0,
      features: ["MyParcel verzendtarieven", "Gratis support", "Onbeperkt verzendlabels printen", "Onbeperkt aantal integraties"],
    },
    {
      tier: "Start",
      monthly_price: 25,
      included_labels: 100,
      discount_per_label: 0.10,
      features: ["Scherpere tarieven", "+€0.10 labelbijdrage", "Gratis support", "Onbeperkt verzendlabels printen"],
    },
    {
      tier: "Plus",
      monthly_price: 50,
      included_labels: 500,
      discount_per_label: 0.15,
      features: ["Scherpere tarieven", "+€0.10 labelbijdrage", "Gratis support", "API access"],
    },
    {
      tier: "Premium",
      monthly_price: 75,
      included_labels: 2000,
      discount_per_label: 0.20,
      features: ["Scherpere tarieven", "+€0.10 labelbijdrage", "Dedicated support", "Custom integrations"],
    },
    {
      tier: "Max",
      monthly_price: 125,
      included_labels: "unlimited",
      discount_per_label: 0.25,
      features: ["Scherpere tarieven", "+€0.10 labelbijdrage", "SLA guarantee", "Account manager"],
    },
  ];
}

// =============================================================================
// CUSTOMER GENERATION
// =============================================================================

function generateCustomerId(): string {
  return `cus_${Math.random().toString(36).substring(2, 15)}`;
}

function generateCompanyName(segment: string): string {
  const prefixes = {
    enterprise: ["Global", "Euro", "Dutch", "Royal", "International"],
    growing: ["Smart", "Quick", "Easy", "Fresh", "Online"],
    small: ["", "Little", "Local", "My", "The"],
    hobby: ["", "", "", "", ""],
  };

  const suffixes = {
    enterprise: ["Logistics", "Fulfillment", "Commerce", "Distribution", "Retail Group"],
    growing: ["Store", "Shop", "Webshop", "Boutique", "Market"],
    small: ["Gifts", "Crafts", "Goods", "Items", "Products"],
    hobby: ["Seller", "Trades", "Sales", "", ""],
  };

  const prefix = prefixes[segment as keyof typeof prefixes][Math.floor(Math.random() * 5)];
  const suffix = suffixes[segment as keyof typeof suffixes][Math.floor(Math.random() * 5)];
  const name = `${prefix} ${["Van der Berg", "De Vries", "Jansen", "Bakker", "Visser", "Smit", "Mulder", "Bos", "Peters", "Hendriks"][Math.floor(Math.random() * 10)]} ${suffix}`.trim();

  return name || "Independent Seller";
}

function generateIndustry(segment: string): string {
  const industries = {
    enterprise: ["E-commerce", "Retail", "Fashion", "Electronics", "Food & Beverage"],
    growing: ["Fashion", "Home & Garden", "Beauty", "Sports", "Toys"],
    small: ["Handmade", "Vintage", "Collectibles", "Art", "Jewelry"],
    hobby: ["Personal", "Marketplace", "Resale", "Hobby", "Other"],
  };

  return industries[segment as keyof typeof industries][Math.floor(Math.random() * 5)];
}

function generateUsagePattern(segment: string, month: number): number {
  // Base monthly volume by segment
  const baseVolume = {
    enterprise: 15000 + Math.random() * 35000, // 15K-50K labels/month
    growing: 500 + Math.random() * 1500, // 500-2K labels/month
    small: 20 + Math.random() * 80, // 20-100 labels/month
    hobby: 1 + Math.random() * 9, // 1-10 labels/month
  };

  let volume = baseVolume[segment as keyof typeof baseVolume];

  // Q4 seasonality (Nov-Dec = months 10-11)
  if (month === 10 || month === 11) {
    const seasonalMultiplier = segment === "enterprise" ? 2.0 : segment === "growing" ? 1.8 : 1.5;
    volume *= seasonalMultiplier;
  }

  return Math.round(volume);
}

function assignTier(segment: string, volume: number): string {
  if (segment === "enterprise") {
    return volume > 30000 ? "Max" : "Premium";
  }
  if (segment === "growing") {
    if (volume > 1500) return "Premium";
    if (volume > 500) return "Plus";
    return "Start";
  }
  if (segment === "small") {
    if (volume > 50) return "Start";
    return "Standaard";
  }
  return "Standaard";
}

function calculateMRR(segment: string, tier: string, volume: number): number {
  const tierPrices: Record<string, number> = {
    Standaard: 0,
    Start: 25,
    Plus: 50,
    Premium: 75,
    Max: 125,
  };

  const discounts: Record<string, number> = {
    Standaard: 0,
    Start: 0.10,
    Plus: 0.15,
    Premium: 0.20,
    Max: 0.25,
  };

  // Average label price after MyParcel margin (roughly €0.80-1.20 margin per label)
  const avgMarginPerLabel = segment === "enterprise" ? 0.65 : segment === "growing" ? 0.85 : 1.00;
  const labelRevenue = volume * avgMarginPerLabel * (1 - discounts[tier]);

  return tierPrices[tier] + labelRevenue;
}

function calculateLTV(mrr: number, segment: string): number {
  const avgLifetimeMonths = {
    enterprise: 48, // 4 years
    growing: 30, // 2.5 years
    small: 18, // 1.5 years
    hobby: 8, // 8 months
  };

  return mrr * avgLifetimeMonths[segment as keyof typeof avgLifetimeMonths];
}

function generateExpansionEvents(segment: string, tenure: number, currentMrr: number): ExpansionEvent[] {
  const events: ExpansionEvent[] = [];

  if (segment === "enterprise" && tenure > 12 && Math.random() > 0.6) {
    // Enterprise often has expansion
    events.push({
      date: new Date(Date.now() - Math.random() * tenure * 30 * 24 * 60 * 60 * 1000),
      type: "expansion",
      from_mrr: currentMrr * 0.7,
      to_mrr: currentMrr,
      reason: "Increased shipping volume",
    });
  }

  if (segment === "growing" && tenure > 6 && Math.random() > 0.5) {
    events.push({
      date: new Date(Date.now() - Math.random() * tenure * 30 * 24 * 60 * 60 * 1000),
      type: "upgrade",
      from_mrr: currentMrr * 0.6,
      to_mrr: currentMrr,
      reason: "Tier upgrade",
    });
  }

  return events;
}

export function generateCustomers(count?: number): UnifiedCustomer[] {
  const totalCount = count || Math.round(CONFIG.totalCustomers * CONFIG.scale);
  const customers: UnifiedCustomer[] = [];

  const segmentCounts = {
    enterprise: Math.round(totalCount * CONFIG.segments.enterprise.customerShare),
    growing: Math.round(totalCount * CONFIG.segments.growing.customerShare),
    small: Math.round(totalCount * CONFIG.segments.small.customerShare),
    hobby: Math.round(totalCount * CONFIG.segments.hobby.customerShare),
  };

  for (const [segment, segmentCount] of Object.entries(segmentCounts)) {
    for (let i = 0; i < segmentCount; i++) {
      const tenure = Math.round(Math.random() * 48) + 1; // 1-49 months
      const currentMonth = new Date().getMonth();
      const volume = generateUsagePattern(segment, currentMonth);
      const tier = assignTier(segment, volume);
      const mrr = calculateMRR(segment, tier, volume);
      const ltv = calculateLTV(mrr, segment);

      customers.push({
        id: generateCustomerId(),
        stripe_id: `stripe_${Math.random().toString(36).substring(2, 10)}`,
        crm_id: `crm_${Math.random().toString(36).substring(2, 10)}`,
        name: `Customer ${i + 1}`,
        email: `contact@${generateCompanyName(segment).toLowerCase().replace(/\s+/g, "")}.nl`,
        company_name: generateCompanyName(segment),
        segment_id: segment,
        mrr,
        ltv,
        tenure_months: tenure,
        plan_id: tier.toLowerCase(),
        billing_interval: segment === "enterprise" ? "annual" : "monthly",
        expansion_events: generateExpansionEvents(segment, tenure, mrr),
        industry: generateIndustry(segment),
        company_size:
          segment === "enterprise"
            ? "enterprise"
            : segment === "growing"
            ? "smb"
            : "startup",
        country: "NL",
      });
    }
  }

  return customers;
}

// =============================================================================
// SEGMENT DETECTION
// =============================================================================

export function detectSegments(customers: UnifiedCustomer[]): DetectedSegment[] {
  const segmentMap = new Map<string, UnifiedCustomer[]>();

  for (const customer of customers) {
    const segment = customer.segment_id || "unknown";
    if (!segmentMap.has(segment)) {
      segmentMap.set(segment, []);
    }
    segmentMap.get(segment)!.push(customer);
  }

  const totalRevenue = customers.reduce((sum, c) => sum + c.mrr * 12, 0);

  const segments: DetectedSegment[] = [];

  const segmentConfig: Record<string, { name: string; description: string; valueDrivers: string[] }> = {
    enterprise: {
      name: "Enterprise / High-Volume",
      description: "Large e-commerce platforms and fulfillment centers shipping 15K+ labels/month",
      valueDrivers: ["Volume discounts", "API reliability", "Multi-carrier flexibility", "Account management"],
    },
    growing: {
      name: "Growing Webshops",
      description: "Scaling online stores with 500-2K shipments/month, often upgrading tiers",
      valueDrivers: ["Growth support", "Integration ecosystem", "Competitive rates", "Automation"],
    },
    small: {
      name: "Small Senders",
      description: "Small businesses and side-hustles with 20-100 shipments/month",
      valueDrivers: ["Simplicity", "No commitment", "Affordable rates", "Easy returns"],
    },
    hobby: {
      name: "Hobby / Dormant",
      description: "Occasional sellers with less than 20 shipments/month, high churn",
      valueDrivers: ["Zero fixed cost", "Pay-per-use", "Simple interface"],
    },
  };

  for (const [segmentId, segmentCustomers] of segmentMap) {
    if (segmentId === "unknown") continue;

    const config = segmentConfig[segmentId];
    const revenue = segmentCustomers.reduce((sum, c) => sum + c.mrr * 12, 0);
    const ltvs = segmentCustomers.map((c) => c.ltv).sort((a, b) => a - b);

    segments.push({
      id: segmentId,
      name: config.name,
      criteria: {
        size: segmentId === "enterprise" ? "enterprise" : segmentId === "growing" ? "smb" : "startup",
        behavior:
          segmentId === "enterprise"
            ? "high_volume"
            : segmentId === "growing"
            ? "growing"
            : segmentId === "small"
            ? "stable"
            : "declining",
      },
      customer_count: segmentCustomers.length,
      revenue_share: revenue / totalRevenue,
      avg_ltv: ltvs.reduce((a, b) => a + b, 0) / ltvs.length,
      ltv_distribution: {
        p25: ltvs[Math.floor(ltvs.length * 0.25)] || 0,
        p50: ltvs[Math.floor(ltvs.length * 0.5)] || 0,
        p75: ltvs[Math.floor(ltvs.length * 0.75)] || 0,
        p90: ltvs[Math.floor(ltvs.length * 0.9)] || 0,
      },
      retention_curve: generateRetentionCurve(segmentId),
      expansion_rate:
        segmentId === "enterprise" ? 0.15 : segmentId === "growing" ? 0.08 : 0.02,
      value_drivers: config.valueDrivers,
    });
  }

  return segments.sort((a, b) => b.revenue_share - a.revenue_share);
}

function generateRetentionCurve(segment: string): number[] {
  const baseRetention = {
    enterprise: 0.995,
    growing: 0.98,
    small: 0.95,
    hobby: 0.92,
  };

  const monthlyRetention = baseRetention[segment as keyof typeof baseRetention];
  const curve: number[] = [];

  for (let month = 0; month < 12; month++) {
    curve.push(Math.pow(monthlyRetention, month + 1));
  }

  return curve;
}

// =============================================================================
// PRICING STRUCTURE
// =============================================================================

export function mapPricingStructure(customers: UnifiedCustomer[]): PricingStructure {
  const tierCounts = new Map<string, number>();
  const tierRevenue = new Map<string, number>();

  for (const customer of customers) {
    const tier = customer.plan_id || "free";
    tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
    tierRevenue.set(tier, (tierRevenue.get(tier) || 0) + customer.mrr * 12);
  }

  const totalRevenue = Array.from(tierRevenue.values()).reduce((a, b) => a + b, 0);

  const tiers: PricingTier[] = CONFIG.subscriptionTiers.map((t, idx) => ({
    id: t.name.toLowerCase(),
    name: t.name,
    price: t.price,
    billing_interval: "monthly",
    value_metric_limits: {
      labels: t.name === "Max" ? "unlimited" : [0, 100, 500, 2000, 10000][idx],
      integrations: t.name === "Free" ? 1 : "unlimited",
    },
    features: generateSubscriptionTiers().find((s) => s.tier === t.name)?.features || [],
    customer_count: tierCounts.get(t.name.toLowerCase()) || 0,
    revenue: tierRevenue.get(t.name.toLowerCase()) || 0,
    revenue_share: (tierRevenue.get(t.name.toLowerCase()) || 0) / totalRevenue,
    position: idx + 1,
  }));

  const valueMetrics: ValueMetric[] = [
    {
      id: "shipping_volume",
      name: "Shipping Volume (Labels)",
      type: "primary",
      correlation_to_expansion: 0.85,
      measurement_method: "Monthly label count across all carriers",
      examples: ["100 labels/mo", "1,000 labels/mo", "10,000+ labels/mo"],
    },
    {
      id: "carrier_diversity",
      name: "Carrier Usage",
      type: "secondary",
      correlation_to_expansion: 0.45,
      measurement_method: "Number of unique carriers used",
      examples: ["1 carrier", "2-3 carriers", "4+ carriers"],
    },
    {
      id: "api_calls",
      name: "API Integration Depth",
      type: "secondary",
      correlation_to_expansion: 0.65,
      measurement_method: "API calls per month",
      examples: ["Manual only", "Basic API", "Full automation"],
    },
  ];

  return {
    model_type: "hybrid", // Subscription + usage
    value_metrics: valueMetrics,
    tiers,
    discount_patterns: [
      {
        type: "annual",
        avg_discount_percent: 15,
        frequency: 0.15,
        segment_correlation: ["enterprise"],
      },
      {
        type: "volume",
        avg_discount_percent: 25,
        frequency: 0.05,
        segment_correlation: ["enterprise"],
      },
      {
        type: "negotiated",
        avg_discount_percent: 20,
        frequency: 0.02,
        segment_correlation: ["enterprise"],
      },
    ],
  };
}

// =============================================================================
// UNIT ECONOMICS
// =============================================================================

export function calculateUnitEconomics(
  customers: UnifiedCustomer[],
  segments: DetectedSegment[]
): UnitEconomics {
  const segmentMap = new Map<string, UnifiedCustomer[]>();

  for (const customer of customers) {
    const segment = customer.segment_id || "unknown";
    if (!segmentMap.has(segment)) {
      segmentMap.set(segment, []);
    }
    segmentMap.get(segment)!.push(customer);
  }

  const arpuBySegment: Record<string, number> = {};
  const ltvBySegment: Record<string, number> = {};
  const churnByTier: Record<string, number> = {};

  for (const [segmentId, segmentCustomers] of segmentMap) {
    const totalMrr = segmentCustomers.reduce((sum, c) => sum + c.mrr, 0);
    const totalLtv = segmentCustomers.reduce((sum, c) => sum + c.ltv, 0);

    arpuBySegment[segmentId] = totalMrr / segmentCustomers.length;
    ltvBySegment[segmentId] = totalLtv / segmentCustomers.length;
  }

  // Churn by tier (based on segment distribution within tiers)
  churnByTier["standaard"] = 0.08;
  churnByTier["start"] = 0.05;
  churnByTier["plus"] = 0.03;
  churnByTier["premium"] = 0.02;
  churnByTier["max"] = 0.005;

  // Concentration metrics
  const sortedByMrr = [...customers].sort((a, b) => b.mrr - a.mrr);
  const totalMrr = customers.reduce((sum, c) => sum + c.mrr, 0);
  const top10Count = Math.ceil(customers.length * 0.1);
  const top10Revenue = sortedByMrr.slice(0, top10Count).reduce((sum, c) => sum + c.mrr, 0);

  const segmentShares: Record<string, number> = {};
  for (const segment of segments) {
    segmentShares[segment.id] = segment.revenue_share;
  }

  // HHI calculation (sum of squared market shares * 10000)
  const hhi = Object.values(segmentShares).reduce((sum, share) => sum + Math.pow(share * 100, 2), 0);

  return {
    arpu_by_segment: arpuBySegment,
    ltv_by_segment: ltvBySegment,
    churn_by_tier: churnByTier,
    concentration: {
      top_10_percent_revenue_share: top10Revenue / totalMrr,
      top_customer_revenue_share: sortedByMrr[0].mrr / totalMrr,
      hhi_index: hhi,
      segment_shares: segmentShares,
      risk_level: hhi > 6500 ? "critical" : hhi > 4500 ? "high" : hhi > 2500 ? "moderate" : "low",
      risk_description:
        "80% of revenue comes from 12% of customers. Bottom 50% of customers may be unprofitable after support costs.",
    },
    sensitivity_model: {
      segment_elasticity: {
        enterprise: -0.3, // Low elasticity - locked in
        growing: -0.8, // Moderate elasticity
        small: -1.2, // High elasticity
        hobby: -1.8, // Very price sensitive
      },
      churn_per_percent_increase: {
        enterprise: 0.001,
        growing: 0.005,
        small: 0.015,
        hobby: 0.03,
      },
      optimal_price_ranges: {
        enterprise: [150, 350],
        growing: [20, 50],
        small: [0, 15],
        hobby: [0, 5],
      },
    },
  };
}

// =============================================================================
// TRANSACTION GENERATION
// =============================================================================

export function generateTransactions(
  customers: UnifiedCustomer[],
  monthsBack: number = 12
): TransactionStream[] {
  const streams: TransactionStream[] = [];
  const products = generateProductCatalog();

  for (const customer of customers) {
    const transactions: Transaction[] = [];
    const segment = customer.segment_id || "hobby";

    for (let month = 0; month < monthsBack; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() - month);

      // Subscription transaction
      if (customer.plan_id && customer.plan_id !== "free") {
        const tierPrice =
          CONFIG.subscriptionTiers.find(
            (t) => t.name.toLowerCase() === customer.plan_id
          )?.price || 0;

        if (tierPrice > 0) {
          transactions.push({
            id: `txn_${Math.random().toString(36).substring(2, 10)}`,
            date,
            amount: tierPrice,
            currency: "EUR",
            type: "subscription",
            product_id: `plan_${customer.plan_id}`,
          });
        }
      }

      // Usage transactions (shipping labels)
      const volume = generateUsagePattern(segment, date.getMonth());
      const labelsPerTransaction = segment === "enterprise" ? 1000 : segment === "growing" ? 100 : 10;

      for (let i = 0; i < Math.ceil(volume / labelsPerTransaction); i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.min(labelsPerTransaction, volume - i * labelsPerTransaction);

        transactions.push({
          id: `txn_${Math.random().toString(36).substring(2, 10)}`,
          date: new Date(date.getTime() + Math.random() * 28 * 24 * 60 * 60 * 1000),
          amount: product.base_price * quantity,
          currency: "EUR",
          type: "usage",
          product_id: product.id,
          quantity,
        });
      }
    }

    streams.push({
      customer_id: customer.id,
      transactions: transactions.sort((a, b) => b.date.getTime() - a.date.getTime()),
    });
  }

  return streams;
}

// =============================================================================
// FULL DATA GENERATION
// =============================================================================

export interface GeneratedMyParcelData {
  customers: UnifiedCustomer[];
  segments: DetectedSegment[];
  pricingStructure: PricingStructure;
  economics: UnitEconomics;
  transactions: TransactionStream[];
  products: ProductCatalog[];
  summary: {
    totalCustomers: number;
    totalMrr: number;
    totalArr: number;
    nrr: number;
    avgLtv: number;
  };
}

export function generateMyParcelData(customerCount?: number): GeneratedMyParcelData {
  const customers = generateCustomers(customerCount);
  const segments = detectSegments(customers);
  const pricingStructure = mapPricingStructure(customers);
  const economics = calculateUnitEconomics(customers, segments);
  const transactions = generateTransactions(customers, 12);
  const products = generateProductCatalog();

  const totalMrr = customers.reduce((sum, c) => sum + c.mrr, 0);
  const totalArr = totalMrr * 12;
  const avgLtv = customers.reduce((sum, c) => sum + c.ltv, 0) / customers.length;

  // Calculate NRR (simplified)
  const expansionRevenue = customers
    .flatMap((c) => c.expansion_events)
    .filter((e) => e.type === "expansion" || e.type === "upgrade")
    .reduce((sum, e) => sum + (e.to_mrr - e.from_mrr), 0);

  const churnedRevenue = totalMrr * 0.03; // Approximate 3% monthly churn weighted
  const nrr = ((totalMrr + expansionRevenue - churnedRevenue) / totalMrr) * 100;

  return {
    customers,
    segments,
    pricingStructure,
    economics,
    transactions,
    products,
    summary: {
      totalCustomers: customers.length,
      totalMrr: Math.round(totalMrr),
      totalArr: Math.round(totalArr),
      nrr: Math.round(nrr),
      avgLtv: Math.round(avgLtv),
    },
  };
}
