/**
 * Synthetic Stripe Data Generator
 * Generates Stripe-like records modeled on Stripe API documentation
 * Based on MyParcel.nl business model
 */

import { v4 as uuidv4 } from "uuid";
import type {
  Database,
  StripeCustomer,
  StripeProduct,
  StripePrice,
  StripeSubscription,
  StripeInvoice,
  StripeInvoiceLineItem,
} from "@/types/database";

// Configuration
const CONFIG = {
  scale: 0.1, // 10% of real business for demo
  baseCustomers: 27000,
  currency: "eur",
  // MyParcel subscription tiers
  subscriptionTiers: [
    { name: "Standaard", priceMonthly: 0, labelLimit: 50 },
    { name: "Start", priceMonthly: 2500, labelLimit: 500 }, // €25 in cents
    { name: "Plus", priceMonthly: 5000, labelLimit: 2000 }, // €50 in cents
    { name: "Premium", priceMonthly: 7500, labelLimit: 10000 }, // €75 in cents
    { name: "Max", priceMonthly: 12500, labelLimit: -1 }, // €125 in cents, unlimited
  ],
  // Shipping products
  shippingProducts: [
    { carrier: "PostNL", type: "Domestic", price: 395 }, // €3.95
    { carrier: "PostNL", type: "EU", price: 1295 },
    { carrier: "PostNL", type: "World", price: 2495 },
    { carrier: "DHL", type: "Domestic", price: 495 },
    { carrier: "DHL", type: "EU", price: 1495 },
    { carrier: "DHL", type: "World", price: 2995 },
    { carrier: "DPD", type: "Domestic", price: 450 },
    { carrier: "DPD", type: "EU", price: 1350 },
    { carrier: "UPS", type: "Domestic", price: 595 },
    { carrier: "UPS", type: "EU", price: 1695 },
  ],
  // Segment distribution
  segments: {
    enterprise: { pct: 0.025, mrrRange: [5000, 50000] },
    growing: { pct: 0.1, mrrRange: [500, 5000] },
    small: { pct: 0.375, mrrRange: [50, 500] },
    hobby: { pct: 0.5, mrrRange: [0, 50] },
  },
};

interface GeneratedStripeData {
  products: Database["public"]["Tables"]["stripe_products"]["Insert"][];
  prices: Database["public"]["Tables"]["stripe_prices"]["Insert"][];
  customers: Database["public"]["Tables"]["stripe_customers"]["Insert"][];
  subscriptions: Database["public"]["Tables"]["stripe_subscriptions"]["Insert"][];
  invoices: Database["public"]["Tables"]["stripe_invoices"]["Insert"][];
  invoiceLineItems: Database["public"]["Tables"]["stripe_invoice_line_items"]["Insert"][];
}

