import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPricingDataFromOntology } from "@/lib/pricing/ontology-to-flow";
import {
  generatePricingOptions,
  evaluateWithCouncil,
} from "@/lib/pricing/flow-engine";
import { DEMO_ORGANIZATION_ID } from "@/types/database";
import type { PricingOption, CouncilEvaluation } from "@/types/pricing-flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId = DEMO_ORGANIZATION_ID } = body;

    const supabase = createAdminClient();
    const data = await loadPricingDataFromOntology(supabase, organizationId);

    if (!data || data.segments.length === 0) {
      return NextResponse.json(
        { success: false, error: "No company data found. Please set up a company first via /api/company/setup." },
        { status: 400 }
      );
    }

    const { segments, economics, pricingStructure, competitiveContext, summary } = data;

    // Generate pricing options with competitive context
    const options: PricingOption[] = generatePricingOptions(
      segments,
      economics,
      pricingStructure,
      competitiveContext
    );

    // Evaluate each option with the council (with competitive context)
    const evaluations: CouncilEvaluation[] = options.map((option) =>
      evaluateWithCouncil(option, segments, economics, competitiveContext)
    );

    // Find recommended option (highest consensus with positive score)
    const scoredOptions = evaluations.map((e, i) => ({
      evaluation: e,
      option: options[i],
      score:
        e.recommendation.consensus === "strong"
          ? 4
          : e.recommendation.consensus === "moderate"
          ? 3
          : e.recommendation.consensus === "weak"
          ? 1
          : 0,
    }));

    scoredOptions.sort((a, b) => b.score - a.score);
    const recommendedOption = scoredOptions[0]?.option || null;

    return NextResponse.json({
      success: true,
      data: {
        summary,
        segments,
        options,
        evaluations,
        recommendedOption,
        pricingStructure,
        economics,
        competitiveContext,
      },
    });
  } catch (error) {
    console.error("Pricing analysis error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run pricing analysis" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const data = await loadPricingDataFromOntology(supabase, DEMO_ORGANIZATION_ID);

    if (data && data.segments.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: data.summary,
          segmentCount: data.segments.length,
          optionCount: 4,
          competitorCount: data.competitiveContext.competitors.length,
          usingRealData: true,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: "No company data found. Please set up a company first.",
    }, { status: 400 });
  } catch (error) {
    console.error("Pricing summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get pricing summary" },
      { status: 500 }
    );
  }
}
