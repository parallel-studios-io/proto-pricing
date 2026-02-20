/**
 * GET /api/analytics/economics
 * Returns economics data for an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Get latest economics snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("economics_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    // Get cohort retention data
    const { data: cohortData } = await supabase
      .from("cohort_retention_data")
      .select("*")
      .eq("organization_id", organizationId)
      .order("cohort_month", { ascending: false })
      .order("month_offset", { ascending: true });

    // Get MRR by segment
    const { data: customersData } = await supabase
      .from("unified_customers")
      .select("segment_id, mrr")
      .eq("organization_id", organizationId)
      .eq("status", "active");

    const { data: segmentsData } = await supabase
      .from("segments")
      .select("id, name")
      .eq("organization_id", organizationId);

    const customers = (customersData || []) as Array<{ segment_id: string | null; mrr: number }>;
    const segments = (segmentsData || []) as Array<{ id: string; name: string }>;
    const segmentMap = new Map(segments.map((s) => [s.id, s.name]));

    const mrrBySegment: Record<string, { mrr: number; count: number }> = {};
    for (const customer of customers) {
      const segmentName = customer.segment_id
        ? segmentMap.get(customer.segment_id) || "Unknown"
        : "Unknown";

      if (!mrrBySegment[segmentName]) {
        mrrBySegment[segmentName] = { mrr: 0, count: 0 };
      }

      mrrBySegment[segmentName].mrr += Number(customer.mrr) || 0;
      mrrBySegment[segmentName].count++;
    }

    return NextResponse.json({
      snapshot: snapshot || null,
      cohortRetention: cohortData || [],
      mrrBySegment,
    });
  } catch (error) {
    console.error("Get economics error:", error);
    return NextResponse.json(
      { error: "Failed to get economics data" },
      { status: 500 }
    );
  }
}
