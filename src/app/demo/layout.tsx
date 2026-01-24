"use client";

import { DemoProvider } from "@/contexts/DemoContext";
import { DemoProgress } from "@/components/demo/DemoProgress";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Progress bar at top */}
        <DemoProgress />

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </DemoProvider>
  );
}
