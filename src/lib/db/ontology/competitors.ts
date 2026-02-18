import type { SupabaseClient } from "@supabase/supabase-js";
import type { Competitor } from "@/types/database";

type DbClient = SupabaseClient;

// =============================================================================
// COMPETITORS - CRUD operations following existing ontology patterns
// =============================================================================

export async function getCompetitors(
  supabase: DbClient,
  organizationId: string,
  opts?: { activeOnly?: boolean }
): Promise<Competitor[]> {
  let query = supabase
    .from("competitors")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (opts?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch competitors: ${error.message}`);
  return data || [];
}

export async function getCompetitorById(
  supabase: DbClient,
  organizationId: string,
  id: string
): Promise<Competitor | null> {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch competitor: ${error.message}`);
  }
  return data;
}

export async function upsertCompetitors(
  supabase: DbClient,
  competitors: Array<Omit<Competitor, "id" | "created_at" | "updated_at">>
): Promise<Competitor[]> {
  if (competitors.length === 0) return [];

  const { data, error } = await supabase
    .from("competitors")
    .upsert(competitors, { onConflict: "id" })
    .select();

  if (error) throw new Error(`Failed to upsert competitors: ${error.message}`);
  return data || [];
}

export async function deleteCompetitorsByOrg(
  supabase: DbClient,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from("competitors")
    .delete()
    .eq("organization_id", organizationId);

  if (error) throw new Error(`Failed to delete competitors: ${error.message}`);
}
