import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Home,
  Briefcase,
  CheckCircle,
  DollarSign,
  FileText,
  Award,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import type { Builder } from "@shared/schema";

interface BuilderStats {
  totalDevelopments: number;
  totalLots: number;
  totalJobs: number;
  completedJobs: number;
  totalRevenue: number;
  activeAgreements: number;
  activePrograms: number;
  lastInteractionDate: string | null;
}

interface BuilderOverviewTabProps {
  builder: Builder;
}

export function BuilderOverviewTab({ builder }: BuilderOverviewTabProps) {
  const { data: stats, isLoading } = useQuery<BuilderStats>({
    queryKey: ["/api/builders", builder.id, "stats"],
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load builder statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Developments",
      value: stats.totalDevelopments,
      icon: Building2,
      color: "text-blue-600",
      testId: "stat-developments",
    },
    {
      title: "Total Lots",
      value: stats.totalLots,
      icon: Home,
      color: "text-green-600",
      testId: "stat-lots",
    },
    {
      title: "Total Jobs",
      value: stats.totalJobs,
      icon: Briefcase,
      color: "text-purple-600",
      testId: "stat-jobs",
    },
    {
      title: "Completed Jobs",
      value: stats.completedJobs,
      icon: CheckCircle,
      color: "text-emerald-600",
      testId: "stat-completed",
    },
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-amber-600",
      testId: "stat-revenue",
    },
    {
      title: "Active Agreements",
      value: stats.activeAgreements,
      icon: FileText,
      color: "text-indigo-600",
      testId: "stat-agreements",
    },
    {
      title: "Active Programs",
      value: stats.activePrograms,
      icon: Award,
      color: "text-pink-600",
      testId: "stat-programs",
    },
    {
      title: "Last Interaction",
      value: stats.lastInteractionDate
        ? format(new Date(stats.lastInteractionDate), "MMM d, yyyy")
        : "None",
      icon: MessageSquare,
      color: "text-cyan-600",
      testId: "stat-last-interaction",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Performance Overview</h2>
        <p className="text-muted-foreground">
          Key metrics and statistics for {builder.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover-elevate" data-testid={`card-${stat.testId}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-${stat.testId}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
