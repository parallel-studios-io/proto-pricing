"use client";

import { useRef } from "react";
import { Header } from "@/components/layout";
import { ChatWindow } from "@/components/chat";
import type { AgentId, ChatMessage, ChatResponse } from "@/types";

export default function ChatPage() {
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

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Chat with Your Data"
        action={{
          label: "Share",
          onClick: () => console.log("Share clicked"),
        }}
      />

      <ChatWindow onSendMessage={handleSendMessage} />
    </div>
  );
}
