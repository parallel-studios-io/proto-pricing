"use client";

import { useDemo } from "@/contexts/DemoContext";
import type { DemoMode } from "@/types/demo";
import { Zap, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeSelectorProps {
  onSelect: (mode: DemoMode) => void;
}

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  const { mode, setMode } = useDemo();

  const handleSelect = (selectedMode: DemoMode) => {
    setMode(selectedMode);
    onSelect(selectedMode);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Proto</h1>
        <p className="text-secondary">
          Choose how you&apos;d like to experience the demo
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Generate Mode */}
        <button
          onClick={() => handleSelect("generate")}
          className={cn(
            "group relative rounded-xl border-2 p-6 text-left transition-all hover:border-accent",
            mode === "generate" ? "border-accent bg-accent/5" : "border-border bg-surface"
          )}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Play className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Full Walkthrough</h3>
          <p className="text-sm text-secondary">
            Experience the complete journey from connecting data sources to getting AI-powered recommendations.
          </p>
          <div className="mt-4 text-xs text-muted">
            ~5 minutes
          </div>
          {mode === "generate" && (
            <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-accent" />
          )}
        </button>

        {/* Preloaded Mode */}
        <button
          onClick={() => handleSelect("preloaded")}
          className={cn(
            "group relative rounded-xl border-2 p-6 text-left transition-all hover:border-accent",
            mode === "preloaded" ? "border-accent bg-accent/5" : "border-border bg-surface"
          )}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Quick Demo</h3>
          <p className="text-sm text-secondary">
            Skip setup and jump straight into the product with pre-loaded MyParcel data.
          </p>
          <div className="mt-4 text-xs text-muted">
            ~2 minutes
          </div>
          {mode === "preloaded" && (
            <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-accent" />
          )}
        </button>
      </div>
    </div>
  );
}
