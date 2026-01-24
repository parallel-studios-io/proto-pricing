"use client";

import { AGENTS, type AgentId } from "@/types/agents";
import type { DebateSummary } from "@/types/demo";
import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle } from "lucide-react";

interface ConsensusMeterProps {
  summary: DebateSummary | null;
  isComplete: boolean;
}

export function ConsensusMeter({ summary, isComplete }: ConsensusMeterProps) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted text-center">
          Waiting for debate to complete...
        </p>
      </div>
    );
  }

  const consensusColors = {
    strong: "text-green-500 bg-green-500/20",
    moderate: "text-blue-500 bg-blue-500/20",
    weak: "text-yellow-500 bg-yellow-500/20",
    divided: "text-red-500 bg-red-500/20",
  };

  const allAgents: AgentId[] = ["CFO", "CRO", "CPO", "CSO"];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      {/* Consensus level */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">Council Consensus</span>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            consensusColors[summary.consensus]
          )}
        >
          {summary.consensus.charAt(0).toUpperCase() + summary.consensus.slice(1)}
        </span>
      </div>

      {/* Agent positions */}
      <div className="space-y-2">
        {allAgents.map((agentId) => {
          const agent = AGENTS[agentId];
          const isSupporting = summary.supportingAgents.includes(agentId);
          const isOpposing = summary.opposingAgents.includes(agentId);

          return (
            <div key={agentId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {agentId.charAt(0)}
                </div>
                <span className="text-sm">{agentId}</span>
              </div>

              <div className="flex items-center gap-1">
                {isSupporting && (
                  <div className="flex items-center gap-1 text-green-500">
                    <Check className="h-4 w-4" />
                    <span className="text-xs">Support</span>
                  </div>
                )}
                {isOpposing && (
                  <div className="flex items-center gap-1 text-red-500">
                    <X className="h-4 w-4" />
                    <span className="text-xs">Oppose</span>
                  </div>
                )}
                {!isSupporting && !isOpposing && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">Caution</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confidence */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary">Overall Confidence</span>
          <span className="font-medium">{Math.round(summary.confidence * 100)}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${summary.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Trade-offs */}
      {summary.keyTradeoffs.length > 0 && (
        <div className="pt-2 border-t border-border">
          <span className="text-xs text-muted">Key Trade-offs</span>
          <ul className="mt-1 space-y-1">
            {summary.keyTradeoffs.map((tradeoff, index) => (
              <li key={index} className="text-xs text-secondary flex items-start gap-1">
                <span className="text-muted">•</span>
                {tradeoff}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
