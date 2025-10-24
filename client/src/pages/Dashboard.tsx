import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, BarChart3, DollarSign, Target, Download, Mail, FileText } from "lucide-react";
import { TierSummaryCard } from "@/components/dashboard/TierSummaryCard";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TaxCreditPanel } from "@/components/dashboard/TaxCreditPanel";
import { MonthlyHighlights } from "@/components/dashboard/MonthlyHighlights";
import type { DashboardSummary, BuilderLeaderboardEntry } from "@shared/dashboardTypes";
import type { Forecast, Job } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function Dashboard() {
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState("");
  
  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/dashboard/export", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to download PDF");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `dashboard-report-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dashboard report downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const emailMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const response = await apiRequest("POST", "/api/dashboard/export/email", { emails });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      setEmailDialogOpen(false);
      setEmailAddresses("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDownload = () => {
    downloadMutation.mutate();
  };
  
  const handleEmailSubmit = () => {
    const emails = emailAddresses
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    if (emails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one email address",
        variant: "destructive",
      });
      return;
    }
    
    emailMutation.mutate(emails);
  };
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
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  disabled={downloadMutation.isPending || emailMutation.isPending}
                  data-testid="button-export-pdf"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={handleDownload}
                  disabled={downloadMutation.isPending}
                  data-testid="menuitem-download"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadMutation.isPending ? "Downloading..." : "Download"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setEmailDialogOpen(true)}
                  disabled={emailMutation.isPending}
                  data-testid="menuitem-email"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email to Managers
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Trophy className="h-10 w-10 text-warning" />
          </div>
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

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent data-testid="dialog-email-export">
          <DialogHeader>
            <DialogTitle>Email Dashboard Report</DialogTitle>
            <DialogDescription>
              Enter email addresses separated by commas to send the dashboard PDF report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-addresses">Email Addresses</Label>
              <Input
                id="email-addresses"
                placeholder="manager1@example.com, manager2@example.com"
                value={emailAddresses}
                onChange={(e) => setEmailAddresses(e.target.value)}
                data-testid="input-email-addresses"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple email addresses with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={emailMutation.isPending}
              data-testid="button-cancel-email"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEmailSubmit}
              disabled={emailMutation.isPending}
              data-testid="button-send-email"
            >
              {emailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
