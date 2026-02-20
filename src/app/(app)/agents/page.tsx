"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import { AgentCard } from "@/components/cards/AgentCard";
import { AGENTS } from "@/types";

export default function AgentsPage() {
  const router = useRouter();

  const handleAgentClick = (agentId: string) => {
    router.push(`/chat?mention=${agentId}`);
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Agents"
        action={{
          label: "Create agent",
          onClick: () => console.log("Create agent"),
        }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex gap-4 border-b border-border pb-4">
          <button className="text-sm font-medium text-white">Custom</button>
          <button className="text-sm text-muted-foreground hover:text-white">
            Favorites
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(AGENTS).map((agent) => (
            <AgentCard
              key={agent.id}
              agentId={agent.id}
              title={agent.title}
              description={agent.expertise[0]}
              onClick={() => handleAgentClick(agent.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
