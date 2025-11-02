import { useMemo, useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { ChevronRight, Home, MoreHorizontal, ChevronDown } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { Job, Builder } from "@shared/schema";

// Route configuration for breadcrumb generation
const ROUTE_CONFIG: Record<string, {
  label: string;
  parent?: string;
  fetchDetails?: (id: string) => Promise<{ label: string; siblings?: Array<{ id: string; label: string }> }>;
}> = {
  "/": { label: "Dashboard" },
  "/jobs": { label: "Jobs", parent: "/" },
  "/jobs/:id": { 
    label: "Job Details", 
    parent: "/jobs",
    fetchDetails: async (id: string) => {
      const response = await fetch(`/api/jobs/${id}`);
      if (!response.ok) throw new Error("Failed to fetch job");
      const job = await response.json();
      return { 
        label: job.name || `Job #${id}`,
        siblings: [] // Could fetch related jobs here
      };
    }
  },
  "/builders": { label: "Builders", parent: "/" },
  "/builders/:id": { 
    label: "Builder Details", 
    parent: "/builders",
    fetchDetails: async (id: string) => {
      const response = await fetch(`/api/builders/${id}`);
      if (!response.ok) throw new Error("Failed to fetch builder");
      const builder = await response.json();
      return {
        label: builder.name || `Builder #${id}`,
        siblings: [] // Could fetch other builders here
      };
    }
  },
  "/builders/:builderId/developments/:developmentId": {
    label: "Development",
    parent: "/builders/:builderId",
    fetchDetails: async (developmentId: string, builderId?: string) => {
      const response = await fetch(`/api/developments/${developmentId}`);
      if (!response.ok) throw new Error("Failed to fetch development");
      const development = await response.json();
      return {
        label: development.name || `Development #${developmentId}`,
        siblings: [] // Could fetch sibling developments
      };
    }
  },
  "/builders/:builderId/developments/:developmentId/lots/:lotId": {
    label: "Lot",
    parent: "/builders/:builderId/developments/:developmentId",
    fetchDetails: async (lotId: string) => {
      const response = await fetch(`/api/lots/${lotId}`);
      if (!response.ok) throw new Error("Failed to fetch lot");
      const lot = await response.json();
      return {
        label: lot.number || `Lot #${lotId}`,
        siblings: [] // Could fetch sibling lots
      };
    }
  },
  "/builders/:builderId/developments/:developmentId/lots/:lotId/jobs/:jobId": {
    label: "Job",
    parent: "/builders/:builderId/developments/:developmentId/lots/:lotId",
    fetchDetails: async (jobId: string) => {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch job");
      const job = await response.json();
      return {
        label: job.name || `Job #${jobId}`,
        siblings: [] // Could fetch sibling jobs
      };
    }
  },
  "/photos": { label: "Photos", parent: "/" },
  "/field-day": { label: "Field Day", parent: "/" },
  "/schedule": { label: "Schedule", parent: "/" },
  "/equipment": { label: "Equipment", parent: "/" },
  "/equipment/:id": { label: "Equipment Details", parent: "/equipment" },
  "/expenses": { label: "Expenses", parent: "/" },
  "/mileage": { label: "Mileage", parent: "/" },
  "/settings": { label: "Settings", parent: "/" },
  "/financial": { label: "Financial", parent: "/" },
  "/financial/invoices": { label: "Invoices", parent: "/financial" },
  "/financial/payments": { label: "Payments", parent: "/financial" },
  "/financial/ar-aging": { label: "AR Aging", parent: "/financial" },
  "/financial/unbilled-work": { label: "Unbilled Work", parent: "/financial" },
  "/financial/expenses": { label: "Expenses", parent: "/financial" },
  "/financial/analytics": { label: "Analytics", parent: "/financial" },
  "/compliance": { label: "Compliance", parent: "/" },
  "/quality-assurance": { label: "Quality Assurance", parent: "/" },
  "/reports": { label: "Reports", parent: "/" },
  "/analytics": { label: "Analytics", parent: "/" },
};

// Match route pattern with actual path
function matchRoute(pathname: string): { pattern: string; params: Record<string, string> } | null {
  // Sort patterns by specificity (longer paths first)
  const patterns = Object.keys(ROUTE_CONFIG).sort((a, b) => b.split('/').length - a.split('/').length);
  
  for (const pattern of patterns) {
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');
    
    if (patternParts.length !== pathParts.length) continue;
    
    const params: Record<string, string> = {};
    let match = true;
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        // Parameter match
        const paramName = patternParts[i].substring(1);
        params[paramName] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        // Literal mismatch
        match = false;
        break;
      }
    }
    
    if (match) {
      return { pattern, params };
    }
  }
  
  return null;
}

