import { useState, useMemo, useCallback } from "react";
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
import { AlertCircle, Shuffle, Loader2, RefreshCw } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { useSampleSize } from "@/lib/compliance";

/**
 * Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
 * 
 * Business Context:
 * ENERGY STAR MFNC (Multifamily New Construction) Version 1.2 requires specific
 * sampling protocols for unit testing based on total building size. This ensures
 * statistical confidence in compliance verification while minimizing testing burden.
 * 
 * Sampling Rules Reference:
 * - 1-7 units: 100% testing required (small buildings need full coverage)
 * - 8-20 units: Minimum 7 units (statistical minimum for medium buildings)
 * - 21-50 units: 9 units (balanced sample for larger buildings)
 * - 51-100 units: 11 units (increased confidence for very large buildings)
 * - 101+ units: 13 units + 1 per 50 additional (scalable protocol for massive complexes)
 */

interface SamplingRule {
  minUnits: number;
  maxUnits: number | null;
  sampleSize: string;
  description: string;
}

/**
 * SAMPLING_RULES: ENERGY STAR MFNC 1.2 sampling protocol table
 * 
 * These rules define the minimum number of units that must be tested
 * to achieve ENERGY STAR certification for multifamily buildings.
 * The protocol balances statistical confidence with practical feasibility.
 */
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

/**
 * Maximum unit count for validation (prevents unrealistic inputs)
 * Largest multifamily buildings rarely exceed 1000 units
 */
const MAX_UNIT_COUNT = 1000;

/**
 * Minimum unit count for validation
 * Buildings with less than 1 unit are not valid
 */
const MIN_UNIT_COUNT = 1;

/**
 * Number of skeleton rows to show during loading
 */
const SKELETON_ROWS = 3;

/**
 * Phase 2 - BUILD: SamplingProtocolCalculatorContent component
 * 
 * Main component wrapped in ErrorBoundary at export.
 * Provides ENERGY STAR MFNC 1.2 sampling protocol calculator with:
 * - Automatic sample size calculation based on unit count
 * - Random unit selection tool for unbiased sampling
 * - Testing progress tracker with completion percentage
 * - Interactive protocol reference table
 */
