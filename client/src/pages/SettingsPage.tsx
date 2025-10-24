import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Mail, Bell, Calendar, FileText, TrendingUp, Sun } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EmailPreference } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Partial<EmailPreference>>({});

  const { data: emailPrefs, isLoading } = useQuery<EmailPreference>({
    queryKey: ["/api/email-preferences"],
    onSuccess: (data) => {
      setPreferences(data);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (prefs: Partial<EmailPreference>) => {
      return await apiRequest("/api/email-preferences", {
        method: "PATCH",
        body: JSON.stringify(prefs),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-preferences"] });
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

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/email-preferences/test", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Check your inbox for a sample notification email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof EmailPreference, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(preferences);
  };

  const handleTestEmail = () => {
    testEmailMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Settings</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <p className="text-muted-foreground">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Manage your email notification preferences. You'll receive updates based on your selections below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Job Updates</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="job-assigned" className="text-base font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Job Assigned
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications when a new inspection job is assigned to you
                </p>
              </div>
              <Switch
                id="job-assigned"
                checked={preferences.jobAssigned ?? true}
                onCheckedChange={(checked) => handleToggle('jobAssigned', checked)}
                data-testid="switch-job-assigned"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="job-status" className="text-base font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Job Status Changed
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get alerts when a job fails inspection or requires attention
                </p>
              </div>
              <Switch
                id="job-status"
                checked={preferences.jobStatusChanged ?? true}
                onCheckedChange={(checked) => handleToggle('jobStatusChanged', checked)}
                data-testid="switch-job-status"
              />
            </div>
          </div>

          <Separator />

          {/* Reports & Calendar */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Reports & Calendar</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="report-ready" className="text-base font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Report Ready
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notification when inspection reports are generated and ready for download
                </p>
              </div>
              <Switch
                id="report-ready"
                checked={preferences.reportReady ?? true}
                onCheckedChange={(checked) => handleToggle('reportReady', checked)}
                data-testid="switch-report-ready"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="calendar-events" className="text-base font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Calendar Events
                </Label>
                <p className="text-sm text-muted-foreground">
                  Updates when calendar events are created or modified
                </p>
              </div>
              <Switch
                id="calendar-events"
                checked={preferences.calendarEvents ?? true}
                onCheckedChange={(checked) => handleToggle('calendarEvents', checked)}
                data-testid="switch-calendar-events"
              />
            </div>
          </div>

          <Separator />

          {/* Digests & Summaries */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Digests & Summaries</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="daily-digest" className="text-base font-medium flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Daily Digest
                </Label>
                <p className="text-sm text-muted-foreground">
                  Morning summary of today's scheduled jobs (sent at 7:00 AM)
                </p>
              </div>
              <Switch
                id="daily-digest"
                checked={preferences.dailyDigest ?? true}
                onCheckedChange={(checked) => handleToggle('dailyDigest', checked)}
                data-testid="switch-daily-digest"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="weekly-summary" className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Weekly Performance Summary
                </Label>
                <p className="text-sm text-muted-foreground">
                  Weekly review of your performance metrics (sent Monday at 9:00 AM)
                </p>
              </div>
              <Switch
                id="weekly-summary"
                checked={preferences.weeklyPerformanceSummary ?? true}
                onCheckedChange={(checked) => handleToggle('weeklyPerformanceSummary', checked)}
                data-testid="switch-weekly-summary"
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-preferences"
            >
              {saveMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestEmail}
              disabled={testEmailMutation.isPending}
              data-testid="button-test-email"
            >
              {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Note: Email notifications require SendGrid to be configured. If not configured, notifications will be logged to the server console instead.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
