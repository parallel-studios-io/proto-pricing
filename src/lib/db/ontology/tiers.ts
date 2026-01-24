import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PricingTier, OntologyAuditLog, Json } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export async function getPricingTiers(
  supabase: DbClient,
  organizationId: string,
  options?: { activeOnly?: boolean }
): Promise<PricingTier[]> {
  let query = supabase
    .from("pricing_tiers")
    .select("*")
    .eq("organization_id", organizationId)
    .order("position", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PricingTier[];
}

export async function getPricingTierById(
  supabase: DbClient,
  organizationId: string,
  tierId: string
): Promise<PricingTier | null> {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", tierId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as PricingTier | null;
}

export async function createPricingTier(
  supabase: DbClient,
  organizationId: string,
  tier: Omit<PricingTier, "id" | "created_at" | "updated_at" | "organization_id">,
  triggeredBy: string = "system"
): Promise<PricingTier> {
  const insertData = {
    ...tier,
    organization_id: organizationId,
  };

  const { data, error } = await supabase
    .from("pricing_tiers")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;

  const result = data as PricingTier;

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "tier",
    entity_id: result.id,
    action: "create",
    previous_state: null,
    new_state: result as unknown as Json,
    changed_fields: Object.keys(tier),
    triggered_by: triggeredBy,
  });

  return result;
}

export async function updatePricingTier(
  supabase: DbClient,
  organizationId: string,
  tierId: string,
  updates: Partial<Omit<PricingTier, "id">>,
  triggeredBy: string = "system",
  reason?: string
): Promise<PricingTier> {
  const current = await getPricingTierById(supabase, organizationId, tierId);
  if (!current) throw new Error("Pricing tier not found");

  const { data, error } = await supabase
    .from("pricing_tiers")
    .update(updates as never)
    .eq("organization_id", organizationId)
    .eq("id", tierId)
    .select()
    .single();

  if (error) throw error;

  const result = data as PricingTier;

  const changedFields = Object.keys(updates).filter(
    (key) =>
      JSON.stringify(current[key as keyof PricingTier]) !==
      JSON.stringify(updates[key as keyof typeof updates])
  );

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "tier",
    entity_id: tierId,
    action: "update",
    previous_state: current as unknown as Json,
    new_state: result as unknown as Json,
    changed_fields: changedFields,
    triggered_by: triggeredBy,
    reason,
  });

  return result;
}

export async function archivePricingTier(
  supabase: DbClient,
  organizationId: string,
  tierId: string,
  triggeredBy: string = "system",
  reason?: string
): Promise<void> {
  const current = await getPricingTierById(supabase, organizationId, tierId);
  if (!current) throw new Error("Pricing tier not found");

  const { error } = await supabase
    .from("pricing_tiers")
    .update({ is_active: false } as never)
    .eq("organization_id", organizationId)
    .eq("id", tierId);

  if (error) throw error;

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "tier",
    entity_id: tierId,
    action: "archive",
    previous_state: current as unknown as Json,
    new_state: { ...current, is_active: false } as unknown as Json,
    changed_fields: ["is_active"],
    triggered_by: triggeredBy,
    reason,
  });
}

export async function deletePricingTier(
  supabase: DbClient,
  organizationId: string,
  tierId: string,
  triggeredBy: string = "system",
  reason?: string
): Promise<void> {
  const current = await getPricingTierById(supabase, organizationId, tierId);
  if (!current) throw new Error("Pricing tier not found");

  const { error } = await supabase
    .from("pricing_tiers")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", tierId);

  if (error) throw error;

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "tier",
    entity_id: tierId,
    action: "delete",
    previous_state: current as unknown as Json,
    new_state: null,
    changed_fields: [],
    triggered_by: triggeredBy,
    reason,
  });
}

// Bulk operations for seeding
export async function upsertPricingTiers(
  supabase: DbClient,
  tiers: Omit<PricingTier, "created_at" | "updated_at">[]
): Promise<PricingTier[]> {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .upsert(tiers as never[], { onConflict: "organization_id,name" })
    .select();

  if (error) throw error;
  return (data || []) as PricingTier[];
}

async function createAuditLog(
  supabase: DbClient,
  log: Omit<OntologyAuditLog, "id" | "created_at">
): Promise<void> {
  const { error } = await supabase.from("ontology_audit_log").insert(log as never);
  if (error) {
    console.error("Failed to create audit log:", error);
  }
}
