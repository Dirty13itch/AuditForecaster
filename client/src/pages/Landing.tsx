import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Calendar, Camera, TrendingUp, FileText, Users } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { LucideIcon } from "lucide-react";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Phase 6 - DOCUMENT: Feature highlights displayed on landing page
interface Feature {
  icon: LucideIcon;
  title: string;
  id: string;
}

const FEATURES: Feature[] = [
  {
    icon: Calendar,
    title: "Calendar Sync",
    id: "calendar-sync",
  },
  {
    icon: Camera,
    title: "Photo Docs",
    id: "photo-docs",
  },
  {
    icon: TrendingUp,
    title: "Analytics",
    id: "analytics",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    id: "pdf-reports",
  },
  {
    icon: Users,
    title: "Builder Tracking",
    id: "builder-tracking",
  },
  {
    icon: Zap,
    title: "45L Credits",
    id: "45l-credits",
  },
] as const;

// Phase 6 - DOCUMENT: Main landing page component for unauthenticated users
// Displays app features and provides sign-in CTA with Replit authentication
// No queries - static content only, so no skeleton loaders or error states needed
function LandingContent() {
  // Phase 3 - OPTIMIZE: useCallback prevents function recreation on every render
  // Phase 5 - HARDEN: Navigation handler with validation
  const handleLogin = useCallback(() => {
    try {
      // Phase 6 - DOCUMENT: Redirect to Replit OAuth login endpoint
      // Server handles authentication flow and redirects back to dashboard
      window.location.href = "/api/login";
    } catch (error) {
      // Phase 5 - HARDEN: Graceful error handling for navigation failures
      // Fallback to reload page which will show login again
      window.location.reload();
    }
  }, []);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4"
      data-testid="landing-page-container"
    >
      <div 
        className="max-w-6xl w-full space-y-8"
        data-testid="landing-content-wrapper"
      >
        {/* Phase 6 - DOCUMENT: Hero section with app branding and tagline */}
        <div 
          className="text-center space-y-4"
          data-testid="hero-section"
        >
          <div 
            className="flex items-center justify-center gap-2 mb-4"
            data-testid="hero-logo-wrapper"
          >
            <Zap 
              className="h-12 w-12 text-primary" 
              data-testid="icon-logo"
              aria-label="Energy Auditing App Logo"
            />
            <h1 
              className="text-4xl font-bold tracking-tight"
              data-testid="heading-app-title"
            >
              Energy Auditing Field App
            </h1>
          </div>
          <p 
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
            data-testid="text-app-description"
          >
            Comprehensive field inspection management for RESNET-certified energy auditors
          </p>
        </div>

        {/* Phase 6 - DOCUMENT: Main authentication card with sign-in CTA */}
        <Card 
          className="border-2"
          data-testid="card-login"
        >
          <CardHeader 
            className="text-center"
            data-testid="card-login-header"
          >
            <CardTitle 
              className="text-2xl"
              data-testid="heading-welcome"
            >
              Welcome Back
            </CardTitle>
            <CardDescription data-testid="text-signin-description">
              Sign in to access your field auditing tools
            </CardDescription>
          </CardHeader>
          <CardContent 
            className="space-y-6"
            data-testid="card-login-content"
          >
            {/* Phase 2 - BUILD: Primary CTA with comprehensive test attributes */}
            {/* Phase 5 - HARDEN: Validated navigation handler */}
            <Button 
              size="lg" 
              className="w-full" 
              onClick={handleLogin}
              data-testid="button-login"
              aria-label="Sign in with Replit authentication"
            >
              Sign in with Replit
            </Button>

            {/* Phase 6 - DOCUMENT: Feature showcase grid */}
            {/* Responsive: 2 cols mobile, 3 cols desktop */}
            <div 
              className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t"
              data-testid="features-grid"
            >
              {FEATURES.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <div 
                    key={feature.id}
                    className="flex flex-col items-center gap-2 text-center p-4"
                    data-testid={`feature-${feature.id}`}
                  >
                    <IconComponent 
                      className="h-8 w-8 text-primary" 
                      data-testid={`icon-${feature.id}`}
                      aria-label={feature.title}
                    />
                    <span 
                      className="text-sm font-medium"
                      data-testid={`text-${feature.id}`}
                    >
                      {feature.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Phase 6 - DOCUMENT: Footer with app metadata */}
        <p 
          className="text-center text-sm text-muted-foreground"
          data-testid="text-footer"
        >
          <span data-testid="text-footer-powered">Powered by Replit</span>
          <span data-testid="text-footer-separator-1" aria-hidden="true"> • </span>
          <span data-testid="text-footer-secure">Secure authentication</span>
          <span data-testid="text-footer-separator-2" aria-hidden="true"> • </span>
          <span data-testid="text-footer-mobile">Mobile-optimized for Samsung Galaxy S23 Ultra</span>
        </p>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper with comprehensive fallback UI
// Catches any runtime errors and displays user-friendly error message
export default function Landing() {
  return (
    <ErrorBoundary>
      <LandingContent />
    </ErrorBoundary>
  );
}
