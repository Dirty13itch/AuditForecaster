import { Link, useLocation } from "wouter";
import { Home, ClipboardList, Calendar, Building2, DollarSign, FileText, BarChart3, Settings, Wifi, WifiOff, CloudUpload, RefreshCw } from "lucide-react";
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
    title: "Builders",
    url: "/builders",
    icon: Building2,
  },
  {
    title: "Financials",
    url: "/financials",
    icon: DollarSign,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isOnline, pendingSync, isSyncing, forceSync } = useNetworkStatus();
  const { toast } = useToast();

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
              {menuItems.map((item) => {
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
                <AvatarImage src="" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">John Doe</p>
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
