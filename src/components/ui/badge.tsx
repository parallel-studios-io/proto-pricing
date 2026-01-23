"use client";

import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/20",
        {
          "bg-white text-black": variant === "default",
          "bg-secondary text-white": variant === "secondary",
          "border border-border text-foreground": variant === "outline",
          "bg-red-500/20 text-red-400 border border-red-500/30": variant === "destructive",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
