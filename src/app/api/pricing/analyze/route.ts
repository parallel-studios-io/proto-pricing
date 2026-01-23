import { NextResponse } from "next/server";
import { runFullPricingFlow } from "@/lib/pricing/flow-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId = "myparcel-demo" } = body;

    const result = await runFullPricingFlow(organizationId);

    return NextResponse.json({
      success: true,
      data: {
        summary: result.data.summary,
        segments: result.data.segments,
        options: result.options,
        evaluations: result.evaluations,
        recommendedOption: result.recommendedOption,
        pricingStructure: result.data.pricingStructure,
        economics: result.data.economics,
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
    const result = await runFullPricingFlow("myparcel-demo");

    return NextResponse.json({
      success: true,
      data: {
        summary: result.data.summary,
        segmentCount: result.data.segments.length,
        optionCount: result.options.length,
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
