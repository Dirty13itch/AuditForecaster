/**
 * Ventilation Testing Business Logic
 * ASHRAE 62.2 Ventilation Rate Calculations and Compliance Checking
 */

export interface VentilationRequirements {
  // ASHRAE 62.2 Required Ventilation
  requiredVentilationRate: number; // Qtotal (cfm)
  requiredContinuousRate: number; // For continuous operation
  adjustedRequiredRate: number; // After infiltration credit
  
  // Kitchen Compliance
  kitchenMeetsCode: boolean;
  kitchenRequirement: {
    intermittent: number; // 100 cfm
    continuous: number; // 25 cfm
  };
  
  // Bathroom Compliance
  bathroomRequirement: {
    intermittent: number; // 50 cfm
    continuous: number; // 20 cfm
  };
  
  // Overall Compliance
  totalVentilationProvided: number;
  meetsVentilationRequirement: boolean;
  overallCompliant: boolean;
  nonComplianceReasons: string[];
}

export interface VentilationTestData {
  floorArea: number;
  bedrooms: number;
  infiltrationCredit?: number;
  
  // Kitchen
  kitchenExhaustType?: 'intermittent' | 'continuous' | 'none';
  kitchenMeasuredCFM?: number;
  
  // Bathrooms
  bathroom1Type?: 'intermittent' | 'continuous' | 'none';
  bathroom1MeasuredCFM?: number;
  bathroom2Type?: 'intermittent' | 'continuous' | 'none';
  bathroom2MeasuredCFM?: number;
  bathroom3Type?: 'intermittent' | 'continuous' | 'none';
  bathroom3MeasuredCFM?: number;
  bathroom4Type?: 'intermittent' | 'continuous' | 'none';
  bathroom4MeasuredCFM?: number;
  
  // Mechanical Ventilation
  mechanicalVentilationType?: 'none' | 'supply_only' | 'exhaust_only' | 'balanced_hrv' | 'balanced_erv' | 'other';
  mechanicalMeasuredSupplyCFM?: number;
  mechanicalMeasuredExhaustCFM?: number;
}

/**
 * Calculate ASHRAE 62.2 Required Ventilation Rate
 * Formula: Qtotal = 0.03 * floorArea + 7.5 * (bedrooms + 1)
 */
export function calculateRequiredVentilationRate(floorArea: number, bedrooms: number): number {
  return 0.03 * floorArea + 7.5 * (bedrooms + 1);
}

/**
 * Calculate required continuous ventilation rate
 * Typically the same as intermittent for whole-house systems
 */
export function calculateRequiredContinuousRate(floorArea: number, bedrooms: number): number {
  return calculateRequiredVentilationRate(floorArea, bedrooms);
}

/**
 * Check if kitchen exhaust meets code requirements
 * Requirements: ≥100 cfm (intermittent) OR ≥25 cfm (continuous)
 */
export function checkKitchenCompliance(
  exhaustType: 'intermittent' | 'continuous' | 'none' | undefined,
  measuredCFM: number | undefined
): boolean {
  if (!exhaustType || exhaustType === 'none' || measuredCFM === undefined) {
    return false;
  }
  
  if (exhaustType === 'intermittent') {
    return measuredCFM >= 100;
  } else if (exhaustType === 'continuous') {
    return measuredCFM >= 25;
  }
  
  return false;
}

/**
 * Check if bathroom exhaust meets code requirements
 * Requirements: ≥50 cfm (intermittent) OR ≥20 cfm (continuous)
 */
export function checkBathroomCompliance(
  exhaustType: 'intermittent' | 'continuous' | 'none' | undefined,
  measuredCFM: number | undefined
): boolean {
  if (!exhaustType || exhaustType === 'none' || measuredCFM === undefined) {
    return false;
  }
  
  if (exhaustType === 'intermittent') {
    return measuredCFM >= 50;
  } else if (exhaustType === 'continuous') {
    return measuredCFM >= 20;
  }
  
  return false;
}

/**
 * Calculate total ventilation provided from all sources
 */
