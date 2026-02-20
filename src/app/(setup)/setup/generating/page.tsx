"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  Brain,
  BarChart3,
  Globe,
  Sparkles,
} from "lucide-react";
import { DEMO_ORGANIZATION_ID } from "@/types/database";
import { useSetup } from "@/contexts/SetupContext";

const STEPS = [
  { id: "setup", label: "Loading company profile", icon: Database },
  { id: "generating", label: "Generating synthetic data", icon: BarChart3 },
  { id: "ontology", label: "Building business ontology", icon: Brain },
  { id: "enriching", label: "Enriching with AI insights", icon: Sparkles },
  { id: "market", label: "Researching market context", icon: Globe },
  { id: "ready", label: "Done!", icon: CheckCircle2 },
];

// Variable delays per step for the fake animation (presets with pre-seeded data)
const FAKE_STEP_DELAYS = [
  { base: 1200, variance: 600 },  // Loading company profile
  { base: 1800, variance: 700 },  // Generating synthetic data (heaviest)
  { base: 1500, variance: 700 },  // Building business ontology
  { base: 1500, variance: 700 },  // Enriching with AI insights
  { base: 1200, variance: 600 },  // Researching market context
  { base: 800, variance: 200 },   // Done!
];

function GeneratingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setup = useSetup();

  // Prefer organizationId from context, fall back to URL params
  const organizationId =
    setup.organizationId ||
    searchParams.get("organizationId") ||
    DEMO_ORGANIZATION_ID;

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const runGeneration = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setup.setGenerationStatus("running");

    const isPreset = !!setup.selectedPreset;

    try {
      if (isPreset) {
        // Preset: data is already seeded in Supabase — just animate
        for (let i = 0; i < STEPS.length; i++) {
          setCurrentStep(i);
          const { base, variance } = FAKE_STEP_DELAYS[i];
          await delay(base + Math.random() * variance);
        }
      } else {
        // Custom company: run real generation
        setCurrentStep(0);
        await delay(500);

        setCurrentStep(1);

        const res = await fetch("/api/company/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Generation failed");
        }

        // Animate through remaining steps
        for (let i = 2; i < STEPS.length; i++) {
          setCurrentStep(i);
          await delay(800);
        }
      }

      // Mark generation complete
      setup.setGenerationStatus("complete");
      setup.completeStep("generating");
      setup.setStep("review");

      // Redirect to review after brief pause
      await delay(1000);
      router.push("/setup/review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      setup.setGenerationStatus("error", message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, router, isGenerating]);

  useEffect(() => {
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="text-xl font-semibold text-foreground">
            Generation Failed
          </h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setError(null);
                setIsGenerating(false);
                setCurrentStep(0);
                runGeneration();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/setup")}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-card"
            >
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Building your business model
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generating data, building the ontology, and enriching with AI
            insights...
          </p>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  isActive
                    ? "border-blue-500/50 bg-blue-500/10"
                    : isCompleted
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border bg-card opacity-50"
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  ) : (
                    <Icon
                      className={`h-5 w-5 ${isPending ? "text-muted-foreground" : "text-foreground"}`}
                    />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isActive
                      ? "font-medium text-blue-300"
                      : isCompleted
                        ? "text-green-300"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function GeneratingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <GeneratingContent />
    </Suspense>
  );
}
