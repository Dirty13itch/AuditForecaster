import { describe, it, expect, beforeEach } from 'vitest';
import { parseCalendarEvent } from './calendarEventParser';
import type { IStorage } from './storage';
import type { BuilderAbbreviation, Builder } from '../shared/schema';

class MockStorage implements IStorage {
  private abbreviations: BuilderAbbreviation[] = [];
  private builders: Map<string, Builder> = new Map();

  setBuilderAbbreviations(abbrs: BuilderAbbreviation[]) {
    this.abbreviations = abbrs;
  }

  setBuilders(builders: Builder[]) {
    builders.forEach(b => this.builders.set(b.id, b));
  }

  async getBuilderAbbreviations(): Promise<BuilderAbbreviation[]> {
    return this.abbreviations;
  }

  async getBuilderById(id: string): Promise<Builder | undefined> {
    return this.builders.get(id);
  }

  async getUser(): Promise<any> { return undefined; }
  async getUserByUsername(): Promise<any> { return undefined; }
  async upsertUser(): Promise<any> { return {}; }
  async createBuilder(): Promise<any> { return {}; }
  async getBuilder(): Promise<any> { return undefined; }
  async getAllBuilders(): Promise<any[]> { return []; }
  async getBuildersPaginated(): Promise<any> { return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }; }
  async updateBuilder(): Promise<any> { return undefined; }
  async deleteBuilder(): Promise<boolean> { return false; }
  async createBuilderContact(): Promise<any> { return {}; }
  async getBuilderContact(): Promise<any> { return undefined; }
  async getBuilderContacts(): Promise<any[]> { return []; }
  async updateBuilderContact(): Promise<any> { return undefined; }
  async deleteBuilderContact(): Promise<boolean> { return false; }
  async setPrimaryContact(): Promise<void> { }
  async createBuilderAgreement(): Promise<any> { return {}; }
  async getBuilderAgreement(): Promise<any> { return undefined; }
  async getBuilderAgreements(): Promise<any[]> { return []; }
  async getActiveAgreement(): Promise<any> { return undefined; }
  async updateBuilderAgreement(): Promise<any> { return undefined; }
  async deleteBuilderAgreement(): Promise<boolean> { return false; }
  async createBuilderProgram(): Promise<any> { return {}; }
  async getBuilderProgram(): Promise<any> { return undefined; }
  async getBuilderPrograms(): Promise<any[]> { return []; }
  async getActivePrograms(): Promise<any[]> { return []; }
  async updateBuilderProgram(): Promise<any> { return undefined; }
  async deleteBuilderProgram(): Promise<boolean> { return false; }
  async createBuilderInteraction(): Promise<any> { return {}; }
  async getBuilderInteraction(): Promise<any> { return undefined; }
  async getBuilderInteractions(): Promise<any[]> { return []; }
  async getInteractionsByContact(): Promise<any[]> { return []; }
  async updateBuilderInteraction(): Promise<any> { return undefined; }
  async deleteBuilderInteraction(): Promise<boolean> { return false; }
  async createDevelopment(): Promise<any> { return {}; }
  async getDevelopment(): Promise<any> { return undefined; }
  async getDevelopments(): Promise<any[]> { return []; }
  async getDevelopmentsByStatus(): Promise<any[]> { return []; }
  async updateDevelopment(): Promise<any> { return undefined; }
  async deleteDevelopment(): Promise<boolean> { return false; }
  async createLot(): Promise<any> { return {}; }
  async getLot(): Promise<any> { return undefined; }
  async getLots(): Promise<any[]> { return []; }
  async getLotsByPlan(): Promise<any[]> { return []; }
  async updateLot(): Promise<any> { return undefined; }
  async deleteLot(): Promise<boolean> { return false; }
  async createPlan(): Promise<any> { return {}; }
  async getPlan(): Promise<any> { return undefined; }
  async getPlansByBuilder(): Promise<any[]> { return []; }
  async getAllPlans(): Promise<any[]> { return []; }
  async updatePlan(): Promise<any> { return undefined; }
  async deletePlan(): Promise<boolean> { return false; }
  async createJob(): Promise<any> { return {}; }
  async getJob(): Promise<any> { return undefined; }
  async getJobBySourceEventId(): Promise<any> { return undefined; }
  async getAllJobs(): Promise<any[]> { return []; }
  async getJobsByUser(): Promise<any[]> { return []; }
  async getJobsPaginated(): Promise<any> { return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }; }
  async getJobsCursorPaginated(): Promise<any> { return { items: [], nextCursor: null, hasMore: false }; }
  async getJobsCursorPaginatedByUser(): Promise<any> { return { items: [], nextCursor: null, hasMore: false }; }
  async updateJob(): Promise<any> { return undefined; }
  async deleteJob(): Promise<boolean> { return false; }
  async bulkDeleteJobs(): Promise<number> { return 0; }
  async createScheduleEvent(): Promise<any> { return {}; }
  async getScheduleEvent(): Promise<any> { return undefined; }
  async getScheduleEventsByJob(): Promise<any[]> { return []; }
  async getScheduleEventsByDateRange(): Promise<any[]> { return []; }
  async updateScheduleEvent(): Promise<any> { return undefined; }
  async deleteScheduleEvent(): Promise<boolean> { return false; }
  async createExpense(): Promise<any> { return {}; }
  async getExpense(): Promise<any> { return undefined; }
  async getAllExpenses(): Promise<any[]> { return []; }
  async getExpensesByJob(): Promise<any[]> { return []; }
  async getExpensesPaginated(): Promise<any> { return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }; }
  async updateExpense(): Promise<any> { return undefined; }
  async deleteExpense(): Promise<boolean> { return false; }
  async createMileageLog(): Promise<any> { return {}; }
  async getMileageLog(): Promise<any> { return undefined; }
  async getAllMileageLogs(): Promise<any[]> { return []; }
  async getMileageLogsByDateRange(): Promise<any[]> { return []; }
  async getMileageLogsPaginated(): Promise<any> { return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }; }
  async updateMileageLog(): Promise<any> { return undefined; }
  async deleteMileageLog(): Promise<boolean> { return false; }
  async createReportTemplate(): Promise<any> { return {}; }
  async getReportTemplate(): Promise<any> { return undefined; }
  async getAllReportTemplates(): Promise<any[]> { return []; }
  async updateReportTemplate(): Promise<any> { return undefined; }
  async deleteReportTemplate(): Promise<boolean> { return false; }
  async createReportInstance(): Promise<any> { return {}; }
  async getReportInstance(): Promise<any> { return undefined; }
  async getReportInstancesByJob(): Promise<any[]> { return []; }
  async updateReportInstance(): Promise<any> { return undefined; }
  async createPhoto(): Promise<any> { return {}; }
  async getPhoto(): Promise<any> { return undefined; }
  async getPhotosByJob(): Promise<any[]> { return []; }
  async getPhotosByJobCursorPaginated(): Promise<any> { return { items: [], nextCursor: null, hasMore: false }; }
  async getPhotosByChecklistItem(): Promise<any[]> { return []; }
  async getPhotosByJobPaginated(): Promise<any> { return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }; }
  async updatePhoto(): Promise<any> { return undefined; }
  async deletePhoto(): Promise<boolean> { return false; }
  async bulkDeletePhotos(): Promise<number> { return 0; }
  async createForecast(): Promise<any> { return {}; }
  async getForecast(): Promise<any> { return undefined; }
  async getForecastsByJob(): Promise<any[]> { return []; }
  async getAllForecasts(): Promise<any[]> { return []; }
  async updateForecast(): Promise<any> { return undefined; }
  async deleteForecast(): Promise<boolean> { return false; }
  async createChecklistItem(): Promise<any> { return {}; }
  async getChecklistItem(): Promise<any> { return undefined; }
  async getChecklistItemsByJob(): Promise<any[]> { return []; }
  async updateChecklistItem(): Promise<any> { return undefined; }
  async deleteChecklistItem(): Promise<boolean> { return false; }
  async createComplianceRule(): Promise<any> { return {}; }
  async getComplianceRules(): Promise<any[]> { return []; }
  async updateComplianceRule(): Promise<any> { return undefined; }
  async deleteComplianceRule(): Promise<boolean> { return false; }
  async getComplianceHistory(): Promise<any[]> { return []; }
  async createComplianceHistoryEntry(): Promise<any> { return {}; }
  async recalculateReportScore(): Promise<void> { }
  async createCalendarPreference(): Promise<any> { return {}; }
  async getCalendarPreference(): Promise<any> { return undefined; }
  async updateCalendarPreference(): Promise<any> { return undefined; }
  async createGoogleEvent(): Promise<any> { return {}; }
  async getGoogleEvent(): Promise<any> { return undefined; }
  async getGoogleEventsByCalendar(): Promise<any[]> { return []; }
  async getGoogleEventsByDateRange(): Promise<any[]> { return []; }
  async updateGoogleEvent(): Promise<any> { return undefined; }
  async deleteGoogleEvent(): Promise<boolean> { return false; }
  async getUnconvertedGoogleEvents(): Promise<any[]> { return []; }
  async createUnmatchedCalendarEvent(): Promise<any> { return {}; }
  async getUnmatchedCalendarEvent(): Promise<any> { return undefined; }
  async getUnmatchedCalendarEvents(): Promise<any[]> { return []; }
  async updateUnmatchedCalendarEvent(): Promise<any> { return undefined; }
  async deleteUnmatchedCalendarEvent(): Promise<boolean> { return false; }
  async createCalendarImportLog(): Promise<any> { return {}; }
  async getCalendarImportLog(): Promise<any> { return undefined; }
  async getCalendarImportLogsByUser(): Promise<any[]> { return []; }
  async getRecentCalendarImportLogs(): Promise<any[]> { return []; }
  async createUploadSession(): Promise<any> { return {}; }
  async getUploadSession(): Promise<any> { return undefined; }
  async getActiveUploadSessions(): Promise<any[]> { return []; }
  async updateUploadSession(): Promise<any> { return undefined; }
  async deleteUploadSession(): Promise<boolean> { return false; }
  async createEmailPreference(): Promise<any> { return {}; }
  async getEmailPreference(): Promise<any> { return undefined; }
  async updateEmailPreference(): Promise<any> { return undefined; }
  async createAuditLog(): Promise<any> { return {}; }
  async getAuditLog(): Promise<any> { return undefined; }
  async getAuditLogsByEntity(): Promise<any[]> { return []; }
  async getAuditLogsByUser(): Promise<any[]> { return []; }
  async getRecentAuditLogs(): Promise<any[]> { return []; }
  async createAchievement(): Promise<any> { return {}; }
  async getAllAchievements(): Promise<any[]> { return []; }
  async createUserAchievement(): Promise<any> { return {}; }
  async getUserAchievements(): Promise<any[]> { return []; }
  async createBuilderAbbreviation(): Promise<any> { return {}; }
  async getBuilderAbbreviation(): Promise<any> { return undefined; }
  async updateBuilderAbbreviation(): Promise<any> { return undefined; }
  async deleteBuilderAbbreviation(): Promise<boolean> { return false; }
}

