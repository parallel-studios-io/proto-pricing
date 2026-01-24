/**
 * Decision Service
 * Records decisions with ontology snapshots for full audit trail
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  DecisionRecord,
  PricingOption,
  OntologySnapshot,
} from "@/types/database";
import { createOntologySnapshot } from "@/lib/db/ontology/snapshots";

type DbClient = SupabaseClient<Database>;

interface CreateDecisionOptions {
  question: string;
  context?: Record<string, unknown>;
  optionsConsidered: string[];
  chosenOptionId?: string;
  reasoning: string;
  decidedBy?: string;
  decisionConfidence?: number;
}

interface RecordOutcomeOptions {
  actualArrChange?: number;
  actualChurnChange?: number;
  accuracyScore?: number;
  learnings?: string[];
}

/**
 * Create a decision record with an automatic ontology snapshot
 */
export async function createDecisionRecord(
  supabase: DbClient,
  organizationId: string,
  options: CreateDecisionOptions
): Promise<{ decision: DecisionRecord; snapshot: OntologySnapshot }> {
  // Create ontology snapshot first
  const snapshot = await createOntologySnapshot(supabase, organizationId, {
    description: `Decision snapshot: ${options.question.slice(0, 50)}...`,
    triggeredBy: options.decidedBy || "system",
    triggerDetails: {
      action: "decision",
      question: options.question,
    },
  });

  // Create decision record
  const { data: decision, error } = await supabase
    .from("decision_records")
    .insert({
      organization_id: organizationId,
      question: options.question,
      context: options.context || {},
      options_considered: options.optionsConsidered,
      chosen_option_id: options.chosenOptionId,
      reasoning: options.reasoning,
      ontology_snapshot_id: snapshot.id,
      decided_by: options.decidedBy || "system",
      decision_confidence: options.decisionConfidence,
      learnings: [],
    } as never)
    .select()
    .single();

  if (error) throw error;
  return { decision: decision as DecisionRecord, snapshot };
}

/**
 * Record the outcome of a decision (for learning/feedback)
 */
export async function recordDecisionOutcome(
  supabase: DbClient,
  organizationId: string,
  decisionId: string,
  outcome: RecordOutcomeOptions
): Promise<DecisionRecord> {
  const { data, error } = await supabase
    .from("decision_records")
    .update({
      outcome_measured_at: new Date().toISOString(),
      actual_arr_change: outcome.actualArrChange,
      actual_churn_change: outcome.actualChurnChange,
      accuracy_score: outcome.accuracyScore,
      learnings: outcome.learnings || [],
    } as never)
    .eq("organization_id", organizationId)
    .eq("id", decisionId)
    .select()
    .single();

  if (error) throw error;
  return data as DecisionRecord;
}

/**
 * Get decision records for an organization
 */
export async function getDecisionRecords(
  supabase: DbClient,
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeOutcomes?: boolean;
  }
): Promise<DecisionRecord[]> {
  let query = supabase
    .from("decision_records")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (options?.includeOutcomes === false) {
    query = query.is("outcome_measured_at", null);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DecisionRecord[];
}

/**
 * Get a decision with its associated snapshot
 */
export async function getDecisionWithContext(
  supabase: DbClient,
  organizationId: string,
  decisionId: string
): Promise<{
  decision: DecisionRecord;
  snapshot: OntologySnapshot;
  chosenOption?: PricingOption;
} | null> {
  const { data: decision, error: decisionError } = await supabase
    .from("decision_records")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", decisionId)
    .single();

  if (decisionError || !decision) return null;
  const decisionRecord = decision as DecisionRecord;

  const { data: snapshot, error: snapshotError } = await supabase
    .from("ontology_snapshots")
    .select("*")
    .eq("id", decisionRecord.ontology_snapshot_id)
    .single();

  if (snapshotError || !snapshot) return null;
  const snapshotRecord = snapshot as OntologySnapshot;

  let chosenOption: PricingOption | undefined;
  if (decisionRecord.chosen_option_id) {
    const { data: option } = await supabase
      .from("pricing_options")
      .select("*")
      .eq("id", decisionRecord.chosen_option_id)
      .single();
    chosenOption = option ? (option as unknown as PricingOption) : undefined;
  }

  return { decision: decisionRecord, snapshot: snapshotRecord, chosenOption };
}

/**
 * Create a pricing option
 */
export async function createPricingOption(
  supabase: DbClient,
  organizationId: string,
  option: Omit<
    Database["public"]["Tables"]["pricing_options"]["Insert"],
    "organization_id"
  >
): Promise<PricingOption> {
  const { data, error } = await supabase
    .from("pricing_options")
    .insert({
      ...option,
      organization_id: organizationId,
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as PricingOption;
}

/**
 * Update pricing option status
 */
export async function updatePricingOptionStatus(
  supabase: DbClient,
  organizationId: string,
  optionId: string,
  status: PricingOption["status"]
): Promise<PricingOption> {
  const { data, error } = await supabase
    .from("pricing_options")
    .update({ status } as never)
    .eq("organization_id", organizationId)
    .eq("id", optionId)
    .select()
    .single();

  if (error) throw error;
  return data as PricingOption;
}

/**
 * Get pricing options for an organization
 */
export async function getPricingOptions(
  supabase: DbClient,
  organizationId: string,
  options?: {
    status?: PricingOption["status"];
    limit?: number;
  }
): Promise<PricingOption[]> {
  let query = supabase
    .from("pricing_options")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PricingOption[];
}

/**
 * Calculate decision accuracy over time
 */
export async function getDecisionAccuracyStats(
  supabase: DbClient,
  organizationId: string
): Promise<{
  totalDecisions: number;
  measuredDecisions: number;
  avgAccuracy: number | null;
  avgArrImpact: number | null;
}> {
  const { data } = await supabase
    .from("decision_records")
    .select("accuracy_score, actual_arr_change, outcome_measured_at")
    .eq("organization_id", organizationId);

  const decisions = (data || []) as { accuracy_score: number | null; actual_arr_change: number | null; outcome_measured_at: string | null }[];

  if (decisions.length === 0) {
    return {
      totalDecisions: 0,
      measuredDecisions: 0,
      avgAccuracy: null,
      avgArrImpact: null,
    };
  }

  const measured = decisions.filter((d) => d.outcome_measured_at);
  const withAccuracy = measured.filter((d) => d.accuracy_score != null);
  const withArr = measured.filter((d) => d.actual_arr_change != null);

  return {
    totalDecisions: decisions.length,
    measuredDecisions: measured.length,
    avgAccuracy:
      withAccuracy.length > 0
        ? withAccuracy.reduce((sum, d) => sum + (d.accuracy_score || 0), 0) /
          withAccuracy.length
        : null,
    avgArrImpact:
      withArr.length > 0
        ? withArr.reduce((sum, d) => sum + (d.actual_arr_change || 0), 0) /
          withArr.length
        : null,
  };
}
