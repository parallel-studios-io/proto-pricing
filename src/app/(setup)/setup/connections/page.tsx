"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  Users,
  Briefcase,
  Wallet,
  FileText,
  MessageSquare,
  FolderOpen,
  Check,
  Lock,
} from "lucide-react";
import { useSetup } from "@/contexts/SetupContext";
import { MockOAuthDialog } from "@/components/setup/MockOAuthDialog";
import type { ConnectionId } from "@/types/setup";
import {
  ACTIVE_CONNECTIONS,
  COMING_SOON_CONNECTIONS,
  CONNECTION_META,
} from "@/types/setup";

const CONNECTION_ICONS: Record<ConnectionId, React.ReactNode> = {
  hubspot: <Users className="h-5 w-5" />,
  stripe: <CreditCard className="h-5 w-5" />,
  salesforce: <Briefcase className="h-5 w-5" />,
  mollie: <Wallet className="h-5 w-5" />,
  notion: <FileText className="h-5 w-5" />,
  slack: <MessageSquare className="h-5 w-5" />,
  "google-drive": <FolderOpen className="h-5 w-5" />,
};

export default function SetupConnectionsPage() {
  const router = useRouter();
  const setup = useSetup();
  const [connectingService, setConnectingService] =
    useState<ConnectionId | null>(null);

  function handleConnect(id: ConnectionId) {
    setup.startSyncing(id);
    setConnectingService(id);
  }

  function handleOAuthSuccess() {
    if (connectingService) {
      setup.connectSource(connectingService);
    }
    setConnectingService(null);
  }

  function handleContinue() {
    setup.completeStep("connections");
    setup.setStep("documents");
    router.push("/setup/documents");
  }

  const connectedCount = Object.values(setup.connections).filter(
    (c) => c.isConnected
  ).length;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Connect Your Data
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your data sources for richer analysis. You can skip this
            step and add connections later.
          </p>
        </div>

        {/* Active connections */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Available
          </h2>
          {ACTIVE_CONNECTIONS.map((id) => {
            const meta = CONNECTION_META[id];
            const status = setup.connections[id];
            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    {CONNECTION_ICONS[id]}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{meta.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {status?.isConnected
                        ? status.dataSummary
                        : meta.description}
                    </p>
                  </div>
                </div>
                {status?.isConnected ? (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <Check className="h-4 w-4" />
                    Connected
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(id)}
                    disabled={status?.isSyncing}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Coming soon connections */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Coming Soon
          </h2>
          {COMING_SOON_CONNECTIONS.map((id) => {
            const meta = CONNECTION_META[id];
            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-card/50 p-4 opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                    {CONNECTION_ICONS[id]}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{meta.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {meta.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Coming Soon
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {connectedCount > 0
              ? `${connectedCount} source${connectedCount > 1 ? "s" : ""} connected`
              : "No sources connected yet"}
          </p>
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            {connectedCount === 0 ? "Skip for now" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mock OAuth Dialog */}
      <MockOAuthDialog
        serviceName={
          connectingService
            ? CONNECTION_META[connectingService].name
            : ""
        }
        isOpen={connectingService !== null}
        onClose={() => setConnectingService(null)}
        onSuccess={handleOAuthSuccess}
      />
    </div>
  );
}
