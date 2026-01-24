/**
 * Synthetic HubSpot Data Generator
 * Generates HubSpot-like records modeled on HubSpot API documentation
 * Correlated with Stripe customer data
 */

import { v4 as uuidv4 } from "uuid";
import type { Database } from "@/types/database";

interface StripeCustomerRef {
  customerId: string;
  stripeId: string;
  email?: string;
  name?: string;
  metadata: {
    segment?: string;
    tier?: string;
    monthly_mrr?: number;
  };
  stripeCreated?: string;
}

interface GeneratedHubSpotData {
  companies: Database["public"]["Tables"]["hubspot_companies"]["Insert"][];
  contacts: Database["public"]["Tables"]["hubspot_contacts"]["Insert"][];
  deals: Database["public"]["Tables"]["hubspot_deals"]["Insert"][];
}

const INDUSTRIES = [
  "E-commerce",
  "Retail",
  "Wholesale",
  "Manufacturing",
  "Food & Beverage",
  "Fashion",
  "Electronics",
  "Home & Garden",
  "Sports & Outdoor",
  "Health & Beauty",
];

const COMPANY_SIZES = {
  enterprise: { min: 100, max: 5000 },
  growing: { min: 20, max: 100 },
  small: { min: 5, max: 20 },
  hobby: { min: 1, max: 5 },
};

const DEAL_STAGES = [
  "appointmentscheduled",
  "qualifiedtobuy",
  "presentationscheduled",
  "decisionmakerboughtin",
  "contractsent",
  "closedwon",
  "closedlost",
];

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function generateFirstName(): string {
  const names = [
    "Jan",
    "Pieter",
    "Kees",
    "Willem",
    "Johan",
    "Anna",
    "Maria",
    "Sophie",
    "Emma",
    "Lisa",
    "Mark",
    "Thomas",
    "David",
    "Michael",
    "Robert",
  ];
  return names[randomInRange(0, names.length - 1)];
}

function generateLastName(): string {
  const names = [
    "de Vries",
    "Jansen",
    "de Boer",
    "van Dijk",
    "Bakker",
    "Visser",
    "Smit",
    "Meijer",
    "de Groot",
    "Mulder",
    "Bos",
    "Peters",
    "Hendriks",
    "van Leeuwen",
    "Dekker",
  ];
  return names[randomInRange(0, names.length - 1)];
}

function generateJobTitle(segment: string): string {
  const titles: Record<string, string[]> = {
    enterprise: [
      "CEO",
      "COO",
      "VP Operations",
      "Director of Logistics",
      "Head of E-commerce",
    ],
    growing: [
      "Owner",
      "Operations Manager",
      "E-commerce Manager",
      "Logistics Lead",
    ],
    small: ["Owner", "Manager", "Founder"],
    hobby: ["Owner", "Founder", "Seller"],
  };
  const segmentTitles = titles[segment] || titles.hobby;
  return segmentTitles[randomInRange(0, segmentTitles.length - 1)];
}

function getDomain(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) + ".nl";
}

