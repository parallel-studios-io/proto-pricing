import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDecisionRecord, getDecisionRecords } from "@/lib/services/decision-service";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || DEMO_ORGANIZATION_ID;
    const includeOutcomes = searchParams.get("includeOutcomes") !== "false";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const supabase = createAdminClient();
    const decisions = await getDecisionRecords(supabase, organizationId, {
      includeOutcomes,
      limit,
    });

    return NextResponse.json({ success: true, decisions });
  } catch (error) {
    console.error("Error fetching decisions:", error);
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
      question,
      context,
      optionsConsidered = [],
      chosenOptionId,
      reasoning,
      decidedBy = "user",
      decisionConfidence,
    } = body;

    if (!question || !reasoning) {
      return NextResponse.json(
        { success: false, error: "question and reasoning are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const result = await createDecisionRecord(supabase, organizationId, {
      question,
      context,
      optionsConsidered,
      chosenOptionId,
      reasoning,
      decidedBy,
      decisionConfidence,
    });

    return NextResponse.json({
      success: true,
      decision: result.decision,
      snapshot: result.snapshot,
    });
  } catch (error) {
    console.error("Error creating decision:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
