/**
 * GET /api/analytics/health
 * Returns customer health scores and distribution
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const customerId = searchParams.get("customerId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // If specific customer requested
    if (customerId) {
      const { data: healthScore, error } = await supabase
        .from("customer_health_scores")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("customer_id", customerId)
        .order("score_date", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Health score not found" },
          { status: 404 }
        );
      }

      // Get historical scores for trend
      const { data: history } = await supabase
        .from("customer_health_scores")
        .select("score_date, health_score")
        .eq("organization_id", organizationId)
        .eq("customer_id", customerId)
        .order("score_date", { ascending: false })
        .limit(30);

      return NextResponse.json({
        current: healthScore,
        history: history || [],
      });
    }

    // Get all health scores for today
    const today = new Date().toISOString().split("T")[0];

    const { data: healthScores, error } = await supabase
      .from("customer_health_scores")
      .select(`
        *,
        customer:unified_customers(id, name, mrr, segment_id)
      `)
      .eq("organization_id", organizationId)
      .eq("score_date", today);

    if (error) throw error;

    // Define type for health scores with customer join
    type HealthScoreWithCustomer = {
      health_score: number | null;
      trend: string | null;
      churn_risk: number | null;
      upgrade_readiness: number | null;
      customer: { id: string; name: string; mrr: number; segment_id: string | null } | null;
    };

    // Calculate distribution
    const scores = (healthScores || []) as HealthScoreWithCustomer[];
    const distribution = {
      healthy: scores.filter((s) => (Number(s.health_score) || 0) >= 70).length,
      atRisk: scores.filter(
        (s) => (Number(s.health_score) || 0) >= 40 && (Number(s.health_score) || 0) < 70
      ).length,
      critical: scores.filter((s) => (Number(s.health_score) || 0) < 40).length,
    };

    // Calculate trend breakdown
    const trendBreakdown = {
      improving: scores.filter((s) => s.trend === "improving").length,
      stable: scores.filter((s) => s.trend === "stable").length,
      declining: scores.filter((s) => s.trend === "declining").length,
    };

    // Get at-risk customers
    const atRiskCustomers = scores
      .filter((s) => (Number(s.churn_risk) || 0) >= 0.5)
      .sort((a, b) => (Number(b.churn_risk) || 0) - (Number(a.churn_risk) || 0))
      .slice(0, 10);

    // Get upgrade candidates
    const upgradeCandidates = scores
      .filter((s) => (Number(s.upgrade_readiness) || 0) >= 0.5)
      .sort(
        (a, b) => (Number(b.upgrade_readiness) || 0) - (Number(a.upgrade_readiness) || 0)
      )
      .slice(0, 10);

    const avgHealthScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + (Number(s.health_score) || 0), 0) / scores.length
        : 0;

    return NextResponse.json({
      scoreDate: today,
      totalCustomers: scores.length,
      avgHealthScore,
      distribution,
      trendBreakdown,
      atRiskCustomers,
      upgradeCandidates,
    });
  } catch (error) {
    console.error("Get health scores error:", error);
    return NextResponse.json(
      { error: "Failed to get health score data" },
      { status: 500 }
    );
  }
}
