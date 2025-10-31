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
import type { DuctLeakageTest, InsertDuctLeakageTest } from "@shared/schema";
import { 
  Wind, 
  Gauge, 
  Calculator, 
  Save, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Home,
  Wrench,
  Activity,
  BarChart3,
  Network,
  Clock,
  Plus,
  Trash2,
  Download,
  RefreshCw
} from "lucide-react";

interface PressurePanReading {
  location: string;
  supplyReturn: 'supply' | 'return';
  reading: number;
  passFail: 'pass' | 'fail' | 'marginal';
}

// Phase 3 - OPTIMIZE: Module-level constants for compliance thresholds and calibration factors
// Phase 6 - DOCUMENT: Minnesota 2020 Energy Code compliance thresholds
// Minnesota 2020 Energy Code Climate Zone 6: Maximum allowed Total Duct Leakage
const MINNESOTA_TDL_LIMIT = 4.0; // CFM25 per 100 square feet of conditioned floor area

// Minnesota 2020 Energy Code Climate Zone 6: Maximum allowed Duct Leakage to Outside
const MINNESOTA_DLO_LIMIT = 3.0; // CFM25 per 100 square feet of conditioned floor area

// Phase 6 - DOCUMENT: Minneapolis Duct Blaster calibration factors
// These factors are used in the equation: CFM = C × (ΔP)^n
// Where C is the flow coefficient and n is the flow exponent
const RING_CALIBRATION_FACTORS: Record<string, { C: number; n: number }> = {
  "Open": { C: 110, n: 0.5 },      // Open fan configuration (no ring restriction)
  "Ring 1": { C: 71, n: 0.5 },     // Ring 1 (65% of open flow)
  "Ring 2": { C: 46, n: 0.5 },     // Ring 2 (42% of open flow)
  "Ring 3": { C: 31, n: 0.5 },     // Ring 3 (28% of open flow)
};

// Phase 6 - DOCUMENT: Pressure pan evaluation thresholds (industry standard)
// Based on RESNET standards for pressure pan testing
const PRESSURE_PAN_PASS_THRESHOLD = 1.0;      // Pa - Good duct seal
const PRESSURE_PAN_MARGINAL_THRESHOLD = 3.0;  // Pa - Acceptable with minor leakage
// Readings above 3.0 Pa indicate significant leakage requiring repair

// Phase 6 - DOCUMENT: DLO test standard house pressure
// For accurate Duct Leakage to Outside testing, house must be depressurized to -25 Pa
const DLO_STANDARD_HOUSE_PRESSURE = -25; // Pa

// Default initial pressure pan readings for typical single-family home
const DEFAULT_PRESSURE_PAN_READINGS: PressurePanReading[] = [
  { location: "Master Bedroom", supplyReturn: "supply", reading: 0, passFail: "pass" },
  { location: "Bedroom 2", supplyReturn: "supply", reading: 0, passFail: "pass" },
  { location: "Bedroom 3", supplyReturn: "supply", reading: 0, passFail: "pass" },
  { location: "Living Room", supplyReturn: "supply", reading: 0, passFail: "pass" },
  { location: "Kitchen", supplyReturn: "supply", reading: 0, passFail: "pass" },
  { location: "Hallway", supplyReturn: "return", reading: 0, passFail: "pass" },
];

