"use client";

import { useSetup } from "@/contexts/SetupContext";
import { SETUP_STEPS, SETUP_STEP_META } from "@/types/setup";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function SetupProgress() {
  const { currentStep, completedSteps } = useSetup();

  const currentIndex = SETUP_STEPS.indexOf(currentStep);

  return (
    <div className="border-b border-border bg-card px-6 py-5">
      <div className="mx-auto max-w-3xl">
        {/* Step indicators */}
        <div className="flex items-center justify-between">
          {SETUP_STEPS.map((step, index) => {
            const meta = SETUP_STEP_META[step];
            const isCompleted = completedSteps.includes(step);
            const isCurrent = step === currentStep;
            const isPast = index < currentIndex;

            return (
              <div key={step} className="flex items-center">
                {/* Circle + label */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                      isCompleted
                        ? "border-blue-500 bg-blue-500 text-white"
                        : isCurrent
                          ? "border-blue-500 bg-transparent text-blue-500"
                          : "border-white/20 bg-transparent text-white/30"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium",
                      isCurrent
                        ? "text-white"
                        : isCompleted
                          ? "text-blue-400"
                          : "text-white/40"
                    )}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Connector line */}
                {index < SETUP_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-3 h-0.5 w-16 transition-colors sm:w-20 md:w-28",
                      isPast || isCompleted ? "bg-blue-500" : "bg-white/10"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current step description */}
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {SETUP_STEP_META[currentStep].description}
        </p>
      </div>
    </div>
  );
}
