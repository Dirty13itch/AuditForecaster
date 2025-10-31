import { useState, useMemo, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DashboardCardSkeleton,
  TableSkeleton
} from "@/components/ui/skeleton-variants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useInputDialog } from "@/components/InputDialog";
import {
  staggerContainer,
  cardAppear,
  listItem
} from "@/lib/animations";
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

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Phase 6 - DOCUMENT: Query configuration constants
const QUERY_CONFIG = {
  RETRY_COUNT: 2,
  STALE_TIME: 5000
} as const;

// Phase 6 - DOCUMENT: Score calculation weights for each QA category
// These weights must sum to 100 and determine the final weighted score
const CATEGORY_WEIGHTS = {
  COMPLETENESS: 25,  // Required fields, tests, documentation
  ACCURACY: 25,      // Calculations, measurements, consistency
  COMPLIANCE: 25,    // Minnesota Code, safety protocols
  PHOTO_QUALITY: 15, // Image quality, angles, annotations
  TIMELINESS: 10     // Submission timing, turnaround
} as const;

// Phase 6 - DOCUMENT: Scoring algorithm configuration
// Required items worth 80%, optional items worth 20% of category score
const SCORING_WEIGHTS = {
  REQUIRED_ITEMS: 80,
  OPTIONAL_ITEMS: 20
} as const;

// Phase 6 - DOCUMENT: Grade thresholds for letter grade assignment
// Used to convert percentage scores to letter grades (A-F)
const GRADE_THRESHOLDS = {
  A: 90,  // Excellent performance
  B: 80,  // Good performance
  C: 70,  // Satisfactory performance
  D: 60,  // Needs improvement
  F: 0    // Failing/unacceptable
} as const;

// Phase 6 - DOCUMENT: Color mappings for score visualization
// Provides visual feedback based on performance level
const SCORE_COLORS = {
  excellent: "text-green-600 dark:text-green-400",    // 90-100
  good: "text-blue-600 dark:text-blue-400",           // 80-89
  satisfactory: "text-yellow-600 dark:text-yellow-400", // 70-79
  warning: "text-orange-600 dark:text-orange-400",    // 60-69
  critical: "text-destructive"                         // Below 60
} as const;

