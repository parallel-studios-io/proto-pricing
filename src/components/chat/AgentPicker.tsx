"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { AGENTS, type AgentId } from "@/types";
import { AgentBadge } from "./AgentBadge";

interface AgentPickerProps {
  isOpen: boolean;
  filter: string;
  onSelect: (agentId: AgentId) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const agentList = Object.values(AGENTS);

export function AgentPicker({
  isOpen,
  filter,
  onSelect,
  onClose,
  position,
}: AgentPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredAgents = agentList.filter(
    (agent) =>
      agent.id.toLowerCase().includes(filter.toLowerCase()) ||
      agent.title.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredAgents.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredAgents[selectedIndex]) {
            onSelect(filteredAgents[selectedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredAgents, selectedIndex, onSelect, onClose]);

  if (!isOpen || filteredAgents.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredAgents.map((agent, index) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
              index === selectedIndex
                ? "bg-white/10"
                : "hover:bg-white/5"
            )}
          >
            <AgentBadge agentId={agent.id} size="sm" />
            <div className="flex-1 overflow-hidden">
              <p className="font-medium">{agent.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {agent.expertise[0]}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
