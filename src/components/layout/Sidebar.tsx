"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PenSquare,
  Search,
  BarChart3,
  FolderOpen,
  Bot,
  Settings,
  Play,
  ArrowLeftRight,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_ORGANIZATION_ID } from "@/types/database";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "New chat", href: "/chat", icon: <PenSquare className="h-4 w-4" /> },
  { label: "Search chats", href: "/search", icon: <Search className="h-4 w-4" /> },
  { label: "Overview", href: "/overview", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Analysis", href: "/analysis", icon: <Play className="h-4 w-4" /> },
  { label: "Projects", href: "/projects", icon: <FolderOpen className="h-4 w-4" /> },
  { label: "Agents", href: "/agents", icon: <Bot className="h-4 w-4" /> },
  { label: "Connections", href: "/connections", icon: <Settings className="h-4 w-4" /> },
];

// Mock chat history - will be replaced with real data
const chatHistory = [
  { id: "1", preview: "@CFO analyze customer concentration" },
  { id: "2", preview: "@CRO what's our churn by segment" },
  { id: "3", preview: "@CPO review our pricing tiers" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    // Check sessionStorage first for instant display
    try {
      const cached = sessionStorage.getItem("proto-company-name");
      if (cached) setCompanyName(cached);
    } catch {
      // sessionStorage not available
    }
  }, []);

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo + Company */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-black font-bold text-sm">
            P
          </div>
          <span className="font-semibold">Proto</span>
        </div>
        {companyName && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{companyName}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Chat History */}
        <div className="mt-6">
          <h3 className="mb-2 px-3 text-xs font-medium text-muted-foreground">
            Chat History
          </h3>
          <ul className="space-y-1">
            {chatHistory.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/chat/${chat.id}`}
                  className="block truncate rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-white"
                >
                  {chat.preview}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Switch Company */}
      <div className="border-t border-border p-3">
        <Link
          href="/setup"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Switch Company
        </Link>
      </div>
    </aside>
  );
}
