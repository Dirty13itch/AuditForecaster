import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clientLogger } from "@/lib/logger";
import { useLocation } from "wouter";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    clientLogger.error("[RouteErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoToDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 flex items-center justify-center min-h-full">
          <Card className="max-w-md w-full" data-testid="route-error-boundary-fallback">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <CardTitle className="text-lg">This page encountered an error</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-md bg-muted">
                <p className="text-sm font-mono text-muted-foreground">
                  {this.state.error?.message || "An unknown error occurred"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={this.handleReset}
                  variant="default"
                  className="w-full"
                  data-testid="button-try-again"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleGoToDashboard}
                  variant="outline"
                  className="w-full"
                  data-testid="button-go-dashboard"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to use RouteErrorBoundary with functional component pattern
export function withRouteErrorBoundary(Component: () => JSX.Element) {
  return () => (
    <RouteErrorBoundary>
      <Component />
    </RouteErrorBoundary>
  );
}
