"use client";

import { cn } from "@/lib/utils";
import { AGENTS, type AgentId } from "@/types";

interface AgentBadgeProps {
  agentId: AgentId;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

export function AgentBadge({
  agentId,
  size = "md",
  showName = false,
  className,
}: AgentBadgeProps) {
  const agent = AGENTS[agentId];

  const sizeClasses = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-7 w-7 text-xs",
    lg: "h-9 w-9 text-sm",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white",
          sizeClasses[size]
        )}
        style={{ backgroundColor: agent.color }}
      >
        {agentId}
      </div>
      {showName && (
        <span className="font-medium">{agent.name}</span>
      )}
    </div>
  );
}
