import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
    REPL_ID: string;
    ISSUER_URL: string;
    REPLIT_DOMAINS: string[];
    DATABASE_URL: string | null;
    SESSION_SECRET: string | null;
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

export default function AdminDiagnostics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testDomain, setTestDomain] = useState('');
  const [domainTestResult, setDomainTestResult] = useState<DomainTestResult | null>(null);

  const { data: diagnostics, isLoading, refetch, isFetching } = useQuery<DiagnosticsData>({
    queryKey: ["/api/auth/diagnostics"],
  });

  const testDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const response = await apiRequest("POST", "/api/auth/test-domain", { domain });
      return response.json() as Promise<DomainTestResult>;
    },
    onSuccess: (data) => {
      setDomainTestResult(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestDomain = () => {
    if (!testDomain.trim()) {
      toast({
        title: "Error",
        description: "Please enter a domain to test",
        variant: "destructive",
      });
      return;
    }
    testDomainMutation.mutate(testDomain.trim());
  };

  const handleRefresh = () => {
    setDomainTestResult(null);
    refetch();
    toast({
      title: "Refreshing",
      description: "Diagnostics data is being refreshed...",
    });
  };

  const handleTestLoginFlow = () => {
    window.open('/api/login', '_blank');
    toast({
      title: "Login Flow Test",
      description: "A new window has been opened to test the login flow",
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is only accessible to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error Loading Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Failed to load authentication diagnostics data.
            </p>
            <Button onClick={handleRefresh} data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallStatus = diagnostics.validationReport.overall;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
              <Server className="h-8 w-8" />
              Authentication Diagnostics
            </h1>
            <p className="text-muted-foreground mt-1">
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

        {/* Critical Failures Alert */}
        {diagnostics.validationReport.criticalFailures.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Critical Failures Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2" data-testid="list-critical-failures">
                {diagnostics.validationReport.criticalFailures.map((failure, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{failure}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5" data-testid="tabs-diagnostics">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="oidc" data-testid="tab-oidc">OIDC Config</TabsTrigger>
            <TabsTrigger value="domains" data-testid="tab-domains">Domains</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions</TabsTrigger>
            <TabsTrigger value="errors" data-testid="tab-errors">Errors</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {diagnostics.validationReport.results.map((result, idx) => (
                <Card key={idx} data-testid={`card-validation-${idx}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {result.component}
                    </CardTitle>
                    <StatusBadge status={result.status} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      {result.message}
                    </p>
                    {result.error && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive" data-testid="text-error">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                    {result.fix && (
                      <div className="mt-2 p-2 bg-secondary rounded text-xs" data-testid="text-fix">
                        <strong>Fix:</strong> {result.fix}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Environment Variables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
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
                    <p className="font-mono text-sm" data-testid="text-repl-id">{diagnostics.environment.REPL_ID}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Issuer URL</Label>
                    <p className="font-mono text-sm" data-testid="text-issuer-url">{diagnostics.environment.ISSUER_URL}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Database</Label>
                    <p className="font-mono text-sm" data-testid="text-database-status">
                      {diagnostics.environment.DATABASE_URL || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Session Secret</Label>
                    <p className="font-mono text-sm" data-testid="text-session-secret">
                      {diagnostics.environment.SESSION_SECRET || 'Not configured'}
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

            {/* Domain Tester */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
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
                        <CheckCircle2 className="h-5 w-5 text-secondary-foreground" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
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

            {/* Auth Flow Simulator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
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
                <p className="text-xs text-muted-foreground mt-4">
                  This will open the login page in a new window. You can test the complete authentication flow
                  including OIDC redirect, callback handling, and session creation.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OIDC Configuration Tab */}
          <TabsContent value="oidc" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
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

          {/* Domains Tab */}
          <TabsContent value="domains" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Registered Strategies
                </CardTitle>
                <CardDescription>
                  Authentication strategies configured for each domain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="list-strategies">
                  {diagnostics.registeredStrategies.map((strategy, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded">
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
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Domain Mapping Tests</CardTitle>
                <CardDescription>
                  How different hostname patterns would be matched
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="list-domain-tests">
                  {diagnostics.domainMappingTests.map((test, idx) => (
                    <div key={idx}>
                      <Label className="text-sm font-semibold" data-testid={`text-domain-base-${idx}`}>
                        Base Domain: {test.domain}
                      </Label>
                      <div className="mt-2 space-y-2">
                        {test.tests.map((t, tidx) => (
                          <div key={tidx} className="flex items-center justify-between p-2 bg-muted rounded">
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
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

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Authentication Errors
                </CardTitle>
                <CardDescription>
                  Last {Math.min(diagnostics.recentAuthErrors.length, 20)} authentication errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                {diagnostics.recentAuthErrors.length === 0 ? (
                  <div className="text-center py-8" data-testid="text-no-errors">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-secondary-foreground" />
                    <p className="text-muted-foreground">No recent authentication errors</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3" data-testid="list-errors">
                      {diagnostics.recentAuthErrors.slice(0, 20).map((error, idx) => (
                        <div key={idx} className="p-3 bg-destructive/10 rounded border border-destructive/20">
                          <div className="flex items-start gap-3">
                            <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
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
                                <Clock className="h-3 w-3" />
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

        {/* Footer timestamp */}
        <div className="text-center text-xs text-muted-foreground">
          Last updated: {new Date(diagnostics.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
