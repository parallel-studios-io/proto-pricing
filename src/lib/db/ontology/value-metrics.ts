import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ValueMetric, OntologyAuditLog, Json } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export async function getValueMetrics(
  supabase: DbClient,
  organizationId: string,
  options?: { activeOnly?: boolean }
): Promise<ValueMetric[]> {
  let query = supabase
    .from("value_metrics")
    .select("*")
    .eq("organization_id", organizationId)
    .order("metric_type", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ValueMetric[];
}

export async function getValueMetricById(
  supabase: DbClient,
  organizationId: string,
  metricId: string
): Promise<ValueMetric | null> {
  const { data, error } = await supabase
    .from("value_metrics")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", metricId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as ValueMetric | null;
}

export async function createValueMetric(
  supabase: DbClient,
  organizationId: string,
  metric: Omit<ValueMetric, "id" | "created_at" | "updated_at" | "organization_id">,
  triggeredBy: string = "system"
): Promise<ValueMetric> {
  const insertData = {
    ...metric,
    organization_id: organizationId,
  };

  const { data, error } = await supabase
    .from("value_metrics")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;

  const result = data as ValueMetric;

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "value_metric",
    entity_id: result.id,
    action: "create",
    previous_state: null,
    new_state: result as unknown as Json,
    changed_fields: Object.keys(metric),
    triggered_by: triggeredBy,
  });

  return result;
}

export async function updateValueMetric(
  supabase: DbClient,
  organizationId: string,
  metricId: string,
  updates: Partial<Omit<ValueMetric, "id">>,
  triggeredBy: string = "system",
  reason?: string
): Promise<ValueMetric> {
  const current = await getValueMetricById(supabase, organizationId, metricId);
  if (!current) throw new Error("Value metric not found");

  const { data, error } = await supabase
    .from("value_metrics")
    .update(updates as never)
    .eq("organization_id", organizationId)
    .eq("id", metricId)
    .select()
    .single();

  if (error) throw error;

  const result = data as ValueMetric;

  const changedFields = Object.keys(updates).filter(
    (key) =>
      JSON.stringify(current[key as keyof ValueMetric]) !==
      JSON.stringify(updates[key as keyof typeof updates])
  );

  await createAuditLog(supabase, {
    organization_id: organizationId,
    entity_type: "value_metric",
    entity_id: metricId,
    action: "update",
    previous_state: current as unknown as Json,
    new_state: result as unknown as Json,
    changed_fields: changedFields,
    triggered_by: triggeredBy,
    reason,
  });

  return result;
}

export async function upsertValueMetrics(
  supabase: DbClient,
  metrics: Omit<ValueMetric, "created_at" | "updated_at">[]
): Promise<ValueMetric[]> {
  const { data, error } = await supabase
    .from("value_metrics")
    .upsert(metrics as never[], { onConflict: "id" })
    .select();

  if (error) throw error;
  return (data || []) as ValueMetric[];
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
