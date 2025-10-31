import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCardSkeleton } from "@/components/ui/skeleton-variants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search,
  Server,
  Key,
  Database,
  Globe,
  AlertCircle,
  ChevronRight,
  Shield,
  Clock,
} from "lucide-react";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const MAX_ERRORS_DISPLAYED = 20;
const SCROLL_AREA_HEIGHT = 500;

// Phase 6 - DOCUMENT: Interface definitions for type safety across diagnostic data
interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  error?: string;
  fix?: string;
}

interface DiagnosticsData {
  timestamp: string;
  validationReport: {
    overall: 'pass' | 'fail' | 'degraded';
    timestamp: string;
    results: ValidationResult[];
    criticalFailures: string[];
  };
  oidcConfiguration: {
    issuer: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userinfoEndpoint: string;
    endSessionEndpoint: string;
    jwksUri: string;
    rfc9207Support: boolean;
    scopesSupported?: string[];
    responseTypesSupported?: string[];
  };
  registeredStrategies: Array<{
    name: string;
    domain: string;
  }>;
  domainMappingTests: Array<{
    domain: string;
    tests: Array<{
      hostname: string;
      wouldMatch: boolean;
    }>;
  }>;
  sessionStore: {
    type: 'postgresql' | 'in_memory';
    statistics?: {
      total: number;
      active: number;
      expired: number;
    } | {
      error: string;
    };
  };
  recentAuthErrors: Array<{
    timestamp: string;
    error: string;
    context?: string;
  }>;
  environment: {
    NODE_ENV: string;
    REPL_ID: {
      present: boolean;
      masked: string;
      length: number;
    };
    ISSUER_URL: string;
    REPLIT_DOMAINS: string[];
    DATABASE_URL: {
      present: boolean;
      masked: string | null;
      length: number;
    };
    SESSION_SECRET: {
      present: boolean;
      length: number;
    };
  };
}

interface DomainTestResult {
  domain: string;
  recognized: boolean;
  strategy: string | null;
  matchType: 'exact' | 'subdomain' | 'localhost_fallback' | 'none';
  matchedDomain: string | null;
  registeredDomains: string[];
  explanation: string;
}

