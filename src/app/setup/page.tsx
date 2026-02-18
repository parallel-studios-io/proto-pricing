"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Code2, PenLine } from "lucide-react";
import { PresetCard } from "@/components/setup/PresetCard";
import { CompanyForm } from "@/components/setup/CompanyForm";

type Selection = "myparcel" | "devtools" | "custom" | null;

export default function SetupPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePresetSelect(preset: "myparcel" | "devtools") {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/company/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Setup failed");

      // Store company name for sidebar display
      if (data.profile?.name) {
        try { sessionStorage.setItem("proto-company-name", data.profile.name); } catch {}
      }

      router.push(`/setup/generating?organizationId=${data.organizationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setIsSubmitting(false);
    }
  }

  async function handleCustomSubmit(description: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/company/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Setup failed");

      // Store company name for sidebar display
      if (data.profile?.name) {
        try { sessionStorage.setItem("proto-company-name", data.profile.name); } catch {}
      }

      router.push(`/setup/generating?organizationId=${data.organizationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Set Up Your Company</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a preset to see the platform in action, or describe your own company to generate a custom demo.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Presets</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PresetCard
              name="MyParcel"
              description="Shipping platform for e-commerce"
              icon={Package}
              details={[
                "EUR currency, Netherlands",
                "27K customers, €110M ARR",
                "4 segments, 5 tiers",
                "Competitors: Sendcloud, Shippo",
              ]}
              selected={selection === "myparcel"}
              onClick={() => setSelection("myparcel")}
            />
            <PresetCard
              name="StreamAPI"
              description="Developer communication platform"
              icon={Code2}
              details={[
                "USD currency, United States",
                "8.5K customers, $12M ARR",
                "4 segments, 5 tiers",
                "Competitors: Twilio, SendGrid",
              ]}
              selected={selection === "devtools"}
              onClick={() => setSelection("devtools")}
            />
          </div>

          {(selection === "myparcel" || selection === "devtools") && (
            <button
              onClick={() => handlePresetSelect(selection)}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Setting up..." : `Use ${selection === "myparcel" ? "MyParcel" : "StreamAPI"} Preset`}
            </button>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">OR</span>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`rounded-xl border-2 p-6 transition-all cursor-pointer ${
              selection === "custom"
                ? "border-blue-500 bg-blue-500/10"
                : "border-border bg-card hover:border-blue-500/50"
            }`}
            onClick={() => setSelection("custom")}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
              <PenLine className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">Describe Your Company</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Tell us about your B2B SaaS business and AI will generate a complete company profile with synthetic data.
            </p>
            {selection === "custom" && (
              <CompanyForm onSubmit={handleCustomSubmit} isSubmitting={isSubmitting} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
