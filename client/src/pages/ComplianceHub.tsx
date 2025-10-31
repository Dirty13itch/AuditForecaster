import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  ShieldCheck, 
  Calculator, 
  Settings, 
  FileCheck, 
  Building2, 
  Award, 
  Clock, 
  FileText, 
  Camera,
  ChevronRight,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import type { Job } from "@shared/schema";

/**
 * Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
 * 
 * Business Context:
 * ComplianceHub serves as the central navigation point for Minnesota multifamily
 * compliance programs. It provides access to:
 * - ENERGY STAR MFNC 1.2 (Multifamily New Construction)
 * - MN Housing EGCC 2020 (Energy Guide Compliance Certification)
 * - ZERH (Zero Energy Ready Homes with 45L tax credits)
 * - Building Energy Benchmarking (MN 2024 law compliance)
 */

// Compliance tool interface defining navigation metadata
interface ComplianceTool {
  name: string;
  path: string;
  icon: typeof Calculator;
  requiresJobId?: boolean;
  requiresBuildingId?: boolean;
}

// Compliance section grouping related tools by program
interface ComplianceSection {
  title: string;
  badge: string;
  description: string;
  icon: typeof ShieldCheck;
  tools: ComplianceTool[];
}

/**
 * COMPLIANCE_SECTIONS: Main compliance programs with navigation tools
 * 
 * Each section represents a distinct compliance program with specific:
 * - Version/standard (e.g., ENERGY STAR MFNC 1.2)
 * - Related tools (calculators, checklists, trackers)
 * - Job/building context requirements
 */
const COMPLIANCE_SECTIONS: ComplianceSection[] = [
  {
    title: "ENERGY STAR MFNC",
    badge: "ENERGY STAR MFNC 1.2",
    description: "ENERGY STAR multifamily certification with sampling protocol and digital checklists",
    icon: ShieldCheck,
    tools: [
      {
        name: "Sampling Calculator",
        path: "/compliance/sampling-calculator",
        icon: Calculator,
      },
      {
        name: "Program Setup",
        path: "/compliance/multifamily-setup",
        icon: Settings,
      },
      {
        name: "Digital Checklist",
        path: "/compliance/energy-star-checklist",
        icon: FileCheck,
        requiresJobId: true,
      },
    ],
  },
  {
    title: "MN Housing EGCC",
    badge: "MN Housing EGCC 2020",
    description: "Minnesota Housing Energy Guide Compliance Certification with intended methods and rebate analysis",
    icon: Building2,
    tools: [
      {
        name: "EGCC Worksheet",
        path: "/compliance/mn-housing-egcc",
        icon: FileText,
        requiresJobId: true,
      },
    ],
  },
  {
    title: "ZERH",
    badge: "ZERH Multifamily",
    description: "Zero Energy Ready Homes certification with 45L tax credit calculator",
    icon: Award,
    tools: [
      {
        name: "ZERH Tracker",
        path: "/compliance/zerh-tracker",
        icon: FileCheck,
        requiresJobId: true,
      },
      {
        name: "45L Tax Credits",
        path: "/tax-credits",
        icon: Award,
      },
    ],
  },
  {
    title: "Building Energy Benchmarking",
    badge: "MN Benchmarking 2024",
    description: "Minnesota Building Energy Benchmarking compliance per 2024 law",
    icon: Clock,
    tools: [
      {
        name: "Deadline Tracker",
        path: "/compliance/benchmarking-tracker",
        icon: Clock,
        requiresBuildingId: true,
      },
    ],
  },
];

/**
 * QUICK_ACCESS_TOOLS: Frequently used compliance utilities
 * 
 * These tools provide cross-program functionality:
 * - Document library: Centralized compliance artifact storage
 * - Builder verified items: Photo evidence tracking (0-8 items per ENERGY STAR)
 */
const QUICK_ACCESS_TOOLS = [
  {
    title: "Compliance Documents Library",
    description: "Browse all compliance artifacts with filtering and bulk download",
    path: "/compliance/documents",
    icon: FileText,
    buttonText: "View Documents",
  },
  {
    title: "Builder Verified Items",
    description: "Track builder-verified items with photo evidence (0-8 items per ENERGY STAR)",
    path: "/compliance/builder-verified-items",
    icon: Camera,
    buttonText: "Manage Items",
    requiresJobId: true,
  },
];

// Skeleton count for loading states
const SKELETON_COUNT = 3;

