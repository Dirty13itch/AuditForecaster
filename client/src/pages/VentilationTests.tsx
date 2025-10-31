import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { VentilationTest, InsertVentilationTest } from "@shared/schema";
import { 
  Wind, 
  Gauge, 
  Calculator, 
  Save, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Home,
  ChefHat,
  Bath,
  Activity,
  RefreshCw,
  ArrowLeft
} from "lucide-react";

// Phase 3 - OPTIMIZE: Module-level constants for ASHRAE 62.2 compliance thresholds

// Phase 6 - DOCUMENT: ASHRAE 62.2 Floor Area Coefficient
// Used in Qtotal formula: determines base ventilation requirement per square foot
const ASHRAE_FLOOR_AREA_COEFFICIENT = 0.03;

// Phase 6 - DOCUMENT: ASHRAE 62.2 Bedroom Factor
// Used in Qtotal formula: accounts for occupant density based on bedroom count
const ASHRAE_BEDROOM_FACTOR = 7.5;

// Phase 6 - DOCUMENT: Minnesota 2020 Energy Code - Kitchen Exhaust Requirements
// Intermittent operation: must provide at least 100 CFM
const KITCHEN_INTERMITTENT_MIN_CFM = 100;
// Continuous operation: must provide at least 25 CFM
const KITCHEN_CONTINUOUS_MIN_CFM = 25;

// Phase 6 - DOCUMENT: Minnesota 2020 Energy Code - Bathroom Exhaust Requirements
// Intermittent operation: must provide at least 50 CFM
const BATHROOM_INTERMITTENT_MIN_CFM = 50;
// Continuous operation: must provide at least 20 CFM
const BATHROOM_CONTINUOUS_MIN_CFM = 20;

// Phase 6 - DOCUMENT: Default values for test initialization
const DEFAULT_CODE_YEAR = "2020";
const DEFAULT_BEDROOM_COUNT = 3;
const DEFAULT_STORIES = 1;

