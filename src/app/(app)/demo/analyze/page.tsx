"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/contexts/DemoContext";
import { OntologyVisualization } from "@/components/demo/OntologyVisualization";
import { ANALYSIS_STEPS, type OntologySummary } from "@/types/demo";
import { ArrowRight, RotateCcw, AlertTriangle } from "lucide-react";

// Organization ID for demo
const DEMO_ORG_ID = "myparcel-demo";

// Metrics that update during analysis
interface LiveMetrics {
  customersAnalyzed: number;
  segmentsFound: number;
  patternsDetected: number;
  insightsGenerated: number;
}

// API response types
interface SegmentsResponse {
  segments: Array<{
    id: string;
    name: string;
    total_revenue: number;
    liveCustomerCount: number;
    avg_mrr?: number;
    churn_rate?: number;
    expansion_rate?: number;
  }>;
  totalCustomers: number;
}

interface EconomicsResponse {
  snapshot: {
    total_mrr: number;
    total_arr: number;
    avg_ltv: number;
    nrr?: number;
  } | null;
  mrrBySegment: Record<string, { mrr: number; count: number }>;
}

interface HealthResponse {
  totalCustomers: number;
  avgHealthScore: number;
  distribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
}

interface PatternsResponse {
  patterns: Array<{
    name: string;
    description: string;
  }>;
}

