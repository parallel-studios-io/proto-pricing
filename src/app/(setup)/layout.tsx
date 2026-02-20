import { SetupProvider } from "@/contexts/SetupContext";
import { SetupProgress } from "@/components/setup/SetupProgress";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SetupProvider>
      <div className="flex h-screen flex-col bg-background">
        <SetupProgress />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SetupProvider>
  );
}
