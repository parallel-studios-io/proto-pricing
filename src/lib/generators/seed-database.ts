/**
 * Database Seeding Orchestration
 * Seeds a Supabase database with synthetic MyParcel-like data
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, UnifiedCustomer, StripeCustomer, HubSpotCompany, HubSpotContact, Segment, PricingTier, ValueMetric, Pattern } from "@/types/database";
import type { CompanyProfile } from "@/types/company-profile";
import { generateStripeData } from "./synthetic/stripe-data";
import { generateStripeDataFromProfile } from "./synthetic/stripe-data";
import { generateHubSpotData } from "./synthetic/hubspot-data";
import { generateHubSpotDataFromProfile } from "./synthetic/hubspot-data";
import { generateOntologyData } from "./synthetic/ontology-data";
import { generateOntologyDataFromProfile } from "./synthetic/ontology-data";

type DbClient = SupabaseClient<Database>;

export interface SeedOptions {
  clearExisting?: boolean;
}

export interface SeedResult {
  success: boolean;
  stats: {
    stripeCustomers: number;
    stripeProducts: number;
    stripePrices: number;
    stripeSubscriptions: number;
    stripeInvoices: number;
    hubspotCompanies: number;
    hubspotContacts: number;
    hubspotDeals: number;
    unifiedCustomers: number;
    segments: number;
    tiers: number;
    valueMetrics: number;
    patterns: number;
  };
  error?: string;
}

export async function seedDatabase(
  supabase: DbClient,
  organizationId: string,
  options: SeedOptions = {}
): Promise<SeedResult> {
  const stats: SeedResult["stats"] = {
    stripeCustomers: 0,
    stripeProducts: 0,
    stripePrices: 0,
    stripeSubscriptions: 0,
    stripeInvoices: 0,
    hubspotCompanies: 0,
    hubspotContacts: 0,
    hubspotDeals: 0,
    unifiedCustomers: 0,
    segments: 0,
    tiers: 0,
    valueMetrics: 0,
    patterns: 0,
  };

  try {
    // Clear existing data if requested
    if (options.clearExisting) {
      console.log("Clearing existing data...");
      await clearOrganizationData(supabase, organizationId);
    }

    // Step 1: Generate Stripe data
    console.log("Generating Stripe data...");
    const stripeData = generateStripeData(organizationId);

    // Step 2: Insert Stripe products and prices first
    console.log("Inserting Stripe products...");
    const { data: products } = await supabase
      .from("stripe_products")
      .upsert(stripeData.products as never[], { onConflict: "organization_id,stripe_id" })
      .select();
    stats.stripeProducts = products?.length || 0;

    console.log("Inserting Stripe prices...");
    const { data: prices } = await supabase
      .from("stripe_prices")
      .upsert(stripeData.prices as never[], { onConflict: "organization_id,stripe_id" })
      .select();
    stats.stripePrices = prices?.length || 0;

    // Step 3: Insert Stripe customers
    console.log("Inserting Stripe customers...");
    const { data: customersData } = await supabase
      .from("stripe_customers")
      .upsert(stripeData.customers as never[], { onConflict: "organization_id,stripe_id" })
      .select();
    const customers = (customersData || []) as StripeCustomer[];
    stats.stripeCustomers = customers.length;

    // Build customer ID mapping
    const customerIdMap = new Map<string, string>();
    customers.forEach((c) => {
      customerIdMap.set(c.stripe_id, c.id);
    });

    // Update subscription customer_id references
    const subscriptionsWithIds = stripeData.subscriptions.map((sub) => ({
      ...sub,
      customer_id: customerIdMap.get(sub.stripe_customer_id) || null,
    }));

    console.log("Inserting Stripe subscriptions...");
    const { data: subscriptions } = await supabase
      .from("stripe_subscriptions")
      .upsert(subscriptionsWithIds as never[], { onConflict: "organization_id,stripe_id" })
      .select();
    stats.stripeSubscriptions = subscriptions?.length || 0;

    // Update invoice customer_id references
    const invoicesWithIds = stripeData.invoices.map((inv) => ({
      ...inv,
      customer_id: customerIdMap.get(inv.stripe_customer_id) || null,
    }));

    console.log("Inserting Stripe invoices...");
    const { data: invoices } = await supabase
      .from("stripe_invoices")
      .upsert(invoicesWithIds as never[], { onConflict: "organization_id,stripe_id" })
      .select();
    stats.stripeInvoices = invoices?.length || 0;

    // Step 4: Generate and insert HubSpot data (correlated with Stripe)
    console.log("Generating HubSpot data...");
    const stripeCustomerRefs = customers.map((c) => ({
      customerId: c.id,
      stripeId: c.stripe_id,
      email: c.email || undefined,
      name: c.name || undefined,
      metadata: (c.metadata as Record<string, unknown>) || {},
      stripeCreated: c.stripe_created || undefined,
    }));

    const hubspotData = generateHubSpotData(organizationId, stripeCustomerRefs);

    console.log("Inserting HubSpot companies...");
    const { data: companiesData } = await supabase
      .from("hubspot_companies")
      .upsert(hubspotData.companies as never[], { onConflict: "organization_id,hubspot_id" })
      .select();
    const companies = (companiesData || []) as HubSpotCompany[];
    stats.hubspotCompanies = companies.length;

    console.log("Inserting HubSpot contacts...");
    const { data: contactsData } = await supabase
      .from("hubspot_contacts")
      .upsert(hubspotData.contacts as never[], { onConflict: "organization_id,hubspot_id" })
      .select();
    const contacts = (contactsData || []) as HubSpotContact[];
    stats.hubspotContacts = contacts.length;

    console.log("Inserting HubSpot deals...");
    const { data: deals } = await supabase
      .from("hubspot_deals")
      .upsert(hubspotData.deals as never[], { onConflict: "organization_id,hubspot_id" })
      .select();
    stats.hubspotDeals = deals?.length || 0;

    // Step 5: Generate ontology data
    console.log("Generating ontology data...");
    const totalMrr = customers.reduce((sum, c) => {
      const metadata = c.metadata as Record<string, unknown>;
      return sum + (Number(metadata?.monthly_mrr) || 0);
    }, 0);

    const ontologyData = generateOntologyData(organizationId, {
      totalCustomers: customers.length,
      totalMrr,
    });

    console.log("Inserting segments...");
    const { data: segmentsData } = await supabase
      .from("segments")
      .upsert(ontologyData.segments as never[], { onConflict: "id" })
      .select();
    const segments = (segmentsData || []) as Segment[];
    stats.segments = segments.length;

    // Build segment name to ID mapping
    const segmentIdMap = new Map<string, string>();
    segments.forEach((s) => {
      segmentIdMap.set(s.name.toLowerCase(), s.id);
    });

    console.log("Inserting pricing tiers...");
    const { data: tiersData } = await supabase
      .from("pricing_tiers")
      .upsert(ontologyData.tiers as never[], { onConflict: "organization_id,name" })
      .select();
    const tiers = (tiersData || []) as PricingTier[];
    stats.tiers = tiers.length;

    // Build tier name to ID mapping
    const tierIdMap = new Map<string, string>();
    tiers.forEach((t) => {
      tierIdMap.set(t.name.toLowerCase(), t.id);
    });

    console.log("Inserting value metrics...");
    const { data: valueMetricsData } = await supabase
      .from("value_metrics")
      .upsert(ontologyData.valueMetrics as never[], { onConflict: "id" })
      .select();
    const valueMetrics = (valueMetricsData || []) as ValueMetric[];
    stats.valueMetrics = valueMetrics.length;

    console.log("Inserting patterns...");
    const { data: patternsData } = await supabase
      .from("patterns")
      .upsert(ontologyData.patterns as never[], { onConflict: "id" })
      .select();
    const patterns = (patternsData || []) as Pattern[];
    stats.patterns = patterns.length;

    console.log("Inserting economics snapshot...");
    await supabase
      .from("economics_snapshots")
      .upsert([ontologyData.economicsSnapshot] as never[], { onConflict: "id" });

    // Step 6: Create unified customers
    console.log("Creating unified customers...");
    const unifiedCustomers = customers.map((stripeCustomer) => {
      const metadata = stripeCustomer.metadata as Record<string, unknown>;
      const segment = String(metadata?.segment || "hobby").toLowerCase();
      const tier = String(metadata?.tier || "standaard").toLowerCase();
      const mrr = Number(metadata?.monthly_mrr) || 0;

      // Find matching HubSpot company
      const hubspotCompany = companies.find((c) => {
        const props = c.properties as Record<string, unknown>;
        return props?.stripe_customer_id === stripeCustomer.stripe_id;
      });

      // Find matching HubSpot contact
      const hubspotContact = contacts.find((c) => {
        const props = c.properties as Record<string, unknown>;
        return props?.stripe_customer_id === stripeCustomer.stripe_id;
      });

      // Map segment to company size
      const companySizeMap: Record<string, UnifiedCustomer["company_size"]> = {
        enterprise: "enterprise",
        growing: "mid_market",
        small: "smb",
        hobby: "startup",
      };

      return {
        organization_id: organizationId,
        stripe_customer_id: stripeCustomer.id,
        hubspot_contact_id: hubspotContact?.id,
        hubspot_company_id: hubspotCompany?.id,
        name: stripeCustomer.name || "Unknown",
        email: stripeCustomer.email,
        company_name: hubspotCompany?.name || stripeCustomer.name,
        segment_id: segmentIdMap.get(segment) || null,
        mrr,
        ltv: mrr * 12 * 2, // Rough 2-year LTV estimate
        tenure_months: Math.floor(
          (Date.now() -
            new Date(stripeCustomer.stripe_created || Date.now()).getTime()) /
            (30 * 24 * 60 * 60 * 1000)
        ),
        current_tier_id: tierIdMap.get(tier) || null,
        billing_interval: "monthly" as const,
        industry: hubspotCompany?.industry,
        company_size: companySizeMap[segment] || "smb",
        country: "Netherlands",
        employee_count: hubspotCompany?.numberofemployees,
        status: stripeCustomer.delinquent ? "at_risk" : "active",
        metadata: {},
      };
    });

    // Insert in batches to avoid timeout
    const batchSize = 500;
    let insertedCount = 0;
    for (let i = 0; i < unifiedCustomers.length; i += batchSize) {
      const batch = unifiedCustomers.slice(i, i + batchSize);
      const { data } = await supabase
        .from("unified_customers")
        .upsert(batch as never[], { onConflict: "id" })
        .select();
      insertedCount += data?.length || 0;
    }
    stats.unifiedCustomers = insertedCount;

    // Step 7: Create initial ontology snapshot
    console.log("Creating ontology snapshot...");
    const snapshotData = {
      organization_id: organizationId,
      version: 1,
      description: "Initial seed data",
      segments_snapshot: segments,
      tiers_snapshot: tiers,
      economics_snapshot: ontologyData.economicsSnapshot,
      patterns_snapshot: patterns,
      value_metrics_snapshot: valueMetrics,
      triggered_by: "system",
      trigger_details: { action: "seed" },
    };
    await supabase.from("ontology_snapshots").insert(snapshotData as never);

    console.log("Seeding complete!");
    return { success: true, stats };
  } catch (error) {
    console.error("Seeding failed:", error);
    return {
      success: false,
      stats,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function clearOrganizationData(
  supabase: DbClient,
  organizationId: string
): Promise<void> {
  // Delete in reverse dependency order
  const tables = [
    "ontology_audit_log",
    "decision_records",
    "council_evaluations",
    "pricing_options",
    "ontology_snapshots",
    "economics_snapshots",
    "patterns",
    "value_metrics",
    "transactions",
    "customer_expansion_events",
    "unified_customers",
    "products",
    "hubspot_deal_contact_associations",
    "hubspot_contact_company_associations",
    "hubspot_deals",
    "hubspot_contacts",
    "hubspot_companies",
    "stripe_invoice_line_items",
    "stripe_invoices",
    "stripe_subscription_items",
    "stripe_subscriptions",
    "stripe_prices",
    "stripe_products",
    "stripe_customers",
    "segments",
    "pricing_tiers",
  ];

  for (const table of tables) {
    await supabase.from(table as never).delete().eq("organization_id", organizationId);
  }
}

export { clearOrganizationData };

// =============================================================================
// PROFILE-DRIVEN SEEDING
// =============================================================================

/**
 * Seed a Supabase database using a CompanyProfile instead of hardcoded MyParcel data.
 * Follows the same pattern as seedDatabase() but uses the *FromProfile generators.
 */
