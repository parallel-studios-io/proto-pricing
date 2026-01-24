import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOntology, getOntologySummary } from "@/lib/services/ontology-service";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || DEMO_ORGANIZATION_ID;
    const summaryOnly = searchParams.get("summary") === "true";

    const supabase = createAdminClient();

    if (summaryOnly) {
      const summary = await getOntologySummary(supabase, organizationId);
      return NextResponse.json({ success: true, summary });
    }

    const ontology = await getOntology(supabase, organizationId);
    return NextResponse.json({ success: true, ontology });
  } catch (error) {
    console.error("Error fetching ontology:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
