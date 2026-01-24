"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
}

export function Header({ title, subtitle, action, children }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button size="sm" className="gap-2">
              {action.icon}
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button onClick={action.onClick} size="sm" className="gap-2">
            {action.icon}
            {action.label}
          </Button>
        )
      )}
    </header>
  );
}
