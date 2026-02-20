/**
 * GET /api/analytics/segments
 * Returns segment analysis for an organization
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

    // Get segments with their data
    const { data: segments, error } = await supabase
      .from("segments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("total_revenue", { ascending: false });

    if (error) throw error;

    // Get RFM distribution
    const { data: rfmScores } = await supabase
      .from("customer_rfm_scores")
      .select("rfm_segment")
      .eq("organization_id", organizationId);

    // Type assertions for RFM scores
    type RFMScore = { rfm_segment: string | null };
    const typedRfmScores = (rfmScores || []) as RFMScore[];

    const rfmDistribution: Record<string, number> = {};
    for (const score of typedRfmScores) {
      const segment = score.rfm_segment || "unknown";
      rfmDistribution[segment] = (rfmDistribution[segment] || 0) + 1;
    }

    // Get customer counts per segment
    const { data: customers } = await supabase
      .from("unified_customers")
      .select("segment_id")
      .eq("organization_id", organizationId)
      .eq("status", "active");

    // Type assertion for customers
    type CustomerSegment = { segment_id: string | null };
    const typedCustomers = (customers || []) as CustomerSegment[];

    const customersBySegment: Record<string, number> = {};
    for (const customer of typedCustomers) {
      if (customer.segment_id) {
        customersBySegment[customer.segment_id] =
          (customersBySegment[customer.segment_id] || 0) + 1;
      }
    }

    // Type assertion for segments
    type Segment = { id: string; name: string; total_revenue: number | null };
    const typedSegments = (segments || []) as Segment[];

    // Enrich segments with live customer counts
    const enrichedSegments = typedSegments.map((segment) => ({
      ...segment,
      liveCustomerCount: customersBySegment[segment.id] || 0,
    }));

    return NextResponse.json({
      segments: enrichedSegments,
      rfmDistribution,
      totalCustomers: typedCustomers.length,
    });
  } catch (error) {
    console.error("Get segments error:", error);
    return NextResponse.json(
      { error: "Failed to get segment data" },
      { status: 500 }
    );
  }
}