function generateStripeId(prefix: string): string {
  return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 24)}`;
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function generateCompanyName(): string {
  const prefixes = [
    "Dutch",
    "Euro",
    "Global",
    "Quick",
    "Fast",
    "Smart",
    "Green",
    "Blue",
    "Red",
    "Prime",
  ];
  const cores = [
    "Shop",
    "Store",
    "Trade",
    "Commerce",
    "Market",
    "Retail",
    "Goods",
    "Products",
    "Sales",
    "Direct",
  ];
  const suffixes = ["BV", "NL", "EU", "Online", "Express", "Plus", "Pro", ""];
  return `${prefixes[randomInRange(0, prefixes.length - 1)]} ${cores[randomInRange(0, cores.length - 1)]} ${suffixes[randomInRange(0, suffixes.length - 1)]}`.trim();
}

function generateEmail(companyName: string): string {
  const domain = companyName.toLowerCase().replace(/\s+/g, "").slice(0, 15);
  return `billing@${domain}.nl`;
}

export function generateStripeData(organizationId: string): GeneratedStripeData {
  const products: GeneratedStripeData["products"] = [];
  const prices: GeneratedStripeData["prices"] = [];
  const customers: GeneratedStripeData["customers"] = [];
  const subscriptions: GeneratedStripeData["subscriptions"] = [];
  const invoices: GeneratedStripeData["invoices"] = [];
  const invoiceLineItems: GeneratedStripeData["invoiceLineItems"] = [];

  const productIdMap: Record<string, string> = {};
  const priceIdMap: Record<string, string> = {};
  const customerIdMap: Record<string, string> = {};

  // Generate subscription products
  for (const tier of CONFIG.subscriptionTiers) {
    const productId = uuidv4();
    const stripeProductId = generateStripeId("prod");
    productIdMap[tier.name] = productId;

    products.push({
      organization_id: organizationId,
      stripe_id: stripeProductId,
      name: `MyParcel ${tier.name}`,
      description: `${tier.name} subscription tier - ${tier.labelLimit === -1 ? "Unlimited" : tier.labelLimit} labels/month`,
      active: true,
      unit_label: "subscription",
      metadata: { tier: tier.name, label_limit: tier.labelLimit },
      stripe_created: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Monthly price
    const monthlyPriceId = uuidv4();
    const stripeMonthlyPriceId = generateStripeId("price");
    priceIdMap[`${tier.name}_monthly`] = monthlyPriceId;

    prices.push({
      organization_id: organizationId,
      stripe_id: stripeMonthlyPriceId,
      product_id: productId,
      stripe_product_id: stripeProductId,
      active: true,
      currency: CONFIG.currency,
      unit_amount: tier.priceMonthly,
      type: "recurring",
      billing_scheme: "per_unit",
      recurring_interval: "month",
      recurring_interval_count: 1,
      recurring_usage_type: "licensed",
      metadata: {},
      stripe_created: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Annual price (10% discount)
    if (tier.priceMonthly > 0) {
      const annualPrice = Math.floor(tier.priceMonthly * 12 * 0.9);
      prices.push({
        organization_id: organizationId,
        stripe_id: generateStripeId("price"),
        product_id: productId,
        stripe_product_id: stripeProductId,
        active: true,
        currency: CONFIG.currency,
        unit_amount: annualPrice,
        type: "recurring",
        billing_scheme: "per_unit",
        recurring_interval: "year",
        recurring_interval_count: 1,
        recurring_usage_type: "licensed",
        metadata: { discount: "10%" },
        stripe_created: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  // Generate shipping label products
  for (const shipping of CONFIG.shippingProducts) {
    const productId = uuidv4();
    const stripeProductId = generateStripeId("prod");
    const productName = `${shipping.carrier} ${shipping.type}`;
    productIdMap[productName] = productId;

    products.push({
      organization_id: organizationId,
      stripe_id: stripeProductId,
      name: productName,
      description: `${shipping.carrier} shipping label - ${shipping.type}`,
      active: true,
      unit_label: "label",
      metadata: { carrier: shipping.carrier, destination: shipping.type },
      stripe_created: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const priceId = uuidv4();
    priceIdMap[productName] = priceId;

    prices.push({
      organization_id: organizationId,
      stripe_id: generateStripeId("price"),
      product_id: productId,
      stripe_product_id: stripeProductId,
      active: true,
      currency: CONFIG.currency,
      unit_amount: shipping.price,
      type: "one_time",
      billing_scheme: "per_unit",
      metadata: {},
      stripe_created: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Generate customers
  const totalCustomers = Math.floor(CONFIG.baseCustomers * CONFIG.scale);
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

  let customerIndex = 0;
  for (const [segmentName, segment] of Object.entries(CONFIG.segments)) {
    const segmentCount = Math.floor(totalCustomers * segment.pct);

    for (let i = 0; i < segmentCount; i++) {
      const customerId = uuidv4();
      const stripeCustomerId = generateStripeId("cus");
      const companyName = generateCompanyName();
      const email = generateEmail(companyName);
      const createdDate = randomDate(twoYearsAgo, oneYearAgo);

      customerIdMap[customerIndex.toString()] = customerId;

      // Determine tier based on segment
      let tierName: string;
      if (segmentName === "enterprise") {
        tierName = Math.random() > 0.3 ? "Max" : "Premium";
      } else if (segmentName === "growing") {
        tierName =
          Math.random() > 0.5 ? "Premium" : Math.random() > 0.5 ? "Plus" : "Start";
      } else if (segmentName === "small") {
        tierName = Math.random() > 0.6 ? "Plus" : Math.random() > 0.5 ? "Start" : "Standaard";
      } else {
        tierName = Math.random() > 0.8 ? "Start" : "Standaard";
      }

      const tier = CONFIG.subscriptionTiers.find((t) => t.name === tierName)!;
      const monthlyMrr = randomInRange(segment.mrrRange[0], segment.mrrRange[1]);

      customers.push({
        organization_id: organizationId,
        stripe_id: stripeCustomerId,
        email,
        name: companyName,
        description: `${segmentName} customer`,
        currency: CONFIG.currency,
        balance: 0,
        delinquent: Math.random() < 0.02, // 2% delinquent
        metadata: {
          segment: segmentName,
          tier: tierName,
          monthly_mrr: monthlyMrr,
          customer_index: customerIndex,
        },
        stripe_created: createdDate.toISOString(),
      });

      // Create subscription
      const subscriptionId = uuidv4();
      const stripeSubscriptionId = generateStripeId("sub");
      const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(now.getTime() + 0 * 24 * 60 * 60 * 1000);

      // 5% churned
      const isActive = Math.random() > 0.05;

      subscriptions.push({
        organization_id: organizationId,
        stripe_id: stripeSubscriptionId,
        customer_id: customerId,
        stripe_customer_id: stripeCustomerId,
        status: isActive ? "active" : "canceled",
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        canceled_at: isActive ? undefined : now.toISOString(),
        collection_method: "charge_automatically",
        metadata: { tier: tierName },
        stripe_created: createdDate.toISOString(),
      });

      // Generate 12 months of invoices
      for (let month = 0; month < 12; month++) {
        const invoiceDate = new Date(now.getTime() - month * 30 * 24 * 60 * 60 * 1000);
        const invoiceId = uuidv4();
        const stripeInvoiceId = generateStripeId("in");

        // Calculate invoice total (subscription + usage)
        const subscriptionAmount = tier.priceMonthly;
        const usageLabels = Math.floor(monthlyMrr / 4); // Rough estimate
        const usageAmount = usageLabels * 400; // Average €4 per label
        const totalAmount = subscriptionAmount + usageAmount;

        invoices.push({
          organization_id: organizationId,
          stripe_id: stripeInvoiceId,
          customer_id: customerId,
          stripe_customer_id: stripeCustomerId,
          subscription_id: subscriptionId,
          stripe_subscription_id: stripeSubscriptionId,
          status: "paid",
          collection_method: "charge_automatically",
          currency: CONFIG.currency,
          amount_due: totalAmount,
          amount_paid: totalAmount,
          amount_remaining: 0,
          subtotal: totalAmount,
          total: totalAmount,
          period_start: new Date(invoiceDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          period_end: invoiceDate.toISOString(),
          paid_at: invoiceDate.toISOString(),
          number: `INV-${customerIndex.toString().padStart(5, "0")}-${(12 - month).toString().padStart(2, "0")}`,
          metadata: {},
          stripe_created: invoiceDate.toISOString(),
        });

        // Subscription line item
        if (subscriptionAmount > 0) {
          invoiceLineItems.push({
            organization_id: organizationId,
            stripe_id: generateStripeId("il"),
            invoice_id: invoiceId,
            stripe_invoice_id: stripeInvoiceId,
            type: "subscription",
            description: `MyParcel ${tierName} subscription`,
            currency: CONFIG.currency,
            amount: subscriptionAmount,
            quantity: 1,
            stripe_price_id: generateStripeId("price"),
            period_start: new Date(invoiceDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            period_end: invoiceDate.toISOString(),
            proration: false,
            metadata: {},
          });
        }

        // Usage line items (simplified - one per carrier used)
        if (usageLabels > 0) {
          const carriers = ["PostNL", "DHL"];
          for (const carrier of carriers) {
            const carrierLabels = Math.floor(usageLabels / carriers.length);
            if (carrierLabels > 0) {
              invoiceLineItems.push({
                organization_id: organizationId,
                stripe_id: generateStripeId("il"),
                invoice_id: invoiceId,
                stripe_invoice_id: stripeInvoiceId,
                type: "invoiceitem",
                description: `${carrier} shipping labels`,
                currency: CONFIG.currency,
                amount: carrierLabels * 400,
                quantity: carrierLabels,
                period_start: new Date(invoiceDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                period_end: invoiceDate.toISOString(),
                proration: false,
                metadata: { carrier },
              });
            }
          }
        }
      }

      customerIndex++;
    }
  }

  return {
    products,
    prices,
    customers,
    subscriptions,
    invoices,
    invoiceLineItems,
  };
}
