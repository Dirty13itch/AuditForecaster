import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, BarChart3, DollarSign, Target } from "lucide-react";
import { TierSummaryCard } from "@/components/dashboard/TierSummaryCard";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TaxCreditPanel } from "@/components/dashboard/TaxCreditPanel";
import { MonthlyHighlights } from "@/components/dashboard/MonthlyHighlights";
import type { DashboardSummary, BuilderLeaderboardEntry } from "@shared/dashboardTypes";
import type { Forecast, Job } from "@shared/schema";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery<BuilderLeaderboardEntry[]>({
    queryKey: ["/api/dashboard/leaderboard"],
  });

  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery<Forecast[]>({
    queryKey: ["/api/forecasts"],
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const isLoading = summaryLoading || leaderboardLoading || forecastsLoading || jobsLoading;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Builder Performance Dashboard</h1>
            <p className="text-muted-foreground">Track ACH50 performance, rankings, and tax credits</p>
          </div>
          <Trophy className="h-10 w-10 text-warning" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-metric-total-inspections">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Inspections</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="text-total-inspections">
                      {summary?.totalInspections || 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="p-3 rounded-md bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-average-ach50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Average ACH50</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="text-average-ach50">
                      {summary?.averageACH50?.toFixed(2) || '0.00'}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Lower is better</p>
                </div>
                <div className="p-3 rounded-md bg-info/10">
                  <Target className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-pass-rate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pass Rate</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold text-success" data-testid="text-pass-rate">
                      {summary?.passRate?.toFixed(1) || '0.0'}%
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">≤3.0 ACH50</p>
                </div>
                <div className="p-3 rounded-md bg-success/10">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-tax-eligible">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">45L Eligible</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="text-tax-eligible">
                      {summary?.tax45LEligibleCount || 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Homes</p>
                </div>
                <div className="p-3 rounded-md bg-warning/10">
                  <DollarSign className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TierSummaryCard 
            tierDistribution={summary?.tierDistribution || []} 
            isLoading={summaryLoading}
          />
          
          <MonthlyHighlights 
            highlights={summary?.monthlyHighlights || []} 
            isLoading={summaryLoading}
          />
        </div>

        <LeaderboardTable 
          leaderboard={leaderboard} 
          isLoading={leaderboardLoading}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <TrendChart 
            forecasts={forecasts} 
            jobs={jobs}
            isLoading={forecastsLoading || jobsLoading}
          />
          
          <TaxCreditPanel 
            eligibleCount={summary?.tax45LEligibleCount || 0}
            totalCredits={summary?.totalPotentialTaxCredits || 0}
            isLoading={summaryLoading}
          />
        </div>
      </div>
    </div>
  );
}
