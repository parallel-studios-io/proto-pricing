/**
 * One-time seed script for preset demo data.
 *
 * Calls the existing API endpoints against a running dev server to seed the
 * MyParcel preset into Supabase. After running, the data persists and the
 * generating page can skip real generation for presets.
 *
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. Run this script:  npx tsx scripts/seed-preset.ts
 *
 * Optional env:
 *   BASE_URL  – defaults to http://localhost:3000
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function seedPreset(preset: string) {
  console.log(`\n=== Seeding preset: ${preset} ===\n`);

  // Step 1: Create/update the organization with the preset profile
  console.log("1. Setting up company profile...");
  const setupRes = await fetch(`${BASE_URL}/api/company/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset }),
  });

  const setupData = await setupRes.json();
  if (!setupData.success) {
    throw new Error(`Setup failed: ${setupData.error}`);
  }

  const { organizationId } = setupData;
  console.log(`   Organization: ${organizationId}`);
  console.log(`   Profile: ${setupData.profile?.name || preset}`);

  // If data is already seeded, skip generation
  if (setupData.preSeeded) {
    console.log("   Data already seeded — skipping generation.");
    return;
  }

  // Step 2: Generate synthetic data + enrich with Claude
  console.log("2. Generating data (this takes 1-3 minutes)...");
  const genRes = await fetch(`${BASE_URL}/api/company/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  });

  const genData = await genRes.json();
  if (!genData.success) {
    throw new Error(`Generation failed: ${genData.error}`);
  }

  console.log(`   Status: ${genData.status}`);
  console.log(`   Company: ${genData.companyName}`);
  console.log(`\n=== ${preset} seeded successfully ===\n`);
}

async function main() {
  const preset = process.argv[2] || "myparcel";
  const validPresets = ["myparcel", "devtools"];

  if (!validPresets.includes(preset)) {
    console.error(`Invalid preset: ${preset}. Choose from: ${validPresets.join(", ")}`);
    process.exit(1);
  }

  try {
    await seedPreset(preset);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
