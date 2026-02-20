"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import { AgentDebatePanel } from "@/components/debate";
import type { PricingOption, CouncilEvaluation } from "@/types/pricing-flow";
import type { DebateSummary } from "@/types/demo";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

// Mock data for when coming directly to the page
const MOCK_OPTION: PricingOption = {
  id: "platform_minimum",
  type: "minimum",
  description: "Introduce €4.95/month platform minimum fee for all accounts",
  changes: [
    { type: "minimum", target: "Free tier", from: "€0/month", to: "€4.95/month minimum", description: "New platform minimum" },
    { type: "minimum", target: "Low-usage accounts", from: "Pay per use only", to: "Minimum + usage", description: "Minimum applies" },
  ],
  impact_model: {
    expected_arr_change: 180000,
    expected_arr_change_percent: 1.6,
    optimistic_arr_change: 240000,
    pessimistic_arr_change: 120000,
    expected_churn_increase: 0.25,
    time_to_full_impact_months: 3,
    confidence: 0.78,
  },
  risk_profile: "moderate",
  complexity: "low",
};

const MOCK_EVALUATION: CouncilEvaluation = {
  option_id: "platform_minimum",
  finance_view: {
    agent: "CFO",
    reasoning: "This option addresses our fundamental unit economics problem. The bottom 50% of customers generate only 1.5% of revenue while consuming support and infrastructure resources. A platform minimum ensures every account contributes to fixed costs.",
    key_points: [
      "Improves overall margin by reducing unprofitable accounts",
      "Creates predictable baseline revenue regardless of usage",
      "May trigger exodus of non-serious users, reducing support burden",
    ],
    recommendation: "strongly_support",
    impact: { revenue: "+180K ARR", margin: "+2-3%", risk: "moderate" },
    confidence: 0.85,
  },
  growth_view: {
    agent: "CRO",
    reasoning: "While I support the business rationale, we need to be careful about customer reaction. The accounts most affected are those who rarely use the platform. Many may simply leave rather than pay.",
    key_points: [
      "Expect 25% churn in affected segment (Hobby/Dormant)",
      "These customers rarely convert to paid anyway",
      "Simplifies sales motion - no more supporting free riders",
    ],
    recommendation: "support",
    impact: { churn: "+25% in affected segment", cac: "improved", ltv: "no change" },
    confidence: 0.72,
  },
  product_view: {
    agent: "CPO",
    reasoning: "From a product perspective, this aligns price more closely with platform value. Users get access to our carrier network, tracking dashboard, and integrations - that has inherent value beyond per-label pricing.",
    key_points: [
      "Aligns with platform value proposition",
      "Creates clearer upgrade path: platform access → higher volume tiers",
      "Need to clearly communicate value to justify fee",
    ],
    recommendation: "support",
    impact: { nps: "slight decrease short-term", adoption: "cleaner funnel" },
    confidence: 0.78,
  },
  strategy_view: {
    agent: "CSO",
    reasoning: "Strategically, this positions us as a premium platform rather than a commodity. It also naturally filters out accounts that don't fit our ideal customer profile, sharpening our focus on webshops and enterprises.",
    key_points: [
      "Competitors like Sendcloud already have platform fees",
      "Focuses resources on customers with real growth potential",
      "Creates foundation for future tiered platform pricing",
    ],
    recommendation: "strongly_support",
    impact: { positioning: "more premium", focus: "improved" },
    confidence: 0.82,
  },
  recommendation: {
    option_id: "platform_minimum",
    consensus: "strong",
    reasoning_chain: [
      "Finance and Strategy strongly support due to unit economics and positioning",
      "Growth and Product support with caveats about communication",
    ],
    trade_offs: [
      "Short-term churn vs long-term profitability",
      "Revenue growth vs customer count",
    ],
    summary: "The council recommends implementing the platform minimum. While it will cause some churn in the low-value segment, the financial and strategic benefits outweigh the risks. Key success factor is clear value communication.",
  },
};

function DebateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const optionId = searchParams.get("option");

  const [option, setOption] = useState<PricingOption | null>(null);
  const [evaluation, setEvaluation] = useState<CouncilEvaluation | null>(null);
  const [debateSummary, setDebateSummary] = useState<DebateSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, we'd fetch the option and evaluation from state or API
    // For demo, we use mock data
    setOption(MOCK_OPTION);
    setEvaluation(MOCK_EVALUATION);
    setIsLoading(false);
  }, [optionId]);

  const handleDebateComplete = (summary: DebateSummary) => {
    setDebateSummary(summary);
  };

  const handleViewRecommendation = () => {
    router.push("/analysis/recommend");
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Agent Council Debate" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  if (!option || !evaluation) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Agent Council Debate" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-secondary mb-4">No option selected for debate.</p>
            <Link href="/analysis" className="text-accent hover:underline">
              Return to Analysis
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Agent Council Debate"
        subtitle={`Evaluating: ${option.description}`}
      />

      <div className="flex-1 overflow-hidden p-6">
        <AgentDebatePanel
          option={option}
          evaluation={evaluation}
          onComplete={handleDebateComplete}
        />
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border p-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Options
          </Link>

          {debateSummary && (
            <button
              onClick={handleViewRecommendation}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2 font-medium text-white hover:bg-accent/90 transition-colors"
            >
              View Recommendation
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DebatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col">
          <Header title="Agent Council Debate" />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted" />
          </div>
        </div>
      }
    >
      <DebateContent />
    </Suspense>
  );
}
