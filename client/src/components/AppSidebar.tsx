import { Link, useLocation } from "wouter";
import { Home, ClipboardList, Calendar, Map, Building2, FileStack, DollarSign, FileText, BarChart3, ShieldCheck, Settings, Wifi, WifiOff, CloudUpload, RefreshCw, LogOut, Activity, CalendarClock, ClipboardCheck, History, Receipt, Package } from "lucide-react";
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
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type UserRole } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/RoleBadge";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: ClipboardList,
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: Calendar,
  },
  {
    title: "Route",
    url: "/route",
    icon: Map,
  },
  {
    title: "Builders",
    url: "/builders",
    icon: Building2,
  },
  {
    title: "Plans",
    url: "/plans",
    icon: FileStack,
  },
  {
    title: "Equipment",
    url: "/equipment",
    icon: Package,
  },
  {
    title: "Financials",
    url: "/financials",
    icon: DollarSign,
  },
  {
    title: "45L Tax Credits",
    url: "/tax-credits",
    icon: Receipt,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Report Templates",
    url: "/report-templates",
    icon: FileText,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Audit Logs",
    url: "/audit-logs",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Diagnostics",
    url: "/admin/diagnostics",
    icon: Activity,
    adminOnly: true,
  },
];

const calendarImportItems = [
  {
    title: "POC Testing",
    url: "/calendar-poc",
    icon: CalendarClock,
  },
  {
    title: "Review Queue",
    url: "/calendar-review",
    icon: ClipboardCheck,
  },
  {
    title: "Import History",
    url: "/calendar-imports",
    icon: History,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isOnline, pendingSync, isSyncing, forceSync } = useNetworkStatus();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const userRole = (user?.role as UserRole) || 'inspector';
  
  // Filter menu items based on role
  const filteredMenuItems = menuItems.filter(item => {
    // Audit Logs only for admin and manager
    if (item.url === '/audit-logs') {
      return userRole === 'admin' || userRole === 'manager';
    }
    // Diagnostics only for admin
    if ('adminOnly' in item && item.adminOnly) {
      return userRole === 'admin';
    }
    // All other items accessible to all roles
    return true;
  });

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
        <SidebarGroup>
          <SidebarGroupLabel>Field Inspection System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userRole === 'admin' && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Calendar Import</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {calendarImportItems.map((item) => {
                    const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.url} data-testid={`link-calendar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
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
                <AvatarImage src={user?.profileImageUrl} alt={getUserName()} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{getUserName()}</p>
                  <RoleBadge role={userRole} size="sm" showIcon={false} />
                </div>
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
