export interface Location {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface TravelTimeEstimate {
  fromAddress: string;
  toAddress: string;
  estimatedMinutes: number;
  distanceMiles: number;
  isLongCommute: boolean; // > 30 minutes
  isWarning: boolean; // > 45 minutes
}

/**
 * Estimate travel time between two addresses using simple distance calculation
 * In production, this would call Google Maps Distance Matrix API
 * For now, use a simple heuristic: ~2 minutes per mile in metro areas
 */
export function estimateTravelTime(from: Location, to: Location): TravelTimeEstimate {
  // Simple heuristic: 
  // - Same city: 15-20 min average
  // - Different cities in same metro: 25-35 min
  // - Cross-metro: 45+ min
  
  const fromCity = from.city?.toLowerCase() || '';
  const toCity = to.city?.toLowerCase() || '';
  
  const isSameCity = fromCity === toCity;
  const isNearby = isTwinCitiesMetro(fromCity) && isTwinCitiesMetro(toCity);
  
  let estimatedMinutes: number;
  let distanceMiles: number;
  
  if (isSameCity) {
    // Same city: 10-20 minutes, 5-10 miles
    estimatedMinutes = 15;
    distanceMiles = 7;
  } else if (isNearby) {
    // Twin Cities metro: 20-35 minutes, 10-20 miles
    estimatedMinutes = 28;
    distanceMiles = 14;
  } else {
    // Outside metro or unknown: 45+ minutes, 25+ miles
    estimatedMinutes = 50;
    distanceMiles = 25;
  }
  
  return {
    fromAddress: `${from.address}, ${from.city}`,
    toAddress: `${to.address}, ${to.city}`,
    estimatedMinutes,
    distanceMiles,
    isLongCommute: estimatedMinutes > 30,
    isWarning: estimatedMinutes > 45,
  };
}

function isTwinCitiesMetro(city: string): boolean {
  const twinCitiesMetro = [
    'minneapolis', 'st paul', 'saint paul', 'bloomington', 'plymouth',
    'st louis park', 'eagan', 'eden prairie', 'burnsville', 'lakeville',
    'minnetonka', 'apple valley', 'edina', 'coon rapids', 'blaine',
    'maple grove', 'brooklyn park', 'woodbury', 'shakopee', 'savage',
  ];
  return twinCitiesMetro.includes(city.toLowerCase());
}

/**
 * Calculate total travel time for a list of jobs in order
 */
export function calculateDayTravelTime(jobs: Array<{ address: string; city?: string; state?: string }>): {
  totalMinutes: number;
  totalMiles: number;
  segments: TravelTimeEstimate[];
  hasLongCommutes: boolean;
  hasWarnings: boolean;
} {
  const segments: TravelTimeEstimate[] = [];
  let totalMinutes = 0;
  let totalMiles = 0;
  
  for (let i = 0; i < jobs.length - 1; i++) {
    const from = jobs[i];
    const to = jobs[i + 1];
    const estimate = estimateTravelTime(from, to);
    segments.push(estimate);
    totalMinutes += estimate.estimatedMinutes;
    totalMiles += estimate.distanceMiles;
  }
  
  return {
    totalMinutes,
    totalMiles,
    segments,
    hasLongCommutes: segments.some(s => s.isLongCommute),
    hasWarnings: segments.some(s => s.isWarning),
  };
}
