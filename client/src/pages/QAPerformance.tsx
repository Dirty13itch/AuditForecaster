import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  User,
  Users,
  Trophy,
  Target,
  Award,
  Calendar,
  Download,
  FileText,
  BarChart3,
  Activity,
  GraduationCap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface PerformanceMetric {
  userId: string;
  name: string;
  period: string;
  avgScore: number;
  jobsCompleted: number;
  jobsReviewed: number;
  onTimeRate: number;
  firstPassRate: number;
  customerSatisfaction: number;
  strongAreas: string[];
  improvementAreas: string[];
  trend: 'up' | 'down' | 'stable';
}

interface TeamPerformance {
  month: string;
  avgScore: number;
  completionRate: number;
  complianceRate: number;
  customerSatisfaction: number;
}

interface CategoryBreakdown {
  category: string;
  score: number;
  fullMark: number;
}

export default function QAPerformance() {
  const [selectedView, setSelectedView] = useState<'individual' | 'team'>('individual');
  const [selectedUserId, setSelectedUserId] = useState("user-1");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [dateRange] = useState({
    start: startOfMonth(subMonths(new Date(), 5)),
    end: endOfMonth(new Date())
  });

  // Fetch individual performance
  const { data: individualMetric, isLoading: individualLoading } = useQuery<PerformanceMetric>({
    queryKey: ['/api/qa/performance', selectedUserId, selectedPeriod],
    enabled: false // Will be enabled when backend is ready
  });

  // Fetch team performance
  const { data: teamMetrics, isLoading: teamLoading } = useQuery<TeamPerformance[]>({
    queryKey: ['/api/qa/performance/team', selectedPeriod, dateRange],
    enabled: false // Will be enabled when backend is ready
  });

  // Mock data
  const mockIndividualMetric: PerformanceMetric = {
    userId: "user-1",
    name: "John Doe",
    period: "month",
    avgScore: 88.5,
    jobsCompleted: 42,
    jobsReviewed: 38,
    onTimeRate: 95,
    firstPassRate: 82,
    customerSatisfaction: 4.6,
    strongAreas: ["Photo Quality", "Documentation", "Timeliness"],
    improvementAreas: ["Calculation Accuracy", "Compliance Checks"],
    trend: 'up'
  };

  const mockTeamMetrics: TeamPerformance[] = [
    { month: "Jun", avgScore: 82, completionRate: 88, complianceRate: 90, customerSatisfaction: 4.2 },
    { month: "Jul", avgScore: 84, completionRate: 90, complianceRate: 92, customerSatisfaction: 4.3 },
    { month: "Aug", avgScore: 85, completionRate: 91, complianceRate: 93, customerSatisfaction: 4.4 },
    { month: "Sep", avgScore: 86, completionRate: 92, complianceRate: 94, customerSatisfaction: 4.5 },
    { month: "Oct", avgScore: 87, completionRate: 93, complianceRate: 95, customerSatisfaction: 4.5 },
    { month: "Nov", avgScore: 88, completionRate: 94, complianceRate: 96, customerSatisfaction: 4.6 }
  ];

  const mockCategoryBreakdown: CategoryBreakdown[] = [
    { category: 'Completeness', score: 92, fullMark: 100 },
    { category: 'Accuracy', score: 85, fullMark: 100 },
    { category: 'Compliance', score: 88, fullMark: 100 },
    { category: 'Photo Quality', score: 95, fullMark: 100 },
    { category: 'Timeliness', score: 90, fullMark: 100 }
  ];

  const mockTeamMembers = [
    { id: "user-1", name: "John Doe", score: 88.5, trend: 'up' },
    { id: "user-2", name: "Jane Smith", score: 92.3, trend: 'up' },
    { id: "user-3", name: "Mike Johnson", score: 85.7, trend: 'stable' },
    { id: "user-4", name: "Sarah Wilson", score: 90.1, trend: 'down' },
    { id: "user-5", name: "Tom Brown", score: 87.4, trend: 'up' }
  ];

  const displayMetric = individualMetric || mockIndividualMetric;
  const displayTeamMetrics = teamMetrics || mockTeamMetrics;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  const { toast } = useToast();

  const exportReport = () => {
    // Implement PDF/Excel export
    toast({
      title: "Export Started",
      description: "Generating performance report...",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">QA Performance</h1>
          <p className="text-muted-foreground mt-1">
            Individual and team performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as 'individual' | 'team')}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="individual">
            <User className="w-4 h-4 mr-2" />
            Individual
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Inspector Selector */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Select Inspector</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-4">
                      {mockTeamMembers.map((member) => (
                        <div
                          key={member.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedUserId === member.id
                              ? "bg-accent border-accent-foreground/20"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => setSelectedUserId(member.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{member.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-sm font-medium ${getScoreColor(member.score)}`}>
                                  {member.score}%
                                </span>
                                {member.trend === 'up' && (
                                  <TrendingUp className="w-3 h-3 text-green-500" />
                                )}
                                {member.trend === 'down' && (
                                  <TrendingDown className="w-3 h-3 text-red-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="lg:col-span-3 space-y-6">
              {/* Performance Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Average Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${getScoreColor(displayMetric.avgScore)}`}>
                        {displayMetric.avgScore}%
                      </span>
                      {displayMetric.trend === 'up' && (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Jobs Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{displayMetric.jobsCompleted}</p>
                    <p className="text-sm text-muted-foreground">
                      {displayMetric.jobsReviewed} reviewed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">On-Time Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{displayMetric.onTimeRate}%</p>
                    <Progress value={displayMetric.onTimeRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">First Pass Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{displayMetric.firstPassRate}%</p>
                    <Progress value={displayMetric.firstPassRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Performance Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Score Trend</CardTitle>
                    <CardDescription>Performance over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={displayTeamMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[70, 100]} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="avgScore"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Category Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Breakdown</CardTitle>
                    <CardDescription>Score by assessment category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={mockCategoryBreakdown}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Strengths and Improvements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Strong Areas
                    </CardTitle>
                    <CardDescription>Top performing categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {displayMetric.strongAreas.map((area, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="font-medium">{area}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      Improvement Areas
                    </CardTitle>
                    <CardDescription>Categories needing focus</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {displayMetric.improvementAreas.map((area, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                            <span className="font-medium">{area}</span>
                          </div>
                          <Button size="sm" variant="outline">
                            <GraduationCap className="w-4 h-4 mr-2" />
                            Training
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Achievement Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Achievements & Milestones
                  </CardTitle>
                  <CardDescription>Recognition for excellent performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <p className="font-medium">Quality Champion</p>
                      <p className="text-xs text-muted-foreground">3 months &gt;90%</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg opacity-50">
                      <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="font-medium">Accuracy Expert</p>
                      <p className="text-xs text-muted-foreground">95% accuracy</p>
                      <p className="text-xs font-medium mt-1">In Progress</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <Activity className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="font-medium">Consistent Performer</p>
                      <p className="text-xs text-muted-foreground">20 streak</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg opacity-50">
                      <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <p className="font-medium">Master Inspector</p>
                      <p className="text-xs text-muted-foreground">100 jobs 90%+</p>
                      <p className="text-xs font-medium mt-1">42/100</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6 mt-6">
          {/* Team Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Team Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">87.8%</span>
                  <span className="text-sm text-green-600 dark:text-green-400">+2.3%</span>
                </div>
                <Progress value={87.8} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Jobs Reviewed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">186</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Compliance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">96%</p>
                <Progress value={96} className="mt-3" />
              </CardContent>
            </Card>
          </div>

          {/* Team Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Trends</CardTitle>
              <CardDescription>Key metrics over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={displayTeamMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[70, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    name="Average Score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="Completion Rate"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="complianceRate"
                    name="Compliance Rate"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance Comparison</CardTitle>
              <CardDescription>Team performance by assessment category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockCategoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="hsl(var(--primary))">
                    {mockCategoryBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.score >= 90 ? "#10b981" : entry.score >= 80 ? "hsl(var(--primary))" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Team Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Team Leaderboard</CardTitle>
              <CardDescription>Individual performance rankings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTeamMembers
                  .sort((a, b) => b.score - a.score)
                  .map((member, index) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                        {index + 1}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getScoreColor(member.score)}`}>
                          {member.score}%
                        </span>
                        {member.trend === 'up' && (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                        {member.trend === 'down' && (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      {index === 0 && (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Training Needs Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Team Training Needs
              </CardTitle>
              <CardDescription>Identified areas for team improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">Calculation Accuracy</h4>
                      <p className="text-sm text-muted-foreground">
                        5 team members scoring below 80%
                      </p>
                    </div>
                    <Badge variant="destructive">High Priority</Badge>
                  </div>
                  <Progress value={65} className="mb-2" />
                  <Button size="sm">Schedule Training</Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">Photo Documentation</h4>
                      <p className="text-sm text-muted-foreground">
                        3 team members need improvement
                      </p>
                    </div>
                    <Badge variant="secondary">Medium Priority</Badge>
                  </div>
                  <Progress value={78} className="mb-2" />
                  <Button size="sm">Schedule Training</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}