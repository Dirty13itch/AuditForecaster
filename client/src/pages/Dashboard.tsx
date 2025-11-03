import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { trackPageView } from '@/lib/analytics/events';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

// Lazy load dashboard components
const InspectorDashboard = lazy(() => import("./InspectorDashboard"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const PartnerDashboard = lazy(() => import("./PartnerDashboard"));

// Loading skeleton for dashboard
function DashboardLoadingSkeleton() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// Error state for failed authentication
function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
          <p className="text-muted-foreground text-center">
            We couldn't load your dashboard. Please try again.
          </p>
          <Button data-testid="button-retry-dashboard" onClick={onRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Role-based dashboard router
export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Track page view analytics
  useEffect(() => {
    trackPageView('Dashboard', user?.id);
  }, [user?.id]);

  // Loading state - show skeleton
  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  // Not authenticated - redirect to landing/login
  if (!isAuthenticated || !user) {
    return <Redirect to="/" />;
  }

  // Error state - user authenticated but no role (shouldn't happen, but handle gracefully)
  if (!user.role) {
    return <DashboardError onRetry={() => window.location.reload()} />;
  }

  // Render dashboard based on role
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      {user.role === "inspector" && <InspectorDashboard />}
      {user.role === "admin" && <AdminDashboard />}
      {user.role === "partner_contractor" && <PartnerDashboard />}
    </Suspense>
  );
}
