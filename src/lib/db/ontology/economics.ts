import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, EconomicsSnapshot, UnifiedCustomer } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export async function getEconomicsSnapshots(
  supabase: DbClient,
  organizationId: string,
  options?: { limit?: number; from?: string; to?: string }
): Promise<EconomicsSnapshot[]> {
  let query = supabase
    .from("economics_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("snapshot_date", { ascending: false });

  if (options?.from) {
    query = query.gte("snapshot_date", options.from);
  }

  if (options?.to) {
    query = query.lte("snapshot_date", options.to);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getLatestEconomicsSnapshot(
  supabase: DbClient,
  organizationId: string
): Promise<EconomicsSnapshot | null> {
  const { data, error } = await supabase
    .from("economics_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getEconomicsSnapshotByDate(
  supabase: DbClient,
  organizationId: string,
  date: string
): Promise<EconomicsSnapshot | null> {
  const { data, error } = await supabase
    .from("economics_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("snapshot_date", date)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function createEconomicsSnapshot(
  supabase: DbClient,
  organizationId: string,
  snapshot: Omit<EconomicsSnapshot, "id" | "created_at" | "organization_id">
): Promise<EconomicsSnapshot> {
  const insertData = {
    ...snapshot,
    organization_id: organizationId,
  };

  // Use type assertion due to Supabase generic type complexity
  const { data, error } = await supabase
    .from("economics_snapshots")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw error;
  return data as EconomicsSnapshot;
}

// For seeding
export async function upsertEconomicsSnapshots(
  supabase: DbClient,
  snapshots: Omit<EconomicsSnapshot, "id" | "created_at">[]
): Promise<EconomicsSnapshot[]> {
  // Use type assertion due to Supabase generic type complexity
  const { data, error } = await supabase
    .from("economics_snapshots")
    .upsert(snapshots as never[], { onConflict: "id" })
    .select();

  if (error) throw error;
  return (data || []) as EconomicsSnapshot[];
}

// Calculate and create a new economics snapshot from current data
export async function computeAndSaveEconomicsSnapshot(
  supabase: DbClient,
  organizationId: string
): Promise<EconomicsSnapshot> {
  // Get all active customers
  const { data: customers, error: customersError } = await supabase
    .from("unified_customers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (customersError) throw customersError;

  const customerList = (customers || []) as UnifiedCustomer[];
  const totalCustomers = customerList.length;
  const totalMrr = customerList.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const totalArr = totalMrr * 12;

  // Calculate concentration metrics
  const sortedByMrr = [...customerList].sort(
    (a, b) => (b.mrr || 0) - (a.mrr || 0)
  );
  const top10PctCount = Math.max(1, Math.ceil(totalCustomers * 0.1));
  const top10PctRevenue = sortedByMrr
    .slice(0, top10PctCount)
    .reduce((sum, c) => sum + (c.mrr || 0), 0);
  const top10PctRevenueShare = totalMrr > 0 ? top10PctRevenue / totalMrr : 0;

  const topCustomerRevenue = sortedByMrr[0]?.mrr || 0;
  const topCustomerRevenueShare =
    totalMrr > 0 ? topCustomerRevenue / totalMrr : 0;

  // Calculate HHI (Herfindahl-Hirschman Index)
  const hhiIndex =
    totalMrr > 0
      ? customerList.reduce((sum, c) => {
          const share = (c.mrr || 0) / totalMrr;
          return sum + share * share * 10000;
        }, 0)
      : 0;

  // Determine concentration risk level
  let concentrationRiskLevel: EconomicsSnapshot["concentration_risk_level"] =
    "low";
  let concentrationDescription = "Healthy revenue distribution";

  if (hhiIndex > 2500 || topCustomerRevenueShare > 0.25) {
    concentrationRiskLevel = "critical";
    concentrationDescription =
      "Critical concentration - top customer(s) represent significant revenue risk";
  } else if (hhiIndex > 1500 || topCustomerRevenueShare > 0.15) {
    concentrationRiskLevel = "high";
    concentrationDescription =
      "High concentration - revenue heavily dependent on top customers";
  } else if (hhiIndex > 1000 || topCustomerRevenueShare > 0.1) {
    concentrationRiskLevel = "moderate";
    concentrationDescription =
      "Moderate concentration - some dependency on top customers";
  }

  // Get segment economics
  const { data: segments } = await supabase
    .from("segments")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  const segmentList = (segments || []) as { id: string; name: string }[];

  const segmentEconomics = await Promise.all(
    segmentList.map(async (segment) => {
      const segmentCustomers = customerList.filter(
        (c) => c.segment_id === segment.id
      );
      const segmentMrr = segmentCustomers.reduce(
        (sum, c) => sum + (c.mrr || 0),
        0
      );
      const segmentCount = segmentCustomers.length;

      return {
        segment_id: segment.id,
        mrr: segmentMrr,
        arpu: segmentCount > 0 ? segmentMrr / segmentCount : 0,
        ltv:
          segmentCustomers.reduce((sum, c) => sum + (c.ltv || 0), 0) /
          Math.max(segmentCount, 1),
        churn_rate: 0.02, // Placeholder - would need historical data
        expansion_rate: 0.05, // Placeholder
      };
    })
  );

  return createEconomicsSnapshot(supabase, organizationId, {
    snapshot_date: new Date().toISOString().split("T")[0],
    total_mrr: totalMrr,
    total_arr: totalArr,
    total_customers: totalCustomers,
    top_10_pct_revenue_share: top10PctRevenueShare,
    top_customer_revenue_share: topCustomerRevenueShare,
    hhi_index: hhiIndex,
    concentration_risk_level: concentrationRiskLevel,
    concentration_description: concentrationDescription,
    segment_economics: segmentEconomics,
    price_sensitivity_model: {},
  });
}
