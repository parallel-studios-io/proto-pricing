import type { CompanyProfile, PresetDefinition } from "@/types/company-profile";

const DEVTOOLS_PROFILE: CompanyProfile = {
  name: "StreamAPI",
  description:
    "Developer communication platform providing APIs for email, SMS, push notifications, and authentication. Developers integrate StreamAPI to send transactional emails, SMS verifications, and real-time notifications at scale.",
  website: "https://www.streamapi.dev",
  country: "United States",
  currency: "USD",
  currency_symbol: "$",

  business_model: "usage_based",
  primary_value_metric: "API calls",
  secondary_value_metrics: [
    "channels used",
    "monthly active users reached",
    "webhook events delivered",
  ],

  total_customers: 3200,
  total_arr: 18_500_000,
  avg_deal_size: 5781,

  segments: [
    {
      name: "Enterprise",
      description:
        "Large companies with dedicated infrastructure needs. Custom SLAs, dedicated IPs, SSO, and premium support. Typically 10M+ API calls/month.",
      customer_share: 0.08,
      revenue_share: 0.58,
      avg_mrr: 12000,
      churn_rate: 0.003,
      expansion_rate: 0.12,
      value_drivers: [
        "99.99% SLA",
        "Dedicated IP pools",
        "SSO/SAML",
        "Premium support",
        "Custom rate limits",
      ],
      company_size: "enterprise",
    },
    {
      name: "Growth",
      description:
        "Scale-ups and mid-size companies sending 1-10M API calls/month. Need reliability, deliverability analytics, and multi-channel support.",
      customer_share: 0.15,
      revenue_share: 0.28,
      avg_mrr: 2900,
      churn_rate: 0.015,
      expansion_rate: 0.2,
      value_drivers: [
        "Deliverability analytics",
        "Multi-channel (email + SMS)",
        "Webhook reliability",
        "Team management",
      ],
      company_size: "mid_market",
    },
    {
      name: "Startup",
      description:
        "Early-stage startups and small companies sending 10K-1M API calls/month. Looking for easy integration and transparent pricing.",
      customer_share: 0.17,
      revenue_share: 0.12,
      avg_mrr: 110,
      churn_rate: 0.035,
      expansion_rate: 0.3,
      value_drivers: [
        "Quick integration",
        "Clear documentation",
        "Transparent pricing",
        "Free tier to start",
      ],
      company_size: "smb",
    },
    {
      name: "Free Developer",
      description:
        "Individual developers, side projects, and evaluation users on the free tier. Under 10K API calls/month.",
      customer_share: 0.6,
      revenue_share: 0.02,
      avg_mrr: 5,
      churn_rate: 0.1,
      expansion_rate: 0.04,
      value_drivers: [
        "Free tier",
        "Great documentation",
        "Community support",
        "SDKs for all languages",
      ],
      company_size: "startup",
    },
  ],

  products: [
    {
      name: "Email API",
      type: "usage",
      base_price: 0.0004,
      unit_label: "email",
    },
    {
      name: "SMS API",
      type: "usage",
      base_price: 0.0075,
      unit_label: "message",
    },
    {
      name: "Push Notifications",
      type: "usage",
      base_price: 0.0001,
      unit_label: "notification",
    },
    {
      name: "Auth API",
      type: "usage",
      base_price: 0.005,
      unit_label: "verification",
    },
    {
      name: "Video API",
      type: "usage",
      base_price: 0.004,
      unit_label: "minute",
    },
    {
      name: "Starter Plan",
      type: "subscription",
      base_price: 29,
    },
    {
      name: "Pro Plan",
      type: "subscription",
      base_price: 99,
    },
    {
      name: "Business Plan",
      type: "subscription",
      base_price: 299,
    },
    {
      name: "Enterprise Plan",
      type: "subscription",
      base_price: 999,
    },
  ],

  pricing_tiers: [
    {
      name: "Free",
      price_monthly: 0,
      features: [
        "10,000 API calls/month",
        "Email API only",
        "Community support",
        "Basic analytics",
      ],
      value_metric_limits: { api_calls: 10000 },
      customer_share: 0.5,
      revenue_share: 0.005,
      position: 1,
    },
    {
      name: "Starter",
      price_monthly: 29,
      price_annual: 290,
      features: [
        "100,000 API calls/month",
        "Email + SMS",
        "Email support",
        "Deliverability dashboard",
        "5 team members",
      ],
      value_metric_limits: { api_calls: 100000 },
      customer_share: 0.22,
      revenue_share: 0.06,
      position: 2,
    },
    {
      name: "Pro",
      price_monthly: 99,
      price_annual: 990,
      features: [
        "1M API calls/month",
        "All channels",
        "Priority support",
        "Advanced analytics",
        "Webhooks",
        "15 team members",
      ],
      value_metric_limits: { api_calls: 1000000 },
      customer_share: 0.16,
      revenue_share: 0.14,
      position: 3,
    },
    {
      name: "Business",
      price_monthly: 299,
      price_annual: 2990,
      features: [
        "10M API calls/month",
        "All channels",
        "Dedicated IP",
        "SSO",
        "Phone support",
        "SLA 99.95%",
        "Unlimited team members",
      ],
      value_metric_limits: { api_calls: 10000000 },
      customer_share: 0.09,
      revenue_share: 0.28,
      position: 4,
    },
    {
      name: "Enterprise",
      price_monthly: 999,
      price_annual: 9990,
      features: [
        "Unlimited API calls",
        "All channels",
        "Dedicated infrastructure",
        "Custom SLA 99.99%",
        "Premium support",
        "Custom integrations",
        "Volume discounts",
      ],
      value_metric_limits: { api_calls: "unlimited" },
      customer_share: 0.03,
      revenue_share: 0.505,
      position: 5,
    },
  ],

  market_context: {
    market_category: "Developer Communication APIs",
    tam_estimate: "$12.5B",
    growth_rate: "18% CAGR",
    market_structure: "Oligopolistic with Twilio dominant",
    key_trends: [
      "Multi-channel customer engagement (email + SMS + push + in-app)",
      "AI-powered content optimization and deliverability",
      "Compliance complexity (GDPR, TCPA, CAN-SPAM)",
      "Shift from legacy SMTP to API-first email",
      "Embedded communications (CPaaS)",
    ],
    buying_factors: [
      "API design and documentation quality",
      "Deliverability rates",
      "Pricing transparency and predictability",
      "SDK coverage across languages",
      "Uptime SLA and reliability",
      "Compliance and security certifications",
    ],
  },

  competitors: [
    {
      name: "Twilio",
      website: "https://www.twilio.com",
      positioning:
        "The world's leading cloud communications platform",
      pricing_model: "Pure usage-based (pay-per-API-call)",
      price_range: "$0.0007-0.05/message depending on channel",
      key_differentiators: [
        "Broadest channel coverage",
        "Massive scale",
        "Segment CDP integration",
        "Global carrier network",
      ],
      estimated_market_share: "35%",
    },
    {
      name: "SendGrid (Twilio)",
      website: "https://sendgrid.com",
      positioning: "Trusted email delivery at scale",
      pricing_model: "Freemium + tiered subscription",
      price_range: "$0-$89.95/mo + overage",
      key_differentiators: [
        "Email deliverability expertise",
        "Marketing + transactional email",
        "Email validation API",
      ],
      estimated_market_share: "15%",
    },
    {
      name: "Mailgun",
      website: "https://www.mailgun.com",
      positioning: "Powerful email APIs for developers",
      pricing_model: "Usage-based with tiered plans",
      price_range: "$0-$90/mo + $0.80/1K emails",
      key_differentiators: [
        "Email validation",
        "Inbox placement testing",
        "Detailed analytics",
      ],
      estimated_market_share: "8%",
    },
    {
      name: "Vonage (Ericsson)",
      website: "https://www.vonage.com",
      positioning: "Enterprise-grade communication APIs",
      pricing_model: "Usage-based with enterprise contracts",
      price_range: "Custom enterprise pricing",
      key_differentiators: [
        "Voice/video APIs",
        "Enterprise focus",
        "Global telecom partnerships",
      ],
      estimated_market_share: "10%",
    },
  ],

  strategic_positioning: {
    value_proposition:
      "The developer-first communication API that's simple to integrate, transparent in pricing, and reliable at any scale",
    target_segments: ["Startup", "Growth"],
    key_advantages: [
      "Best-in-class API documentation and SDKs",
      "Transparent usage-based pricing (no hidden fees)",
      "Multi-channel from a single API",
      "Generous free tier for developer adoption",
    ],
    key_risks: [
      "Twilio's dominant market position and ecosystem lock-in",
      "60% of customers on free tier contributing 2% of revenue",
      "High infrastructure costs for maintaining deliverability",
      "Enterprise segment dominated by incumbents with telecom relationships",
    ],
    pricing_philosophy: "Value-based",
  },
};

export const DEVTOOLS_PRESET: PresetDefinition = {
  id: "devtools",
  label: "StreamAPI",
  subtitle: "Developer Tools / API",
  description:
    "Developer communication platform with APIs for email, SMS, push, and auth. Usage-based pricing with 5 tiers.",
  profile: DEVTOOLS_PROFILE,
};
