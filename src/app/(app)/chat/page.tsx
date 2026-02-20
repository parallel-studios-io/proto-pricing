"use client";

import { useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import { ChatWindow } from "@/components/chat";
import type { AgentId, ChatMessage, ChatResponse } from "@/types";
import { Play } from "lucide-react";
import Link from "next/link";

function ChatContent() {
  const searchParams = useSearchParams();
  const contextType = searchParams.get("context") as "default" | "pricing" | "recommendation" | null;

  // Track conversation history for context
  const conversationHistory = useRef<ChatMessage[]>([]);

  const handleSendMessage = async (
    message: string,
    mentions: AgentId[]
  ): Promise<{ content: string; agentId?: AgentId } | void> => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          mentions,
          conversationHistory: conversationHistory.current,
        }),
      });

      const data: ChatResponse = await response.json();

      if (!data.success) {
        console.error("Chat API error:", data.error);
        return {
          content: `Sorry, I encountered an error: ${data.error || "Unknown error"}. Please try again.`,
          agentId: mentions[0],
        };
      }

      // Add messages to history for context in future requests
      conversationHistory.current.push({
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date(),
        mentions,
      });

      conversationHistory.current.push({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response.content,
        timestamp: new Date(),
        agentId: data.response.agentId,
      });

      return {
        content: data.response.content,
        agentId: data.response.agentId,
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      return {
        content: "Sorry, I couldn't connect to the server. Please check your connection and try again.",
        agentId: mentions[0],
      };
    }
  };

  const isStressTest = contextType === "recommendation";

  return (
    <div className="flex h-full flex-col">
      <Header
        title={isStressTest ? "Stress Test Recommendation" : "Chat with Your Data"}
        subtitle={isStressTest ? "Challenge the council's recommendation" : undefined}
        action={!isStressTest ? {
          label: "Run Analysis",
          icon: <Play className="h-4 w-4" />,
          href: "/analysis",
        } : {
          label: "Back to Recommendation",
          href: "/analysis/recommend",
        }}
      />

      <ChatWindow
        onSendMessage={handleSendMessage}
        suggestionsContext={contextType || "default"}
        showSuggestions={true}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full flex-col">
        <Header title="Chat with Your Data" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
