"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Code2, PenLine, ArrowRight, Globe, Building2 } from "lucide-react";
import { PresetCard } from "@/components/setup/PresetCard";
import { useSetup } from "@/contexts/SetupContext";

type Selection = "myparcel" | "devtools" | "custom" | null;

export default function SetupCompanyPage() {
  const router = useRouter();
  const setup = useSetup();

  const [selection, setSelection] = useState<Selection>(
    setup.selectedPreset as Selection
  );
  const [companyName, setCompanyName] = useState(setup.companyName);
  const [companyUrl, setCompanyUrl] = useState(setup.companyUrl);
  const [description, setDescription] = useState(setup.companyDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setIsSubmitting(true);
    setError(null);

    try {
      const isPreset = selection === "myparcel" || selection === "devtools";

      const body: Record<string, string> = isPreset
        ? { preset: selection! }
        : { description, name: companyName, website: companyUrl };

      const res = await fetch("/api/company/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Setup failed");

      // Store company name for sidebar display
      const name = data.profile?.name || companyName;
      if (name) {
        try {
          sessionStorage.setItem("proto-company-name", name);
        } catch {}
      }

      // Update setup context
      setup.setCompanyInfo({
        companyName: name || "",
        companyUrl,
        companyDescription: description,
        selectedPreset: isPreset ? selection : null,
        organizationId: data.organizationId,
      });
      setup.completeStep("company");
      setup.setStep("connections");

      router.push("/setup/connections");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setIsSubmitting(false);
    }
  }

  const canContinue =
    selection === "myparcel" ||
    selection === "devtools" ||
    (selection === "custom" && description.trim().length > 10);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Set Up Your Company
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a preset to see the platform in action, or describe your own
            company to generate a custom analysis.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Presets */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Quick Start — Presets
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PresetCard
              name="MyParcel"
              description="Shipping platform for e-commerce"
              icon={Package}
              details={[
                "EUR currency, Netherlands",
                "27K customers, \u20AC110M ARR",
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
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">
              OR
            </span>
          </div>
        </div>

        {/* Custom company */}
        <div className="space-y-4">
          <div
            className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${
              selection === "custom"
                ? "border-blue-500 bg-blue-500/10"
                : "border-border bg-card hover:border-blue-500/50"
            }`}
            onClick={() => setSelection("custom")}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
              <PenLine className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">
              Describe Your Company
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Tell us about your B2B SaaS business and AI will generate a
              complete business model.
            </p>

            {selection === "custom" && (
              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                {/* Company Name */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      <Building2 className="mr-1 inline h-3.5 w-3.5" />
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Inc."
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      <Globe className="mr-1 inline h-3.5 w-3.5" />
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={companyUrl}
                      onChange={(e) => setCompanyUrl(e.target.value)}
                      placeholder="https://acme.com"
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                    Company Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your B2B SaaS company in a few sentences. For example: 'We are a project management platform for construction companies. We charge $49-299/month based on number of active projects. We have about 2,000 customers and $3M ARR.'"
                    className="w-full rounded-lg border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={4}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Continue button */}
        {canContinue && (
          <button
            onClick={handleContinue}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              "Setting up..."
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