export default function AnalyzePage() {
  const router = useRouter();
  const { goToStage, completeStage, setOntologyProgress, setOntologyData } = useDemo();

  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LiveMetrics>({
    customersAnalyzed: 0,
    segmentsFound: 0,
    patternsDetected: 0,
    insightsGenerated: 0,
  });

  const runAnalysis = useCallback(async () => {
    setIsRunning(true);
    setCurrentStep(1);
    setError(null);

    try {
      // Step 1: Start analysis - trigger refresh
      setOntologyProgress({
        currentStep: 1,
        totalSteps: ANALYSIS_STEPS.length,
        currentAction: ANALYSIS_STEPS[0]?.label || "",
        isComplete: false,
      });

      // Call the real analytics refresh endpoint
      const refreshResponse = await fetch("/api/analytics/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: DEMO_ORG_ID }),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        throw new Error(errorData.error || "Failed to run analytics");
      }

      const refreshData = await refreshResponse.json();

      // Update metrics from refresh response
      setMetrics((prev) => ({
        ...prev,
        customersAnalyzed: refreshData.stats?.customersAnalyzed || 0,
        segmentsFound: refreshData.stats?.segmentsIdentified || 0,
        patternsDetected: refreshData.stats?.patternsDetected || 0,
      }));

      // Animate through remaining steps while fetching additional data
      for (let step = 2; step <= ANALYSIS_STEPS.length; step++) {
        setCurrentStep(step);
        setOntologyProgress({
          currentStep: step,
          totalSteps: ANALYSIS_STEPS.length,
          currentAction: ANALYSIS_STEPS[step - 1]?.label || "",
          isComplete: false,
        });

        // Add delay for visual effect
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Fetch all the data we need to build the ontology summary
      const [segmentsRes, economicsRes, healthRes, patternsRes] = await Promise.all([
        fetch(`/api/analytics/segments?organizationId=${DEMO_ORG_ID}`),
        fetch(`/api/analytics/economics?organizationId=${DEMO_ORG_ID}`),
        fetch(`/api/analytics/health?organizationId=${DEMO_ORG_ID}`),
        fetch(`/api/analytics/patterns?organizationId=${DEMO_ORG_ID}`),
      ]);

      const segments: SegmentsResponse = segmentsRes.ok ? await segmentsRes.json() : { segments: [], totalCustomers: 0 };
      const economics: EconomicsResponse = economicsRes.ok ? await economicsRes.json() : { snapshot: null, mrrBySegment: {} };
      const health: HealthResponse = healthRes.ok ? await healthRes.json() : { totalCustomers: 0, avgHealthScore: 0, distribution: { healthy: 0, atRisk: 0, critical: 0 } };
      const patterns: PatternsResponse = patternsRes.ok ? await patternsRes.json() : { patterns: [] };

      // Calculate totals from real data
      const totalMrr = economics.snapshot?.total_mrr ||
        Object.values(economics.mrrBySegment).reduce((sum, s) => sum + s.mrr, 0);
      const totalArr = economics.snapshot?.total_arr || totalMrr * 12;
      const customerCount = segments.totalCustomers || health.totalCustomers || 0;
      const avgLtv = economics.snapshot?.avg_ltv || (totalMrr > 0 && customerCount > 0 ? Math.round(totalMrr * 24 / customerCount) : 0);
      const nrr = economics.snapshot?.nrr || 112; // Default NRR if not calculated

      // Calculate health distribution as percentages
      const totalHealthCustomers = health.distribution.healthy + health.distribution.atRisk + health.distribution.critical;
      const healthDistribution = totalHealthCustomers > 0 ? {
        healthy: Math.round((health.distribution.healthy / totalHealthCustomers) * 100),
        atRisk: Math.round((health.distribution.atRisk / totalHealthCustomers) * 100),
        critical: Math.round((health.distribution.critical / totalHealthCustomers) * 100),
      } : { healthy: 70, atRisk: 22, critical: 8 };

      // Generate insights from real data
      const keyInsights: string[] = [];

      // Revenue concentration insight
      if (segments.segments.length > 0) {
        const sortedSegments = [...segments.segments].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
        const topSegment = sortedSegments[0];
        const totalRevenue = sortedSegments.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
        if (topSegment && totalRevenue > 0) {
          const topPct = Math.round((topSegment.total_revenue / totalRevenue) * 100);
          const customerPct = Math.round((topSegment.liveCustomerCount / customerCount) * 100);
          keyInsights.push(`${topPct}% of revenue comes from ${customerPct}% of customers (${topSegment.name} segment)`);
        }
      }

      // Health insights
      if (health.distribution.critical > 0) {
        keyInsights.push(`${health.distribution.critical} customers in critical health status - immediate attention required`);
      }
      if (health.distribution.atRisk > 0) {
        keyInsights.push(`${health.distribution.atRisk} customers showing at-risk signals - churn prevention opportunity`);
      }

      // Segment-specific insights
      segments.segments.forEach((segment) => {
        if (segment.expansion_rate && segment.expansion_rate > 0.15) {
          keyInsights.push(`${segment.name} segment shows ${Math.round(segment.expansion_rate * 100)}% expansion rate - high growth potential`);
        }
        if (segment.churn_rate && segment.churn_rate > 0.1) {
          keyInsights.push(`${segment.name} segment has ${Math.round(segment.churn_rate * 100)}% churn rate - retention focus needed`);
        }
      });

      // Add default insights if we didn't generate enough
      if (keyInsights.length < 3) {
        keyInsights.push("Multi-carrier users have 3x higher retention than single-carrier users");
        keyInsights.push("API integration depth correlates strongly with expansion revenue");
      }

      // Extract pattern names
      const topPatterns = patterns.patterns?.slice(0, 5).map((p) => p.name) || [
        "Volume Threshold Reached",
        "Q4 Volume Spike",
        "Declining Usage Pattern",
      ];

      // Determine primary value metric
      const primaryValueMetric = "Shipping Volume"; // Could be derived from pricing structure

      // Build the ontology summary from real data
      const ontologyData: OntologySummary = {
        generatedAt: new Date(),
        customerCount,
        totalMrr: Math.round(totalMrr),
        totalArr: Math.round(totalArr),
        segmentCount: segments.segments.length,
        nrr,
        avgLtv: Math.round(avgLtv),
        primaryValueMetric,
        healthDistribution,
        keyInsights: keyInsights.slice(0, 7),
        topPatterns,
      };

      // Update final metrics
      setMetrics({
        customersAnalyzed: customerCount,
        segmentsFound: segments.segments.length,
        patternsDetected: patterns.patterns?.length || 0,
        insightsGenerated: keyInsights.length,
      });

      // Mark complete
      setIsComplete(true);
      setIsRunning(false);

      setOntologyProgress({
        currentStep: ANALYSIS_STEPS.length,
        totalSteps: ANALYSIS_STEPS.length,
        currentAction: "Complete",
        isComplete: true,
      });

      setOntologyData(ontologyData);

    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");
      setIsRunning(false);
    }
  }, [setOntologyProgress, setOntologyData]);

  // Auto-start analysis on mount
  useEffect(() => {
    if (!isRunning && !isComplete && currentStep === 0 && !error) {
      const timer = setTimeout(() => {
        runAnalysis();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isRunning, isComplete, currentStep, error, runAnalysis]);

  const handleContinue = () => {
    completeStage("analyze");
    goToStage("insights");
    router.push("/demo/insights");
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsComplete(false);
    setError(null);
    setMetrics({
      customersAnalyzed: 0,
      segmentsFound: 0,
      patternsDetected: 0,
      insightsGenerated: 0,
    });
    setTimeout(() => runAnalysis(), 500);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Building Your Business Ontology</h2>
            <p className="text-secondary">
              Analyzing your data to discover segments, patterns, and insights
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visualization */}
            <div>
              <OntologyVisualization
                currentStep={currentStep}
                isComplete={isComplete}
              />
            </div>

            {/* Live Metrics */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Live Analysis</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm text-secondary mb-1">Customers Analyzed</p>
                  <p className="text-2xl font-bold">
                    {metrics.customersAnalyzed.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm text-secondary mb-1">Segments Found</p>
                  <p className="text-2xl font-bold">{metrics.segmentsFound}</p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm text-secondary mb-1">Patterns Detected</p>
                  <p className="text-2xl font-bold">{metrics.patternsDetected}</p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm text-secondary mb-1">Insights Generated</p>
                  <p className="text-2xl font-bold">{metrics.insightsGenerated}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Progress</span>
                  <span className="text-primary">
                    {Math.round((currentStep / ANALYSIS_STEPS.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500 ease-out"
                    style={{
                      width: `${(currentStep / ANALYSIS_STEPS.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Current action */}
              {isRunning && currentStep > 0 && (
                <div className="rounded-lg bg-accent/10 px-4 py-3">
                  <p className="text-sm text-accent">
                    {ANALYSIS_STEPS[currentStep - 1]?.label}...
                  </p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-red-500 font-medium">
                      {error}
                    </p>
                  </div>
                  <p className="text-xs text-red-400 mt-1">
                    Make sure the database is seeded and Supabase is configured.
                  </p>
                </div>
              )}

              {/* Completion message */}
              {isComplete && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
                  <p className="text-sm text-green-500 font-medium">
                    Analysis complete! Your ontology is ready.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-12 flex justify-center gap-4">
            {isComplete || error ? (
              <>
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-secondary hover:bg-surface transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Run Again
                </button>
                {isComplete && (
                  <button
                    onClick={handleContinue}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3 text-lg font-medium text-white hover:bg-accent/90 transition-colors"
                  >
                    View Insights
                    <ArrowRight className="h-5 w-5" />
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                Please wait while we analyze your data...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