// Generate breadcrumb items from current path
function generateBreadcrumbs(pathname: string): Array<{ path: string; label: string; pattern: string; params: Record<string, string> }> {
  const items: Array<{ path: string; label: string; pattern: string; params: Record<string, string> }> = [];
  
  // Always start with home
  if (pathname !== '/') {
    items.push({ path: '/', label: 'Dashboard', pattern: '/', params: {} });
  }
  
  // Find current route
  const match = matchRoute(pathname);
  if (!match) return items;
  
  // Build breadcrumb chain
  let currentPattern = match.pattern;
  const visitedPatterns = new Set<string>();
  
  while (currentPattern && !visitedPatterns.has(currentPattern)) {
    visitedPatterns.add(currentPattern);
    const config = ROUTE_CONFIG[currentPattern];
    
    if (config) {
      // Build actual path from pattern and params
      let actualPath = currentPattern;
      for (const [paramName, paramValue] of Object.entries(match.params)) {
        actualPath = actualPath.replace(`:${paramName}`, paramValue);
      }
      
      items.push({
        path: actualPath,
        label: config.label,
        pattern: currentPattern,
        params: match.params
      });
      
      currentPattern = config.parent || null;
    } else {
      break;
    }
  }
  
  // Reverse to get correct order (home -> current)
  return items.reverse();
}

interface BreadcrumbsProps {
  className?: string;
  maxItems?: number; // Maximum items to show before collapsing (for mobile)
}

