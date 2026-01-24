/**
 * Generate agent debate messages from council evaluations
 */

import type { AgentId } from "@/types/agents";
import type { PricingOption, CouncilEvaluation, AgentView } from "@/types/pricing-flow";
import type { DebateMessage, DebateSummary } from "@/types/demo";

// Map recommendation to stance
function mapToStance(recommendation: string): "support" | "oppose" | "caution" {
  if (recommendation.includes("strongly_support") || recommendation.includes("support")) {
    return "support";
  }
  if (recommendation.includes("strongly_oppose") || recommendation.includes("oppose")) {
    return "oppose";
  }
  return "caution";
}

// Generate initial position message
function generatePositionMessage(
  view: AgentView,
  index: number
): DebateMessage {
  return {
    id: `pos-${view.agent}-${Date.now()}`,
    agentId: view.agent as AgentId,
    type: "position",
    content: view.reasoning,
    stance: mapToStance(view.recommendation),
    confidence: view.confidence,
    keyPoints: view.key_points,
    timestamp: index * 1000, // Stagger by 1 second
  };
}

// Generate key point messages
function generatePointMessages(
  view: AgentView,
  baseIndex: number
): DebateMessage[] {
  return view.key_points.slice(0, 2).map((point, i) => ({
    id: `point-${view.agent}-${i}-${Date.now()}`,
    agentId: view.agent as AgentId,
    type: "point" as const,
    content: point,
    stance: mapToStance(view.recommendation),
    confidence: view.confidence,
    timestamp: (baseIndex + i + 1) * 500,
  }));
}

// Generate cross-discussion responses
function generateResponseMessages(
  views: AgentView[]
): DebateMessage[] {
  const responses: DebateMessage[] = [];
  let timestamp = 5000;

  // CFO responds to growth concerns
  const cfoView = views.find((v) => v.agent === "CFO");
  const croView = views.find((v) => v.agent === "CRO");

  if (cfoView && croView && mapToStance(croView.recommendation) !== mapToStance(cfoView.recommendation)) {
    responses.push({
      id: `resp-CFO-CRO-${Date.now()}`,
      agentId: "CFO",
      type: "response",
      content: `Responding to ${croView.agent}'s concern about churn: While I understand the revenue growth perspective, we need to consider the long-term unit economics. The customers most likely to churn are often unprofitable anyway.`,
      stance: mapToStance(cfoView.recommendation),
      confidence: cfoView.confidence,
      timestamp: timestamp,
    });
    timestamp += 1000;
  }

  // CPO responds to strategy
  const cpoView = views.find((v) => v.agent === "CPO");
  const csoView = views.find((v) => v.agent === "CSO");

  if (cpoView && csoView) {
    responses.push({
      id: `resp-CPO-CSO-${Date.now()}`,
      agentId: "CPO",
      type: "response",
      content: `Building on ${csoView.agent}'s strategic point: From a product perspective, we should ensure any pricing change reinforces our value proposition. The key is aligning price with the value customers actually receive.`,
      stance: mapToStance(cpoView.recommendation),
      confidence: cpoView.confidence,
      timestamp: timestamp,
    });
  }

  return responses;
}

// Generate synthesis message
function generateSynthesis(
  evaluation: CouncilEvaluation
): DebateMessage {
  return {
    id: `synth-${Date.now()}`,
    agentId: "CFO", // Moderator
    type: "synthesis",
    content: evaluation.recommendation.summary,
    stance: evaluation.recommendation.consensus === "strong" || evaluation.recommendation.consensus === "moderate"
      ? "support"
      : "caution",
    confidence: 0.85,
    keyPoints: evaluation.recommendation.trade_offs,
    timestamp: 10000,
  };
}

/**
 * Generate a complete debate from a council evaluation
 */
export function generateDebate(
  option: PricingOption,
  evaluation: CouncilEvaluation
): DebateMessage[] {
  const messages: DebateMessage[] = [];

  const views = [
    evaluation.finance_view,
    evaluation.growth_view,
    evaluation.product_view,
    evaluation.strategy_view,
  ];

  // 1. Initial positions
  views.forEach((view, index) => {
    messages.push(generatePositionMessage(view, index));
  });

  // 2. Key points (select most important)
  views.forEach((view, index) => {
    const points = generatePointMessages(view, views.length + index * 2);
    messages.push(...points);
  });

  // 3. Cross-discussion
  const responses = generateResponseMessages(views);
  messages.push(...responses);

  // 4. Synthesis
  messages.push(generateSynthesis(evaluation));

  // Sort by timestamp
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Generate debate summary from evaluation
 */
export function generateDebateSummary(
  option: PricingOption,
  evaluation: CouncilEvaluation
): DebateSummary {
  const views = [
    evaluation.finance_view,
    evaluation.growth_view,
    evaluation.product_view,
    evaluation.strategy_view,
  ];

  const supporting: AgentId[] = [];
  const opposing: AgentId[] = [];
  const cautious: AgentId[] = [];

  views.forEach((view) => {
    const stance = mapToStance(view.recommendation);
    if (stance === "support") {
      supporting.push(view.agent as AgentId);
    } else if (stance === "oppose") {
      opposing.push(view.agent as AgentId);
    } else {
      cautious.push(view.agent as AgentId);
    }
  });

  return {
    optionId: option.id,
    consensus: evaluation.recommendation.consensus,
    supportingAgents: supporting,
    opposingAgents: opposing,
    cautiousAgents: cautious,
    keyTradeoffs: evaluation.recommendation.trade_offs,
    recommendation: evaluation.recommendation.summary,
    confidence: views.reduce((sum, v) => sum + v.confidence, 0) / views.length,
  };
}

/**
 * Get debate messages with delays for animation
 */
export async function* streamDebateMessages(
  messages: DebateMessage[],
  delayMs: number = 500
): AsyncGenerator<DebateMessage> {
  for (const message of messages) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield message;
  }
}
