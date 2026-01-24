"use client";

import { useEffect, useState, useRef } from "react";
import { ANALYSIS_STEPS } from "@/types/demo";
import {
  Users,
  DollarSign,
  TrendingUp,
  Layers,
  Activity,
  BarChart,
  Heart,
  Lightbulb,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OntologyVisualizationProps {
  currentStep: number;
  isComplete: boolean;
  onStepComplete?: (step: number) => void;
}

// Node types for the visualization
interface GraphNode {
  id: string;
  label: string;
  type: "center" | "segment" | "pattern" | "metric";
  x: number;
  y: number;
  color: string;
  appearsAtStep: number;
}

interface GraphEdge {
  from: string;
  to: string;
  appearsAtStep: number;
}

// Define the graph structure
const GRAPH_NODES: GraphNode[] = [
  // Center node
  { id: "ontology", label: "Ontology", type: "center", x: 50, y: 50, color: "#8B5CF6", appearsAtStep: 1 },

  // Segment nodes (appear at step 4)
  { id: "enterprise", label: "Enterprise", type: "segment", x: 20, y: 25, color: "#3B82F6", appearsAtStep: 4 },
  { id: "growing", label: "Growing", type: "segment", x: 80, y: 25, color: "#22C55E", appearsAtStep: 4 },
  { id: "small", label: "Small", type: "segment", x: 20, y: 75, color: "#F59E0B", appearsAtStep: 4 },
  { id: "hobby", label: "Hobby", type: "segment", x: 80, y: 75, color: "#EF4444", appearsAtStep: 4 },

  // Pattern nodes (appear at step 5)
  { id: "upgrade", label: "Upgrade", type: "pattern", x: 35, y: 15, color: "#06B6D4", appearsAtStep: 5 },
  { id: "churn", label: "Churn Risk", type: "pattern", x: 65, y: 15, color: "#EC4899", appearsAtStep: 5 },
  { id: "seasonal", label: "Seasonal", type: "pattern", x: 50, y: 85, color: "#8B5CF6", appearsAtStep: 5 },

  // Metric nodes (appear at step 6)
  { id: "volume", label: "Volume", type: "metric", x: 10, y: 50, color: "#14B8A6", appearsAtStep: 6 },
  { id: "carriers", label: "Carriers", type: "metric", x: 90, y: 50, color: "#6366F1", appearsAtStep: 6 },
];

const GRAPH_EDGES: GraphEdge[] = [
  // Ontology to segments
  { from: "ontology", to: "enterprise", appearsAtStep: 4 },
  { from: "ontology", to: "growing", appearsAtStep: 4 },
  { from: "ontology", to: "small", appearsAtStep: 4 },
  { from: "ontology", to: "hobby", appearsAtStep: 4 },

  // Segments to patterns
  { from: "enterprise", to: "upgrade", appearsAtStep: 5 },
  { from: "growing", to: "upgrade", appearsAtStep: 5 },
  { from: "small", to: "churn", appearsAtStep: 5 },
  { from: "hobby", to: "churn", appearsAtStep: 5 },
  { from: "growing", to: "seasonal", appearsAtStep: 5 },
  { from: "enterprise", to: "seasonal", appearsAtStep: 5 },

  // Metrics to segments
  { from: "volume", to: "enterprise", appearsAtStep: 6 },
  { from: "volume", to: "growing", appearsAtStep: 6 },
  { from: "carriers", to: "enterprise", appearsAtStep: 6 },
  { from: "carriers", to: "growing", appearsAtStep: 6 },
];

const stepIcons: Record<string, React.ReactNode> = {
  users: <Users className="h-4 w-4" />,
  "dollar-sign": <DollarSign className="h-4 w-4" />,
  "trending-up": <TrendingUp className="h-4 w-4" />,
  layers: <Layers className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  "bar-chart": <BarChart className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  lightbulb: <Lightbulb className="h-4 w-4" />,
};

export function OntologyVisualization({
  currentStep,
  isComplete,
  onStepComplete,
}: OntologyVisualizationProps) {
  const [visibleNodes, setVisibleNodes] = useState<string[]>(["ontology"]);
  const [visibleEdges, setVisibleEdges] = useState<number[]>([]);
  const [pulsingNode, setPulsingNode] = useState<string | null>(null);

  // Update visible nodes and edges based on current step
  useEffect(() => {
    const newNodes = GRAPH_NODES
      .filter((node) => node.appearsAtStep <= currentStep)
      .map((node) => node.id);

    const newEdges = GRAPH_EDGES
      .map((edge, index) => (edge.appearsAtStep <= currentStep ? index : -1))
      .filter((index) => index !== -1);

    // Animate new nodes
    const addedNodes = newNodes.filter((n) => !visibleNodes.includes(n));
    if (addedNodes.length > 0) {
      setPulsingNode(addedNodes[addedNodes.length - 1]);
      setTimeout(() => setPulsingNode(null), 1000);
    }

    setVisibleNodes(newNodes);
    setVisibleEdges(newEdges);
  }, [currentStep]);

  return (
    <div className="space-y-8">
      {/* Network Graph Visualization */}
      <div className="relative mx-auto aspect-square max-w-md rounded-xl border border-border bg-surface/50 p-4">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {/* Edges */}
          {GRAPH_EDGES.map((edge, index) => {
            if (!visibleEdges.includes(index)) return null;

            const fromNode = GRAPH_NODES.find((n) => n.id === edge.from);
            const toNode = GRAPH_NODES.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={`edge-${index}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeWidth={0.5}
                className="animate-in fade-in duration-500"
              />
            );
          })}

          {/* Nodes */}
          {GRAPH_NODES.map((node) => {
            if (!visibleNodes.includes(node.id)) return null;

            const radius = node.type === "center" ? 8 : 5;
            const isPulsing = pulsingNode === node.id;

            return (
              <g key={node.id} className="animate-in zoom-in duration-300">
                {/* Pulse ring */}
                {isPulsing && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 3}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={1}
                    className="animate-ping"
                    opacity={0.5}
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={node.color}
                  className="transition-all duration-300"
                />

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + radius + 4}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize={3}
                  className="fill-secondary"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-muted">Segments</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-cyan-500" />
            <span className="text-muted">Patterns</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="text-muted">Metrics</span>
          </div>
        </div>
      </div>

      {/* Step Progress */}
      <div className="space-y-3">
        {ANALYSIS_STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep || isComplete;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2 transition-all",
                isActive && "bg-accent/10",
                isCompleted && "opacity-60"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  isCompleted
                    ? "bg-green-500/20 text-green-500"
                    : isActive
                      ? "bg-accent/20 text-accent"
                      : "bg-surface text-muted"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  stepIcons[step.icon]
                )}
              </div>

              <span
                className={cn(
                  "text-sm",
                  isActive ? "text-primary font-medium" : "text-secondary"
                )}
              >
                {step.label}
                {isActive && "..."}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
