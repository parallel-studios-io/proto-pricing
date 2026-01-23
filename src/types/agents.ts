export type AgentId = "CFO" | "CRO" | "CPO" | "CMO" | "CSO" | "CTO" | "COO" | "CDO";

export type AgentRecommendation = "support" | "caution" | "oppose";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  title: string;
  color: string;
  expertise: string[];
  evaluationCriteria: string[];
}

export interface AgentEvaluation {
  agentId: AgentId;
  summary: string;
  recommendation: AgentRecommendation;
  confidence: number; // 0-1
  keyPoints: string[];
  risks?: string[];
}

export interface CouncilSynthesis {
  recommendation: string;
  confidence: number;
  consensusLevel: "strong" | "moderate" | "divided";
  keyTradeoffs: string[];
  dissentingViews: { agent: AgentId; concern: string }[];
  nextSteps: string[];
}

export const AGENTS: Record<AgentId, AgentDefinition> = {
  CFO: {
    id: "CFO",
    name: "CFO",
    title: "Chief Financial Officer",
    color: "#3B82F6",
    expertise: [
      "Unit economics (CAC, LTV, payback)",
      "Margin analysis",
      "Cash flow implications",
      "Revenue predictability",
      "Downside risk modeling",
    ],
    evaluationCriteria: [
      "What is the revenue impact? (best/expected/worst case)",
      "How does this affect margins?",
      "What's the cash flow timing?",
      "What's the downside scenario?",
      "How predictable is the outcome?",
    ],
  },
  CRO: {
    id: "CRO",
    name: "CRO",
    title: "Chief Revenue Officer",
    color: "#22C55E",
    expertise: [
      "Customer acquisition",
      "Retention and churn",
      "Expansion revenue",
      "Sales cycle dynamics",
      "Competitive win rates",
    ],
    evaluationCriteria: [
      "How does this affect conversion rates?",
      "What's the churn risk by segment?",
      "What expansion opportunities open/close?",
      "How will competitors respond?",
      "What's the sales team impact?",
    ],
  },
  CPO: {
    id: "CPO",
    name: "CPO",
    title: "Chief Product Officer",
    color: "#A855F7",
    expertise: [
      "Value metric alignment",
      "Feature packaging",
      "Upgrade paths",
      "Customer experience",
      "Product-market fit signals",
    ],
    evaluationCriteria: [
      "Does pricing align with value delivered?",
      "Are upgrade paths clear and natural?",
      "How does this affect the product experience?",
      "What packaging changes are implied?",
      "Does this strengthen or weaken PMF?",
    ],
  },
  CMO: {
    id: "CMO",
    name: "CMO",
    title: "Chief Marketing Officer",
    color: "#F59E0B",
    expertise: [
      "Market positioning",
      "Channel effectiveness",
      "Messaging and perception",
      "Brand implications",
      "Competitive differentiation",
    ],
    evaluationCriteria: [
      "How does this affect market positioning?",
      "What's the messaging challenge/opportunity?",
      "How will the market perceive this?",
      "Does this differentiate or commoditize?",
      "What channel implications exist?",
    ],
  },
  CSO: {
    id: "CSO",
    name: "CSO",
    title: "Chief Strategy Officer",
    color: "#EC4899",
    expertise: [
      "Competitive landscape",
      "Market trends",
      "Long-term positioning",
      "Strategic optionality",
      "Segment focus decisions",
    ],
    evaluationCriteria: [
      "How does this position us in 12-24 months?",
      "What strategic options does this open/close?",
      "How do competitors compare?",
      "Is this reversible?",
      "Does this sharpen or dilute focus?",
    ],
  },
  CTO: {
    id: "CTO",
    name: "CTO",
    title: "Chief Technology Officer",
    color: "#6366F1",
    expertise: [
      "Technical feasibility",
      "Billing system requirements",
      "Implementation complexity",
      "Technical debt implications",
      "Data/analytics requirements",
    ],
    evaluationCriteria: [
      "What technical changes are required?",
      "How complex is the implementation?",
      "What's the timeline estimate?",
      "Are there billing system constraints?",
      "What technical debt is created?",
    ],
  },
  COO: {
    id: "COO",
    name: "COO",
    title: "Chief Operating Officer",
    color: "#14B8A6",
    expertise: [
      "Execution planning",
      "Operational capacity",
      "Process implications",
      "Team readiness",
      "Rollout logistics",
    ],
    evaluationCriteria: [
      "How do we operationalize this?",
      "Does the team have capacity?",
      "What processes need to change?",
      "What's the rollout plan?",
      "What could go wrong in execution?",
    ],
  },
  CDO: {
    id: "CDO",
    name: "CDO",
    title: "Chief Design Officer",
    color: "#F43F5E",
    expertise: [
      "Customer perception",
      "Pricing page design",
      "Value communication",
      "Trust and transparency",
      "Brand consistency",
    ],
    evaluationCriteria: [
      "How will customers perceive this?",
      "Can we communicate this clearly?",
      "Does this feel fair and transparent?",
      "What's the pricing page impact?",
      "Is this consistent with brand?",
    ],
  },
};
