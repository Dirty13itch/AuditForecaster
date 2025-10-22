import { useState } from "react";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import ChecklistItem from "@/components/ChecklistItem";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Inspection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("inspection");
  
  const [checklistItems, setChecklistItems] = useState([
    { id: '1', itemNumber: 1, title: 'Verify all ductwork is properly sealed at joints with mastic sealant', completed: true, notes: 'All joints sealed with mastic', photoCount: 3 },
    { id: '2', itemNumber: 2, title: 'Check for proper insulation R-value in attic spaces (minimum R-38)', completed: true, notes: 'R-49 insulation installed', photoCount: 2 },
    { id: '3', itemNumber: 3, title: 'Inspect HVAC unit installation and clearances per manufacturer specs', completed: false, notes: '', photoCount: 0 },
    { id: '4', itemNumber: 4, title: 'Verify air handler is level and properly supported', completed: false, notes: '', photoCount: 0 },
    { id: '5', itemNumber: 5, title: 'Check condensate drain line for proper slope and trap', completed: false, notes: '', photoCount: 1 },
    { id: '6', itemNumber: 6, title: 'Inspect all duct hangers and supports for proper spacing', completed: false, notes: '', photoCount: 0 },
    { id: '7', itemNumber: 7, title: 'Verify proper filter rack installation and accessibility', completed: false, notes: '', photoCount: 0 },
    { id: '8', itemNumber: 8, title: 'Check for proper vapor barrier installation on ducts', completed: false, notes: '', photoCount: 0 },
  ]);

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progress = (completedCount / totalCount) * 100;

  const handleToggle = (id: string) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleNotesChange = (id: string, notes: string) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === id ? { ...item, notes } : item
      )
    );
  };

  const handlePhotoAdd = (id: string) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === id ? { ...item, photoCount: item.photoCount + 1 } : item
      )
    );
    toast({
      title: "Photo added",
      description: "Photo has been saved locally and will sync when online.",
    });
  };

  const handleSave = () => {
    toast({
      title: "Progress saved",
      description: "Your inspection progress has been saved.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title="Johnson Residence - Pre-Drywall"
        isOnline={false}
        pendingSync={5}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold" data-testid="text-page-title">Pre-Drywall Inspection</h2>
              <p className="text-sm text-muted-foreground">1234 Oak Street, Minneapolis, MN</p>
            </div>
            <Badge variant="outline" className="hidden sm:flex" data-testid="badge-inspection-type">
              Pre-Drywall
            </Badge>
          </div>

          <div className="bg-card rounded-md border border-card-border p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-semibold" data-testid="text-progress">
                  {completedCount} of {totalCount} items complete
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-3" data-testid="progress-inspection" />
          </div>

          <div className="space-y-3">
            {checklistItems.map((item) => (
              <ChecklistItem
                key={item.id}
                {...item}
                onToggle={handleToggle}
                onNotesChange={handleNotesChange}
                onPhotoAdd={handlePhotoAdd}
              />
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleSave}
              data-testid="button-save-draft"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              className="flex-1 bg-success text-success-foreground hover:bg-success/90"
              disabled={completedCount < totalCount}
              data-testid="button-complete"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Inspection
            </Button>
          </div>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
