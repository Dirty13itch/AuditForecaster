import { useState } from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import TopBar from "@/components/TopBar";
import ForecastCard from "@/components/ForecastCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Forecast() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("forecast");

  const jobInfo = {
    name: "Johnson Residence",
    address: "1234 Oak Street, Minneapolis, MN 55401",
    contractor: "Acme HVAC Solutions",
    buildingType: "Single Family",
    squareFeet: 2400,
    hvacSystem: "Forced Air, 3-Ton",
    ductLength: "145 linear feet",
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title="Duct Leakage Forecast"
        isOnline={true}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold" data-testid="text-page-title">{jobInfo.name}</h2>
              <p className="text-sm text-muted-foreground">{jobInfo.address}</p>
            </div>
            <Button variant="outline" data-testid="button-generate-report">
              <Download className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-lg font-semibold">Building Information</h3>
                <Badge variant="outline" data-testid="badge-contractor">{jobInfo.contractor}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Building Type</p>
                  <p className="font-medium">{jobInfo.buildingType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Square Feet</p>
                  <p className="font-medium">{jobInfo.squareFeet.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">HVAC System</p>
                  <p className="font-medium">{jobInfo.hvacSystem}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Duct Length</p>
                  <p className="font-medium">{jobInfo.ductLength}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Leakage Predictions</h3>
              <Button variant="outline" size="sm" data-testid="button-recalculate">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculate
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <ForecastCard
                title="Total Duct Leakage (TDL)"
                predicted={156.3}
                actual={148.7}
                unit="CFM25"
                confidence={87}
                threshold={200}
              />
              <ForecastCard
                title="Duct Leakage to Outside (DLO)"
                predicted={42.8}
                actual={51.2}
                unit="CFM25"
                confidence={82}
                threshold={50}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Analysis & Recommendations</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success"></span>
                  Total Duct Leakage (TDL)
                </h4>
                <p className="text-sm text-muted-foreground">
                  The system passed with actual TDL of 148.7 CFM25, which is 4.9% below the prediction and well within the 200 CFM25 threshold. This indicates excellent duct sealing work.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning"></span>
                  Duct Leakage to Outside (DLO)
                </h4>
                <p className="text-sm text-muted-foreground">
                  The system passed with actual DLO of 51.2 CFM25, slightly above the 50 CFM25 threshold. The result was 19.6% higher than predicted. Consider additional sealing at connection points to conditioned space.
                </p>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Contractor Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Acme HVAC Solutions has an 89% forecast accuracy rate over the last 12 jobs, with an average variance of ±8.3%. This job's results align with their historical performance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
