"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { Play, Loader2, CheckCircle, TrendingUp, AlertTriangle, Users, DollarSign, BarChart3, MessageSquare, Brain, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { DEMO_ORGANIZATION_ID } from "@/types/database";
import type {
  PricingOption,
  CouncilEvaluation,
  DetectedSegment,
  UnitEconomics,
  PricingStructure,
} from "@/types/pricing-flow";

interface AnalysisResult {
  summary: {
    totalCustomers: number;
    totalMrr: number;
    totalArr: number;
    nrr: number;
    avgLtv: number;
  };
  segments: DetectedSegment[];
  options: PricingOption[];
  evaluations: CouncilEvaluation[];
  recommendedOption: PricingOption | null;
  economics: UnitEconomics;
  pricingStructure: PricingStructure;
}

const FLOW_STEPS = [
  { id: 1, name: "Loading Ontology", icon: BarChart3 },
  { id: 2, name: "Generating Options", icon: Sparkles },
  { id: 3, name: "Agent Evaluation", icon: Brain },
  { id: 4, name: "Recommendation", icon: Target },
];

export default function AnalysisPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentStep(1);
    setResult(null);

    try {
      // Start the API call immediately
      const responsePromise = fetch("/api/pricing/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: DEMO_ORGANIZATION_ID }),
      });

      // Animate through steps while waiting
      for (let step = 1; step <= FLOW_STEPS.length; step++) {
        setCurrentStep(step);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const response = await responsePromise;
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        if (data.data.recommendedOption) {
          setSelectedOption(data.data.recommendedOption.id);
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    }

    setIsRunning(false);
  };

  // Auto-run on mount
  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAgentColor = (agent: string) => {
    const colors: Record<string, string> = {
      CFO: "bg-blue-500",
      CRO: "bg-green-500",
      CPO: "bg-purple-500",
      CSO: "bg-pink-500",
    };
    return colors[agent] || "bg-gray-500";
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.includes("strongly_support")) return "text-green-400";
    if (rec.includes("support")) return "text-green-300";
    if (rec.includes("oppose")) return "text-red-400";
    if (rec.includes("strongly_oppose")) return "text-red-500";
    return "text-muted";
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Pricing Analysis" subtitle="Generate options and evaluate with agent council" />

      <div className="flex-1 overflow-auto p-6">
        {/* Flow Steps */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pricing Decision Flow</CardTitle>
              <Button onClick={runAnalysis} disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {FLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          currentStep > step.id
                            ? "bg-green-500 text-white"
                            : currentStep === step.id
                            ? "bg-white text-black"
                            : "bg-card border border-border text-muted"
                        }`}
                      >
                        {currentStep > step.id ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : currentStep === step.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span className="text-xs mt-2 text-center max-w-[100px] text-muted">
                        {step.name}
                      </span>
                    </div>
                    {index < FLOW_STEPS.length - 1 && (
                      <div
                        className={`w-16 h-0.5 mx-3 ${
                          currentStep > step.id ? "bg-green-500" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {result && (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    Total MRR
                  </div>
                  <div className="text-2xl font-bold">
                    €{result.summary.totalMrr.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted text-sm mb-1">
                    <Users className="w-4 h-4" />
                    Customers
                  </div>
                  <div className="text-2xl font-bold">
                    {result.summary.totalCustomers.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    NRR
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {result.summary.nrr}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted text-sm mb-1">
                    <BarChart3 className="w-4 h-4" />
                    Avg LTV
                  </div>
                  <div className="text-2xl font-bold">
                    €{result.summary.avgLtv.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted text-sm mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Concentration
                  </div>
                  <div className="text-2xl font-bold text-amber-400">
                    {result.economics.concentration.risk_level}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Segments */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Detected Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {result.segments.map((segment) => (
                    <div
                      key={segment.id}
                      className="p-4 bg-card rounded-lg border border-border"
                    >
                      <h4 className="font-medium mb-2">{segment.name}</h4>
                      <div className="space-y-1 text-sm text-muted">
                        <div className="flex justify-between">
                          <span>Customers</span>
                          <span className="text-white">
                            {segment.customer_count.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Revenue Share</span>
                          <span className="text-white">
                            {(segment.revenue_share * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg LTV</span>
                          <span className="text-white">
                            €{Math.round(segment.avg_ltv).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expansion Rate</span>
                          <span className="text-green-400">
                            +{(segment.expansion_rate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pricing Options */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Generated Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.options.map((option, idx) => {
                    const evaluation = result.evaluations[idx];
                    const isSelected = selectedOption === option.id;
                    const isRecommended = result.recommendedOption?.id === option.id;

                    return (
                      <div
                        key={option.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-white bg-white/5"
                            : "border-border hover:border-white/30"
                        }`}
                        onClick={() => setSelectedOption(option.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">{option.description}</h4>
                            {isRecommended && (
                              <Badge variant="default">Recommended</Badge>
                            )}
                            <Badge
                              variant={
                                option.risk_profile === "low"
                                  ? "default"
                                  : option.risk_profile === "moderate"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {option.risk_profile} risk
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-lg font-bold ${
                                option.impact_model.expected_arr_change > 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {option.impact_model.expected_arr_change > 0 ? "+" : ""}
                              €{option.impact_model.expected_arr_change.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted">
                              {option.impact_model.expected_arr_change_percent > 0 ? "+" : ""}
                              {option.impact_model.expected_arr_change_percent}% ARR
                            </div>
                          </div>
                        </div>

                        {/* Changes */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {option.changes.map((change, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 bg-card rounded border border-border"
                            >
                              {change.target}: {change.from} → {change.to}
                            </span>
                          ))}
                        </div>

                        {/* Council Views */}
                        {evaluation && (
                          <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border">
                            {[
                              evaluation.finance_view,
                              evaluation.growth_view,
                              evaluation.product_view,
                              evaluation.strategy_view,
                            ].map((view) => (
                              <div key={view.agent} className="text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <div
                                    className={`w-6 h-6 rounded-full ${getAgentColor(
                                      view.agent
                                    )} flex items-center justify-center text-xs font-bold text-white`}
                                  >
                                    {view.agent.charAt(0)}
                                  </div>
                                  <span className="font-medium">{view.agent}</span>
                                  <span
                                    className={`text-xs ${getRecommendationColor(
                                      view.recommendation
                                    )}`}
                                  >
                                    {view.recommendation.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <p className="text-xs text-muted line-clamp-2">
                                  {view.key_points[0]}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Recommendation Summary */}
                        {evaluation && isSelected && (
                          <div className="mt-4 p-3 bg-card rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Council Synthesis</span>
                                <Badge
                                  variant={
                                    evaluation.recommendation.consensus === "strong"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {evaluation.recommendation.consensus} consensus
                                </Badge>
                              </div>
                              <Link href={`/analysis/debate?option=${option.id}`}>
                                <Button size="sm" variant="outline" className="gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  View Agent Debate
                                </Button>
                              </Link>
                            </div>
                            <p className="text-sm text-muted">
                              {evaluation.recommendation.summary}
                            </p>
                            {evaluation.recommendation.trade_offs.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-muted">Key trade-offs: </span>
                                <span className="text-xs">
                                  {evaluation.recommendation.trade_offs.join(" • ")}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Concentration Warning */}
            {result.economics.concentration.risk_level !== "low" && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-400 mb-1">
                        Revenue Concentration Risk
                      </h4>
                      <p className="text-sm text-muted">
                        {result.economics.concentration.risk_description}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>
                          Top 10% revenue share:{" "}
                          <strong>
                            {(
                              result.economics.concentration.top_10_percent_revenue_share * 100
                            ).toFixed(0)}
                            %
                          </strong>
                        </span>
                        <span>
                          HHI Index:{" "}
                          <strong>
                            {Math.round(result.economics.concentration.hhi_index)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
