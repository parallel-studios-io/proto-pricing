"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  Target,
  Activity,
  RefreshCw,
} from "lucide-react";

interface AnalyticsProgress {
  runId: string;
  status: "idle" | "running" | "completed" | "failed";
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

interface OntologySummary {
  generatedAt: string;
  customerCount: number;
  totalMrr: number;
  segmentCount: number;
  keyInsights: string[];
  healthDistribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
  primaryValueMetric: string | null;
  topPatterns: string[];
}

const STEPS = [
  { name: "Cohort retention analysis", icon: Clock },
  { name: "LTV calculation", icon: TrendingUp },
  { name: "Retention metrics", icon: Activity },
  { name: "Segmentation analysis", icon: Users },
  { name: "Pattern detection", icon: Target },
  { name: "Value metric discovery", icon: TrendingUp },
  { name: "Health scoring", icon: Activity },
  { name: "Summary generation", icon: CheckCircle2 },
];

export default function OntologyPage() {
  const [progress, setProgress] = useState<AnalyticsProgress>({
    runId: "",
    status: "idle",
    currentStep: "",
    totalSteps: 8,
    completedSteps: 0,
  });

  const [summary, setSummary] = useState<OntologySummary | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  // Check for existing analytics on mount
  useEffect(() => {
    checkExistingAnalytics();
  }, []);

  const checkExistingAnalytics = async () => {
    try {
      // TODO: Get organization ID from context/auth
      const orgId = "demo-org-id";
      const response = await fetch(`/api/analytics/refresh?organizationId=${orgId}`);
      const data = await response.json();

      if (data.lastRun) {
        setLastRun(new Date(data.lastRun));
        if (data.status === "completed" && data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (error) {
      console.error("Failed to check existing analytics:", error);
    }
  };

  const startAnalytics = async () => {
    setProgress({
      ...progress,
      status: "running",
      currentStep: "Initializing...",
      completedSteps: 0,
      startedAt: new Date(),
    });

    try {
      // TODO: Get organization ID from context/auth
      const orgId = "demo-org-id";

      const response = await fetch("/api/analytics/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      const result = await response.json();

      if (result.success) {
        setProgress({
          ...progress,
          status: "completed",
          currentStep: "Complete",
          completedSteps: 8,
          completedAt: new Date(),
        });
        setSummary(result.summary);
        setLastRun(new Date());
      } else {
        throw new Error(result.error || "Failed to run analytics");
      }
    } catch (error) {
      setProgress({
        ...progress,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const progressPercent = (progress.completedSteps / progress.totalSteps) * 100;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ontology Generator</h1>
        <p className="text-muted-foreground">
          Analyze your customer data to build a comprehensive business ontology with segments,
          economics, patterns, and insights.
        </p>
      </div>

      {/* Main Action Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Generate Ontology
          </CardTitle>
          <CardDescription>
            Run analytics on your Stripe and HubSpot data to derive segments, calculate LTV,
            detect patterns, and build your business ontology.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progress.status === "idle" && (
            <div className="space-y-4">
              {lastRun ? (
                <p className="text-sm text-muted-foreground">
                  Last run: {lastRun.toLocaleDateString()} at {lastRun.toLocaleTimeString()}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No previous analysis found. Run the analytics to generate your ontology.
                </p>
              )}
              <Button onClick={startAnalytics} size="lg" className="gap-2">
                <PlayCircle className="h-5 w-5" />
                {lastRun ? "Regenerate Ontology" : "Generate Ontology"}
              </Button>
            </div>
          )}

          {progress.status === "running" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Analyzing your data...</span>
              </div>

              <Progress value={progressPercent} className="h-2" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isComplete = index < progress.completedSteps;
                  const isCurrent = index === progress.completedSteps;

                  return (
                    <div
                      key={step.name}
                      className={`flex items-center gap-2 p-3 rounded-lg ${
                        isComplete
                          ? "bg-green-50 text-green-700"
                          : isCurrent
                          ? "bg-blue-50 text-blue-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span className="text-sm">{step.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {progress.status === "completed" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Analysis complete!</span>
              </div>
              <Button onClick={startAnalytics} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Run Again
              </Button>
            </div>
          )}

          {progress.status === "failed" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Analysis failed</span>
              </div>
              <p className="text-sm text-muted-foreground">{progress.error}</p>
              <Button onClick={startAnalytics} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      {summary && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Ontology Summary</h2>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Customers Analyzed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.customerCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total MRR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{summary.totalMrr.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Segments Identified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.segmentCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Primary Value Metric
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium truncate">
                  {summary.primaryValueMetric || "Not determined"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Health Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-700">
                    {summary.healthDistribution.healthy}
                  </div>
                  <div className="text-sm text-green-600">Healthy</div>
                </div>
                <div className="flex-1 p-4 bg-yellow-50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-700">
                    {summary.healthDistribution.atRisk}
                  </div>
                  <div className="text-sm text-yellow-600">At Risk</div>
                </div>
                <div className="flex-1 p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-700">
                    {summary.healthDistribution.critical}
                  </div>
                  <div className="text-sm text-red-600">Critical</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {summary.keyInsights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Detected Patterns */}
          {summary.topPatterns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detected Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.topPatterns.map((pattern, index) => (
                    <Badge key={index} variant="secondary">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Full Ontology Button */}
          <div className="flex justify-center">
            <a href="/ontology/view">
              <Button size="lg">View Full Ontology →</Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
