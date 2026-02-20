"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/contexts/DemoContext";
import { InsightCard } from "@/components/demo/InsightCard";
import { HealthDistribution } from "@/components/demo/HealthDistribution";
import {
  ArrowRight,
  Users,
  DollarSign,
  Layers,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";

export default function InsightsPage() {
  const router = useRouter();
  const { ontologyData, goToStage, completeStage } = useDemo();

  // Redirect if no ontology data
  if (!ontologyData) {
    router.push("/demo/analyze");
    return null;
  }

  const handleContinue = () => {
    completeStage("insights");
    goToStage("chat");
    router.push("/chat");
  };

  const handleAskAbout = (question: string) => {
    completeStage("insights");
    goToStage("chat");
    router.push(`/chat?question=${encodeURIComponent(question)}`);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}K`;
    }
    return `€${value.toFixed(0)}`;
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Your Business Ontology</h2>
            <p className="text-secondary">
              Here&apos;s what we discovered about your business
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <InsightCard
              label="Total MRR"
              value={formatCurrency(ontologyData.totalMrr)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <InsightCard
              label="Customers"
              value={ontologyData.customerCount.toLocaleString()}
              icon={<Users className="h-5 w-5" />}
            />
            <InsightCard
              label="Segments"
              value={ontologyData.segmentCount.toString()}
              icon={<Layers className="h-5 w-5" />}
            />
            <InsightCard
              label="NRR"
              value={`${ontologyData.nrr}%`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>

          {/* Health Distribution */}
          <div className="mb-8">
            <HealthDistribution
              healthy={ontologyData.healthDistribution.healthy}
              atRisk={ontologyData.healthDistribution.atRisk}
              critical={ontologyData.healthDistribution.critical}
            />
          </div>

          {/* Key Insights */}
          <div className="rounded-xl border border-border bg-surface p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">Key Insights</h3>
            </div>

            <div className="space-y-3">
              {ontologyData.keyInsights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg bg-background/50 p-3"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-medium">
                    {index + 1}
                  </div>
                  <p className="text-sm text-secondary">{insight}</p>
                </div>
              ))}
            </div>

            {/* Ask about insights */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => handleAskAbout("Tell me more about the revenue concentration risk")}
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs text-accent hover:bg-accent/20 transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                Ask about concentration
              </button>
              <button
                onClick={() => handleAskAbout("What can I do about the declining usage patterns?")}
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs text-accent hover:bg-accent/20 transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                Ask about churn risk
              </button>
              <button
                onClick={() => handleAskAbout("How can I capitalize on the upgrade opportunities?")}
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs text-accent hover:bg-accent/20 transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                Ask about upgrades
              </button>
            </div>
          </div>

          {/* Top Patterns */}
          <div className="rounded-xl border border-border bg-surface p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold">Detected Patterns</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {ontologyData.topPatterns.map((pattern, index) => (
                <span
                  key={index}
                  className="rounded-full bg-yellow-500/10 px-3 py-1.5 text-sm text-yellow-500"
                >
                  {pattern}
                </span>
              ))}
            </div>
          </div>

          {/* Primary Value Metric */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 mb-8">
            <p className="text-sm text-secondary mb-1">Primary Value Metric</p>
            <p className="text-2xl font-bold text-accent">
              {ontologyData.primaryValueMetric}
            </p>
            <p className="text-sm text-secondary mt-2">
              This metric has the strongest correlation to customer expansion and retention
            </p>
          </div>

          {/* Continue button */}
          <div className="flex justify-center">
            <button
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3 text-lg font-medium text-white hover:bg-accent/90 transition-colors"
            >
              Continue to Chat
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-muted">
            Chat with AI agents to explore your data and get recommendations
          </p>
        </div>
      </div>
    </div>
  );
}
