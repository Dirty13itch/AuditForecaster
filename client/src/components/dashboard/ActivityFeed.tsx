import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CheckCircle2, Camera, Trophy, AlertCircle, 
  FileText, Calendar, Bell, Activity 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export interface ActivityItem {
  id: string;
  type: "job_completed" | "photo_uploaded" | "achievement_unlocked" | "alert" | "report_generated" | "schedule_updated" | "system";
  title: string;
  description?: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxHeight?: number;
  showTimestamps?: boolean;
  live?: boolean;
  onItemClick?: (item: ActivityItem) => void;
  className?: string;
}

export function ActivityFeed({
  items,
  maxHeight = 400,
  showTimestamps = true,
  live = false,
  onItemClick,
  className,
}: ActivityFeedProps) {
  const [animatedItems, setAnimatedItems] = useState<string[]>([]);
  
  // Animate new items
  useEffect(() => {
    const latestItem = items[0];
    if (latestItem && !animatedItems.includes(latestItem.id)) {
      setAnimatedItems(prev => [...prev, latestItem.id]);
      setTimeout(() => {
        setAnimatedItems(prev => prev.filter(id => id !== latestItem.id));
      }, 3000);
    }
  }, [items]);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "job_completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "photo_uploaded":
        return <Camera className="h-4 w-4 text-info" />;
      case "achievement_unlocked":
        return <Trophy className="h-4 w-4 text-warning" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "report_generated":
        return <FileText className="h-4 w-4 text-primary" />;
      case "schedule_updated":
        return <Calendar className="h-4 w-4 text-secondary" />;
      case "system":
        return <Bell className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "job_completed":
        return "border-success/20 bg-success/5";
      case "photo_uploaded":
        return "border-info/20 bg-info/5";
      case "achievement_unlocked":
        return "border-warning/20 bg-warning/5";
      case "alert":
        return "border-destructive/20 bg-destructive/5";
      default:
        return "";
    }
  };

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Activity Feed</CardTitle>
          {live && (
            <Badge variant="secondary" className="animate-pulse gap-1">
              <Activity className="h-3 w-3" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3">
        <ScrollArea style={{ height: maxHeight }} className="pr-3">
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex gap-3 p-3 rounded-md border transition-all duration-300",
                    getActivityColor(item.type),
                    onItemClick && "cursor-pointer hover-elevate",
                    animatedItems.includes(item.id) && "animate-pulse bg-primary/10"
                  )}
                  onClick={() => onItemClick?.(item)}
                  data-testid={`activity-item-${item.id}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(item.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        
                        {item.user && (
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={item.user.avatar} />
                              <AvatarFallback className="text-xs">
                                {item.user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {item.user.name}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {showTimestamps && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}