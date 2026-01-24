import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuditLogs, getEntityHistory } from "@/lib/db/ontology/audit";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || DEMO_ORGANIZATION_ID;
    const entityType = searchParams.get("entityType") as "segment" | "tier" | "pattern" | "value_metric" | "economics" | undefined;
    const entityId = searchParams.get("entityId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const supabase = createAdminClient();

    if (entityId && entityType) {
      // Get history for specific entity
      const history = await getEntityHistory(
        supabase,
        organizationId,
        entityType,
        entityId
      );
      return NextResponse.json({ success: true, history });
    }

    // Get general audit log
    const log = await getAuditLogs(supabase, organizationId, {
      entityType,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
