"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Loader2,
  Swords,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useSetup } from "@/contexts/SetupContext";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

interface ReviewSegment {
  id: string;
  name: string;
  description: string;
  customer_count: number;
  avg_mrr: number;
  churn_rate: number;
  revenue_share: number;
}

interface ReviewEconomics {
  snapshot: {
    total_mrr: number;
    total_arr: number;
    total_customers: number;
    net_revenue_retention: number;
    concentration_risk_level: string;
  } | null;
}

interface ReviewPattern {
  id: string;
  name: string;
  pattern_type: string;
  description: string;
  confidence: number;
}

interface CompanyProfile {
  name: string;
  competitors?: Array<{
    name: string;
    positioning?: string;
    pricing_model?: string;
  }>;
  market_context?: {
    market_category?: string;
    tam_estimate?: string;
    growth_rate?: string;
    key_trends?: string[];
  };
}

export default function SetupReviewPage() {
  const router = useRouter();
  const setup = useSetup();
  const orgId = setup.organizationId || DEMO_ORGANIZATION_ID;

  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<ReviewSegment[]>([]);
  const [economics, setEconomics] = useState<ReviewEconomics | null>(null);
  const [patterns, setPatterns] = useState<ReviewPattern[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [segRes, econRes, patRes, profileRes] = await Promise.all([
        fetch(`/api/analytics/segments?organizationId=${orgId}`),
        fetch(`/api/analytics/economics?organizationId=${orgId}`),
        fetch(`/api/analytics/patterns?organizationId=${orgId}`),
        fetch(`/api/company/profile?organizationId=${orgId}`),
      ]);

      const [segData, econData, patData, profileData] = await Promise.all([
        segRes.json(),
        econRes.json(),
        patRes.json(),
        profileRes.json().catch(() => null),
      ]);

      setSegments(segData.segments || []);
      setEconomics(econData);
      setPatterns(patData.patterns || []);

      // Extract company profile for competitors and market context
      if (profileData?.profile) {
        setProfile(profileData.profile);
      }
    } catch (error) {
      console.error("Failed to load review data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleEnterProduct() {
    setup.completeStep("review");
    try {
      sessionStorage.setItem("proto-setup-complete", "true");
    } catch {}
    router.push("/chat");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your ontology...</p>
        </div>
      </div>
    );
  }

  const snapshot = economics?.snapshot;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Your Business Ontology
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Here&apos;s what we built from your data. Review the key metrics,
            segments, and competitive landscape before entering the product.
          </p>
        </div>

        {/* Key Metrics */}
        {snapshot && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Total MRR"
              value={`\u20AC${(snapshot.total_mrr || 0).toLocaleString()}`}
            />
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Customers"
              value={(snapshot.total_customers || 0).toLocaleString()}
            />
            <MetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Segments"
              value={String(segments.length)}
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="NRR"
              value={`${(snapshot.net_revenue_retention || 0).toFixed(0)}%`}
            />
          </div>
        )}

        {/* Customer Segments */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            <Users className="h-4 w-4" />
            Customer Segments
          </h2>
          <div className="grid gap-3">
            {segments.map((seg) => (
              <div
                key={seg.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{seg.name}</h3>
                    {seg.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {seg.description}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {seg.customer_count} customers
                  </span>
                </div>
                <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
                  <span>
                    Avg MRR:{" "}
                    <span className="text-foreground">
                      \u20AC{(seg.avg_mrr || 0).toFixed(0)}
                    </span>
                  </span>
                  <span>
                    Churn:{" "}
                    <span className="text-foreground">
                      {((seg.churn_rate || 0) * 100).toFixed(1)}%
                    </span>
                  </span>
                  <span>
                    Revenue share:{" "}
                    <span className="text-foreground">
                      {((seg.revenue_share || 0) * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>
              </div>
            ))}
            {segments.length === 0 && (
              <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No segments generated yet.
              </div>
            )}
          </div>
        </div>

        {/* Competitors */}
        {profile?.competitors && profile.competitors.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <Swords className="h-4 w-4" />
              Competitors
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.competitors.map((comp, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="font-medium text-foreground">{comp.name}</h3>
                  {comp.positioning && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {comp.positioning}
                    </p>
                  )}
                  {comp.pricing_model && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pricing: {comp.pricing_model}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Patterns */}
        {patterns.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <Target className="h-4 w-4" />
              Key Patterns Detected
            </h2>
            <div className="space-y-2">
              {patterns.slice(0, 5).map((pattern) => (
                <div
                  key={pattern.id}
                  className="flex items-start justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {pattern.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {pattern.description}
                    </p>
                  </div>
                  <span className="ml-3 flex-shrink-0 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                    {((pattern.confidence || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Context */}
        {profile?.market_context?.market_category && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              Market Context
            </h2>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium text-foreground">
                  {profile.market_context.market_category}
                </p>
              </div>
              {profile.market_context.tam_estimate && (
                <div>
                  <p className="text-muted-foreground">TAM</p>
                  <p className="font-medium text-foreground">
                    {profile.market_context.tam_estimate}
                  </p>
                </div>
              )}
              {profile.market_context.growth_rate && (
                <div>
                  <p className="text-muted-foreground">Growth Rate</p>
                  <p className="font-medium text-foreground">
                    {profile.market_context.growth_rate}
                  </p>
                </div>
              )}
            </div>
            {profile.market_context.key_trends &&
              profile.market_context.key_trends.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Key Trends
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.market_context.key_trends.map((trend, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground"
                      >
                        {trend}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Enter product button */}
        <div className="flex justify-center pb-8 pt-4">
          <button
            onClick={handleEnterProduct}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Enter Proto
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card sub-component
// ---------------------------------------------------------------------------

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
