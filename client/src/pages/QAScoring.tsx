import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Camera,
  Clock,
  FileText,
  Calculator,
  Shield,
  TrendingUp,
  Save,
  Send,
  ChevronLeft,
  AlertTriangle,
  Star,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Job, QaInspectionScore } from "@shared/schema";

interface ScoringCategory {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  description: string;
  icon: React.ReactNode;
  items: {
    name: string;
    passed: boolean;
    required: boolean;
    details?: string;
  }[];
}

export default function QAScoring() {
  const { jobId } = useParams();
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState(jobId || "");
  
  const [categories, setCategories] = useState<ScoringCategory[]>([
    {
      name: "Completeness",
      weight: 25,
      score: 0,
      maxScore: 100,
      description: "All required fields, tests, and documentation completed",
      icon: <ClipboardCheck className="w-5 h-5" />,
      items: [
        { name: "All required fields filled", passed: false, required: true },
        { name: "All tests performed", passed: false, required: true },
        { name: "Required photos taken", passed: false, required: true },
        { name: "Customer information complete", passed: false, required: false },
        { name: "Equipment data recorded", passed: false, required: false }
      ]
    },
    {
      name: "Accuracy",
      weight: 25,
      score: 0,
      maxScore: 100,
      description: "Calculations correct, measurements reasonable, data consistent",
      icon: <Calculator className="w-5 h-5" />,
      items: [
        { name: "Calculations verified", passed: false, required: true },
        { name: "Measurements within range", passed: false, required: true },
        { name: "Data consistency checked", passed: false, required: true },
        { name: "No contradictory values", passed: false, required: false },
        { name: "Cross-references valid", passed: false, required: false }
      ]
    },
    {
      name: "Compliance",
      weight: 25,
      score: 0,
      maxScore: 100,
      description: "Minnesota Code requirements, safety protocols, standards",
      icon: <Shield className="w-5 h-5" />,
      items: [
        { name: "Minnesota Code requirements met", passed: false, required: true },
        { name: "Safety protocols followed", passed: false, required: true },
        { name: "Documentation standards met", passed: false, required: true },
        { name: "45L requirements satisfied", passed: false, required: false },
        { name: "Company policies adhered to", passed: false, required: false }
      ]
    },
    {
      name: "Photo Quality",
      weight: 15,
      score: 0,
      maxScore: 100,
      description: "Clear images, proper angles, annotations when needed",
      icon: <Camera className="w-5 h-5" />,
      items: [
        { name: "Photos clear and focused", passed: false, required: true },
        { name: "Proper angles/coverage", passed: false, required: true },
        { name: "Annotations present", passed: false, required: false },
        { name: "All required views captured", passed: false, required: true },
        { name: "Lighting adequate", passed: false, required: false }
      ]
    },
    {
      name: "Timeliness",
      weight: 10,
      score: 0,
      maxScore: 100,
      description: "Submitted on time, quick turnaround, schedule adherence",
      icon: <Clock className="w-5 h-5" />,
      items: [
        { name: "Submitted on time", passed: false, required: true },
        { name: "Quick turnaround", passed: false, required: false },
        { name: "Schedule adhered to", passed: false, required: false },
        { name: "Updates provided", passed: false, required: false }
      ]
    }
  ]);

  const [reviewNotes, setReviewNotes] = useState("");
  const [criticalIssues, setCriticalIssues] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [reviewStatus, setReviewStatus] = useState<string>("pending");

  // Fetch job details
  const { data: job, isLoading: jobLoading } = useQuery<Job>({
    queryKey: ['/api/jobs', selectedJobId],
    enabled: !!selectedJobId
  });

  // Fetch existing QA score if any
  const { data: existingScore } = useQuery<QaInspectionScore>({
    queryKey: ['/api/qa/scores/job', selectedJobId],
    enabled: !!selectedJobId
  });

  // Save QA score mutation
  const saveScoreMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingScore) {
        return apiRequest(`/api/qa/scores/${existingScore.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
      } else {
        return apiRequest('/api/qa/scores', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Score saved",
        description: "QA score has been successfully saved"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/qa/scores'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save QA score",
        variant: "destructive"
      });
    }
  });

  // Calculate total score
  const calculateTotalScore = () => {
    let totalWeightedScore = 0;
    categories.forEach(category => {
      const weightedScore = (category.score / 100) * category.weight;
      totalWeightedScore += weightedScore;
    });
    return Math.round(totalWeightedScore);
  };

  // Get grade based on score
  const getGrade = (score: number) => {
    if (score >= 90) return { grade: "A", color: "text-green-600 dark:text-green-400" };
    if (score >= 80) return { grade: "B", color: "text-blue-600 dark:text-blue-400" };
    if (score >= 70) return { grade: "C", color: "text-yellow-600 dark:text-yellow-400" };
    if (score >= 60) return { grade: "D", color: "text-orange-600 dark:text-orange-400" };
    return { grade: "F", color: "text-destructive" };
  };

  // Auto-calculate category scores based on items
  const updateCategoryScore = (categoryIndex: number) => {
    const category = categories[categoryIndex];
    const requiredItems = category.items.filter(item => item.required);
    const optionalItems = category.items.filter(item => !item.required);
    
    const requiredPassed = requiredItems.filter(item => item.passed).length;
    const optionalPassed = optionalItems.filter(item => item.passed).length;
    
    // Required items are worth 80%, optional items worth 20%
    const requiredScore = requiredItems.length > 0 ? (requiredPassed / requiredItems.length) * 80 : 80;
    const optionalScore = optionalItems.length > 0 ? (optionalPassed / optionalItems.length) * 20 : 20;
    
    const newScore = Math.round(requiredScore + optionalScore);
    
    const newCategories = [...categories];
    newCategories[categoryIndex].score = newScore;
    setCategories(newCategories);
  };

  // Toggle item check
  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].items[itemIndex].passed = 
      !newCategories[categoryIndex].items[itemIndex].passed;
    setCategories(newCategories);
    updateCategoryScore(categoryIndex);
  };

  // Handle score slider change
  const handleScoreChange = (categoryIndex: number, value: number[]) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].score = value[0];
    setCategories(newCategories);
  };

  // Add critical issue
  const addCriticalIssue = (issue: string) => {
    if (issue && !criticalIssues.includes(issue)) {
      setCriticalIssues([...criticalIssues, issue]);
    }
  };

  // Add improvement suggestion
  const addImprovement = (improvement: string) => {
    if (improvement && !improvements.includes(improvement)) {
      setImprovements([...improvements, improvement]);
    }
  };

  // Save score
  const handleSave = async (status: string = "pending") => {
    const totalScore = calculateTotalScore();
    const { grade } = getGrade(totalScore);
    
    const scoreData = {
      jobId: selectedJobId,
      inspectorId: job?.assignedTo || "",
      totalScore,
      maxScore: 100,
      percentage: totalScore,
      grade,
      completenessScore: categories[0].score,
      accuracyScore: categories[1].score,
      complianceScore: categories[2].score,
      photoQualityScore: categories[3].score,
      timelinessScore: categories[4].score,
      reviewStatus: status,
      reviewNotes,
      criticalIssues,
      improvements
    };
    
    await saveScoreMutation.mutateAsync(scoreData);
  };

  const totalScore = calculateTotalScore();
  const { grade, color: gradeColor } = getGrade(totalScore);

  if (!selectedJobId && !jobId) {
    // Job selection mode
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Select Job for QA Scoring</CardTitle>
            <CardDescription>Choose a completed job to perform quality assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Select Job</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job to score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job-1">123 Main St - Full Inspection</SelectItem>
                  <SelectItem value="job-2">456 Oak Ave - Blower Door Test</SelectItem>
                  <SelectItem value="job-3">789 Pine St - Duct Leakage Test</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                disabled={!selectedJobId}
                onClick={() => {/* Job selected, component will re-render */}}
              >
                Begin QA Scoring
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (jobLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading job details...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/qa">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">QA Scoring</h1>
            <p className="text-muted-foreground mt-1">
              {job ? `${job.name} - ${job.address}` : "Quality Assessment"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Score</p>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${gradeColor}`}>
                {totalScore}%
              </span>
              <Badge className={`text-lg px-2 ${gradeColor}`}>
                {grade}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scoring Categories */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="automated" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="automated">Automated Scoring</TabsTrigger>
              <TabsTrigger value="manual">Manual Scoring</TabsTrigger>
            </TabsList>

            <TabsContent value="automated" className="space-y-4 mt-4">
              {categories.map((category, categoryIndex) => (
                <Card key={category.name}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {category.icon}
                        {category.name}
                        <Badge variant="outline" className="ml-2">
                          {category.weight}% weight
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${
                          category.score >= 80 ? "text-green-600 dark:text-green-400" : 
                          category.score >= 60 ? "text-yellow-600 dark:text-yellow-400" : 
                          "text-destructive"
                        }`}>
                          {category.score}%
                        </span>
                      </div>
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => toggleItem(categoryIndex, itemIndex)}
                      >
                        <div className="flex items-center gap-3">
                          {item.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : item.required ? (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          ) : (
                            <div className="w-5 h-5 border-2 rounded-full" />
                          )}
                          <span className={item.required ? "font-medium" : ""}>
                            {item.name}
                          </span>
                          {item.required && (
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {item.details && (
                          <span className="text-sm text-muted-foreground">{item.details}</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              {categories.map((category, categoryIndex) => (
                <Card key={category.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category.icon}
                      {category.name}
                      <Badge variant="outline" className="ml-2">
                        {category.weight}% weight
                      </Badge>
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Score</Label>
                        <span className="text-lg font-semibold">{category.score}%</span>
                      </div>
                      <Slider
                        value={[category.score]}
                        onValueChange={(value) => handleScoreChange(categoryIndex, value)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Review Panel */}
        <div className="space-y-4">
          {/* Score Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.map(category => {
                const weightedScore = (category.score / 100) * category.weight;
                return (
                  <div key={category.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{category.name}</span>
                      <span className="font-medium">
                        {weightedScore.toFixed(1)} / {category.weight}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(weightedScore / category.weight) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <Separator className="my-3" />
              <div className="flex items-center justify-between font-semibold">
                <span>Total Score</span>
                <span className={`text-xl ${gradeColor}`}>{totalScore}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Critical Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Critical Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {criticalIssues.length > 0 ? (
                <ul className="space-y-2">
                  {criticalIssues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                      <span className="text-sm">{issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No critical issues identified</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => {
                  const issue = prompt("Add critical issue:");
                  if (issue) addCriticalIssue(issue);
                }}
              >
                Add Issue
              </Button>
            </CardContent>
          </Card>

          {/* Improvement Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Improvements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {improvements.length > 0 ? (
                <ul className="space-y-2">
                  {improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <span className="text-sm">{improvement}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No improvement suggestions</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => {
                  const improvement = prompt("Add improvement suggestion:");
                  if (improvement) addImprovement(improvement);
                }}
              >
                Add Suggestion
              </Button>
            </CardContent>
          </Card>

          {/* Review Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Review Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add detailed review notes, feedback, and recommendations..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="min-h-[120px]"
              />
              
              <div className="space-y-2">
                <Label>Review Status</Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSave("pending")}
                  disabled={saveScoreMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleSave(reviewStatus)}
                  disabled={saveScoreMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}