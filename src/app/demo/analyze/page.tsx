"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/contexts/DemoContext";
import { OntologyVisualization } from "@/components/demo/OntologyVisualization";
import { ANALYSIS_STEPS, type OntologySummary } from "@/types/demo";
import { ArrowRight, RotateCcw } from "lucide-react";

// Mock ontology data that will be "discovered"
const MOCK_ONTOLOGY: OntologySummary = {
  generatedAt: new Date(),
  customerCount: 2700,
  totalMrr: 917000,
  totalArr: 11004000,
  segmentCount: 4,
  nrr: 112,
  avgLtv: 48000,
  primaryValueMetric: "Shipping Volume",
  healthDistribution: {
    healthy: 68,
    atRisk: 24,
    critical: 8,
  },
  keyInsights: [
    "80% of revenue comes from just 12% of customers (Enterprise segment)",
    "Growing Webshops segment shows 25% annual expansion rate - highest growth potential",
    "Q4 seasonal spike detected - 65% of customers show 2.5x volume increase",
    "35% of customers approaching tier usage limits - significant upgrade opportunity",
    "12% of customer base showing declining usage patterns - churn risk",
    "Multi-carrier users have 3x higher retention than single-carrier users",
    "API integration depth correlates strongly (r=0.85) with expansion revenue",
  ],
  topPatterns: [
    "Volume Threshold Reached",
    "Q4 Volume Spike",
    "Multi-Carrier Interest",
    "Declining Usage Pattern",
    "Annual Plan Responders",
  ],
};

// Metrics that update during analysis
interface LiveMetrics {
  customersAnalyzed: number;
  segmentsFound: number;
  patternsDetected: number;
  insightsGenerated: number;
}

export default function AnalyzePage() {
  const router = useRouter();
  const { goToStage, completeStage, setOntologyProgress, setOntologyData, ontologyProgress } = useDemo();

  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [metrics, setMetrics] = useState<LiveMetrics>({
    customersAnalyzed: 0,
    segmentsFound: 0,
    patternsDetected: 0,
    insightsGenerated: 0,
  });

  const runAnalysis = useCallback(() => {
    setIsRunning(true);
    setCurrentStep(1);

    // Run through steps with delays
    let step = 1;
    const interval = setInterval(() => {
      step++;

      if (step > ANALYSIS_STEPS.length) {
        clearInterval(interval);
        setIsComplete(true);
        setIsRunning(false);

        // Update demo context
        setOntologyProgress({
          currentStep: ANALYSIS_STEPS.length,
          totalSteps: ANALYSIS_STEPS.length,
          currentAction: "Complete",
          isComplete: true,
        });

        setOntologyData({
          ...MOCK_ONTOLOGY,
          generatedAt: new Date(),
        });

        return;
      }

      setCurrentStep(step);

      // Update context
      setOntologyProgress({
        currentStep: step,
        totalSteps: ANALYSIS_STEPS.length,
        currentAction: ANALYSIS_STEPS[step - 1]?.label || "",
        isComplete: false,
      });

      // Update live metrics based on step
      setMetrics((prev) => {
        switch (step) {
          case 2: // LTV calculation
            return { ...prev, customersAnalyzed: 847 };
          case 4: // Segment detection
            return { ...prev, segmentsFound: 4 };
          case 5: // Pattern detection
            return { ...prev, patternsDetected: 5 };
          case 8: // Insights
            return { ...prev, insightsGenerated: 7 };
          default:
            return prev;
        }
      });
    }, 2500); // 2.5 seconds per step

    return () => clearInterval(interval);
  }, [setOntologyProgress, setOntologyData]);

  // Auto-start analysis on mount
  useEffect(() => {
    if (!isRunning && !isComplete && currentStep === 0) {
      const timer = setTimeout(() => {
        runAnalysis();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isRunning, isComplete, currentStep, runAnalysis]);

  const handleContinue = () => {
    completeStage("analyze");
    goToStage("insights");
    router.push("/demo/insights");
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsComplete(false);
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
            {isComplete ? (
              <>
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-secondary hover:bg-surface transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Run Again
                </button>
                <button
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3 text-lg font-medium text-white hover:bg-accent/90 transition-colors"
                >
                  View Insights
                  <ArrowRight className="h-5 w-5" />
                </button>
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