export async function seedDatabaseFromProfile(
  supabase: DbClient,
  organizationId: string,
  profile: CompanyProfile,
  options?: SeedOptions
): Promise<SeedResult> {
  const stats: SeedResult["stats"] = {
    stripeCustomers: 0,
    stripeProducts: 0,
    stripePrices: 0,
    stripeSubscriptions: 0,
    stripeInvoices: 0,
    hubspotCompanies: 0,
    hubspotContacts: 0,
    hubspotDeals: 0,
    unifiedCustomers: 0,
    segments: 0,
    tiers: 0,
    valueMetrics: 0,
    patterns: 0,
  };

  try {
    // Clear existing data if requested
    if (options?.clearExisting) {
      console.log("Clearing existing data...");
      await clearOrganizationData(supabase, organizationId);
    }

    // Step 1: Generate Stripe data from profile
    console.log("Generating Stripe data from profile...");
    const stripeData = generateStripeDataFromProfile(organizationId, profile);

    // Step 2: Insert Stripe products and prices first
    console.log("Inserting Stripe products...");
    const { data: products } = await supabase
      .from("stripe_products")
      .upsert(stripeData.products as never[], {
        onConflict: "organization_id,stripe_id",
      })
      .select();
    stats.stripeProducts = products?.length || 0;

    console.log("Inserting Stripe prices...");
    const { data: prices } = await supabase
      .from("stripe_prices")
      .upsert(stripeData.prices as never[], {
        onConflict: "organization_id,stripe_id",
      })
      .select();
    stats.stripePrices = prices?.length || 0;

    // Step 3: Insert Stripe customers
    console.log("Inserting Stripe customers...");
    const { data: customersData } = await supabase
      .from("stripe_customers")
      .upsert(stripeData.customers as never[], {
        onConflict: "organization_id,stripe_id",
      })
      .select();
    const customers = (customersData || []) as StripeCustomer[];
    stats.stripeCustomers = customers.length;

    // Build customer ID mapping
    const customerIdMap = new Map<string, string>();
    customers.forEach((c) => {
      customerIdMap.set(c.stripe_id, c.id);
    });

    // Update subscription customer_id references
    const subscriptionsWithIds = stripeData.subscriptions.map((sub) => ({
      ...sub,
      customer_id: customerIdMap.get(sub.stripe_customer_id) || null,
    }));

    console.log("Inserting Stripe subscriptions...");
    const { data: subscriptions } = await supabase
      .from("stripe_subscriptions")
      .upsert(subscriptionsWithIds as never[], {
        onConflict: "organization_id,stripe_id",
      })
      .select();
    stats.stripeSubscriptions = subscriptions?.length || 0;

    // Update invoice customer_id references
    const invoicesWithIds = stripeData.invoices.map((inv) => ({
      ...inv,
      customer_id: customerIdMap.get(inv.stripe_customer_id) || null,
    }));

    console.log("Inserting Stripe invoices...");
    const { data: invoices } = await supabase
      .from("stripe_invoices")
      .upsert(invoicesWithIds as never[], {
        onConflict: "organization_id,stripe_id",
      })
      .select();
    stats.stripeInvoices = invoices?.length || 0;

    // Insert invoice line items (batched to avoid payload limits)
    console.log("Inserting Stripe invoice line items...");
    const lineItemBatchSize = 1000;
    for (
      let i = 0;
      i < stripeData.invoiceLineItems.length;
      i += lineItemBatchSize
    ) {
      const batch = stripeData.invoiceLineItems.slice(
        i,
        i + lineItemBatchSize
      );
      await supabase
        .from("stripe_invoice_line_items")
        .upsert(batch as never[], {
          onConflict: "organization_id,stripe_id",
        });
    }

    // Step 4: Generate and insert HubSpot data (correlated with Stripe)
    console.log("Generating HubSpot data from profile...");
    const stripeCustomerRefs = customers.map((c) => ({
      customerId: c.id,
      stripeId: c.stripe_id,
      email: c.email || undefined,
      name: c.name || undefined,
      metadata: (c.metadata as Record<string, unknown>) || {},
      stripeCreated: c.stripe_created || undefined,
    }));

    const hubspotData = generateHubSpotDataFromProfile(
      organizationId,
      stripeCustomerRefs,
      profile
    );

    console.log("Inserting HubSpot companies...");
    const { data: companiesData } = await supabase
      .from("hubspot_companies")
      .upsert(hubspotData.companies as never[], {
        onConflict: "organization_id,hubspot_id",
      })
      .select();
    const companies = (companiesData || []) as HubSpotCompany[];
    stats.hubspotCompanies = companies.length;

    console.log("Inserting HubSpot contacts...");
    const { data: contactsData } = await supabase
      .from("hubspot_contacts")
      .upsert(hubspotData.contacts as never[], {
        onConflict: "organization_id,hubspot_id",
      })
      .select();
    const contacts = (contactsData || []) as HubSpotContact[];
    stats.hubspotContacts = contacts.length;

    console.log("Inserting HubSpot deals...");
    const { data: deals } = await supabase
      .from("hubspot_deals")
      .upsert(hubspotData.deals as never[], {
        onConflict: "organization_id,hubspot_id",
      })
      .select();
    stats.hubspotDeals = deals?.length || 0;

    // Step 5: Generate ontology data from profile
    console.log("Generating ontology data from profile...");
    const totalMrr = customers.reduce((sum, c) => {
      const metadata = c.metadata as Record<string, unknown>;
      return sum + (Number(metadata?.monthly_mrr) || 0);
    }, 0);

    const ontologyData = generateOntologyDataFromProfile(
      organizationId,
      profile,
      {
        totalCustomers: customers.length,
        totalMrr,
      }
    );

    console.log("Inserting segments...");
    const { data: segmentsData } = await supabase
      .from("segments")
      .upsert(ontologyData.segments as never[], { onConflict: "id" })
      .select();
    const segments = (segmentsData || []) as Segment[];
    stats.segments = segments.length;

    // Build segment name to ID mapping
    const segmentIdMap = new Map<string, string>();
    segments.forEach((s) => {
      segmentIdMap.set(s.name.toLowerCase(), s.id);
    });

    console.log("Inserting pricing tiers...");
    const { data: tiersData } = await supabase
      .from("pricing_tiers")
      .upsert(ontologyData.tiers as never[], {
        onConflict: "organization_id,name",
      })
      .select();
    const tiers = (tiersData || []) as PricingTier[];
    stats.tiers = tiers.length;

    // Build tier name to ID mapping
    const tierIdMap = new Map<string, string>();
    tiers.forEach((t) => {
      tierIdMap.set(t.name.toLowerCase(), t.id);
    });

    console.log("Inserting value metrics...");
    const { data: valueMetricsData } = await supabase
      .from("value_metrics")
      .upsert(ontologyData.valueMetrics as never[], { onConflict: "id" })
      .select();
    const valueMetrics = (valueMetricsData || []) as ValueMetric[];
    stats.valueMetrics = valueMetrics.length;

    console.log("Inserting patterns...");
    const { data: patternsData } = await supabase
      .from("patterns")
      .upsert(ontologyData.patterns as never[], { onConflict: "id" })
      .select();
    const patterns = (patternsData || []) as Pattern[];
    stats.patterns = patterns.length;

    console.log("Inserting economics snapshot...");
    await supabase
      .from("economics_snapshots")
      .upsert([ontologyData.economicsSnapshot] as never[], {
        onConflict: "id",
      });

    // Step 5b: Insert competitors if present in the profile
    if (profile.competitors && profile.competitors.length > 0) {
      console.log("Inserting competitors...");
      const competitorRecords = profile.competitors.map((comp) => ({
        organization_id: organizationId,
        name: comp.name,
        website: comp.website,
        positioning: comp.positioning,
        pricing_model: comp.pricing_model,
        price_range: comp.price_range,
        key_differentiators: comp.key_differentiators,
        estimated_market_share: comp.estimated_market_share,
        source: "company_profile",
        is_active: true,
      }));

      await supabase
        .from("competitors")
        .upsert(competitorRecords as never[], {
          onConflict: "id",
        });
    }

    // Step 6: Create unified customers
    console.log("Creating unified customers...");

    // Build a map from segment name (from profile) to company_size
    const segmentCompanySizeMap: Record<
      string,
      UnifiedCustomer["company_size"]
    > = {};
    for (const seg of profile.segments) {
      segmentCompanySizeMap[seg.name.toLowerCase()] = seg.company_size as
        | "startup"
        | "smb"
        | "mid_market"
        | "enterprise";
    }

    const unifiedCustomers = customers.map((stripeCustomer) => {
      const metadata = stripeCustomer.metadata as Record<string, unknown>;
      const segment = String(metadata?.segment || "").toLowerCase();
      const tier = String(metadata?.tier || "").toLowerCase();
      const mrr = Number(metadata?.monthly_mrr) || 0;

      // Find matching HubSpot company
      const hubspotCompany = companies.find((c) => {
        const props = c.properties as Record<string, unknown>;
        return props?.stripe_customer_id === stripeCustomer.stripe_id;
      });

      // Find matching HubSpot contact
      const hubspotContact = contacts.find((c) => {
        const props = c.properties as Record<string, unknown>;
        return props?.stripe_customer_id === stripeCustomer.stripe_id;
      });

      return {
        organization_id: organizationId,
        stripe_customer_id: stripeCustomer.id,
        hubspot_contact_id: hubspotContact?.id,
        hubspot_company_id: hubspotCompany?.id,
        name: stripeCustomer.name || "Unknown",
        email: stripeCustomer.email,
        company_name: hubspotCompany?.name || stripeCustomer.name,
        segment_id: segmentIdMap.get(segment) || null,
        mrr,
        ltv: mrr * 12 * 2,
        tenure_months: Math.floor(
          (Date.now() -
            new Date(
              stripeCustomer.stripe_created || Date.now()
            ).getTime()) /
            (30 * 24 * 60 * 60 * 1000)
        ),
        current_tier_id: tierIdMap.get(tier) || null,
        billing_interval: "monthly" as const,
        industry: hubspotCompany?.industry,
        company_size: segmentCompanySizeMap[segment] || "smb",
        country: profile.country,
        employee_count: hubspotCompany?.numberofemployees,
        status: stripeCustomer.delinquent
          ? ("at_risk" as const)
          : ("active" as const),
        metadata: {},
      };
    });

    // Insert in batches to avoid timeout
    const batchSize = 500;
    let insertedCount = 0;
    for (let i = 0; i < unifiedCustomers.length; i += batchSize) {
      const batch = unifiedCustomers.slice(i, i + batchSize);
      const { data } = await supabase
        .from("unified_customers")
        .upsert(batch as never[], { onConflict: "id" })
        .select();
      insertedCount += data?.length || 0;
    }
    stats.unifiedCustomers = insertedCount;

    // Step 7: Create initial ontology snapshot
    console.log("Creating ontology snapshot...");
    const snapshotData = {
      organization_id: organizationId,
      version: 1,
      description: `Initial seed data for ${profile.name}`,
      segments_snapshot: segments,
      tiers_snapshot: tiers,
      economics_snapshot: ontologyData.economicsSnapshot,
      patterns_snapshot: patterns,
      value_metrics_snapshot: valueMetrics,
      triggered_by: "system",
      trigger_details: { action: "seed_from_profile", profile_name: profile.name },
    };
    await supabase.from("ontology_snapshots").insert(snapshotData as never);

    console.log(`Seeding from profile "${profile.name}" complete!`);
    return { success: true, stats };
  } catch (error) {
    console.error("Seeding from profile failed:", error);
    return {
      success: false,
      stats,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