export function generateHubSpotData(
  organizationId: string,
  stripeCustomers: StripeCustomerRef[]
): GeneratedHubSpotData {
  const companies: GeneratedHubSpotData["companies"] = [];
  const contacts: GeneratedHubSpotData["contacts"] = [];
  const deals: GeneratedHubSpotData["deals"] = [];

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

  for (const stripeCustomer of stripeCustomers) {
    const segment = stripeCustomer.metadata.segment || "hobby";
    const mrr = stripeCustomer.metadata.monthly_mrr || 0;

    // Generate company
    const companyId = uuidv4();
    const hubspotCompanyId = randomInRange(1000000000, 9999999999).toString();
    const companyName = stripeCustomer.name || "Unknown Company";
    const domain = getDomain(companyName);
    const industry = INDUSTRIES[randomInRange(0, INDUSTRIES.length - 1)];
    const sizeRange = COMPANY_SIZES[segment as keyof typeof COMPANY_SIZES] || COMPANY_SIZES.hobby;
    const employeeCount = randomInRange(sizeRange.min, sizeRange.max);
    const annualRevenue = mrr * 12 * randomInRange(5, 20); // Revenue is 5-20x their shipping spend

    const companyCreatedDate = stripeCustomer.stripeCreated
      ? new Date(stripeCustomer.stripeCreated)
      : randomDate(twoYearsAgo, oneYearAgo);

    companies.push({
      organization_id: organizationId,
      hubspot_id: hubspotCompanyId,
      name: companyName,
      domain,
      industry,
      type: "Customer",
      numberofemployees: employeeCount,
      annualrevenue: annualRevenue,
      country: "Netherlands",
      city: ["Amsterdam", "Rotterdam", "Utrecht", "Den Haag", "Eindhoven"][
        randomInRange(0, 4)
      ],
      website: `https://${domain}`,
      lifecycle_stage: "customer",
      properties: {
        stripe_customer_id: stripeCustomer.stripeId,
        segment,
        mrr,
        tier: stripeCustomer.metadata.tier,
      },
      hubspot_created: companyCreatedDate.toISOString(),
      hubspot_updated: now.toISOString(),
    });

    // Generate 1-3 contacts per company
    const contactCount = segment === "enterprise" ? 3 : segment === "growing" ? 2 : 1;

    for (let i = 0; i < contactCount; i++) {
      const contactId = uuidv4();
      const hubspotContactId = randomInRange(1000000000, 9999999999).toString();
      const firstName = generateFirstName();
      const lastName = generateLastName();
      const email =
        i === 0 && stripeCustomer.email
          ? stripeCustomer.email
          : `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, "")}@${domain}`;

      contacts.push({
        organization_id: organizationId,
        hubspot_id: hubspotContactId,
        email,
        firstname: firstName,
        lastname: lastName,
        phone: `+31 ${randomInRange(10, 99)} ${randomInRange(100, 999)} ${randomInRange(1000, 9999)}`,
        company: companyName,
        jobtitle: generateJobTitle(segment),
        lifecycle_stage: "customer",
        lead_status: "Connected",
        associated_company_id: hubspotCompanyId,
        properties: {
          is_primary: i === 0,
          stripe_customer_id: stripeCustomer.stripeId,
        },
        hubspot_created: companyCreatedDate.toISOString(),
        hubspot_updated: now.toISOString(),
      });
    }

    // Generate historical deal (the won deal that converted them)
    const dealId = uuidv4();
    const hubspotDealId = randomInRange(1000000000, 9999999999).toString();
    const dealCreatedDate = new Date(
      companyCreatedDate.getTime() - randomInRange(7, 30) * 24 * 60 * 60 * 1000
    );
    const dealCloseDate = companyCreatedDate;

    deals.push({
      organization_id: organizationId,
      hubspot_id: hubspotDealId,
      dealname: `${companyName} - MyParcel Subscription`,
      amount: mrr * 12, // Annual value
      dealstage: "closedwon",
      pipeline: "default",
      closedate: dealCloseDate.toISOString(),
      hs_deal_stage_probability: 100,
      deal_currency_code: "EUR",
      associated_company_id: hubspotCompanyId,
      properties: {
        tier: stripeCustomer.metadata.tier,
        segment,
        source: "Website",
      },
      hubspot_created: dealCreatedDate.toISOString(),
      hubspot_updated: dealCloseDate.toISOString(),
    });

    // For some customers, add an upsell deal in progress
    if (segment === "growing" && Math.random() > 0.7) {
      const upsellDealId = uuidv4();
      const upsellHubspotDealId = randomInRange(1000000000, 9999999999).toString();
      const upsellCreatedDate = randomDate(
        new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        now
      );

      deals.push({
        organization_id: organizationId,
        hubspot_id: upsellHubspotDealId,
        dealname: `${companyName} - Tier Upgrade`,
        amount: mrr * 2 * 12, // Double their current spend
        dealstage: DEAL_STAGES[randomInRange(0, 4)], // Active stages
        pipeline: "default",
        closedate: new Date(
          now.getTime() + randomInRange(30, 90) * 24 * 60 * 60 * 1000
        ).toISOString(),
        hs_deal_stage_probability: randomInRange(20, 80),
        deal_currency_code: "EUR",
        associated_company_id: hubspotCompanyId,
        properties: {
          deal_type: "upsell",
          current_tier: stripeCustomer.metadata.tier,
        },
        hubspot_created: upsellCreatedDate.toISOString(),
        hubspot_updated: now.toISOString(),
      });
    }
  }

  return { companies, contacts, deals };
}
