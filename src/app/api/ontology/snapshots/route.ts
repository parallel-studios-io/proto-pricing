import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOntologySnapshots, getOntologySnapshotById } from "@/lib/db/ontology/snapshots";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || DEMO_ORGANIZATION_ID;
    const snapshotId = searchParams.get("snapshotId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const supabase = createAdminClient();

    if (snapshotId) {
      // Get specific snapshot
      const snapshot = await getOntologySnapshotById(supabase, organizationId, snapshotId);
      if (!snapshot) {
        return NextResponse.json(
          { success: false, error: "Snapshot not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, snapshot });
    }

    // List snapshots
    const snapshots = await getOntologySnapshots(supabase, organizationId, { limit });

    return NextResponse.json({ success: true, snapshots });
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