function DuctLeakageTestContent() {
  const { toast } = useToast();
  const { jobId } = useParams<{ jobId: string }>();
  const [activeTab, setActiveTab] = useState("setup");
  
  // Test data state - matching database schema
  const [testData, setTestData] = useState<Partial<InsertDuctLeakageTest>>({
    testDate: new Date(),
    testTime: new Date().toTimeString().slice(0, 5),
    testType: 'both',
    equipmentSerial: "",
    equipmentCalibrationDate: undefined,
    systemType: 'forced_air',
    numberOfSystems: 1,
    conditionedArea: 0,
    systemAirflow: 0,
    // Total Duct Leakage fields
    totalFanPressure: 0,
    totalRingConfiguration: "Open",
    cfm25Total: 0,
    totalCfmPerSqFt: 0,
    totalPercentOfFlow: 0,
    // Duct Leakage to Outside fields
    outsideHousePressure: DLO_STANDARD_HOUSE_PRESSURE,
    outsideFanPressure: 0,
    outsideRingConfiguration: "Open",
    cfm25Outside: 0,
    outsideCfmPerSqFt: 0,
    outsidePercentOfFlow: 0,
    // Pressure Pan readings (as JSON)
    pressurePanReadings: DEFAULT_PRESSURE_PAN_READINGS,
    // Code compliance
    codeYear: "2020",
    totalDuctLeakageLimit: MINNESOTA_TDL_LIMIT,
    outsideLeakageLimit: MINNESOTA_DLO_LIMIT,
    meetsCodeTDL: false,
    meetsCodeDLO: false,
    // Additional fields
    notes: "",
    recommendations: "",
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
    queryKey: ["/api/jobs", jobId, "duct-leakage-tests/latest"],
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
        pressurePanReadings: existingTest.pressurePanReadings || DEFAULT_PRESSURE_PAN_READINGS,
      });
    } else if (job) {
      // Use job's building data if available
      setTestData(prev => ({
        ...prev,
        conditionedArea: parseFloat(job.floorArea || "0") || prev.conditionedArea,
      }));
    }
  }, [existingTest, job]);

  // Phase 3 - OPTIMIZE: Memoize CFM calculation with useCallback
  // Phase 6 - DOCUMENT: Calculate CFM25 from fan pressure using calibration curves
  // Uses manufacturer-provided calibration factors for Minneapolis Duct Blaster
  // Formula: CFM = C × (ΔP)^n where C and n are equipment-specific calibration factors
  const calculateCFM25 = useCallback((fanPressure: number, ringConfig: string): number => {
    // Phase 5 - HARDEN: Validate inputs
    if (fanPressure <= 0 || isNaN(fanPressure)) return 0;
    
    const config = RING_CALIBRATION_FACTORS[ringConfig] || RING_CALIBRATION_FACTORS["Open"];
    
    // Calculate CFM at measured pressure, then convert to CFM25
    // Assuming test is conducted at target 25 Pa pressure
    const cfmMeasured = config.C * Math.pow(fanPressure, config.n);
    
    return cfmMeasured;
  }, []);

  // Phase 3 - OPTIMIZE: Memoize Total Duct Leakage calculation with useCallback
  // Phase 6 - DOCUMENT: Calculate Total Duct Leakage results with Minnesota 2020 Energy Code compliance
  // TDL measures total air leakage from entire duct system (both supply and return)
  // Result is expressed as CFM25 per 100 square feet of conditioned floor area
  const calculateTotalDuctLeakage = useCallback(() => {
    // Phase 5 - HARDEN: Validate conditioned area input
    if (!testData.conditionedArea || testData.conditionedArea <= 0) {
      toast({
        title: "Missing data",
        description: "Please enter conditioned area first",
        variant: "destructive",
      });
      return;
    }

    const cfm25 = calculateCFM25(testData.totalFanPressure || 0, testData.totalRingConfiguration || "Open");
    
    // Calculate CFM25 per 100 square feet (Minnesota code metric)
    const cfmPerSqFt = (cfm25 * 100) / testData.conditionedArea;
    
    // Calculate percentage of design airflow (secondary metric for HVAC sizing)
    const percentOfFlow = testData.systemAirflow && testData.systemAirflow > 0 
      ? (cfm25 / testData.systemAirflow) * 100 
      : 0;
    
    // Check Minnesota 2020 Energy Code compliance (≤ 4.0 CFM25/100 sq ft for TDL)
    const meetsCode = cfmPerSqFt <= MINNESOTA_TDL_LIMIT;
    
    setTestData(prev => ({
      ...prev,
      cfm25Total: Math.round(cfm25),
      totalCfmPerSqFt: parseFloat(cfmPerSqFt.toFixed(2)),
      totalPercentOfFlow: parseFloat(percentOfFlow.toFixed(1)),
      meetsCodeTDL: meetsCode,
    }));
    
    // Phase 2 - BUILD: Replace emoji with lucide icons in toast
    toast({
      title: "TDL calculated",
      description: (
        <div className="flex items-center gap-2" data-testid="toast-tdl-result">
          <span>{cfmPerSqFt.toFixed(2)} CFM25/100ft²</span>
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
          <span>Minnesota 2020 Code (≤{MINNESOTA_TDL_LIMIT})</span>
        </div>
      ),
      variant: meetsCode ? "default" : "destructive",
    });
  }, [testData.conditionedArea, testData.totalFanPressure, testData.totalRingConfiguration, testData.systemAirflow, calculateCFM25, toast]);

  // Phase 3 - OPTIMIZE: Memoize Duct Leakage to Outside calculation with useCallback
  // Phase 6 - DOCUMENT: Calculate Duct Leakage to Outside results with Minnesota 2020 Energy Code compliance
  // DLO measures air leakage from ducts to unconditioned spaces (attic, crawlspace, outside)
  // Test requires house to be depressurized to -25 Pa while measuring duct leakage
  // Result is expressed as CFM25 per 100 square feet of conditioned floor area
  const calculateLeakageToOutside = useCallback(() => {
    // Phase 5 - HARDEN: Validate conditioned area input
    if (!testData.conditionedArea || testData.conditionedArea <= 0) {
      toast({
        title: "Missing data",
        description: "Please enter conditioned area first",
        variant: "destructive",
      });
      return;
    }

    // Phase 5 - HARDEN: Validate house pressure for accurate DLO testing
    // DLO test requires house pressure at -25 Pa ± 2 Pa
    if (Math.abs((testData.outsideHousePressure || 0) - DLO_STANDARD_HOUSE_PRESSURE) > 2) {
      toast({
        title: "Warning",
        description: `House pressure should be at ${DLO_STANDARD_HOUSE_PRESSURE} Pa for accurate DLO testing`,
        variant: "destructive",
      });
    }

    const cfm25 = calculateCFM25(testData.outsideFanPressure || 0, testData.outsideRingConfiguration || "Open");
    
    // Calculate CFM25 per 100 square feet (Minnesota code metric)
    const cfmPerSqFt = (cfm25 * 100) / testData.conditionedArea;
    
    // Calculate percentage of design airflow (secondary metric for HVAC sizing)
    const percentOfFlow = testData.systemAirflow && testData.systemAirflow > 0 
      ? (cfm25 / testData.systemAirflow) * 100 
      : 0;
    
    // Check Minnesota 2020 Energy Code compliance (≤ 3.0 CFM25/100 sq ft for DLO)
    const meetsCode = cfmPerSqFt <= MINNESOTA_DLO_LIMIT;
    
    setTestData(prev => ({
      ...prev,
      cfm25Outside: Math.round(cfm25),
      outsideCfmPerSqFt: parseFloat(cfmPerSqFt.toFixed(2)),
      outsidePercentOfFlow: parseFloat(percentOfFlow.toFixed(1)),
      meetsCodeDLO: meetsCode,
    }));
    
    // Phase 2 - BUILD: Replace emoji with lucide icons in toast
    toast({
      title: "DLO calculated",
      description: (
        <div className="flex items-center gap-2" data-testid="toast-dlo-result">
          <span>{cfmPerSqFt.toFixed(2)} CFM25/100ft²</span>
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
          <span>Minnesota 2020 Code (≤{MINNESOTA_DLO_LIMIT})</span>
        </div>
      ),
      variant: meetsCode ? "default" : "destructive",
    });
  }, [testData.conditionedArea, testData.outsideHousePressure, testData.outsideFanPressure, testData.outsideRingConfiguration, testData.systemAirflow, calculateCFM25, toast]);

  // Phase 3 - OPTIMIZE: Memoize pressure pan evaluation with useCallback
  // Phase 6 - DOCUMENT: Evaluate pressure pan reading based on RESNET industry standards
  // Pressure pan test measures static pressure at each register with system fan on and registers sealed
  // Lower readings indicate better duct connection seals
  const evaluatePressurePan = useCallback((reading: number): 'pass' | 'fail' | 'marginal' => {
    if (reading <= PRESSURE_PAN_PASS_THRESHOLD) return 'pass';      // ≤ 1.0 Pa - Good seal
    if (reading <= PRESSURE_PAN_MARGINAL_THRESHOLD) return 'marginal';  // ≤ 3.0 Pa - Some leakage
    return 'fail';                                                   // > 3.0 Pa - Significant leakage
  }, []);

  // Phase 3 - OPTIMIZE: Memoize event handlers with useCallback
  const addPressurePanReading = useCallback(() => {
    setTestData(prev => ({
      ...prev,
      pressurePanReadings: [
        ...(prev.pressurePanReadings as PressurePanReading[] || []),
        { location: "", supplyReturn: "supply", reading: 0, passFail: "pass" }
      ]
    }));
  }, []);

  const removePressurePanReading = useCallback((index: number) => {
    setTestData(prev => ({
      ...prev,
      pressurePanReadings: (prev.pressurePanReadings as PressurePanReading[] || []).filter((_, i) => i !== index)
    }));
  }, []);

  // Phase 3 - OPTIMIZE: Memoize save handler with useCallback
  const handleSaveTest = useCallback(() => {
    // Phase 5 - HARDEN: Validate test data before saving
    if (testData.testType === 'total' && !testData.cfm25Total) {
      toast({
        title: "Incomplete test",
        description: "Please calculate TDL results before saving.",
        variant: "destructive",
      });
      return;
    }
    if (testData.testType === 'leakage_to_outside' && !testData.cfm25Outside) {
      toast({
        title: "Incomplete test",
        description: "Please calculate DLO results before saving.",
        variant: "destructive",
      });
      return;
    }
    if (testData.testType === 'both' && (!testData.cfm25Total || !testData.cfm25Outside)) {
      toast({
        title: "Incomplete test",
        description: "Please calculate both TDL and DLO results before saving.",
        variant: "destructive",
      });
      return;
    }
    saveTestMutation.mutate(testData);
  }, [testData]);

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
      a.download = `duct-leakage-test-${jobId}-${Date.now()}.pdf`;
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
    mutationFn: async (data: Partial<InsertDuctLeakageTest>) => {
      const endpoint = existingTest?.id 
        ? `/api/duct-leakage-tests/${existingTest.id}`
        : "/api/duct-leakage-tests";
      const method = existingTest?.id ? "PATCH" : "POST";
      
      return apiRequest(endpoint, method, {
        ...data,
        jobId,
        testDate: data.testDate?.toISOString(),
        equipmentCalibrationDate: data.equipmentCalibrationDate?.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "duct-leakage-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/duct-leakage-tests"] });
      toast({
        title: "Test saved",
        description: "Duct leakage test data has been saved successfully.",
      });
    },
    onError: (error) => {
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
      apiRequest(`/api/duct-leakage-tests/${testId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "duct-leakage-tests"] });
      // Reset form
      setTestData({
        testDate: new Date(),
        testTime: new Date().toTimeString().slice(0, 5),
        testType: 'both',
        equipmentSerial: "",
        equipmentCalibrationDate: undefined,
        systemType: 'forced_air',
        numberOfSystems: 1,
        conditionedArea: job ? parseFloat(job.floorArea || "0") : 0,
        systemAirflow: 0,
        totalFanPressure: 0,
        totalRingConfiguration: "Open",
        cfm25Total: 0,
        totalCfmPerSqFt: 0,
        totalPercentOfFlow: 0,
        outsideHousePressure: DLO_STANDARD_HOUSE_PRESSURE,
        outsideFanPressure: 0,
        outsideRingConfiguration: "Open",
        cfm25Outside: 0,
        outsideCfmPerSqFt: 0,
        outsidePercentOfFlow: 0,
        pressurePanReadings: DEFAULT_PRESSURE_PAN_READINGS,
        codeYear: "2020",
        totalDuctLeakageLimit: MINNESOTA_TDL_LIMIT,
        outsideLeakageLimit: MINNESOTA_DLO_LIMIT,
        meetsCodeTDL: false,
        meetsCodeDLO: false,
        notes: "",
        recommendations: "",
      });
      toast({
        title: "Test deleted",
        description: "Duct leakage test data has been deleted.",
      });
    },
  });

  // Phase 2 - BUILD: Skeleton loaders for loading states
  if (loadingJob || loadingTest) {
    return (
      <div className="container mx-auto p-6" data-testid="skeleton-duct-leakage-test">
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
            <span>Unable to fetch test data. Please try again.</span>
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
    <div className="container mx-auto p-6" data-testid="duct-leakage-test-page">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
              <Network className="h-8 w-8" />
              Duct Leakage Test
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="job-address">
              {job ? `${job.address}, ${job.city}` : `Job: ${jobId}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={testData.meetsCodeTDL ? "default" : "destructive"}
              data-testid="badge-tdl-result"
            >
              TDL: {testData.totalCfmPerSqFt || "—"} CFM25/100ft²
            </Badge>
            <Badge 
              variant={testData.meetsCodeDLO ? "default" : "destructive"}
              data-testid="badge-dlo-result"
            >
              DLO: {testData.outsideCfmPerSqFt || "—"} CFM25/100ft²
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
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-list">
          <TabsTrigger value="setup" data-testid="tab-setup">Setup</TabsTrigger>
          <TabsTrigger value="tdl" data-testid="tab-tdl">Total Leakage</TabsTrigger>
          <TabsTrigger value="dlo" data-testid="tab-dlo">Outside Leakage</TabsTrigger>
          <TabsTrigger value="pressure-pan" data-testid="tab-pressure-pan">Pressure Pan</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4" data-testid="tab-content-setup">
          <Card>
            <CardHeader>
              <CardTitle>Test Setup</CardTitle>
              <CardDescription>Equipment and system information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <Label htmlFor="test-type">Test Type</Label>
                  <Select
                    value={testData.testType}
                    onValueChange={(value: any) => setTestData({...testData, testType: value})}
                  >
                    <SelectTrigger id="test-type" data-testid="select-test-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total" data-testid="select-option-total">Total Duct Leakage Only</SelectItem>
                      <SelectItem value="leakage_to_outside" data-testid="select-option-dlo">Leakage to Outside Only</SelectItem>
                      <SelectItem value="both" data-testid="select-option-both">Both TDL and DLO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment-serial">Equipment Serial #</Label>
                  <Input
                    id="equipment-serial"
                    value={testData.equipmentSerial}
                    onChange={(e) => setTestData({...testData, equipmentSerial: e.target.value})}
                    placeholder="e.g., DB3-1234"
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

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>HVAC system details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="system-type">System Type</Label>
                  <Select
                    value={testData.systemType}
                    onValueChange={(value: any) => setTestData({...testData, systemType: value})}
                  >
                    <SelectTrigger id="system-type" data-testid="select-system-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forced_air" data-testid="select-option-forced-air">Forced Air Furnace</SelectItem>
                      <SelectItem value="heat_pump" data-testid="select-option-heat-pump">Heat Pump</SelectItem>
                      <SelectItem value="hydronic" data-testid="select-option-hydronic">Hydronic</SelectItem>
                      <SelectItem value="other" data-testid="select-option-other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="num-systems">Number of Systems</Label>
                  <Input
                    id="num-systems"
                    type="number"
                    value={testData.numberOfSystems}
                    onChange={(e) => setTestData({...testData, numberOfSystems: parseInt(e.target.value) || 1})}
                    data-testid="input-num-systems"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conditioned-area">Conditioned Area (ft²) *</Label>
                  <Input
                    id="conditioned-area"
                    type="number"
                    value={testData.conditionedArea}
                    onChange={(e) => setTestData({...testData, conditionedArea: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 3000"
                    data-testid="input-conditioned-area"
                    className={!testData.conditionedArea ? "border-red-500" : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="system-airflow">Design System Airflow (CFM)</Label>
                  <Input
                    id="system-airflow"
                    type="number"
                    value={testData.systemAirflow}
                    onChange={(e) => setTestData({...testData, systemAirflow: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 1200"
                    data-testid="input-system-airflow"
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Required Field</AlertTitle>
                <AlertDescription>
                  Conditioned area is required for calculating CFM25/100ft² compliance metrics
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tdl" className="space-y-4" data-testid="tab-content-tdl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-5 w-5" />
                Total Duct Leakage (TDL)
              </CardTitle>
              <CardDescription>
                Measures total air leakage from the entire duct system (supply + return)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-fan-pressure">Fan Pressure (Pa) *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="total-fan-pressure"
                      type="number"
                      step="0.1"
                      value={testData.totalFanPressure}
                      onChange={(e) => setTestData({...testData, totalFanPressure: parseFloat(e.target.value) || 0})}
                      placeholder="e.g., 25.0"
                      data-testid="input-total-fan-pressure"
                    />
                    <Gauge className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="total-ring-config">Ring Configuration</Label>
                  <Select
                    value={testData.totalRingConfiguration}
                    onValueChange={(value) => setTestData({...testData, totalRingConfiguration: value})}
                  >
                    <SelectTrigger id="total-ring-config" data-testid="select-total-ring-config">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open" data-testid="select-option-open">Open (no restriction)</SelectItem>
                      <SelectItem value="Ring 1" data-testid="select-option-ring1">Ring 1</SelectItem>
                      <SelectItem value="Ring 2" data-testid="select-option-ring2">Ring 2</SelectItem>
                      <SelectItem value="Ring 3" data-testid="select-option-ring3">Ring 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={calculateTotalDuctLeakage} 
                className="w-full"
                data-testid="button-calculate-tdl"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate TDL
              </Button>

              {testData.cfm25Total > 0 && (
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="text-lg">TDL Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-muted-foreground">CFM25</div>
                        <div className="text-2xl font-bold" data-testid="text-cfm25-total">{testData.cfm25Total}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">CFM25/100ft²</div>
                        <div className="text-2xl font-bold" data-testid="text-total-cfm-per-sqft">{testData.totalCfmPerSqFt}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">% of Flow</div>
                        <div className="text-2xl font-bold" data-testid="text-total-percent-flow">{testData.totalPercentOfFlow}%</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Minnesota 2020 Code Compliance:</span>
                      <Badge 
                        variant={testData.meetsCodeTDL ? "default" : "destructive"}
                        className="flex items-center gap-1"
                        data-testid="badge-tdl-compliance"
                      >
                        {testData.meetsCodeTDL ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {testData.meetsCodeTDL ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dlo" className="space-y-4" data-testid="tab-content-dlo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Duct Leakage to Outside (DLO)
              </CardTitle>
              <CardDescription>
                Measures air leakage from ducts to unconditioned spaces (requires house at -25 Pa)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="outside-house-pressure">House Pressure (Pa) *</Label>
                  <Input
                    id="outside-house-pressure"
                    type="number"
                    step="0.1"
                    value={testData.outsideHousePressure}
                    onChange={(e) => setTestData({...testData, outsideHousePressure: parseFloat(e.target.value) || DLO_STANDARD_HOUSE_PRESSURE})}
                    placeholder="-25.0"
                    data-testid="input-outside-house-pressure"
                    className={Math.abs((testData.outsideHousePressure || 0) - DLO_STANDARD_HOUSE_PRESSURE) > 2 ? "border-amber-500" : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="outside-fan-pressure">Fan Pressure (Pa) *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="outside-fan-pressure"
                      type="number"
                      step="0.1"
                      value={testData.outsideFanPressure}
                      onChange={(e) => setTestData({...testData, outsideFanPressure: parseFloat(e.target.value) || 0})}
                      placeholder="e.g., 25.0"
                      data-testid="input-outside-fan-pressure"
                    />
                    <Gauge className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="outside-ring-config">Ring Configuration</Label>
                  <Select
                    value={testData.outsideRingConfiguration}
                    onValueChange={(value) => setTestData({...testData, outsideRingConfiguration: value})}
                  >
                    <SelectTrigger id="outside-ring-config" data-testid="select-outside-ring-config">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open" data-testid="select-option-open-dlo">Open (no restriction)</SelectItem>
                      <SelectItem value="Ring 1" data-testid="select-option-ring1-dlo">Ring 1</SelectItem>
                      <SelectItem value="Ring 2" data-testid="select-option-ring2-dlo">Ring 2</SelectItem>
                      <SelectItem value="Ring 3" data-testid="select-option-ring3-dlo">Ring 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={calculateLeakageToOutside} 
                className="w-full"
                data-testid="button-calculate-dlo"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate DLO
              </Button>

              {testData.cfm25Outside > 0 && (
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="text-lg">DLO Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-muted-foreground">CFM25</div>
                        <div className="text-2xl font-bold" data-testid="text-cfm25-outside">{testData.cfm25Outside}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">CFM25/100ft²</div>
                        <div className="text-2xl font-bold" data-testid="text-outside-cfm-per-sqft">{testData.outsideCfmPerSqFt}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">% of Flow</div>
                        <div className="text-2xl font-bold" data-testid="text-outside-percent-flow">{testData.outsidePercentOfFlow}%</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Minnesota 2020 Code Compliance:</span>
                      <Badge 
                        variant={testData.meetsCodeDLO ? "default" : "destructive"}
                        className="flex items-center gap-1"
                        data-testid="badge-dlo-compliance"
                      >
                        {testData.meetsCodeDLO ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {testData.meetsCodeDLO ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pressure-pan" className="space-y-4" data-testid="tab-content-pressure-pan">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Pressure Pan Testing
              </CardTitle>
              <CardDescription>
                Measure static pressure at each register to identify duct connection leaks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(testData.pressurePanReadings as PressurePanReading[] || []).map((reading, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor={`location-${index}`}>Location</Label>
                    <Input
                      id={`location-${index}`}
                      value={reading.location}
                      onChange={(e) => {
                        const newReadings = [...(testData.pressurePanReadings as PressurePanReading[])];
                        newReadings[index] = { ...newReadings[index], location: e.target.value };
                        setTestData({...testData, pressurePanReadings: newReadings});
                      }}
                      placeholder="e.g., Master Bedroom"
                      data-testid={`input-location-${index}`}
                    />
                  </div>
                  <div className="w-32">
                    <Label htmlFor={`supply-return-${index}`}>Type</Label>
                    <Select
                      value={reading.supplyReturn}
                      onValueChange={(value: 'supply' | 'return') => {
                        const newReadings = [...(testData.pressurePanReadings as PressurePanReading[])];
                        newReadings[index] = { ...newReadings[index], supplyReturn: value };
                        setTestData({...testData, pressurePanReadings: newReadings});
                      }}
                    >
                      <SelectTrigger id={`supply-return-${index}`} data-testid={`select-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supply" data-testid={`select-option-supply-${index}`}>Supply</SelectItem>
                        <SelectItem value="return" data-testid={`select-option-return-${index}`}>Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label htmlFor={`reading-${index}`}>Reading (Pa)</Label>
                    <Input
                      id={`reading-${index}`}
                      type="number"
                      step="0.1"
                      value={reading.reading}
                      onChange={(e) => {
                        const newReading = parseFloat(e.target.value) || 0;
                        const newReadings = [...(testData.pressurePanReadings as PressurePanReading[])];
                        newReadings[index] = { 
                          ...newReadings[index], 
                          reading: newReading,
                          passFail: evaluatePressurePan(newReading)
                        };
                        setTestData({...testData, pressurePanReadings: newReadings});
                      }}
                      data-testid={`input-reading-${index}`}
                    />
                  </div>
                  <div className="w-24">
                    <Badge 
                      variant={
                        reading.passFail === 'pass' ? 'default' : 
                        reading.passFail === 'marginal' ? 'secondary' : 
                        'destructive'
                      }
                      data-testid={`badge-result-${index}`}
                    >
                      {reading.passFail}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removePressurePanReading(index)}
                    data-testid={`button-remove-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                onClick={addPressurePanReading}
                className="w-full"
                data-testid="button-add-pressure-pan"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Reading
              </Button>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pressure Pan Standards</AlertTitle>
                <AlertDescription>
                  Pass: ≤ {PRESSURE_PAN_PASS_THRESHOLD} Pa | Marginal: ≤ {PRESSURE_PAN_MARGINAL_THRESHOLD} Pa | Fail: &gt; {PRESSURE_PAN_MARGINAL_THRESHOLD} Pa
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4" data-testid="tab-content-results">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Test Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Test Date</div>
                    <div className="font-medium" data-testid="text-summary-date">{testData.testDate?.toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Test Time</div>
                    <div className="font-medium" data-testid="text-summary-time">{testData.testTime}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Test Type</div>
                    <div className="font-medium" data-testid="text-summary-type">
                      {testData.testType === 'both' ? 'TDL + DLO' : 
                       testData.testType === 'total' ? 'TDL Only' : 'DLO Only'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Conditioned Area</div>
                    <div className="font-medium" data-testid="text-summary-area">{testData.conditionedArea} ft²</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Code Compliance
                </CardTitle>
                <CardDescription>Minnesota 2020 Energy Code (Climate Zone 6)</CardDescription>
              </CardHeader>
              <CardContent>
                {!testData.cfm25Total && !testData.cfm25Outside ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Calculate TDL and/or DLO results to see compliance status
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert 
                    className={
                      (testData.meetsCodeTDL || !testData.cfm25Total) && 
                      (testData.meetsCodeDLO || !testData.cfm25Outside)
                        ? "border-green-600/20 bg-green-50/50 dark:bg-green-900/10"
                        : "border-red-600/20 bg-red-50/50 dark:bg-red-900/10"
                    }
                  >
                    {(testData.meetsCodeTDL || !testData.cfm25Total) && 
                     (testData.meetsCodeDLO || !testData.cfm25Outside) ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertTitle data-testid="text-overall-compliance">
                      {(testData.meetsCodeTDL || !testData.cfm25Total) && 
                       (testData.meetsCodeDLO || !testData.cfm25Outside)
                        ? 'System Meets Code Requirements'
                        : 'System Does Not Meet Code Requirements'}
                    </AlertTitle>
                  </Alert>
                )}
                
                <div className="space-y-3 mt-4">
                  <div>
                    <h5 className="text-sm font-semibold mb-1">Total Duct Leakage (TDL)</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Code Limit</span>
                        <span data-testid="text-tdl-limit">≤ {MINNESOTA_TDL_LIMIT} CFM25/100ft²</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Your Result</span>
                        <span 
                          className={testData.meetsCodeTDL ? 'text-green-600' : 'text-red-600'}
                          data-testid="text-tdl-your-result"
                        >
                          {testData.totalCfmPerSqFt || "—"} CFM25/100ft²
                        </span>
                      </div>
                      {testData.totalCfmPerSqFt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Margin</span>
                          <span 
                            className={testData.meetsCodeTDL ? 'text-green-600' : 'text-red-600'}
                            data-testid="text-tdl-margin"
                          >
                            {(MINNESOTA_TDL_LIMIT - (testData.totalCfmPerSqFt || 0)).toFixed(2)} CFM25/100ft²
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h5 className="text-sm font-semibold mb-1">Duct Leakage to Outside (DLO)</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Code Limit</span>
                        <span data-testid="text-dlo-limit">≤ {MINNESOTA_DLO_LIMIT} CFM25/100ft²</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Your Result</span>
                        <span 
                          className={testData.meetsCodeDLO ? 'text-green-600' : 'text-red-600'}
                          data-testid="text-dlo-your-result"
                        >
                          {testData.outsideCfmPerSqFt || "—"} CFM25/100ft²
                        </span>
                      </div>
                      {testData.outsideCfmPerSqFt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Margin</span>
                          <span 
                            className={testData.meetsCodeDLO ? 'text-green-600' : 'text-red-600'}
                            data-testid="text-dlo-margin"
                          >
                            {(MINNESOTA_DLO_LIMIT - (testData.outsideCfmPerSqFt || 0)).toFixed(2)} CFM25/100ft²
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pressure Pan Results</CardTitle>
              <CardDescription>Individual register leakage assessment</CardDescription>
            </CardHeader>
            <CardContent>
              {(testData.pressurePanReadings as PressurePanReading[] || []).filter(r => r.location).length > 0 ? (
                <div className="grid grid-cols-4 gap-4" data-testid="pressure-pan-results-grid">
                  {(testData.pressurePanReadings as PressurePanReading[] || [])
                    .filter(r => r.location)
                    .map((reading, index) => (
                      <div key={index} className="text-center" data-testid={`pressure-pan-result-${index}`}>
                        <div className="text-sm font-medium">{reading.location}</div>
                        <div className="text-xs text-muted-foreground">({reading.supplyReturn})</div>
                        <div className="text-2xl font-bold mt-1">{reading.reading} Pa</div>
                        <Badge 
                          variant={
                            reading.passFail === 'pass' ? 'default' : 
                            reading.passFail === 'marginal' ? 'secondary' : 
                            'destructive'
                          }
                          className="mt-1"
                        >
                          {reading.passFail}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center" data-testid="no-pressure-pan-results">
                  No pressure pan readings recorded
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes & Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Test Notes</Label>
                <Textarea
                  id="notes"
                  value={testData.notes}
                  onChange={(e) => setTestData({...testData, notes: e.target.value})}
                  placeholder="Enter any observations or notes about the test..."
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={testData.recommendations}
                  onChange={(e) => setTestData({...testData, recommendations: e.target.value})}
                  placeholder="Enter recommendations for improving duct system performance..."
                  rows={3}
                  data-testid="textarea-recommendations"
                />
              </div>
              {(!testData.meetsCodeTDL && testData.cfm25Total) || (!testData.meetsCodeDLO && testData.cfm25Outside) ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Suggested Improvements</AlertTitle>
                  <AlertDescription>
                    {!testData.meetsCodeTDL && "• Seal duct connections with mastic or approved tape\n"}
                    {!testData.meetsCodeDLO && "• Focus on sealing leaks to unconditioned spaces\n"}
                    • Check and seal boot-to-register connections<br/>
                    • Seal air handler cabinet joints<br/>
                    • Consider aerosol duct sealing for inaccessible areas
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper with comprehensive fallback UI
function DuctLeakageTestPage() {
  const { jobId } = useParams<{ jobId: string }>();
  
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto p-6" data-testid="error-boundary-fallback">
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">
              Application Error
            </AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400 space-y-2">
              <p>The duct leakage test page encountered an unexpected error.</p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  data-testid="button-reload-page"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                <Link href={`/jobs/${jobId}`}>
                  <Button variant="outline" data-testid="button-back-to-job">
                    Back to Job
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <DuctLeakageTestContent />
    </ErrorBoundary>
  );
}

export default DuctLeakageTestPage;
