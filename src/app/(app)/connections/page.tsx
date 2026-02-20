"use client";

import { useState } from "react";
import { CreditCard, Users, Globe } from "lucide-react";
import { Header } from "@/components/layout";
import { ConnectionCard } from "@/components/cards/ConnectionCard";

interface Connection {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  isConnected: boolean;
}

const initialConnections: Connection[] = [
  {
    id: "stripe",
    name: "Stripe",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Connect your Stripe account to import customers and subscriptions",
    isConnected: false,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    icon: <Users className="h-5 w-5" />,
    description: "Connect HubSpot to enrich customer data with CRM insights",
    isConnected: false,
  },
  {
    id: "website",
    name: "Website",
    icon: <Globe className="h-5 w-5" />,
    description: "Scrape your pricing page to analyze current structure",
    isConnected: false,
  },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState(initialConnections);

  const handleConnect = (connectionId: string) => {
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === connectionId ? { ...conn, isConnected: true } : conn
      )
    );
  };

  const handleDisconnect = (connectionId: string) => {
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === connectionId ? { ...conn, isConnected: false } : conn
      )
    );
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="Connections" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold">Create your connections</h2>
            <p className="mt-2 text-muted-foreground">
              Add sources to get better insights and make better decisions
            </p>
          </div>

          <div className="space-y-4">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                name={connection.name}
                icon={connection.icon}
                description={connection.description}
                isConnected={connection.isConnected}
                onConnect={() => handleConnect(connection.id)}
                onDisconnect={() => handleDisconnect(connection.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
