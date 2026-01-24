"use client";

import { useState } from "react";
import { useDemo } from "@/contexts/DemoContext";
import type { ConnectionType } from "@/types/demo";
import { Check, Loader2, Database, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionCardProps {
  type: ConnectionType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

function ConnectionCard({ type, name, description, icon }: ConnectionCardProps) {
  const { connections, startConnection, completeConnection } = useDemo();
  const status = connections[type];

  const handleConnect = () => {
    if (status.isConnected || status.isSyncing) return;

    startConnection(type);

    // Simulate connection delay
    setTimeout(() => {
      completeConnection(type);
    }, 2000 + Math.random() * 1000); // 2-3 seconds
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-6 transition-all",
        status.isConnected
          ? "border-green-500/50 bg-green-500/5"
          : "border-border bg-surface hover:border-accent/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              status.isConnected ? "bg-green-500/20 text-green-500" : "bg-accent/10 text-accent"
            )}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-secondary">{description}</p>
          </div>
        </div>

        {/* Status / Action */}
        <div className="flex items-center gap-2">
          {status.isConnected ? (
            <div className="flex items-center gap-2 text-green-500">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : status.isSyncing ? (
            <div className="flex items-center gap-2 text-accent">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Syncing...</span>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Data summary when connected */}
      {status.isConnected && status.dataSummary && (
        <div className="mt-4 rounded-lg bg-green-500/10 px-4 py-2">
          <p className="text-sm text-green-400">{status.dataSummary}</p>
        </div>
      )}
    </div>
  );
}

export function ConnectionsPanel() {
  const { connections } = useDemo();

  const allConnected =
    connections.stripe.isConnected &&
    connections.hubspot.isConnected &&
    connections.website.isConnected;

  const anyConnecting =
    connections.stripe.isSyncing ||
    connections.hubspot.isSyncing ||
    connections.website.isSyncing;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Connect Your Data Sources</h2>
        <p className="text-secondary">
          Proto analyzes your existing business data to build a comprehensive pricing ontology.
        </p>
      </div>

      <div className="space-y-4">
        <ConnectionCard
          type="stripe"
          name="Stripe"
          description="Payment data, subscriptions, and customer billing"
          icon={<Database className="h-6 w-6" />}
        />

        <ConnectionCard
          type="hubspot"
          name="HubSpot"
          description="CRM data, contacts, companies, and deals"
          icon={<Users className="h-6 w-6" />}
        />

        <ConnectionCard
          type="website"
          name="Website Analytics"
          description="Traffic, user behavior, and conversion data"
          icon={<Globe className="h-6 w-6" />}
        />
      </div>

      {/* Status indicator */}
      {allConnected ? (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-4 py-2 text-green-500">
            <Check className="h-5 w-5" />
            <span className="font-medium">All systems connected</span>
          </div>
        </div>
      ) : anyConnecting ? (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-accent">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium">Syncing data...</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
