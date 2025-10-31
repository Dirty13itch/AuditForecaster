import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Home, List } from "lucide-react";
import type { Job } from "@shared/schema";

interface JobCompletionCelebrationProps {
  job: Job;
  onClose: () => void;
  autoCloseMs?: number;
}

export function JobCompletionCelebration({ 
  job, 
  onClose,
  autoCloseMs 
}: JobCompletionCelebrationProps) {
  const [, setLocation] = useLocation();
  const [confettiPieces] = useState(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 360,
      color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)]
    }))
  );

  useEffect(() => {
    if (autoCloseMs) {
      const timer = setTimeout(() => {
        onClose();
        setLocation('/');
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [autoCloseMs, onClose, setLocation]);

  const handleDashboard = () => {
    onClose();
    setLocation('/');
  };

  const handleViewJobs = () => {
    onClose();
    setLocation('/jobs');
  };

  return (
    <Dialog 
      open={true} 
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setLocation('/');
        }
      }}
    >
      <DialogContent 
        className="sm:max-w-md overflow-hidden" 
        data-testid="dialog-job-completion"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Confetti Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" data-testid="container-confetti">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-2 h-2 opacity-80"
              style={{
                left: `${piece.left}%`,
                top: '-10%',
                backgroundColor: piece.color,
                animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s`,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          ))}
        </div>

        {/* Success Icon Animation */}
        <div className="flex flex-col items-center justify-center py-6 relative z-10">
          <div 
            className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4 animate-scale-in" 
            data-testid="container-success-icon"
          >
            <CheckCircle2 
              className="w-16 h-16 text-green-600 dark:text-green-400 animate-pulse-gentle" 
              data-testid="icon-success" 
            />
          </div>
          
          {/* Success Message */}
          <DialogTitle 
            className="text-2xl font-bold text-center mb-2 animate-fade-in-up" 
            data-testid="text-completion-title"
          >
            Job Complete!
          </DialogTitle>
          <DialogDescription 
            className="text-center mb-6 animate-fade-in-up animation-delay-100" 
            data-testid="text-completion-message"
          >
            Great work! {job.name} has been marked as complete.
          </DialogDescription>
          
          {/* Job Summary */}
          <Card className="w-full animate-fade-in-up animation-delay-200" data-testid="card-job-summary">
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
          <div className="w-full mt-6 space-y-3 animate-fade-in-up animation-delay-300">
            <p className="text-sm font-medium text-center" data-testid="text-next-steps">What's Next?</p>
            <div className="flex flex-col gap-2">
              <Button 
                variant="default" 
                className="w-full" 
                onClick={handleDashboard}
                data-testid="button-return-dashboard"
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleViewJobs}
                data-testid="button-view-jobs"
              >
                <List className="w-4 h-4 mr-2" />
                View All Jobs
              </Button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }

          @keyframes scale-in {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes pulse-gentle {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }

          @keyframes fade-in-up {
            0% {
              opacity: 0;
              transform: translateY(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-scale-in {
            animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .animate-pulse-gentle {
            animation: pulse-gentle 2s ease-in-out infinite;
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
            opacity: 0;
          }

          .animation-delay-100 {
            animation-delay: 0.1s;
          }

          .animation-delay-200 {
            animation-delay: 0.2s;
          }

          .animation-delay-300 {
            animation-delay: 0.3s;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
