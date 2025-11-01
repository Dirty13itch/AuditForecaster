import { CalendarImportQueue } from "@/components/CalendarImportQueue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Calendar, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function CalendarImportQueuePageContent() {
  const { user } = useAuth();
  
  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="wrapper-access-denied-page">
        <div className="space-y-2" data-testid="section-access-denied-header">
          <h1 className="text-3xl font-bold" data-testid="heading-access-denied">
            Calendar Import Queue
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description-denied">
            Administrative access required
          </p>
        </div>
        
        <Separator data-testid="separator-header" />
        
        <div className="max-w-2xl" data-testid="container-access-denied">
          <Alert variant="destructive" data-testid="alert-access-denied">
            <AlertCircle className="h-4 w-4" data-testid="icon-error" />
            <AlertTitle data-testid="text-alert-title">Access Denied</AlertTitle>
            <AlertDescription data-testid="text-alert-description">
              This page is only available to administrators.
            </AlertDescription>
          </Alert>
          
          <Card className="mt-6" data-testid="card-access-info">
            <CardHeader data-testid="section-card-header">
              <div className="flex items-center gap-2" data-testid="wrapper-card-title">
                <Info className="h-5 w-5 text-muted-foreground" data-testid="icon-info" />
                <CardTitle data-testid="heading-card-title">Access Requirements</CardTitle>
              </div>
              <CardDescription data-testid="text-card-description">
                Information about accessing this feature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3" data-testid="section-card-content">
              <div className="flex items-start gap-2" data-testid="wrapper-requirement-1">
                <span className="text-muted-foreground" data-testid="label-requirement-1">•</span>
                <p className="text-sm" data-testid="text-requirement-1">
                  Administrator role is required to access the calendar import queue
                </p>
              </div>
              <div className="flex items-start gap-2" data-testid="wrapper-requirement-2">
                <span className="text-muted-foreground" data-testid="label-requirement-2">•</span>
                <p className="text-sm" data-testid="text-requirement-2">
                  Contact your system administrator to request access
                </p>
              </div>
              <div className="flex items-start gap-2" data-testid="wrapper-requirement-3">
                <span className="text-muted-foreground" data-testid="label-requirement-3">•</span>
                <p className="text-sm" data-testid="text-requirement-3">
                  Current role: <Badge variant="secondary" data-testid="badge-current-role">{user?.role || 'Unknown'}</Badge>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="wrapper-queue-page">
      <div className="space-y-2" data-testid="section-page-header">
        <div className="flex items-center gap-3" data-testid="wrapper-title">
          <Calendar className="h-8 w-8 text-primary" data-testid="icon-calendar" />
          <h1 className="text-3xl font-bold" data-testid="heading-page-title">
            Calendar Import Queue
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Review and process calendar events from Google Calendar integration
        </p>
      </div>
      
      <Separator data-testid="separator-page-header" />
      
      <div className="space-y-4" data-testid="section-info-banner">
        <Alert data-testid="alert-page-info">
          <CheckCircle className="h-4 w-4" data-testid="icon-check" />
          <AlertTitle data-testid="heading-info-title">Admin Access Confirmed</AlertTitle>
          <AlertDescription data-testid="text-info-description">
            You have administrative access to manage calendar import events
          </AlertDescription>
        </Alert>
      </div>
      
      <div data-testid="container-queue-page">
        <CalendarImportQueue />
      </div>
    </div>
  );
}

export default function CalendarImportQueuePage() {
  return (
    <ErrorBoundary data-testid="wrapper-error-boundary">
      <CalendarImportQueuePageContent />
    </ErrorBoundary>
  );
}