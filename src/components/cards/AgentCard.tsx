"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentBadge } from "@/components/chat/AgentBadge";
import type { AgentId } from "@/types";

interface AgentCardProps {
  agentId: AgentId;
  title: string;
  description: string;
  onClick?: () => void;
  className?: string;
}

export function AgentCard({
  agentId,
  title,
  description,
  onClick,
  className,
}: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-start rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-white/20",
        className
      )}
    >
      <div className="flex w-full items-center justify-between">
        <AgentBadge agentId={agentId} />
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
        {description}
      </p>
    </button>
  );
}
