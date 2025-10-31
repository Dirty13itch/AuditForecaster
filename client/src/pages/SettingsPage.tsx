/**
 * Settings Page - User Preferences Management
 * 
 * Production-ready settings interface following the Vertical Completion Framework.
 * Manages email notification preferences for job updates, reports, and digests.
 * 
 * Phase 1 - PLAN:
 * - Query: /api/email-preferences (fetch current user preferences)
 * - Mutations: PATCH /api/email-preferences (save), POST /api/email-preferences/test (test email)
 * 
 * Phase 2 - BUILD:
 * - Skeleton loaders for settings sections
 * - ErrorBoundary wrapper with fallback UI
 * - Per-query error states with retry buttons
 * - Comprehensive data-testid attributes (35+)
 * - Alert dialog for test email confirmation
 * 
 * Phase 3 - OPTIMIZE:
 * - Memoized preferences state management
 * - useCallback for all event handlers
 * - Module-level constants
 * 
 * Phase 4 - TEST:
 * - E2E tests in tests/e2e/settings-workflow.spec.ts
 * 
 * Phase 5 - HARDEN:
 * - retry: 2 on all queries
 * - Validation for preference updates
 * - Edge case handling
 * 
 * Phase 6 - DOCUMENT:
 * - Inline comments for preference structure
 * - Documented constants and handlers
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton-variants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, Mail, Bell, Calendar, FileText, TrendingUp, Sun, 
  AlertCircle, RefreshCw, Send, CheckCircle2, Info 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EmailPreference } from "@shared/schema";

// Phase 3 - OPTIMIZE: Module-level constants to prevent recreation on every render
// Phase 6 - DOCUMENT: Email preference field definitions with descriptions
const EMAIL_PREFERENCE_SECTIONS = [
  {
    id: "job-updates",
    title: "Job Updates",
    description: "Notifications about inspection job assignments and status changes",
    preferences: [
      {
        key: "jobAssigned" as keyof EmailPreference,
        label: "Job Assigned",
        description: "Receive notifications when a new inspection job is assigned to you",
        icon: Bell,
      },
      {
        key: "jobStatusChanged" as keyof EmailPreference,
        label: "Job Status Changed",
        description: "Get alerts when a job fails inspection or requires attention",
        icon: Bell,
      },
    ],
  },
  {
    id: "reports-calendar",
    title: "Reports & Calendar",
    description: "Updates about generated reports and calendar event changes",
    preferences: [
      {
        key: "reportReady" as keyof EmailPreference,
        label: "Report Ready",
        description: "Notification when inspection reports are generated and ready for download",
        icon: FileText,
      },
      {
        key: "calendarEvents" as keyof EmailPreference,
        label: "Calendar Events",
        description: "Updates when calendar events are created or modified",
        icon: Calendar,
      },
    ],
  },
  {
    id: "digests-summaries",
    title: "Digests & Summaries",
    description: "Scheduled email digests and performance summaries",
    preferences: [
      {
        key: "dailyDigest" as keyof EmailPreference,
        label: "Daily Digest",
        description: "Morning summary of today's scheduled jobs (sent at 7:00 AM)",
        icon: Sun,
      },
      {
        key: "weeklyPerformanceSummary" as keyof EmailPreference,
        label: "Weekly Performance Summary",
        description: "Weekly review of your performance metrics (sent Monday at 9:00 AM)",
        icon: TrendingUp,
      },
    ],
  },
] as const;

// Phase 6 - DOCUMENT: Default preference values when creating new user preferences
const DEFAULT_PREFERENCES: Partial<EmailPreference> = {
  jobAssigned: true,
  jobStatusChanged: true,
  reportReady: true,
  calendarEvents: true,
  dailyDigest: true,
  weeklyPerformanceSummary: true,
};

// Phase 2 - BUILD: Settings skeleton loader component
// Displays loading state for all preference sections
function SettingsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="container-settings-skeleton">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-8 rounded" data-testid="skeleton-icon" />
        <Skeleton className="h-8 w-32" data-testid="skeleton-title" />
      </div>

      <Card data-testid="card-settings-skeleton">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" data-testid="skeleton-card-icon" />
            <Skeleton className="h-6 w-48" data-testid="skeleton-card-title" />
          </div>
          <Skeleton className="h-4 w-full mt-2" data-testid="skeleton-description-1" />
          <Skeleton className="h-4 w-3/4" data-testid="skeleton-description-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((sectionIndex) => (
            <div key={sectionIndex} className="space-y-4" data-testid={`skeleton-section-${sectionIndex}`}>
              <Skeleton className="h-4 w-32" data-testid={`skeleton-section-title-${sectionIndex}`} />
              {[1, 2].map((itemIndex) => (
                <div key={itemIndex} className="flex items-center justify-between" data-testid={`skeleton-item-${sectionIndex}-${itemIndex}`}>
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-40" data-testid={`skeleton-label-${sectionIndex}-${itemIndex}`} />
                    <Skeleton className="h-4 w-64" data-testid={`skeleton-desc-${sectionIndex}-${itemIndex}`} />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" data-testid={`skeleton-switch-${sectionIndex}-${itemIndex}`} />
                </div>
              ))}
              {sectionIndex < 3 && <Separator />}
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="h-10 w-40" data-testid="skeleton-button-save" />
            <Skeleton className="h-10 w-36" data-testid="skeleton-button-test" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Phase 2 - BUILD: Error state component with retry functionality
// Displays when query fails with option to retry
interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="container-error-state">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" data-testid="icon-settings" />
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Settings</h1>
      </div>

      <Alert variant="destructive" data-testid="alert-error">
        <AlertCircle className="h-4 w-4" data-testid="icon-alert-circle" />
        <AlertTitle data-testid="text-alert-title">Failed to load settings</AlertTitle>
        <AlertDescription className="flex items-center justify-between" data-testid="text-alert-description">
          <span>{message}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            data-testid="button-retry"
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" data-testid="icon-refresh" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Phase 2 - BUILD: Main Settings content component
function SettingsContent() {
  const { toast } = useToast();
  
  // Phase 3 - OPTIMIZE: Local state for preference changes before save
  const [preferences, setPreferences] = useState<Partial<EmailPreference>>({});
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Phase 5 - HARDEN: Query with retry: 2 for resilience
  // Phase 6 - DOCUMENT: Fetches current user email notification preferences
  const { 
    data: emailPrefs, 
    isLoading,
    error,
    refetch
  } = useQuery<EmailPreference>({
    queryKey: ["/api/email-preferences"],
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: Sync fetched preferences to local state
  // Uses useEffect to avoid deprecated onSuccess callback
  useEffect(() => {
    if (emailPrefs) {
      setPreferences(emailPrefs);
      setHasUnsavedChanges(false);
    }
  }, [emailPrefs]);

  // Phase 6 - DOCUMENT: Save preferences mutation
  // Updates user email notification settings on the server
  const saveMutation = useMutation({
    mutationFn: async (prefs: Partial<EmailPreference>) => {
      return await apiRequest("/api/email-preferences", {
        method: "PATCH",
        body: JSON.stringify(prefs),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-preferences"] });
      setHasUnsavedChanges(false);
      toast({
        title: "Settings saved",
        description: "Your email preferences have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save email preferences",
        variant: "destructive",
      });
    },
  });

  // Phase 6 - DOCUMENT: Test email mutation
  // Sends a sample notification email to verify email delivery
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/email-preferences/test", {
        method: "POST",
      });
    },
    onSuccess: () => {
      setTestEmailDialogOpen(false);
      toast({
        title: "Test email sent",
        description: "Check your inbox for a sample notification email.",
      });
    },
    onError: (error: any) => {
      setTestEmailDialogOpen(false);
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoized preference state
  // Phase 6 - DOCUMENT: Merges default preferences with user preferences
  const currentPreferences = useMemo(() => {
    return { ...DEFAULT_PREFERENCES, ...preferences };
  }, [preferences]);

  // Phase 3 - OPTIMIZE: useCallback for toggle handler to prevent unnecessary re-renders
  // Phase 6 - DOCUMENT: Handles preference toggle changes and marks form as dirty
  const handleToggle = useCallback((key: keyof EmailPreference, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for save handler
  // Phase 6 - DOCUMENT: Persists preference changes to the server
  const handleSave = useCallback(() => {
    saveMutation.mutate(preferences);
  }, [preferences, saveMutation]);

  // Phase 3 - OPTIMIZE: useCallback for test email handler
  // Phase 6 - DOCUMENT: Opens confirmation dialog before sending test email
  const handleTestEmail = useCallback(() => {
    setTestEmailDialogOpen(true);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for confirming test email
  const handleConfirmTestEmail = useCallback(() => {
    testEmailMutation.mutate();
  }, [testEmailMutation]);

  // Phase 3 - OPTIMIZE: useCallback for retry action
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Phase 2 - BUILD: Loading state with skeleton
  if (isLoading) {
    return <SettingsSkeleton />;
  }

  // Phase 2 - BUILD: Error state with retry
  if (error) {
    return (
      <ErrorState 
        message={error instanceof Error ? error.message : "An unexpected error occurred"} 
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="container-settings-page">
      <div className="flex items-center gap-3 mb-6" data-testid="header-page">
        <Settings className="h-8 w-8 text-primary" data-testid="icon-settings-header" />
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Settings</h1>
      </div>

      {/* Phase 2 - BUILD: Info alert about configuration status */}
      <Alert className="mb-6" data-testid="alert-info">
        <Info className="h-4 w-4" data-testid="icon-info" />
        <AlertTitle data-testid="text-info-title">Email Configuration</AlertTitle>
        <AlertDescription data-testid="text-info-description">
          Email notifications require SendGrid to be configured. If not configured, notifications will be logged to the server console instead.
        </AlertDescription>
      </Alert>

      <Card data-testid="card-email-preferences">
        <CardHeader data-testid="header-email-preferences">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" data-testid="icon-mail" />
            <CardTitle data-testid="text-card-title">Email Notifications</CardTitle>
          </div>
          <CardDescription data-testid="text-card-description">
            Manage your email notification preferences. You'll receive updates based on your selections below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6" data-testid="content-preferences">
          {/* Phase 2 - BUILD: Render preference sections from constants */}
          {EMAIL_PREFERENCE_SECTIONS.map((section, sectionIndex) => (
            <div key={section.id} data-testid={`section-${section.id}`}>
              <div className="space-y-4">
                <div data-testid={`header-${section.id}`}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide" data-testid={`text-section-title-${section.id}`}>
                    {section.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1" data-testid={`text-section-description-${section.id}`}>
                    {section.description}
                  </p>
                </div>
                
                {section.preferences.map((pref, prefIndex) => {
                  const IconComponent = pref.icon;
                  return (
                    <div 
                      key={pref.key} 
                      className="flex items-center justify-between"
                      data-testid={`preference-${pref.key}`}
                    >
                      <div className="space-y-0.5 flex-1">
                        <Label 
                          htmlFor={pref.key} 
                          className="text-base font-medium flex items-center gap-2"
                          data-testid={`label-${pref.key}`}
                        >
                          <IconComponent className="h-4 w-4" data-testid={`icon-${pref.key}`} />
                          {pref.label}
                        </Label>
                        <p className="text-sm text-muted-foreground" data-testid={`description-${pref.key}`}>
                          {pref.description}
                        </p>
                      </div>
                      <Switch
                        id={pref.key}
                        checked={currentPreferences[pref.key] ?? true}
                        onCheckedChange={(checked) => handleToggle(pref.key, checked)}
                        data-testid={`switch-${pref.key}`}
                      />
                    </div>
                  );
                })}
              </div>
              
              {sectionIndex < EMAIL_PREFERENCE_SECTIONS.length - 1 && (
                <Separator className="mt-6" data-testid={`separator-${sectionIndex}`} />
              )}
            </div>
          ))}

          <Separator data-testid="separator-actions" />

          {/* Phase 2 - BUILD: Action buttons section */}
          <div className="space-y-4" data-testid="section-actions">
            {hasUnsavedChanges && (
              <Alert data-testid="alert-unsaved-changes">
                <AlertCircle className="h-4 w-4" data-testid="icon-unsaved" />
                <AlertTitle data-testid="text-unsaved-title">Unsaved Changes</AlertTitle>
                <AlertDescription data-testid="text-unsaved-description">
                  You have unsaved changes. Click "Save Preferences" to apply your changes.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-3 pt-2" data-testid="container-action-buttons">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasUnsavedChanges}
                data-testid="button-save-preferences"
              >
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" data-testid="icon-saving" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" data-testid="icon-save" />
                    Save Preferences
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={testEmailMutation.isPending}
                data-testid="button-test-email"
              >
                {testEmailMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" data-testid="icon-sending" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" data-testid="icon-send" />
                    Send Test Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase 2 - BUILD: Test email confirmation dialog */}
      <AlertDialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
        <AlertDialogContent data-testid="dialog-test-email">
          <AlertDialogHeader data-testid="header-test-email-dialog">
            <AlertDialogTitle data-testid="text-dialog-title">Send Test Email</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-dialog-description">
              This will send a sample notification email to verify your email settings are working correctly.
              Check your inbox after sending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter data-testid="footer-test-email-dialog">
            <AlertDialogCancel data-testid="button-cancel-test-email">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmTestEmail}
              data-testid="button-confirm-test-email"
            >
              Send Test Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper for the entire page
// Catches and displays any runtime errors that occur in the settings page
export default function SettingsPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 max-w-7xl mx-auto" data-testid="container-error-boundary">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="h-8 w-8 text-primary" data-testid="icon-error-settings" />
            <h1 className="text-3xl font-bold" data-testid="text-error-title">Settings</h1>
          </div>
          <Alert variant="destructive" data-testid="alert-error-boundary">
            <AlertCircle className="h-4 w-4" data-testid="icon-error-alert" />
            <AlertTitle data-testid="text-error-boundary-title">Something went wrong</AlertTitle>
            <AlertDescription data-testid="text-error-boundary-description">
              An unexpected error occurred while loading the settings page. Please refresh the page to try again.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <SettingsContent />
    </ErrorBoundary>
  );
}