export function calculateTotalVentilationProvided(data: VentilationTestData): number {
  let total = 0;
  
  // Kitchen exhaust
  if (data.kitchenMeasuredCFM && data.kitchenExhaustType !== 'none') {
    total += data.kitchenMeasuredCFM;
  }
  
  // Bathroom exhausts
  if (data.bathroom1MeasuredCFM && data.bathroom1Type !== 'none') {
    total += data.bathroom1MeasuredCFM;
  }
  if (data.bathroom2MeasuredCFM && data.bathroom2Type !== 'none') {
    total += data.bathroom2MeasuredCFM;
  }
  if (data.bathroom3MeasuredCFM && data.bathroom3Type !== 'none') {
    total += data.bathroom3MeasuredCFM;
  }
  if (data.bathroom4MeasuredCFM && data.bathroom4Type !== 'none') {
    total += data.bathroom4MeasuredCFM;
  }
  
  // Mechanical ventilation (use the greater of supply or exhaust)
  if (data.mechanicalVentilationType && data.mechanicalVentilationType !== 'none') {
    const supply = data.mechanicalMeasuredSupplyCFM || 0;
    const exhaust = data.mechanicalMeasuredExhaustCFM || 0;
    total += Math.max(supply, exhaust);
  }
  
  return total;
}

/**
 * Calculate complete ventilation requirements and compliance
 */
export function calculateVentilationRequirements(data: VentilationTestData): VentilationRequirements {
  // Calculate required ventilation rate (ASHRAE 62.2)
  const requiredVentilationRate = calculateRequiredVentilationRate(data.floorArea, data.bedrooms);
  const requiredContinuousRate = calculateRequiredContinuousRate(data.floorArea, data.bedrooms);
  
  // Apply infiltration credit if available
  const infiltrationCredit = data.infiltrationCredit || 0;
  const adjustedRequiredRate = Math.max(0, requiredVentilationRate - infiltrationCredit);
  
  // Check kitchen compliance
  const kitchenMeetsCode = checkKitchenCompliance(data.kitchenExhaustType, data.kitchenMeasuredCFM);
  
  // Check bathroom compliance
  const bathroom1MeetsCode = checkBathroomCompliance(data.bathroom1Type, data.bathroom1MeasuredCFM);
  const bathroom2MeetsCode = data.bathroom2Type ? checkBathroomCompliance(data.bathroom2Type, data.bathroom2MeasuredCFM) : true;
  const bathroom3MeetsCode = data.bathroom3Type ? checkBathroomCompliance(data.bathroom3Type, data.bathroom3MeasuredCFM) : true;
  const bathroom4MeetsCode = data.bathroom4Type ? checkBathroomCompliance(data.bathroom4Type, data.bathroom4MeasuredCFM) : true;
  
  // Calculate total ventilation provided
  const totalVentilationProvided = calculateTotalVentilationProvided(data);
  
  // Check if meets overall ventilation requirement
  const meetsVentilationRequirement = totalVentilationProvided >= adjustedRequiredRate;
  
  // Track non-compliance reasons
  const nonComplianceReasons: string[] = [];
  
  if (!kitchenMeetsCode) {
    nonComplianceReasons.push('Kitchen exhaust does not meet code requirements');
  }
  
  if (!bathroom1MeetsCode) {
    nonComplianceReasons.push('Bathroom 1 exhaust does not meet code requirements');
  }
  if (!bathroom2MeetsCode) {
    nonComplianceReasons.push('Bathroom 2 exhaust does not meet code requirements');
  }
  if (!bathroom3MeetsCode) {
    nonComplianceReasons.push('Bathroom 3 exhaust does not meet code requirements');
  }
  if (!bathroom4MeetsCode) {
    nonComplianceReasons.push('Bathroom 4 exhaust does not meet code requirements');
  }
  
  if (!meetsVentilationRequirement) {
    nonComplianceReasons.push(`Total ventilation provided (${totalVentilationProvided.toFixed(1)} cfm) is less than required (${adjustedRequiredRate.toFixed(1)} cfm)`);
  }
  
  // Overall compliance
  const overallCompliant = kitchenMeetsCode && 
                          bathroom1MeetsCode && 
                          bathroom2MeetsCode && 
                          bathroom3MeetsCode && 
                          bathroom4MeetsCode && 
                          meetsVentilationRequirement;
  
  return {
    requiredVentilationRate,
    requiredContinuousRate,
    adjustedRequiredRate,
    kitchenMeetsCode,
    kitchenRequirement: {
      intermittent: 100,
      continuous: 25,
    },
    bathroomRequirement: {
      intermittent: 50,
      continuous: 20,
    },
    totalVentilationProvided,
    meetsVentilationRequirement,
    overallCompliant,
    nonComplianceReasons,
  };
}
