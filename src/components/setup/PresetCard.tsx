"use client";

import { LucideIcon } from "lucide-react";

interface PresetCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  details: string[];
  selected: boolean;
  onClick: () => void;
}

export function PresetCard({ name, description, icon: Icon, details, selected, onClick }: PresetCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-xl border-2 p-6 transition-all hover:border-blue-500/50 ${
        selected
          ? "border-blue-500 bg-blue-500/10"
          : "border-border bg-card"
      }`}
    >
      {selected && (
        <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-blue-500" />
      )}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
        <Icon className="h-6 w-6 text-blue-400" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">{name}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <ul className="space-y-1">
        {details.map((detail, i) => (
          <li key={i} className="text-xs text-muted-foreground">
            <span className="mr-1.5 text-blue-400">-</span>
            {detail}
          </li>
        ))}
      </ul>
    </button>
  );
}
