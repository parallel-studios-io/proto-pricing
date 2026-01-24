import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Pattern, OntologyAuditLog, Json } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export async function getPatterns(
  supabase: DbClient,
  organizationId: string,
  options?: { activeOnly?: boolean; patternType?: Pattern["pattern_type"] }
): Promise<Pattern[]> {
  let query = supabase
    .from("patterns")
    .select("*")
    .eq("organization_id", organizationId)
    .order("confidence", { ascending: false });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  if (options?.patternType) {
    query = query.eq("pattern_type", options.patternType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPatternById(
  supabase: DbClient,
  organizationId: string,
  patternId: string
): Promise<Pattern | null> {
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", patternId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function createPattern(
  supabase: DbClient,
  organizationId: string,
  pattern: Omit<Pattern, "id" | "created_at" | "updated_at" | "organization_id">,
  triggeredBy: string = "system"
): Promise<Pattern> {
  const insertData = {
    ...pattern,
    organization_id: organizationId,
  };

  const { data, error } = await supabase
    .from("patterns")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;

  const result = data as Pattern;

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "pattern",
    entity_id: result.id,
    action: "create",
    previous_state: null,
    new_state: result as unknown as Json,
    changed_fields: Object.keys(pattern),
    triggered_by: triggeredBy,
  });

  return result;
}

export async function updatePattern(
  supabase: DbClient,
  organizationId: string,
  patternId: string,
  updates: Partial<Omit<Pattern, "id">>,
  triggeredBy: string = "system",
  reason?: string
): Promise<Pattern> {
  const current = await getPatternById(supabase, organizationId, patternId);
  if (!current) throw new Error("Pattern not found");

  const { data, error } = await supabase
    .from("patterns")
    .update(updates as never)
    .eq("organization_id", organizationId)
    .eq("id", patternId)
    .select()
    .single();

  if (error) throw error;

  const result = data as Pattern;

  const changedFields = Object.keys(updates).filter(
    (key) =>
      JSON.stringify(current[key as keyof Pattern]) !==
      JSON.stringify(updates[key as keyof typeof updates])
  );

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "pattern",
    entity_id: patternId,
    action: "update",
    previous_state: current as unknown as Json,
    new_state: result as unknown as Json,
    changed_fields: changedFields,
    triggered_by: triggeredBy,
    reason,
  });

  return result;
}

export async function upsertPatterns(
  supabase: DbClient,
  patterns: Omit<Pattern, "created_at" | "updated_at">[]
): Promise<Pattern[]> {
  const { data, error } = await supabase
    .from("patterns")
    .upsert(patterns as never[], { onConflict: "id" })
    .select();

  if (error) throw error;
  return (data || []) as Pattern[];
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
