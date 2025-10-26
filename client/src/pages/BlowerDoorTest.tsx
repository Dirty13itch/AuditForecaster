import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import type { BlowerDoorTest, InsertBlowerDoorTest } from "@shared/schema";
import { 
  Wind, 
  Gauge, 
  Calculator, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Home,
  Thermometer,
  Droplets,
  BarChart3,
  FileText,
  Clock,
  Mountain,
  Download
} from "lucide-react";

interface TestPoint {
  housePressure: number;
  fanPressure: number;
  cfm: number;
  ringConfiguration: string;
}

function BlowerDoorTestPage() {
  const { toast } = useToast();
  const { jobId } = useParams<{ jobId: string }>();
  const [activeTab, setActiveTab] = useState("setup");
  const [altitude, setAltitude] = useState(900); // Minneapolis average altitude in feet
  
  // Minnesota 2020 Energy Code Climate Zone 6 limit
  const MINNESOTA_CODE_LIMIT_ACH50 = 3.0; // Updated from 5.0 to accurate 3.0 ACH50
  
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
    barometricPressure: 29.92,
    altitude: altitude,
    testPoints: [
      { housePressure: 50, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 45, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 40, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 35, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 30, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 25, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 20, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
    ] as TestPoint[],
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

  // Fetch job data
  const { data: job } = useQuery({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  // Fetch latest test data if exists
  const { data: existingTest, isLoading: loadingTest } = useQuery({
    queryKey: ["/api/jobs", jobId, "blower-door-tests/latest"],
    enabled: !!jobId,
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
      // Use job's building data if available
      setTestData(prev => ({
        ...prev,
        houseVolume: parseFloat(job.houseVolume || "0") || prev.houseVolume,
        conditionedArea: parseFloat(job.floorArea || "0") || prev.conditionedArea,
        surfaceArea: parseFloat(job.surfaceArea || "0") || prev.surfaceArea,
        numberOfStories: parseFloat(job.stories || "1") || prev.numberOfStories,
      }));
    }
  }, [existingTest, job]);

  // Calculate altitude correction factor
  const calculateAltitudeCorrection = (altitudeFeet: number): number => {
    // Standard atmospheric pressure at sea level: 14.696 psi
    // Pressure decreases approximately 0.5 psi per 1000 feet
    const seaLevelPressure = 14.696;
    const altitudePressure = seaLevelPressure * Math.pow((1 - 0.0000068756 * altitudeFeet), 5.2559);
    return seaLevelPressure / altitudePressure;
  };

  // Calculate CFM from fan pressure with proper calibration curves
  const calculateCFM = (fanPressure: number, ringConfig: string): number => {
    if (fanPressure <= 0) return 0;
    
    // Energy Conservatory Model 3 Fan calibration (typical for Minnesota)
    // These are more accurate calibration factors
    const ringFactors: Record<string, { C: number; n: number }> = {
      "Open": { C: 235, n: 0.5 },      // Open fan configuration
      "Ring A": { C: 176, n: 0.5 },    // Ring A (74% reduction)
      "Ring B": { C: 127, n: 0.5 },    // Ring B (54% reduction)
      "Ring C": { C: 85, n: 0.5 },     // Ring C (36% reduction)
      "Ring D": { C: 56, n: 0.5 },     // Ring D (24% reduction)
    };
    
    const config = ringFactors[ringConfig] || ringFactors["Open"];
    const cfm = config.C * Math.pow(fanPressure, config.n);
    
    // Apply altitude correction
    const altitudeCorrection = calculateAltitudeCorrection(altitude);
    return cfm * altitudeCorrection;
  };

  // Calculate accurate multi-point regression
  const calculateRegression = () => {
    const validPoints = (testData.testPoints as TestPoint[]).filter(p => p.fanPressure > 0 && p.cfm > 0);
    
    if (validPoints.length < 5) {
      toast({
        title: "Insufficient data",
        description: "Need at least 5 valid test points for accurate calculation",
        variant: "destructive",
      });
      return;
    }

    // Perform log-log regression: log(Q) = log(C) + n*log(ΔP)
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
    
    // Calculate ACH50 using accurate formula: ACH50 = (CFM50 × 60) / Volume
    const ach50 = testData.houseVolume ? (cfm50 * 60) / testData.houseVolume : 0;
    
    // Calculate ELA (Effective Leakage Area) at 4 Pa reference pressure
    const cfm4 = C * Math.pow(4, nFactor);
    const ela = (cfm4 * 144) / (Math.sqrt(2 * 32.2 * 4 / 0.075) * 0.61); // in square inches
    
    // Calculate correlation coefficient (R²)
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
    
    toast({
      title: "Calculations complete",
      description: `ACH50: ${ach50.toFixed(2)} | ${meetsCode ? '✓ Passes' : '✗ Fails'} Minnesota 2020 Code (≤${MINNESOTA_CODE_LIMIT_ACH50})`,
      variant: meetsCode ? "default" : "destructive",
    });
  };

  // Calculate weather correction factor
  const calculateWeatherCorrection = (): number => {
    // Indoor-outdoor temperature difference correction
    const indoorTempK = (testData.indoorTemp! - 32) * 5/9 + 273.15; // Convert F to Kelvin
    const outdoorTempK = (testData.outdoorTemp! - 32) * 5/9 + 273.15;
    const tempCorrection = Math.sqrt(indoorTempK / outdoorTempK);
    
    // Wind speed correction (based on ASTM E779)
    const windSpeedMs = (testData.windSpeed || 0) * 0.44704; // Convert mph to m/s
    const windCorrection = 1 + (0.015 * windSpeedMs); // Simplified wind correction
    
    // Barometric pressure correction
    const standardPressure = 29.92; // inHg
    const pressureCorrection = (testData.barometricPressure || standardPressure) / standardPressure;
    
    // Combined correction factor
    return tempCorrection * pressureCorrection / windCorrection;
  };

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
      toast({
        title: "Test saved",
        description: "Blower door test data has been saved successfully.",
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
        barometricPressure: 29.92,
        altitude: altitude,
        testPoints: [
          { housePressure: 50, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
          { housePressure: 45, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
          { housePressure: 40, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
          { housePressure: 35, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
          { housePressure: 30, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
          { housePressure: 25, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
          { housePressure: 20, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
        ] as TestPoint[],
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

  const handleSaveTest = () => {
    if (!testData.cfm50 || !testData.ach50) {
      toast({
        title: "Incomplete test",
        description: "Please calculate results before saving.",
        variant: "destructive",
      });
      return;
    }
    saveTestMutation.mutate(testData);
  };

  const handleDownloadPDF = async () => {
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
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wind className="h-8 w-8" />
              Blower Door Test
            </h1>
            <p className="text-muted-foreground mt-1">
              {job ? `${job.address}, ${job.city}` : `Job: ${jobId}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={testData.meetsCode ? "default" : "destructive"}>
              ACH50: {testData.ach50 || "—"}
            </Badge>
            {existingTest && (
              <Badge variant="outline">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="multipoint">Multi-Point</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card>
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

          <Card>
            <CardHeader>
              <CardTitle>Building Information</CardTitle>
              <CardDescription>Required for ACH50 calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="house-volume">House Volume (ft³)</Label>
                  <Input
                    id="house-volume"
                    type="number"
                    value={testData.houseVolume}
                    onChange={(e) => setTestData({...testData, houseVolume: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 24000"
                    data-testid="input-house-volume"
                  />
                </div>
                <div>
                  <Label htmlFor="conditioned-area">Conditioned Area (ft²)</Label>
                  <Input
                    id="conditioned-area"
                    type="number"
                    value={testData.conditionedArea}
                    onChange={(e) => setTestData({...testData, conditionedArea: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 3000"
                    data-testid="input-conditioned-area"
                  />
                </div>
                <div>
                  <Label htmlFor="surface-area">Surface Area (ft²)</Label>
                  <Input
                    id="surface-area"
                    type="number"
                    value={testData.surfaceArea}
                    onChange={(e) => setTestData({...testData, surfaceArea: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 5500"
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

        <TabsContent value="weather" className="space-y-4">
          <Card>
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
                    <Input
                      id="outdoor-temp"
                      type="number"
                      value={testData.outdoorTemp}
                      onChange={(e) => setTestData({...testData, outdoorTemp: parseFloat(e.target.value) || 0})}
                      data-testid="input-outdoor-temp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="indoor-temp">Indoor Temperature (°F)</Label>
                    <Input
                      id="indoor-temp"
                      type="number"
                      value={testData.indoorTemp}
                      onChange={(e) => setTestData({...testData, indoorTemp: parseFloat(e.target.value) || 0})}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Correction factor: {calculateAltitudeCorrection(altitude).toFixed(3)}
                  </p>
                </div>
              </div>
              
              <Alert>
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

        <TabsContent value="multipoint" className="space-y-4">
          <Card>
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
                  <div key={index} className="grid grid-cols-5 gap-2">
                    <Input
                      type="number"
                      value={point.housePressure}
                      readOnly
                      className="bg-muted"
                    />
                    <Input
                      type="number"
                      value={point.fanPressure}
                      onChange={(e) => {
                        const newPoints = [...(testData.testPoints as TestPoint[])];
                        newPoints[index].fanPressure = parseFloat(e.target.value) || 0;
                        newPoints[index].cfm = calculateCFM(newPoints[index].fanPressure, newPoints[index].ringConfiguration);
                        setTestData({...testData, testPoints: newPoints});
                      }}
                      placeholder="Enter reading"
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
                    />
                    <div className="flex items-center">
                      {point.fanPressure > 0 && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={calculateRegression}
                className="w-full mt-4"
                disabled={(testData.testPoints as TestPoint[]).filter(p => p.fanPressure > 0).length < 5}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Results
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Primary Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">CFM50</span>
                  <span className="text-2xl font-bold">{testData.cfm50 || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ACH50</span>
                  <span className="text-2xl font-bold">{testData.ach50 || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ELA (in²)</span>
                  <span className="text-xl font-semibold">{testData.ela || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Flow Exponent (n)</span>
                  <span className="text-xl font-semibold">{testData.nFactor || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Correlation (r)</span>
                  <span className="text-xl font-semibold">{testData.correlationCoefficient || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Minnesota Code Compliance</CardTitle>
                <CardDescription>2020 Energy Code Requirements - Climate Zone 6</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant={testData.meetsCode ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {testData.meetsCode ? "PASSES" : "FAILS"} Code
                  </AlertTitle>
                  <AlertDescription>
                    {testData.ach50 
                      ? `ACH50: ${testData.ach50} | Limit: ${MINNESOTA_CODE_LIMIT_ACH50} | Margin: ${testData.margin! > 0 ? '+' : ''}${testData.margin}`
                      : "Complete test to check compliance"
                    }
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Climate Zone 6 Limit</span>
                    <span className="font-medium">≤ {MINNESOTA_CODE_LIMIT_ACH50} ACH50</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your Result</span>
                    <span className={`font-medium ${testData.meetsCode ? 'text-green-600' : 'text-red-600'}`}>
                      {testData.ach50 || "—"} ACH50
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weather Corrected</span>
                    <span>{testData.weatherCorrectionApplied ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Altitude Correction</span>
                    <span>{testData.altitudeCorrectionFactor?.toFixed(3) || "1.000"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Test Quality Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {(testData.testPoints as TestPoint[]).filter(p => p.fanPressure > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Valid Test Points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {testData.correlationCoefficient ? (testData.correlationCoefficient * 100).toFixed(1) : "—"}%
                  </div>
                  <div className="text-sm text-muted-foreground">Correlation</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {testData.nFactor || "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Flow Exponent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card>
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
                      <div>Date: {testData.testDate?.toLocaleDateString()}</div>
                      <div>Time: {testData.testTime}</div>
                      <div>Equipment: {testData.equipmentSerial || "Not specified"}</div>
                      <div>Calibration: {testData.equipmentCalibrationDate?.toLocaleDateString() || "Not specified"}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Building Data</h4>
                    <div className="space-y-1 text-sm">
                      <div>Volume: {testData.houseVolume} ft³</div>
                      <div>Conditioned Area: {testData.conditionedArea} ft²</div>
                      <div>Surface Area: {testData.surfaceArea} ft²</div>
                      <div>Stories: {testData.numberOfStories}</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <h4 className="font-semibold mb-2">Weather Conditions</h4>
                    <div className="space-y-1 text-sm">
                      <div>Outdoor: {testData.outdoorTemp}°F / {testData.outdoorHumidity}%</div>
                      <div>Indoor: {testData.indoorTemp}°F / {testData.indoorHumidity}%</div>
                      <div>Wind: {testData.windSpeed} mph</div>
                      <div>Pressure: {testData.barometricPressure} inHg</div>
                      <div>Altitude: {testData.altitude} ft</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Test Results</h4>
                    <div className="space-y-1 text-sm">
                      <div className="font-bold text-lg">CFM50: {testData.cfm50}</div>
                      <div className="font-bold text-lg">ACH50: {testData.ach50}</div>
                      <div>ELA: {testData.ela} in²</div>
                      <div>n-Factor: {testData.nFactor}</div>
                      <div>Correlation: {testData.correlationCoefficient}</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <h4 className="font-semibold mb-2">Minnesota 2020 Energy Code Compliance</h4>
                  <Badge 
                    variant={testData.meetsCode ? "default" : "destructive"}
                    className="text-base py-2 px-4"
                  >
                    {testData.meetsCode ? "✓ PASSES" : "✗ FAILS"} Climate Zone 6 Requirements
                  </Badge>
                  <div className="mt-2 text-sm text-muted-foreground">
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

export default BlowerDoorTestPage;