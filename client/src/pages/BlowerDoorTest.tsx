import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileOptimizedInput } from "@/components/ui/mobile-optimized-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import type { BlowerDoorTest, InsertBlowerDoorTest } from "@shared/schema";
import { 
  Wind, 
  Gauge, 
  Calculator, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Home,
  Thermometer,
  Droplets,
  BarChart3,
  FileText,
  Clock,
  Mountain,
  Download,
  RefreshCw
} from "lucide-react";

interface TestPoint {
  housePressure: number;
  fanPressure: number;
  cfm: number;
  ringConfiguration: string;
}

// Phase 3 - OPTIMIZE: Module-level constants for compliance thresholds and calibration factors
// Minnesota 2020 Energy Code Climate Zone 6 compliance threshold
const MINNESOTA_CODE_LIMIT_ACH50 = 3.0;

// Default Minneapolis altitude in feet for blower door testing
const DEFAULT_ALTITUDE_MPLS = 900;

// Phase 6 - DOCUMENT: Energy Conservatory Model 3 Fan calibration factors
// These factors are used in the equation: CFM = C × (ΔP)^n
// Where C is the flow coefficient and n is the flow exponent
const RING_CALIBRATION_FACTORS: Record<string, { C: number; n: number }> = {
  "Open": { C: 235, n: 0.5 },      // Open fan configuration (no ring restriction)
  "Ring A": { C: 176, n: 0.5 },    // Ring A (74% flow reduction)
  "Ring B": { C: 127, n: 0.5 },    // Ring B (54% flow reduction)
  "Ring C": { C: 85, n: 0.5 },     // Ring C (36% flow reduction)
  "Ring D": { C: 56, n: 0.5 },     // Ring D (24% flow reduction)
};

// Phase 6 - DOCUMENT: Atmospheric constants for altitude correction
// Standard sea-level pressure in psi
const SEA_LEVEL_PRESSURE_PSI = 14.696;

// Lapse rate exponent for barometric formula (standard atmosphere)
const LAPSE_RATE_EXPONENT = 5.2559;

// Lapse rate constant for altitude correction (1/ft)
const LAPSE_RATE_CONSTANT = 0.0000068756;

// Phase 6 - DOCUMENT: Weather correction constants
// Standard barometric pressure in inches of mercury
const STANDARD_PRESSURE_INHG = 29.92;

// Wind correction factor per m/s (based on ASTM E779)
const WIND_CORRECTION_FACTOR = 0.015;

// Minimum valid test points for accurate regression analysis
const MIN_TEST_POINTS_REQUIRED = 5;

