"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  Target,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";

interface Segment {
  id: string;
  name: string;
  description: string;
  customer_count: number;
  total_revenue: number;
  avg_mrr: number;
  avg_ltv: number;
  churn_rate: number;
  retention_curve: number[];
}

interface HealthData {
  scoreDate: string;
  totalCustomers: number;
  avgHealthScore: number;
  distribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
  trendBreakdown: {
    improving: number;
    stable: number;
    declining: number;
  };
  atRiskCustomers: Array<{
    customer_id: string;
    health_score: number;
    churn_risk: number;
    customer: { name: string; mrr: number };
  }>;
  upgradeCandidates: Array<{
    customer_id: string;
    upgrade_readiness: number;
    customer: { name: string; mrr: number };
  }>;
}

interface EconomicsData {
  snapshot: {
    total_mrr: number;
    total_arr: number;
    total_customers: number;
    net_revenue_retention: number;
    gross_revenue_retention: number;
    mrr_growth_rate: number;
    concentration_risk_level: string;
    concentration_description: string;
  } | null;
  mrrBySegment: Record<string, { mrr: number; count: number }>;
}

interface Pattern {
  id: string;
  pattern_type: string;
  name: string;
  description: string;
  confidence: number;
  recommended_action: string;
}

export default function OntologyViewPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [economics, setEconomics] = useState<EconomicsData | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Get organization ID from context/auth
      const orgId = "demo-org-id";

      const [segmentsRes, healthRes, economicsRes, patternsRes] = await Promise.all([
        fetch(`/api/analytics/segments?organizationId=${orgId}`),
        fetch(`/api/analytics/health?organizationId=${orgId}`),
        fetch(`/api/analytics/economics?organizationId=${orgId}`),
        fetch(`/api/analytics/patterns?organizationId=${orgId}`),
      ]);

      const [segmentsData, healthData, economicsData, patternsData] = await Promise.all([
        segmentsRes.json(),
        healthRes.json(),
        economicsRes.json(),
        patternsRes.json(),
      ]);

      setSegments(segmentsData.segments || []);
      setHealth(healthData);
      setEconomics(economicsData);
      setPatterns(patternsData.patterns || []);
    } catch (error) {
      console.error("Failed to load ontology data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <a href="/ontology" className="mb-4 inline-block">
          <Button variant="ghost" className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Generator
          </Button>
        </a>
        <h1 className="text-3xl font-bold mb-2">Business Ontology</h1>
        <p className="text-muted-foreground">
          Your complete business model derived from customer data analysis.
        </p>
      </div>

      {/* Economics Overview */}
      {economics?.snapshot && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Unit Economics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total MRR</div>
                <div className="text-2xl font-bold">
                  €{economics.snapshot.total_mrr?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total ARR</div>
                <div className="text-2xl font-bold">
                  €{economics.snapshot.total_arr?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Net Revenue Retention</div>
                <div className="text-2xl font-bold">
                  {(economics.snapshot.net_revenue_retention || 0).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">MRR Growth Rate</div>
                <div className="text-2xl font-bold">
                  {(economics.snapshot.mrr_growth_rate || 0).toFixed(1)}%
                </div>
              </div>
            </div>

            {economics.snapshot.concentration_risk_level && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Revenue Concentration:</span>
                  <Badge
                    variant={
                      economics.snapshot.concentration_risk_level === "low"
                        ? "default"
                        : economics.snapshot.concentration_risk_level === "moderate"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {economics.snapshot.concentration_risk_level}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {economics.snapshot.concentration_description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="segments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="segments" className="gap-2">
            <Users className="h-4 w-4" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Activity className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="patterns" className="gap-2">
            <Target className="h-4 w-4" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Actions
          </TabsTrigger>
        </TabsList>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <div className="grid gap-4">
            {segments.map((segment) => (
              <Card key={segment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{segment.name}</CardTitle>
                      <CardDescription>{segment.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{segment.customer_count} customers</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Avg MRR</div>
                      <div className="font-semibold">
                        €{(segment.avg_mrr || 0).toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg LTV</div>
                      <div className="font-semibold">
                        €{(segment.avg_ltv || 0).toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                      <div className="font-semibold">
                        €{(segment.total_revenue || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Churn Rate</div>
                      <div className="font-semibold">
                        {((segment.churn_rate || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">12-Mo Retention</div>
                      <div className="font-semibold">
                        {segment.retention_curve?.[11]
                          ? `${(segment.retention_curve[11] * 100).toFixed(0)}%`
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {segments.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No segments found. Run the ontology generator to create segments.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          {health && (
            <>
              {/* Health Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold mb-2">
                        {health.avgHealthScore?.toFixed(0) || 0}
                      </div>
                      <div className="text-muted-foreground">Average Health Score</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                          Improving
                        </span>
                        <span className="font-semibold">{health.trendBreakdown?.improving || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <Minus className="h-4 w-4 text-gray-500" />
                          Stable
                        </span>
                        <span className="font-semibold">{health.trendBreakdown?.stable || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                          Declining
                        </span>
                        <span className="font-semibold">{health.trendBreakdown?.declining || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Healthy</span>
                        <Badge variant="default">{health.distribution?.healthy || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>At Risk</span>
                        <Badge variant="secondary">{health.distribution?.atRisk || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Critical</span>
                        <Badge variant="destructive">{health.distribution?.critical || 0}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* At Risk Customers */}
              {health.atRiskCustomers?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>At-Risk Customers</CardTitle>
                    <CardDescription>Customers with high churn probability</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {health.atRiskCustomers.slice(0, 5).map((customer, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">
                              {customer.customer?.name || "Unknown"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              €{customer.customer?.mrr || 0}/mo
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">
                              {((customer.churn_risk || 0) * 100).toFixed(0)}% risk
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-4">
            {patterns.map((pattern) => (
              <Card key={pattern.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{pattern.name}</CardTitle>
                      <CardDescription>{pattern.description}</CardDescription>
                    </div>
                    <Badge variant="outline">
                      {pattern.pattern_type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Confidence: {((pattern.confidence || 0) * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm font-medium text-primary">
                      {pattern.recommended_action}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {patterns.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No patterns detected. Run the ontology generator to detect patterns.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Upgrade Candidates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                  Upgrade Candidates
                </CardTitle>
                <CardDescription>Customers ready for tier upgrade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {health?.upgradeCandidates?.slice(0, 5).map((customer, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">
                          {customer.customer?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          €{customer.customer?.mrr || 0}/mo
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {((customer.upgrade_readiness || 0) * 100).toFixed(0)}% ready
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground py-4">
                      No upgrade candidates identified
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Churn Prevention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Churn Prevention
                </CardTitle>
                <CardDescription>Customers needing immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {health?.atRiskCustomers?.slice(0, 5).map((customer, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">
                          {customer.customer?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Health Score: {customer.health_score}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Take Action
                      </Button>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground py-4">
                      No at-risk customers identified
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
