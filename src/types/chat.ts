import type { AgentId } from "./agents";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agentId?: AgentId;
  mentions?: AgentId[];
}

export interface ChatRequest {
  message: string;
  mentions?: AgentId[];
  conversationHistory?: ChatMessage[];
  organizationId?: string;
}

export interface ChatResponse {
  success: boolean;
  response: {
    content: string;
    agentId?: AgentId;
  };
  error?: string;
}
