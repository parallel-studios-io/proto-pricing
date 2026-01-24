import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedDatabase } from "@/lib/generators/seed-database";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

// Allow seeding in development or with a secret key in production
const isDev = process.env.NODE_ENV === "development";
const SEED_SECRET = process.env.SEED_SECRET;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { secret } = body;

  // Allow in dev mode, or in production with correct secret
  const isAuthorized = isDev || (SEED_SECRET && secret === SEED_SECRET);

  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: "Seeding requires authorization. Set SEED_SECRET env var and pass it in the request." },
      { status: 403 }
    );
  }

  try {
    const {
      organizationId = DEMO_ORGANIZATION_ID,
      clearExisting = true,
    } = body;

    console.log(`Starting database seed for organization: ${organizationId}`);
    console.log(`Clear existing data: ${clearExisting}`);

    const supabase = createAdminClient();

    const result = await seedDatabase(supabase, organizationId, {
      clearExisting,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, stats: result.stats },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      stats: result.stats,
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return info about the seed endpoint
  return NextResponse.json({
    endpoint: "/api/seed",
    method: "POST",
    description: "Seeds the database with synthetic MyParcel-like data",
    availableInProduction: false,
    currentEnvironment: process.env.NODE_ENV,
    parameters: {
      organizationId: {
        type: "string",
        default: DEMO_ORGANIZATION_ID,
        description: "Organization to seed data for",
      },
      clearExisting: {
        type: "boolean",
        default: true,
        description: "Whether to clear existing data before seeding",
      },
    },
  });
}
