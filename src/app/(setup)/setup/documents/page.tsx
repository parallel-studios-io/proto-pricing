"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Upload,
  FileText,
  X,
  Check,
} from "lucide-react";
import { useSetup } from "@/contexts/SetupContext";
import type { UploadedFile } from "@/types/setup";
import { cn } from "@/lib/utils";

export default function SetupDocumentsPage() {
  const router = useRouter();
  const setup = useSetup();

  const [isDragging, setIsDragging] = useState(false);
  const [context, setContext] = useState(setup.additionalContext);

  // --- File handling ---

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      Array.from(e.dataTransfer.files).forEach((file) => {
        setup.addFile({ name: file.name, size: file.size, type: file.type });
      });
    },
    [setup]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      Array.from(e.target.files).forEach((file) => {
        setup.addFile({ name: file.name, size: file.size, type: file.type });
      });
    },
    [setup]
  );

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // --- Navigation ---

  function handleContinue() {
    setup.setAdditionalContext(context);
    setup.completeStep("documents");
    setup.setStep("generating");
    router.push("/setup/generating");
  }

  const hasContent = setup.uploadedFiles.length > 0 || context.trim().length > 0;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Add Context
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload documents or add extra context to help the AI build a more
            accurate model of your business. This is optional.
          </p>
        </div>

        {/* File upload drop zone */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Documents
          </h2>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              isDragging
                ? "border-blue-500 bg-blue-500/5"
                : "border-border hover:border-blue-500/50"
            )}
          >
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm">
              <span className="font-medium text-blue-400">Click to upload</span>
              {" or drag and drop"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV, Excel, PDF, Word, Text (max 10MB)
            </p>
          </div>

          {/* Uploaded files */}
          {setup.uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {setup.uploadedFiles.map((file: UploadedFile, index: number) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10 text-blue-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-xs">Ready</span>
                    </div>
                    <button
                      onClick={() => setup.removeFile(file.name)}
                      className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional context textarea */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Additional Context
          </h2>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Anything else the AI should know about your business? For example: key competitors, recent pricing changes, market dynamics, strategic goals..."
            className="w-full rounded-lg border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={5}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {hasContent
              ? `${setup.uploadedFiles.length} file${setup.uploadedFiles.length !== 1 ? "s" : ""} uploaded`
              : "No additional context added"}
          </p>
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            {hasContent ? "Continue" : "Skip for now"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
