import type { IStorage } from './storage';
import type { BuilderAgreement, BuilderContact, InsertBuilder } from '@shared/schema';

/**
 * Company name abbreviation mapping for calendar event matching
 */
const abbreviationMap: Record<string, string[]> = {
  'construction': ['const', 'constr', 'constru'],
  'corporation': ['corp'],
  'company': ['co'],
  'incorporated': ['inc'],
  'limited': ['ltd'],
  'building': ['bldg', 'blding'],
  'development': ['dev', 'devel'],
  'homes': ['home'],
  'properties': ['prop', 'props'],
};

/**
 * Match company name with abbreviations for calendar parsing
 * Handles exact matches, abbreviations, and case-insensitive matching
 */
export function matchesCompanyAbbreviation(fullName: string, abbreviatedName: string): boolean {
  if (!fullName || !abbreviatedName) return false;
  
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const normalizedFull = normalize(fullName);
  const normalizedAbbr = normalize(abbreviatedName);
  
  // Exact match
  if (normalizedFull === normalizedAbbr) return true;
  
  // Split into words
  const fullWords = normalizedFull.split(/\s+/);
  const abbrWords = normalizedAbbr.split(/\s+/);
  
  // If abbreviated version has more words, it can't match
  if (abbrWords.length > fullWords.length) return false;
  
  // Check if all abbreviated words match or are valid abbreviations
  let fullIndex = 0;
  for (const abbrWord of abbrWords) {
    let matched = false;
    
    // Try to match remaining words in full name
    while (fullIndex < fullWords.length) {
      const fullWord = fullWords[fullIndex];
      
      // Exact match
      if (fullWord === abbrWord) {
        matched = true;
        fullIndex++;
        break;
      }
      
      // Check if abbrWord is a valid abbreviation of fullWord
      if (fullWord.startsWith(abbrWord)) {
        matched = true;
        fullIndex++;
        break;
      }
      
      // Check abbreviation map
      const abbrs = abbreviationMap[fullWord];
      if (abbrs && abbrs.includes(abbrWord)) {
        matched = true;
        fullIndex++;
        break;
      }
      
      fullIndex++;
    }
    
    if (!matched) return false;
  }
  
  return true;
}

/**
 * Validate builder fields
 */
export function validateBuilderFields(builder: Partial<InsertBuilder>): { 
  valid: boolean; 
  error?: string;
  errors?: string[];
} {
  const errors: string[] = [];
  
  // Required field: companyName
  if (!builder.companyName || builder.companyName.trim().length === 0) {
    errors.push('Company name is required');
  } else {
    // Company name length limits
    if (builder.companyName.length < 2) {
      errors.push('Company name must be at least 2 characters');
    }
    if (builder.companyName.length > 255) {
      errors.push('Company name must not exceed 255 characters');
    }
  }
  
  // Email validation (if provided)
  if (builder.email && builder.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(builder.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Phone validation (if provided)
  if (builder.phone && builder.phone.trim().length > 0) {
    // Remove common formatting characters
    const cleanPhone = builder.phone.replace(/[\s\-\(\)\.]/g, '');
    // Check if it's a valid phone number (10-15 digits)
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      errors.push('Invalid phone format (must be 10-15 digits)');
    }
  }
  
  // Volume tier validation (if provided)
  if (builder.volumeTier) {
    const validTiers = ['low', 'medium', 'high', 'premium'];
    if (!validTiers.includes(builder.volumeTier)) {
      errors.push(`Invalid volume tier. Must be one of: ${validTiers.join(', ')}`);
    }
  }
  
  // Rating validation (if provided)
  if (builder.rating !== undefined && builder.rating !== null) {
    if (builder.rating < 1 || builder.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }
  }
  
  // Preferred lead time validation (if provided)
  if (builder.preferredLeadTime !== undefined && builder.preferredLeadTime !== null) {
    if (builder.preferredLeadTime < 0) {
      errors.push('Preferred lead time must be non-negative');
    }
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      error: errors[0],
      errors
    };
  }
  
  return { valid: true };
}

/**
 * Validate contact information
 */
export function validateContact(contact: Partial<BuilderContact>): { 
  valid: boolean; 
  error?: string;
  errors?: string[];
} {
  const errors: string[] = [];
  
  // Required field: name
  if (!contact.name || contact.name.trim().length === 0) {
    errors.push('Contact name is required');
  } else if (contact.name.length > 255) {
    errors.push('Contact name must not exceed 255 characters');
  }
  
  // Required field: role
  if (!contact.role) {
    errors.push('Contact role is required');
  } else {
    const roleValidation = validateContactRole(contact.role);
    if (!roleValidation.valid) {
      errors.push(roleValidation.error!);
    }
  }
  
  // Email validation (if provided)
  if (contact.email && contact.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Phone validation (if provided)
  if (contact.phone && contact.phone.trim().length > 0) {
    const cleanPhone = contact.phone.replace(/[\s\-\(\)\.]/g, '');
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      errors.push('Invalid phone format (must be 10-15 digits)');
    }
  }
  
  // Mobile phone validation (if provided)
  if (contact.mobilePhone && contact.mobilePhone.trim().length > 0) {
    const cleanPhone = contact.mobilePhone.replace(/[\s\-\(\)\.]/g, '');
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      errors.push('Invalid mobile phone format (must be 10-15 digits)');
    }
  }
  
  // Preferred contact validation (if provided)
  if (contact.preferredContact) {
    const validMethods = ['phone', 'email', 'text'];
    if (!validMethods.includes(contact.preferredContact)) {
      errors.push(`Invalid preferred contact method. Must be one of: ${validMethods.join(', ')}`);
    }
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      error: errors[0],
      errors
    };
  }
  
  return { valid: true };
}

