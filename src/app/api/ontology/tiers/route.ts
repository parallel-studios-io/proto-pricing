import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPricingTiers } from "@/lib/db/ontology/tiers";
import { createPricingTierWithSnapshot } from "@/lib/services/ontology-service";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || DEMO_ORGANIZATION_ID;
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const supabase = createAdminClient();
    const tiers = await getPricingTiers(supabase, organizationId, { activeOnly });

    return NextResponse.json({ success: true, tiers });
  } catch (error) {
    console.error("Error fetching tiers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId = DEMO_ORGANIZATION_ID,
      tier,
      triggeredBy = "user",
      createSnapshot = true,
    } = body;

    if (!tier || !tier.name || tier.price_monthly === undefined) {
      return NextResponse.json(
        { success: false, error: "Tier name and price_monthly are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current max position
    const existingTiers = await getPricingTiers(supabase, organizationId);
    const maxPosition = Math.max(0, ...existingTiers.map(t => t.position));

    const result = await createPricingTierWithSnapshot(
      supabase,
      organizationId,
      {
        name: tier.name,
        description: tier.description,
        price_monthly: tier.price_monthly,
        price_annual: tier.price_annual,
        annual_discount_percent: tier.annual_discount_percent || 0,
        features: tier.features || [],
        value_metric_limits: tier.value_metric_limits || {},
        customer_count: tier.customer_count || 0,
        total_revenue: tier.total_revenue || 0,
        revenue_share: tier.revenue_share || 0,
        position: tier.position || maxPosition + 1,
        is_active: true,
      },
      { triggeredBy, createSnapshot }
    );

    return NextResponse.json({
      success: true,
      tier: result.tier,
      snapshotId: result.snapshotId,
    });
  } catch (error) {
    console.error("Error creating tier:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
