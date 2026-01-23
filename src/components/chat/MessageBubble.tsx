"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-ul:my-2 prose-li:my-0.5 prose-table:text-sm prose-th:text-left prose-th:p-2 prose-th:border-b prose-th:border-border prose-td:p-2 prose-td:border-b prose-td:border-border/50">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
