import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Segment, OntologyAuditLog, Json } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export async function getSegments(
  supabase: DbClient,
  organizationId: string,
  options?: { activeOnly?: boolean }
): Promise<Segment[]> {
  let query = supabase
    .from("segments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("customer_count", { ascending: false });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Segment[];
}

export async function getSegmentById(
  supabase: DbClient,
  organizationId: string,
  segmentId: string
): Promise<Segment | null> {
  const { data, error } = await supabase
    .from("segments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", segmentId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as Segment | null;
}

export async function createSegment(
  supabase: DbClient,
  organizationId: string,
  segment: Omit<Segment, "id" | "created_at" | "updated_at" | "organization_id">,
  triggeredBy: string = "system"
): Promise<Segment> {
  const insertData = {
    ...segment,
    organization_id: organizationId,
  };

  const { data, error } = await supabase
    .from("segments")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;

  const result = data as Segment;

  // Create audit log entry
  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "segment",
    entity_id: result.id,
    action: "create",
    previous_state: null,
    new_state: result as unknown as Json,
    changed_fields: Object.keys(segment),
    triggered_by: triggeredBy,
  });

  return result;
}

export async function updateSegment(
  supabase: DbClient,
  organizationId: string,
  segmentId: string,
  updates: Partial<Omit<Segment, "id">>,
  triggeredBy: string = "system",
  reason?: string
): Promise<Segment> {
  // Get current state for audit
  const current = await getSegmentById(supabase, organizationId, segmentId);
  if (!current) throw new Error("Segment not found");

  const { data, error } = await supabase
    .from("segments")
    .update(updates as never)
    .eq("organization_id", organizationId)
    .eq("id", segmentId)
    .select()
    .single();

  if (error) throw error;

  const result = data as Segment;

  // Determine changed fields
  const changedFields = Object.keys(updates).filter(
    (key) =>
      JSON.stringify(current[key as keyof Segment]) !==
      JSON.stringify(updates[key as keyof typeof updates])
  );

  // Create audit log entry
  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "segment",
    entity_id: segmentId,
    action: "update",
    previous_state: current as unknown as Json,
    new_state: result as unknown as Json,
    changed_fields: changedFields,
    triggered_by: triggeredBy,
    reason,
  });

  return result;
}

export async function archiveSegment(
  supabase: DbClient,
  organizationId: string,
  segmentId: string,
  triggeredBy: string = "system",
  reason?: string
): Promise<void> {
  const current = await getSegmentById(supabase, organizationId, segmentId);
  if (!current) throw new Error("Segment not found");

  const { error } = await supabase
    .from("segments")
    .update({ is_active: false } as never)
    .eq("organization_id", organizationId)
    .eq("id", segmentId);

  if (error) throw error;

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "segment",
    entity_id: segmentId,
    action: "archive",
    previous_state: current as unknown as Json,
    new_state: { ...current, is_active: false } as unknown as Json,
    changed_fields: ["is_active"],
    triggered_by: triggeredBy,
    reason,
  });
}

export async function deleteSegment(
  supabase: DbClient,
  organizationId: string,
  segmentId: string,
  triggeredBy: string = "system",
  reason?: string
): Promise<void> {
  const current = await getSegmentById(supabase, organizationId, segmentId);
  if (!current) throw new Error("Segment not found");

  const { error } = await supabase
    .from("segments")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", segmentId);

  if (error) throw error;

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "segment",
    entity_id: segmentId,
    action: "delete",
    previous_state: current as unknown as Json,
    new_state: null,
    changed_fields: [],
    triggered_by: triggeredBy,
    reason,
  });
}

// Bulk operations for seeding
export async function upsertSegments(
  supabase: DbClient,
  segments: Omit<Segment, "created_at" | "updated_at">[]
): Promise<Segment[]> {
  const { data, error } = await supabase
    .from("segments")
    .upsert(segments as never[], { onConflict: "id" })
    .select();

  if (error) throw error;
  return (data || []) as Segment[];
}

// Helper for audit log
async function createAuditLog(
  supabase: DbClient,
  log: Omit<OntologyAuditLog, "id" | "created_at">
): Promise<void> {
  const { error } = await supabase.from("ontology_audit_log").insert(log as never);
  if (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit failures shouldn't break main operations
  }
}
