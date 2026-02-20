"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  SetupState,
  SetupActions,
  SetupStep,
  ConnectionId,
  UploadedFile,
} from "@/types/setup";
import {
  createInitialSetupState,
  CONNECTION_META,
} from "@/types/setup";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "proto-setup-state";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface SetupContextType extends SetupState, SetupActions {}

const SetupContext = createContext<SetupContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SetupProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SetupState>(createInitialSetupState);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch {
        // corrupted — start fresh
      }
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // --- Actions ---

  const setCompanyInfo = useCallback(
    (info: {
      companyName?: string;
      companyUrl?: string;
      companyDescription?: string;
      selectedPreset?: string | null;
      organizationId?: string | null;
    }) => {
      setState((prev) => ({ ...prev, ...info }));
    },
    []
  );

  const setStep = useCallback((step: SetupStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const completeStep = useCallback((step: SetupStep) => {
    setState((prev) => {
      if (prev.completedSteps.includes(step)) return prev;
      return { ...prev, completedSteps: [...prev.completedSteps, step] };
    });
  }, []);

  const startSyncing = useCallback((id: ConnectionId) => {
    setState((prev) => ({
      ...prev,
      connections: {
        ...prev.connections,
        [id]: { ...prev.connections[id], isSyncing: true },
      },
    }));
  }, []);

  const connectSource = useCallback((id: ConnectionId) => {
    const meta = CONNECTION_META[id];
    setState((prev) => ({
      ...prev,
      connections: {
        ...prev.connections,
        [id]: {
          isConnected: true,
          isSyncing: false,
          dataSummary: meta?.mockSummary || "Connected",
        },
      },
    }));
  }, []);

  const disconnectSource = useCallback((id: ConnectionId) => {
    setState((prev) => ({
      ...prev,
      connections: {
        ...prev.connections,
        [id]: { isConnected: false, isSyncing: false, dataSummary: undefined },
      },
    }));
  }, []);

  const addFile = useCallback((file: UploadedFile) => {
    setState((prev) => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, file],
    }));
  }, []);

  const removeFile = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((f) => f.name !== name),
    }));
  }, []);

  const setAdditionalContext = useCallback((text: string) => {
    setState((prev) => ({ ...prev, additionalContext: text }));
  }, []);

  const setGenerationStatus = useCallback(
    (status: SetupState["generationStatus"], error?: string | null) => {
      setState((prev) => ({
        ...prev,
        generationStatus: status,
        generationError: error ?? null,
      }));
    },
    []
  );

  const reset = useCallback(() => {
    const initial = createInitialSetupState();
    setState(initial);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value: SetupContextType = {
    ...state,
    setCompanyInfo,
    setStep,
    completeStep,
    startSyncing,
    connectSource,
    disconnectSource,
    addFile,
    removeFile,
    setAdditionalContext,
    setGenerationStatus,
    reset,
  };

  return (
    <SetupContext.Provider value={value}>{children}</SetupContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSetup() {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error("useSetup must be used within a SetupProvider");
  }
  return context;
}