function VentilationTestsContent() {
  const { toast } = useToast();
  const { jobId } = useParams<{ jobId: string }>();
  const [activeTab, setActiveTab] = useState("house");
  
  // Test data state
  const [testData, setTestData] = useState<Partial<InsertVentilationTest>>({
    testDate: new Date(),
    testTime: new Date().toTimeString().slice(0, 5),
    equipmentSerial: "",
    equipmentCalibrationDate: undefined,
    floorArea: 0,
    bedrooms: DEFAULT_BEDROOM_COUNT,
    stories: DEFAULT_STORIES,
    requiredVentilationRate: 0,
    requiredContinuousRate: 0,
    infiltrationCredit: 0,
    adjustedRequiredRate: 0,
    // Kitchen
    kitchenExhaustType: "intermittent",
    kitchenRatedCFM: 0,
    kitchenMeasuredCFM: 0,
    kitchenMeetsCode: false,
    kitchenNotes: "",
    // Bathroom 1
    bathroom1Type: "intermittent",
    bathroom1RatedCFM: 0,
    bathroom1MeasuredCFM: 0,
    bathroom1MeetsCode: false,
    // Bathroom 2
    bathroom2Type: undefined,
    bathroom2RatedCFM: 0,
    bathroom2MeasuredCFM: 0,
    bathroom2MeetsCode: null,
    // Bathroom 3
    bathroom3Type: undefined,
    bathroom3RatedCFM: 0,
    bathroom3MeasuredCFM: 0,
    bathroom3MeetsCode: null,
    // Bathroom 4
    bathroom4Type: undefined,
    bathroom4RatedCFM: 0,
    bathroom4MeasuredCFM: 0,
    bathroom4MeetsCode: null,
    // Mechanical Ventilation
    mechanicalVentilationType: "none",
    mechanicalRatedCFM: 0,
    mechanicalMeasuredSupplyCFM: 0,
    mechanicalMeasuredExhaustCFM: 0,
    mechanicalOperatingSchedule: "continuous",
    mechanicalControls: "",
    mechanicalNotes: "",
    // Totals
    totalVentilationProvided: 0,
    meetsVentilationRequirement: false,
    codeYear: DEFAULT_CODE_YEAR,
    overallCompliant: false,
    nonComplianceNotes: "",
    recommendations: "",
    weatherConditions: "",
    inspectorNotes: "",
  });

  // Phase 5 - HARDEN: Fetch job data with retry: 2 for resilience
  const { 
    data: job, 
    isLoading: loadingJob,
    error: jobError,
    refetch: refetchJob
  } = useQuery({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch latest test data with retry: 2
  const { 
    data: existingTest, 
    isLoading: loadingTest,
    error: testError,
    refetch: refetchTest
  } = useQuery({
    queryKey: ["/api/jobs", jobId, "ventilation-tests/latest"],
    enabled: !!jobId,
    retry: 2,
  });

  // Load existing test data if available
  useEffect(() => {
    if (existingTest) {
      setTestData({
        ...existingTest,
        testDate: new Date(existingTest.testDate),
        equipmentCalibrationDate: existingTest.equipmentCalibrationDate ? new Date(existingTest.equipmentCalibrationDate) : undefined,
      });
    } else if (job) {
      setTestData(prev => ({
        ...prev,
        floorArea: parseFloat(job.floorArea || "0") || prev.floorArea,
        bedrooms: parseInt(job.bedrooms || "3") || prev.bedrooms,
      }));
    }
  }, [existingTest, job]);

  // Phase 3 - OPTIMIZE: Memoize ASHRAE 62.2 required ventilation calculation
  // Phase 6 - DOCUMENT: Calculate required whole-house ventilation per ASHRAE 62.2
  // Formula: Qtotal = 0.03 × floor_area + 7.5 × (bedrooms + 1)
  // This accounts for both floor area (dilution ventilation) and occupant density (bedrooms)
  const calculateRequiredVentilation = useCallback(() => {
    const floorArea = testData.floorArea || 0;
    const bedrooms = testData.bedrooms || 0;
    
    // Phase 5 - HARDEN: Validate inputs
    if (floorArea <= 0 || bedrooms <= 0) {
      toast({
        title: "Missing data",
        description: "Please enter floor area and number of bedrooms",
        variant: "destructive",
      });
      return;
    }

    // ASHRAE 62.2 required ventilation rate calculation
    const required = ASHRAE_FLOOR_AREA_COEFFICIENT * floorArea + ASHRAE_BEDROOM_FACTOR * (bedrooms + 1);
    const infiltrationCredit = testData.infiltrationCredit || 0;
    
    // Phase 6 - DOCUMENT: Adjusted required rate accounts for infiltration from blower door testing
    // For tight homes (low ACH50), infiltration credit reduces mechanical ventilation needs
    const adjusted = Math.max(0, required - infiltrationCredit);
    
    setTestData(prev => ({
      ...prev,
      requiredVentilationRate: parseFloat(required.toFixed(2)),
      requiredContinuousRate: parseFloat(required.toFixed(2)),
      adjustedRequiredRate: parseFloat(adjusted.toFixed(2)),
    }));
    
    toast({
      title: "ASHRAE 62.2 calculated",
      description: `Required: ${required.toFixed(1)} cfm | Adjusted: ${adjusted.toFixed(1)} cfm`,
    });
  }, [testData.floorArea, testData.bedrooms, testData.infiltrationCredit, toast]);

  // Phase 3 - OPTIMIZE: Memoize total ventilation calculation
  // Phase 6 - DOCUMENT: Calculate total ventilation provided by all systems
  // Sum of: kitchen exhaust + bathroom exhausts + mechanical ventilation
  const calculateTotalVentilation = useCallback(() => {
    let total = 0;
    
    // Kitchen exhaust contribution
    if (testData.kitchenMeasuredCFM && testData.kitchenExhaustType !== "none") {
      total += Number(testData.kitchenMeasuredCFM);
    }
    
    // Bathroom exhaust contributions
    if (testData.bathroom1MeasuredCFM && testData.bathroom1Type !== "none") {
      total += Number(testData.bathroom1MeasuredCFM);
    }
    if (testData.bathroom2MeasuredCFM && testData.bathroom2Type !== "none") {
      total += Number(testData.bathroom2MeasuredCFM);
    }
    if (testData.bathroom3MeasuredCFM && testData.bathroom3Type !== "none") {
      total += Number(testData.bathroom3MeasuredCFM);
    }
    if (testData.bathroom4MeasuredCFM && testData.bathroom4Type !== "none") {
      total += Number(testData.bathroom4MeasuredCFM);
    }
    
    // Phase 6 - DOCUMENT: For mechanical ventilation, use greater of supply or exhaust
    // Balanced systems (HRV/ERV) provide both equally, unbalanced systems favor one direction
    if (testData.mechanicalVentilationType !== "none") {
      const supply = Number(testData.mechanicalMeasuredSupplyCFM) || 0;
      const exhaust = Number(testData.mechanicalMeasuredExhaustCFM) || 0;
      total += Math.max(supply, exhaust);
    }
    
    const meetsRequirement = total >= (testData.adjustedRequiredRate || 0);
    
    setTestData(prev => ({
      ...prev,
      totalVentilationProvided: parseFloat(total.toFixed(2)),
      meetsVentilationRequirement: meetsRequirement,
    }));
    
    return total;
  }, [
    testData.kitchenMeasuredCFM,
    testData.kitchenExhaustType,
    testData.bathroom1MeasuredCFM,
    testData.bathroom1Type,
    testData.bathroom2MeasuredCFM,
    testData.bathroom2Type,
    testData.bathroom3MeasuredCFM,
    testData.bathroom3Type,
    testData.bathroom4MeasuredCFM,
    testData.bathroom4Type,
    testData.mechanicalVentilationType,
    testData.mechanicalMeasuredSupplyCFM,
    testData.mechanicalMeasuredExhaustCFM,
    testData.adjustedRequiredRate,
  ]);

  // Phase 3 - OPTIMIZE: Memoize kitchen compliance check
  // Phase 6 - DOCUMENT: Check kitchen exhaust compliance per Minnesota 2020 Energy Code
  // Requirements: ≥100 CFM intermittent OR ≥25 CFM continuous
  const checkKitchenCompliance = useCallback(() => {
    const type = testData.kitchenExhaustType;
    const measured = Number(testData.kitchenMeasuredCFM) || 0;
    
    if (!type || type === "none") return false;
    
    if (type === "intermittent") {
      return measured >= KITCHEN_INTERMITTENT_MIN_CFM;
    } else if (type === "continuous") {
      return measured >= KITCHEN_CONTINUOUS_MIN_CFM;
    }
    
    return false;
  }, [testData.kitchenExhaustType, testData.kitchenMeasuredCFM]);

  // Phase 3 - OPTIMIZE: Memoize bathroom compliance check
  // Phase 6 - DOCUMENT: Check bathroom exhaust compliance per Minnesota 2020 Energy Code
  // Requirements: ≥50 CFM intermittent OR ≥20 CFM continuous
  const checkBathroomCompliance = useCallback((type: string | undefined, measured: number | undefined) => {
    if (!type || type === "none" || !measured) return false;
    
    if (type === "intermittent") {
      return measured >= BATHROOM_INTERMITTENT_MIN_CFM;
    } else if (type === "continuous") {
      return measured >= BATHROOM_CONTINUOUS_MIN_CFM;
    }
    
    return false;
  }, []);

  // Phase 3 - OPTIMIZE: Memoize overall compliance calculation with useCallback
  // Phase 6 - DOCUMENT: Calculate overall compliance with all ventilation requirements
  // All local exhausts must meet code AND total ventilation must meet ASHRAE 62.2
  const calculateCompliance = useCallback(() => {
    const total = calculateTotalVentilation();
    
    const kitchenCompliant = checkKitchenCompliance();
    const bathroom1Compliant = checkBathroomCompliance(testData.bathroom1Type, testData.bathroom1MeasuredCFM);
    const bathroom2Compliant = testData.bathroom2Type ? checkBathroomCompliance(testData.bathroom2Type, testData.bathroom2MeasuredCFM) : true;
    const bathroom3Compliant = testData.bathroom3Type ? checkBathroomCompliance(testData.bathroom3Type, testData.bathroom3MeasuredCFM) : true;
    const bathroom4Compliant = testData.bathroom4Type ? checkBathroomCompliance(testData.bathroom4Type, testData.bathroom4MeasuredCFM) : true;
    
    const meetsVentilationRequirement = total >= (testData.adjustedRequiredRate || 0);
    
    const overallCompliant = kitchenCompliant && bathroom1Compliant && bathroom2Compliant && 
                            bathroom3Compliant && bathroom4Compliant && meetsVentilationRequirement;
    
    // Phase 6 - DOCUMENT: Build detailed non-compliance reasons for inspector review
    const nonComplianceReasons: string[] = [];
    if (!kitchenCompliant) nonComplianceReasons.push("Kitchen exhaust does not meet code");
    if (!bathroom1Compliant) nonComplianceReasons.push("Bathroom 1 does not meet code");
    if (!bathroom2Compliant) nonComplianceReasons.push("Bathroom 2 does not meet code");
    if (!bathroom3Compliant) nonComplianceReasons.push("Bathroom 3 does not meet code");
    if (!bathroom4Compliant) nonComplianceReasons.push("Bathroom 4 does not meet code");
    if (!meetsVentilationRequirement) nonComplianceReasons.push(`Total ventilation (${total.toFixed(1)} cfm) < required (${testData.adjustedRequiredRate?.toFixed(1)} cfm)`);
    
    setTestData(prev => ({
      ...prev,
      kitchenMeetsCode: kitchenCompliant,
      bathroom1MeetsCode: bathroom1Compliant,
      bathroom2MeetsCode: bathroom2Compliant ? bathroom2Compliant : null,
      bathroom3MeetsCode: bathroom3Compliant ? bathroom3Compliant : null,
      bathroom4MeetsCode: bathroom4Compliant ? bathroom4Compliant : null,
      totalVentilationProvided: parseFloat(total.toFixed(2)),
      meetsVentilationRequirement,
      overallCompliant,
      nonComplianceNotes: nonComplianceReasons.join("; "),
    }));
    
    toast({
      title: overallCompliant ? "All requirements met" : "Non-compliant",
      description: overallCompliant ? "System meets all ventilation requirements" : nonComplianceReasons.join(", "),
      variant: overallCompliant ? "default" : "destructive",
      icon: overallCompliant ? CheckCircle : XCircle,
    });
  }, [
    calculateTotalVentilation,
    checkKitchenCompliance,
    checkBathroomCompliance,
    testData.bathroom1Type,
    testData.bathroom1MeasuredCFM,
    testData.bathroom2Type,
    testData.bathroom2MeasuredCFM,
    testData.bathroom3Type,
    testData.bathroom3MeasuredCFM,
    testData.bathroom4Type,
    testData.bathroom4MeasuredCFM,
    testData.adjustedRequiredRate,
    toast,
  ]);

  // Save test mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<InsertVentilationTest>) => {
      if (!jobId) throw new Error("No job ID");
      
      const payload = {
        ...data,
        jobId,
      };
      
      if (existingTest?.id) {
        return await apiRequest(`/api/ventilation-tests/${existingTest.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        return await apiRequest("/api/ventilation-tests", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "ventilation-tests/latest"] });
      toast({
        title: "Test saved",
        description: "Ventilation test data has been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving test",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: Wrap event handlers with useCallback
  const handleSave = useCallback(() => {
    saveMutation.mutate(testData);
  }, [saveMutation, testData]);

  const handleFieldChange = useCallback((field: keyof InsertVentilationTest, value: any) => {
    setTestData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Phase 2 - BUILD: Loading skeleton while data fetches
  if (loadingJob || loadingTest) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="skeleton-loading">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-12 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Phase 2 - BUILD: Error state with retry button for job data
  if (jobError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" data-testid="alert-job-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load job data</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{jobError.message || "An error occurred while loading job information"}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchJob()}
              data-testid="button-retry-job"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Phase 2 - BUILD: Error state with retry button for test data
  if (testError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" data-testid="alert-test-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load test data</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{testError.message || "An error occurred while loading ventilation test data"}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTest()}
              data-testid="button-retry-test"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" data-testid="alert-no-job">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Job Selected</AlertTitle>
          <AlertDescription>
            Please select a job to perform ventilation testing.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/jobs">
              <Button variant="ghost" size="icon" data-testid="button-back-to-jobs">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
              <Wind className="h-8 w-8" />
              Ventilation Testing
            </h1>
          </div>
          {job && (
            <p className="text-muted-foreground mt-1" data-testid="job-info">
              {job.lotAddress} - {job.builderName}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-test"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : existingTest ? "Update" : "Save"} Test
          </Button>
        </div>
      </div>

      {/* Overall Compliance Alert */}
      {testData.overallCompliant !== undefined && (
        <Alert variant={testData.overallCompliant ? "default" : "destructive"} data-testid="alert-compliance">
          {testData.overallCompliant ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle data-testid="alert-compliance-title">
            {testData.overallCompliant ? "Compliant" : "Non-Compliant"}
          </AlertTitle>
          <AlertDescription data-testid="alert-compliance-description">
            {testData.overallCompliant 
              ? "System meets all ASHRAE 62.2 and Minnesota 2020 Energy Code requirements"
              : testData.nonComplianceNotes || "System does not meet all requirements"}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-list">
          <TabsTrigger value="house" data-testid="tab-house">
            <Home className="h-4 w-4 mr-2" />
            House
          </TabsTrigger>
          <TabsTrigger value="kitchen" data-testid="tab-kitchen">
            <ChefHat className="h-4 w-4 mr-2" />
            Kitchen
          </TabsTrigger>
          <TabsTrigger value="bathrooms" data-testid="tab-bathrooms">
            <Bath className="h-4 w-4 mr-2" />
            Bathrooms
          </TabsTrigger>
          <TabsTrigger value="mechanical" data-testid="tab-mechanical">
            <Activity className="h-4 w-4 mr-2" />
            Mechanical
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">
            <Gauge className="h-4 w-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* House Characteristics Tab */}
        <TabsContent value="house" className="space-y-4" data-testid="tab-content-house">
          <Card data-testid="card-test-info">
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
              <CardDescription>Equipment and test conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="testDate">Test Date</Label>
                  <Input
                    id="testDate"
                    type="date"
                    value={testData.testDate instanceof Date ? testData.testDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleFieldChange("testDate", new Date(e.target.value))}
                    data-testid="input-test-date"
                  />
                </div>
                <div>
                  <Label htmlFor="testTime">Test Time</Label>
                  <Input
                    id="testTime"
                    type="time"
                    value={testData.testTime || ''}
                    onChange={(e) => handleFieldChange("testTime", e.target.value)}
                    data-testid="input-test-time"
                  />
                </div>
                <div>
                  <Label htmlFor="equipmentSerial">Equipment Serial #</Label>
                  <Input
                    id="equipmentSerial"
                    value={testData.equipmentSerial || ''}
                    onChange={(e) => handleFieldChange("equipmentSerial", e.target.value)}
                    data-testid="input-equipment-serial"
                  />
                </div>
                <div>
                  <Label htmlFor="weatherConditions">Weather Conditions</Label>
                  <Input
                    id="weatherConditions"
                    value={testData.weatherConditions || ''}
                    onChange={(e) => handleFieldChange("weatherConditions", e.target.value)}
                    placeholder="Temperature, wind, etc."
                    data-testid="input-weather"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-house-characteristics">
            <CardHeader>
              <CardTitle>House Characteristics</CardTitle>
              <CardDescription>Building dimensions and ASHRAE 62.2 calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="floorArea">Floor Area (sq ft) *</Label>
                  <Input
                    id="floorArea"
                    type="number"
                    value={testData.floorArea || ''}
                    onChange={(e) => handleFieldChange("floorArea", parseFloat(e.target.value))}
                    data-testid="input-floor-area"
                  />
                </div>
                <div>
                  <Label htmlFor="bedrooms">Bedrooms *</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={testData.bedrooms || ''}
                    onChange={(e) => handleFieldChange("bedrooms", parseInt(e.target.value))}
                    data-testid="input-bedrooms"
                  />
                </div>
                <div>
                  <Label htmlFor="stories">Stories</Label>
                  <Input
                    id="stories"
                    type="number"
                    step="0.5"
                    value={testData.stories || ''}
                    onChange={(e) => handleFieldChange("stories", parseFloat(e.target.value))}
                    data-testid="input-stories"
                  />
                </div>
              </div>

              <Button
                onClick={calculateRequiredVentilation}
                variant="outline"
                className="w-full"
                data-testid="button-calculate-required"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Required Ventilation (ASHRAE 62.2)
              </Button>

              {testData.requiredVentilationRate !== undefined && testData.requiredVentilationRate > 0 && (
                <div className="space-y-2 p-4 bg-muted rounded-md" data-testid="section-calculated-requirements">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Required Rate</Label>
                      <p className="text-lg font-bold" data-testid="text-required-rate">
                        {testData.requiredVentilationRate?.toFixed(1)} cfm
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Infiltration Credit</Label>
                      <Input
                        type="number"
                        value={testData.infiltrationCredit || ''}
                        onChange={(e) => {
                          const credit = parseFloat(e.target.value) || 0;
                          const adjusted = Math.max(0, (testData.requiredVentilationRate || 0) - credit);
                          handleFieldChange("infiltrationCredit", credit);
                          handleFieldChange("adjustedRequiredRate", adjusted);
                        }}
                        placeholder="0.00"
                        data-testid="input-infiltration-credit"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Adjusted Required</Label>
                      <p className="text-lg font-bold text-primary" data-testid="text-adjusted-required">
                        {testData.adjustedRequiredRate?.toFixed(1)} cfm
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kitchen Exhaust Tab */}
        <TabsContent value="kitchen" className="space-y-4" data-testid="tab-content-kitchen">
          <Card data-testid="card-kitchen-exhaust">
            <CardHeader>
              <CardTitle>Kitchen Exhaust Fan</CardTitle>
              <CardDescription>
                Requirements: ≥{KITCHEN_INTERMITTENT_MIN_CFM} cfm (intermittent) OR ≥{KITCHEN_CONTINUOUS_MIN_CFM} cfm (continuous)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kitchenExhaustType">Exhaust Type</Label>
                  <Select
                    value={testData.kitchenExhaustType || "intermittent"}
                    onValueChange={(value) => handleFieldChange("kitchenExhaustType", value)}
                  >
                    <SelectTrigger data-testid="select-kitchen-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intermittent">Intermittent (≥{KITCHEN_INTERMITTENT_MIN_CFM} cfm)</SelectItem>
                      <SelectItem value="continuous">Continuous (≥{KITCHEN_CONTINUOUS_MIN_CFM} cfm)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kitchenRatedCFM">Rated CFM</Label>
                  <Input
                    id="kitchenRatedCFM"
                    type="number"
                    value={testData.kitchenRatedCFM || ''}
                    onChange={(e) => handleFieldChange("kitchenRatedCFM", parseFloat(e.target.value))}
                    data-testid="input-kitchen-rated"
                  />
                </div>
                <div>
                  <Label htmlFor="kitchenMeasuredCFM">Measured CFM *</Label>
                  <Input
                    id="kitchenMeasuredCFM"
                    type="number"
                    value={testData.kitchenMeasuredCFM || ''}
                    onChange={(e) => handleFieldChange("kitchenMeasuredCFM", parseFloat(e.target.value))}
                    data-testid="input-kitchen-measured"
                  />
                </div>
                <div>
                  <Label>Compliance Status</Label>
                  <div className="pt-2">
                    {testData.kitchenMeetsCode !== undefined && (
                      <Badge 
                        variant={testData.kitchenMeetsCode ? "default" : "destructive"}
                        data-testid="badge-kitchen-compliance"
                        className="flex items-center gap-1 w-fit"
                      >
                        {testData.kitchenMeetsCode ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Compliant
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Non-Compliant
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="kitchenNotes">Notes</Label>
                <Textarea
                  id="kitchenNotes"
                  value={testData.kitchenNotes || ''}
                  onChange={(e) => handleFieldChange("kitchenNotes", e.target.value)}
                  data-testid="textarea-kitchen-notes"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bathrooms Tab */}
        <TabsContent value="bathrooms" className="space-y-4" data-testid="tab-content-bathrooms">
          {[1, 2, 3, 4].map((num) => {
            const typeField = `bathroom${num}Type` as keyof InsertVentilationTest;
            const ratedField = `bathroom${num}RatedCFM` as keyof InsertVentilationTest;
            const measuredField = `bathroom${num}MeasuredCFM` as keyof InsertVentilationTest;
            const meetsCodeField = `bathroom${num}MeetsCode` as keyof InsertVentilationTest;
            
            return (
              <Card key={num} data-testid={`card-bathroom${num}`}>
                <CardHeader>
                  <CardTitle>Bathroom {num} Exhaust Fan</CardTitle>
                  <CardDescription>
                    Requirements: ≥{BATHROOM_INTERMITTENT_MIN_CFM} cfm (intermittent) OR ≥{BATHROOM_CONTINUOUS_MIN_CFM} cfm (continuous)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Exhaust Type</Label>
                      <Select
                        value={testData[typeField] as string || "none"}
                        onValueChange={(value) => handleFieldChange(typeField, value)}
                      >
                        <SelectTrigger data-testid={`select-bathroom${num}-type`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="intermittent">Intermittent (≥{BATHROOM_INTERMITTENT_MIN_CFM} cfm)</SelectItem>
                          <SelectItem value="continuous">Continuous (≥{BATHROOM_CONTINUOUS_MIN_CFM} cfm)</SelectItem>
                          <SelectItem value="none">None / N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Rated CFM</Label>
                      <Input
                        type="number"
                        value={testData[ratedField] as number || ''}
                        onChange={(e) => handleFieldChange(ratedField, parseFloat(e.target.value))}
                        disabled={testData[typeField] === "none"}
                        data-testid={`input-bathroom${num}-rated`}
                      />
                    </div>
                    <div>
                      <Label>Measured CFM</Label>
                      <Input
                        type="number"
                        value={testData[measuredField] as number || ''}
                        onChange={(e) => handleFieldChange(measuredField, parseFloat(e.target.value))}
                        disabled={testData[typeField] === "none"}
                        data-testid={`input-bathroom${num}-measured`}
                      />
                    </div>
                    <div>
                      <Label>Compliance Status</Label>
                      <div className="pt-2">
                        {testData[meetsCodeField] !== undefined && testData[meetsCodeField] !== null && (
                          <Badge 
                            variant={testData[meetsCodeField] ? "default" : "destructive"}
                            data-testid={`badge-bathroom${num}-compliance`}
                            className="flex items-center gap-1 w-fit"
                          >
                            {testData[meetsCodeField] ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Compliant
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                Non-Compliant
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Mechanical Ventilation Tab */}
        <TabsContent value="mechanical" className="space-y-4" data-testid="tab-content-mechanical">
          <Card data-testid="card-mechanical-ventilation">
            <CardHeader>
              <CardTitle>Mechanical Ventilation System</CardTitle>
              <CardDescription>Whole-house ventilation system (if installed)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mechanicalVentilationType">System Type</Label>
                  <Select
                    value={testData.mechanicalVentilationType || "none"}
                    onValueChange={(value) => handleFieldChange("mechanicalVentilationType", value)}
                  >
                    <SelectTrigger data-testid="select-mechanical-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="supply_only">Supply Only</SelectItem>
                      <SelectItem value="exhaust_only">Exhaust Only</SelectItem>
                      <SelectItem value="balanced_hrv">Balanced HRV</SelectItem>
                      <SelectItem value="balanced_erv">Balanced ERV</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mechanicalRatedCFM">Rated CFM</Label>
                  <Input
                    id="mechanicalRatedCFM"
                    type="number"
                    value={testData.mechanicalRatedCFM || ''}
                    onChange={(e) => handleFieldChange("mechanicalRatedCFM", parseFloat(e.target.value))}
                    disabled={testData.mechanicalVentilationType === "none"}
                    data-testid="input-mechanical-rated"
                  />
                </div>
                <div>
                  <Label htmlFor="mechanicalMeasuredSupplyCFM">Measured Supply CFM</Label>
                  <Input
                    id="mechanicalMeasuredSupplyCFM"
                    type="number"
                    value={testData.mechanicalMeasuredSupplyCFM || ''}
                    onChange={(e) => handleFieldChange("mechanicalMeasuredSupplyCFM", parseFloat(e.target.value))}
                    disabled={testData.mechanicalVentilationType === "none"}
                    data-testid="input-mechanical-supply"
                  />
                </div>
                <div>
                  <Label htmlFor="mechanicalMeasuredExhaustCFM">Measured Exhaust CFM</Label>
                  <Input
                    id="mechanicalMeasuredExhaustCFM"
                    type="number"
                    value={testData.mechanicalMeasuredExhaustCFM || ''}
                    onChange={(e) => handleFieldChange("mechanicalMeasuredExhaustCFM", parseFloat(e.target.value))}
                    disabled={testData.mechanicalVentilationType === "none"}
                    data-testid="input-mechanical-exhaust"
                  />
                </div>
                <div>
                  <Label htmlFor="mechanicalOperatingSchedule">Operating Schedule</Label>
                  <Select
                    value={testData.mechanicalOperatingSchedule || "continuous"}
                    onValueChange={(value) => handleFieldChange("mechanicalOperatingSchedule", value)}
                    disabled={testData.mechanicalVentilationType === "none"}
                  >
                    <SelectTrigger data-testid="select-mechanical-schedule">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous</SelectItem>
                      <SelectItem value="intermittent">Intermittent</SelectItem>
                      <SelectItem value="on_demand">On Demand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mechanicalControls">Controls</Label>
                  <Input
                    id="mechanicalControls"
                    value={testData.mechanicalControls || ''}
                    onChange={(e) => handleFieldChange("mechanicalControls", e.target.value)}
                    placeholder="Timer, humidity sensor, manual, etc."
                    disabled={testData.mechanicalVentilationType === "none"}
                    data-testid="input-mechanical-controls"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mechanicalNotes">Notes</Label>
                <Textarea
                  id="mechanicalNotes"
                  value={testData.mechanicalNotes || ''}
                  onChange={(e) => handleFieldChange("mechanicalNotes", e.target.value)}
                  disabled={testData.mechanicalVentilationType === "none"}
                  data-testid="textarea-mechanical-notes"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4" data-testid="tab-content-results">
          <Card data-testid="card-ventilation-summary">
            <CardHeader>
              <CardTitle>Ventilation Summary</CardTitle>
              <CardDescription>ASHRAE 62.2 and Minnesota 2020 Energy Code Compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={calculateCompliance}
                className="w-full"
                data-testid="button-calculate-compliance"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Total Ventilation & Compliance
              </Button>

              {testData.totalVentilationProvided !== undefined && testData.totalVentilationProvided > 0 && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-md">
                        <Label className="text-xs text-muted-foreground">Total Provided</Label>
                        <p className="text-2xl font-bold" data-testid="text-total-provided">
                          {testData.totalVentilationProvided.toFixed(1)} cfm
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-md">
                        <Label className="text-xs text-muted-foreground">Required (Adjusted)</Label>
                        <p className="text-2xl font-bold" data-testid="text-required-adjusted">
                          {testData.adjustedRequiredRate?.toFixed(1) || 0} cfm
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-md">
                        <Label className="text-xs text-muted-foreground">Overall Status</Label>
                        <Badge 
                          variant={testData.overallCompliant ? "default" : "destructive"}
                          className="mt-2 flex items-center gap-1 w-fit"
                          data-testid="badge-overall-compliance"
                        >
                          {testData.overallCompliant ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Compliant
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Non-Compliant
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Component Compliance</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="section-component-compliance">
                        <div className="flex items-center justify-between p-2 border rounded" data-testid="component-kitchen">
                          <span>Kitchen Exhaust</span>
                          <Badge variant={testData.kitchenMeetsCode ? "default" : "destructive"} className="flex items-center gap-1">
                            {testData.kitchenMeetsCode ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          </Badge>
                        </div>
                        {testData.bathroom1Type && testData.bathroom1Type !== "none" && (
                          <div className="flex items-center justify-between p-2 border rounded" data-testid="component-bathroom1">
                            <span>Bathroom 1</span>
                            <Badge variant={testData.bathroom1MeetsCode ? "default" : "destructive"} className="flex items-center gap-1">
                              {testData.bathroom1MeetsCode ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            </Badge>
                          </div>
                        )}
                        {testData.bathroom2Type && testData.bathroom2Type !== "none" && (
                          <div className="flex items-center justify-between p-2 border rounded" data-testid="component-bathroom2">
                            <span>Bathroom 2</span>
                            <Badge variant={testData.bathroom2MeetsCode ? "default" : "destructive"} className="flex items-center gap-1">
                              {testData.bathroom2MeetsCode ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            </Badge>
                          </div>
                        )}
                        {testData.bathroom3Type && testData.bathroom3Type !== "none" && (
                          <div className="flex items-center justify-between p-2 border rounded" data-testid="component-bathroom3">
                            <span>Bathroom 3</span>
                            <Badge variant={testData.bathroom3MeetsCode ? "default" : "destructive"} className="flex items-center gap-1">
                              {testData.bathroom3MeetsCode ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            </Badge>
                          </div>
                        )}
                        {testData.bathroom4Type && testData.bathroom4Type !== "none" && (
                          <div className="flex items-center justify-between p-2 border rounded" data-testid="component-bathroom4">
                            <span>Bathroom 4</span>
                            <Badge variant={testData.bathroom4MeetsCode ? "default" : "destructive"} className="flex items-center gap-1">
                              {testData.bathroom4MeetsCode ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-2 border rounded" data-testid="component-total-ventilation">
                          <span>Total Ventilation</span>
                          <Badge variant={testData.meetsVentilationRequirement ? "default" : "destructive"} className="flex items-center gap-1">
                            {testData.meetsVentilationRequirement ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={testData.recommendations || ''}
                  onChange={(e) => handleFieldChange("recommendations", e.target.value)}
                  placeholder="Enter recommendations for improving ventilation..."
                  rows={4}
                  data-testid="textarea-recommendations"
                />
              </div>

              <div>
                <Label htmlFor="inspectorNotes">Inspector Notes</Label>
                <Textarea
                  id="inspectorNotes"
                  value={testData.inspectorNotes || ''}
                  onChange={(e) => handleFieldChange("inspectorNotes", e.target.value)}
                  placeholder="Additional notes..."
                  rows={4}
                  data-testid="textarea-inspector-notes"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Phase 2 - BUILD: Wrap with ErrorBoundary for production resilience
function VentilationTestsPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto p-6">
          <Alert variant="destructive" data-testid="alert-error-boundary">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ventilation Testing Error</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>An unexpected error occurred while loading the ventilation testing page.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                data-testid="button-reload-page"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <VentilationTestsContent />
    </ErrorBoundary>
  );
}

export default VentilationTestsPage;
