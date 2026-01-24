"use client";

import { MessageSquare, TrendingUp, AlertTriangle, DollarSign, Users, BarChart } from "lucide-react";

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string, agentId?: string) => void;
  context?: "default" | "pricing" | "recommendation";
}

interface QuestionSuggestion {
  question: string;
  label: string;
  icon: React.ReactNode;
  agentId?: string;
}

const DEFAULT_QUESTIONS: QuestionSuggestion[] = [
  {
    question: "@CFO What are my key customer segments and how do they differ economically?",
    label: "Key segments",
    icon: <Users className="h-4 w-4" />,
    agentId: "CFO",
  },
  {
    question: "@CRO What are my biggest commercial risks right now?",
    label: "Commercial risks",
    icon: <AlertTriangle className="h-4 w-4" />,
    agentId: "CRO",
  },
  {
    question: "@CPO Explain my current pricing structure and how it aligns with customer value",
    label: "Pricing structure",
    icon: <DollarSign className="h-4 w-4" />,
    agentId: "CPO",
  },
  {
    question: "@CSO Which customers are most at risk of churning and why?",
    label: "Churn risk",
    icon: <TrendingUp className="h-4 w-4" />,
    agentId: "CSO",
  },
];

const PRICING_QUESTIONS: QuestionSuggestion[] = [
  {
    question: "@CFO What would be the financial impact of introducing a minimum platform fee?",
    label: "Platform fee impact",
    icon: <DollarSign className="h-4 w-4" />,
    agentId: "CFO",
  },
  {
    question: "@CRO How might customers react to a price increase?",
    label: "Customer reaction",
    icon: <Users className="h-4 w-4" />,
    agentId: "CRO",
  },
  {
    question: "@CPO Which pricing model best aligns with our value metric?",
    label: "Value alignment",
    icon: <BarChart className="h-4 w-4" />,
    agentId: "CPO",
  },
];

const RECOMMENDATION_QUESTIONS: QuestionSuggestion[] = [
  {
    question: "@CFO What if enterprise customers push back on this recommendation?",
    label: "Enterprise pushback",
    icon: <AlertTriangle className="h-4 w-4" />,
    agentId: "CFO",
  },
  {
    question: "@CRO How does this compare to competitor pricing strategies?",
    label: "Competitive analysis",
    icon: <BarChart className="h-4 w-4" />,
    agentId: "CRO",
  },
  {
    question: "@CSO What's the rollback plan if this recommendation fails?",
    label: "Rollback plan",
    icon: <TrendingUp className="h-4 w-4" />,
    agentId: "CSO",
  },
];

export function SuggestedQuestions({ onSelectQuestion, context = "default" }: SuggestedQuestionsProps) {
  const questions = context === "pricing"
    ? PRICING_QUESTIONS
    : context === "recommendation"
      ? RECOMMENDATION_QUESTIONS
      : DEFAULT_QUESTIONS;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted text-center">
        Start by asking a question
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {questions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelectQuestion(suggestion.question, suggestion.agentId)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-secondary hover:border-accent hover:text-accent transition-colors"
          >
            {suggestion.icon}
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
