import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  ClipboardCheck,
  Star,
  Trophy,
  Target,
  Clock,
  FileCheck,
  Users,
  BarChart3,
  ShieldCheck,
  GraduationCap
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { Link } from "wouter";

interface PerformanceSummary {
  teamAverageScore: number;
  jobsNeedingReview: number;
  criticalIssues: number;
  complianceRate: number;
  trend: {
    score: number;
    direction: 'up' | 'down' | 'stable';
  };
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  score: number;
  jobsCompleted: number;
  completionRate: number;
  badges: string[];
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

interface RecentActivity {
  id: string;
  type: 'inspection' | 'review' | 'failed' | 'corrective';
  jobName: string;
  jobId: string;
  inspectorName: string;
  score?: number;
  issue?: string;
  timestamp: Date;
  status: string;
}

export default function QualityAssurance() {
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [dateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  // Fetch performance summary
  const { data: summary, isLoading: summaryLoading } = useQuery<PerformanceSummary>({
    queryKey: ['/api/qa/analytics/summary', dateRange],
    enabled: false // Will be enabled when backend is ready
  });

  // Fetch leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/qa/analytics/leaderboard/month'],
    enabled: false // Will be enabled when backend is ready
  });

  // Fetch jobs needing review
  const { data: pendingReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['/api/qa/scores/review-status/pending'],
    enabled: false // Will be enabled when backend is ready
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ['/api/qa/analytics/recent-activity'],
    enabled: false // Will be enabled when backend is ready
  });

  // Mock data for development
  const mockSummary: PerformanceSummary = {
    teamAverageScore: 87.5,
    jobsNeedingReview: 12,
    criticalIssues: 3,
    complianceRate: 94.2,
    trend: {
      score: 2.3,
      direction: 'up'
    }
  };

  const mockLeaderboard: LeaderboardEntry[] = [
    {
      userId: "1",
      name: "John Doe",
      score: 95.5,
      jobsCompleted: 42,
      completionRate: 98,
      badges: ["quality-champion", "streak-master"],
      rank: 1,
      trend: 'up'
    },
    {
      userId: "2", 
      name: "Jane Smith",
      score: 93.2,
      jobsCompleted: 38,
      completionRate: 95,
      badges: ["accuracy-expert"],
      rank: 2,
      trend: 'stable'
    },
    {
      userId: "3",
      name: "Mike Johnson",
      score: 91.8,
      jobsCompleted: 35,
      completionRate: 92,
      badges: ["rising-star"],
      rank: 3,
      trend: 'up'
    }
  ];

  const mockActivity: RecentActivity[] = [
    {
      id: "1",
      type: 'inspection',
      jobName: "123 Main St - Blower Door Test",
      jobId: "job-1",
      inspectorName: "John Doe",
      score: 95,
      timestamp: new Date(),
      status: "completed"
    },
    {
      id: "2",
      type: 'review',
      jobName: "456 Oak Ave - Full Inspection",
      jobId: "job-2",
      inspectorName: "Jane Smith",
      timestamp: subDays(new Date(), 1),
      status: "pending"
    },
    {
      id: "3",
      type: 'failed',
      jobName: "789 Pine St - Duct Test",
      jobId: "job-3",
      inspectorName: "Mike Johnson",
      score: 65,
      issue: "Missing required photos",
      timestamp: subDays(new Date(), 1),
      status: "needs_improvement"
    }
  ];

  const displaySummary = summary || mockSummary;
  const displayLeaderboard = leaderboard || mockLeaderboard;
  const displayActivity = recentActivity || mockActivity;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inspection':
        return <FileCheck className="w-4 h-4" />;
      case 'review':
        return <ClipboardCheck className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'corrective':
        return <Target className="w-4 h-4 text-warning" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'quality-champion':
        return <Trophy className="w-3 h-3" />;
      case 'streak-master':
        return <Star className="w-3 h-3" />;
      case 'accuracy-expert':
        return <Target className="w-3 h-3" />;
      case 'rising-star':
        return <TrendingUp className="w-3 h-3" />;
      default:
        return <CheckCircle2 className="w-3 h-3" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quality Assurance</h1>
          <p className="text-muted-foreground mt-1">
            Monitor inspection quality and team performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/qa/scoring">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Score Inspection
            </Link>
          </Button>
          <Button asChild>
            <Link href="/qa/review">
              <FileCheck className="w-4 h-4 mr-2" />
              Review Queue
            </Link>
          </Button>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Team Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {displaySummary.teamAverageScore.toFixed(1)}%
              </span>
              {displaySummary.trend.direction === 'up' ? (
                <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {displaySummary.trend.score.toFixed(1)}%
                </span>
              ) : displaySummary.trend.direction === 'down' ? (
                <span className="flex items-center text-sm text-destructive">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  {displaySummary.trend.score.toFixed(1)}%
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Stable</span>
              )}
            </div>
            <Progress value={displaySummary.teamAverageScore} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Jobs Needing Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{displaySummary.jobsNeedingReview}</span>
              <ClipboardCheck className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <Button variant="link" className="p-0 h-auto mt-2" asChild>
              <Link href="/qa/review">View pending reviews →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-destructive">
                {displaySummary.criticalIssues}
              </span>
              <AlertCircle className="w-8 h-8 text-destructive opacity-50" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {displaySummary.complianceRate.toFixed(1)}%
              </span>
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <Progress value={displaySummary.complianceRate} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="pending">Pending Reviews</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inspector Leaderboard */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>This month's quality leaders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displayLeaderboard.map((entry) => (
                    <div key={entry.userId} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                        {entry.rank}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={entry.avatarUrl} />
                        <AvatarFallback>
                          {entry.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{entry.name}</p>
                          {entry.trend === 'up' && (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          )}
                          {entry.trend === 'down' && (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className={getScoreColor(entry.score)}>
                            {entry.score.toFixed(1)}%
                          </span>
                          <span>{entry.jobsCompleted} jobs</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {entry.badges.map(badge => (
                            <Badge key={badge} variant="secondary" className="px-1 py-0">
                              {getBadgeIcon(badge)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/qa/leaderboard">View Full Leaderboard</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest QA events and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4 pr-4">
                    {displayActivity.map((activity) => (
                      <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {activity.jobName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Inspector: {activity.inspectorName}
                              </p>
                            </div>
                            {activity.score !== undefined && (
                              <Badge 
                                variant={activity.score >= 80 ? "default" : "destructive"}
                                className="ml-2"
                              >
                                {activity.score}%
                              </Badge>
                            )}
                          </div>
                          {activity.issue && (
                            <p className="text-sm text-destructive">{activity.issue}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{format(activity.timestamp, "MMM d, h:mm a")}</span>
                            <Badge variant="outline" className="text-xs">
                              {activity.status}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/jobs/${activity.jobId}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Active Inspectors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">12</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Avg Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">94%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  First Pass Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">88%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Training Due
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">3</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>Jobs awaiting quality review</CardDescription>
            </CardHeader>
            <CardContent>
              {reviewsLoading ? (
                <p className="text-muted-foreground">Loading pending reviews...</p>
              ) : (
                <p className="text-muted-foreground">
                  {displaySummary.jobsNeedingReview} jobs need review
                </p>
              )}
              <Button className="mt-4" asChild>
                <Link href="/qa/review">Go to Review Queue</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists">
          <Card>
            <CardHeader>
              <CardTitle>QA Checklists</CardTitle>
              <CardDescription>Manage inspection checklists and templates</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/qa/checklists">Manage Checklists</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Individual and team performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/qa/performance">View Performance</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle>Training Needs</CardTitle>
              <CardDescription>Identified areas for improvement and training</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Photo Quality Training</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    3 inspectors need training on proper photo documentation
                  </p>
                  <Progress value={40} className="mb-2" />
                  <Button size="sm" variant="outline">Schedule Training</Button>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Compliance Updates</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    New Minnesota Code requirements training
                  </p>
                  <Progress value={75} className="mb-2" />
                  <Button size="sm" variant="outline">Schedule Training</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}