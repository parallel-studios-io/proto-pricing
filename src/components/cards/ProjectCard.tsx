"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  title: string;
  description: string;
  updatedAt: Date;
  onClick?: () => void;
  className?: string;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

export function ProjectCard({
  title,
  description,
  updatedAt,
  onClick,
  className,
}: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-full flex-col items-start rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-white/20",
        className
      )}
    >
      <div className="flex w-full items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">
        {description}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Updated {formatTimeAgo(updatedAt)}
      </p>
    </button>
  );
}
