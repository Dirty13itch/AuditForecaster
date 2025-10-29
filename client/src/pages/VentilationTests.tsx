import { useState, useEffect } from "react";
import { useParams } from "wouter";
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
import type { VentilationTest, InsertVentilationTest } from "@shared/schema";
import { 
  Wind, 
  Gauge, 
  Calculator, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Home,
  ChefHat,
  Bath,
  Activity,
  Clock
} from "lucide-react";

function VentilationTestsPage() {
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
    bedrooms: 3,
    stories: 1,
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
    codeYear: "2020",
    overallCompliant: false,
    nonComplianceNotes: "",
    recommendations: "",
    weatherConditions: "",
    inspectorNotes: "",
  });

  // Fetch job data
  const { data: job } = useQuery({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  // Fetch latest test data if exists
  const { data: existingTest, isLoading: loadingTest } = useQuery({
    queryKey: ["/api/jobs", jobId, "ventilation-tests/latest"],
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
      setTestData(prev => ({
        ...prev,
        floorArea: parseFloat(job.floorArea || "0") || prev.floorArea,
        bedrooms: parseInt(job.bedrooms || "3") || prev.bedrooms,
      }));
    }
  }, [existingTest, job]);

  // Calculate ASHRAE 62.2 required ventilation rate
  // Formula: Qtotal = 0.03 * floorArea + 7.5 * (bedrooms + 1)
  const calculateRequiredVentilation = () => {
    const floorArea = testData.floorArea || 0;
    const bedrooms = testData.bedrooms || 0;
    
    if (floorArea <= 0 || bedrooms <= 0) {
      toast({
        title: "Missing data",
        description: "Please enter floor area and number of bedrooms",
        variant: "destructive",
      });
      return;
    }

    const required = 0.03 * floorArea + 7.5 * (bedrooms + 1);
    const infiltrationCredit = testData.infiltrationCredit || 0;
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
  };

  // Calculate total ventilation provided
  const calculateTotalVentilation = () => {
    let total = 0;
    
    // Kitchen
    if (testData.kitchenMeasuredCFM && testData.kitchenExhaustType !== "none") {
      total += Number(testData.kitchenMeasuredCFM);
    }
    
    // Bathrooms
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
    
    // Mechanical (use greater of supply or exhaust)
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
  };

  // Check kitchen compliance
  const checkKitchenCompliance = () => {
    const type = testData.kitchenExhaustType;
    const measured = Number(testData.kitchenMeasuredCFM) || 0;
    
    if (!type || type === "none") return false;
    
    if (type === "intermittent") {
      return measured >= 100;
    } else if (type === "continuous") {
      return measured >= 25;
    }
    
    return false;
  };

  // Check bathroom compliance
  const checkBathroomCompliance = (type: string | undefined, measured: number | undefined) => {
    if (!type || type === "none" || !measured) return false;
    
    if (type === "intermittent") {
      return measured >= 50;
    } else if (type === "continuous") {
      return measured >= 20;
    }
    
    return false;
  };

  // Calculate all compliance
  const calculateCompliance = () => {
    const total = calculateTotalVentilation();
    
    const kitchenCompliant = checkKitchenCompliance();
    const bathroom1Compliant = checkBathroomCompliance(testData.bathroom1Type, testData.bathroom1MeasuredCFM);
    const bathroom2Compliant = testData.bathroom2Type ? checkBathroomCompliance(testData.bathroom2Type, testData.bathroom2MeasuredCFM) : true;
    const bathroom3Compliant = testData.bathroom3Type ? checkBathroomCompliance(testData.bathroom3Type, testData.bathroom3MeasuredCFM) : true;
    const bathroom4Compliant = testData.bathroom4Type ? checkBathroomCompliance(testData.bathroom4Type, testData.bathroom4MeasuredCFM) : true;
    
    const meetsVentilationRequirement = total >= (testData.adjustedRequiredRate || 0);
    
    const overallCompliant = kitchenCompliant && bathroom1Compliant && bathroom2Compliant && 
                            bathroom3Compliant && bathroom4Compliant && meetsVentilationRequirement;
    
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
      title: overallCompliant ? "✓ All requirements met" : "✗ Non-compliant",
      description: overallCompliant ? "System meets all ventilation requirements" : nonComplianceReasons.join(", "),
      variant: overallCompliant ? "default" : "destructive",
    });
  };

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

  const handleSave = () => {
    saveMutation.mutate(testData);
  };

  const handleFieldChange = (field: keyof InsertVentilationTest, value: any) => {
    setTestData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!jobId) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
            <Wind className="h-8 w-8" />
            Ventilation Testing
          </h1>
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
            {existingTest ? "Update" : "Save"} Test
          </Button>
        </div>
      </div>

      {testData.overallCompliant !== undefined && (
        <Alert variant={testData.overallCompliant ? "default" : "destructive"} data-testid="alert-compliance">
          {testData.overallCompliant ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {testData.overallCompliant ? "Compliant" : "Non-Compliant"}
          </AlertTitle>
          <AlertDescription>
            {testData.overallCompliant 
              ? "System meets all ASHRAE 62.2 and Minnesota 2020 Energy Code requirements"
              : testData.nonComplianceNotes || "System does not meet all requirements"}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
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
        <TabsContent value="house" className="space-y-4">
          <Card>
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

          <Card>
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
                <div className="space-y-2 p-4 bg-muted rounded-md">
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
        <TabsContent value="kitchen" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kitchen Exhaust Fan</CardTitle>
              <CardDescription>
                Requirements: ≥100 cfm (intermittent) OR ≥25 cfm (continuous)
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
                      <SelectItem value="intermittent">Intermittent (≥100 cfm)</SelectItem>
                      <SelectItem value="continuous">Continuous (≥25 cfm)</SelectItem>
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
                      >
                        {testData.kitchenMeetsCode ? "✓ Compliant" : "✗ Non-Compliant"}
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
        <TabsContent value="bathrooms" className="space-y-4">
          {[1, 2, 3, 4].map((num) => {
            const typeField = `bathroom${num}Type` as keyof InsertVentilationTest;
            const ratedField = `bathroom${num}RatedCFM` as keyof InsertVentilationTest;
            const measuredField = `bathroom${num}MeasuredCFM` as keyof InsertVentilationTest;
            const meetsCodeField = `bathroom${num}MeetsCode` as keyof InsertVentilationTest;
            
            return (
              <Card key={num}>
                <CardHeader>
                  <CardTitle>Bathroom {num} Exhaust Fan</CardTitle>
                  <CardDescription>
                    Requirements: ≥50 cfm (intermittent) OR ≥20 cfm (continuous)
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
                          <SelectItem value="intermittent">Intermittent (≥50 cfm)</SelectItem>
                          <SelectItem value="continuous">Continuous (≥20 cfm)</SelectItem>
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
                          >
                            {testData[meetsCodeField] ? "✓ Compliant" : "✗ Non-Compliant"}
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
        <TabsContent value="mechanical" className="space-y-4">
          <Card>
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
        <TabsContent value="results" className="space-y-4">
          <Card>
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
                          className="mt-2"
                          data-testid="badge-overall-compliance"
                        >
                          {testData.overallCompliant ? "✓ Compliant" : "✗ Non-Compliant"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Component Compliance</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center justify-between p-2 border rounded">
                          <span>Kitchen Exhaust</span>
                          <Badge variant={testData.kitchenMeetsCode ? "default" : "destructive"}>
                            {testData.kitchenMeetsCode ? "✓" : "✗"}
                          </Badge>
                        </div>
                        {testData.bathroom1Type && testData.bathroom1Type !== "none" && (
                          <div className="flex items-center justify-between p-2 border rounded">
                            <span>Bathroom 1</span>
                            <Badge variant={testData.bathroom1MeetsCode ? "default" : "destructive"}>
                              {testData.bathroom1MeetsCode ? "✓" : "✗"}
                            </Badge>
                          </div>
                        )}
                        {testData.bathroom2Type && testData.bathroom2Type !== "none" && (
                          <div className="flex items-center justify-between p-2 border rounded">
                            <span>Bathroom 2</span>
                            <Badge variant={testData.bathroom2MeetsCode ? "default" : "destructive"}>
                              {testData.bathroom2MeetsCode ? "✓" : "✗"}
                            </Badge>
                          </div>
                        )}
                        {testData.bathroom3Type && testData.bathroom3Type !== "none" && (
                          <div className="flex items-center justify-between p-2 border rounded">
                            <span>Bathroom 3</span>
                            <Badge variant={testData.bathroom3MeetsCode ? "default" : "destructive"}>
                              {testData.bathroom3MeetsCode ? "✓" : "✗"}
                            </Badge>
                          </div>
                        )}
                        {testData.bathroom4Type && testData.bathroom4Type !== "none" && (
                          <div className="flex items-center justify-between p-2 border rounded">
                            <span>Bathroom 4</span>
                            <Badge variant={testData.bathroom4MeetsCode ? "default" : "destructive"}>
                              {testData.bathroom4MeetsCode ? "✓" : "✗"}
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-2 border rounded">
                          <span>Total Ventilation</span>
                          <Badge variant={testData.meetsVentilationRequirement ? "default" : "destructive"}>
                            {testData.meetsVentilationRequirement ? "✓" : "✗"}
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

export default VentilationTestsPage;
