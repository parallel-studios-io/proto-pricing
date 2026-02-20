import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_ORGANIZATION_ID } from "@/types/database";
import type { CompanyProfile } from "@/types/company-profile";

export const maxDuration = 300; // 5 minutes — seeds thousands of records + Claude enrichment

/**
 * POST /api/company/generate
 *
 * Generates synthetic data for an organization based on its stored CompanyProfile.
 * Must be called after /api/company/setup.
 *
 * Body: { organizationId?: string }
 * Returns: { success, stats }
 *
 * Note: The actual generation functions (seedDatabaseFromProfile) are created
 * in Phase 3. This route is wired up as a placeholder and will be completed
 * when the parameterized generators exist.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { organizationId = DEMO_ORGANIZATION_ID } = body;

    const supabase = createAdminClient();

    // Load the company profile from the organization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: org, error: orgError } = await db
      .from("organizations")
      .select("company_profile, setup_status")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    if (!org.company_profile) {
      return NextResponse.json(
        {
          success: false,
          error: "No company profile found. Call /api/company/setup first.",
        },
        { status: 400 }
      );
    }

    const profile = org.company_profile as CompanyProfile;

    // If already generated, return success without re-seeding
    if (org.setup_status === "ready") {
      return NextResponse.json({
        success: true,
        organizationId,
        companyName: profile.name,
        status: "ready",
      });
    }

    // Update status to generating
    await db
      .from("organizations")
      .update({ setup_status: "generating", setup_error: null })
      .eq("id", organizationId);

    try {
      // Seed database using the company profile
      const { seedDatabaseFromProfile } = await import("@/lib/generators/seed-database");
      await seedDatabaseFromProfile(supabase, organizationId, profile, { clearExisting: true });

      // Enrich ontology with Claude (adds business context to segments and patterns)
      const { enrichOntologyWithClaude } = await import("@/lib/services/ontology-enrichment-service");
      await enrichOntologyWithClaude(supabase, organizationId, profile);

      // Update status to ready
      await db
        .from("organizations")
        .update({ setup_status: "ready" })
        .eq("id", organizationId);

      return NextResponse.json({
        success: true,
        organizationId,
        companyName: profile.name,
        status: "ready",
      });
    } catch (genError) {
      // Update status to error
      const errorMsg = genError instanceof Error ? genError.message : "Generation failed";
      await db
        .from("organizations")
        .update({ setup_status: "error", setup_error: errorMsg })
        .eq("id", organizationId);

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Company generate error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate data",
      },
      { status: 500 }
    );
  }
}
