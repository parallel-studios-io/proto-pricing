"use client";

import Link from "next/link";
import { Play, BarChart3, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

interface QuickActionsProps {
  onRefresh?: () => void;
}

export function QuickActions({ onRefresh }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/analysis">
        <Button variant="default" className="gap-2">
          <Play className="h-4 w-4" />
          Run Pricing Analysis
        </Button>
      </Link>
      <Link href="/overview/segments">
        <Button variant="secondary" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          View All Segments
        </Button>
      </Link>
      <Link href="/chat?mention=CFO">
        <Button variant="outline" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Ask @CFO
        </Button>
      </Link>
      {onRefresh && (
        <Button variant="outline" className="gap-2" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      )}
    </div>
  );
}
