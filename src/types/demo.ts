/**
 * Demo flow types for MyParcel walkthrough
 */

import type { AgentId } from "./agents";
import type { PricingOption, CouncilEvaluation } from "./pricing-flow";

// Demo modes
export type DemoMode = "preloaded" | "generate";

// Demo stages (onboarding + product)
export type DemoStage =
  | "connect"    // Connect systems
  | "analyze"    // Ontology generation
  | "insights"   // Key insights summary
  | "chat"       // Chat with agents
  | "pricing"    // Pricing analysis
  | "debate"     // Agent debate
  | "recommend"; // Final recommendation

// Onboarding stages (no sidebar)
export const ONBOARDING_STAGES: DemoStage[] = ["connect", "analyze", "insights"];

// Product stages (with sidebar)
export const PRODUCT_STAGES: DemoStage[] = ["chat", "pricing", "debate", "recommend"];

// Connection status for data sources
export interface ConnectionStatus {
  isConnected: boolean;
  isSyncing: boolean;
  dataCount?: number;
  dataSummary?: string;
  lastSynced?: Date;
}

// Connection types
export type ConnectionType = "stripe" | "hubspot" | "website";

// Mock connection data
export const CONNECTION_MOCK_DATA: Record<ConnectionType, { count: number; summary: string }> = {
  stripe: { count: 847, summary: "847 customers synced, €2.4M ARR" },
  hubspot: { count: 1203, summary: "1,203 contacts, 312 companies" },
  website: { count: 45000, summary: "45K monthly visitors" },
};

// Ontology summary from analysis
export interface OntologySummary {
  generatedAt: Date;
  customerCount: number;
  totalMrr: number;
  totalArr: number;
  segmentCount: number;
  nrr: number;
  avgLtv: number;
  primaryValueMetric: string;
  healthDistribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
  keyInsights: string[];
  topPatterns: string[];
}

// Debate message in agent discussion
export interface DebateMessage {
  id: string;
  agentId: AgentId;
  type: "position" | "point" | "response" | "synthesis";
  content: string;
  stance: "support" | "oppose" | "caution";
  confidence: number;
  keyPoints?: string[];
  timestamp: number; // for sequencing animation
}

// Debate summary after discussion
export interface DebateSummary {
  optionId: string;
  consensus: "strong" | "moderate" | "weak" | "divided";
  supportingAgents: AgentId[];
  opposingAgents: AgentId[];
  cautiousAgents: AgentId[];
  keyTradeoffs: string[];
  recommendation: string;
  confidence: number;
}

// Full demo state
export interface DemoState {
  // Mode and progression
  mode: DemoMode;
  currentStage: DemoStage;
  completedStages: DemoStage[];
  isOnboarded: boolean;

  // Connection state (stage 2)
  connections: Record<ConnectionType, ConnectionStatus>;

  // Ontology state (stage 3-4)
  ontologyProgress: {
    currentStep: number;
    totalSteps: number;
    currentAction: string;
    isComplete: boolean;
  };
  ontologyData: OntologySummary | null;

  // Pricing analysis state (stage 7)
  selectedOptionId: string | null;
  pricingOptions: PricingOption[];
  evaluations: CouncilEvaluation[];

  // Debate state (stage 8)
  debateMessages: DebateMessage[];
  debateSummary: DebateSummary | null;

  // Recommendation state (stage 9)
  recommendation: PricingOption | null;
  recommendationContext: string | null;
}

// Demo context actions
export interface DemoActions {
  // Mode
  setMode: (mode: DemoMode) => void;

  // Stage navigation
  goToStage: (stage: DemoStage) => void;
  completeStage: (stage: DemoStage) => void;

  // Connections
  startConnection: (type: ConnectionType) => void;
  completeConnection: (type: ConnectionType) => void;

  // Ontology
  setOntologyProgress: (progress: DemoState["ontologyProgress"]) => void;
  setOntologyData: (data: OntologySummary) => void;

  // Pricing
  setPricingOptions: (options: PricingOption[]) => void;
  setEvaluations: (evaluations: CouncilEvaluation[]) => void;
  selectOption: (optionId: string) => void;

  // Debate
  addDebateMessage: (message: DebateMessage) => void;
  setDebateSummary: (summary: DebateSummary) => void;

  // Recommendation
  setRecommendation: (option: PricingOption, context: string) => void;

  // Reset
  resetDemo: () => void;
}

// Initial state factory
export function createInitialDemoState(): DemoState {
  return {
    mode: "generate",
    currentStage: "connect",
    completedStages: [],
    isOnboarded: false,

    connections: {
      stripe: { isConnected: false, isSyncing: false },
      hubspot: { isConnected: false, isSyncing: false },
      website: { isConnected: false, isSyncing: false },
    },

    ontologyProgress: {
      currentStep: 0,
      totalSteps: 8,
      currentAction: "",
      isComplete: false,
    },
    ontologyData: null,

    selectedOptionId: null,
    pricingOptions: [],
    evaluations: [],

    debateMessages: [],
    debateSummary: null,

    recommendation: null,
    recommendationContext: null,
  };
}

// Analysis steps for ontology generation
export const ANALYSIS_STEPS = [
  { id: 1, label: "Analyzing customer cohorts", icon: "users" },
  { id: 2, label: "Calculating lifetime value", icon: "dollar-sign" },
  { id: 3, label: "Computing retention metrics", icon: "trending-up" },
  { id: 4, label: "Discovering customer segments", icon: "layers" },
  { id: 5, label: "Detecting behavioral patterns", icon: "activity" },
  { id: 6, label: "Measuring value metrics", icon: "bar-chart" },
  { id: 7, label: "Scoring customer health", icon: "heart" },
  { id: 8, label: "Generating business insights", icon: "lightbulb" },
] as const;

// Stage metadata
export const STAGE_META: Record<DemoStage, { label: string; description: string }> = {
  connect: { label: "Connect", description: "Connect your data sources" },
  analyze: { label: "Analyze", description: "Build your business ontology" },
  insights: { label: "Insights", description: "Review key findings" },
  chat: { label: "Chat", description: "Talk to your business" },
  pricing: { label: "Pricing", description: "Analyze pricing options" },
  debate: { label: "Debate", description: "Agent council discussion" },
  recommend: { label: "Recommend", description: "Final recommendation" },
};
