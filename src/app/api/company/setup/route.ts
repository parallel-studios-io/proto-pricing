import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateCompanyProfile,
  enrichWithMarketResearch,
} from "@/lib/services/company-setup-service";
import { getPreset } from "@/lib/generators/presets";
import { DEMO_ORGANIZATION_ID } from "@/types/database";
import type { PresetId, CompanyProfile } from "@/types/company-profile";

export const maxDuration = 300; // 5 minutes — Claude profile generation + market research

/**
 * POST /api/company/setup
 *
 * Creates or updates an organization with a CompanyProfile.
 * Either loads a preset or generates a profile from a description using Claude.
 *
 * Body: { description?: string, preset?: "myparcel" | "devtools", organizationId?: string }
 * Returns: { organizationId, profile, status }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      description,
      preset,
      organizationId = DEMO_ORGANIZATION_ID,
    } = body;

    if (!description && !preset) {
      return NextResponse.json(
        {
          success: false,
          error: "Either 'description' or 'preset' is required",
        },
        { status: 400 }
      );
    }

    let profile: CompanyProfile;

    if (preset) {
      // Load from preset
      const presetDef = getPreset(preset as PresetId);
      if (!presetDef) {
        return NextResponse.json(
          { success: false, error: `Unknown preset: ${preset}` },
          { status: 400 }
        );
      }
      profile = presetDef.profile;
    } else {
      // Generate from description using Claude
      console.log("Generating company profile from description...");
      profile = await generateCompanyProfile(description);

      // Enrich with market research
      console.log("Enriching with market research...");
      profile = await enrichWithMarketResearch(profile);
    }

    // Store the profile on the organization
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("organizations")
      .upsert(
        {
          id: organizationId,
          name: profile.name,
          slug: profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          settings: {},
          company_profile: JSON.parse(JSON.stringify(profile)),
          setup_status: "generating",
        },
        { onConflict: "id" }
      );

    if (updateError) {
      console.error("Failed to save organization:", updateError);
      return NextResponse.json(
        { success: false, error: `Failed to save profile: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      organizationId,
      profile,
      status: "generating",
    });
  } catch (error) {
    console.error("Company setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set up company",
      },
      { status: 500 }
    );
  }
}
