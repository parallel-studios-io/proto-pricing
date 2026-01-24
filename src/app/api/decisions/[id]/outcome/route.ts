import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordDecisionOutcome } from "@/lib/services/decision-service";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: decisionId } = await params;
    const body = await request.json();
    const {
      organizationId = DEMO_ORGANIZATION_ID,
      actualArrChange,
      actualChurnChange,
      accuracyScore,
      learnings,
    } = body;

    const supabase = createAdminClient();

    const decision = await recordDecisionOutcome(
      supabase,
      organizationId,
      decisionId,
      {
        actualArrChange,
        actualChurnChange,
        accuracyScore,
        learnings,
      }
    );

    return NextResponse.json({ success: true, decision });
  } catch (error) {
    console.error("Error recording decision outcome:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