// Phase 6 - DOCUMENT: StatusBadge provides visual indicator for system health states
// Maps status values to appropriate badge variants and icons
function StatusBadge({ status }: { status: 'pass' | 'fail' | 'warning' | 'healthy' | 'unhealthy' | 'degraded' }) {
  const variants = {
    pass: { variant: 'default' as const, icon: CheckCircle2, className: 'bg-secondary text-secondary-foreground' },
    healthy: { variant: 'default' as const, icon: CheckCircle2, className: 'bg-secondary text-secondary-foreground' },
    fail: { variant: 'destructive' as const, icon: XCircle, className: '' },
    unhealthy: { variant: 'destructive' as const, icon: XCircle, className: '' },
    warning: { variant: 'default' as const, icon: AlertTriangle, className: 'bg-warning text-warning-foreground' },
    degraded: { variant: 'default' as const, icon: AlertTriangle, className: 'bg-warning text-warning-foreground' },
  };

  const config = variants[status] || variants.warning;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${status}`}>
      <Icon className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
}

// Phase 6 - DOCUMENT: DiagnosticsSkeleton provides loading state for entire page
// Shows placeholder content while authentication diagnostics data is being fetched
function DiagnosticsSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" data-testid="skeleton-diagnostics">
      <Skeleton className="h-12 w-64" data-testid="skeleton-title" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <DashboardCardSkeleton key={i} data-testid={`skeleton-card-${i}`} />
        ))}
      </div>
    </div>
  );
}

// Phase 2 - BUILD: Main component content extracted for ErrorBoundary wrapping
function AdminDiagnosticsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testDomain, setTestDomain] = useState('');
  const [domainTestResult, setDomainTestResult] = useState<DomainTestResult | null>(null);

  // Phase 5 - HARDEN: Query includes retry: 2 for resilience against transient failures
  // Phase 6 - DOCUMENT: Fetches comprehensive authentication diagnostics including OIDC config, 
  // domain strategies, session statistics, and recent error logs
  const { data: diagnostics, isLoading, refetch, isFetching, error: diagnosticsError } = useQuery<DiagnosticsData>({
    queryKey: ["/api/auth/diagnostics"],
    retry: 2,
  });

  // Phase 6 - DOCUMENT: Tests domain recognition against configured authentication strategies
  // Validates whether a given domain would be matched by the OIDC authentication system
  const testDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const response = await apiRequest("POST", "/api/auth/test-domain", { domain });
      return response.json() as Promise<DomainTestResult>;
    },
    onSuccess: (data) => {
      setDomainTestResult(data);
      toast({
        title: "Domain Test Complete",
        description: data.recognized ? "Domain is recognized" : "Domain is not recognized",
        variant: data.recognized ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Domain Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: useCallback prevents function recreation on every render
  // Phase 5 - HARDEN: Input validation ensures empty domains are rejected
  // Phase 6 - DOCUMENT: Validates and submits domain for authentication strategy matching test
  const handleTestDomain = useCallback(() => {
    const trimmedDomain = testDomain.trim();
    
    if (!trimmedDomain) {
      toast({
        title: "Validation Error",
        description: "Please enter a domain to test",
        variant: "destructive",
      });
      return;
    }

    // Phase 5 - HARDEN: Basic domain format validation
    if (trimmedDomain.includes(' ') || trimmedDomain.length > 253) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain name",
        variant: "destructive",
      });
      return;
    }

    testDomainMutation.mutate(trimmedDomain);
  }, [testDomain, testDomainMutation, toast]);

  // Phase 3 - OPTIMIZE: useCallback for refresh handler
  // Phase 6 - DOCUMENT: Clears test results and refetches all diagnostic data
  const handleRefresh = useCallback(() => {
    setDomainTestResult(null);
    refetch();
    toast({
      title: "Refreshing Diagnostics",
      description: "Fetching latest system status...",
    });
  }, [refetch, toast]);

  // Phase 3 - OPTIMIZE: useCallback for login flow test
  // Phase 6 - DOCUMENT: Opens login flow in new window for end-to-end authentication testing
  const handleTestLoginFlow = useCallback(() => {
    window.open('/api/login', '_blank');
    toast({
      title: "Login Flow Test",
      description: "A new window has been opened to test the login flow",
    });
  }, [toast]);

  // Phase 3 - OPTIMIZE: useMemo for computed overall status
  // Phase 6 - DOCUMENT: Derives overall system health status from validation report
  const overallStatus = useMemo(() => {
    return diagnostics?.validationReport?.overall || 'degraded';
  }, [diagnostics?.validationReport?.overall]);

  // Phase 3 - OPTIMIZE: useMemo for critical failures display
  // Phase 6 - DOCUMENT: Extracts critical failures that require immediate attention
  const hasCriticalFailures = useMemo(() => {
    return (diagnostics?.validationReport?.criticalFailures?.length || 0) > 0;
  }, [diagnostics?.validationReport?.criticalFailures]);

  // Phase 3 - OPTIMIZE: useMemo for displayed errors (limit to MAX_ERRORS_DISPLAYED)
  // Phase 6 - DOCUMENT: Slices recent auth errors to prevent performance issues with large error lists
  const displayedErrors = useMemo(() => {
    return diagnostics?.recentAuthErrors?.slice(0, MAX_ERRORS_DISPLAYED) || [];
  }, [diagnostics?.recentAuthErrors]);

  // Phase 5 - HARDEN: Access control - admin-only page
  // Phase 6 - DOCUMENT: Restricts page access to users with admin role
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" data-testid="container-access-denied">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" data-testid="icon-access-denied" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground" data-testid="text-access-denied">
              This page is only accessible to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase 2 - BUILD: Enhanced loading skeleton state
  if (isLoading) {
    return <DiagnosticsSkeleton />;
  }

  // Phase 2 - BUILD: Enhanced error state with retry capability
  // Phase 5 - HARDEN: Comprehensive error handling with user-friendly messaging
  if (!diagnostics || diagnosticsError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" data-testid="container-error">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" data-testid="icon-error" />
              Error Loading Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground" data-testid="text-error-message">
              {diagnosticsError instanceof Error 
                ? diagnosticsError.message 
                : "Failed to load authentication diagnostics data. This may indicate a server connectivity issue."}
            </p>
            <Button onClick={handleRefresh} data-testid="button-retry" disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Retrying...' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Phase 6 - DOCUMENT: Page header with system status and refresh controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
              <Server className="h-8 w-8" data-testid="icon-page-title" />
              Authentication Diagnostics
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
              System health and configuration overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={overallStatus} />
            <Button 
              onClick={handleRefresh} 
              disabled={isFetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Phase 6 - DOCUMENT: Critical failures alert - shown when system has blocking issues */}
        {hasCriticalFailures && (
          <Card className="border-destructive" data-testid="card-critical-failures">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" data-testid="icon-critical-failures" />
                Critical Failures Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2" data-testid="list-critical-failures">
                {diagnostics.validationReport.criticalFailures.map((failure, idx) => (
                  <li key={idx} className="flex items-start gap-2" data-testid={`item-critical-failure-${idx}`}>
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{failure}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Phase 6 - DOCUMENT: Tabbed interface organizing diagnostics into logical sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5" data-testid="tabs-diagnostics">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="oidc" data-testid="tab-oidc">OIDC Config</TabsTrigger>
            <TabsTrigger value="domains" data-testid="tab-domains">Domains</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions</TabsTrigger>
            <TabsTrigger value="errors" data-testid="tab-errors">Errors</TabsTrigger>
          </TabsList>

          {/* Phase 6 - DOCUMENT: Overview tab - validation results, environment config, domain tester */}
          <TabsContent value="overview" className="space-y-6">
            {/* Phase 6 - DOCUMENT: Validation results grid showing health checks for each component */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-validation-results">
              {diagnostics.validationReport.results.map((result, idx) => (
                <Card key={idx} data-testid={`card-validation-${idx}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" data-testid={`text-component-${idx}`}>
                      {result.component}
                    </CardTitle>
                    <StatusBadge status={result.status} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2" data-testid={`text-message-${idx}`}>
                      {result.message}
                    </p>
                    {result.error && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive" data-testid={`text-error-${idx}`}>
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                    {result.fix && (
                      <div className="mt-2 p-2 bg-secondary rounded text-xs" data-testid={`text-fix-${idx}`}>
                        <strong>Fix:</strong> {result.fix}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Phase 6 - DOCUMENT: Environment configuration showing critical system variables */}
            <Card data-testid="card-environment">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" data-testid="icon-environment" />
                  Environment Configuration
                </CardTitle>
                <CardDescription>Current environment variable status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Environment</Label>
                    <p className="font-mono text-sm" data-testid="text-node-env">{diagnostics.environment.NODE_ENV}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Repl ID</Label>
                    <p className="font-mono text-sm" data-testid="text-repl-id">
                      {diagnostics.environment.REPL_ID.present ? diagnostics.environment.REPL_ID.masked : 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Issuer URL</Label>
                    <p className="font-mono text-sm" data-testid="text-issuer-url">{diagnostics.environment.ISSUER_URL}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Database</Label>
                    <p className="font-mono text-sm" data-testid="text-database-status">
                      {diagnostics.environment.DATABASE_URL.present ? diagnostics.environment.DATABASE_URL.masked : 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Session Secret</Label>
                    <p className="font-mono text-sm" data-testid="text-session-secret">
                      {diagnostics.environment.SESSION_SECRET.present 
                        ? `Configured (${diagnostics.environment.SESSION_SECRET.length} chars)` 
                        : 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Registered Domains</Label>
                    <p className="font-mono text-sm" data-testid="text-domains-count">
                      {diagnostics.environment.REPLIT_DOMAINS.length} domain(s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase 6 - DOCUMENT: Domain tester for validating domain recognition against auth strategies */}
            <Card data-testid="card-domain-tester">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" data-testid="icon-domain-tester" />
                  Domain Tester
                </CardTitle>
                <CardDescription>
                  Test if a domain would be recognized by the authentication system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="example.repl.co"
                      value={testDomain}
                      onChange={(e) => setTestDomain(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTestDomain()}
                      data-testid="input-test-domain"
                      disabled={testDomainMutation.isPending}
                    />
                  </div>
                  <Button 
                    onClick={handleTestDomain}
                    disabled={testDomainMutation.isPending}
                    data-testid="button-test-domain"
                  >
                    {testDomainMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Test
                      </>
                    )}
                  </Button>
                </div>

                {/* Phase 6 - DOCUMENT: Domain test results showing match status and details */}
                {domainTestResult && (
                  <div 
                    className={`p-4 rounded border ${
                      domainTestResult.recognized 
                        ? 'bg-secondary/50 border-secondary' 
                        : 'bg-destructive/10 border-destructive'
                    }`}
                    data-testid="container-domain-result"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {domainTestResult.recognized ? (
                        <CheckCircle2 className="h-5 w-5 text-secondary-foreground" data-testid="icon-domain-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" data-testid="icon-domain-failure" />
                      )}
                      <p className="font-semibold" data-testid="text-domain-recognized">
                        {domainTestResult.recognized ? 'Domain Recognized' : 'Domain Not Recognized'}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Tested Domain</Label>
                        <p className="font-mono" data-testid="text-tested-domain">{domainTestResult.domain}</p>
                      </div>
                      {domainTestResult.recognized && (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Match Type</Label>
                            <p className="font-mono" data-testid="text-match-type">{domainTestResult.matchType}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Matched Domain</Label>
                            <p className="font-mono" data-testid="text-matched-domain">{domainTestResult.matchedDomain}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Strategy</Label>
                            <p className="font-mono" data-testid="text-strategy">{domainTestResult.strategy}</p>
                          </div>
                        </>
                      )}
                      <div>
                        <Label className="text-xs text-muted-foreground">Explanation</Label>
                        <p className="text-muted-foreground" data-testid="text-explanation">{domainTestResult.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase 6 - DOCUMENT: Auth flow simulator for testing complete OIDC flow */}
            <Card data-testid="card-auth-simulator">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" data-testid="icon-auth-simulator" />
                  Auth Flow Simulator
                </CardTitle>
                <CardDescription>
                  Test the login flow in a new window
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleTestLoginFlow} variant="outline" data-testid="button-test-login">
                  Test Login Flow
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
                <p className="text-xs text-muted-foreground mt-4" data-testid="text-auth-simulator-help">
                  This will open the login page in a new window. You can test the complete authentication flow
                  including OIDC redirect, callback handling, and session creation.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 6 - DOCUMENT: OIDC Configuration tab showing OpenID Connect endpoints and capabilities */}
          <TabsContent value="oidc" className="space-y-6">
            <Card data-testid="card-oidc-config">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" data-testid="icon-oidc" />
                  OpenID Connect Configuration
                </CardTitle>
                <CardDescription>
                  OIDC discovery endpoints and supported features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Issuer</Label>
                    <p className="font-mono text-sm" data-testid="text-oidc-issuer">{diagnostics.oidcConfiguration.issuer}</p>
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Authorization Endpoint</Label>
                      <p className="font-mono text-xs break-all" data-testid="text-auth-endpoint">
                        {diagnostics.oidcConfiguration.authorizationEndpoint}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Token Endpoint</Label>
                      <p className="font-mono text-xs break-all" data-testid="text-token-endpoint">
                        {diagnostics.oidcConfiguration.tokenEndpoint}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Userinfo Endpoint</Label>
                      <p className="font-mono text-xs break-all" data-testid="text-userinfo-endpoint">
                        {diagnostics.oidcConfiguration.userinfoEndpoint}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">End Session Endpoint</Label>
                      <p className="font-mono text-xs break-all" data-testid="text-end-session-endpoint">
                        {diagnostics.oidcConfiguration.endSessionEndpoint}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">JWKS URI</Label>
                      <p className="font-mono text-xs break-all" data-testid="text-jwks-uri">
                        {diagnostics.oidcConfiguration.jwksUri}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">RFC 9207 Support</Label>
                      <Badge variant={diagnostics.oidcConfiguration.rfc9207Support ? 'default' : 'secondary'} data-testid="badge-rfc9207">
                        {diagnostics.oidcConfiguration.rfc9207Support ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  {diagnostics.oidcConfiguration.scopesSupported && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Supported Scopes</Label>
                        <div className="flex flex-wrap gap-2" data-testid="container-scopes">
                          {diagnostics.oidcConfiguration.scopesSupported.map(scope => (
                            <Badge key={scope} variant="outline" data-testid={`badge-scope-${scope}`}>
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {diagnostics.oidcConfiguration.responseTypesSupported && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Supported Response Types</Label>
                        <div className="flex flex-wrap gap-2" data-testid="container-response-types">
                          {diagnostics.oidcConfiguration.responseTypesSupported.map(type => (
                            <Badge key={type} variant="outline" data-testid={`badge-response-${type}`}>
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 6 - DOCUMENT: Domains tab showing registered auth strategies and domain mapping tests */}
          <TabsContent value="domains" className="space-y-6">
            <Card data-testid="card-strategies">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" data-testid="icon-strategies" />
                  Registered Strategies
                </CardTitle>
                <CardDescription>
                  Authentication strategies configured for each domain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="list-strategies">
                  {diagnostics.registeredStrategies.length === 0 ? (
                    <p className="text-muted-foreground text-sm" data-testid="text-no-strategies">
                      No authentication strategies registered
                    </p>
                  ) : (
                    diagnostics.registeredStrategies.map((strategy, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded" data-testid={`item-strategy-${idx}`}>
                        <div>
                          <p className="font-mono text-sm" data-testid={`text-strategy-domain-${idx}`}>
                            {strategy.domain}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-strategy-name-${idx}`}>
                            {strategy.name}
                          </p>
                        </div>
                        <Badge variant="default" data-testid={`badge-strategy-${idx}`}>Active</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-domain-mapping">
              <CardHeader>
                <CardTitle>Domain Mapping Tests</CardTitle>
                <CardDescription>
                  How different hostname patterns would be matched
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="list-domain-tests">
                  {diagnostics.domainMappingTests.length === 0 ? (
                    <p className="text-muted-foreground text-sm" data-testid="text-no-mapping-tests">
                      No domain mapping tests available
                    </p>
                  ) : (
                    diagnostics.domainMappingTests.map((test, idx) => (
                      <div key={idx}>
                        <Label className="text-sm font-semibold" data-testid={`text-domain-base-${idx}`}>
                          Base Domain: {test.domain}
                        </Label>
                        <div className="mt-2 space-y-2">
                          {test.tests.map((t, tidx) => (
                            <div key={tidx} className="flex items-center justify-between p-2 bg-muted rounded" data-testid={`item-mapping-${idx}-${tidx}`}>
                              <span className="font-mono text-sm" data-testid={`text-hostname-${idx}-${tidx}`}>
                                {t.hostname}
                              </span>
                              {t.wouldMatch ? (
                                <Badge variant="default" className="bg-secondary text-secondary-foreground" data-testid={`badge-match-${idx}-${tidx}`}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Match
                                </Badge>
                              ) : (
                                <Badge variant="outline" data-testid={`badge-no-match-${idx}-${tidx}`}>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No Match
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 6 - DOCUMENT: Sessions tab displaying session store type and statistics */}
          <TabsContent value="sessions" className="space-y-6">
            <Card data-testid="card-sessions">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" data-testid="icon-sessions" />
                  Session Store Information
                </CardTitle>
                <CardDescription>
                  Session storage type and statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Store Type</Label>
                    <p className="font-semibold" data-testid="text-session-type">
                      {diagnostics.sessionStore.type === 'postgresql' ? 'PostgreSQL' : 'In-Memory (Development)'}
                    </p>
                  </div>
                  {diagnostics.sessionStore.statistics && 'total' in diagnostics.sessionStore.statistics && (
                    <>
                      <Separator />
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Total Sessions</Label>
                          <p className="text-2xl font-bold" data-testid="text-sessions-total">
                            {diagnostics.sessionStore.statistics.total}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Active Sessions</Label>
                          <p className="text-2xl font-bold text-secondary-foreground" data-testid="text-sessions-active">
                            {diagnostics.sessionStore.statistics.active}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Expired Sessions</Label>
                          <p className="text-2xl font-bold text-muted-foreground" data-testid="text-sessions-expired">
                            {diagnostics.sessionStore.statistics.expired}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {diagnostics.sessionStore.statistics && 'error' in diagnostics.sessionStore.statistics && (
                    <div className="p-3 bg-destructive/10 rounded" data-testid="text-session-error">
                      <p className="text-sm text-destructive">
                        {diagnostics.sessionStore.statistics.error}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phase 6 - DOCUMENT: Errors tab listing recent authentication failures with timestamps */}
          <TabsContent value="errors" className="space-y-6">
            <Card data-testid="card-errors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" data-testid="icon-errors" />
                  Recent Authentication Errors
                </CardTitle>
                <CardDescription data-testid="text-errors-subtitle">
                  Last {Math.min(displayedErrors.length, MAX_ERRORS_DISPLAYED)} authentication errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                {displayedErrors.length === 0 ? (
                  <div className="text-center py-8" data-testid="container-no-errors">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-secondary-foreground" data-testid="icon-no-errors" />
                    <p className="text-muted-foreground" data-testid="text-no-errors">No recent authentication errors</p>
                  </div>
                ) : (
                  <ScrollArea className={`h-[${SCROLL_AREA_HEIGHT}px]`} data-testid="scroll-errors">
                    <div className="space-y-3" data-testid="list-errors">
                      {displayedErrors.map((error, idx) => (
                        <div key={idx} className="p-3 bg-destructive/10 rounded border border-destructive/20" data-testid={`item-error-${idx}`}>
                          <div className="flex items-start gap-3">
                            <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" data-testid={`icon-error-${idx}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-mono break-words" data-testid={`text-error-msg-${idx}`}>
                                {error.error}
                              </p>
                              {error.context && (
                                <p className="text-xs text-muted-foreground mt-1" data-testid={`text-error-context-${idx}`}>
                                  Context: {error.context}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" data-testid={`icon-error-time-${idx}`} />
                                <span data-testid={`text-error-time-${idx}`}>
                                  {new Date(error.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Phase 6 - DOCUMENT: Footer timestamp showing when diagnostics were last updated */}
        <div className="text-center text-xs text-muted-foreground" data-testid="text-last-updated">
          Last updated: {new Date(diagnostics.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: Wrap main component in ErrorBoundary for production resilience
export default function AdminDiagnostics() {
  return (
    <ErrorBoundary>
      <AdminDiagnosticsContent />
    </ErrorBoundary>
  );
}
