import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Wifi, WifiOff, CloudUpload, RefreshCw, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type UserRole } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { ReadinessChip } from "@/components/ReadinessChip";
import { useShowExperimental } from "@/components/DevModeBanner";
import { getNavigationRoutes, getRuntimeEnv } from "@shared/gatekeeping";
import { FeatureMaturity } from "@shared/featureFlags";

/**
 * AppSidebar Component
 * 
 * Main application sidebar with dynamic route filtering based on:
 * - User roles and permissions
 * - Feature maturity level
 * - Environment (dev, staging, prod)
 * - Experimental routes toggle (dev only)
 * 
 * Routes are sourced from shared/navigation.ts ROUTE_REGISTRY and filtered
 * using shared/gatekeeping.ts logic for consistent access control.
 */
export function AppSidebar() {
  const [location] = useLocation();
  const { isOnline, pendingSync, isSyncing, forceSync } = useNetworkStatus();
  const { toast } = useToast();
  const { user } = useAuth();
  const showExperimental = useShowExperimental();
  
  // Get user roles
  const userRoles = useMemo<UserRole[]>(() => {
    if (!user) return [];
    if (user.role) return [user.role as UserRole];
    return ['inspector']; // default
  }, [user]);
  
  // Get accessible navigation routes using gatekeeping logic
  const accessibleRoutes = useMemo(() => {
    const env = getRuntimeEnv();
    return getNavigationRoutes(userRoles, env, showExperimental);
  }, [userRoles, showExperimental]);
  
  // Group routes by category for organized sidebar
  const routesByCategory = useMemo(() => {
    const categories: Record<string, typeof accessibleRoutes> = {
      'Core': [],
      'Testing': [],
      'Business Data': [],
      'Reports & Analytics': [],
      'Financial': [],
      'Compliance': [],
      'Calendar': [],
      'Settings': [],
      'Admin': [],
    };
    
    accessibleRoutes.forEach((item) => {
      const { route } = item;
      const path = route.path;
      
      // Categorize routes based on path patterns
      if (path.includes('blower-door') || path.includes('duct-leakage') || path.includes('ventilation')) {
        categories['Testing'].push(item);
      } else if (path.includes('construction-managers') || path === '/builders') {
        categories['Business Data'].push(item);
      } else if (path.includes('/financial') || path.includes('/invoices') || path === '/mileage' || path === '/expenses') {
        categories['Financial'].push(item);
      } else if (path.includes('/compliance') || path.includes('/tax-credit')) {
        categories['Compliance'].push(item);
      } else if (path.includes('/reports') || path.includes('/analytics') || path === '/scheduled-exports') {
        categories['Reports & Analytics'].push(item);
      } else if (path.includes('/calendar-') || path === '/calendar-management') {
        categories['Calendar'].push(item);
      } else if (path.includes('/settings') || path === '/audit-logs' || path === '/admin/diagnostics' || path === '/admin/background-jobs') {
        categories['Admin'].push(item);
      } else {
        // Default: Core navigation
        categories['Core'].push(item);
      }
    });
    
    // Remove empty categories
    return Object.entries(categories).filter(([_, items]) => items.length > 0);
  }, [accessibleRoutes]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getUserName = () => {
    if (!user) return "User";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    if (user.email) return user.email;
    return "User";
  };

  const handleForceSync = async () => {
    if (!isOnline) {
      toast({
        title: "Cannot sync",
        description: "You are currently offline. Sync will occur automatically when you're back online.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await forceSync();
      
      if (result && (result.success > 0 || result.failed > 0)) {
        toast({
          title: "Sync complete",
          description: `Successfully synced ${result.success} items. ${result.failed > 0 ? `${result.failed} items failed.` : ''}`,
        });
      } else {
        toast({
          title: "No items to sync",
          description: "All data is already synchronized.",
        });
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "An error occurred while syncing. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        {routesByCategory.map(([category, routes]) => (
          <div key={category}>
            <SidebarGroup>
              <SidebarGroupLabel>{category}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {routes.map(({ route, decision }) => {
                    const isActive = location === route.path || (route.path !== "/" && location.startsWith(route.path));
                    const Icon = route.icon;
                    
                    return (
                      <SidebarMenuItem key={route.path}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild isActive={isActive}>
                              <Link href={route.path} data-testid={`link-${route.path.replace(/\//g, '-').substring(1)}`}>
                                {Icon && <Icon />}
                                <span className="flex-1">{route.title}</span>
                                {decision.badge && decision.maturity !== FeatureMaturity.GA && (
                                  <ReadinessChip 
                                    maturity={decision.maturity} 
                                    compact 
                                  />
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="flex flex-col gap-1">
                            <div>{route.title}</div>
                            {route.description && (
                              <div className="text-xs opacity-75">{route.description}</div>
                            )}
                            {route.goldenPathId && (
                              <div className="text-xs opacity-75">GP: {route.goldenPathId}</div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
          </div>
        ))}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarSeparator />
        
        {pendingSync > 0 && (
          <div className="px-3 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleForceSync}
              disabled={!isOnline || isSyncing}
              data-testid="button-force-sync"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Force Sync'}
            </Button>
          </div>
        )}
        
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-2" data-testid="user-profile">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl ?? undefined} alt={`${getUserName()} profile picture`} />
                <AvatarFallback aria-label={getUserName()}>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{getUserName()}</p>
                  {user && <RoleBadge role={userRoles[0] || 'inspector'} size="sm" showIcon={false} />}
                </div>
                {user?.email && (
                  <p className="text-xs text-muted-foreground truncate mb-1" data-testid="user-email" title={user.email}>
                    {user.email}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="status-online">
                      <Wifi className="h-3 w-3" />
                      <span>Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-warning" data-testid="status-offline">
                      <WifiOff className="h-3 w-3" />
                      <span>Offline</span>
                    </div>
                  )}
                  {pendingSync > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-xs" data-testid="badge-pending-sync">
                      <CloudUpload className="h-2 w-2 mr-0.5" />
                      {pendingSync}
                    </Badge>
                  )}
                  {isSyncing && (
                    <Badge variant="secondary" className="h-4 px-1 text-xs" data-testid="badge-syncing">
                      <RefreshCw className="h-2 w-2 mr-0.5 animate-spin" />
                      Syncing
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
