"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/contexts/DemoContext";
import { ModeSelector } from "@/components/demo/ModeSelector";
import type { DemoMode } from "@/types/demo";

export default function DemoPage() {
  const router = useRouter();
  const { setMode, goToStage, completeStage, setOntologyData } = useDemo();

  const handleModeSelect = (mode: DemoMode) => {
    setMode(mode);

    if (mode === "preloaded") {
      // Skip to chat with preloaded data
      // Mark onboarding stages as complete
      completeStage("connect");
      completeStage("analyze");
      completeStage("insights");

      // Set mock ontology data
      setOntologyData({
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
          "Growing Webshops segment shows 25% annual expansion rate",
          "Q4 seasonal spike detected - 65% of customers show 2.5x volume increase",
          "35% of customers approaching tier usage limits - upgrade opportunity",
          "12% of customer base showing declining usage patterns",
        ],
        topPatterns: [
          "Volume Threshold Reached",
          "Q4 Volume Spike",
          "Multi-Carrier Interest",
        ],
      });

      goToStage("chat");
      router.push("/chat");
    } else {
      // Start full walkthrough
      goToStage("connect");
      router.push("/demo/connect");
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-8">
      <ModeSelector onSelect={handleModeSelect} />
    </div>
  );
}
