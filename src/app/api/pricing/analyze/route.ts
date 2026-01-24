import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchRealPricingData } from "@/lib/pricing/real-data-adapter";
import {
  generatePricingOptions,
  evaluateWithCouncil,
} from "@/lib/pricing/flow-engine";
import { generateMyParcelData } from "@/lib/generators/myparcel";
import type { PricingOption, CouncilEvaluation } from "@/types/pricing-flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId = "myparcel-demo", useRealData = true } = body;

    let segments;
    let economics;
    let pricingStructure;
    let summary;

    if (useRealData) {
      // Try to fetch real data from Supabase
      const supabase = await createServerSupabaseClient();
      const realData = await fetchRealPricingData(supabase, organizationId);

      if (realData && realData.segments.length > 0) {
        console.log("Using real Supabase data for pricing analysis");
        segments = realData.segments;
        economics = realData.economics;
        pricingStructure = realData.pricingStructure;
        summary = realData.summary;
      } else {
        console.log("No real data available, falling back to synthetic data");
        const syntheticData = generateMyParcelData();
        segments = syntheticData.segments;
        economics = syntheticData.economics;
        pricingStructure = syntheticData.pricingStructure;
        summary = syntheticData.summary;
      }
    } else {
      // Use synthetic data
      console.log("Using synthetic data for pricing analysis");
      const syntheticData = generateMyParcelData();
      segments = syntheticData.segments;
      economics = syntheticData.economics;
      pricingStructure = syntheticData.pricingStructure;
      summary = syntheticData.summary;
    }

    // Generate pricing options based on the data
    const options: PricingOption[] = generatePricingOptions(
      segments,
      economics,
      pricingStructure
    );

    // Evaluate each option with the council
    const evaluations: CouncilEvaluation[] = options.map((option) =>
      evaluateWithCouncil(option, segments, economics)
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
  // Return a quick summary without full analysis
  try {
    const supabase = await createServerSupabaseClient();
    const realData = await fetchRealPricingData(supabase, "myparcel-demo");

    if (realData) {
      return NextResponse.json({
        success: true,
        data: {
          summary: realData.summary,
          segmentCount: realData.segments.length,
          optionCount: 4, // We generate 4 options
          usingRealData: true,
        },
      });
    }

    // Fallback to synthetic
    const syntheticData = generateMyParcelData();
    return NextResponse.json({
      success: true,
      data: {
        summary: syntheticData.summary,
        segmentCount: syntheticData.segments.length,
        optionCount: 4,
        usingRealData: false,
      },
    });
  } catch (error) {
    console.error("Pricing summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get pricing summary" },
      { status: 500 }
    );
  }
}
