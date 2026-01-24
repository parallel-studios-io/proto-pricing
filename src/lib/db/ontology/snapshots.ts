import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  OntologySnapshot,
  Segment,
  PricingTier,
  ValueMetric,
  Pattern,
  Ontology,
} from "@/types/database";
import { getSegments } from "./segments";
import { getPricingTiers } from "./tiers";
import { getValueMetrics } from "./value-metrics";
import { getPatterns } from "./patterns";
import { getLatestEconomicsSnapshot } from "./economics";

type DbClient = SupabaseClient<Database>;

export async function getOntologySnapshots(
  supabase: DbClient,
  organizationId: string,
  options?: { limit?: number }
): Promise<OntologySnapshot[]> {
  let query = supabase
    .from("ontology_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("version", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as OntologySnapshot[];
}

export async function getOntologySnapshotById(
  supabase: DbClient,
  organizationId: string,
  snapshotId: string
): Promise<OntologySnapshot | null> {
  const { data, error } = await supabase
    .from("ontology_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", snapshotId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as OntologySnapshot | null;
}

export async function getLatestOntologySnapshot(
  supabase: DbClient,
  organizationId: string
): Promise<OntologySnapshot | null> {
  const { data, error } = await supabase
    .from("ontology_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as OntologySnapshot | null;
}

export async function getNextSnapshotVersion(
  supabase: DbClient,
  organizationId: string
): Promise<number> {
  const latest = await getLatestOntologySnapshot(supabase, organizationId);
  return latest ? latest.version + 1 : 1;
}

export async function createOntologySnapshot(
  supabase: DbClient,
  organizationId: string,
  options?: {
    description?: string;
    triggeredBy?: string;
    triggerDetails?: Record<string, unknown>;
  }
): Promise<OntologySnapshot> {
  // Gather current ontology state
  const [segments, tiers, valueMetrics, patterns, economics] =
    await Promise.all([
      getSegments(supabase, organizationId, { activeOnly: true }),
      getPricingTiers(supabase, organizationId, { activeOnly: true }),
      getValueMetrics(supabase, organizationId, { activeOnly: true }),
      getPatterns(supabase, organizationId, { activeOnly: true }),
      getLatestEconomicsSnapshot(supabase, organizationId),
    ]);

  const version = await getNextSnapshotVersion(supabase, organizationId);

  const insertData = {
    organization_id: organizationId,
    version,
    description: options?.description,
    segments_snapshot: segments,
    tiers_snapshot: tiers,
    economics_snapshot: economics || {},
    patterns_snapshot: patterns,
    value_metrics_snapshot: valueMetrics,
    triggered_by: options?.triggeredBy || "system",
    trigger_details: options?.triggerDetails || {},
  };

  const { data, error } = await supabase
    .from("ontology_snapshots")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;
  return data as OntologySnapshot;
}

// Get current ontology state (not from snapshot, but live data)
export async function getCurrentOntology(
  supabase: DbClient,
  organizationId: string
): Promise<Ontology> {
  const [segments, tiers, valueMetrics, patterns, economics] =
    await Promise.all([
      getSegments(supabase, organizationId, { activeOnly: true }),
      getPricingTiers(supabase, organizationId, { activeOnly: true }),
      getValueMetrics(supabase, organizationId, { activeOnly: true }),
      getPatterns(supabase, organizationId, { activeOnly: true }),
      getLatestEconomicsSnapshot(supabase, organizationId),
    ]);

  return {
    segments,
    tiers,
    valueMetrics,
    patterns,
    economics,
  };
}

// Restore ontology from a snapshot (for rollback/time-travel)
export async function restoreFromSnapshot(
  supabase: DbClient,
  organizationId: string,
  snapshotId: string,
  triggeredBy: string = "system"
): Promise<void> {
  const snapshot = await getOntologySnapshotById(
    supabase,
    organizationId,
    snapshotId
  );
  if (!snapshot) throw new Error("Snapshot not found");

  const segments = snapshot.segments_snapshot as unknown as Segment[];
  const tiers = snapshot.tiers_snapshot as unknown as PricingTier[];
  const valueMetrics = snapshot.value_metrics_snapshot as unknown as ValueMetric[];
  const patterns = snapshot.patterns_snapshot as unknown as Pattern[];

  // Archive all current active items
  await Promise.all([
    supabase
      .from("segments")
      .update({ is_active: false } as never)
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("pricing_tiers")
      .update({ is_active: false } as never)
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("value_metrics")
      .update({ is_active: false } as never)
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("patterns")
      .update({ is_active: false } as never)
      .eq("organization_id", organizationId)
      .eq("is_active", true),
  ]);

  // Re-insert or update from snapshot
  if (segments.length > 0) {
    await supabase.from("segments").upsert(
      segments.map((s) => ({ ...s, is_active: true })) as never[],
      { onConflict: "id" }
    );
  }

  if (tiers.length > 0) {
    await supabase.from("pricing_tiers").upsert(
      tiers.map((t) => ({ ...t, is_active: true })) as never[],
      { onConflict: "id" }
    );
  }

  if (valueMetrics.length > 0) {
    await supabase.from("value_metrics").upsert(
      valueMetrics.map((v) => ({ ...v, is_active: true })) as never[],
      { onConflict: "id" }
    );
  }

  if (patterns.length > 0) {
    await supabase.from("patterns").upsert(
      patterns.map((p) => ({ ...p, is_active: true })) as never[],
      { onConflict: "id" }
    );
  }

  // Create new snapshot to record the restore
  await createOntologySnapshot(supabase, organizationId, {
    description: `Restored from snapshot v${snapshot.version}`,
    triggeredBy,
    triggerDetails: { restored_from_snapshot_id: snapshotId },
  });
}
