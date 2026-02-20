"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import type { PricingOption, CouncilEvaluation, AgentView } from "@/types/pricing-flow";
import {
  ArrowLeft,
  MessageSquare,
  RotateCcw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

// Mock data - in real implementation, this would come from context or API
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
    impact: { revenue: "+€180K ARR", margin: "+2-3%", risk: "moderate" },
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

function AgentCard({ view }: { view: AgentView }) {
  const getAgentColor = (agent: string) => {
    const colors: Record<string, string> = {
      CFO: "bg-blue-500",
      CRO: "bg-green-500",
      CPO: "bg-purple-500",
      CSO: "bg-pink-500",
    };
    return colors[agent] || "bg-gray-500";
  };

  const getRecommendationIcon = (rec: string) => {
    if (rec.includes("strongly_support")) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (rec.includes("support")) return <CheckCircle className="w-4 h-4 text-green-300" />;
    if (rec.includes("oppose")) return <XCircle className="w-4 h-4 text-red-400" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  };

  const getRecommendationLabel = (rec: string) => {
    return rec.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-full ${getAgentColor(view.agent)} flex items-center justify-center text-sm font-bold text-white`}
          >
            {view.agent}
          </div>
          <div className="flex-1">
            <div className="font-medium">{view.agent}</div>
            <div className="flex items-center gap-1 text-sm text-muted">
              {getRecommendationIcon(view.recommendation)}
              {getRecommendationLabel(view.recommendation)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Confidence</div>
            <div className="font-medium">{Math.round(view.confidence * 100)}%</div>
          </div>
        </div>
        <p className="text-sm text-secondary mb-3">{view.reasoning}</p>
        <div className="space-y-1">
          {view.key_points.slice(0, 2).map((point, i) => (
            <div key={i} className="text-xs text-muted flex items-start gap-2">
              <span className="text-accent">•</span>
              {point}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const optionId = searchParams.get("option");

  const [option, setOption] = useState<PricingOption | null>(null);
  const [evaluation, setEvaluation] = useState<CouncilEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, we'd fetch from context or API
    setOption(MOCK_OPTION);
    setEvaluation(MOCK_EVALUATION);
    setIsLoading(false);
  }, [optionId]);

  const handleStressTest = () => {
    // Navigate to chat with recommendation context
    router.push("/chat?context=recommendation");
  };

  const handleStartOver = () => {
    router.push("/demo");
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Recommendation" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  if (!option || !evaluation) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Recommendation" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-secondary mb-4">No recommendation available.</p>
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
      <Header title="Final Recommendation" subtitle="Council-approved pricing strategy" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Hero Section */}
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge className="mb-2">Recommended</Badge>
                  <h2 className="text-2xl font-bold mb-2">{option.description}</h2>
                  <p className="text-secondary max-w-2xl">
                    {evaluation.recommendation.summary}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      evaluation.recommendation.consensus === "strong"
                        ? "default"
                        : "secondary"
                    }
                    className="mb-2"
                  >
                    {evaluation.recommendation.consensus} consensus
                  </Badge>
                  <div className="text-sm text-muted">
                    Confidence: {Math.round(option.impact_model.confidence * 100)}%
                  </div>
                </div>
              </div>

              {/* Changes */}
              <div className="flex flex-wrap gap-2 mb-4">
                {option.changes.map((change, i) => (
                  <span
                    key={i}
                    className="text-sm px-3 py-1 bg-card rounded-full border border-border"
                  >
                    {change.target}: {change.from} → {change.to}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Impact Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Expected ARR Impact
                </div>
                <div className="text-2xl font-bold text-green-400">
                  +€{option.impact_model.expected_arr_change.toLocaleString()}
                </div>
                <div className="text-xs text-muted mt-1">
                  +{option.impact_model.expected_arr_change_percent}% annual
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted text-sm mb-1">
                  <Users className="w-4 h-4" />
                  Churn Impact
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  +{Math.round(option.impact_model.expected_churn_increase * 100)}%
                </div>
                <div className="text-xs text-muted mt-1">
                  In affected segment only
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  Time to Impact
                </div>
                <div className="text-2xl font-bold">
                  {option.impact_model.time_to_full_impact_months} months
                </div>
                <div className="text-xs text-muted mt-1">
                  Full impact realized
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted text-sm mb-1">
                  <Target className="w-4 h-4" />
                  Implementation
                </div>
                <div className="text-2xl font-bold capitalize">
                  {option.complexity}
                </div>
                <div className="text-xs text-muted mt-1">
                  {option.risk_profile} risk
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Impact Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projected Impact Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-12 bg-card rounded-lg">
                {/* Range bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-red-500/30 via-accent/50 to-green-500/30 rounded-full"
                  style={{
                    left: "10%",
                    width: "80%",
                  }}
                />
                {/* Pessimistic */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: "10%" }}
                >
                  <div className="w-3 h-3 rounded-full bg-red-400 border-2 border-background" />
                  <div className="absolute top-6 text-xs text-muted whitespace-nowrap">
                    €{option.impact_model.pessimistic_arr_change.toLocaleString()}
                  </div>
                </div>
                {/* Expected */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: "50%" }}
                >
                  <div className="w-4 h-4 rounded-full bg-accent border-2 border-background" />
                  <div className="absolute top-6 text-xs font-medium whitespace-nowrap">
                    €{option.impact_model.expected_arr_change.toLocaleString()} (expected)
                  </div>
                </div>
                {/* Optimistic */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: "90%" }}
                >
                  <div className="w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
                  <div className="absolute top-6 text-xs text-muted whitespace-nowrap">
                    €{option.impact_model.optimistic_arr_change.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Perspectives */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Agent Perspectives</h3>
            <div className="grid grid-cols-2 gap-4">
              <AgentCard view={evaluation.finance_view} />
              <AgentCard view={evaluation.growth_view} />
              <AgentCard view={evaluation.product_view} />
              <AgentCard view={evaluation.strategy_view} />
            </div>
          </div>

          {/* Trade-offs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Key Trade-offs to Consider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {evaluation.recommendation.trade_offs.map((tradeoff, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-secondary">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {tradeoff}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reasoning Chain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Council Reasoning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {evaluation.recommendation.reasoning_chain.map((reason, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="text-secondary pt-0.5">{reason}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border p-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link
            href="/analysis/debate"
            className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Debate
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleStartOver} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Start Over
            </Button>
            <Button onClick={handleStressTest} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Stress Test This
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecommendPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col">
          <Header title="Recommendation" />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted" />
          </div>
        </div>
      }
    >
      <RecommendContent />
    </Suspense>
  );
}
