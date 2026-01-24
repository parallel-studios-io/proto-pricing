"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  DemoState,
  DemoActions,
  DemoMode,
  DemoStage,
  ConnectionType,
  CONNECTION_MOCK_DATA,
  OntologySummary,
  DebateMessage,
  DebateSummary,
  createInitialDemoState,
  ONBOARDING_STAGES,
} from "@/types/demo";
import type { PricingOption, CouncilEvaluation } from "@/types/pricing-flow";

// Storage key for persisting demo state
const DEMO_STORAGE_KEY = "proto-pricing-demo-state";

// Context type
interface DemoContextType extends DemoState, DemoActions {}

// Create context
const DemoContext = createContext<DemoContextType | null>(null);

// Provider component
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(createInitialDemoState);

  // Load state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Restore dates
          if (parsed.ontologyData?.generatedAt) {
            parsed.ontologyData.generatedAt = new Date(parsed.ontologyData.generatedAt);
          }
          Object.keys(parsed.connections || {}).forEach((key) => {
            if (parsed.connections[key]?.lastSynced) {
              parsed.connections[key].lastSynced = new Date(parsed.connections[key].lastSynced);
            }
          });
          setState(parsed);
        } catch (e) {
          console.error("Failed to restore demo state:", e);
        }
      }
    }
  }, []);

  // Save state to sessionStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Actions
  const setMode = useCallback((mode: DemoMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const goToStage = useCallback((stage: DemoStage) => {
    setState((prev) => {
      const isOnboarded = !ONBOARDING_STAGES.includes(stage);
      return { ...prev, currentStage: stage, isOnboarded };
    });
  }, []);

  const completeStage = useCallback((stage: DemoStage) => {
    setState((prev) => {
      if (prev.completedStages.includes(stage)) return prev;
      return {
        ...prev,
        completedStages: [...prev.completedStages, stage],
      };
    });
  }, []);

  const startConnection = useCallback((type: ConnectionType) => {
    setState((prev) => ({
      ...prev,
      connections: {
        ...prev.connections,
        [type]: { ...prev.connections[type], isSyncing: true },
      },
    }));
  }, []);

  const completeConnection = useCallback((type: ConnectionType) => {
    const mockData = CONNECTION_MOCK_DATA[type];
    setState((prev) => ({
      ...prev,
      connections: {
        ...prev.connections,
        [type]: {
          isConnected: true,
          isSyncing: false,
          dataCount: mockData.count,
          dataSummary: mockData.summary,
          lastSynced: new Date(),
        },
      },
    }));
  }, []);

  const setOntologyProgress = useCallback(
    (progress: DemoState["ontologyProgress"]) => {
      setState((prev) => ({ ...prev, ontologyProgress: progress }));
    },
    []
  );

  const setOntologyData = useCallback((data: OntologySummary) => {
    setState((prev) => ({
      ...prev,
      ontologyData: data,
      ontologyProgress: { ...prev.ontologyProgress, isComplete: true },
    }));
  }, []);

  const setPricingOptions = useCallback((options: PricingOption[]) => {
    setState((prev) => ({ ...prev, pricingOptions: options }));
  }, []);

  const setEvaluations = useCallback((evaluations: CouncilEvaluation[]) => {
    setState((prev) => ({ ...prev, evaluations }));
  }, []);

  const selectOption = useCallback((optionId: string) => {
    setState((prev) => ({ ...prev, selectedOptionId: optionId }));
  }, []);

  const addDebateMessage = useCallback((message: DebateMessage) => {
    setState((prev) => ({
      ...prev,
      debateMessages: [...prev.debateMessages, message],
    }));
  }, []);

  const setDebateSummary = useCallback((summary: DebateSummary) => {
    setState((prev) => ({ ...prev, debateSummary: summary }));
  }, []);

  const setRecommendation = useCallback((option: PricingOption, context: string) => {
    setState((prev) => ({
      ...prev,
      recommendation: option,
      recommendationContext: context,
    }));
  }, []);

  const resetDemo = useCallback(() => {
    const initial = createInitialDemoState();
    setState(initial);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    }
  }, []);

  const value: DemoContextType = {
    ...state,
    setMode,
    goToStage,
    completeStage,
    startConnection,
    completeConnection,
    setOntologyProgress,
    setOntologyData,
    setPricingOptions,
    setEvaluations,
    selectOption,
    addDebateMessage,
    setDebateSummary,
    setRecommendation,
    resetDemo,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

// Hook to use demo context
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}

// Hook to check if onboarding is complete
export function useIsOnboarded() {
  const { completedStages } = useDemo();
  return ONBOARDING_STAGES.every((stage) => completedStages.includes(stage));
}