function SamplingProtocolCalculatorContent() {
  const [unitCount, setUnitCount] = useState<number | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<SelectedUnit[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);

  /**
   * Phase 5 - HARDEN: Fetch sample size calculation with retry: 2
   * 
   * Business Logic - Sample Size Calculation:
   * The backend calculates required sample size based on ENERGY STAR MFNC 1.2
   * protocol. This ensures compliance with certification requirements while
   * optimizing testing efficiency for multifamily projects.
   * 
   * Retry configuration ensures resilience during network issues common in
   * field operations where inspectors may have intermittent connectivity.
   */
  const { 
    data: sampleData, 
    isLoading: calculatingSize,
    error: calculationError,
    refetch: refetchSampleSize
  } = useSampleSize(unitCount);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * Phase 5 - HARDEN: Input validation with clear error messages
   * 
   * Business Logic - Unit Count Input:
   * Validates user input to ensure:
   * - Only positive integers are accepted
   * - Unit count is within realistic range (1-1000 units)
   * - Invalid input clears calculated sample and selected units
   * 
   * This prevents calculation errors and guides users to correct input.
   */
  const handleUnitCountChange = useCallback((value: string) => {
    // Clear previous error
    setInputError(null);

    // Empty input - reset to null state
    if (value.trim() === "") {
      setUnitCount(null);
      setSelectedUnits([]);
      return;
    }

    const parsed = parseInt(value, 10);

    // Validation: Must be valid number
    if (isNaN(parsed)) {
      setInputError("Please enter a valid number");
      setUnitCount(null);
      setSelectedUnits([]);
      return;
    }

    // Validation: Must be at least 1 unit
    if (parsed < MIN_UNIT_COUNT) {
      setInputError(`Minimum ${MIN_UNIT_COUNT} unit required`);
      setUnitCount(null);
      setSelectedUnits([]);
      return;
    }

    // Validation: Must not exceed maximum
    if (parsed > MAX_UNIT_COUNT) {
      setInputError(`Maximum ${MAX_UNIT_COUNT} units allowed`);
      setUnitCount(null);
      setSelectedUnits([]);
      return;
    }

    // Valid input - set unit count and clear selected units
    setUnitCount(parsed);
    setSelectedUnits([]);
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Random Unit Selection:
   * Generates unbiased random sample using Fisher-Yates shuffle algorithm.
   * This ensures each unit has equal probability of selection, meeting
   * ENERGY STAR requirement for random sampling to avoid selection bias.
   * 
   * Selected units are sorted numerically for easy reference during field testing.
   */
  const generateRandomSample = useCallback(() => {
    if (!unitCount || !sampleData) return;

    const { sampleSize } = sampleData;
    
    // Generate array of all unit numbers (1 to unitCount)
    const units = Array.from({ length: unitCount }, (_, i) => i + 1);
    
    // Fisher-Yates shuffle for unbiased random selection
    const shuffled = [...units].sort(() => Math.random() - 0.5);
    
    // Select first N units from shuffled array
    const selected = shuffled.slice(0, sampleSize).sort((a, b) => a - b);

    // Create tracking objects for each selected unit
    setSelectedUnits(
      selected.map(unitNumber => ({
        unitNumber,
        tested: false,
      }))
    );
  }, [unitCount, sampleData]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Unit Testing Status Toggle:
   * Allows inspectors to mark units as tested during field operations.
   * Immutable state update ensures React properly detects changes for re-render.
   */
  const toggleUnitTested = useCallback((unitNumber: number) => {
    setSelectedUnits(prev =>
      prev.map(unit =>
        unit.unitNumber === unitNumber
          ? { ...unit, tested: !unit.tested }
          : unit
      )
    );
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized function for determining current sampling rule
   * 
   * Returns the index of the sampling rule that applies to the given unit count.
   * Used to highlight the relevant row in the protocol reference table.
   */
  const getCurrentRuleIndex = useCallback((count: number | null): number | null => {
    if (!count) return null;
    return SAMPLING_RULES.findIndex(rule =>
      count >= rule.minUnits && (rule.maxUnits === null || count <= rule.maxUnits)
    );
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized derived state prevents unnecessary recalculation
   * 
   * Current rule index indicates which sampling protocol row to highlight
   */
  const currentRuleIndex = useMemo(
    () => getCurrentRuleIndex(unitCount),
    [unitCount, getCurrentRuleIndex]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized derived state prevents unnecessary recalculation
   * 
   * Tested count tracks how many selected units have been marked as tested
   */
  const testedCount = useMemo(
    () => selectedUnits.filter(u => u.tested).length,
    [selectedUnits]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized derived state prevents unnecessary recalculation
   * 
   * Completion percentage provides visual progress indicator for field teams
   */
  const completionPercentage = useMemo(
    () => selectedUnits.length > 0
      ? Math.round((testedCount / selectedUnits.length) * 100)
      : 0,
    [selectedUnits.length, testedCount]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for retry action
   * 
   * Allows user to manually retry failed sample size calculation
   */
  const handleRetry = useCallback(() => {
    refetchSampleSize();
  }, [refetchSampleSize]);

  return (
    <div className="flex flex-col h-screen" data-testid="page-sampling-calculator">
      <TopBar title="ENERGY STAR Sampling Calculator" />

      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header Card */}
          <Card data-testid="card-calculator-header">
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
                  min={MIN_UNIT_COUNT}
                  max={MAX_UNIT_COUNT}
                  placeholder="Enter total unit count"
                  onChange={(e) => handleUnitCountChange(e.target.value)}
                  data-testid="input-unit-count"
                  aria-invalid={!!inputError}
                  aria-describedby={inputError ? "unit-count-error" : undefined}
                />
                {/* Phase 5 - HARDEN: Input validation error display */}
                {inputError && (
                  <Alert variant="destructive" data-testid="alert-input-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="unit-count-error" data-testid="text-input-error">
                      {inputError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Sample Size Display */}
              {unitCount && (
                <div className="p-4 bg-muted rounded-lg space-y-2" data-testid="container-sample-result">
                  {/* Phase 2 - BUILD: Loading skeleton state */}
                  {calculatingSize ? (
                    <div className="space-y-3" data-testid="container-loading-skeleton">
                      <Skeleton className="h-4 w-48" data-testid="skeleton-protocol-name" />
                      <Skeleton className="h-8 w-32" data-testid="skeleton-sample-size" />
                      <Skeleton className="h-4 w-40" data-testid="skeleton-sample-percentage" />
                    </div>
                  ) : calculationError ? (
                    /* Phase 2 - BUILD: Error state with retry action */
                    <Alert variant="destructive" data-testid="alert-calculation-error">
                      <AlertCircle className="h-4 w-4" data-testid="icon-error" />
                      <AlertDescription className="flex items-center justify-between" data-testid="text-calculation-error">
                        <span>Unable to calculate sample size. Please try again.</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRetry}
                          data-testid="button-retry-calculation"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : sampleData ? (
                    /* Phase 2 - BUILD: Success state with calculated results */
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
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sampling Protocol Table */}
          <Card data-testid="card-protocol-table">
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
                    <TableRow data-testid="row-table-header">
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
            <Card data-testid="card-random-selection">
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
                  <Shuffle className="w-4 h-4 mr-2" data-testid="icon-shuffle" />
                  Generate Random Sample
                </Button>

                {selectedUnits.length > 0 && (
                  <div className="space-y-2" data-testid="container-selected-units">
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
            <Card data-testid="card-tracking">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
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
                <div className="space-y-2" data-testid="container-progress">
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
                <div className="border rounded-lg divide-y" data-testid="container-unit-list">
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
                        aria-label={`Mark unit ${unit.unitNumber} as tested`}
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

      <BottomNav activeTab="dashboard" data-testid="bottom-nav" />
    </div>
  );
}

/**
 * Phase 2 - BUILD: ErrorBoundary wrapper for production resilience
 * 
 * Wraps component in ErrorBoundary to gracefully handle unexpected errors
 * and prevent complete app crashes during field operations.
 */
export default function SamplingProtocolCalculator() {
  return (
    <ErrorBoundary>
      <SamplingProtocolCalculatorContent />
    </ErrorBoundary>
  );
}
