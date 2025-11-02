import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import type { FeaturesDashboardResponse, RouteReadiness } from "@shared/dashboardTypes";
import { FeatureMaturity } from "@shared/featureFlags";
import { ReadinessChip } from "@/components/ReadinessChip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, AlertCircle, Download, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function StatusFeaturesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  // Redirect if not admin (in useEffect to avoid render-time state update)
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Block query for non-admin users to avoid 403 error before redirect
  const { data, isLoading, error } = useQuery<FeaturesDashboardResponse>({
    queryKey: ['/api/status/features'],
    enabled: user?.role === 'admin',
  });

  // Return null while redirecting non-admin users (prevents flash of error state)
  if (!user || user.role !== 'admin') {
    return null;
  }

  const routes = data?.routes || [];
  const summary = data?.summary;

  // Filter routes by active tab
  const filteredByTab = useMemo(() => {
    if (activeTab === "all") return routes;
    return routes.filter(r => r.maturity === activeTab);
  }, [routes, activeTab]);

  // Filter by search query
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab;
    
    const query = searchQuery.toLowerCase();
    return filteredByTab.filter(route =>
      route.path.toLowerCase().includes(query) ||
      route.title.toLowerCase().includes(query) ||
      route.description?.toLowerCase().includes(query) ||
      route.category?.toLowerCase().includes(query)
    );
  }, [filteredByTab, searchQuery]);

  const getGPStatusIcon = (status?: 'pass' | 'fail' | 'pending' | 'n/a') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-500" data-testid="icon-gp-pass" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" data-testid="icon-gp-fail" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" data-testid="icon-gp-pending" />;
      case 'n/a':
        return <AlertCircle className="h-4 w-4 text-gray-400" data-testid="icon-gp-na" />;
      default:
        return <span className="text-muted-foreground" data-testid="text-gp-none">—</span>;
    }
  };

  const handleExportCSV = () => {
    window.open('/api/status/features?format=csv', '_blank');
  };

  const handleExportJSON = () => {
    if (!data) return;
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feature-status.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" data-testid="skeleton-title" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" data-testid={`skeleton-card-${i}`} />
          ))}
        </div>
        <Skeleton className="h-96" data-testid="skeleton-table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card data-testid="card-error">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Features</CardTitle>
          </CardHeader>
          <CardContent>
            <p data-testid="text-error-message">{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card data-testid="card-empty">
          <CardHeader>
            <CardTitle>No Features Found</CardTitle>
            <CardDescription>The feature registry is empty.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const gaCount = summary?.ga || 0;
  const betaCount = summary?.beta || 0;
  const experimentalCount = summary?.experimental || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-title">Feature Status Dashboard</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-description">
            Track maturity levels and Golden Path test results for all {routes.length} routes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            data-testid="button-export-json"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">{routes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All registered routes</p>
          </CardContent>
        </Card>

        <Card data-testid="card-ga">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GA</CardTitle>
            <ReadinessChip maturity={FeatureMaturity.GA} compact />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ga-count">{gaCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary?.gaPercentage || 0}% of routes</p>
          </CardContent>
        </Card>

        <Card data-testid="card-beta">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beta</CardTitle>
            <ReadinessChip maturity={FeatureMaturity.BETA} compact />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-beta-count">{betaCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary?.betaPercentage || 0}% of routes</p>
          </CardContent>
        </Card>

        <Card data-testid="card-experimental">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experimental</CardTitle>
            <ReadinessChip maturity={FeatureMaturity.EXPERIMENTAL} compact />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-experimental-count">{experimentalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary?.experimentalPercentage || 0}% of routes</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by path, title, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Tabs and Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-maturity-filter">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({routes.length})
          </TabsTrigger>
          <TabsTrigger value={FeatureMaturity.GA} data-testid="tab-ga">
            GA ({gaCount})
          </TabsTrigger>
          <TabsTrigger value={FeatureMaturity.BETA} data-testid="tab-beta">
            Beta ({betaCount})
          </TabsTrigger>
          <TabsTrigger value={FeatureMaturity.EXPERIMENTAL} data-testid="tab-experimental">
            Experimental ({experimentalCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredRoutes.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No routes found matching your search.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden md:block" data-testid="card-desktop-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="table-head-path">Path</TableHead>
                      <TableHead data-testid="table-head-title">Title</TableHead>
                      <TableHead data-testid="table-head-category">Category</TableHead>
                      <TableHead data-testid="table-head-maturity">Maturity</TableHead>
                      <TableHead data-testid="table-head-gp">GP Test</TableHead>
                      <TableHead data-testid="table-head-roles">Roles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoutes.map((route) => (
                      <TableRow key={route.path} data-testid={`row-feature-${route.path.replace(/\//g, '-')}`}>
                        <TableCell className="font-mono text-sm" data-testid={`cell-path-${route.path.replace(/\//g, '-')}`}>
                          {route.path}
                        </TableCell>
                        <TableCell data-testid={`cell-title-${route.path.replace(/\//g, '-')}`}>{route.title}</TableCell>
                        <TableCell data-testid={`cell-category-${route.path.replace(/\//g, '-')}`}>
                          {route.category && (
                            <Badge variant="outline">{route.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell data-testid={`cell-maturity-${route.path.replace(/\//g, '-')}`}>
                          <ReadinessChip maturity={route.maturity} compact />
                        </TableCell>
                        <TableCell data-testid={`cell-gp-${route.path.replace(/\//g, '-')}`}>
                          <div className="flex items-center gap-2">
                            {getGPStatusIcon(route.goldenPathStatus)}
                            {route.goldenPathId && (
                              <span className="text-xs text-muted-foreground">{route.goldenPathId}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-roles-${route.path.replace(/\//g, '-')}`}>
                          <div className="flex gap-1 flex-wrap">
                            {route.roles && route.roles.length > 0 ? (
                              route.roles.map(role => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">All</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4" data-testid="container-mobile-cards">
                {filteredRoutes.map((route) => (
                  <Card key={route.path} data-testid={`card-mobile-${route.path.replace(/\//g, '-')}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-base" data-testid={`mobile-title-${route.path.replace(/\//g, '-')}`}>
                            {route.title}
                          </CardTitle>
                          <CardDescription className="font-mono text-xs mt-1" data-testid={`mobile-path-${route.path.replace(/\//g, '-')}`}>
                            {route.path}
                          </CardDescription>
                        </div>
                        <ReadinessChip maturity={route.maturity} compact />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {route.category && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Category</span>
                          <Badge variant="outline" data-testid={`mobile-category-${route.path.replace(/\//g, '-')}`}>
                            {route.category}
                          </Badge>
                        </div>
                      )}
                      
                      {route.goldenPathId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Golden Path</span>
                          <div className="flex items-center gap-2" data-testid={`mobile-gp-${route.path.replace(/\//g, '-')}`}>
                            {getGPStatusIcon(route.goldenPathStatus)}
                            <span className="text-xs">{route.goldenPathId}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between">
                        <span className="text-sm text-muted-foreground">Roles</span>
                        <div className="flex gap-1 flex-wrap justify-end" data-testid={`mobile-roles-${route.path.replace(/\//g, '-')}`}>
                          {route.roles && route.roles.length > 0 ? (
                            route.roles.map(role => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">All</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