// Default initial test points array
const DEFAULT_TEST_POINTS: TestPoint[] = [
  { housePressure: 50, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
  { housePressure: 45, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
  { housePressure: 40, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
  { housePressure: 35, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
  { housePressure: 30, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
  { housePressure: 25, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
  { housePressure: 20, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
];

function BlowerDoorTestContent() {
  const { toast } = useToast();
  const haptic = useHapticFeedback();
  const { jobId } = useParams<{ jobId: string }>();
  const [activeTab, setActiveTab] = useState("setup");
  const [altitude, setAltitude] = useState(DEFAULT_ALTITUDE_MPLS);
  
  // Test data state - matching database schema
  const [testData, setTestData] = useState<Partial<InsertBlowerDoorTest>>({
    testDate: new Date(),
    testTime: new Date().toTimeString().slice(0, 5),
    equipmentSerial: "",
    equipmentCalibrationDate: undefined,
    houseVolume: 0,
    conditionedArea: 0,
    surfaceArea: 0,
    numberOfStories: 1,
    basementType: 'none',
    outdoorTemp: 70,
    indoorTemp: 70,
    outdoorHumidity: 50,
    indoorHumidity: 50,
    windSpeed: 0,
    barometricPressure: STANDARD_PRESSURE_INHG,
    altitude: altitude,
    testPoints: DEFAULT_TEST_POINTS as TestPoint[],
    cfm50: 0,
    ach50: 0,
    ela: 0,
    nFactor: 0.65,
    correlationCoefficient: 0,
    codeYear: "2020",
    codeLimit: MINNESOTA_CODE_LIMIT_ACH50,
    meetsCode: false,
    margin: 0,
    notes: "",
    weatherCorrectionApplied: false,
    altitudeCorrectionFactor: 1.0,
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
    queryKey: ["/api/jobs", jobId, "blower-door-tests/latest"],
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
        houseVolume: parseFloat(job.houseVolume || "0") || prev.houseVolume,
        conditionedArea: parseFloat(job.floorArea || "0") || prev.conditionedArea,
        surfaceArea: parseFloat(job.surfaceArea || "0") || prev.surfaceArea,
        numberOfStories: parseFloat(job.stories || "1") || prev.numberOfStories,
      }));
    }
  }, [existingTest, job]);

  // Phase 3 - OPTIMIZE: Memoize altitude correction calculation
  // Phase 6 - DOCUMENT: Calculate altitude correction factor using barometric formula
  // Formula: Correction = P_sea / P_altitude
  // Where P = P_sea × (1 - L × h)^g
  // L = lapse rate constant, h = altitude, g = lapse rate exponent
  const calculateAltitudeCorrection = useCallback((altitudeFeet: number): number => {
    const altitudePressure = SEA_LEVEL_PRESSURE_PSI * Math.pow((1 - LAPSE_RATE_CONSTANT * altitudeFeet), LAPSE_RATE_EXPONENT);
    return SEA_LEVEL_PRESSURE_PSI / altitudePressure;
  }, []);

  // Phase 3 - OPTIMIZE: Memoize CFM calculation
  // Phase 6 - DOCUMENT: Calculate CFM from fan pressure using calibration curves
  // Uses manufacturer-provided calibration factors for Energy Conservatory Model 3
  const calculateCFM = useCallback((fanPressure: number, ringConfig: string): number => {
    // Phase 5 - HARDEN: Validate inputs
    if (fanPressure <= 0 || isNaN(fanPressure)) return 0;
    
    const config = RING_CALIBRATION_FACTORS[ringConfig] || RING_CALIBRATION_FACTORS["Open"];
    const cfm = config.C * Math.pow(fanPressure, config.n);
    
    // Apply altitude correction
    const altitudeCorrection = calculateAltitudeCorrection(altitude);
    return cfm * altitudeCorrection;
  }, [altitude, calculateAltitudeCorrection]);

  // Phase 3 - OPTIMIZE: Memoize weather correction calculation
  // Phase 6 - DOCUMENT: Calculate weather correction factor based on ASTM E779
  // Accounts for temperature, barometric pressure, and wind speed differences
  // Formula combines three corrections:
  // 1. Temperature: √(T_indoor / T_outdoor) in Kelvin
  // 2. Pressure: P_measured / P_standard
  // 3. Wind: 1 / (1 + 0.015 × wind_speed_m/s)
  const calculateWeatherCorrection = useCallback((): number => {
    // Phase 5 - HARDEN: Validate temperature inputs
    const indoorTemp = testData.indoorTemp ?? 70;
    const outdoorTemp = testData.outdoorTemp ?? 70;
    
    // Convert Fahrenheit to Kelvin for temperature correction
    const indoorTempK = (indoorTemp - 32) * 5/9 + 273.15;
    const outdoorTempK = (outdoorTemp - 32) * 5/9 + 273.15;
    
    // Phase 5 - HARDEN: Prevent division by zero or invalid temperatures
    if (outdoorTempK <= 0 || indoorTempK <= 0) return 1.0;
    
    const tempCorrection = Math.sqrt(indoorTempK / outdoorTempK);
    
    // Wind speed correction (convert mph to m/s)
    const windSpeedMs = (testData.windSpeed || 0) * 0.44704;
    const windCorrection = 1 + (WIND_CORRECTION_FACTOR * windSpeedMs);
    
    // Barometric pressure correction
    const pressureCorrection = (testData.barometricPressure || STANDARD_PRESSURE_INHG) / STANDARD_PRESSURE_INHG;
    
    // Combined correction factor
    return tempCorrection * pressureCorrection / windCorrection;
  }, [testData.indoorTemp, testData.outdoorTemp, testData.windSpeed, testData.barometricPressure]);

  // Phase 3 - OPTIMIZE: Memoize regression calculation with useCallback
  // Phase 6 - DOCUMENT: Perform multi-point regression analysis
  // Uses log-log regression to determine flow characteristics: log(Q) = log(C) + n×log(ΔP)
  // Where Q = airflow (CFM), C = flow coefficient, n = flow exponent, ΔP = pressure difference
  // Then calculates ACH50 = (CFM50 × 60) / House Volume
  // ACH50 is Air Changes per Hour at 50 Pascals depressurization
  const calculateRegression = useCallback(() => {
    const validPoints = (testData.testPoints as TestPoint[]).filter(p => p.fanPressure > 0 && p.cfm > 0);
    
    // Phase 5 - HARDEN: Validate minimum test points
    if (validPoints.length < MIN_TEST_POINTS_REQUIRED) {
      toast({
        title: "Insufficient data",
        description: `Need at least ${MIN_TEST_POINTS_REQUIRED} valid test points for accurate calculation`,
        variant: "destructive",
      });
      return;
    }

    // Perform log-log regression
    const x = validPoints.map(p => Math.log(p.housePressure));
    const y = validPoints.map(p => Math.log(p.cfm));
    
    const n = validPoints.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    // Calculate flow exponent (n) and flow coefficient (C)
    const nFactor = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const logC = (sumY - nFactor * sumX) / n;
    const C = Math.exp(logC);
    
    // Calculate CFM50 using the regression equation
    const cfm50Raw = C * Math.pow(50, nFactor);
    
    // Apply weather corrections
    const weatherCorrection = calculateWeatherCorrection();
    const cfm50 = cfm50Raw * weatherCorrection;
    
    // Phase 5 - HARDEN: Validate house volume before ACH50 calculation
    if (!testData.houseVolume || testData.houseVolume <= 0) {
      toast({
        title: "Invalid house volume",
        description: "Please enter a valid house volume before calculating ACH50",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate ACH50 using accurate formula: ACH50 = (CFM50 × 60) / Volume
    const ach50 = (cfm50 * 60) / testData.houseVolume;
    
    // Calculate ELA (Effective Leakage Area) at 4 Pa reference pressure
    const cfm4 = C * Math.pow(4, nFactor);
    const ela = (cfm4 * 144) / (Math.sqrt(2 * 32.2 * 4 / 0.075) * 0.61);
    
    // Calculate correlation coefficient (R²) for quality assessment
    const yMean = sumY / n;
    const yPred = x.map(xi => logC + nFactor * xi);
    const ssRes = y.reduce((acc, yi, i) => acc + Math.pow(yi - yPred[i], 2), 0);
    const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const r2 = 1 - (ssRes / ssTot);
    const r = Math.sqrt(Math.max(0, r2));
    
    // Check Minnesota 2020 Energy Code compliance (3.0 ACH50 for Climate Zone 6)
    const meetsCode = ach50 <= MINNESOTA_CODE_LIMIT_ACH50;
    const margin = MINNESOTA_CODE_LIMIT_ACH50 - ach50;
    
    setTestData(prev => ({
      ...prev,
      cfm50: Math.round(cfm50),
      ach50: parseFloat(ach50.toFixed(2)),
      ela: parseFloat(ela.toFixed(1)),
      nFactor: parseFloat(nFactor.toFixed(3)),
      correlationCoefficient: parseFloat(r.toFixed(4)),
      meetsCode,
      margin: parseFloat(margin.toFixed(2)),
      weatherCorrectionApplied: true,
    }));
    
    // Phase 2 - BUILD: Replace emoji with lucide icons
    // Haptic feedback for calculation result
    if (meetsCode) {
      haptic.vibrate('success'); // Success pattern for passing tests
    } else {
      haptic.vibrate('warning'); // Warning pattern for failing tests
    }
    
    toast({
      title: "Calculations complete",
      description: (
        <div className="flex items-center gap-2">
          <span>ACH50: {ach50.toFixed(2)}</span>
          <span>|</span>
          {meetsCode ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Passes</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span>Fails</span>
            </>
          )}
          <span>Minnesota 2020 Code (≤{MINNESOTA_CODE_LIMIT_ACH50})</span>
        </div>
      ),
      variant: meetsCode ? "default" : "destructive",
    });
  }, [testData.testPoints, testData.houseVolume, calculateWeatherCorrection, haptic, toast]);

  // Phase 3 - OPTIMIZE: Memoize save handler with useCallback
  const handleSaveTest = useCallback(() => {
    // Phase 5 - HARDEN: Validate test data before saving
    if (!testData.cfm50 || !testData.ach50) {
      // Error haptic for validation failure
      haptic.vibrate('error');
      toast({
        title: "Incomplete test",
        description: "Please calculate results before saving.",
        variant: "destructive",
      });
      return;
    }
    // Medium haptic for save action
    haptic.vibrate('medium');
    saveTestMutation.mutate(testData);
  }, [testData, haptic, saveTestMutation]);

  // Phase 3 - OPTIMIZE: Memoize PDF download handler with useCallback
  const handleDownloadPDF = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/full-report/pdf`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blower-door-test-${jobId}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "The test report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the PDF report. Please try again.",
        variant: "destructive",
      });
    }
  }, [jobId, toast]);

  // Phase 3 - OPTIMIZE: Memoize retry handlers with useCallback
  const handleRetryJob = useCallback(() => {
    refetchJob();
  }, [refetchJob]);

  const handleRetryTest = useCallback(() => {
    refetchTest();
  }, [refetchTest]);

  // Phase 3 - OPTIMIZE: Memoize tab change handler
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  // Save test mutation
  const saveTestMutation = useMutation({
    mutationFn: async (data: Partial<InsertBlowerDoorTest>) => {
      const endpoint = existingTest?.id 
        ? `/api/blower-door-tests/${existingTest.id}`
        : "/api/blower-door-tests";
      const method = existingTest?.id ? "PATCH" : "POST";
      
      return apiRequest(endpoint, method, {
        ...data,
        jobId,
        testDate: data.testDate?.toISOString(),
        equipmentCalibrationDate: data.equipmentCalibrationDate?.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "blower-door-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blower-door-tests"] });
      // Success haptic feedback for saved test
      haptic.vibrate('success');
      toast({
        title: "Test saved",
        description: "Blower door test data has been saved successfully.",
      });
    },
    onError: (error) => {
      // Error haptic feedback for save failure
      haptic.vibrate('error');
      toast({
        title: "Save failed",
        description: "Failed to save test data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete test mutation
  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => 
      apiRequest(`/api/blower-door-tests/${testId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "blower-door-tests"] });
      setTestData({
        testDate: new Date(),
        testTime: new Date().toTimeString().slice(0, 5),
        equipmentSerial: "",
        equipmentCalibrationDate: undefined,
        houseVolume: job ? parseFloat(job.houseVolume || "0") : 0,
        conditionedArea: job ? parseFloat(job.floorArea || "0") : 0,
        surfaceArea: job ? parseFloat(job.surfaceArea || "0") : 0,
        numberOfStories: job ? parseFloat(job.stories || "1") : 1,
        basementType: 'none',
        outdoorTemp: 70,
        indoorTemp: 70,
        outdoorHumidity: 50,
        indoorHumidity: 50,
        windSpeed: 0,
        barometricPressure: STANDARD_PRESSURE_INHG,
        altitude: altitude,
        testPoints: DEFAULT_TEST_POINTS as TestPoint[],
        cfm50: 0,
        ach50: 0,
        ela: 0,
        nFactor: 0.65,
        correlationCoefficient: 0,
        codeYear: "2020",
        codeLimit: MINNESOTA_CODE_LIMIT_ACH50,
        meetsCode: false,
        margin: 0,
        notes: "",
        weatherCorrectionApplied: false,
        altitudeCorrectionFactor: calculateAltitudeCorrection(altitude),
      });
      toast({
        title: "Test deleted",
        description: "Blower door test data has been deleted.",
      });
    },
  });

  // Phase 2 - BUILD: Skeleton loaders for loading states
  if (loadingJob || loadingTest) {
    return (
      <div className="container mx-auto p-6" data-testid="skeleton-blower-door-test">
        <div className="mb-6">
          <Skeleton className="h-10 w-64 mb-2" data-testid="skeleton-title" />
          <Skeleton className="h-4 w-96" data-testid="skeleton-subtitle" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" data-testid="skeleton-tabs" />
          <Skeleton className="h-96 w-full" data-testid="skeleton-content" />
        </div>
      </div>
    );
  }

  // Phase 2 - BUILD: Error states with retry buttons
  if (jobError) {
    return (
      <div className="container mx-auto p-6" data-testid="error-job-load">
        <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Job</AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
            <span>Unable to fetch job data. Please try again.</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleRetryJob}
              data-testid="button-retry-job"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (testError) {
    return (
      <div className="container mx-auto p-6" data-testid="error-test-load">
        <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Test Data</AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
            <span>Unable to fetch existing test data. Please try again.</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleRetryTest}
              data-testid="button-retry-test"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="container-blower-door-test">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Wind className="h-8 w-8" data-testid="icon-blower-door" />
              Blower Door Test
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
              {job ? `${job.address}, ${job.city}` : `Job: ${jobId}`}
            </p>
          </div>
          <div className="flex items-center gap-2" data-testid="container-action-buttons">
            <Badge 
              variant={testData.meetsCode ? "default" : "destructive"}
              data-testid="badge-ach50-summary"
            >
              ACH50: {testData.ach50 || "—"}
            </Badge>
            {existingTest && (
              <Badge variant="outline" data-testid="badge-last-saved">
                <Clock className="h-3 w-3 mr-1" />
                Last saved: {new Date(existingTest.updatedAt || existingTest.createdAt).toLocaleString()}
              </Badge>
            )}
            <Button
              onClick={handleSaveTest}
              disabled={saveTestMutation.isPending}
              data-testid="button-save-test"
            >
              <Save className="h-4 w-4 mr-2" />
              {existingTest ? 'Update' : 'Save'} Test
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {existingTest && (
              <Button
                variant="destructive"
                onClick={() => deleteTestMutation.mutate(existingTest.id)}
                disabled={deleteTestMutation.isPending}
                data-testid="button-delete-test"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} data-testid="tabs-blower-door">
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-list">
          <TabsTrigger value="setup" data-testid="tab-setup">Setup</TabsTrigger>
          <TabsTrigger value="weather" data-testid="tab-weather">Weather</TabsTrigger>
          <TabsTrigger value="multipoint" data-testid="tab-multipoint">Multi-Point</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
          <TabsTrigger value="report" data-testid="tab-report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4" data-testid="tab-content-setup">
          <Card data-testid="card-test-setup">
            <CardHeader>
              <CardTitle>Test Setup</CardTitle>
              <CardDescription>Equipment and building information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-date">Test Date</Label>
                  <Input
                    id="test-date"
                    type="date"
                    value={testData.testDate?.toISOString().split('T')[0]}
                    onChange={(e) => setTestData({...testData, testDate: new Date(e.target.value)})}
                    data-testid="input-test-date"
                  />
                </div>
                <div>
                  <Label htmlFor="test-time">Test Time</Label>
                  <Input
                    id="test-time"
                    type="time"
                    value={testData.testTime}
                    onChange={(e) => setTestData({...testData, testTime: e.target.value})}
                    data-testid="input-test-time"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment-serial">Equipment Serial #</Label>
                  <Input
                    id="equipment-serial"
                    value={testData.equipmentSerial}
                    onChange={(e) => setTestData({...testData, equipmentSerial: e.target.value})}
                    placeholder="e.g., BD3-1234"
                    data-testid="input-equipment-serial"
                  />
                </div>
                <div>
                  <Label htmlFor="calibration-date">Calibration Date</Label>
                  <Input
                    id="calibration-date"
                    type="date"
                    value={testData.equipmentCalibrationDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setTestData({...testData, equipmentCalibrationDate: e.target.value ? new Date(e.target.value) : undefined})}
                    data-testid="input-calibration-date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-building-info">
            <CardHeader>
              <CardTitle>Building Information</CardTitle>
              <CardDescription>Required for ACH50 calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="house-volume">House Volume (ft³)</Label>
                  <MobileOptimizedInput
                    id="house-volume"
                    fieldType="volume"
                    value={testData.houseVolume}
                    onChange={(e) => setTestData({...testData, houseVolume: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 24000"
                    defaultSuggestion={24000}
                    suggestions={[18000, 20000, 24000, 28000, 32000]}
                    enableVoice={true}
                    showValidation={true}
                    min={1000}
                    max={100000}
                    autoAdvance={true}
                    onAdvance={() => document.getElementById("conditioned-area")?.focus()}
                    data-testid="input-house-volume"
                  />
                </div>
                <div>
                  <Label htmlFor="conditioned-area">Conditioned Area (ft²)</Label>
                  <MobileOptimizedInput
                    id="conditioned-area"
                    fieldType="area"
                    value={testData.conditionedArea}
                    onChange={(e) => setTestData({...testData, conditionedArea: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 3000"
                    defaultSuggestion={3000}
                    suggestions={[1500, 2000, 2500, 3000, 3500, 4000]}
                    enableVoice={true}
                    showValidation={true}
                    min={500}
                    max={20000}
                    autoAdvance={true}
                    onAdvance={() => document.getElementById("surface-area")?.focus()}
                    data-testid="input-conditioned-area"
                  />
                </div>
                <div>
                  <Label htmlFor="surface-area">Surface Area (ft²)</Label>
                  <MobileOptimizedInput
                    id="surface-area"
                    fieldType="area"
                    value={testData.surfaceArea}
                    onChange={(e) => setTestData({...testData, surfaceArea: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 5500"
                    defaultSuggestion={5500}
                    suggestions={[4000, 5000, 5500, 6000, 7000]}
                    enableVoice={true}
                    showValidation={true}
                    min={1000}
                    max={30000}
                    data-testid="input-surface-area"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stories">Number of Stories</Label>
                  <Select
                    value={testData.numberOfStories?.toString()}
                    onValueChange={(value) => setTestData({...testData, numberOfStories: parseFloat(value)})}
                  >
                    <SelectTrigger id="stories" data-testid="select-stories">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Story</SelectItem>
                      <SelectItem value="1.5">1.5 Stories</SelectItem>
                      <SelectItem value="2">2 Stories</SelectItem>
                      <SelectItem value="2.5">2.5 Stories</SelectItem>
                      <SelectItem value="3">3 Stories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="basement">Basement Type</Label>
                  <Select
                    value={testData.basementType}
                    onValueChange={(value: any) => setTestData({...testData, basementType: value})}
                  >
                    <SelectTrigger id="basement" data-testid="select-basement">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Basement</SelectItem>
                      <SelectItem value="unconditioned">Unconditioned Basement</SelectItem>
                      <SelectItem value="conditioned">Conditioned Basement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weather" className="space-y-4" data-testid="tab-content-weather">
          <Card data-testid="card-weather-conditions">
            <CardHeader>
              <CardTitle>Weather Conditions</CardTitle>
              <CardDescription>For accurate weather correction calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </h4>
                  <div>
                    <Label htmlFor="outdoor-temp">Outdoor Temperature (°F)</Label>
                    <MobileOptimizedInput
                      id="outdoor-temp"
                      fieldType="integer"
                      value={testData.outdoorTemp}
                      onChange={(e) => setTestData({...testData, outdoorTemp: parseFloat(e.target.value) || 0})}
                      placeholder="70"
                      defaultSuggestion={70}
                      suggestions={[20, 30, 50, 70, 90]}
                      enableVoice={true}
                      showValidation={true}
                      min={-40}
                      max={120}
                      autoAdvance={true}
                      onAdvance={() => document.getElementById("indoor-temp")?.focus()}
                      data-testid="input-outdoor-temp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="indoor-temp">Indoor Temperature (°F)</Label>
                    <MobileOptimizedInput
                      id="indoor-temp"
                      fieldType="integer"
                      value={testData.indoorTemp}
                      onChange={(e) => setTestData({...testData, indoorTemp: parseFloat(e.target.value) || 0})}
                      placeholder="70"
                      defaultSuggestion={70}
                      suggestions={[68, 70, 72, 75]}
                      enableVoice={true}
                      showValidation={true}
                      min={40}
                      max={100}
                      autoAdvance={true}
                      onAdvance={() => document.getElementById("outdoor-humidity")?.focus()}
                      data-testid="input-indoor-temp"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    Humidity
                  </h4>
                  <div>
                    <Label htmlFor="outdoor-humidity">Outdoor Humidity (%)</Label>
                    <Input
                      id="outdoor-humidity"
                      type="number"
                      value={testData.outdoorHumidity}
                      onChange={(e) => setTestData({...testData, outdoorHumidity: parseFloat(e.target.value) || 0})}
                      data-testid="input-outdoor-humidity"
                    />
                  </div>
                  <div>
                    <Label htmlFor="indoor-humidity">Indoor Humidity (%)</Label>
                    <Input
                      id="indoor-humidity"
                      type="number"
                      value={testData.indoorHumidity}
                      onChange={(e) => setTestData({...testData, indoorHumidity: parseFloat(e.target.value) || 0})}
                      data-testid="input-indoor-humidity"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="wind-speed">Wind Speed (mph)</Label>
                  <Input
                    id="wind-speed"
                    type="number"
                    value={testData.windSpeed}
                    onChange={(e) => setTestData({...testData, windSpeed: parseFloat(e.target.value) || 0})}
                    data-testid="input-wind-speed"
                  />
                </div>
                <div>
                  <Label htmlFor="barometric">Barometric Pressure (inHg)</Label>
                  <Input
                    id="barometric"
                    type="number"
                    step="0.01"
                    value={testData.barometricPressure}
                    onChange={(e) => setTestData({...testData, barometricPressure: parseFloat(e.target.value) || 0})}
                    data-testid="input-barometric"
                  />
                </div>
                <div>
                  <Label htmlFor="altitude">Site Altitude (ft)</Label>
                  <div className="flex items-center gap-2">
                    <Mountain className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="altitude"
                      type="number"
                      value={altitude}
                      onChange={(e) => {
                        const alt = parseFloat(e.target.value) || 0;
                        setAltitude(alt);
                        setTestData({
                          ...testData, 
                          altitude: alt,
                          altitudeCorrectionFactor: calculateAltitudeCorrection(alt)
                        });
                      }}
                      data-testid="input-altitude"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-altitude-correction">
                    Correction factor: {calculateAltitudeCorrection(altitude).toFixed(3)}
                  </p>
                </div>
              </div>
              
              <Alert data-testid="alert-weather-info">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Weather Corrections</AlertTitle>
                <AlertDescription>
                  Weather and altitude corrections will be automatically applied during calculation
                  based on ASTM E779 and Minnesota testing standards.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multipoint" className="space-y-4" data-testid="tab-content-multipoint">
          <Card data-testid="card-multipoint-data">
            <CardHeader>
              <CardTitle>Multi-Point Test Data</CardTitle>
              <CardDescription>Enter fan pressure readings at each house pressure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 font-medium text-sm">
                  <div>House ΔP (Pa)</div>
                  <div>Fan ΔP (Pa)</div>
                  <div>Ring Config</div>
                  <div>CFM (calc)</div>
                  <div>Status</div>
                </div>
                {(testData.testPoints as TestPoint[]).map((point, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2" data-testid={`row-test-point-${index}`}>
                    <Input
                      type="number"
                      value={point.housePressure}
                      readOnly
                      className="bg-muted"
                      data-testid={`input-house-pressure-${index}`}
                    />
                    <MobileOptimizedInput
                      fieldType="pressure"
                      value={point.fanPressure}
                      onChange={(e) => {
                        const newPoints = [...(testData.testPoints as TestPoint[])];
                        newPoints[index].fanPressure = parseFloat(e.target.value) || 0;
                        newPoints[index].cfm = calculateCFM(newPoints[index].fanPressure, newPoints[index].ringConfiguration);
                        setTestData({...testData, testPoints: newPoints});
                      }}
                      placeholder="Enter reading"
                      enableVoice={true}
                      showValidation={true}
                      min={0}
                      max={500}
                      autoAdvance={index < (testData.testPoints as TestPoint[]).length - 1}
                      onAdvance={() => {
                        const nextInput = document.querySelector(`[data-testid="input-fan-pressure-${index + 1}"]`) as HTMLInputElement;
                        nextInput?.focus();
                      }}
                      data-testid={`input-fan-pressure-${index}`}
                    />
                    <Select
                      value={point.ringConfiguration}
                      onValueChange={(value) => {
                        const newPoints = [...(testData.testPoints as TestPoint[])];
                        newPoints[index].ringConfiguration = value;
                        newPoints[index].cfm = calculateCFM(newPoints[index].fanPressure, value);
                        setTestData({...testData, testPoints: newPoints});
                      }}
                    >
                      <SelectTrigger data-testid={`select-ring-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Ring A">Ring A</SelectItem>
                        <SelectItem value="Ring B">Ring B</SelectItem>
                        <SelectItem value="Ring C">Ring C</SelectItem>
                        <SelectItem value="Ring D">Ring D</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={point.cfm ? Math.round(point.cfm) : ''}
                      readOnly
                      className="bg-muted"
                      data-testid={`input-cfm-${index}`}
                    />
                    <div className="flex items-center" data-testid={`status-point-${index}`}>
                      {point.fanPressure > 0 && (
                        <CheckCircle className="h-4 w-4 text-green-500" data-testid={`icon-valid-${index}`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={calculateRegression}
                className="w-full mt-4"
                disabled={(testData.testPoints as TestPoint[]).filter(p => p.fanPressure > 0).length < MIN_TEST_POINTS_REQUIRED}
                data-testid="button-calculate-results"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Results
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4" data-testid="tab-content-results">
          <div className="grid grid-cols-2 gap-4">
            <Card data-testid="card-primary-results">
              <CardHeader>
                <CardTitle>Primary Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">CFM50</span>
                  <span className="text-2xl font-bold" data-testid="result-cfm50">{testData.cfm50 || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ACH50</span>
                  <span className="text-2xl font-bold" data-testid="result-ach50">{testData.ach50 || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ELA (in²)</span>
                  <span className="text-xl font-semibold" data-testid="result-ela">{testData.ela || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Flow Exponent (n)</span>
                  <span className="text-xl font-semibold" data-testid="result-n-factor">{testData.nFactor || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Correlation (r)</span>
                  <span className="text-xl font-semibold" data-testid="result-correlation">{testData.correlationCoefficient || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-compliance">
              <CardHeader>
                <CardTitle>Minnesota Code Compliance</CardTitle>
                <CardDescription>2020 Energy Code Requirements - Climate Zone 6</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant={testData.meetsCode ? "default" : "destructive"} data-testid="alert-compliance">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle data-testid="text-compliance-status">
                    {testData.meetsCode ? "PASSES" : "FAILS"} Code
                  </AlertTitle>
                  <AlertDescription data-testid="text-compliance-details">
                    {testData.ach50 
                      ? `ACH50: ${testData.ach50} | Limit: ${MINNESOTA_CODE_LIMIT_ACH50} | Margin: ${testData.margin! > 0 ? '+' : ''}${testData.margin}`
                      : "Complete test to check compliance"
                    }
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Climate Zone 6 Limit</span>
                    <span className="font-medium" data-testid="text-code-limit">≤ {MINNESOTA_CODE_LIMIT_ACH50} ACH50</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your Result</span>
                    <span className={`font-medium ${testData.meetsCode ? 'text-green-600' : 'text-red-600'}`} data-testid="text-result-ach50">
                      {testData.ach50 || "—"} ACH50
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weather Corrected</span>
                    <span data-testid="text-weather-corrected">{testData.weatherCorrectionApplied ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Altitude Correction</span>
                    <span data-testid="text-altitude-factor">{testData.altitudeCorrectionFactor?.toFixed(3) || "1.000"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-quality-indicators">
            <CardHeader>
              <CardTitle>Test Quality Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid="text-valid-points">
                    {(testData.testPoints as TestPoint[]).filter(p => p.fanPressure > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Valid Test Points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid="text-correlation-percent">
                    {testData.correlationCoefficient ? (testData.correlationCoefficient * 100).toFixed(1) : "—"}%
                  </div>
                  <div className="text-sm text-muted-foreground">Correlation</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid="text-flow-exponent">
                    {testData.nFactor || "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Flow Exponent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4" data-testid="tab-content-report">
          <Card data-testid="card-report-summary">
            <CardHeader>
              <CardTitle>Test Report Summary</CardTitle>
              <CardDescription>Complete blower door test documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <h4 className="font-semibold mb-2">Test Information</h4>
                    <div className="space-y-1 text-sm">
                      <div data-testid="text-report-date">Date: {testData.testDate?.toLocaleDateString()}</div>
                      <div data-testid="text-report-time">Time: {testData.testTime}</div>
                      <div data-testid="text-report-equipment">Equipment: {testData.equipmentSerial || "Not specified"}</div>
                      <div data-testid="text-report-calibration">Calibration: {testData.equipmentCalibrationDate?.toLocaleDateString() || "Not specified"}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Building Data</h4>
                    <div className="space-y-1 text-sm">
                      <div data-testid="text-report-volume">Volume: {testData.houseVolume} ft³</div>
                      <div data-testid="text-report-area">Conditioned Area: {testData.conditionedArea} ft²</div>
                      <div data-testid="text-report-surface">Surface Area: {testData.surfaceArea} ft²</div>
                      <div data-testid="text-report-stories">Stories: {testData.numberOfStories}</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <h4 className="font-semibold mb-2">Weather Conditions</h4>
                    <div className="space-y-1 text-sm">
                      <div data-testid="text-report-outdoor">Outdoor: {testData.outdoorTemp}°F / {testData.outdoorHumidity}%</div>
                      <div data-testid="text-report-indoor">Indoor: {testData.indoorTemp}°F / {testData.indoorHumidity}%</div>
                      <div data-testid="text-report-wind">Wind: {testData.windSpeed} mph</div>
                      <div data-testid="text-report-pressure">Pressure: {testData.barometricPressure} inHg</div>
                      <div data-testid="text-report-altitude">Altitude: {testData.altitude} ft</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Test Results</h4>
                    <div className="space-y-1 text-sm">
                      <div className="font-bold text-lg" data-testid="text-report-cfm50">CFM50: {testData.cfm50}</div>
                      <div className="font-bold text-lg" data-testid="text-report-ach50">ACH50: {testData.ach50}</div>
                      <div data-testid="text-report-ela">ELA: {testData.ela} in²</div>
                      <div data-testid="text-report-nfactor">n-Factor: {testData.nFactor}</div>
                      <div data-testid="text-report-r">Correlation: {testData.correlationCoefficient}</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <h4 className="font-semibold mb-2">Minnesota 2020 Energy Code Compliance</h4>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={testData.meetsCode ? "default" : "destructive"}
                      className="text-base py-2 px-4"
                      data-testid="badge-report-compliance"
                    >
                      {testData.meetsCode ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>PASSES</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          <span>FAILS</span>
                        </div>
                      )}
                      <span className="ml-2">Climate Zone 6 Requirements</span>
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground" data-testid="text-report-compliance-summary">
                    Result: {testData.ach50} ACH50 | Required: ≤ {MINNESOTA_CODE_LIMIT_ACH50} ACH50 | Margin: {testData.margin}
                  </div>
                </div>
                
                <div className="pt-4 space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={testData.notes}
                    onChange={(e) => setTestData({...testData, notes: e.target.value})}
                    placeholder="Enter any additional observations or notes about the test..."
                    rows={4}
                    data-testid="textarea-notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Phase 2 - BUILD: Wrap with ErrorBoundary for production resilience
function BlowerDoorTestPage() {
  return (
    <ErrorBoundary>
      <BlowerDoorTestContent />
    </ErrorBoundary>
  );
}

export default BlowerDoorTestPage;
