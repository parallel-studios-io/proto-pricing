import type { CompanyProfile, PresetDefinition } from "@/types/company-profile";

const MYPARCEL_PROFILE: CompanyProfile = {
  name: "MyParcel",
  description:
    "Dutch shipping and logistics SaaS platform that enables e-commerce businesses to manage multi-carrier shipping. Businesses use it to print shipping labels, track packages, and handle returns across carriers like PostNL, DHL, DPD, and UPS.",
  website: "https://www.myparcel.nl",
  country: "Netherlands",
  currency: "EUR",
  currency_symbol: "€",

  business_model: "hybrid",
  primary_value_metric: "shipping labels",
  secondary_value_metrics: ["carrier diversity", "API integration depth"],

  total_customers: 2700, // 27K at 0.1x scale
  total_arr: 11_004_000,
  avg_deal_size: 4075,

  segments: [
    {
      name: "Enterprise",
      description:
        "Large e-commerce businesses and fulfillment centers with high-volume shipping needs. Custom contracts, API-first integration, dedicated support.",
      customer_share: 0.025,
      revenue_share: 0.55,
      avg_mrr: 15000,
      churn_rate: 0.005,
      expansion_rate: 0.15,
      value_drivers: [
        "API integrations",
        "Custom carrier contracts",
        "Dedicated support",
        "Volume discounts",
      ],
      company_size: "enterprise",
    },
    {
      name: "Growing Webshops",
      description:
        "Mid-size e-commerce businesses experiencing growth, typically shipping 500-2000 labels per month. Interested in multi-carrier options and automation.",
      customer_share: 0.1,
      revenue_share: 0.3,
      avg_mrr: 1500,
      churn_rate: 0.02,
      expansion_rate: 0.25,
      value_drivers: [
        "Multi-carrier support",
        "Tracking pages",
        "Returns handling",
        "Shopify/WooCommerce plugins",
      ],
      company_size: "mid_market",
    },
    {
      name: "Small Senders",
      description:
        "Small businesses and solo entrepreneurs shipping 20-100 packages per month. Price-sensitive, use the web portal primarily.",
      customer_share: 0.375,
      revenue_share: 0.12,
      avg_mrr: 150,
      churn_rate: 0.04,
      expansion_rate: 0.1,
      value_drivers: [
        "Competitive pricing",
        "Easy portal",
        "Basic tracking",
        "No minimum commitment",
      ],
      company_size: "smb",
    },
    {
      name: "Hobby/Dormant",
      description:
        "Occasional senders or dormant accounts. Ship 1-10 packages per month, mostly using the free tier.",
      customer_share: 0.5,
      revenue_share: 0.03,
      avg_mrr: 10,
      churn_rate: 0.08,
      expansion_rate: 0.02,
      value_drivers: ["Free tier", "No commitment", "Pay per use"],
      company_size: "startup",
    },
  ],

  products: [
    { name: "Standaard Subscription", type: "subscription", base_price: 0 },
    { name: "Start Subscription", type: "subscription", base_price: 25 },
    { name: "Plus Subscription", type: "subscription", base_price: 50 },
    { name: "Premium Subscription", type: "subscription", base_price: 75 },
    { name: "Max Subscription", type: "subscription", base_price: 125 },
    {
      name: "PostNL Domestic",
      type: "usage",
      base_price: 3.95,
      unit_label: "label",
    },
    {
      name: "PostNL EU",
      type: "usage",
      base_price: 12.95,
      unit_label: "label",
    },
    {
      name: "DHL Domestic",
      type: "usage",
      base_price: 4.95,
      unit_label: "label",
    },
    {
      name: "DHL EU",
      type: "usage",
      base_price: 14.95,
      unit_label: "label",
    },
    {
      name: "DPD Domestic",
      type: "usage",
      base_price: 4.5,
      unit_label: "label",
    },
    {
      name: "UPS Domestic",
      type: "usage",
      base_price: 5.95,
      unit_label: "label",
    },
  ],

  pricing_tiers: [
    {
      name: "Standaard",
      price_monthly: 0,
      price_annual: 0,
      features: ["Up to 50 labels/month", "PostNL only", "Web portal"],
      value_metric_limits: { labels: 50 },
      customer_share: 0.4,
      revenue_share: 0.015,
      position: 1,
    },
    {
      name: "Start",
      price_monthly: 25,
      price_annual: 270,
      features: [
        "Up to 500 labels/month",
        "PostNL + DHL",
        "Basic tracking",
        "10% label discount",
      ],
      value_metric_limits: { labels: 500 },
      customer_share: 0.25,
      revenue_share: 0.04,
      position: 2,
    },
    {
      name: "Plus",
      price_monthly: 50,
      price_annual: 540,
      features: [
        "Up to 2,000 labels/month",
        "All carriers",
        "Branded tracking",
        "15% label discount",
      ],
      value_metric_limits: { labels: 2000 },
      customer_share: 0.2,
      revenue_share: 0.1,
      position: 3,
    },
    {
      name: "Premium",
      price_monthly: 75,
      price_annual: 810,
      features: [
        "Up to 10,000 labels/month",
        "All carriers",
        "API access",
        "Priority support",
        "20% label discount",
      ],
      value_metric_limits: { labels: 10000 },
      customer_share: 0.12,
      revenue_share: 0.35,
      position: 4,
    },
    {
      name: "Max",
      price_monthly: 125,
      price_annual: 1350,
      features: [
        "Unlimited labels",
        "All carriers",
        "Full API",
        "Dedicated support",
        "Custom integrations",
        "25% label discount",
      ],
      value_metric_limits: { labels: "unlimited" },
      customer_share: 0.03,
      revenue_share: 0.495,
      position: 5,
    },
  ],

  market_context: {
    market_category: "Shipping & Logistics SaaS",
    tam_estimate: "€4.2B (European e-commerce shipping)",
    growth_rate: "12% CAGR",
    market_structure: "Fragmented with regional leaders",
    key_trends: [
      "Shift to multi-carrier strategies",
      "Same-day delivery expectations",
      "Cross-border e-commerce growth",
      "Sustainability and green shipping",
      "API-first integration for headless commerce",
    ],
    buying_factors: [
      "Carrier coverage and pricing",
      "Integration with e-commerce platforms",
      "Tracking and customer experience",
      "Returns handling simplicity",
      "Volume discount structure",
    ],
  },

  competitors: [
    {
      name: "Sendcloud",
      website: "https://www.sendcloud.com",
      positioning: "All-in-one shipping platform for European e-commerce",
      pricing_model: "Freemium + tiered subscription",
      price_range: "€0-€199/mo",
      key_differentiators: [
        "Pan-European carrier network",
        "Returns portal",
        "50+ carrier integrations",
      ],
    },
    {
      name: "Shippo",
      website: "https://goshippo.com",
      positioning: "Best multi-carrier shipping API for developers",
      pricing_model: "Pay-per-label + subscription",
      price_range: "$0.05/label or $10-200/mo",
      key_differentiators: [
        "Developer-first API",
        "US + international",
        "Real-time rates",
      ],
    },
    {
      name: "ShipStation",
      website: "https://www.shipstation.com",
      positioning:
        "Order and shipping management for high-volume e-commerce",
      pricing_model: "Tiered subscription by shipment volume",
      price_range: "$9.99-$229.99/mo",
      key_differentiators: [
        "Order management",
        "Marketplace integrations",
        "Automation rules",
      ],
    },
  ],

  strategic_positioning: {
    value_proposition:
      "The simplest way for Dutch and European e-commerce businesses to ship with multiple carriers at the best rates",
    target_segments: ["Growing Webshops", "Small Senders"],
    key_advantages: [
      "Strong Dutch carrier relationships (PostNL, DHL)",
      "Native Shopify/WooCommerce plugins",
      "Competitive per-label pricing",
      "Free tier for onboarding",
    ],
    key_risks: [
      "Revenue concentration in top 10% of customers",
      "50% of customers on free/near-free tier",
      "Sendcloud expanding aggressively in NL market",
      "Carrier rate changes directly impact margins",
    ],
    pricing_philosophy: "Penetration",
  },
};

export const MYPARCEL_PRESET: PresetDefinition = {
  id: "myparcel",
  label: "MyParcel",
  subtitle: "Shipping & Logistics",
  description:
    "Dutch multi-carrier shipping platform for e-commerce. Hybrid subscription + usage-based model with 5 tiers.",
  profile: MYPARCEL_PROFILE,
};