/**
 * Validate agreement dates
 */
export function validateAgreementDates(agreement: {
  startDate: Date | string;
  endDate?: Date | string | null;
}): { valid: boolean; error?: string } {
  if (!agreement.startDate) {
    return { valid: false, error: 'Start date is required' };
  }
  
  const startDate = new Date(agreement.startDate);
  
  if (isNaN(startDate.getTime())) {
    return { valid: false, error: 'Invalid start date' };
  }
  
  if (agreement.endDate) {
    const endDate = new Date(agreement.endDate);
    
    if (isNaN(endDate.getTime())) {
      return { valid: false, error: 'Invalid end date' };
    }
    
    if (endDate <= startDate) {
      return { valid: false, error: 'End date must be after start date' };
    }
  }
  
  return { valid: true };
}

/**
 * Validate program enrollment dates
 */
export function validateProgramDates(program: {
  enrollmentDate: Date | string;
  expirationDate?: Date | string | null;
}): { valid: boolean; error?: string } {
  if (!program.enrollmentDate) {
    return { valid: false, error: 'Enrollment date is required' };
  }
  
  const enrollmentDate = new Date(program.enrollmentDate);
  
  if (isNaN(enrollmentDate.getTime())) {
    return { valid: false, error: 'Invalid enrollment date' };
  }
  
  if (program.expirationDate) {
    const expirationDate = new Date(program.expirationDate);
    
    if (isNaN(expirationDate.getTime())) {
      return { valid: false, error: 'Invalid expiration date' };
    }
    
    if (expirationDate <= enrollmentDate) {
      return { valid: false, error: 'Expiration date must be after enrollment date' };
    }
  }
  
  return { valid: true };
}

/**
 * Validate interaction date
 */
export function validateInteractionDate(interactionDate: Date | string): { valid: boolean; error?: string } {
  if (!interactionDate) {
    return { valid: false, error: 'Interaction date is required' };
  }
  
  const date = new Date(interactionDate);
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid interaction date' };
  }
  
  // Interaction date should not be in the future
  const now = new Date();
  if (date > now) {
    return { valid: false, error: 'Interaction date cannot be in the future' };
  }
  
  return { valid: true };
}

/**
 * Validate geographic hierarchy - ensure lot belongs to development
 */
export async function validateLotBelongsToDevelopment(
  storage: IStorage,
  lotId: string,
  developmentId: string
): Promise<{ valid: boolean; error?: string }> {
  const lot = await storage.getLot(lotId);
  if (!lot) return { valid: false, error: 'Lot not found' };
  if (lot.developmentId !== developmentId) {
    return { valid: false, error: 'Lot does not belong to this development' };
  }
  return { valid: true };
}

/**
 * Validate job belongs to lot
 */
export async function validateJobBelongsToLot(
  storage: IStorage,
  jobId: string,
  lotId: string
): Promise<{ valid: boolean; error?: string }> {
  const job = await storage.getJob(jobId);
  if (!job) return { valid: false, error: 'Job not found' };
  if (job.lotId !== lotId) {
    return { valid: false, error: 'Job does not belong to this lot' };
  }
  return { valid: true };
}

/**
 * Get agreement expiration status with categorized alerts
 */
export function categorizeAgreementExpiration(agreement: BuilderAgreement): {
  category: 'critical' | 'warning' | 'notice' | 'ok';
  daysUntilExpiration: number;
  message: string;
} {
  if (!agreement.endDate) {
    return {
      category: 'ok',
      daysUntilExpiration: Infinity,
      message: 'No expiration date set'
    };
  }

  const now = new Date();
  const endDate = new Date(agreement.endDate);
  const daysUntilExpiration = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiration < 0) {
    return {
      category: 'critical',
      daysUntilExpiration,
      message: `Expired ${Math.abs(daysUntilExpiration)} days ago`
    };
  } else if (daysUntilExpiration <= 30) {
    return {
      category: 'critical',
      daysUntilExpiration,
      message: `Expires in ${daysUntilExpiration} days - URGENT renewal needed`
    };
  } else if (daysUntilExpiration <= 60) {
    return {
      category: 'warning',
      daysUntilExpiration,
      message: `Expires in ${daysUntilExpiration} days - Renewal recommended`
    };
  } else if (daysUntilExpiration <= 90) {
    return {
      category: 'notice',
      daysUntilExpiration,
      message: `Expires in ${daysUntilExpiration} days`
    };
  } else {
    return {
      category: 'ok',
      daysUntilExpiration,
      message: `Expires in ${daysUntilExpiration} days`
    };
  }
}

/**
 * Validate contact role
 */
export function validateContactRole(role: string): { valid: boolean; error?: string } {
  const validRoles = ['superintendent', 'project_manager', 'owner', 'estimator', 'office_manager', 'other'];
  if (!validRoles.includes(role)) {
    return {
      valid: false,
      error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
    };
  }
  return { valid: true };
}