export function Breadcrumbs({ className, maxItems = 3 }: BreadcrumbsProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate breadcrumb items
  const breadcrumbs = useMemo(() => generateBreadcrumbs(location), [location]);
  
  // Determine if we should collapse on mobile
  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        const isMobile = window.innerWidth < 768;
        setIsCollapsed(isMobile && breadcrumbs.length > maxItems);
      }
    };
    
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [breadcrumbs.length, maxItems]);
  
  // Fetch details for dynamic labels
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const { data: dynamicDetails } = useQuery({
    queryKey: ['breadcrumb-details', lastBreadcrumb?.pattern, lastBreadcrumb?.params],
    queryFn: async () => {
      if (!lastBreadcrumb) return null;
      const config = ROUTE_CONFIG[lastBreadcrumb.pattern];
      if (!config?.fetchDetails) return null;
      
      // Extract the ID parameter for fetching
      const idParam = Object.keys(lastBreadcrumb.params).find(key => key === 'id' || key.endsWith('Id'));
      if (!idParam) return null;
      
      return config.fetchDetails(lastBreadcrumb.params[idParam]);
    },
    enabled: !!lastBreadcrumb && !!ROUTE_CONFIG[lastBreadcrumb.pattern]?.fetchDetails,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Update last breadcrumb label if we have dynamic details
  const displayBreadcrumbs = useMemo(() => {
    if (!dynamicDetails) return breadcrumbs;
    
    return breadcrumbs.map((item, index) => {
      if (index === breadcrumbs.length - 1 && dynamicDetails.label) {
        return { ...item, label: dynamicDetails.label };
      }
      return item;
    });
  }, [breadcrumbs, dynamicDetails]);
  
  // Handle collapsed view for mobile
  const visibleBreadcrumbs = useMemo(() => {
    if (!isCollapsed) return displayBreadcrumbs;
    
    if (displayBreadcrumbs.length <= maxItems) return displayBreadcrumbs;
    
    // Show first item, ellipsis, and last (maxItems - 2) items
    const firstItem = displayBreadcrumbs[0];
    const lastItems = displayBreadcrumbs.slice(-(maxItems - 1));
    const hiddenItems = displayBreadcrumbs.slice(1, displayBreadcrumbs.length - (maxItems - 1));
    
    return {
      first: firstItem,
      hidden: hiddenItems,
      last: lastItems
    };
  }, [displayBreadcrumbs, isCollapsed, maxItems]);
  
  // Don't show breadcrumbs on home page
  if (location === '/' || displayBreadcrumbs.length === 0) {
    return null;
  }
  
  return (
    <Breadcrumb ref={containerRef} className={cn("flex items-center", className)}>
      <BreadcrumbList>
        {!isCollapsed ? (
          // Desktop view - show all breadcrumbs
          displayBreadcrumbs.map((item, index) => (
            <BreadcrumbItem key={item.path}>
              {index < displayBreadcrumbs.length - 1 ? (
                <>
                  <BreadcrumbLink asChild>
                    <Link 
                      href={item.path}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      aria-label={`Navigate to ${item.label}`}
                    >
                      {index === 0 && <Home className="w-4 h-4" />}
                      <span>{item.label}</span>
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-4 h-4" />
                  </BreadcrumbSeparator>
                </>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1">
                  {dynamicDetails?.siblings && dynamicDetails.siblings.length > 0 ? (
                    // Show dropdown for sibling navigation
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 font-normal hover:bg-transparent"
                        >
                          <span>{item.label}</span>
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {dynamicDetails.siblings.map((sibling) => (
                          <DropdownMenuItem key={sibling.id} asChild>
                            <Link href={item.path.replace(/[^/]+$/, sibling.id)}>
                              {sibling.label}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))
        ) : (
          // Mobile collapsed view
          <>
            {/* First item */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link 
                  href={visibleBreadcrumbs.first.path}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  aria-label={`Navigate to ${visibleBreadcrumbs.first.label}`}
                >
                  <Home className="w-4 h-4" />
                  <span className="sr-only md:inline">{visibleBreadcrumbs.first.label}</span>
                </Link>
              </BreadcrumbLink>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
            </BreadcrumbItem>
            
            {/* Ellipsis dropdown for hidden items */}
            {visibleBreadcrumbs.hidden.length > 0 && (
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 w-9 p-0"
                      aria-label="Show more breadcrumbs"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {visibleBreadcrumbs.hidden.map((item) => (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link href={item.path}>
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <BreadcrumbSeparator>
                  <ChevronRight className="w-4 h-4" />
                </BreadcrumbSeparator>
              </BreadcrumbItem>
            )}
            
            {/* Last items */}
            {visibleBreadcrumbs.last.map((item, index) => (
              <BreadcrumbItem key={item.path}>
                {index < visibleBreadcrumbs.last.length - 1 ? (
                  <>
                    <BreadcrumbLink asChild>
                      <Link 
                        href={item.path}
                        className="hover:text-foreground transition-colors"
                        aria-label={`Navigate to ${item.label}`}
                      >
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator>
                      <ChevronRight className="w-4 h-4" />
                    </BreadcrumbSeparator>
                  </>
                ) : (
                  <BreadcrumbPage>
                    {dynamicDetails?.siblings && dynamicDetails.siblings.length > 0 ? (
                      // Show dropdown for sibling navigation
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 font-normal hover:bg-transparent"
                          >
                            <span>{item.label}</span>
                            <ChevronDown className="w-4 h-4 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {dynamicDetails.siblings.map((sibling) => (
                            <DropdownMenuItem key={sibling.id} asChild>
                              <Link href={item.path.replace(/[^/]+$/, sibling.id)}>
                                {sibling.label}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ))}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}