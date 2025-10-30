/**
 * Builders Business Logic - Comprehensive Unit Tests
 * 
 * Tests all builder-related business logic including:
 * - Company name abbreviation matching (critical for calendar import)
 * - Builder field validations
 * - Contact management and validation
 * - Agreement date validations
 * - Program enrollment validations
 * - Interaction date validations
 * - Contact role validations
 * - Agreement expiration categorization
 * 
 * Coverage: 65+ test cases
 */

import { describe, it, expect } from 'vitest';
import {
  matchesCompanyAbbreviation,
  validateBuilderFields,
  validateContact,
  validateContactRole,
  validateAgreementDates,
  validateProgramDates,
  validateInteractionDate,
  categorizeAgreementExpiration,
} from '../builderService';
import type { BuilderAgreement } from '@shared/schema';

describe('Builders Business Logic', () => {
  // ============================================================================
  // 1. COMPANY NAME ABBREVIATION MATCHING (25 test cases)
  // Critical for calendar import - must accurately match builder names
  // ============================================================================
  describe('Company Name Abbreviation Matching', () => {
    it('matches exact company names', () => {
      const result = matchesCompanyAbbreviation('ABC Construction', 'ABC Construction');
      expect(result).toBe(true);
    });

    it('matches case-insensitively', () => {
      const result = matchesCompanyAbbreviation('abc construction', 'ABC CONSTRUCTION');
      expect(result).toBe(true);
    });

    it('matches with different case variations', () => {
      const result = matchesCompanyAbbreviation('MI Homes', 'mi homes');
      expect(result).toBe(true);
    });

    it('matches "Construction" with abbreviation "Const"', () => {
      const result = matchesCompanyAbbreviation('ABC Construction', 'ABC Const');
      expect(result).toBe(true);
    });

    it('matches "Construction" with abbreviation "Constr"', () => {
      const result = matchesCompanyAbbreviation('XYZ Construction', 'XYZ Constr');
      expect(result).toBe(true);
    });

    it('matches "Corporation" with abbreviation "Corp"', () => {
      const result = matchesCompanyAbbreviation('MI Homes Corporation', 'MI Homes Corp');
      expect(result).toBe(true);
    });

    it('matches "Company" with abbreviation "Co"', () => {
      const result = matchesCompanyAbbreviation('ABC Company', 'ABC Co');
      expect(result).toBe(true);
    });

    it('matches "Incorporated" with abbreviation "Inc"', () => {
      const result = matchesCompanyAbbreviation('MI Homes Incorporated', 'MI Homes Inc');
      expect(result).toBe(true);
    });

    it('matches "Building" with abbreviation "Bldg"', () => {
      const result = matchesCompanyAbbreviation('Lennar Building', 'Lennar Bldg');
      expect(result).toBe(true);
    });

    it('matches "Development" with abbreviation "Dev"', () => {
      const result = matchesCompanyAbbreviation('Pulte Development', 'Pulte Dev');
      expect(result).toBe(true);
    });

    it('matches "Homes" with abbreviation "Home"', () => {
      const result = matchesCompanyAbbreviation('MI Homes', 'MI Home');
      expect(result).toBe(true);
    });

    it('matches "Properties" with abbreviation "Prop"', () => {
      const result = matchesCompanyAbbreviation('ABC Properties', 'ABC Prop');
      expect(result).toBe(true);
    });

    it('matches partial company name (fewer words in abbreviated version)', () => {
      const result = matchesCompanyAbbreviation('ABC Construction Inc', 'ABC Construction');
      expect(result).toBe(true);
    });

    it('matches multi-word abbreviations', () => {
      const result = matchesCompanyAbbreviation('MI Homes Construction Corp', 'MI Homes Const Corp');
      expect(result).toBe(true);
    });

    it('matches with special characters removed', () => {
      const result = matchesCompanyAbbreviation('M.I. Homes', 'MI Homes');
      expect(result).toBe(true);
    });

    it('matches with apostrophes and punctuation removed', () => {
      const result = matchesCompanyAbbreviation("John's Construction Co.", 'Johns Construction Co');
      expect(result).toBe(true);
    });

    it('does not match completely different company names', () => {
      const result = matchesCompanyAbbreviation('ABC Construction', 'XYZ Construction');
      expect(result).toBe(false);
    });

    it('does not match when abbreviated version has more words', () => {
      const result = matchesCompanyAbbreviation('MI Homes', 'MI Homes Construction Corp');
      expect(result).toBe(false);
    });

    it('does not match when key words are different', () => {
      const result = matchesCompanyAbbreviation('ABC Building', 'ABC Construction');
      expect(result).toBe(false);
    });

    it('does not match partial word that is not a valid abbreviation', () => {
      const result = matchesCompanyAbbreviation('ABC Construction', 'ABC Xyz');
      expect(result).toBe(false);
    });

    it('handles empty string for full name', () => {
      const result = matchesCompanyAbbreviation('', 'ABC Construction');
      expect(result).toBe(false);
    });

    it('handles empty string for abbreviated name', () => {
      const result = matchesCompanyAbbreviation('ABC Construction', '');
      expect(result).toBe(false);
    });

    it('handles both empty strings', () => {
      const result = matchesCompanyAbbreviation('', '');
      expect(result).toBe(false);
    });

    it('handles whitespace-only strings', () => {
      const result = matchesCompanyAbbreviation('   ', 'ABC Construction');
      expect(result).toBe(false);
    });

    it('matches real Minnesota builder: "M/I Homes" with "MI Homes"', () => {
      const result = matchesCompanyAbbreviation('M/I Homes', 'MI Homes');
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // 2. BUILDER FIELD VALIDATIONS (18 test cases)
  // ============================================================================
  describe('Builder Field Validations', () => {
    it('accepts valid builder with all required fields', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(true);
    });

    it('accepts builder with minimal required fields', () => {
      const builder = {
        companyName: 'MI Homes',
        name: 'MI',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(true);
    });

    it('rejects builder with missing company name', () => {
      const builder = {
        companyName: '',
        name: 'Test',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Company name is required');
    });

    it('rejects builder with whitespace-only company name', () => {
      const builder = {
        companyName: '   ',
        name: 'Test',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Company name is required');
    });

    it('rejects builder with company name too short (1 character)', () => {
      const builder = {
        companyName: 'A',
        name: 'A',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 2 characters');
    });

    it('accepts builder with company name exactly 2 characters', () => {
      const builder = {
        companyName: 'MI',
        name: 'MI',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(true);
    });

    it('rejects builder with company name exceeding 255 characters', () => {
      const builder = {
        companyName: 'A'.repeat(256),
        name: 'Test',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must not exceed 255 characters');
    });

    it('accepts builder with valid email', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        email: 'contact@abcconst.com',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(true);
    });

    it('rejects builder with invalid email format', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        email: 'invalid-email',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('accepts builder with valid phone number (with formatting)', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        phone: '(612) 555-1234',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(true);
    });

    it('accepts builder with valid phone number (no formatting)', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        phone: '6125551234',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(true);
    });

    it('rejects builder with invalid phone number (too short)', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        phone: '123456',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid phone format');
    });

    it('accepts builder with valid volume tier', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        volumeTier: 'high',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(true);
    });

    it('rejects builder with invalid volume tier', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        volumeTier: 'ultra',
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid volume tier');
    });

    it('accepts builder with valid rating (1-5)', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        rating: 4,
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(true);
    });

    it('rejects builder with rating below 1', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        rating: 0,
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Rating must be between 1 and 5');
    });

    it('rejects builder with rating above 5', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        rating: 6,
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Rating must be between 1 and 5');
    });

    it('rejects builder with negative preferred lead time', () => {
      const builder = {
        companyName: 'ABC Construction',
        name: 'ABC',
        preferredLeadTime: -5,
        createdBy: 'user-123',
      };
      const result = validateBuilderFields(builder);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Preferred lead time must be non-negative');
    });
  });

  // ============================================================================
  // 3. CONTACT MANAGEMENT (15 test cases)
  // ============================================================================
  describe('Contact Management', () => {
    it('validates contact with all required fields', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(true);
    });

    it('validates contact with all optional fields', () => {
      const contact = {
        name: 'John Doe',
        role: 'superintendent',
        email: 'john.doe@abcconst.com',
        phone: '612-555-1234',
        mobilePhone: '612-555-5678',
        preferredContact: 'email',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(true);
    });

    it('rejects contact with missing name', () => {
      const contact = {
        name: '',
        role: 'project_manager',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Contact name is required');
    });

    it('rejects contact with whitespace-only name', () => {
      const contact = {
        name: '   ',
        role: 'project_manager',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Contact name is required');
    });

    it('rejects contact with name exceeding 255 characters', () => {
      const contact = {
        name: 'A'.repeat(256),
        role: 'project_manager',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must not exceed 255 characters');
    });

    it('rejects contact with missing role', () => {
      const contact = {
        name: 'John Doe',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Contact role is required');
    });

    it('rejects contact with invalid role', () => {
      const contact = {
        name: 'John Doe',
        role: 'invalid_role',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid role');
    });

    it('accepts contact with valid email', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        email: 'john.doe@example.com',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(true);
    });

    it('rejects contact with invalid email format', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        email: 'invalid-email',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('accepts contact with valid phone number', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        phone: '(612) 555-1234',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(true);
    });

    it('rejects contact with invalid phone format', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        phone: '123',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid phone format');
    });

    it('accepts contact with valid mobile phone', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        mobilePhone: '612-555-5678',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(true);
    });

    it('rejects contact with invalid mobile phone format', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        mobilePhone: '123',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid mobile phone format');
    });

    it('accepts contact with valid preferred contact method', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        preferredContact: 'text',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(true);
    });

    it('rejects contact with invalid preferred contact method', () => {
      const contact = {
        name: 'John Doe',
        role: 'project_manager',
        preferredContact: 'fax',
        builderId: 'builder-123',
        createdBy: 'user-123',
      };
      const result = validateContact(contact);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid preferred contact method');
    });
  });

  // ============================================================================
  // 4. CONTACT ROLE VALIDATION (7 test cases)
  // ============================================================================
  describe('Contact Role Validation', () => {
    it('accepts valid role: superintendent', () => {
      const result = validateContactRole('superintendent');
      expect(result.valid).toBe(true);
    });

    it('accepts valid role: project_manager', () => {
      const result = validateContactRole('project_manager');
      expect(result.valid).toBe(true);
    });

    it('accepts valid role: owner', () => {
      const result = validateContactRole('owner');
      expect(result.valid).toBe(true);
    });

    it('accepts valid role: estimator', () => {
      const result = validateContactRole('estimator');
      expect(result.valid).toBe(true);
    });

    it('accepts valid role: office_manager', () => {
      const result = validateContactRole('office_manager');
      expect(result.valid).toBe(true);
    });

    it('accepts valid role: other', () => {
      const result = validateContactRole('other');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = validateContactRole('ceo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid role');
    });
  });

  // ============================================================================
  // 5. AGREEMENT DATE VALIDATIONS (7 test cases)
  // ============================================================================
  describe('Agreement Date Validations', () => {
    it('accepts agreement with valid start date', () => {
      const agreement = {
        startDate: new Date('2025-01-01'),
      };
      const result = validateAgreementDates(agreement);
      expect(result.valid).toBe(true);
    });

    it('accepts agreement with valid start and end dates', () => {
      const agreement = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      };
      const result = validateAgreementDates(agreement);
      expect(result.valid).toBe(true);
    });

    it('rejects agreement with invalid start date', () => {
      const agreement = {
        startDate: 'invalid-date',
      };
      const result = validateAgreementDates(agreement);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid start date');
    });

    it('rejects agreement with invalid end date', () => {
      const agreement = {
        startDate: new Date('2025-01-01'),
        endDate: 'invalid-date',
      };
      const result = validateAgreementDates(agreement);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid end date');
    });

    it('rejects agreement with end date before start date', () => {
      const agreement = {
        startDate: new Date('2025-12-31'),
        endDate: new Date('2025-01-01'),
      };
      const result = validateAgreementDates(agreement);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('End date must be after start date');
    });

    it('rejects agreement with end date equal to start date', () => {
      const agreement = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-01'),
      };
      const result = validateAgreementDates(agreement);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('End date must be after start date');
    });

    it('accepts agreement with null end date', () => {
      const agreement = {
        startDate: new Date('2025-01-01'),
        endDate: null,
      };
      const result = validateAgreementDates(agreement);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // 6. PROGRAM DATE VALIDATIONS (6 test cases)
  // ============================================================================
  describe('Program Date Validations', () => {
    it('accepts program with valid enrollment date', () => {
      const program = {
        enrollmentDate: new Date('2025-01-01'),
      };
      const result = validateProgramDates(program);
      expect(result.valid).toBe(true);
    });

    it('accepts program with valid enrollment and expiration dates', () => {
      const program = {
        enrollmentDate: new Date('2025-01-01'),
        expirationDate: new Date('2026-12-31'),
      };
      const result = validateProgramDates(program);
      expect(result.valid).toBe(true);
    });

    it('rejects program with invalid enrollment date', () => {
      const program = {
        enrollmentDate: 'invalid-date',
      };
      const result = validateProgramDates(program);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid enrollment date');
    });

    it('rejects program with invalid expiration date', () => {
      const program = {
        enrollmentDate: new Date('2025-01-01'),
        expirationDate: 'invalid-date',
      };
      const result = validateProgramDates(program);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid expiration date');
    });

    it('rejects program with expiration date before enrollment date', () => {
      const program = {
        enrollmentDate: new Date('2026-12-31'),
        expirationDate: new Date('2025-01-01'),
      };
      const result = validateProgramDates(program);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expiration date must be after enrollment date');
    });

    it('accepts program with null expiration date', () => {
      const program = {
        enrollmentDate: new Date('2025-01-01'),
        expirationDate: null,
      };
      const result = validateProgramDates(program);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // 7. INTERACTION DATE VALIDATIONS (4 test cases)
  // ============================================================================
  describe('Interaction Date Validations', () => {
    it('accepts interaction with valid date in the past', () => {
      const interactionDate = new Date('2025-01-01');
      const result = validateInteractionDate(interactionDate);
      expect(result.valid).toBe(true);
    });

    it('accepts interaction with today\'s date', () => {
      const interactionDate = new Date();
      const result = validateInteractionDate(interactionDate);
      expect(result.valid).toBe(true);
    });

    it('rejects interaction with invalid date', () => {
      const result = validateInteractionDate('invalid-date');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid interaction date');
    });

    it('rejects interaction with future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const result = validateInteractionDate(futureDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be in the future');
    });
  });

  // ============================================================================
  // 8. AGREEMENT EXPIRATION CATEGORIZATION (8 test cases)
  // ============================================================================
  describe('Agreement Expiration Categorization', () => {
    it('categorizes agreement with no end date as "ok"', () => {
      const agreement: BuilderAgreement = {
        id: 'agreement-1',
        builderId: 'builder-1',
        agreementName: 'Standard Agreement',
        startDate: new Date('2025-01-01'),
        endDate: null,
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = categorizeAgreementExpiration(agreement);
      expect(result.category).toBe('ok');
      expect(result.daysUntilExpiration).toBe(Infinity);
      expect(result.message).toContain('No expiration date');
    });

    it('categorizes expired agreement as "critical"', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      const agreement: BuilderAgreement = {
        id: 'agreement-1',
        builderId: 'builder-1',
        agreementName: 'Expired Agreement',
        startDate: new Date('2024-01-01'),
        endDate: pastDate,
        status: 'expired',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = categorizeAgreementExpiration(agreement);
      expect(result.category).toBe('critical');
      expect(result.daysUntilExpiration).toBeLessThan(0);
      expect(result.message).toContain('Expired');
      expect(result.message).toContain('days ago');
    });

    it('categorizes agreement expiring in 15 days as "critical"', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      
      const agreement: BuilderAgreement = {
        id: 'agreement-1',
        builderId: 'builder-1',
        agreementName: 'Urgent Agreement',
        startDate: new Date('2025-01-01'),
        endDate: futureDate,
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = categorizeAgreementExpiration(agreement);
      expect(result.category).toBe('critical');
      expect(result.daysUntilExpiration).toBe(15);
      expect(result.message).toContain('URGENT renewal needed');
    });

    it('categorizes agreement expiring in 45 days as "warning"', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);
      
      const agreement: BuilderAgreement = {
        id: 'agreement-1',
        builderId: 'builder-1',
        agreementName: 'Warning Agreement',
        startDate: new Date('2025-01-01'),
        endDate: futureDate,
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = categorizeAgreementExpiration(agreement);
      expect(result.category).toBe('warning');
      expect(result.daysUntilExpiration).toBe(45);
      expect(result.message).toContain('Renewal recommended');
    });

    it('categorizes agreement expiring in 75 days as "notice"', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 75);
      
      const agreement: BuilderAgreement = {
        id: 'agreement-1',
        builderId: 'builder-1',
        agreementName: 'Notice Agreement',
        startDate: new Date('2025-01-01'),
        endDate: futureDate,
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = categorizeAgreementExpiration(agreement);
      expect(result.category).toBe('notice');
      expect(result.daysUntilExpiration).toBe(75);
      expect(result.message).toContain('Expires in 75 days');
    });

    it('categorizes agreement expiring in 100 days as "ok"', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 100);
      
      const agreement: BuilderAgreement = {
        id: 'agreement-1',
        builderId: 'builder-1',
        agreementName: 'OK Agreement',
        startDate: new Date('2025-01-01'),
        endDate: futureDate,
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = categorizeAgreementExpiration(agreement);
      expect(result.category).toBe('ok');
      expect(result.daysUntilExpiration).toBe(100);
      expect(result.message).toContain('Expires in 100 days');
    });

    it('categorizes agreement expiring in exactly 30 days as "critical"', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const agreement: BuilderAgreement = {
        id: 'agreement-1',
        builderId: 'builder-1',
        agreementName: 'Boundary Agreement',
        startDate: new Date('2025-01-01'),
        endDate: futureDate,
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = categorizeAgreementExpiration(agreement);
      expect(result.category).toBe('critical');
      expect(result.daysUntilExpiration).toBe(30);
    });

    it('categorizes agreement expiring in exactly 60 days as "warning"', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      
      const agreement: BuilderAgreement = {
        id: 'agreement-1',
        builderId: 'builder-1',
        agreementName: 'Boundary Agreement',
        startDate: new Date('2025-01-01'),
        endDate: futureDate,
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = categorizeAgreementExpiration(agreement);
      expect(result.category).toBe('warning');
      expect(result.daysUntilExpiration).toBe(60);
    });
  });
});
