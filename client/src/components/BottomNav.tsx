import { Home, ClipboardList, Camera, BarChart3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomNavProps {
  activeTab: "workflow" | "dashboard" | "inspection" | "photos" | "forecast";
  onTabChange: (tab: "workflow" | "dashboard" | "inspection" | "photos" | "forecast") => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "workflow" as const, label: "Workflow", icon: MapPin },
    { id: "inspection" as const, label: "Checklist", icon: ClipboardList },
    { id: "photos" as const, label: "Photos", icon: Camera },
    { id: "dashboard" as const, label: "Overview", icon: Home },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-card-border z-50 md:hidden">
      <div className="flex items-center justify-around h-full px-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`flex-1 flex flex-col items-center gap-1 h-full rounded-none ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={() => onTabChange(tab.id)}
            data-testid={`button-nav-${tab.id}`}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-xs">{tab.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
