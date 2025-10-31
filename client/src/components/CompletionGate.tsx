import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  AlertCircle, 
  TestTube, 
  ClipboardCheck, 
  Camera, 
  FileSignature 
} from "lucide-react";
import { getWorkflowTemplate } from "@shared/workflowTemplates";
import type { Job } from "@shared/schema";

interface CompletionGateProps {
  job: Job;
  checklistProgress: { completed: number; total: number };
  hasBlowerDoorTest: boolean;
  hasDuctLeakageTest: boolean;
  hasVentilationTest: boolean;
}

interface Requirement {
  name: string;
  icon: typeof ClipboardCheck;
  isMet: boolean;
}

export function CompletionGate({ 
  job, 
  checklistProgress,
  hasBlowerDoorTest,
  hasDuctLeakageTest,
  hasVentilationTest
}: CompletionGateProps) {
  const workflow = getWorkflowTemplate(job.inspectionType);
  const requirements: Requirement[] = [];
  
  // Check checklist completion requirement
  if (workflow.completionRequirements.allChecklistItemsCompleted) {
    const checklistComplete = checklistProgress.completed === checklistProgress.total && checklistProgress.total > 0;
    requirements.push({
      name: "Complete All Checklist Items",
      icon: ClipboardCheck,
      isMet: checklistComplete,
    });
  }
  
  // Check photo upload requirement
  if (workflow.completionRequirements.photoUploadRequired) {
    requirements.push({
      name: "Upload Required Photos",
      icon: Camera,
      isMet: job.photoUploadComplete === true,
    });
  }
  
  // Check signature requirement
  if (workflow.completionRequirements.builderSignatureRequired) {
    requirements.push({
      name: "Obtain Builder Signature",
      icon: FileSignature,
      isMet: !!job.builderSignatureUrl,
    });
  }
  
  // Check required tests
  if (workflow.completionRequirements.allRequiredTestsCompleted) {
    workflow.requiredTests.forEach((test) => {
      let isMet = false;
      
      if (test.testType === 'blower_door') {
        isMet = hasBlowerDoorTest;
      } else if (test.testType === 'duct_leakage') {
        isMet = hasDuctLeakageTest;
      } else if (test.testType === 'ventilation') {
        isMet = hasVentilationTest;
      }
      
      requirements.push({
        name: test.name,
        icon: TestTube,
        isMet,
      });
    });
  }
  
  // Calculate completion stats
  const completedCount = requirements.filter(req => req.isMet).length;
  const totalCount = requirements.length;
  const allComplete = completedCount === totalCount && totalCount > 0;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  // Determine card border color
  const borderColor = allComplete 
    ? "border-l-green-600 dark:border-l-green-400" 
    : "border-l-amber-600 dark:border-l-amber-400";
  
  return (
    <Card className={`border-l-4 ${borderColor}`} data-testid="card-completion-gate">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {allComplete ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" data-testid="icon-completion-complete" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" data-testid="icon-completion-incomplete" />
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base md:text-lg" data-testid="text-completion-title">
                Job Completion Requirements
              </CardTitle>
              <CardDescription className="mt-1" data-testid="text-completion-description">
                {allComplete 
                  ? "Ready to complete!" 
                  : "Complete all requirements above"}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Requirements List */}
          <div className="space-y-3">
            {requirements.map((requirement, index) => {
              const Icon = requirement.icon;
              return (
                <div 
                  key={index}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30 min-h-12"
                  data-testid={`container-requirement-${index}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm md:text-base" data-testid={`text-requirement-name-${index}`}>
                      {requirement.name}
                    </span>
                  </div>
                  
                  {requirement.isMet ? (
                    <Badge 
                      variant="outline" 
                      className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shrink-0"
                      data-testid={`badge-requirement-${index}-complete`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline"
                      className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shrink-0"
                      data-testid={`badge-requirement-${index}-required`}
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Required
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Summary Progress */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm md:text-base font-medium" data-testid="text-completion-summary">
                {completedCount} of {totalCount} requirements met
              </span>
              <span className="text-sm md:text-base text-muted-foreground" data-testid="text-completion-percentage">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2" 
              data-testid="progress-completion"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
