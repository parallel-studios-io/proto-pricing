"use client";

import { useDemo } from "@/contexts/DemoContext";
import { ONBOARDING_STAGES, STAGE_META, type DemoStage } from "@/types/demo";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoProgress() {
  const { currentStage, completedStages } = useDemo();

  // Only show progress during onboarding stages
  if (!ONBOARDING_STAGES.includes(currentStage)) {
    return null;
  }

  const currentIndex = ONBOARDING_STAGES.indexOf(currentStage);

  return (
    <div className="border-b border-border bg-surface px-6 py-4">
      <div className="mx-auto max-w-3xl">
        {/* Progress steps */}
        <div className="flex items-center justify-between">
          {ONBOARDING_STAGES.map((stage, index) => {
            const meta = STAGE_META[stage];
            const isCompleted = completedStages.includes(stage);
            const isCurrent = stage === currentStage;
            const isPast = index < currentIndex;

            return (
              <div key={stage} className="flex items-center">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      isCompleted
                        ? "border-accent bg-accent text-white"
                        : isCurrent
                          ? "border-accent bg-transparent text-accent"
                          : "border-muted bg-transparent text-muted"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-sm font-medium",
                      isCurrent ? "text-primary" : "text-secondary"
                    )}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Connector line */}
                {index < ONBOARDING_STAGES.length - 1 && (
                  <div
                    className={cn(
                      "mx-4 h-0.5 w-24 transition-colors",
                      isPast || isCompleted ? "bg-accent" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current step description */}
        <p className="mt-4 text-center text-sm text-secondary">
          {STAGE_META[currentStage].description}
        </p>
      </div>
    </div>
  );
}
