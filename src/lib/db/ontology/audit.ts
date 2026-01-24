import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OntologyAuditLog } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export async function getAuditLogs(
  supabase: DbClient,
  organizationId: string,
  options?: {
    entityType?: OntologyAuditLog["entity_type"];
    entityId?: string;
    action?: OntologyAuditLog["action"];
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<OntologyAuditLog[]> {
  let query = supabase
    .from("ontology_audit_log")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (options?.entityType) {
    query = query.eq("entity_type", options.entityType);
  }

  if (options?.entityId) {
    query = query.eq("entity_id", options.entityId);
  }

  if (options?.action) {
    query = query.eq("action", options.action);
  }

  if (options?.from) {
    query = query.gte("created_at", options.from);
  }

  if (options?.to) {
    query = query.lte("created_at", options.to);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1
    );
  } else if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEntityHistory(
  supabase: DbClient,
  organizationId: string,
  entityType: OntologyAuditLog["entity_type"],
  entityId: string
): Promise<OntologyAuditLog[]> {
  return getAuditLogs(supabase, organizationId, {
    entityType,
    entityId,
  });
}

export async function getRecentChanges(
  supabase: DbClient,
  organizationId: string,
  options?: { limit?: number; since?: string }
): Promise<OntologyAuditLog[]> {
  return getAuditLogs(supabase, organizationId, {
    from: options?.since,
    limit: options?.limit || 50,
  });
}

export async function getChangesByDecision(
  supabase: DbClient,
  organizationId: string,
  decisionRecordId: string
): Promise<OntologyAuditLog[]> {
  const { data, error } = await supabase
    .from("ontology_audit_log")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("decision_record_id", decisionRecordId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Statistics helpers
export async function getChangeStats(
  supabase: DbClient,
  organizationId: string,
  options?: { from?: string; to?: string }
): Promise<{
  total: number;
  byType: Record<string, number>;
  byAction: Record<string, number>;
}> {
  const logs = await getAuditLogs(supabase, organizationId, {
    from: options?.from,
    to: options?.to,
    limit: 1000, // Get enough for stats
  });

  const byType: Record<string, number> = {};
  const byAction: Record<string, number> = {};

  for (const log of logs) {
    byType[log.entity_type] = (byType[log.entity_type] || 0) + 1;
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  }

  return {
    total: logs.length,
    byType,
    byAction,
  };
}
