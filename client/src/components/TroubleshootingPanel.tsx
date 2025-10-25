import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  Info,
  Terminal,
  BookOpen,
  Zap,
  Shield,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TroubleshootingGuide {
  code: string;
  title: string;
  symptoms: string[];
  commonCauses: string[];
  fixes: Array<{
    step: number;
    instruction: string;
    command?: string;
    example?: string;
  }>;
  relatedEndpoints: Array<{
    method: string;
    path: string;
    description: string;
  }>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'configuration' | 'network' | 'environment' | 'infrastructure';
}

interface TroubleshootingPanelProps {
  errorCode?: string;
  errorMessage?: string;
  className?: string;
  defaultOpen?: boolean;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    className: 'bg-destructive text-destructive-foreground',
    label: 'Critical',
  },
  high: {
    icon: AlertTriangle,
    className: 'bg-warning text-warning-foreground',
    label: 'High',
  },
  medium: {
    icon: Info,
    className: 'bg-secondary text-secondary-foreground',
    label: 'Medium',
  },
  low: {
    icon: Info,
    className: 'bg-muted text-muted-foreground',
    label: 'Low',
  },
};

const categoryConfig = {
  configuration: { icon: Shield, label: 'Configuration' },
  network: { icon: Zap, label: 'Network' },
  environment: { icon: Terminal, label: 'Environment' },
  infrastructure: { icon: Server, label: 'Infrastructure' },
};

export default function TroubleshootingPanel({
  errorCode,
  errorMessage,
  className,
  defaultOpen = false,
}: TroubleshootingPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const { data: guide, isLoading, error } = useQuery<TroubleshootingGuide>({
    queryKey: ['/api/auth/troubleshooting', errorCode],
    enabled: !!errorCode,
  });

  useEffect(() => {
    if (guide) {
      setCompletedSteps(new Set());
    }
  }, [guide]);

  const toggleStep = (step: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(step)) {
      newCompleted.delete(step);
    } else {
      newCompleted.add(step);
    }
    setCompletedSteps(newCompleted);
  };

  if (!errorCode) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={cn('border-primary', className)} data-testid="card-troubleshooting-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Loading Troubleshooting Guide...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !guide) {
    return null;
  }

  const SeverityIcon = severityConfig[guide.severity].icon;
  const CategoryIcon = categoryConfig[guide.category].icon;
  const progress = (completedSteps.size / guide.fixes.length) * 100;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('w-full', className)}
      data-testid="collapsible-troubleshooting"
    >
      <Card className="border-primary">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate active-elevate-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Troubleshooting Guide
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {guide.title}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge
                  className={severityConfig[guide.severity].className}
                  data-testid={`badge-severity-${guide.severity}`}
                >
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {severityConfig[guide.severity].label}
                </Badge>
                <Badge variant="outline" data-testid={`badge-category-${guide.category}`}>
                  <CategoryIcon className="h-3 w-3 mr-1" />
                  {categoryConfig[guide.category].label}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {progress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Symptoms
                </h4>
                <ul className="space-y-1 ml-6 text-sm text-muted-foreground">
                  {guide.symptoms.map((symptom, idx) => (
                    <li key={idx} className="list-disc">
                      {symptom}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary" />
                  Common Causes
                </h4>
                <ul className="space-y-1 ml-6 text-sm text-muted-foreground">
                  {guide.commonCauses.map((cause, idx) => (
                    <li key={idx} className="list-disc">
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  Step-by-Step Fixes
                </h4>
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {guide.fixes.map((fix) => (
                      <div
                        key={fix.step}
                        className={cn(
                          'flex gap-3 p-3 rounded-md border',
                          completedSteps.has(fix.step)
                            ? 'bg-secondary/20 border-secondary'
                            : 'bg-card border-border'
                        )}
                        data-testid={`step-${fix.step}`}
                      >
                        <Checkbox
                          checked={completedSteps.has(fix.step)}
                          onCheckedChange={() => toggleStep(fix.step)}
                          className="mt-1"
                          data-testid={`checkbox-step-${fix.step}`}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="font-mono">
                              {fix.step}
                            </Badge>
                            <p
                              className={cn(
                                'text-sm flex-1',
                                completedSteps.has(fix.step)
                                  ? 'line-through text-muted-foreground'
                                  : ''
                              )}
                            >
                              {fix.instruction}
                            </p>
                          </div>

                          {fix.command && (
                            <div className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                              <code>{fix.command}</code>
                            </div>
                          )}

                          {fix.example && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Example:</span> {fix.example}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {guide.relatedEndpoints.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <ExternalLink className="h-4 w-4 text-primary" />
                      Related Diagnostic Tools
                    </h4>
                    <div className="space-y-2">
                      {guide.relatedEndpoints.map((endpoint, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3"
                          asChild
                          data-testid={`button-endpoint-${idx}`}
                        >
                          <a
                            href={endpoint.path}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {endpoint.method}
                                </Badge>
                                <code className="text-xs">{endpoint.path}</code>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {endpoint.description}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" />
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
