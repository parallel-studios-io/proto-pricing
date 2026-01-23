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
        <div className="max-w-none text-[15px] leading-7 text-zinc-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Paragraphs
              p: ({ children }) => (
                <p className="my-3 text-zinc-200 leading-7">{children}</p>
              ),
              // Headings - Claude style with subtle weight
              h1: ({ children }) => (
                <h1 className="text-xl font-semibold text-zinc-100 mt-6 mb-3">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-zinc-100 mt-5 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-zinc-100 mt-4 mb-2">{children}</h3>
              ),
              // Bold text
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-100">{children}</strong>
              ),
              // Lists
              ul: ({ children }) => (
                <ul className="my-3 ml-1 space-y-1 list-disc list-outside pl-5 marker:text-zinc-500">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-3 ml-1 space-y-1 list-decimal list-outside pl-5 marker:text-zinc-500">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-zinc-200 pl-1">{children}</li>
              ),
              // Code
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[13px] font-mono">{children}</code>
                ) : (
                  <code className={className}>{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="my-4 p-4 rounded-lg bg-zinc-900 overflow-x-auto text-[13px]">{children}</pre>
              ),
              // Links
              a: ({ children, href }) => (
                <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-2">{children}</a>
              ),
              // Tables
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-[14px]">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="border-b border-zinc-700">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-2.5 text-left font-semibold text-zinc-100 whitespace-nowrap">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">
                  {children}
                </td>
              ),
              tr: ({ children }) => (
                <tr className="border-b border-zinc-800 last:border-0">
                  {children}
                </tr>
              ),
              // Blockquotes
              blockquote: ({ children }) => (
                <blockquote className="my-3 pl-4 border-l-2 border-zinc-600 text-zinc-400 italic">{children}</blockquote>
              ),
              // Horizontal rule
              hr: () => (
                <hr className="my-6 border-zinc-700" />
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
