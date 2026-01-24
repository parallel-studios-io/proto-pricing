"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { AgentId } from "@/types";

interface Message {
  id: string;
  role: "user" | "agent";
  agentId?: AgentId;
  content: string;
  timestamp: Date;
  mentions?: AgentId[];
}

interface ChatResponse {
  content: string;
  agentId?: AgentId;
}

interface ChatWindowProps {
  initialMessages?: Message[];
  onSendMessage?: (message: string, mentions: AgentId[]) => Promise<ChatResponse | void>;
  suggestionsContext?: "default" | "pricing" | "recommendation";
  showSuggestions?: boolean;
}

export function ChatWindow({
  initialMessages = [],
  onSendMessage,
  suggestionsContext = "default",
  showSuggestions = true,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string, mentions: AgentId[]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
      mentions,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (onSendMessage) {
        const response = await onSendMessage(content, mentions);
        if (response) {
          const agentResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: "agent",
            agentId: response.agentId || mentions[0] || "CFO",
            content: response.content,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentResponse]);
        }
      } else {
        // Demo response for when no handler is provided
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const respondingAgent = mentions[0] || "CFO";
        const demoResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: "agent",
          agentId: respondingAgent,
          content: getDemoResponse(respondingAgent, content),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, demoResponse]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Talk to Your Business</h2>
                <p className="text-muted">
                  Mention an agent with @ to get their perspective
                </p>
              </div>
              {showSuggestions && (
                <SuggestedQuestions
                  context={suggestionsContext}
                  onSelectQuestion={(question, agentId) => {
                    // Extract the mentions from the question and send
                    const mentions: AgentId[] = agentId ? [agentId as AgentId] : [];
                    handleSend(question, mentions);
                  }}
                />
              )}
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
              Agent is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

// Demo responses for testing
function getDemoResponse(agentId: AgentId, question: string): string {
  const responses: Record<AgentId, string> = {
    CFO: `Based on my analysis of your financial data, I see several key insights:

1. **Revenue Concentration Risk**: 80% of revenue comes from just 12% of customers. This creates significant concentration risk.

2. **Unit Economics by Segment**: The Enterprise segment has excellent LTV ($15,014) with very low churn (0.5%/mo). However, the Hobby/Dormant segment likely costs more to serve than it generates.

3. **Recommendation**: I support introducing a platform minimum fee. The bottom 50% of customers generate only 1.5% of revenue but likely consume significant support and infrastructure resources.

Confidence: 85%`,

    CRO: `Looking at this from a revenue growth perspective:

1. **Expansion Opportunity**: The Growing Webshops segment shows strong expansion potential (25% annual expansion rate). We should focus upsell efforts here.

2. **Churn Risk**: Any price increase will likely cause churn in price-sensitive segments, but these may be unprofitable anyway.

3. **Sales Impact**: A platform minimum would simplify our sales motion - no more supporting accounts that will never scale.

Confidence: 78%`,

    CPO: `From a product and value alignment perspective:

1. **Value Metric**: Our current value metric (pay-per-label) scales with usage but doesn't capture platform value for low-volume users.

2. **Packaging**: A tiered platform structure would better align price with value delivered - high-volume users get automation, API access, multi-carrier.

3. **Upgrade Path**: Clear tiers create natural upgrade triggers as customers grow.

Confidence: 82%`,

    CMO: `Considering market positioning and messaging:

1. **Competitive Position**: Competitors like Sendcloud already have platform fees. We're leaving money on the table.

2. **Messaging Challenge**: "Introducing fees for previously free users" needs careful positioning. Focus on value, not cost.

3. **Brand Risk**: Minimal if we grandfather existing customers and communicate value clearly.

Confidence: 75%`,

    CSO: `From a strategic standpoint:

1. **Market Trend**: The industry is moving toward usage-based and hybrid pricing. This aligns with that trend.

2. **Strategic Optionality**: A platform fee structure gives us flexibility for future pricing experiments.

3. **Focus**: This naturally filters out accounts that don't fit our ideal customer profile, sharpening our focus.

Confidence: 80%`,

    CTO: `Technical implementation considerations:

1. **Billing System**: We can implement this with Stripe's tiered pricing. Estimated 2-3 weeks of development.

2. **Migration Complexity**: Grandfathering existing customers requires a flag system, but it's straightforward.

3. **No Major Technical Debt**: This doesn't create architectural issues.

Confidence: 90%`,

    COO: `Operational execution perspective:

1. **Rollout Plan**: I recommend a phased approach - new customers first, then migrate existing over 6 months.

2. **Support Capacity**: Expect temporary spike in support tickets during transition. We have capacity.

3. **Process Changes**: Sales and support playbooks need updates, but nothing major.

Confidence: 85%`,

    CDO: `Customer experience and perception:

1. **Fairness**: A minimum fee is perceived as fair if communicated as "cost to maintain your account."

2. **Transparency**: Clear pricing page showing what each tier includes builds trust.

3. **Design Needs**: New pricing page, migration email templates, and in-app notifications needed.

Confidence: 80%`,
  };

  return responses[agentId] || "I need more context to provide a useful analysis.";
}
