import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import type { FeatureStatus } from "@shared/types";
import { FeatureMaturity } from "@shared/featureFlags";
import { ReadinessChip } from "@/components/ReadinessChip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function StatusFeaturesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [maturityFilter, setMaturityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Redirect if not admin (in useEffect to avoid render-time state update)
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Block query for non-admin users to avoid 403 error before redirect
  const { data, isLoading, error } = useQuery<{ features: FeatureStatus[] }>({
    queryKey: ['/api/status/features'],
    enabled: user?.role === 'admin', // Only fetch if admin
  });

  // Return null while redirecting non-admin users (prevents flash of error state)
  if (!user || user.role !== 'admin') {
    return null;
  }

  const features = data?.features || [];

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(features.map(f => f.category));
    return Array.from(cats).sort();
  }, [features]);

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let filtered = features;

    if (maturityFilter !== "all") {
      filtered = filtered.filter(f => f.maturity === maturityFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(f => f.category === categoryFilter);
    }

    return filtered.sort((a, b) => a.path.localeCompare(b.path));
  }, [features, maturityFilter, categoryFilter]);

  const getGPStatusIcon = (status?: 'pass' | 'fail' | 'pending' | 'not_run') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-500" data-testid="icon-gp-pass" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" data-testid="icon-gp-fail" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" data-testid="icon-gp-pending" />;
      case 'not_run':
        return <AlertCircle className="h-4 w-4 text-gray-400" data-testid="icon-gp-not-run" />;
      default:
        return <span className="text-muted-foreground" data-testid="text-gp-none">—</span>;
    }
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

  if (features.length === 0) {
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

  const gaCount = features.filter(f => f.maturity === FeatureMaturity.GA).length;
  const betaCount = features.filter(f => f.maturity === FeatureMaturity.BETA).length;
  const experimentalCount = features.filter(f => f.maturity === FeatureMaturity.EXPERIMENTAL).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-title">Feature Status Dashboard</h1>
        <p className="text-muted-foreground mt-2" data-testid="text-description">
          View all routes and their maturity levels
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">{features.length}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-ga">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GA</CardTitle>
            <ReadinessChip maturity={FeatureMaturity.GA} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ga-count">{gaCount}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-beta">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beta</CardTitle>
            <ReadinessChip maturity={FeatureMaturity.BETA} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-beta-count">{betaCount}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-experimental">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experimental</CardTitle>
            <ReadinessChip maturity={FeatureMaturity.EXPERIMENTAL} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-experimental-count">{experimentalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={maturityFilter} onValueChange={setMaturityFilter}>
            <SelectTrigger data-testid="select-maturity-filter">
              <SelectValue placeholder="Filter by maturity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Maturity Levels</SelectItem>
              <SelectItem value={FeatureMaturity.GA}>GA</SelectItem>
              <SelectItem value={FeatureMaturity.BETA}>Beta</SelectItem>
              <SelectItem value={FeatureMaturity.EXPERIMENTAL}>Experimental</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger data-testid="select-category-filter">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block" data-testid="card-desktop-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="table-head-route">Route</TableHead>
              <TableHead data-testid="table-head-title">Title</TableHead>
              <TableHead data-testid="table-head-category">Category</TableHead>
              <TableHead data-testid="table-head-maturity">Maturity</TableHead>
              <TableHead data-testid="table-head-gp">GP Result</TableHead>
              <TableHead data-testid="table-head-roles">Allowed Roles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeatures.map((feature) => (
              <TableRow key={feature.path} data-testid={`row-feature-${feature.path.replace(/\//g, '-')}`}>
                <TableCell className="font-mono text-sm" data-testid={`cell-path-${feature.path.replace(/\//g, '-')}`}>
                  {feature.path}
                </TableCell>
                <TableCell data-testid={`cell-title-${feature.path.replace(/\//g, '-')}`}>{feature.title}</TableCell>
                <TableCell data-testid={`cell-category-${feature.path.replace(/\//g, '-')}`}>
                  <Badge variant="outline">{feature.category}</Badge>
                </TableCell>
                <TableCell data-testid={`cell-maturity-${feature.path.replace(/\//g, '-')}`}>
                  <ReadinessChip maturity={feature.maturity} />
                </TableCell>
                <TableCell data-testid={`cell-gp-${feature.path.replace(/\//g, '-')}`}>
                  <div className="flex items-center gap-2">
                    {getGPStatusIcon(feature.lastGPResult?.status)}
                    {feature.goldenPathId && (
                      <span className="text-xs text-muted-foreground">{feature.goldenPathId}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell data-testid={`cell-roles-${feature.path.replace(/\//g, '-')}`}>
                  <div className="flex gap-1 flex-wrap">
                    {feature.allowedRoles.map(role => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4" data-testid="container-mobile-cards">
        {filteredFeatures.map((feature) => (
          <Card key={feature.path} data-testid={`card-mobile-${feature.path.replace(/\//g, '-')}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base" data-testid={`mobile-title-${feature.path.replace(/\//g, '-')}`}>
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs mt-1" data-testid={`mobile-path-${feature.path.replace(/\//g, '-')}`}>
                    {feature.path}
                  </CardDescription>
                </div>
                <ReadinessChip maturity={feature.maturity} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Category</span>
                <Badge variant="outline" data-testid={`mobile-category-${feature.path.replace(/\//g, '-')}`}>
                  {feature.category}
                </Badge>
              </div>
              
              {feature.goldenPathId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Golden Path</span>
                  <div className="flex items-center gap-2" data-testid={`mobile-gp-${feature.path.replace(/\//g, '-')}`}>
                    {getGPStatusIcon(feature.lastGPResult?.status)}
                    <span className="text-xs">{feature.goldenPathId}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground">Roles</span>
                <div className="flex gap-1 flex-wrap justify-end" data-testid={`mobile-roles-${feature.path.replace(/\//g, '-')}`}>
                  {feature.allowedRoles.map(role => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
