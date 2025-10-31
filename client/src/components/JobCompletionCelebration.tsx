import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Home, List } from "lucide-react";
import type { Job } from "@shared/schema";

interface JobCompletionCelebrationProps {
  job: Job;
  onClose: () => void;
}

export function JobCompletionCelebration({ job, onClose }: JobCompletionCelebrationProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-job-completion">
        {/* Success Icon Animation */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4" data-testid="container-success-icon">
            <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400" data-testid="icon-success" />
          </div>
          
          {/* Success Message */}
          <DialogTitle className="text-2xl font-bold text-center mb-2" data-testid="text-completion-title">
            Job Complete!
          </DialogTitle>
          <DialogDescription className="text-center mb-6" data-testid="text-completion-message">
            Great work! {job.name} has been marked as complete.
          </DialogDescription>
          
          {/* Job Summary */}
          <Card className="w-full" data-testid="card-job-summary">
            <CardHeader>
              <CardTitle className="text-base" data-testid="text-summary-title">Job Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between gap-2 text-sm" data-testid="container-summary-address">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium text-right">{job.address}</span>
              </div>
              <div className="flex justify-between gap-2 text-sm" data-testid="container-summary-contractor">
                <span className="text-muted-foreground">Contractor:</span>
                <span className="font-medium">{job.contractor}</span>
              </div>
              {job.completedDate && (
                <div className="flex justify-between gap-2 text-sm" data-testid="container-summary-completed">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium">{new Date(job.completedDate).toLocaleDateString()}</span>
                </div>
              )}
              {job.complianceStatus && (
                <div className="flex justify-between gap-2 text-sm items-center" data-testid="container-summary-compliance">
                  <span className="text-muted-foreground">Compliance:</span>
                  <Badge 
                    variant={job.complianceStatus === 'passing' ? 'default' : 'destructive'}
                    className={job.complianceStatus === 'passing' ? 'bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800' : ''}
                    data-testid="badge-compliance-status"
                  >
                    {job.complianceStatus === 'passing' ? 'Passing' : 'Failing'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Next Steps */}
          <div className="w-full mt-6 space-y-3">
            <p className="text-sm font-medium text-center" data-testid="text-next-steps">What's Next?</p>
            <div className="flex flex-col gap-2">
              <Button 
                variant="default" 
                className="w-full" 
                onClick={onClose}
                data-testid="button-return-dashboard"
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={onClose}
                data-testid="button-view-jobs"
              >
                <List className="w-4 h-4 mr-2" />
                View All Jobs
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
