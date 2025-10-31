import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  ArrowRight, 
  TestTube, 
  ClipboardCheck, 
  Camera, 
  FileSignature,
  MapPin,
  AlertCircle
} from "lucide-react";
import { getWorkflowTemplate, type JobType, type WorkflowStep, type RequiredTest } from "@shared/workflowTemplates";
import type { Job } from "@shared/types";

interface WorkflowProgressProps {
  job: Job;
  checklistProgress: {
    completed: number;
    total: number;
  };
  hasBlowerDoorTest: boolean;
  hasDuctLeakageTest: boolean;
  hasVentilationTest: boolean;
}

export function WorkflowProgress({ 
  job, 
  checklistProgress,
  hasBlowerDoorTest,
  hasDuctLeakageTest,
  hasVentilationTest
}: WorkflowProgressProps) {
  const workflow = getWorkflowTemplate(job.inspectionType as JobType);
  
  // Determine which tests are completed
  const completedTests = new Set<string>();
  if (hasBlowerDoorTest) completedTests.add('blower_door');
  if (hasDuctLeakageTest) completedTests.add('duct_leakage');
  if (hasVentilationTest) completedTests.add('ventilation');
  
  // Check if step is complete - must be defined before getCurrentStepIndex
  const isStepComplete = (step: WorkflowStep): boolean => {
    const stepName = step.name.toLowerCase();
    const stepDesc = step.description.toLowerCase();
    
    // Signature step: MUST check FIRST before compliance/review
    // (Builder Review & Signature contains both "review" and "signature")
    if (stepName.includes('signature') || stepName.includes('sign')) {
      return !!job.builderSignatureUrl;
    }
    
    // Visual Checklist/Inspection steps: complete when ALL checklist items done
    if (stepName.includes('checklist') || stepName.includes('inspection')) {
      return checklistProgress.completed === checklistProgress.total && checklistProgress.total > 0;
    }
    
    // Test steps: complete when corresponding test exists
    if (step.navigationTarget?.includes('blower') || stepName.includes('blower')) {
      return hasBlowerDoorTest;
    }
    if (step.navigationTarget?.includes('duct') || stepName.includes('duct')) {
      return hasDuctLeakageTest;
    }
    if (step.navigationTarget?.includes('ventilation') || stepName.includes('ventilation')) {
      return hasVentilationTest;
    }
    
    // Photo/Documentation steps: complete when photos uploaded
    // Match on "photo", "documentation", "equipment" in name or description
    if (stepName.includes('photo') || stepName.includes('documentation') || stepName.includes('equipment') ||
        stepDesc.includes('photo') || stepDesc.includes('documentation')) {
      return job.photoUploadComplete || false;
    }
    
    // Compliance Review step: complete when ALL required tests done AND checklist done
    if (stepName.includes('compliance') || stepName.includes('review')) {
      const allRequiredTestsDone = workflow.requiredTests.every(test => {
        if (test.testType === 'blower_door') return hasBlowerDoorTest;
        if (test.testType === 'duct_leakage') return hasDuctLeakageTest;
        if (test.testType === 'ventilation') return hasVentilationTest;
        return true;
      });
      const checklistDone = checklistProgress.completed === checklistProgress.total && checklistProgress.total > 0;
      return allRequiredTestsDone && checklistDone;
    }
    
    // Informational/Preparatory steps (no explicit data): 
    // Auto-complete if ANY subsequent work has been done
    const hasAnyProgress = checklistProgress.completed > 0 || 
                          hasBlowerDoorTest || 
                          hasDuctLeakageTest || 
                          hasVentilationTest ||
                          job.photoUploadComplete ||
                          !!job.builderSignatureUrl;
    
    return hasAnyProgress;
  };
  
  // Calculate which step we're on
  const getCurrentStepIndex = (): number => {
    // Find first incomplete step
    for (let i = 0; i < workflow.steps.length; i++) {
      if (!isStepComplete(workflow.steps[i])) {
        return i; // Return first incomplete step
      }
    }
    
    // All steps complete - indicate completion by returning steps.length
    return workflow.steps.length;
  };
  
  const currentStepIndex = getCurrentStepIndex();
  const allStepsComplete = currentStepIndex >= workflow.steps.length;
  const currentStep = allStepsComplete ? workflow.steps[workflow.steps.length - 1] : workflow.steps[currentStepIndex];
  const nextStep = workflow.steps[currentStepIndex + 1];
  
  // Overall workflow progress - count completed steps explicitly
  const totalSteps = workflow.steps.length;
  const completedSteps = workflow.steps.filter(step => isStepComplete(step)).length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  
  // Get icon for step
  const getStepIcon = (step: WorkflowStep, index: number) => {
    if (index < currentStepIndex) {
      return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" data-testid={`icon-step-${index}-complete`} />;
    }
    if (index === currentStepIndex) {
      return <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" data-testid={`icon-step-${index}-current`} />;
    }
    return <Circle className="w-5 h-5 text-muted-foreground" data-testid={`icon-step-${index}-pending`} />;
  };
  
  // Get test status badge
  const getTestStatusBadge = (test: RequiredTest) => {
    const testType = test.testType;
    const isComplete = completedTests.has(testType);
    
    if (isComplete) {
      return (
        <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" data-testid={`badge-test-${testType}-complete`}>
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Complete
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" data-testid={`badge-test-${testType}-required`}>
          <AlertCircle className="w-3 h-3 mr-1" />
          Required
        </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card data-testid="card-workflow-overview">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg md:text-xl" data-testid="text-workflow-name">{workflow.displayName}</CardTitle>
              <CardDescription className="mt-1" data-testid="text-workflow-description">{workflow.description}</CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0" data-testid="badge-workflow-duration">
              <Clock className="w-3 h-3 mr-1" />
              ~{workflow.estimatedDuration}min
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" data-testid="text-overall-progress">Overall Progress</span>
                <span className="text-sm text-muted-foreground" data-testid="text-step-count">
                  Step {Math.min(completedSteps + 1, totalSteps)} of {totalSteps}
                </span>
              </div>
              <Progress value={overallProgress} className="h-2" data-testid="progress-overall" />
            </div>
            
            {/* Checklist Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" data-testid="text-checklist-progress">Checklist Items</span>
                <span className="text-sm text-muted-foreground" data-testid="text-checklist-count">
                  {checklistProgress.completed} / {checklistProgress.total}
                </span>
              </div>
              <Progress 
                value={checklistProgress.total > 0 ? (checklistProgress.completed / checklistProgress.total) * 100 : 0} 
                className="h-2" 
                data-testid="progress-checklist"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step or Completion */}
      {allStepsComplete ? (
        <Card className="border-l-4 border-l-green-600 dark:border-l-green-400" data-testid="card-workflow-complete">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base md:text-lg" data-testid="text-workflow-complete">
                  Workflow Complete!
                </CardTitle>
                <CardDescription className="mt-1" data-testid="text-workflow-complete-description">
                  All required steps have been completed. Review your work and mark the job as complete when ready.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-blue-600 dark:border-l-blue-400" data-testid="card-current-step">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base md:text-lg" data-testid="text-current-step-name">
                  Step {currentStep.stepNumber}: {currentStep.name}
                </CardTitle>
                <CardDescription className="mt-1" data-testid="text-current-step-description">
                  {currentStep.description}
                </CardDescription>
                {currentStep.estimatedMinutes && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span data-testid="text-current-step-duration">Est. {currentStep.estimatedMinutes} minutes</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          {currentStep.navigationTarget && (
            <CardContent>
              <Link href={`/inspection/${job.id}${currentStep.navigationTarget}`}>
                <Button className="w-full" size="lg" data-testid="button-navigate-step">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Go to {currentStep.name}
                </Button>
              </Link>
            </CardContent>
          )}
        </Card>
      )}

      {/* Required Tests */}
      {workflow.requiredTests.length > 0 && (
        <Card data-testid="card-required-tests">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Required Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto md:max-h-none md:overflow-visible scroll-smooth">
              {workflow.requiredTests.map((test, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/30 hover-elevate"
                  data-testid={`container-test-${test.testType}`}
                >
                  <TestTube className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium" data-testid={`text-test-name-${test.testType}`}>{test.name}</span>
                      {getTestStatusBadge(test)}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-test-description-${test.testType}`}>
                      {test.description}
                    </p>
                    {test.complianceThreshold && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <AlertCircle className="w-3 h-3" />
                        <span data-testid={`text-test-threshold-${test.testType}`}>
                          {test.complianceThreshold.metric} {test.complianceThreshold.operator} {test.complianceThreshold.threshold}
                        </span>
                      </div>
                    )}
                  </div>
                  {!completedTests.has(test.testType) && (
                    <Link href={`/inspection/${job.id}${test.navigationTarget}`}>
                      <Button variant="outline" size="sm" data-testid={`button-start-test-${test.testType}`}>
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Steps Timeline */}
      <Card data-testid="card-steps-timeline">
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Workflow Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {workflow.steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-2 rounded-md ${
                  index === currentStepIndex 
                    ? 'bg-blue-50 dark:bg-blue-950/30' 
                    : index < currentStepIndex
                    ? 'opacity-60'
                    : 'opacity-40'
                }`}
                data-testid={`container-step-${index}`}
              >
                {getStepIcon(step, index)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" data-testid={`text-step-name-${index}`}>
                      {step.stepNumber}. {step.name}
                    </span>
                    {isStepComplete(step) && (
                      <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950" data-testid={`badge-step-${index}-complete`}>
                        Done
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-step-description-${index}`}>
                    {step.description}
                  </p>
                </div>
                {step.estimatedMinutes && (
                  <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-step-duration-${index}`}>
                    {step.estimatedMinutes}m
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Guidance Notes */}
      {workflow.guidanceNotes && (
        <Card className="border-l-4 border-l-amber-500 dark:border-l-amber-400" data-testid="card-guidance">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-5 h-5" />
              Field Inspector Guidance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" data-testid="text-guidance">
              {workflow.guidanceNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