// Maximum jobs to fetch for selector
const MAX_JOBS_FOR_SELECTOR = 100;

/**
 * Phase 2 - BUILD: ComplianceHubContent component
 * 
 * Main component wrapped in ErrorBoundary at export.
 * Provides navigation hub for all Minnesota multifamily compliance programs.
 */
function ComplianceHubContent() {
  const [, navigate] = useLocation();
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [selectedJobPath, setSelectedJobPath] = useState("");

  /**
   * Phase 5 - HARDEN: Fetch jobs for selection with retry: 2
   * 
   * Business Logic - Job Context:
   * Many compliance tools require job context (e.g., EGCC worksheet, ZERH tracker)
   * to associate compliance data with specific inspection jobs. This query fetches
   * all available jobs for the selector dialog.
   * 
   * Retry configuration ensures resilience during network issues common in field operations.
   */
  const { 
    data: jobsData, 
    isLoading: isLoadingJobs,
    error: jobsError,
    refetch: refetchJobs
  } = useQuery<{ data: Job[] }>({
    queryKey: ["/api/jobs", { limit: MAX_JOBS_FOR_SELECTOR, offset: 0 }],
    queryFn: async () => {
      const response = await fetch(`/api/jobs?limit=${MAX_JOBS_FOR_SELECTOR}&offset=0`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      return response.json();
    },
    retry: 2,
  });

  /**
   * Phase 3 - OPTIMIZE: Memoized jobs array prevents unnecessary recalculation
   * 
   * Extracts jobs from paginated response, providing empty array fallback
   * when data is not yet loaded or failed to load.
   */
  const jobs = useMemo(() => jobsData?.data || [], [jobsData]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Tool Navigation:
   * Determines navigation flow based on tool requirements:
   * - Tools requiring job/building context: Show job selector dialog
   * - Standalone tools: Navigate directly to tool path
   * 
   * This ensures compliance data is always associated with correct context.
   */
  const handleToolClick = useCallback((tool: ComplianceTool) => {
    if (tool.requiresJobId || tool.requiresBuildingId) {
      setSelectedJobPath(tool.path);
      setShowJobSelector(true);
    } else {
      navigate(tool.path);
    }
  }, [navigate]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Job Selection:
   * Navigates to selected compliance tool with job ID in URL path.
   * Both job-specific and building-specific tools use the same pattern
   * for URL structure: /path/{jobId}
   * 
   * Cleans up dialog state after navigation.
   */
  const handleJobSelect = useCallback((jobId: string) => {
    navigate(`${selectedJobPath}/${jobId}`);
    setShowJobSelector(false);
    setSelectedJobPath("");
  }, [selectedJobPath, navigate]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for dialog close handling
   * 
   * Resets dialog state when user cancels job selection.
   */
  const handleDialogClose = useCallback(() => {
    setShowJobSelector(false);
    setSelectedJobPath("");
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for quick access tool clicks
   * 
   * Handles navigation for quick access tools with same logic as main tools.
   */
  const handleQuickAccessClick = useCallback((tool: typeof QUICK_ACCESS_TOOLS[number]) => {
    if (tool.requiresJobId) {
      setSelectedJobPath(tool.path);
      setShowJobSelector(true);
    } else {
      navigate(tool.path);
    }
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen" data-testid="page-compliance-hub">
      <TopBar title="Minnesota Multifamily Compliance" />

      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Section */}
          <Card data-testid="card-compliance-header">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ShieldCheck className="h-8 w-8 text-primary" data-testid="icon-compliance-hub" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl" data-testid="text-compliance-title">
                    Minnesota Multifamily Compliance
                  </CardTitle>
                  <CardDescription className="mt-2" data-testid="text-compliance-subtitle">
                    Manage ENERGY STAR MFNC, MN Housing EGCC, ZERH, and Benchmarking compliance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Compliance Programs Grid */}
          <div data-testid="section-compliance-programs">
            <h2 className="text-xl font-semibold mb-4" data-testid="text-programs-title">
              Compliance Programs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {COMPLIANCE_SECTIONS.map((section, idx) => (
                <Card 
                  key={idx} 
                  data-testid={`card-section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="hover-elevate"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                          <section.icon className="h-6 w-6 text-secondary" data-testid={`icon-section-${idx}`} />
                        </div>
                        <CardTitle className="text-xl" data-testid={`text-section-title-${idx}`}>
                          {section.title}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" data-testid={`badge-section-${idx}`}>
                        {section.badge}
                      </Badge>
                    </div>
                    <CardDescription data-testid={`text-section-description-${idx}`}>
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {section.tools.map((tool, toolIdx) => (
                      <Button
                        key={toolIdx}
                        variant="outline"
                        className="w-full justify-between hover-elevate"
                        onClick={() => handleToolClick(tool)}
                        data-testid={`button-tool-${section.title.toLowerCase().replace(/\s+/g, '-')}-${tool.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-2">
                          <tool.icon className="h-4 w-4" />
                          <span>{tool.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Access Section */}
          <div data-testid="section-quick-access">
            <h2 className="text-xl font-semibold mb-4" data-testid="text-quick-access-title">
              Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {QUICK_ACCESS_TOOLS.map((tool, idx) => (
                <Card 
                  key={idx} 
                  data-testid={`card-quick-access-${idx}`}
                  className="hover-elevate"
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <tool.icon className="h-5 w-5 text-primary" data-testid={`icon-quick-access-${idx}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`text-quick-access-title-${idx}`}>
                          {tool.title}
                        </CardTitle>
                        <CardDescription className="mt-1" data-testid={`text-quick-access-description-${idx}`}>
                          {tool.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleQuickAccessClick(tool)}
                      data-testid={`button-quick-access-${idx}`}
                    >
                      {tool.buttonText}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* 
        Phase 2 - BUILD: Job Selector Dialog
        
        Business Logic - Job Context Selection:
        When a compliance tool requires job context, this dialog presents
        all available jobs to the user. Handles three states:
        1. Loading: Shows skeleton loaders
        2. Error: Shows error with retry button
        3. Success: Shows job selection dropdown or empty state
      */}
      <Dialog open={showJobSelector} onOpenChange={setShowJobSelector}>
        <DialogContent data-testid="dialog-job-selector">
          <DialogHeader>
            <DialogTitle data-testid="text-job-selector-title">Select a Job</DialogTitle>
            <DialogDescription data-testid="text-job-selector-description">
              Choose a job to access this compliance tool
            </DialogDescription>
          </DialogHeader>
          
          {/* Phase 2 - BUILD: Loading state with skeleton loaders */}
          {isLoadingJobs && (
            <div className="space-y-3" data-testid="skeleton-jobs-selector">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" data-testid={`skeleton-job-${i}`} />
              ))}
            </div>
          )}

          {/* Phase 2 - BUILD: Error state with retry button */}
          {jobsError && !isLoadingJobs && (
            <Alert variant="destructive" data-testid="alert-error-jobs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>Failed to load jobs: {jobsError instanceof Error ? jobsError.message : 'Unknown error'}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchJobs()}
                  data-testid="button-retry-jobs"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Phase 2 - BUILD: Success state - Job selection or empty state */}
          {!isLoadingJobs && !jobsError && (
            <>
              {/* Phase 2 - BUILD: Empty state when no jobs available */}
              {jobs.length === 0 ? (
                <div className="py-8 text-center space-y-4" data-testid="empty-jobs">
                  <p className="text-muted-foreground" data-testid="text-no-jobs">
                    No jobs available. Create a job first to access this tool.
                  </p>
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowJobSelector(false);
                      navigate("/jobs");
                    }}
                    data-testid="button-create-job"
                  >
                    Go to Jobs
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Select onValueChange={handleJobSelect}>
                    <SelectTrigger data-testid="select-job-trigger">
                      <SelectValue placeholder="Select a job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem 
                          key={job.id} 
                          value={job.id}
                          data-testid={`option-job-${job.id}`}
                        >
                          {job.address} - {job.jobType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleDialogClose}
                      data-testid="button-cancel-job-selector"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

/**
 * Phase 2 - BUILD: ErrorBoundary wrapper for ComplianceHub
 * 
 * Catches and handles React errors gracefully, preventing full page crashes.
 * Provides user-friendly error message with reload option.
 */
export default function ComplianceHub() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen p-4" data-testid="error-boundary-compliance-hub">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-4">
              <p className="font-semibold">Something went wrong with the Compliance Hub</p>
              <p className="text-sm">
                An error occurred while loading the compliance management interface. 
                Please try reloading the page.
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                data-testid="button-reload-page"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <ComplianceHubContent />
    </ErrorBoundary>
  );
}
