import { useEffect, useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { evaluateRouteAccess, getRuntimeEnv, type RouteAccessDecision } from "@shared/gatekeeping";
import type { UserRole } from "@shared/types";
import { RouteLoadingFallback } from "@/components/LoadingStates";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useShowExperimental } from "@/components/DevModeBanner";

/**
 * Protected Route Props
 */
interface ProtectedRouteProps {
  /** Child component to render if access is granted */
  children: React.ReactNode;
  
  /** Route path (optional, will use current location if not provided) */
  path?: string;
}

/**
 * Protected Route Component
 * 
 * Higher-order component that wraps routes with access checks.
 * Evaluates route access based on:
 * - Feature maturity level
 * - Environment (dev, staging, prod)
 * - User roles and permissions
 * - Golden Path test status
 * 
 * Behavior:
 * - Shows loading state while evaluating
 * - Renders children if access is granted
 * - Redirects to fallback page if access is denied
 * - Displays "Coming Soon" message for beta/experimental features
 * 
 * @example
 * ```tsx
 * <ProtectedRoute path="/admin/settings">
 *   <AdminSettings />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({ children, path }: ProtectedRouteProps) {
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [decision, setDecision] = useState<RouteAccessDecision | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(true);
  
  // Get show experimental setting - automatically updates when toggle changes
  const showExperimental = useShowExperimental();
  
  const routePath = path || location;
  
  // Evaluate route access
  useEffect(() => {
    setIsEvaluating(true);
    
    // Wait for auth to complete
    if (authLoading) {
      return;
    }
    
    // Get user roles
    const userRoles: UserRole[] = [];
    if (user && user.role) {
      userRoles.push(user.role as UserRole);
    }
    
    // Evaluate access
    const env = getRuntimeEnv();
    const accessDecision = evaluateRouteAccess(
      routePath,
      userRoles,
      env,
      showExperimental
    );
    
    setDecision(accessDecision);
    setIsEvaluating(false);
  }, [routePath, user, authLoading, showExperimental]);
  
  // Loading state
  if (isEvaluating || authLoading) {
    return <RouteLoadingFallback />;
  }
  
  // Access granted
  if (decision?.allowed) {
    return <>{children}</>;
  }
  
  // Access denied - show appropriate fallback
  return <AccessDeniedFallback decision={decision} />;
}

/**
 * Access Denied Fallback Component
 * 
 * Displays when route access is denied.
 * Shows different messages based on denial reason.
 */
function AccessDeniedFallback({ decision }: { decision: RouteAccessDecision | null }) {
  const [, setLocation] = useLocation();
  
  if (!decision) {
    // Route not found - redirect to 404
    return <Redirect to="/404" />;
  }
  
  const redirectTo = decision.redirectTo || '/';
  
  // Coming Soon page for beta/experimental features
  if (decision.badge === 'beta' || decision.badge === 'experimental') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Coming Soon</AlertTitle>
            <AlertDescription>
              {decision.message || 'This feature is not yet available in your environment.'}
            </AlertDescription>
          </Alert>
          
          {decision.route && (
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{decision.route.title}</h2>
              {decision.route.description && (
                <p className="text-muted-foreground">{decision.route.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Status:</span>
                <span className="font-medium capitalize">{decision.maturity}</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={() => setLocation(redirectTo)} data-testid="button-go-home">
              Go to Dashboard
            </Button>
            {decision.badge === 'beta' && (
              <Link href="/status/features">
                <Button variant="outline" data-testid="button-view-status">
                  View Feature Status
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Not Ready page (Golden Path test failed)
  if (decision.badge === 'not-ready') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Feature Not Ready</AlertTitle>
            <AlertDescription>
              {decision.message || 'This feature has not passed quality testing and is not ready for use.'}
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button onClick={() => setLocation(redirectTo)} data-testid="button-go-home">
              Go to Dashboard
            </Button>
            <Link href="/status/features">
              <Button variant="outline" data-testid="button-view-status">
                View Feature Status
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Permission denied (role-based)
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            {decision.message || 'You do not have permission to access this page.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => setLocation(redirectTo)} data-testid="button-go-home">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
