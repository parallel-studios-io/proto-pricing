"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

interface CompanyFormProps {
  onSubmit: (description: string) => void;
  isSubmitting: boolean;
}

export function CompanyForm({ onSubmit, isSubmitting }: CompanyFormProps) {
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-4">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe your B2B SaaS company in a few sentences. For example: 'We are a project management platform for construction companies. We charge $49-299/month based on number of active projects. We have about 2,000 customers and $3M ARR.'"
        className="w-full rounded-lg border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={5}
        disabled={isSubmitting}
      />
      <button
        onClick={() => onSubmit(description)}
        disabled={!description.trim() || isSubmitting}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className="h-4 w-4" />
        {isSubmitting ? "Generating profile..." : "Generate with AI"}
      </button>
    </div>
  );
}