describe('parseCalendarEvent', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    
    storage.setBuilders([
      {
        id: 'builder-1',
        name: 'M/I Homes',
        companyName: 'M/I Homes',
        email: 'contact@mihomes.com',
        phone: '555-1234',
        address: '123 Builder St',
        tradeSpecialization: 'Residential Construction',
        rating: 5,
        totalJobs: 100,
        notes: 'Primary builder',
        volumeTier: 'high',
        billingTerms: 'Net 30',
        preferredLeadTime: 7,
      }
    ]);
    
    storage.setBuilderAbbreviations([
      {
        id: 'abbr-1',
        builderId: 'builder-1',
        abbreviation: 'MI',
        isPrimary: true,
        createdAt: new Date(),
      }
    ]);
  });

  describe('Exact Matches (Confidence ~100)', () => {
    it('should parse "MI Test" with high confidence', async () => {
      const result = await parseCalendarEvent(storage, 'MI Test');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.parsedBuilderAbbreviation).toBe('mi');
      expect(result.parsedInspectionKeyword).toBe('test');
      expect(result.rawTitle).toBe('MI Test');
    });

    it('should parse "MI Test - Spec" with high confidence', async () => {
      const result = await parseCalendarEvent(storage, 'MI Test - Spec');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.parsedBuilderAbbreviation).toBe('mi');
      expect(result.parsedInspectionKeyword).toBe('test');
    });

    it('should parse "MI SV2" with high confidence', async () => {
      const result = await parseCalendarEvent(storage, 'MI SV2');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('SV2');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.parsedBuilderAbbreviation).toBe('mi');
      expect(result.parsedInspectionKeyword).toBe('sv2');
    });

    it('should parse "MI Full Test" with high confidence', async () => {
      const result = await parseCalendarEvent(storage, 'MI Full Test');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should parse "MI Pre-Drywall" with high confidence', async () => {
      const result = await parseCalendarEvent(storage, 'MI Pre-Drywall');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Pre-Drywall');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should parse "MI Final" with high confidence', async () => {
      const result = await parseCalendarEvent(storage, 'MI Final');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Final');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should parse "MI Rough" with high confidence', async () => {
      const result = await parseCalendarEvent(storage, 'MI Rough');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Rough');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Fuzzy Matches (Confidence 60-99)', () => {
    it('should parse "Mi Test" (case mismatch) with good confidence', async () => {
      const result = await parseCalendarEvent(storage, 'Mi Test');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should parse "mi test" (all lowercase) with good confidence', async () => {
      const result = await parseCalendarEvent(storage, 'mi test');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should parse "MI TEST" (all uppercase) with good confidence', async () => {
      const result = await parseCalendarEvent(storage, 'MI TEST');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should parse "M.I Test" (punctuation variation) with fuzzy match', async () => {
      storage.setBuilderAbbreviations([
        {
          id: 'abbr-1',
          builderId: 'builder-1',
          abbreviation: 'MI',
          isPrimary: true,
          createdAt: new Date(),
        },
        {
          id: 'abbr-2',
          builderId: 'builder-1',
          abbreviation: 'M.I',
          isPrimary: false,
          createdAt: new Date(),
        }
      ]);

      const result = await parseCalendarEvent(storage, 'M.I Test');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should parse "MI tets" (typo in inspection type) with partial match', async () => {
      const result = await parseCalendarEvent(storage, 'MI tets');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.parsedBuilderAbbreviation).toBe('mi');
    });

    it('should fuzzy match abbreviation with 2-character difference using Levenshtein', async () => {
      const result = await parseCalendarEvent(storage, 'MII Test'); // "MII" differs from "MI" by 1 char
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(60); // Fuzzy match
      expect(result.confidence).toBeLessThan(100); // Not exact match
    });

    it('should not match abbreviation with >2 character Levenshtein distance', async () => {
      const result = await parseCalendarEvent(storage, 'MXYZ Test'); // "MXYZ" differs from "MI" by 3 chars (no substring match)
      
      // Should not match due to Levenshtein distance >2
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
    });
  });

  describe('Unknown Builders (Confidence <60)', () => {
    it('should return null builder for unknown abbreviation "ABC Test"', async () => {
      const result = await parseCalendarEvent(storage, 'ABC Test');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeLessThan(60);
      expect(result.parsedBuilderAbbreviation).toBe('abc');
      expect(result.parsedInspectionKeyword).toBe('test');
    });

    it('should return null builder for unknown abbreviation "XYZ SV2"', async () => {
      const result = await parseCalendarEvent(storage, 'XYZ SV2');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBe('SV2');
      expect(result.confidence).toBeLessThan(60);
      expect(result.parsedBuilderAbbreviation).toBe('xyz');
    });

    it('should return null builder for unknown abbreviation "UnknownBuilder Final"', async () => {
      const result = await parseCalendarEvent(storage, 'UnknownBuilder Final');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBe('Final');
      expect(result.confidence).toBeLessThan(60);
    });
  });

  describe('Unknown Inspection Types (Confidence <80)', () => {
    it('should return null inspection type for "MI Meeting"', async () => {
      const result = await parseCalendarEvent(storage, 'MI Meeting');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBeLessThan(80);
      expect(result.parsedBuilderAbbreviation).toBe('mi');
      expect(result.parsedInspectionKeyword).toBeNull();
    });

    it('should return null inspection type for "MI Consultation"', async () => {
      const result = await parseCalendarEvent(storage, 'MI Consultation');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBeLessThan(80);
    });

    it('should return null inspection type for "MI Review"', async () => {
      const result = await parseCalendarEvent(storage, 'MI Review');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBeLessThan(80);
    });

    it('should return null inspection type for "MI Site Visit"', async () => {
      const result = await parseCalendarEvent(storage, 'MI Site Visit');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBeLessThan(80);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', async () => {
      const result = await parseCalendarEvent(storage, '');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.parsedBuilderAbbreviation).toBeNull();
      expect(result.parsedInspectionKeyword).toBeNull();
    });

    it('should handle whitespace-only string', async () => {
      const result = await parseCalendarEvent(storage, '   ');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle null input', async () => {
      const result = await parseCalendarEvent(storage, null as any);
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle undefined input', async () => {
      const result = await parseCalendarEvent(storage, undefined as any);
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle very long titles (>1000 chars)', async () => {
      const longTitle = 'A'.repeat(1001);
      const result = await parseCalendarEvent(storage, longTitle);
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle only special characters', async () => {
      const result = await parseCalendarEvent(storage, '!@#$%^&*()');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle emoji in title', async () => {
      const result = await parseCalendarEvent(storage, '🏠 MI Test');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.parsedBuilderAbbreviation).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle title with only inspection type (no builder)', async () => {
      const result = await parseCalendarEvent(storage, 'Test');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBeLessThan(60);
      expect(result.parsedBuilderAbbreviation).toBe('test');
    });

    it('should handle null storage', async () => {
      const result = await parseCalendarEvent(null as any, 'MI Test');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle title with numbers', async () => {
      const result = await parseCalendarEvent(storage, 'MI Test - 123 Main St');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should handle title with leading/trailing whitespace', async () => {
      const result = await parseCalendarEvent(storage, '  MI Test  ');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should handle title with multiple spaces', async () => {
      const result = await parseCalendarEvent(storage, 'MI   Test');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
      expect(result.inspectionType).toBe('Full Test');
    });

    it('should handle tabs and newlines', async () => {
      const result = await parseCalendarEvent(storage, 'MI\tTest\n');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
    });

    it('should handle numeric-only title', async () => {
      const result = await parseCalendarEvent(storage, '12345');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.confidence).toBeLessThan(60);
    });
  });

  describe('Mixed Scenarios', () => {
    it('should prioritize exact builder match over fuzzy', async () => {
      storage.setBuilders([
        {
          id: 'builder-1',
          name: 'M/I Homes',
          companyName: 'M/I Homes',
          email: 'contact@mihomes.com',
          phone: '555-1234',
          address: '123 Builder St',
          tradeSpecialization: 'Residential Construction',
          rating: 5,
          totalJobs: 100,
          notes: 'Primary builder',
          volumeTier: 'high',
          billingTerms: 'Net 30',
          preferredLeadTime: 7,
        },
        {
          id: 'builder-2',
          name: 'MII Construction',
          companyName: 'MII Construction',
          email: 'contact@mii.com',
          phone: '555-5678',
          address: '456 Builder Ave',
          tradeSpecialization: 'Commercial Construction',
          rating: 4,
          totalJobs: 50,
          notes: null,
          volumeTier: 'medium',
          billingTerms: 'Net 15',
          preferredLeadTime: 5,
        }
      ]);

      storage.setBuilderAbbreviations([
        {
          id: 'abbr-1',
          builderId: 'builder-1',
          abbreviation: 'MI',
          isPrimary: true,
          createdAt: new Date(),
        },
        {
          id: 'abbr-2',
          builderId: 'builder-2',
          abbreviation: 'MII',
          isPrimary: true,
          createdAt: new Date(),
        }
      ]);

      const result = await parseCalendarEvent(storage, 'MI Test');
      
      expect(result.builderId).toBe('builder-1');
      expect(result.builderName).toBe('M/I Homes');
    });

    it('should handle multiple abbreviations for same builder', async () => {
      storage.setBuilderAbbreviations([
        {
          id: 'abbr-1',
          builderId: 'builder-1',
          abbreviation: 'MI',
          isPrimary: true,
          createdAt: new Date(),
        },
        {
          id: 'abbr-2',
          builderId: 'builder-1',
          abbreviation: 'M/I',
          isPrimary: false,
          createdAt: new Date(),
        }
      ]);

      const result1 = await parseCalendarEvent(storage, 'MI Test');
      const result2 = await parseCalendarEvent(storage, 'M/I Test');
      
      expect(result1.builderId).toBe('builder-1');
      expect(result2.builderId).toBe('builder-1');
    });

    it('should handle no builders configured', async () => {
      storage.setBuilders([]);
      storage.setBuilderAbbreviations([]);

      const result = await parseCalendarEvent(storage, 'MI Test');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeLessThan(60);
    });

    it('should handle builder without matching abbreviation', async () => {
      storage.setBuilderAbbreviations([]);

      const result = await parseCalendarEvent(storage, 'MI Test');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeLessThan(60);
    });
  });

  describe('Confidence Score Validation', () => {
    it('should have confidence of 100 for exact builder and inspection match', async () => {
      const result = await parseCalendarEvent(storage, 'MI Test');
      
      expect(result.confidence).toBe(100);
    });

    it('should have confidence of 100 for exact builder and SV2', async () => {
      const result = await parseCalendarEvent(storage, 'MI SV2');
      
      expect(result.confidence).toBe(100);
    });

    it('should cap confidence at 100', async () => {
      const result = await parseCalendarEvent(storage, 'MI Full Test');
      
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should have lower confidence for unknown inspection type', async () => {
      const result = await parseCalendarEvent(storage, 'MI Unknown');
      
      expect(result.confidence).toBeLessThan(80);
    });

    it('should have lower confidence for unknown builder', async () => {
      const result = await parseCalendarEvent(storage, 'XYZ Test');
      
      expect(result.confidence).toBeLessThan(60);
    });

    it('should have zero confidence for invalid input', async () => {
      const result = await parseCalendarEvent(storage, '');
      
      expect(result.confidence).toBe(0);
    });
  });

  describe('Storage Failure Scenarios', () => {
    it('should return confidence=0 when getBuilderAbbreviations throws error', async () => {
      const failingStorage = new MockStorage();
      failingStorage.getBuilderAbbreviations = async () => {
        throw new Error('Database connection failed');
      };
      
      const result = await parseCalendarEvent(failingStorage, 'MI Test');
      
      expect(result.builderId).toBeNull();
      expect(result.builderName).toBeNull();
      expect(result.inspectionType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should return confidence=0 when getBuilderAbbreviations returns invalid data', async () => {
      const failingStorage = new MockStorage();
      failingStorage.getBuilderAbbreviations = async () => {
        return null as any; // Invalid - should be array
      };
      
      const result = await parseCalendarEvent(failingStorage, 'MI Test');
      
      expect(result.confidence).toBe(0);
    });

    it('should return confidence=0 when getBuilderAbbreviations returns malformed objects', async () => {
      const failingStorage = new MockStorage();
      failingStorage.getBuilderAbbreviations = async () => {
        return [
          { id: 'abbr-1', abbreviation: null, builderId: 'builder-1' } // Missing abbreviation
        ] as any;
      };
      
      const result = await parseCalendarEvent(failingStorage, 'MI Unknown'); // No matching inspection type
      
      expect(result.confidence).toBe(0);
    });

    it('should handle getBuilderById throwing error', async () => {
      storage.setBuilderAbbreviations([
        {
          id: 'abbr-1',
          builderId: 'builder-1',
          abbreviation: 'MI',
          isPrimary: true,
          createdAt: new Date(),
        }
      ]);
      
      storage.getBuilderById = async () => {
        throw new Error('Builder lookup failed');
      };
      
      const result = await parseCalendarEvent(storage, 'MI Test');
      
      // builderId should still be set from abbreviation lookup
      expect(result.builderId).toBe('builder-1');
      // But builderName should be null due to error
      expect(result.builderName).toBeNull();
      expect(result.confidence).toBeGreaterThan(0); // Still has partial confidence
    });

    it('should handle getBuilderById returning undefined', async () => {
      // Use fresh storage instance without builders
      const storageWithoutBuilders = new MockStorage();
      storageWithoutBuilders.setBuilderAbbreviations([
        {
          id: 'abbr-1',
          builderId: 'builder-1',
          abbreviation: 'MI',
          isPrimary: true,
          createdAt: new Date(),
        }
      ]);
      
      // Don't set any builders, so getBuilderById returns undefined
      
      const result = await parseCalendarEvent(storageWithoutBuilders, 'MI Test');
      
      expect(result.builderId).toBe('builder-1'); // Still set from abbreviation
      expect(result.builderName).toBeNull(); // Null because builder not found
      expect(result.inspectionType).toBe('Full Test');
      expect(result.confidence).toBeGreaterThan(0); // Still has confidence from match
    });
  });
});