// Phase 6 - DOCUMENT: Review status options for QA workflow
const REVIEW_STATUSES = [
  { value: "pending", label: "Pending Review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "approved", label: "Approved" },
  { value: "needs_improvement", label: "Needs Improvement" }
] as const;

// Phase 3 - OPTIMIZE: Helper functions moved to module level
// Phase 6 - DOCUMENT: Calculate letter grade from percentage score
// Returns grade letter and associated color class based on thresholds
const getGrade = (score: number): { grade: string; color: string } => {
  if (score >= GRADE_THRESHOLDS.A) return { grade: "A", color: SCORE_COLORS.excellent };
  if (score >= GRADE_THRESHOLDS.B) return { grade: "B", color: SCORE_COLORS.good };
  if (score >= GRADE_THRESHOLDS.C) return { grade: "C", color: SCORE_COLORS.satisfactory };
  if (score >= GRADE_THRESHOLDS.D) return { grade: "D", color: SCORE_COLORS.warning };
  return { grade: "F", color: SCORE_COLORS.critical };
};

// Phase 6 - DOCUMENT: Get color class for category score visualization
// Provides color feedback for individual category performance
const getCategoryColor = (score: number): string => {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return SCORE_COLORS.satisfactory;
  return SCORE_COLORS.critical;
};

// Phase 6 - DOCUMENT: Interface defining structure of scoring categories
// Each category has weighted scoring criteria and checklist items
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

// Phase 6 - DOCUMENT: Initial category structure with default values
// Creates the 5 QA categories with weighted scoring criteria
const createInitialCategories = (): ScoringCategory[] => [
  {
    name: "Completeness",
    weight: CATEGORY_WEIGHTS.COMPLETENESS,
    score: 0,
    maxScore: 100,
    description: "All required fields, tests, and documentation completed",
    icon: <ClipboardCheck className="w-5 h-5" data-testid="icon-completeness" />,
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
    weight: CATEGORY_WEIGHTS.ACCURACY,
    score: 0,
    maxScore: 100,
    description: "Calculations correct, measurements reasonable, data consistent",
    icon: <Calculator className="w-5 h-5" data-testid="icon-accuracy" />,
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
    weight: CATEGORY_WEIGHTS.COMPLIANCE,
    score: 0,
    maxScore: 100,
    description: "Minnesota Code requirements, safety protocols, standards",
    icon: <Shield className="w-5 h-5" data-testid="icon-compliance" />,
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
    weight: CATEGORY_WEIGHTS.PHOTO_QUALITY,
    score: 0,
    maxScore: 100,
    description: "Clear images, proper angles, annotations when needed",
    icon: <Camera className="w-5 h-5" data-testid="icon-photo-quality" />,
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
    weight: CATEGORY_WEIGHTS.TIMELINESS,
    score: 0,
    maxScore: 100,
    description: "Submitted on time, quick turnaround, schedule adherence",
    icon: <Clock className="w-5 h-5" data-testid="icon-timeliness" />,
    items: [
      { name: "Submitted on time", passed: false, required: true },
      { name: "Quick turnaround", passed: false, required: false },
      { name: "Schedule adhered to", passed: false, required: false },
      { name: "Updates provided", passed: false, required: false }
    ]
  }
];

// Phase 2 - BUILD: Main component with comprehensive error handling
function QAScoringContent() {
  const { jobId } = useParams();
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState(jobId || "");
  const { showInput, InputDialog } = useInputDialog();
  
  // Phase 3 - OPTIMIZE: useMemo for initial categories to prevent recreation
  const initialCategories = useMemo(() => createInitialCategories(), []);
  const [categories, setCategories] = useState<ScoringCategory[]>(initialCategories);

  const [reviewNotes, setReviewNotes] = useState("");
  const [criticalIssues, setCriticalIssues] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [reviewStatus, setReviewStatus] = useState<string>("pending");

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  // Phase 6 - DOCUMENT: Fetch job details for the selected job being scored
  const { 
    data: job, 
    isLoading: jobLoading,
    error: jobError
  } = useQuery<Job>({
    queryKey: ['/api/jobs', selectedJobId],
    enabled: !!selectedJobId,
    retry: QUERY_CONFIG.RETRY_COUNT,
    staleTime: QUERY_CONFIG.STALE_TIME
  });

  // Phase 6 - DOCUMENT: Fetch existing QA score to support editing/updating
  const { 
    data: existingScore,
    isLoading: scoreLoading,
    error: scoreError
  } = useQuery<QaInspectionScore>({
    queryKey: ['/api/qa/scores/job', selectedJobId],
    enabled: !!selectedJobId,
    retry: QUERY_CONFIG.RETRY_COUNT,
    staleTime: QUERY_CONFIG.STALE_TIME
  });

  // Phase 6 - DOCUMENT: Mutation to save or update QA score
  // Automatically detects whether to POST (new) or PATCH (update)
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save QA score",
        variant: "destructive"
      });
    }
  });

  // Phase 3 - OPTIMIZE: useMemo for total score calculation
  // Phase 6 - DOCUMENT: Calculate weighted total score from all categories
  // Each category contributes its score * weight / 100 to the final score
  const totalScore = useMemo(() => {
    let totalWeightedScore = 0;
    categories.forEach(category => {
      const weightedScore = (category.score / 100) * category.weight;
      totalWeightedScore += weightedScore;
    });
    return Math.round(totalWeightedScore);
  }, [categories]);

  // Phase 3 - OPTIMIZE: useMemo for grade computation
  const { grade, color: gradeColor } = useMemo(() => getGrade(totalScore), [totalScore]);

  // Phase 3 - OPTIMIZE: useCallback for category score update
  // Phase 6 - DOCUMENT: Auto-calculate category score from checklist items
  // Required items worth 80%, optional items worth 20% of category score
  const updateCategoryScore = useCallback((categoryIndex: number) => {
    setCategories(prev => {
      const newCategories = [...prev];
      const category = newCategories[categoryIndex];
      const requiredItems = category.items.filter(item => item.required);
      const optionalItems = category.items.filter(item => !item.required);
      
      const requiredPassed = requiredItems.filter(item => item.passed).length;
      const optionalPassed = optionalItems.filter(item => item.passed).length;
      
      const requiredScore = requiredItems.length > 0 
        ? (requiredPassed / requiredItems.length) * SCORING_WEIGHTS.REQUIRED_ITEMS 
        : SCORING_WEIGHTS.REQUIRED_ITEMS;
      const optionalScore = optionalItems.length > 0 
        ? (optionalPassed / optionalItems.length) * SCORING_WEIGHTS.OPTIONAL_ITEMS 
        : SCORING_WEIGHTS.OPTIONAL_ITEMS;
      
      newCategories[categoryIndex].score = Math.round(requiredScore + optionalScore);
      return newCategories;
    });
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for item toggle
  // Phase 6 - DOCUMENT: Toggle checklist item and recalculate category score
  const toggleItem = useCallback((categoryIndex: number, itemIndex: number) => {
    setCategories(prev => {
      const newCategories = [...prev];
      newCategories[categoryIndex].items[itemIndex].passed = 
        !newCategories[categoryIndex].items[itemIndex].passed;
      return newCategories;
    });
    updateCategoryScore(categoryIndex);
  }, [updateCategoryScore]);

  // Phase 3 - OPTIMIZE: useCallback for manual score adjustment
  // Phase 6 - DOCUMENT: Handle manual score slider changes in Manual Scoring tab
  const handleScoreChange = useCallback((categoryIndex: number, value: number[]) => {
    setCategories(prev => {
      const newCategories = [...prev];
      newCategories[categoryIndex].score = value[0];
      return newCategories;
    });
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for adding critical issues
  // Phase 5 - HARDEN: Validate input and prevent duplicates
  const addCriticalIssue = useCallback((issue: string) => {
    const trimmedIssue = issue.trim();
    if (trimmedIssue && !criticalIssues.includes(trimmedIssue)) {
      setCriticalIssues(prev => [...prev, trimmedIssue]);
    }
  }, [criticalIssues]);

  // Phase 3 - OPTIMIZE: useCallback for adding improvement suggestions
  // Phase 5 - HARDEN: Validate input and prevent duplicates
  const addImprovement = useCallback((improvement: string) => {
    const trimmedImprovement = improvement.trim();
    if (trimmedImprovement && !improvements.includes(trimmedImprovement)) {
      setImprovements(prev => [...prev, trimmedImprovement]);
    }
  }, [improvements]);

  // Phase 3 - OPTIMIZE: useCallback for save handler
  // Phase 5 - HARDEN: Validate required fields before saving
  // Phase 6 - DOCUMENT: Save QA score with all category scores and review data
  const handleSave = useCallback(async (status: string = "pending") => {
    // Phase 5 - HARDEN: Validate that a job is selected
    if (!selectedJobId) {
      toast({
        title: "Validation Error",
        description: "Please select a job to score",
        variant: "destructive"
      });
      return;
    }

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
      reviewNotes: reviewNotes.trim(),
      criticalIssues,
      improvements
    };
    
    await saveScoreMutation.mutateAsync(scoreData);
  }, [selectedJobId, job, totalScore, grade, categories, reviewNotes, criticalIssues, improvements, toast, saveScoreMutation]);

  // Phase 5 - HARDEN: Handle edge case of no job selected
  if (!selectedJobId && !jobId) {
    return (
      <div className="container mx-auto p-6 max-w-4xl" data-testid="container-job-selection">
        <Card data-testid="card-job-selection">
          <CardHeader>
            <CardTitle data-testid="heading-select-job">Select Job for QA Scoring</CardTitle>
            <CardDescription data-testid="text-select-description">
              Choose a completed job to perform quality assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label data-testid="label-select-job">Select Job</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger data-testid="select-trigger-job">
                  <SelectValue placeholder="Choose a job to score" />
                </SelectTrigger>
                <SelectContent data-testid="select-content-jobs">
                  <SelectItem value="job-1" data-testid="select-item-job-1">
                    123 Main St - Full Inspection
                  </SelectItem>
                  <SelectItem value="job-2" data-testid="select-item-job-2">
                    456 Oak Ave - Blower Door Test
                  </SelectItem>
                  <SelectItem value="job-3" data-testid="select-item-job-3">
                    789 Pine St - Duct Leakage Test
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button 
                disabled={!selectedJobId}
                onClick={() => {/* Job selected, component will re-render */}}
                data-testid="button-begin-scoring"
              >
                Begin QA Scoring
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase 2 - BUILD: Show skeleton loaders during initial data fetch
  if (jobLoading || scoreLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl" data-testid="container-qa-scoring-loading">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="heading-qa-scoring-title">QA Scoring</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-loading-message">
            Loading job details...
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </div>
          <div className="space-y-4">
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Phase 2 - BUILD: Show error alert if query fails
  if (jobError || scoreError) {
    return (
      <div className="container mx-auto p-6 max-w-6xl" data-testid="container-qa-scoring-error">
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" data-testid="icon-error" />
          <AlertTitle data-testid="text-error-title">Error Loading Data</AlertTitle>
          <AlertDescription data-testid="text-error-description">
            {jobError?.message || scoreError?.message || 'Failed to load QA scoring data. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto p-6 max-w-6xl"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      data-testid="container-qa-scoring-main"
    >
      {/* Header Section */}
      <motion.div 
        className="flex items-center justify-between mb-6"
        variants={cardAppear}
        data-testid="section-header"
      >
        <div className="flex items-center gap-4" data-testid="group-header-left">
          <Button variant="ghost" size="icon" asChild data-testid="button-back-to-qa">
            <Link href="/qa">
              <ChevronLeft className="w-4 h-4" data-testid="icon-back" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-qa-scoring">QA Scoring</h1>
            <p className="text-muted-foreground mt-1" data-testid="text-job-details">
              {job ? `${job.name} - ${job.address}` : "Quality Assessment"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4" data-testid="group-score-display">
          <div className="text-right">
            <p className="text-sm text-muted-foreground" data-testid="label-total-score">Total Score</p>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${gradeColor}`} data-testid="text-total-score">
                {totalScore}%
              </span>
              <Badge className={`text-lg px-2 ${gradeColor}`} data-testid="badge-grade">
                {grade}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="grid-scoring-layout">
        {/* Scoring Categories */}
        <div className="lg:col-span-2 space-y-4" data-testid="section-categories">
          <Tabs defaultValue="automated" className="w-full" data-testid="tabs-scoring-mode">
            <TabsList className="grid grid-cols-2 w-full" data-testid="tabs-list-scoring">
              <TabsTrigger value="automated" data-testid="tab-automated">Automated Scoring</TabsTrigger>
              <TabsTrigger value="manual" data-testid="tab-manual">Manual Scoring</TabsTrigger>
            </TabsList>

            <TabsContent value="automated" className="space-y-4 mt-4" data-testid="tab-content-automated">
              {categories.map((category, categoryIndex) => (
                <motion.div
                  key={category.name}
                  variants={listItem}
                  data-testid={`card-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2" data-testid={`title-category-${categoryIndex}`}>
                          {category.icon}
                          {category.name}
                          <Badge variant="outline" className="ml-2" data-testid={`badge-weight-${categoryIndex}`}>
                            {category.weight}% weight
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${getCategoryColor(category.score)}`} data-testid={`text-category-score-${categoryIndex}`}>
                            {category.score}%
                          </span>
                        </div>
                      </div>
                      <CardDescription data-testid={`description-category-${categoryIndex}`}>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {category.items.map((item, itemIndex) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2 rounded-lg hover-elevate active-elevate-2 cursor-pointer"
                          onClick={() => toggleItem(categoryIndex, itemIndex)}
                          data-testid={`item-checklist-${categoryIndex}-${itemIndex}`}
                        >
                          <div className="flex items-center gap-3">
                            {item.passed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" data-testid={`icon-passed-${categoryIndex}-${itemIndex}`} />
                            ) : item.required ? (
                              <AlertCircle className="w-5 h-5 text-destructive" data-testid={`icon-required-${categoryIndex}-${itemIndex}`} />
                            ) : (
                              <div className="w-5 h-5 border-2 rounded-full" data-testid={`icon-unchecked-${categoryIndex}-${itemIndex}`} />
                            )}
                            <span className={item.required ? "font-medium" : ""} data-testid={`text-item-name-${categoryIndex}-${itemIndex}`}>
                              {item.name}
                            </span>
                            {item.required && (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-required-${categoryIndex}-${itemIndex}`}>Required</Badge>
                            )}
                          </div>
                          {item.details && (
                            <span className="text-sm text-muted-foreground" data-testid={`text-item-details-${categoryIndex}-${itemIndex}`}>{item.details}</span>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4" data-testid="tab-content-manual">
              {categories.map((category, categoryIndex) => (
                <motion.div
                  key={category.name}
                  variants={listItem}
                  data-testid={`card-manual-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" data-testid={`title-manual-category-${categoryIndex}`}>
                        {category.icon}
                        {category.name}
                        <Badge variant="outline" className="ml-2" data-testid={`badge-manual-weight-${categoryIndex}`}>
                          {category.weight}% weight
                        </Badge>
                      </CardTitle>
                      <CardDescription data-testid={`description-manual-category-${categoryIndex}`}>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label data-testid={`label-manual-score-${categoryIndex}`}>Score</Label>
                          <span className="text-lg font-semibold" data-testid={`text-manual-score-${categoryIndex}`}>{category.score}%</span>
                        </div>
                        <Slider
                          value={[category.score]}
                          onValueChange={(value) => handleScoreChange(categoryIndex, value)}
                          max={100}
                          step={5}
                          className="w-full"
                          data-testid={`slider-manual-score-${categoryIndex}`}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span data-testid={`label-slider-min-${categoryIndex}`}>0%</span>
                        <span data-testid={`label-slider-mid-${categoryIndex}`}>50%</span>
                        <span data-testid={`label-slider-max-${categoryIndex}`}>100%</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Review Panel */}
        <div className="space-y-4" data-testid="section-review-panel">
          {/* Score Summary */}
          <motion.div variants={cardAppear}>
            <Card data-testid="card-score-summary">
              <CardHeader>
                <CardTitle data-testid="heading-score-breakdown">Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.map((category, index) => {
                  const weightedScore = (category.score / 100) * category.weight;
                  return (
                    <div key={category.name} className="space-y-1" data-testid={`summary-category-${index}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span data-testid={`text-summary-name-${index}`}>{category.name}</span>
                        <span className="font-medium" data-testid={`text-summary-score-${index}`}>
                          {weightedScore.toFixed(1)} / {category.weight}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(weightedScore / category.weight) * 100}%` }}
                          data-testid={`progress-summary-${index}`}
                        />
                      </div>
                    </div>
                  );
                })}
                <Separator className="my-3" />
                <div className="flex items-center justify-between font-semibold">
                  <span data-testid="label-summary-total">Total Score</span>
                  <span className={`text-xl ${gradeColor}`} data-testid="text-summary-total">{totalScore}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Critical Issues */}
          <motion.div variants={cardAppear}>
            <Card data-testid="card-critical-issues">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="heading-critical-issues">
                  <AlertTriangle className="w-5 h-5 text-destructive" data-testid="icon-critical" />
                  Critical Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                {criticalIssues.length > 0 ? (
                  <ul className="space-y-2" data-testid="list-critical-issues">
                    {criticalIssues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2" data-testid={`item-critical-issue-${index}`}>
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5" data-testid={`icon-issue-${index}`} />
                        <span className="text-sm" data-testid={`text-issue-${index}`}>{issue}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-issues">No critical issues identified</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={async () => {
                    const issue = await showInput("Add Critical Issue", {
                      description: "Describe the critical issue that needs attention",
                      placeholder: "Enter the critical issue...",
                      confirmText: "Add",
                      required: true
                    });
                    if (issue) addCriticalIssue(issue);
                  }}
                  data-testid="button-add-issue"
                >
                  Add Issue
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Improvement Suggestions */}
          <motion.div variants={cardAppear}>
            <Card data-testid="card-improvements">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="heading-improvements">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" data-testid="icon-improvements" />
                  Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {improvements.length > 0 ? (
                  <ul className="space-y-2" data-testid="list-improvements">
                    {improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start gap-2" data-testid={`item-improvement-${index}`}>
                        <Star className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" data-testid={`icon-improvement-${index}`} />
                        <span className="text-sm" data-testid={`text-improvement-${index}`}>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-improvements">No improvement suggestions</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={async () => {
                    const improvement = await showInput("Add Improvement Suggestion", {
                      description: "Suggest an improvement for this inspection",
                      placeholder: "Enter your improvement suggestion...",
                      confirmText: "Add",
                      required: true
                    });
                    if (improvement) addImprovement(improvement);
                  }}
                  data-testid="button-add-improvement"
                >
                  Add Suggestion
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Review Notes */}
          <motion.div variants={cardAppear}>
            <Card data-testid="card-review-notes">
              <CardHeader>
                <CardTitle data-testid="heading-review-notes">Review Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Add detailed review notes, feedback, and recommendations..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="textarea-review-notes"
                />
                
                <div className="space-y-2">
                  <Label data-testid="label-review-status">Review Status</Label>
                  <Select value={reviewStatus} onValueChange={setReviewStatus}>
                    <SelectTrigger data-testid="select-trigger-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent data-testid="select-content-status">
                      {REVIEW_STATUSES.map(status => (
                        <SelectItem 
                          key={status.value} 
                          value={status.value}
                          data-testid={`select-item-status-${status.value}`}
                        >
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2" data-testid="group-action-buttons">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSave("pending")}
                    disabled={saveScoreMutation.isPending}
                    data-testid="button-save-draft"
                  >
                    <Save className="w-4 h-4 mr-2" data-testid="icon-save" />
                    Save Draft
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleSave(reviewStatus)}
                    disabled={saveScoreMutation.isPending}
                    data-testid="button-submit-review"
                  >
                    <Send className="w-4 h-4 mr-2" data-testid="icon-submit" />
                    Submit Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <InputDialog />
    </motion.div>
  );
}

// Phase 2 - BUILD: Export with ErrorBoundary wrapper
export default function QAScoring() {
  return (
    <ErrorBoundary>
      <QAScoringContent />
    </ErrorBoundary>
  );
}
