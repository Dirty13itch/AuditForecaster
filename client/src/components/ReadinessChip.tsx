import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FeatureMaturity } from "@shared/featureFlags";
import { cn } from "@/lib/utils";
import { AlertCircle, Beaker, TestTube, ExternalLink } from "lucide-react";

/**
 * Readiness Chip Props
 */
interface ReadinessChipProps {
  /** Feature maturity level */
  maturity: FeatureMaturity;
  
  /** Optional current route for display in dialog */
  route?: string;
  
  /** Compact mode (smaller text, minimal padding) */
  compact?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Readiness Chip Component
 * 
 * Displays feature maturity badge with color coding and optional tooltip.
 * Used in sidebar navigation and page headers to indicate feature status.
 * 
 * Color Scheme:
 * - Green: GA (Generally Available) - Production-ready
 * - Yellow: Beta - Feature-complete, undergoing refinement
 * - Gray: Experimental - Active development, unstable
 * - Red: Not Ready - Golden Path tests failed
 * 
 * @example
 * ```tsx
 * <ReadinessChip maturity={FeatureMaturity.BETA} tooltipLinkTo="/status/features" />
 * ```
 */
export function ReadinessChip({ 
  maturity, 
  route,
  compact = false,
  className 
}: ReadinessChipProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [location] = useLocation();
  const config = getMaturityConfig(maturity);
  
  // Use provided route or current location
  const currentRoute = route || location;
  
  const badge = (
    <Badge
      className={cn(
        config.className,
        compact ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1",
        "flex items-center gap-1 font-medium cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
      onClick={() => setDialogOpen(true)}
      data-testid={`chip-maturity-${maturity}`}
    >
      {config.icon && <config.icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      <span>{config.label}</span>
    </Badge>
  );
  
  return (
    <>
      {/* Tooltip wrapper */}
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="flex flex-col gap-2">
            <div className="font-medium">{config.label}</div>
            <div className="text-xs text-muted-foreground">{config.tooltip}</div>
            <div className="text-xs text-muted-foreground">Click for more details</div>
          </div>
        </TooltipContent>
      </Tooltip>
      
      {/* Dialog for detailed information */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-readiness-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {config.icon && <config.icon className="h-5 w-5" />}
              Feature Maturity: {config.label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <DialogDescription className="text-sm">
              This feature is currently in <strong>{config.label.toLowerCase()}</strong> stage.
            </DialogDescription>
            
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted rounded-md space-y-2">
                <h4 className="font-semibold">What this means:</h4>
                <p className="text-muted-foreground">{config.detailedDescription}</p>
              </div>
              
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-semibold text-sm">Maturity Levels:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-medium">GA:</span>
                    <span>Fully tested and production-ready</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 font-medium">Beta:</span>
                    <span>Feature complete but being refined</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 font-medium">Experimental:</span>
                    <span>Under active development</span>
                  </li>
                </ul>
              </div>
              
              {currentRoute && (
                <div className="border-t pt-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Current Route:</span>{" "}
                    <code className="px-1 py-0.5 bg-muted rounded text-xs">{currentRoute}</code>
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <Link href="/status/features">
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-all-features">
                  <ExternalLink className="h-3 w-3" />
                  View all features
                </Button>
              </Link>
              <Button
                variant="default"
                size="sm"
                onClick={() => setDialogOpen(false)}
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Get maturity configuration
 */
interface MaturityConfig {
  label: string;
  className: string;
  tooltip: string;
  detailedDescription: string;
  icon?: typeof Beaker;
}

function getMaturityConfig(maturity: FeatureMaturity): MaturityConfig {
  switch (maturity) {
    case FeatureMaturity.GA:
      return {
        label: "GA",
        className: "bg-green-500 dark:bg-green-600 text-white border-green-600 dark:border-green-700",
        tooltip: "Generally Available - Production-ready feature with full testing",
        detailedDescription: "This feature has passed all Golden Path tests and is considered production-ready. It has been thoroughly tested, meets all quality standards, and is stable for use in production environments.",
        icon: undefined,
      };
      
    case FeatureMaturity.BETA:
      return {
        label: "Beta",
        className: "bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-600 dark:border-yellow-700",
        tooltip: "Beta - Feature-complete but undergoing refinement and testing",
        detailedDescription: "This feature is feature-complete but still being refined. It may have partial Golden Path coverage and is available in staging environments. Some edge cases or polish items may still be in progress.",
        icon: TestTube,
      };
      
    case FeatureMaturity.EXPERIMENTAL:
      return {
        label: "Experimental",
        className: "bg-gray-500 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-700",
        tooltip: "Experimental - Active development, may be unstable",
        detailedDescription: "This feature is under active development and may be unstable. It's only available in development environments and should not be used in production. Breaking changes may occur without notice.",
        icon: Beaker,
      };
      
    default:
      return {
        label: "Unknown",
        className: "bg-gray-500 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-700",
        tooltip: "Unknown maturity level",
        detailedDescription: "The maturity level of this feature is unknown. Please contact the development team for more information.",
        icon: AlertCircle,
      };
  }
}

/**
 * Not Ready Chip Component
 * 
 * Special chip for features that failed Golden Path tests.
 * Always links to /status/features page.
 */
export function NotReadyChip({ 
  compact = false,
  className 
}: { 
  compact?: boolean;
  className?: string;
}) {
  const badge = (
    <Badge
      className={cn(
        "bg-red-500 dark:bg-red-600 text-white border-red-600 dark:border-red-700",
        compact ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1",
        "flex items-center gap-1 font-medium",
        className
      )}
      data-testid="chip-not-ready"
    >
      <AlertCircle className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      <span>Not Ready</span>
    </Badge>
  );
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="flex flex-col gap-2">
          <div className="font-medium">Not Ready</div>
          <div className="text-xs text-muted-foreground">
            This feature has not passed Golden Path testing and is not ready for use.
          </div>
          <Link href="/status/features">
            <span className="text-xs text-primary hover:underline">
              View feature status →
            </span>
          </Link>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
