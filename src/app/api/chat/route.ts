import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateMyParcelData } from "@/lib/generators/myparcel";
import { buildSystemPrompt } from "@/lib/chat/context-builder";
import type { ChatRequest, ChatResponse, ChatMessage } from "@/types/chat";
import type { AgentId } from "@/types/agents";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    // Debug: Check if API key is loaded
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, response: { content: "" }, error: "ANTHROPIC_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const body: ChatRequest = await request.json();
    const { message, mentions = [], conversationHistory = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, response: { content: "" }, error: "Message is required" },
        { status: 400 }
      );
    }

    // Generate fresh business data
    const data = generateMyParcelData();

    // Determine which agent perspective to use (first mentioned agent, if any)
    const agentId = mentions.length > 0 ? mentions[0] : undefined;

    // Build system prompt with data context
    const systemPrompt = buildSystemPrompt(data, agentId);

    // Build messages array from conversation history
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...conversationHistory.map((msg: ChatMessage) => ({
        role: msg.role === "user" ? "user" as const : "assistant" as const,
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // Extract text content from response
    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      success: true,
      response: {
        content,
        agentId: agentId as AgentId | undefined,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to process chat message";

    return NextResponse.json(
      {
        success: false,
        response: { content: "" },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
