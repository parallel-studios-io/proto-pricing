/**
 * Synthetic HubSpot Data Generator
 * Generates HubSpot-like records modeled on HubSpot API documentation
 * Correlated with Stripe customer data
 */

import { v4 as uuidv4 } from "uuid";
import type { Database } from "@/types/database";
import type { CompanyProfile } from "@/types/company-profile";
import {
  generateFirstName as generateFirstNameForCountry,
  generateLastName as generateLastNameForCountry,
  generateDomain as generateDomainForCountry,
  generateCity as generateCityForCountry,
  generatePhoneNumber as generatePhoneNumberForCountry,
} from "./name-generators";

export interface StripeCustomerRef {
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

export interface GeneratedHubSpotData {
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

// =============================================================================
// PROFILE-DRIVEN GENERATOR
// =============================================================================

/**
 * Derive industry list from a profile description.
 * Falls back to generic B2B industries.
 */
function deriveIndustries(profile: CompanyProfile): string[] {
  const desc = profile.description.toLowerCase();
  const industries: string[] = [];

  if (desc.includes("shipping") || desc.includes("logistics"))
    industries.push("Logistics", "Supply Chain", "Transportation");
  if (desc.includes("e-commerce") || desc.includes("ecommerce") || desc.includes("retail"))
    industries.push("E-commerce", "Retail");
  if (desc.includes("fintech") || desc.includes("finance") || desc.includes("payment"))
    industries.push("Financial Services", "Fintech", "Banking");
  if (desc.includes("health") || desc.includes("medical"))
    industries.push("Healthcare", "Medical Devices");
  if (desc.includes("developer") || desc.includes("devtool") || desc.includes("api"))
    industries.push("Technology", "Developer Tools", "Software");
  if (desc.includes("marketing") || desc.includes("advertising"))
    industries.push("Marketing", "Advertising", "Media");
  if (desc.includes("education") || desc.includes("learning"))
    industries.push("Education", "EdTech");

  // Always add generic B2B industries
  industries.push(
    "Manufacturing",
    "Professional Services",
    "Consulting",
    "Wholesale"
  );

  return industries;
}

/**
 * Generate HubSpot-like data from a CompanyProfile.
 * The original generateHubSpotData() above is preserved for backward compatibility.
 */
export function generateHubSpotDataFromProfile(
  organizationId: string,
  stripeCustomers: StripeCustomerRef[],
  profile: CompanyProfile
): GeneratedHubSpotData {
  const companies: GeneratedHubSpotData["companies"] = [];
  const contacts: GeneratedHubSpotData["contacts"] = [];
  const deals: GeneratedHubSpotData["deals"] = [];

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

  const industries = deriveIndustries(profile);
  const dealCurrency = profile.currency;

  // Build segment-aware company size ranges
  const segmentSizeMap: Record<string, { min: number; max: number }> = {};
  for (const seg of profile.segments) {
    const sizeRanges: Record<string, { min: number; max: number }> = {
      enterprise: { min: 100, max: 5000 },
      mid_market: { min: 50, max: 500 },
      smb: { min: 5, max: 50 },
      startup: { min: 1, max: 10 },
    };
    segmentSizeMap[seg.name] = sizeRanges[seg.company_size] || { min: 1, max: 50 };
  }

  for (const stripeCustomer of stripeCustomers) {
    const segment = stripeCustomer.metadata.segment || "";
    const mrr = stripeCustomer.metadata.monthly_mrr || 0;

    // Find matching segment profile for size info
    const segProfile = profile.segments.find((s) => s.name === segment);
    const sizeRange = segmentSizeMap[segment] || { min: 1, max: 50 };

    // Generate company
    const companyId = uuidv4();
    const hubspotCompanyId = randomInRange(1000000000, 9999999999).toString();
    const companyName = stripeCustomer.name || "Unknown Company";
    const domain = generateDomainForCountry(companyName, profile.country);
    const industry = industries[randomInRange(0, industries.length - 1)];
    const employeeCount = randomInRange(sizeRange.min, sizeRange.max);
    const annualRevenue = mrr * 12 * randomInRange(5, 20);

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
      country: profile.country,
      city: generateCityForCountry(profile.country),
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

    // Generate 1-3 contacts per company (more for larger segments)
    const companySize = segProfile?.company_size || "smb";
    const contactCount =
      companySize === "enterprise"
        ? 3
        : companySize === "mid_market"
          ? 2
          : 1;

    for (let i = 0; i < contactCount; i++) {
      const contactId = uuidv4();
      const hubspotContactId = randomInRange(1000000000, 9999999999).toString();
      const firstName = generateFirstNameForCountry(profile.country);
      const lastName = generateLastNameForCountry(profile.country);
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
        phone: generatePhoneNumberForCountry(profile.country),
        company: companyName,
        jobtitle: generateJobTitle(companySize),
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

    // Generate historical deal (won deal)
    const dealId = uuidv4();
    const hubspotDealId = randomInRange(1000000000, 9999999999).toString();
    const dealCreatedDate = new Date(
      companyCreatedDate.getTime() -
        randomInRange(7, 30) * 24 * 60 * 60 * 1000
    );
    const dealCloseDate = companyCreatedDate;

    deals.push({
      organization_id: organizationId,
      hubspot_id: hubspotDealId,
      dealname: `${companyName} - ${profile.name} Subscription`,
      amount: mrr * 12,
      dealstage: "closedwon",
      pipeline: "default",
      closedate: dealCloseDate.toISOString(),
      hs_deal_stage_probability: 100,
      deal_currency_code: dealCurrency,
      associated_company_id: hubspotCompanyId,
      properties: {
        tier: stripeCustomer.metadata.tier,
        segment,
        source: "Website",
      },
      hubspot_created: dealCreatedDate.toISOString(),
      hubspot_updated: dealCloseDate.toISOString(),
    });

    // For growing/mid-value segments, add an upsell deal in progress
    const isGrowthSegment =
      segProfile &&
      segProfile.expansion_rate > 0.1 &&
      segProfile.company_size !== "startup";
    if (isGrowthSegment && Math.random() > 0.7) {
      const upsellHubspotDealId = randomInRange(
        1000000000,
        9999999999
      ).toString();
      const upsellCreatedDate = randomDate(
        new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        now
      );

      deals.push({
        organization_id: organizationId,
        hubspot_id: upsellHubspotDealId,
        dealname: `${companyName} - Tier Upgrade`,
        amount: mrr * 2 * 12,
        dealstage:
          DEAL_STAGES[randomInRange(0, DEAL_STAGES.length - 2)], // Active stages only
        pipeline: "default",
        closedate: new Date(
          now.getTime() + randomInRange(30, 90) * 24 * 60 * 60 * 1000
        ).toISOString(),
        hs_deal_stage_probability: randomInRange(20, 80),
        deal_currency_code: dealCurrency,
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
