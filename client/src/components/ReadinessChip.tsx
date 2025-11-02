import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FeatureMaturity } from "@shared/featureFlags";
import { cn } from "@/lib/utils";
import { AlertCircle, Beaker, TestTube } from "lucide-react";

/**
 * Readiness Chip Props
 */
interface ReadinessChipProps {
  /** Feature maturity level */
  maturity: FeatureMaturity;
  
  /** Optional link to feature status page */
  tooltipLinkTo?: string;
  
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
  tooltipLinkTo, 
  compact = false,
  className 
}: ReadinessChipProps) {
  const config = getMaturityConfig(maturity);
  
  const badge = (
    <Badge
      className={cn(
        config.className,
        compact ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1",
        "flex items-center gap-1 font-medium",
        className
      )}
      data-testid={`chip-maturity-${maturity}`}
    >
      {config.icon && <config.icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      <span>{config.label}</span>
    </Badge>
  );
  
  // No tooltip - just return badge
  if (!config.tooltip && !tooltipLinkTo) {
    return badge;
  }
  
  // With tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="flex flex-col gap-2">
          <div className="font-medium">{config.label}</div>
          <div className="text-xs text-muted-foreground">{config.tooltip}</div>
          {tooltipLinkTo && (
            <Link href={tooltipLinkTo}>
              <span className="text-xs text-primary hover:underline">
                View feature status →
              </span>
            </Link>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Get maturity configuration
 */
interface MaturityConfig {
  label: string;
  className: string;
  tooltip: string;
  icon?: typeof Beaker;
}

function getMaturityConfig(maturity: FeatureMaturity): MaturityConfig {
  switch (maturity) {
    case FeatureMaturity.GA:
      return {
        label: "GA",
        className: "bg-green-500 dark:bg-green-600 text-white border-green-600 dark:border-green-700",
        tooltip: "Generally Available - Production-ready feature with full testing",
        icon: undefined,
      };
      
    case FeatureMaturity.BETA:
      return {
        label: "Beta",
        className: "bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-600 dark:border-yellow-700",
        tooltip: "Beta - Feature-complete but undergoing refinement and testing",
        icon: TestTube,
      };
      
    case FeatureMaturity.EXPERIMENTAL:
      return {
        label: "Experimental",
        className: "bg-gray-500 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-700",
        tooltip: "Experimental - Active development, may be unstable",
        icon: Beaker,
      };
      
    default:
      return {
        label: "Unknown",
        className: "bg-gray-500 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-700",
        tooltip: "Unknown maturity level",
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
