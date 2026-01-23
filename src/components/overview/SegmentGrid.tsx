"use client";

import { SegmentCard } from "@/components/cards/SegmentCard";
import type { Segment } from "@/types";

interface SegmentGridProps {
  segments: Segment[];
  onSegmentClick?: (segment: Segment) => void;
}

export function SegmentGrid({ segments, onSegmentClick }: SegmentGridProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Segments</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {segments.map((segment) => (
          <SegmentCard
            key={segment.id}
            name={segment.name}
            customerCount={segment.customerCount}
            revenue={segment.revenue}
            revenueShare={segment.revenueShare}
            churnRate={segment.churnRate}
            onClick={() => onSegmentClick?.(segment)}
          />
        ))}
      </div>
    </div>
  );
}
