import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

/**
 * GET /api/company/profile?organizationId=...
 *
 * Returns the stored CompanyProfile for an organization.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId =
      searchParams.get("organizationId") || DEMO_ORGANIZATION_ID;

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org, error } = await (supabase as any)
      .from("organizations")
      .select("id, name, company_profile, setup_status")
      .eq("id", organizationId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!org) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: org.company_profile,
      name: org.name,
      setupStatus: org.setup_status,
    });
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
