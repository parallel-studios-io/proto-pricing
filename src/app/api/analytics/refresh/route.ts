/**
 * POST /api/analytics/refresh
 * Triggers a full analytics refresh for an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFullAnalytics } from "@/lib/analytics";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Verify organization exists
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Run full analytics
    const result = await runFullAnalytics(supabase, organizationId);

    return NextResponse.json({
      success: true,
      summary: result.summary,
      stats: {
        customersAnalyzed: result.health.scores.length,
        segmentsIdentified: result.segmentation.segments.length,
        patternsDetected:
          result.patterns.upgrades.candidates.length +
          result.patterns.churnRisk.atRiskCustomers.length,
      },
    });
  } catch (error) {
    console.error("Analytics refresh error:", error);
    return NextResponse.json(
      {
        error: "Failed to refresh analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

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

    // Get latest analytics run
    const { data } = await supabase
      .from("analytics_run_log")
      .select("*")
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return NextResponse.json({
        lastRun: null,
        status: "never_run",
        summary: null,
      });
    }

    // Type assertion for analytics run log
    const runLog = data as {
      started_at: string;
      status: string;
      completed_at: string | null;
      current_step: string | null;
      completed_steps: number | null;
      total_steps: number | null;
      result_summary: Record<string, unknown> | null;
    };

    return NextResponse.json({
      lastRun: runLog.started_at,
      status: runLog.status,
      completedAt: runLog.completed_at,
      progress: {
        currentStep: runLog.current_step,
        completedSteps: runLog.completed_steps,
        totalSteps: runLog.total_steps,
      },
      summary: runLog.result_summary,
    });
  } catch (error) {
    console.error("Get analytics status error:", error);
    return NextResponse.json(
      { error: "Failed to get analytics status" },
      { status: 500 }
    );
  }
}
