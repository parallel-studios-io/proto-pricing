"use client";

import { useState, useEffect, useRef } from "react";
import type { PricingOption, CouncilEvaluation } from "@/types/pricing-flow";
import type { DebateMessage as DebateMessageType, DebateSummary } from "@/types/demo";
import { DebateMessage } from "./DebateMessage";
import { ConsensusMeter } from "./ConsensusMeter";
import { generateDebate, generateDebateSummary } from "@/lib/pricing/debate-generator";
import { Loader2 } from "lucide-react";

interface AgentDebatePanelProps {
  option: PricingOption;
  evaluation: CouncilEvaluation;
  onComplete?: (summary: DebateSummary) => void;
}

export function AgentDebatePanel({ option, evaluation, onComplete }: AgentDebatePanelProps) {
  const [messages, setMessages] = useState<DebateMessageType[]>([]);
  const [summary, setSummary] = useState<DebateSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [latestMessageId, setLatestMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start debate on mount
  useEffect(() => {
    runDebate();
  }, [option.id]);

  const runDebate = async () => {
    setIsRunning(true);
    setMessages([]);
    setSummary(null);

    // Generate all messages
    const allMessages = generateDebate(option, evaluation);

    // Stream messages with delay
    for (const message of allMessages) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setMessages((prev) => [...prev, message]);
      setLatestMessageId(message.id);
    }

    // Generate and set summary
    await new Promise((resolve) => setTimeout(resolve, 500));
    const debateSummary = generateDebateSummary(option, evaluation);
    setSummary(debateSummary);

    setIsRunning(false);
    onComplete?.(debateSummary);
  };

  return (
    <div className="grid grid-cols-3 gap-6 h-full">
      {/* Option details - Left column */}
      <div className="col-span-1 space-y-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="font-semibold mb-2">Option Under Discussion</h3>
          <p className="text-sm text-secondary mb-4">{option.description}</p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Expected ARR Change</span>
              <span
                className={
                  option.impact_model.expected_arr_change > 0
                    ? "text-green-500"
                    : "text-red-500"
                }
              >
                {option.impact_model.expected_arr_change > 0 ? "+" : ""}
                €{option.impact_model.expected_arr_change.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Risk Level</span>
              <span
                className={
                  option.risk_profile === "low"
                    ? "text-green-500"
                    : option.risk_profile === "moderate"
                      ? "text-yellow-500"
                      : "text-red-500"
                }
              >
                {option.risk_profile}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Complexity</span>
              <span className="text-secondary">{option.complexity}</span>
            </div>
          </div>

          {/* Changes */}
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs text-muted">Proposed Changes</span>
            <div className="mt-2 space-y-1">
              {option.changes.map((change, i) => (
                <div key={i} className="text-xs text-secondary">
                  {change.target}: {change.from} → {change.to}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Consensus meter */}
        <ConsensusMeter summary={summary} isComplete={!isRunning} />
      </div>

      {/* Debate timeline - Right columns */}
      <div className="col-span-2 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Agent Council Debate</h3>
          {isRunning && (
            <div className="flex items-center gap-2 text-accent">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Debate in progress...</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((message) => (
            <DebateMessage
              key={message.id}
              message={message}
              isNew={message.id === latestMessageId}
            />
          ))}

          {isRunning && messages.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Starting debate...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
