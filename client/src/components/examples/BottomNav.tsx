import { useState } from 'react';
import BottomNav from '../BottomNav';

export default function BottomNavExample() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("dashboard");

  return (
    <div className="pb-20">
      <div className="p-4 text-center">
        <p className="text-muted-foreground mb-2">Current tab: <span className="font-semibold">{activeTab}</span></p>
        <p className="text-sm text-muted-foreground">Resize window to mobile width to see bottom nav</p>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
