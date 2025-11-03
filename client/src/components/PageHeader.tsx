import { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReadinessChip } from "@/components/ReadinessChip";
import { useRouteMaturity } from "@/hooks/useRouteMaturity";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Page title */
  title: string;
  
  /** Optional page description */
  description?: string;
  
  /** Optional icon to display before title */
  icon?: ReactNode;
  
  /** Optional actions to display on the right side */
  actions?: ReactNode;
  
  /** Whether to show the readiness chip (default: true) */
  showReadinessChip?: boolean;
  
  /** Custom className for the header container */
  className?: string;
  
  /** Use card style (default: false) */
  useCard?: boolean;
  
  /** Optional children to render below the header */
  children?: ReactNode;
}

/**
 * PageHeader Component
 * 
 * A standardized page header component that automatically displays
 * the ReadinessChip based on the current route's maturity level.
 * 
 * Can be used in two styles:
 * 1. Simple header with h1/p tags
 * 2. Card-based header with CardTitle/CardDescription
 * 
 * @example Simple header:
 * ```tsx
 * <PageHeader 
 *   title="Dashboard" 
 *   description="View your daily jobs and KPIs" 
 * />
 * ```
 * 
 * @example Card-based header with actions:
 * ```tsx
 * <PageHeader 
 *   title="Jobs" 
 *   description="Manage inspection jobs"
 *   useCard
 *   actions={<Button>Create Job</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  showReadinessChip = true,
  className,
  useCard = false,
  children,
}: PageHeaderProps) {
  const maturity = useRouteMaturity();
  
  // Render ReadinessChip only if we have a maturity level and it's enabled
  const readinessChip = showReadinessChip && maturity ? (
    <ReadinessChip maturity={maturity} />
  ) : null;
  
  if (useCard) {
    return (
      <Card className={cn("mb-6", className)} data-testid="card-page-header">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-3">
                {icon && <span className="flex-shrink-0">{icon}</span>}
                <CardTitle className="flex items-center gap-3" data-testid="text-page-title">
                  <span>{title}</span>
                  {readinessChip}
                </CardTitle>
              </div>
              {description && (
                <CardDescription data-testid="text-page-description">
                  {description}
                </CardDescription>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2" data-testid="container-page-actions">
                {actions}
              </div>
            )}
          </div>
          {children}
        </CardHeader>
      </Card>
    );
  }
  
  // Simple header style (default)
  return (
    <div className={cn("mb-6", className)} data-testid="container-page-header">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
              <span>{title}</span>
              {readinessChip}
            </h1>
          </div>
          {description && (
            <p className="text-muted-foreground" data-testid="text-page-description">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2" data-testid="container-page-actions">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}