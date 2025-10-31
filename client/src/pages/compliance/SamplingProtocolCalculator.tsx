import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shuffle, Loader2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { useSampleSize } from "@/lib/compliance";

interface SamplingRule {
  minUnits: number;
  maxUnits: number | null;
  sampleSize: string;
  description: string;
}

const SAMPLING_RULES: SamplingRule[] = [
  { minUnits: 1, maxUnits: 7, sampleSize: "100%", description: "All units" },
  { minUnits: 8, maxUnits: 20, sampleSize: "7", description: "7 units minimum" },
  { minUnits: 21, maxUnits: 50, sampleSize: "9", description: "9 units" },
  { minUnits: 51, maxUnits: 100, sampleSize: "11", description: "11 units" },
  { minUnits: 101, maxUnits: null, sampleSize: "13+", description: "13 units + 1 per 50 additional" },
];

interface SelectedUnit {
  unitNumber: number;
  tested: boolean;
}

export default function SamplingProtocolCalculator() {
  const [unitCount, setUnitCount] = useState<number | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<SelectedUnit[]>([]);

  const { data: sampleData, isLoading: calculatingSize } = useSampleSize(unitCount);

  const handleUnitCountChange = (value: string) => {
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed <= 0) {
      setUnitCount(null);
      setSelectedUnits([]);
    } else {
      setUnitCount(parsed);
      // Clear selected units when count changes
      setSelectedUnits([]);
    }
  };

  const generateRandomSample = () => {
    if (!unitCount || !sampleData) return;

    const { sampleSize } = sampleData;
    
    // Generate random unique unit numbers
    const units = Array.from({ length: unitCount }, (_, i) => i + 1);
    const shuffled = [...units].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, sampleSize).sort((a, b) => a - b);

    setSelectedUnits(
      selected.map(unitNumber => ({
        unitNumber,
        tested: false,
      }))
    );
  };

  const toggleUnitTested = (unitNumber: number) => {
    setSelectedUnits(prev =>
      prev.map(unit =>
        unit.unitNumber === unitNumber
          ? { ...unit, tested: !unit.tested }
          : unit
      )
    );
  };

  const getCurrentRuleIndex = (count: number | null): number | null => {
    if (!count) return null;
    return SAMPLING_RULES.findIndex(rule =>
      count >= rule.minUnits && (rule.maxUnits === null || count <= rule.maxUnits)
    );
  };

  const currentRuleIndex = getCurrentRuleIndex(unitCount);
  const testedCount = selectedUnits.filter(u => u.tested).length;
  const completionPercentage = selectedUnits.length > 0
    ? Math.round((testedCount / selectedUnits.length) * 100)
    : 0;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="ENERGY STAR Sampling Calculator" />

      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header Card */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-calculator-title">
                ENERGY STAR MFNC Sampling Protocol Calculator
              </CardTitle>
              <CardDescription data-testid="text-calculator-description">
                Calculate required sample size for multifamily unit testing per ENERGY STAR MFNC Version 1.2
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Unit Count Input */}
              <div className="space-y-2">
                <Label htmlFor="unit-count" data-testid="label-unit-count">
                  Total Number of Units
                </Label>
                <Input
                  id="unit-count"
                  type="number"
                  min="1"
                  placeholder="Enter total unit count"
                  onChange={(e) => handleUnitCountChange(e.target.value)}
                  data-testid="input-unit-count"
                />
              </div>

              {/* Sample Size Display */}
              {unitCount && (
                <div className="p-4 bg-muted rounded-lg space-y-2" data-testid="container-sample-result">
                  {calculatingSize ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" data-testid="loader-calculating" />
                      <span className="text-sm text-muted-foreground">Calculating sample size...</span>
                    </div>
                  ) : sampleData ? (
                    <>
                      <div className="text-sm text-muted-foreground" data-testid="text-protocol-name">
                        Protocol: ENERGY STAR MFNC Version 1.2
                      </div>
                      <div className="text-2xl font-bold" data-testid="text-sample-size">
                        {sampleData.sampleSize} units
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid="text-sample-percentage">
                        {Math.round((sampleData.sampleSize / sampleData.unitCount) * 100)}% of {sampleData.unitCount} units
                      </div>
                    </>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription data-testid="text-calculation-error">
                        Unable to calculate sample size. Please try again.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sampling Protocol Table */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-protocol-table-title">
                ENERGY STAR Sampling Protocol Table
              </CardTitle>
              <CardDescription data-testid="text-protocol-table-description">
                Sampling requirements based on total unit count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-unit-range">Unit Range</TableHead>
                      <TableHead data-testid="header-sample-size">Sample Size</TableHead>
                      <TableHead data-testid="header-description">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SAMPLING_RULES.map((rule, index) => (
                      <TableRow
                        key={index}
                        className={currentRuleIndex === index ? "bg-primary/10" : ""}
                        data-testid={`row-sampling-rule-${index}`}
                      >
                        <TableCell className="font-medium" data-testid={`cell-range-${index}`}>
                          {rule.minUnits}-{rule.maxUnits || "∞"}
                        </TableCell>
                        <TableCell data-testid={`cell-sample-${index}`}>
                          {rule.sampleSize}
                        </TableCell>
                        <TableCell data-testid={`cell-description-${index}`}>
                          {rule.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Random Unit Selection Tool */}
          {unitCount && sampleData && (
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-random-selection-title">
                  Random Unit Selection
                </CardTitle>
                <CardDescription data-testid="text-random-selection-description">
                  Generate a random sample of {sampleData.sampleSize} units from {unitCount} total units
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={generateRandomSample}
                  disabled={!unitCount || !sampleData}
                  data-testid="button-generate-sample"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Generate Random Sample
                </Button>

                {selectedUnits.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium" data-testid="text-selected-units-label">
                      Selected Units:
                    </div>
                    <div className="p-3 bg-muted rounded-lg font-mono text-sm" data-testid="text-selected-units">
                      Units: {selectedUnits.map(u => u.unitNumber).join(", ")}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sample Tracking Section */}
          {selectedUnits.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle data-testid="text-tracking-title">
                      Sample Tracking
                    </CardTitle>
                    <CardDescription data-testid="text-tracking-description">
                      Track testing completion for selected units
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" data-testid="badge-completion">
                    {testedCount} / {selectedUnits.length} Tested
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Completion Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground" data-testid="text-completion-label">
                      Completion
                    </span>
                    <span className="font-medium" data-testid="text-completion-percentage">
                      {completionPercentage}%
                    </span>
                  </div>
                  <Progress value={completionPercentage} data-testid="progress-completion" />
                </div>

                {/* Unit Checkboxes */}
                <div className="border rounded-lg divide-y">
                  {selectedUnits.map((unit) => (
                    <div
                      key={unit.unitNumber}
                      className="flex items-center gap-3 p-3 hover-elevate"
                      data-testid={`container-unit-${unit.unitNumber}`}
                    >
                      <Checkbox
                        checked={unit.tested}
                        onCheckedChange={() => toggleUnitTested(unit.unitNumber)}
                        data-testid={`checkbox-unit-${unit.unitNumber}`}
                      />
                      <div className="flex-1">
                        <div className="font-medium" data-testid={`text-unit-number-${unit.unitNumber}`}>
                          Unit {unit.unitNumber}
                        </div>
                      </div>
                      <Badge
                        variant={unit.tested ? "default" : "secondary"}
                        data-testid={`badge-status-${unit.unitNumber}`}
                      >
                        {unit.tested ? "Tested" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      <BottomNav activeTab="dashboard" />
    </div>
  );
}
