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
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-ul:my-2 prose-li:my-0.5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="border-b border-border/50">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-2 text-left font-semibold text-foreground whitespace-nowrap">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 text-foreground whitespace-nowrap">
                  {children}
                </td>
              ),
              tr: ({ children }) => (
                <tr className="border-b border-border/30 last:border-0">
                  {children}
                </tr>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
