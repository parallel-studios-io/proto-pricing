"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface ConnectionCardProps {
  name: string;
  icon: React.ReactNode;
  description?: string;
  isConnected: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

export function ConnectionCard({
  name,
  icon,
  description,
  isConnected,
  onConnect,
  onDisconnect,
  className,
}: ConnectionCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : description || "Disconnected"}
          </p>
        </div>
      </div>
      <Button
        variant={isConnected ? "outline" : "secondary"}
        size="sm"
        onClick={isConnected ? onDisconnect : onConnect}
      >
        {isConnected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}
