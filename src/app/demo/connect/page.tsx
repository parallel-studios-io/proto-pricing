"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/contexts/DemoContext";
import { ConnectionsPanel } from "@/components/demo/ConnectionsPanel";
import { FileUpload } from "@/components/demo/FileUpload";
import { ArrowRight } from "lucide-react";

export default function ConnectPage() {
  const router = useRouter();
  const { connections, goToStage, completeStage } = useDemo();

  const allConnected =
    connections.stripe.isConnected &&
    connections.hubspot.isConnected &&
    connections.website.isConnected;

  const handleContinue = () => {
    completeStage("connect");
    goToStage("analyze");
    router.push("/demo/analyze");
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-2xl">
          <ConnectionsPanel />

          <div className="mt-12 border-t border-border pt-8">
            <FileUpload />
          </div>

          {/* Continue button */}
          <div className="mt-12 flex justify-center">
            <button
              onClick={handleContinue}
              disabled={!allConnected}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3 text-lg font-medium text-white transition-all hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Analysis
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {!allConnected && (
            <p className="mt-4 text-center text-sm text-muted">
              Connect all data sources to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
