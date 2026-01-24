/**
 * GET /api/analytics/patterns
 * Returns detected behavioral patterns
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const patternType = searchParams.get("type");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Build query
    let query = supabase
      .from("patterns")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("confidence", { ascending: false });

    if (patternType) {
      query = query.eq("pattern_type", patternType);
    }

    const { data: patterns, error } = await query.limit(100);

    if (error) throw error;

    // Define pattern type
    type Pattern = {
      id: string;
      pattern_type: string;
      confidence: number | null;
      name: string;
      description: string | null;
    };

    const typedPatterns = (patterns || []) as Pattern[];

    // Group by type
    const patternsByType: Record<string, Pattern[]> = {};
    for (const pattern of typedPatterns) {
      const type = pattern.pattern_type;
      if (!patternsByType[type]) {
        patternsByType[type] = [];
      }
      patternsByType[type].push(pattern);
    }

    // Count by type
    const typeCounts = Object.fromEntries(
      Object.entries(patternsByType).map(([type, items]) => [type, items.length])
    );

    // Get high-priority patterns (high confidence, actionable)
    const highPriority = typedPatterns
      .filter((p) => (Number(p.confidence) || 0) >= 0.7)
      .slice(0, 10);

    return NextResponse.json({
      patterns: typedPatterns,
      patternsByType,
      typeCounts,
      highPriority,
      totalPatterns: typedPatterns.length,
    });
  } catch (error) {
    console.error("Get patterns error:", error);
    return NextResponse.json(
      { error: "Failed to get pattern data" },
      { status: 500 }
    );
  }
}
