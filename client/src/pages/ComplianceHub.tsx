import { useState } from "react";
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
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import type { Job } from "@shared/schema";

interface ComplianceTool {
  name: string;
  path: string;
  icon: typeof Calculator;
  requiresJobId?: boolean;
  requiresBuildingId?: boolean;
}

interface ComplianceSection {
  title: string;
  badge: string;
  description: string;
  icon: typeof ShieldCheck;
  tools: ComplianceTool[];
}

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

export default function ComplianceHub() {
  const [, navigate] = useLocation();
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [selectedJobPath, setSelectedJobPath] = useState("");

  // Fetch jobs for selection
  const { data: jobsData } = useQuery<{ data: Job[] }>({
    queryKey: ["/api/jobs", { limit: 100, offset: 0 }],
    queryFn: async () => {
      const response = await fetch("/api/jobs?limit=100&offset=0", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      return response.json();
    },
  });

  const jobs = jobsData?.data || [];

  const handleToolClick = (tool: ComplianceTool) => {
    if (tool.requiresJobId || tool.requiresBuildingId) {
      setSelectedJobPath(tool.path);
      setShowJobSelector(true);
    } else {
      navigate(tool.path);
    }
  };

  const handleJobSelect = (jobId: string) => {
    if (selectedJobPath.includes("benchmarking-tracker")) {
      navigate(`${selectedJobPath}/${jobId}`);
    } else {
      navigate(`${selectedJobPath}/${jobId}`);
    }
    setShowJobSelector(false);
    setSelectedJobPath("");
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Minnesota Multifamily Compliance" />

      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Section */}
          <Card>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COMPLIANCE_SECTIONS.map((section, idx) => (
              <Card key={idx} data-testid={`card-section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <section.icon className="h-6 w-6 text-secondary" />
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

          {/* Quick Access Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4" data-testid="text-quick-access-title">
              Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {QUICK_ACCESS_TOOLS.map((tool, idx) => (
                <Card key={idx} data-testid={`card-quick-access-${idx}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <tool.icon className="h-5 w-5 text-primary" />
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
                      onClick={() => {
                        if (tool.requiresJobId) {
                          setSelectedJobPath(tool.path);
                          setShowJobSelector(true);
                        } else {
                          navigate(tool.path);
                        }
                      }}
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

      {/* Job Selector Dialog */}
      <Dialog open={showJobSelector} onOpenChange={setShowJobSelector}>
        <DialogContent data-testid="dialog-job-selector">
          <DialogHeader>
            <DialogTitle data-testid="text-job-selector-title">Select a Job</DialogTitle>
            <DialogDescription data-testid="text-job-selector-description">
              Choose a job to access this compliance tool
            </DialogDescription>
          </DialogHeader>
          
          {jobs.length === 0 ? (
            <div className="py-8 text-center space-y-4">
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
                  onClick={() => {
                    setShowJobSelector(false);
                    setSelectedJobPath("");
                  }}
                  data-testid="button-cancel-job-selector"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
