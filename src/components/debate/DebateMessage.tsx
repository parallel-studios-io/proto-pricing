"use client";

import { AGENTS, type AgentId } from "@/types/agents";
import type { DebateMessage as DebateMessageType } from "@/types/demo";
import { cn } from "@/lib/utils";

interface DebateMessageProps {
  message: DebateMessageType;
  isNew?: boolean;
}

export function DebateMessage({ message, isNew }: DebateMessageProps) {
  const agent = AGENTS[message.agentId];

  const stanceColors = {
    support: "border-l-green-500 bg-green-500/5",
    oppose: "border-l-red-500 bg-red-500/5",
    caution: "border-l-yellow-500 bg-yellow-500/5",
  };

  const stanceBadges = {
    support: "bg-green-500/20 text-green-400",
    oppose: "bg-red-500/20 text-red-400",
    caution: "bg-yellow-500/20 text-yellow-400",
  };

  const typeLabels = {
    position: "Initial Position",
    point: "Key Point",
    response: "Response",
    synthesis: "Synthesis",
  };

  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-4 transition-all",
        stanceColors[message.stance],
        isNew && "animate-in slide-in-from-bottom-2 duration-300"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {/* Agent avatar */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: agent.color }}
          >
            {message.agentId.charAt(0)}
          </div>

          <div>
            <span className="font-medium">{agent.title}</span>
            <span className="text-xs text-muted ml-2">
              {typeLabels[message.type]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("text-xs px-2 py-0.5 rounded-full", stanceBadges[message.stance])}>
            {message.stance}
          </span>
          <span className="text-xs text-muted">
            {Math.round(message.confidence * 100)}% confident
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-secondary">{message.content}</p>

      {/* Key points */}
      {message.keyPoints && message.keyPoints.length > 0 && (
        <div className="mt-3 space-y-1">
          {message.keyPoints.map((point, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-xs text-muted"
            >
              <span className="text-accent">•</span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
