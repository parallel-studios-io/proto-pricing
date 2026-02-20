"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";

interface MockOAuthDialogProps {
  serviceName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Simulates an OAuth connection flow.
 * Shows: Connecting → Authorizing → Syncing → Connected!
 */
export function MockOAuthDialog({
  serviceName,
  isOpen,
  onClose,
  onSuccess,
}: MockOAuthDialogProps) {
  const [phase, setPhase] = useState<
    "connecting" | "authorizing" | "syncing" | "done"
  >("connecting");

  const handleDone = useCallback(() => {
    onSuccess();
    onClose();
  }, [onSuccess, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setPhase("connecting");
      return;
    }

    // Simulate OAuth flow phases
    const t1 = setTimeout(() => setPhase("authorizing"), 800);
    const t2 = setTimeout(() => setPhase("syncing"), 1800);
    const t3 = setTimeout(() => setPhase("done"), 3000);
    const t4 = setTimeout(handleDone, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen, handleDone]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-2xl">
        {/* Service header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <ExternalLink className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{serviceName}</h3>
            <p className="text-xs text-muted-foreground">OAuth Connection</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-4">
          <PhaseRow
            label="Connecting to API"
            status={
              phase === "connecting"
                ? "active"
                : "done"
            }
          />
          <PhaseRow
            label="Authorizing access"
            status={
              phase === "connecting"
                ? "pending"
                : phase === "authorizing"
                  ? "active"
                  : "done"
            }
          />
          <PhaseRow
            label="Syncing initial data"
            status={
              phase === "connecting" || phase === "authorizing"
                ? "pending"
                : phase === "syncing"
                  ? "active"
                  : "done"
            }
          />
        </div>

        {phase === "done" && (
          <div className="mt-6 rounded-lg bg-green-500/10 p-3 text-center text-sm text-green-400">
            <CheckCircle2 className="mb-1 inline h-4 w-4" /> Connected
            successfully!
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseRow({
  label,
  status,
}: {
  label: string;
  status: "pending" | "active" | "done";
}) {
  return (
    <div className="flex items-center gap-3">
      {status === "active" && (
        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
      )}
      {status === "done" && (
        <CheckCircle2 className="h-4 w-4 text-green-400" />
      )}
      {status === "pending" && (
        <div className="h-4 w-4 rounded-full border border-white/20" />
      )}
      <span
        className={
          status === "active"
            ? "text-sm text-foreground"
            : status === "done"
              ? "text-sm text-green-400"
              : "text-sm text-muted-foreground"
        }
      >
        {label}
      </span>
    </div>
  );
}
