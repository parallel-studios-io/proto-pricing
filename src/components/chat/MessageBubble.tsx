"use client";

import { cn } from "@/lib/utils";
import { AgentBadge } from "./AgentBadge";
import type { AgentId } from "@/types";

interface Message {
  id: string;
  role: "user" | "agent";
  agentId?: AgentId;
  content: string;
  timestamp: Date;
  mentions?: AgentId[];
}

interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const timeString = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        {isUser ? (
          <>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">
              YO
            </div>
            <span className="font-medium">You</span>
            <span className="text-sm text-muted-foreground">{timeString}</span>
            {message.mentions?.map((agentId) => (
              <span key={agentId} className="text-sm text-muted-foreground">
                @{agentId}
              </span>
            ))}
          </>
        ) : (
          <>
            {message.agentId && <AgentBadge agentId={message.agentId} />}
            <span className="font-medium">{message.agentId}</span>
            <span className="text-sm text-muted-foreground">{timeString}</span>
          </>
        )}
      </div>

      {/* Content */}
      <div className="pl-9">
        <div className="prose prose-invert max-w-none text-sm leading-relaxed">
          {message.content.split("\n").map((line, i) => (
            <p key={i} className="mb-2 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
