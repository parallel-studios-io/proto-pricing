import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSegments } from "@/lib/db/ontology/segments";
import { createSegmentWithSnapshot } from "@/lib/services/ontology-service";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || DEMO_ORGANIZATION_ID;
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const supabase = createAdminClient();
    const segments = await getSegments(supabase, organizationId, { activeOnly });

    return NextResponse.json({ success: true, segments });
  } catch (error) {
    console.error("Error fetching segments:", error);
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
      segment,
      triggeredBy = "user",
      createSnapshot = true,
    } = body;

    if (!segment || !segment.name) {
      return NextResponse.json(
        { success: false, error: "Segment name is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const result = await createSegmentWithSnapshot(
      supabase,
      organizationId,
      {
        name: segment.name,
        description: segment.description,
        criteria: segment.criteria || {},
        customer_count: segment.customer_count || 0,
        total_revenue: segment.total_revenue || 0,
        revenue_share: segment.revenue_share || 0,
        avg_mrr: segment.avg_mrr || 0,
        avg_ltv: segment.avg_ltv || 0,
        median_ltv: segment.median_ltv || 0,
        retention_rate: segment.retention_rate || 0,
        churn_rate: segment.churn_rate || 0,
        expansion_rate: segment.expansion_rate || 0,
        retention_curve: segment.retention_curve || [],
        value_drivers: segment.value_drivers || [],
        is_system_generated: false,
        is_active: true,
      },
      { triggeredBy, createSnapshot }
    );

    return NextResponse.json({
      success: true,
      segment: result.segment,
      snapshotId: result.snapshotId,
    });
  } catch (error) {
    console.error("Error creating segment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
