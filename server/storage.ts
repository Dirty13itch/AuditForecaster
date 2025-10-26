import {
  type User,
  type UpsertUser,
  type Builder,
  type InsertBuilder,
  type BuilderContact,
  type InsertBuilderContact,
  type BuilderAgreement,
  type InsertBuilderAgreement,
  type BuilderProgram,
  type InsertBuilderProgram,
  type BuilderInteraction,
  type InsertBuilderInteraction,
  type Development,
  type InsertDevelopment,
  type Lot,
  type InsertLot,
  type Plan,
  type InsertPlan,
  type Job,
  type InsertJob,
  type ScheduleEvent,
  type InsertScheduleEvent,
  type Expense,
  type InsertExpense,
  type MileageLog,
  type InsertMileageLog,
  type ReportTemplate,
  type InsertReportTemplate,
  type TemplateSection,
  type InsertTemplateSection,
  type TemplateField,
  type InsertTemplateField,
  type ReportInstance,
  type InsertReportInstance,
  type ReportSectionInstance,
  type InsertReportSectionInstance,
  type ReportFieldValue,
  type InsertReportFieldValue,
  type Photo,
  type InsertPhoto,
  type Forecast,
  type InsertForecast,
  type ChecklistItem,
  type InsertChecklistItem,
  type ComplianceRule,
  type InsertComplianceRule,
  type ComplianceHistory,
  type InsertComplianceHistory,
  type CalendarPreference,
  type InsertCalendarPreference,
  type GoogleEvent,
  type InsertGoogleEvent,
  type UnmatchedCalendarEvent,
  type InsertUnmatchedCalendarEvent,
  type CalendarImportLog,
  type InsertCalendarImportLog,
  type UploadSession,
  type InsertUploadSession,
  type EmailPreference,
  type InsertEmailPreference,
  type AuditLog,
  type InsertAuditLog,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type BuilderAbbreviation,
  type InsertBuilderAbbreviation,
  type ScoreSummary,
  users,
  builders,
  builderContacts,
  builderAgreements,
  builderPrograms,
  builderInteractions,
  developments,
  lots,
  plans,
  jobs,
  scheduleEvents,
  expenses,
  mileageLogs,
  reportTemplates,
  templateSections,
  templateFields,
  reportInstances,
  reportSectionInstances,
  reportFieldValues,
  photos,
  forecasts,
  checklistItems,
  complianceRules,
  complianceHistory,
  calendarPreferences,
  googleEvents,
  unmatchedCalendarEvents,
  calendarImportLogs,
  uploadSessions,
  emailPreferences,
  auditLogs,
  achievements,
  userAchievements,
  builderAbbreviations,
} from "@shared/schema";
import { calculateScore } from "@shared/scoring";
import { type PaginationParams, type PaginatedResult, type PhotoFilterParams, type PhotoCursorPaginationParams, type CursorPaginationParams, type CursorPaginatedResult } from "@shared/pagination";
import { db } from "./db";
import { eq, and, or, gte, lte, gt, lt, inArray, desc, asc, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  createBuilder(builder: InsertBuilder): Promise<Builder>;
  getBuilder(id: string): Promise<Builder | undefined>;
  getAllBuilders(): Promise<Builder[]>;
  getBuildersPaginated(params: PaginationParams): Promise<PaginatedResult<Builder>>;
  updateBuilder(id: string, builder: Partial<InsertBuilder>): Promise<Builder | undefined>;
  deleteBuilder(id: string): Promise<boolean>;

  createBuilderContact(contact: InsertBuilderContact): Promise<BuilderContact>;
  getBuilderContact(id: string): Promise<BuilderContact | undefined>;
  getBuilderContacts(builderId: string): Promise<BuilderContact[]>;
  updateBuilderContact(id: string, contact: Partial<InsertBuilderContact>): Promise<BuilderContact | undefined>;
  deleteBuilderContact(id: string): Promise<boolean>;
  setPrimaryContact(builderId: string, contactId: string): Promise<void>;

  createBuilderAgreement(agreement: InsertBuilderAgreement): Promise<BuilderAgreement>;
  getBuilderAgreement(id: string): Promise<BuilderAgreement | undefined>;
  getBuilderAgreements(builderId: string): Promise<BuilderAgreement[]>;
  getActiveAgreement(builderId: string): Promise<BuilderAgreement | undefined>;
  updateBuilderAgreement(id: string, agreement: Partial<InsertBuilderAgreement>): Promise<BuilderAgreement | undefined>;
  deleteBuilderAgreement(id: string): Promise<boolean>;

  createBuilderProgram(program: InsertBuilderProgram): Promise<BuilderProgram>;
  getBuilderProgram(id: string): Promise<BuilderProgram | undefined>;
  getBuilderPrograms(builderId: string): Promise<BuilderProgram[]>;
  getActivePrograms(builderId: string): Promise<BuilderProgram[]>;
  updateBuilderProgram(id: string, program: Partial<InsertBuilderProgram>): Promise<BuilderProgram | undefined>;
  deleteBuilderProgram(id: string): Promise<boolean>;

  createBuilderInteraction(interaction: InsertBuilderInteraction): Promise<BuilderInteraction>;
  getBuilderInteraction(id: string): Promise<BuilderInteraction | undefined>;
  getBuilderInteractions(builderId: string): Promise<BuilderInteraction[]>;
  getInteractionsByContact(contactId: string): Promise<BuilderInteraction[]>;
  updateBuilderInteraction(id: string, interaction: Partial<InsertBuilderInteraction>): Promise<BuilderInteraction | undefined>;
  deleteBuilderInteraction(id: string): Promise<boolean>;

  createDevelopment(development: InsertDevelopment): Promise<Development>;
  getDevelopment(id: string): Promise<Development | undefined>;
  getDevelopments(builderId: string): Promise<Development[]>;
  getDevelopmentsByStatus(status: string): Promise<Development[]>;
  updateDevelopment(id: string, development: Partial<InsertDevelopment>): Promise<Development | undefined>;
  deleteDevelopment(id: string): Promise<boolean>;

  createLot(lot: InsertLot): Promise<Lot>;
  getLot(id: string): Promise<Lot | undefined>;
  getLots(developmentId: string): Promise<Lot[]>;
  getLotsByPlan(planId: string): Promise<Lot[]>;
  updateLot(id: string, lot: Partial<InsertLot>): Promise<Lot | undefined>;
  deleteLot(id: string): Promise<boolean>;

  createPlan(plan: InsertPlan): Promise<Plan>;
  getPlan(id: string): Promise<Plan | undefined>;
  getPlansByBuilder(builderId: string): Promise<Plan[]>;
  getAllPlans(): Promise<Plan[]>;
  updatePlan(id: string, plan: Partial<InsertPlan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getJobBySourceEventId(sourceEventId: string): Promise<Job | undefined>;
  getAllJobs(): Promise<Job[]>;
  getJobsByUser(userId: string): Promise<Job[]>;
  getJobsPaginated(params: PaginationParams): Promise<PaginatedResult<Job>>;
  getJobsCursorPaginated(params: CursorPaginationParams): Promise<CursorPaginatedResult<Job>>;
  getJobsCursorPaginatedByUser(userId: string, params: CursorPaginationParams): Promise<CursorPaginatedResult<Job>>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;
  bulkDeleteJobs(ids: string[]): Promise<number>;

  createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent>;
  getScheduleEvent(id: string): Promise<ScheduleEvent | undefined>;
  getScheduleEventsByJob(jobId: string): Promise<ScheduleEvent[]>;
  getScheduleEventsByDateRange(startDate: Date, endDate: Date): Promise<ScheduleEvent[]>;
  updateScheduleEvent(id: string, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined>;
  deleteScheduleEvent(id: string): Promise<boolean>;

  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpense(id: string): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesPaginated(params: PaginationParams): Promise<PaginatedResult<Expense>>;
  getExpensesByJob(jobId: string): Promise<Expense[]>;
  getExpensesByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Expense>>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  createMileageLog(log: InsertMileageLog): Promise<MileageLog>;
  getMileageLog(id: string): Promise<MileageLog | undefined>;
  getAllMileageLogs(): Promise<MileageLog[]>;
  getMileageLogsPaginated(params: PaginationParams): Promise<PaginatedResult<MileageLog>>;
  getMileageLogsByDateRange(startDate: Date, endDate: Date): Promise<MileageLog[]>;
  updateMileageLog(id: string, log: Partial<InsertMileageLog>): Promise<MileageLog | undefined>;
  deleteMileageLog(id: string): Promise<boolean>;

  // Report Templates
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  getAllReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplatesByCategory(category: string): Promise<ReportTemplate[]>;
  getPublishedReportTemplates(): Promise<ReportTemplate[]>;
  updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string): Promise<boolean>;
  publishReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  duplicateReportTemplate(id: string, newName: string): Promise<ReportTemplate>;

  // Template Sections
  createTemplateSection(section: InsertTemplateSection): Promise<TemplateSection>;
  getTemplateSection(id: string): Promise<TemplateSection | undefined>;
  getTemplateSections(templateId: string): Promise<TemplateSection[]>;
  updateTemplateSection(id: string, section: Partial<InsertTemplateSection>): Promise<TemplateSection | undefined>;
  deleteTemplateSection(id: string): Promise<boolean>;
  reorderTemplateSections(templateId: string, sectionIds: string[]): Promise<boolean>;

  // Template Fields
  createTemplateField(field: InsertTemplateField): Promise<TemplateField>;
  getTemplateField(id: string): Promise<TemplateField | undefined>;
  getTemplateFields(sectionId: string): Promise<TemplateField[]>;
  updateTemplateField(id: string, field: Partial<InsertTemplateField>): Promise<TemplateField | undefined>;
  deleteTemplateField(id: string): Promise<boolean>;
  reorderTemplateFields(sectionId: string, fieldIds: string[]): Promise<boolean>;

  // Report Instances
  createReportInstance(instance: InsertReportInstance): Promise<ReportInstance>;
  getReportInstance(id: string): Promise<ReportInstance | undefined>;
  getAllReportInstances(): Promise<ReportInstance[]>;
  getReportInstancesByJob(jobId: string): Promise<ReportInstance[]>;
  getReportInstancesByStatus(status: string): Promise<ReportInstance[]>;
  getReportInstancesPaginated(params: PaginationParams): Promise<PaginatedResult<ReportInstance>>;
  updateReportInstance(id: string, instance: Partial<InsertReportInstance>): Promise<ReportInstance | undefined>;
  submitReportInstance(id: string): Promise<ReportInstance | undefined>;
  approveReportInstance(id: string, approverId: string): Promise<ReportInstance | undefined>;

  // Report Section Instances
  createReportSectionInstance(instance: InsertReportSectionInstance): Promise<ReportSectionInstance>;
  getReportSectionInstance(id: string): Promise<ReportSectionInstance | undefined>;
  getReportSectionInstances(reportId: string): Promise<ReportSectionInstance[]>;
  deleteReportSectionInstance(id: string): Promise<boolean>;

  // Report Field Values
  createReportFieldValue(value: InsertReportFieldValue): Promise<ReportFieldValue>;
  getReportFieldValue(id: string): Promise<ReportFieldValue | undefined>;
  getReportFieldValues(reportId: string): Promise<ReportFieldValue[]>;
  getReportFieldValuesBySection(sectionInstanceId: string): Promise<ReportFieldValue[]>;
  updateReportFieldValue(id: string, value: Partial<InsertReportFieldValue>): Promise<ReportFieldValue | undefined>;
  deleteReportFieldValue(id: string): Promise<boolean>;
  bulkSaveFieldValues(reportId: string, values: InsertReportFieldValue[]): Promise<ReportFieldValue[]>;

  createPhoto(photo: InsertPhoto): Promise<Photo>;
  getPhoto(id: string): Promise<Photo | undefined>;
  getAllPhotos(): Promise<Photo[]>;
  getPhotosByJob(jobId: string): Promise<Photo[]>;
  getPhotosByUser(userId: string): Promise<Photo[]>;
  getPhotosByChecklistItem(checklistItemId: string): Promise<Photo[]>;
  getPhotosPaginated(params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosByChecklistItemPaginated(checklistItemId: string, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosFilteredPaginated(filters: PhotoFilterParams, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosCursorPaginated(filters: PhotoFilterParams, params: PhotoCursorPaginationParams): Promise<CursorPaginatedResult<Photo>>;
  getPhotosCursorPaginatedByUser(userId: string, filters: PhotoFilterParams, params: PhotoCursorPaginationParams): Promise<CursorPaginatedResult<Photo>>;
  updatePhoto(id: string, photo: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: string): Promise<boolean>;
  
  // Bulk photo operations
  bulkDeletePhotos(ids: string[]): Promise<number>;
  bulkUpdatePhotoTags(ids: string[], mode: 'add' | 'remove' | 'replace', tags: string[]): Promise<number>;

  createForecast(forecast: InsertForecast): Promise<Forecast>;
  getForecast(id: string): Promise<Forecast | undefined>;
  getAllForecasts(): Promise<Forecast[]>;
  getForecastsByJob(jobId: string): Promise<Forecast[]>;
  updateForecast(id: string, forecast: Partial<InsertForecast>): Promise<Forecast | undefined>;
  deleteForecast(id: string): Promise<boolean>;

  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  getChecklistItem(id: string): Promise<ChecklistItem | undefined>;
  getChecklistItemsByJob(jobId: string): Promise<ChecklistItem[]>;
  getChecklistItemsByJobs(jobIds: string[]): Promise<Map<string, ChecklistItem[]>>;
  updateChecklistItem(id: string, item: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined>;
  deleteChecklistItem(id: string): Promise<boolean>;
  generateChecklistFromTemplate(jobId: string, inspectionType: string): Promise<ChecklistItem[]>;

  createComplianceRule(rule: InsertComplianceRule): Promise<ComplianceRule>;
  getComplianceRules(): Promise<ComplianceRule[]>;
  updateComplianceRule(id: string, rule: Partial<InsertComplianceRule>): Promise<ComplianceRule | undefined>;
  deleteComplianceRule(id: string): Promise<boolean>;

  getComplianceHistory(entityType?: string, entityId?: string): Promise<ComplianceHistory[]>;
  createComplianceHistoryEntry(entry: InsertComplianceHistory): Promise<ComplianceHistory>;

  // Calendar preferences
  getCalendarPreferences(): Promise<CalendarPreference[]>;
  saveCalendarPreferences(preferences: InsertCalendarPreference[]): Promise<CalendarPreference[]>;
  updateCalendarToggle(calendarId: string, isEnabled: boolean): Promise<CalendarPreference | undefined>;
  deleteCalendarPreference(calendarId: string): Promise<boolean>;

  // Google events (not linked to jobs)
  createGoogleEvent(event: InsertGoogleEvent): Promise<GoogleEvent>;
  getGoogleEvent(id: string): Promise<GoogleEvent | undefined>;
  getGoogleEventByGoogleId(googleEventId: string, calendarId: string): Promise<GoogleEvent | undefined>;
  getGoogleEventsByDateRange(startDate: Date, endDate: Date): Promise<GoogleEvent[]>;
  getTodaysUnconvertedGoogleEvents(): Promise<GoogleEvent[]>;
  updateGoogleEvent(id: string, event: Partial<InsertGoogleEvent>): Promise<GoogleEvent | undefined>;
  deleteGoogleEvent(id: string): Promise<boolean>;
  markGoogleEventAsConverted(id: string, jobId: string): Promise<GoogleEvent | undefined>;
  getJobsByStatus(statuses: string[]): Promise<Job[]>;
  getTodaysJobsByStatus(statuses: string[]): Promise<Job[]>;

  recalculateReportScore(reportInstanceId: string): Promise<void>;

  // Upload sessions for photo cleanup reminder
  createUploadSession(data: InsertUploadSession): Promise<UploadSession>;
  getUploadSessions(): Promise<UploadSession[]>;
  acknowledgeUploadSession(id: string): Promise<void>;

  // Email preferences
  getEmailPreferences(userId: string): Promise<EmailPreference | undefined>;
  createEmailPreferences(prefs: InsertEmailPreference): Promise<EmailPreference>;
  updateEmailPreferences(userId: string, prefs: Partial<InsertEmailPreference>): Promise<EmailPreference | undefined>;
  getEmailPreferencesByToken(token: string): Promise<EmailPreference | undefined>;
  generateUnsubscribeToken(userId: string): Promise<string>;

  // Dashboard methods
  getDashboardSummary(): Promise<any>;
  getBuilderLeaderboard(): Promise<any[]>;

  // Audit logs
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(params: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: AuditLog[], total: number }>;

  // Achievements
  getAllAchievements(): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  getUserAchievementWithDetails(userId: string): Promise<Array<UserAchievement & { achievement: Achievement }>>;
  awardAchievement(userId: string, achievementId: string, metadata?: any): Promise<UserAchievement>;
  updateUserAchievementProgress(userId: string, achievementId: string, progress: number): Promise<UserAchievement | undefined>;
  checkUserHasAchievement(userId: string, achievementId: string): Promise<boolean>;
  seedAchievements(achievementDefs: InsertAchievement[]): Promise<void>;

  // Builder abbreviations for calendar parsing
  getBuilderAbbreviations(): Promise<BuilderAbbreviation[]>;
  getBuilderAbbreviationsByBuilder(builderId: string): Promise<BuilderAbbreviation[]>;
  createBuilderAbbreviation(abbr: InsertBuilderAbbreviation): Promise<BuilderAbbreviation>;
  deleteBuilderAbbreviation(id: string): Promise<boolean>;
  updateBuilderAbbreviation(id: string, data: Partial<InsertBuilderAbbreviation>): Promise<BuilderAbbreviation | undefined>;
  setPrimaryBuilderAbbreviation(builderId: string, abbreviationId: string): Promise<void>;
  seedBuilderAbbreviations(builderId: string, abbreviations: string[]): Promise<void>;
  getBuilderById(id: string): Promise<Builder | undefined>;

  // Unmatched calendar events (manual review queue)
  getUnmatchedEvents(filters?: {
    status?: string;
    minConfidence?: number;
    maxConfidence?: number;
    startDate?: Date;
    endDate?: Date;
    builderMatch?: 'matched' | 'unmatched' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<{ events: UnmatchedCalendarEvent[], total: number }>;
  getUnmatchedEvent(id: string): Promise<UnmatchedCalendarEvent | undefined>;
  createUnmatchedEvent(event: InsertUnmatchedCalendarEvent): Promise<UnmatchedCalendarEvent>;
  updateUnmatchedEventStatus(id: string, status: string, reviewedBy?: string): Promise<UnmatchedCalendarEvent | undefined>;
  approveUnmatchedEvent(id: string, builderId: string, inspectionType: string, reviewedBy: string): Promise<{ event: UnmatchedCalendarEvent, job: Job }>;
  rejectUnmatchedEvent(id: string, reviewedBy: string, reason?: string): Promise<UnmatchedCalendarEvent | undefined>;

  // Calendar import logs
  createCalendarImportLog(log: InsertCalendarImportLog): Promise<CalendarImportLog>;
  getImportLogsByCalendar(calendarId: string, limit?: number): Promise<CalendarImportLog[]>;
  getRecentImportLogs(limit?: number): Promise<CalendarImportLog[]>;
  getFilteredImportLogs(options: {
    limit?: number;
    offset?: number;
    calendarId?: string;
    hasErrors?: boolean;
  }): Promise<{ logs: CalendarImportLog[]; total: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createBuilder(insertBuilder: InsertBuilder): Promise<Builder> {
    const result = await db.insert(builders).values(insertBuilder).returning();
    return result[0];
  }

  async getBuilder(id: string): Promise<Builder | undefined> {
    const result = await db.select().from(builders).where(eq(builders.id, id)).limit(1);
    return result[0];
  }

  async getAllBuilders(): Promise<Builder[]> {
    return await db.select().from(builders);
  }

  async getBuildersPaginated(params: PaginationParams): Promise<PaginatedResult<Builder>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(builders).limit(limit).offset(offset),
      db.select({ count: count() }).from(builders)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateBuilder(id: string, updates: Partial<InsertBuilder>): Promise<Builder | undefined> {
    const result = await db.update(builders)
      .set(updates)
      .where(eq(builders.id, id))
      .returning();
    return result[0];
  }

  async deleteBuilder(id: string): Promise<boolean> {
    const result = await db.delete(builders).where(eq(builders.id, id)).returning();
    return result.length > 0;
  }

  async createBuilderContact(insertContact: InsertBuilderContact): Promise<BuilderContact> {
    // Use setPrimaryContact instead to manage primary designation
    const result = await db.insert(builderContacts).values({ ...insertContact, isPrimary: false }).returning();
    return result[0];
  }

  async getBuilderContact(id: string): Promise<BuilderContact | undefined> {
    const result = await db.select().from(builderContacts).where(eq(builderContacts.id, id)).limit(1);
    return result[0];
  }

  async getBuilderContacts(builderId: string): Promise<BuilderContact[]> {
    return await db.select().from(builderContacts)
      .where(eq(builderContacts.builderId, builderId))
      .orderBy(desc(builderContacts.isPrimary), asc(builderContacts.name));
  }

  async updateBuilderContact(id: string, updates: Partial<InsertBuilderContact>): Promise<BuilderContact | undefined> {
    // Verify the contact exists and get its builderId before update
    const existing = await this.getBuilderContact(id);
    if (!existing) {
      return undefined;
    }
    
    // Prevent changing builderId via regular update
    const { builderId, ...safeUpdates } = updates;
    
    const result = await db.update(builderContacts)
      .set(safeUpdates)
      .where(eq(builderContacts.id, id))
      .returning();
    return result[0];
  }

  async deleteBuilderContact(id: string): Promise<boolean> {
    // Verify the contact exists before deletion
    const existing = await this.getBuilderContact(id);
    if (!existing) {
      return false;
    }
    
    const result = await db.delete(builderContacts).where(eq(builderContacts.id, id)).returning();
    return result.length > 0;
  }

  async setPrimaryContact(builderId: string, contactId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Verify the contact exists and belongs to the specified builder
      const contact = await tx.select().from(builderContacts)
        .where(eq(builderContacts.id, contactId))
        .limit(1);
      
      if (contact.length === 0 || contact[0].builderId !== builderId) {
        throw new Error('Contact not found for this builder');
      }
      
      // First, unset all primary contacts for this builder
      await tx.update(builderContacts)
        .set({ isPrimary: false })
        .where(eq(builderContacts.builderId, builderId));
      
      // Then, set the new primary contact
      await tx.update(builderContacts)
        .set({ isPrimary: true })
        .where(eq(builderContacts.id, contactId));
    });
  }

  async createBuilderAgreement(insertAgreement: InsertBuilderAgreement): Promise<BuilderAgreement> {
    const result = await db.insert(builderAgreements).values(insertAgreement).returning();
    return result[0];
  }

  async getBuilderAgreement(id: string): Promise<BuilderAgreement | undefined> {
    const result = await db.select().from(builderAgreements).where(eq(builderAgreements.id, id)).limit(1);
    return result[0];
  }

  async getBuilderAgreements(builderId: string): Promise<BuilderAgreement[]> {
    return await db.select().from(builderAgreements)
      .where(eq(builderAgreements.builderId, builderId))
      .orderBy(desc(builderAgreements.startDate));
  }

  async getActiveAgreement(builderId: string): Promise<BuilderAgreement | undefined> {
    const result = await db.select().from(builderAgreements)
      .where(and(
        eq(builderAgreements.builderId, builderId),
        eq(builderAgreements.status, 'active')
      ))
      .orderBy(desc(builderAgreements.startDate))
      .limit(1);
    return result[0];
  }

  async updateBuilderAgreement(id: string, updates: Partial<InsertBuilderAgreement>): Promise<BuilderAgreement | undefined> {
    const result = await db.update(builderAgreements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(builderAgreements.id, id))
      .returning();
    return result[0];
  }

  async deleteBuilderAgreement(id: string): Promise<boolean> {
    const result = await db.delete(builderAgreements).where(eq(builderAgreements.id, id)).returning();
    return result.length > 0;
  }

  async createBuilderProgram(insertProgram: InsertBuilderProgram): Promise<BuilderProgram> {
    const result = await db.insert(builderPrograms).values(insertProgram).returning();
    return result[0];
  }

  async getBuilderProgram(id: string): Promise<BuilderProgram | undefined> {
    const result = await db.select().from(builderPrograms).where(eq(builderPrograms.id, id)).limit(1);
    return result[0];
  }

  async getBuilderPrograms(builderId: string): Promise<BuilderProgram[]> {
    return await db.select().from(builderPrograms)
      .where(eq(builderPrograms.builderId, builderId))
      .orderBy(desc(builderPrograms.enrollmentDate));
  }

  async getActivePrograms(builderId: string): Promise<BuilderProgram[]> {
    return await db.select().from(builderPrograms)
      .where(and(
        eq(builderPrograms.builderId, builderId),
        eq(builderPrograms.status, 'active')
      ))
      .orderBy(desc(builderPrograms.enrollmentDate));
  }

  async updateBuilderProgram(id: string, updates: Partial<InsertBuilderProgram>): Promise<BuilderProgram | undefined> {
    const result = await db.update(builderPrograms)
      .set(updates)
      .where(eq(builderPrograms.id, id))
      .returning();
    return result[0];
  }

  async deleteBuilderProgram(id: string): Promise<boolean> {
    const result = await db.delete(builderPrograms).where(eq(builderPrograms.id, id)).returning();
    return result.length > 0;
  }

  async createBuilderInteraction(insertInteraction: InsertBuilderInteraction): Promise<BuilderInteraction> {
    const result = await db.insert(builderInteractions).values(insertInteraction).returning();
    return result[0];
  }

  async getBuilderInteraction(id: string): Promise<BuilderInteraction | undefined> {
    const result = await db.select().from(builderInteractions).where(eq(builderInteractions.id, id)).limit(1);
    return result[0];
  }

  async getBuilderInteractions(builderId: string): Promise<BuilderInteraction[]> {
    return await db.select().from(builderInteractions)
      .where(eq(builderInteractions.builderId, builderId))
      .orderBy(desc(builderInteractions.interactionDate));
  }

  async getInteractionsByContact(contactId: string): Promise<BuilderInteraction[]> {
    return await db.select().from(builderInteractions)
      .where(eq(builderInteractions.contactId, contactId))
      .orderBy(desc(builderInteractions.interactionDate));
  }

  async updateBuilderInteraction(id: string, updates: Partial<InsertBuilderInteraction>): Promise<BuilderInteraction | undefined> {
    const result = await db.update(builderInteractions)
      .set(updates)
      .where(eq(builderInteractions.id, id))
      .returning();
    return result[0];
  }

  async deleteBuilderInteraction(id: string): Promise<boolean> {
    const result = await db.delete(builderInteractions).where(eq(builderInteractions.id, id)).returning();
    return result.length > 0;
  }

  async createDevelopment(insertDevelopment: InsertDevelopment): Promise<Development> {
    const result = await db.insert(developments).values(insertDevelopment).returning();
    return result[0];
  }

  async getDevelopment(id: string): Promise<Development | undefined> {
    const result = await db.select().from(developments).where(eq(developments.id, id)).limit(1);
    return result[0];
  }

  async getDevelopments(builderId: string): Promise<Development[]> {
    return await db.select().from(developments)
      .where(eq(developments.builderId, builderId))
      .orderBy(desc(developments.createdAt));
  }

  async getDevelopmentsByStatus(status: string): Promise<Development[]> {
    return await db.select().from(developments)
      .where(eq(developments.status, status as any))
      .orderBy(desc(developments.createdAt));
  }

  async updateDevelopment(id: string, updates: Partial<InsertDevelopment>): Promise<Development | undefined> {
    const result = await db.update(developments)
      .set(updates)
      .where(eq(developments.id, id))
      .returning();
    return result[0];
  }

  async deleteDevelopment(id: string): Promise<boolean> {
    const result = await db.delete(developments).where(eq(developments.id, id)).returning();
    return result.length > 0;
  }

  async createLot(insertLot: InsertLot): Promise<Lot> {
    // Convert numeric fields to strings for decimal columns
    const values = {
      ...insertLot,
      squareFootage: insertLot.squareFootage != null ? String(insertLot.squareFootage) : null,
    };
    const result = await db.insert(lots).values(values as any).returning();
    return result[0];
  }

  async getLot(id: string): Promise<Lot | undefined> {
    const result = await db.select().from(lots).where(eq(lots.id, id)).limit(1);
    return result[0];
  }

  async getLots(developmentId: string): Promise<Lot[]> {
    return await db.select().from(lots)
      .where(eq(lots.developmentId, developmentId))
      .orderBy(asc(lots.lotNumber));
  }

  async getLotsByPlan(planId: string): Promise<Lot[]> {
    return await db.select().from(lots)
      .where(eq(lots.planId, planId))
      .orderBy(asc(lots.lotNumber));
  }

  async updateLot(id: string, updates: Partial<InsertLot>): Promise<Lot | undefined> {
    // Convert numeric fields to strings for decimal columns
    const values = {
      ...updates,
      ...(updates.squareFootage != null && { squareFootage: String(updates.squareFootage) }),
    };
    const result = await db.update(lots)
      .set(values as any)
      .where(eq(lots.id, id))
      .returning();
    return result[0];
  }

  async deleteLot(id: string): Promise<boolean> {
    const result = await db.delete(lots).where(eq(lots.id, id)).returning();
    return result.length > 0;
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    // Convert numeric fields to strings for decimal columns
    const values = {
      ...insertPlan,
      floorArea: insertPlan.floorArea != null ? String(insertPlan.floorArea) : null,
      surfaceArea: insertPlan.surfaceArea != null ? String(insertPlan.surfaceArea) : null,
      houseVolume: insertPlan.houseVolume != null ? String(insertPlan.houseVolume) : null,
      stories: insertPlan.stories != null ? String(insertPlan.stories) : null,
    };
    const result = await db.insert(plans).values(values as any).returning();
    return result[0];
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const result = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return result[0];
  }

  async getPlansByBuilder(builderId: string): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.builderId, builderId)).orderBy(asc(plans.planName));
  }

  async getAllPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(asc(plans.planName));
  }

  async updatePlan(id: string, updates: Partial<InsertPlan>): Promise<Plan | undefined> {
    // Convert numeric fields to strings for decimal columns
    const values = {
      ...updates,
      ...(updates.floorArea != null && { floorArea: String(updates.floorArea) }),
      ...(updates.surfaceArea != null && { surfaceArea: String(updates.surfaceArea) }),
      ...(updates.houseVolume != null && { houseVolume: String(updates.houseVolume) }),
      ...(updates.stories != null && { stories: String(updates.stories) }),
    };
    const result = await db.update(plans)
      .set(values as any)
      .where(eq(plans.id, id))
      .returning();
    return result[0];
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id)).returning();
    return result.length > 0;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    // Convert numeric fields to strings for decimal columns
    const values = {
      ...insertJob,
      pricing: insertJob.pricing != null ? String(insertJob.pricing) : null,
      floorArea: insertJob.floorArea != null ? String(insertJob.floorArea) : null,
      surfaceArea: insertJob.surfaceArea != null ? String(insertJob.surfaceArea) : null,
      houseVolume: insertJob.houseVolume != null ? String(insertJob.houseVolume) : null,
      stories: insertJob.stories != null ? String(insertJob.stories) : null,
    };
    const result = await db.insert(jobs).values(values as any).returning();
    return result[0];
  }

  async getJob(id: string): Promise<Job | undefined> {
    const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return result[0];
  }

  async getJobBySourceEventId(googleEventId: string): Promise<Job | undefined> {
    const result = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, googleEventId))
      .limit(1);
    return result[0];
  }

  async getAllJobs(): Promise<Job[]> {
    return await db.select().from(jobs);
  }

  async getJobsByUser(userId: string): Promise<Job[]> {
    return await db.select().from(jobs)
      .where(eq(jobs.createdBy, userId))
      .orderBy(desc(jobs.id));
  }

  async getJobsPaginated(params: PaginationParams): Promise<PaginatedResult<Job>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(jobs).limit(limit).offset(offset),
      db.select({ count: count() }).from(jobs)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getJobsCursorPaginated(params: CursorPaginationParams): Promise<CursorPaginatedResult<Job>> {
    const { cursor, limit, sortBy, sortOrder } = params;
    
    let whereCondition = undefined;
    if (cursor) {
      whereCondition = sortOrder === 'desc' ? lt(jobs.id, cursor) : gt(jobs.id, cursor);
    }
    
    const orderByCondition = sortOrder === 'desc' ? desc(jobs.id) : asc(jobs.id);
    
    const baseQuery = db.select().from(jobs);
    const query = whereCondition ? baseQuery.where(whereCondition) : baseQuery;
    const results = await query.orderBy(orderByCondition).limit(limit + 1);
    
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;
    
    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async getJobsCursorPaginatedByUser(userId: string, params: CursorPaginationParams): Promise<CursorPaginatedResult<Job>> {
    const { cursor, limit, sortBy, sortOrder } = params;
    
    const whereCondition = cursor 
      ? and(
          eq(jobs.createdBy, userId),
          sortOrder === 'desc' ? lt(jobs.id, cursor) : gt(jobs.id, cursor)
        )
      : eq(jobs.createdBy, userId);
    
    const orderByCondition = sortOrder === 'desc' ? desc(jobs.id) : asc(jobs.id);
    
    const results = await db.select()
      .from(jobs)
      .where(whereCondition)
      .orderBy(orderByCondition)
      .limit(limit + 1);
    
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;
    
    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    // Convert numeric fields to strings for decimal columns
    const values = {
      ...updates,
      ...(updates.pricing != null && { pricing: String(updates.pricing) }),
      ...(updates.floorArea != null && { floorArea: String(updates.floorArea) }),
      ...(updates.surfaceArea != null && { surfaceArea: String(updates.surfaceArea) }),
      ...(updates.houseVolume != null && { houseVolume: String(updates.houseVolume) }),
      ...(updates.stories != null && { stories: String(updates.stories) }),
    };
    const result = await db.update(jobs)
      .set(values as any)
      .where(eq(jobs.id, id))
      .returning();
    return result[0];
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeleteJobs(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(jobs).where(inArray(jobs.id, ids)).returning();
    return result.length;
  }

  async createScheduleEvent(insertEvent: InsertScheduleEvent): Promise<ScheduleEvent> {
    const result = await db.insert(scheduleEvents).values(insertEvent).returning();
    return result[0];
  }

  async getScheduleEvent(id: string): Promise<ScheduleEvent | undefined> {
    const result = await db.select().from(scheduleEvents).where(eq(scheduleEvents.id, id)).limit(1);
    return result[0];
  }

  async getScheduleEventsByJob(jobId: string): Promise<ScheduleEvent[]> {
    return await db.select().from(scheduleEvents).where(eq(scheduleEvents.jobId, jobId));
  }

  async getScheduleEventsByDateRange(startDate: Date, endDate: Date): Promise<ScheduleEvent[]> {
    return await db.select().from(scheduleEvents)
      .where(
        and(
          gte(scheduleEvents.startTime, startDate),
          lte(scheduleEvents.startTime, endDate)
        )
      );
  }

  async updateScheduleEvent(id: string, updates: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined> {
    const result = await db.update(scheduleEvents)
      .set(updates)
      .where(eq(scheduleEvents.id, id))
      .returning();
    return result[0];
  }

  async deleteScheduleEvent(id: string): Promise<boolean> {
    const result = await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id)).returning();
    return result.length > 0;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values(insertExpense).returning();
    return result[0];
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return result[0];
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpensesPaginated(params: PaginationParams): Promise<PaginatedResult<Expense>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(expenses).limit(limit).offset(offset),
      db.select({ count: count() }).from(expenses)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getExpensesByJob(jobId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.jobId, jobId));
  }

  async getExpensesByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Expense>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(expenses).where(eq(expenses.jobId, jobId)).limit(limit).offset(offset),
      db.select({ count: count() }).from(expenses).where(eq(expenses.jobId, jobId))
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const result = await db.update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return result[0];
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  async createMileageLog(insertLog: InsertMileageLog): Promise<MileageLog> {
    const result = await db.insert(mileageLogs).values(insertLog).returning();
    return result[0];
  }

  async getMileageLog(id: string): Promise<MileageLog | undefined> {
    const result = await db.select().from(mileageLogs).where(eq(mileageLogs.id, id)).limit(1);
    return result[0];
  }

  async getAllMileageLogs(): Promise<MileageLog[]> {
    return await db.select().from(mileageLogs);
  }

  async getMileageLogsPaginated(params: PaginationParams): Promise<PaginatedResult<MileageLog>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(mileageLogs).limit(limit).offset(offset),
      db.select({ count: count() }).from(mileageLogs)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getMileageLogsByDateRange(startDate: Date, endDate: Date): Promise<MileageLog[]> {
    return await db.select().from(mileageLogs)
      .where(
        and(
          gte(mileageLogs.date, startDate),
          lte(mileageLogs.date, endDate)
        )
      );
  }

  async updateMileageLog(id: string, updates: Partial<InsertMileageLog>): Promise<MileageLog | undefined> {
    const result = await db.update(mileageLogs)
      .set(updates)
      .where(eq(mileageLogs.id, id))
      .returning();
    return result[0];
  }

  async deleteMileageLog(id: string): Promise<boolean> {
    const result = await db.delete(mileageLogs).where(eq(mileageLogs.id, id)).returning();
    return result.length > 0;
  }

  async createReportTemplate(insertTemplate: InsertReportTemplate): Promise<ReportTemplate> {
    const result = await db.insert(reportTemplates).values(insertTemplate).returning();
    return result[0];
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const result = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id)).limit(1);
    return result[0];
  }

  async getAllReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates);
  }

  async updateReportTemplate(id: string, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    const result = await db.update(reportTemplates)
      .set(updates)
      .where(eq(reportTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteReportTemplate(id: string): Promise<boolean> {
    const result = await db.delete(reportTemplates).where(eq(reportTemplates.id, id)).returning();
    return result.length > 0;
  }

  async getReportTemplatesByCategory(category: string): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates).where(eq(reportTemplates.category, category as any));
  }

  async getPublishedReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates).where(eq(reportTemplates.status, 'published'));
  }

  async publishReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const result = await db.update(reportTemplates)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(reportTemplates.id, id))
      .returning();
    return result[0];
  }

  async duplicateReportTemplate(id: string, newName: string): Promise<ReportTemplate> {
    const original = await this.getReportTemplate(id);
    if (!original) {
      throw new Error('Template not found');
    }
    
    const duplicate = await db.insert(reportTemplates)
      .values({
        name: newName,
        description: original.description,
        category: original.category,
        status: 'draft',
        isDefault: false,
        createdBy: original.createdBy,
      })
      .returning();
    
    // Duplicate sections and fields
    const sections = await this.getTemplateSections(id);
    for (const section of sections) {
      const newSection = await this.createTemplateSection({
        templateId: duplicate[0].id,
        parentSectionId: section.parentSectionId as string | null,
        title: section.title,
        description: section.description,
        orderIndex: section.orderIndex,
        isRepeatable: section.isRepeatable,
        minRepetitions: section.minRepetitions,
        maxRepetitions: section.maxRepetitions,
      });
      
      const fields = await this.getTemplateFields(section.id);
      for (const field of fields) {
        await this.createTemplateField({
          sectionId: newSection.id,
          fieldType: field.fieldType,
          label: field.label,
          description: field.description,
          placeholder: field.placeholder,
          orderIndex: field.orderIndex,
          isRequired: field.isRequired,
          isVisible: field.isVisible,
          defaultValue: field.defaultValue,
          configuration: field.configuration as any,
          validationRules: field.validationRules as any,
          conditionalLogic: field.conditionalLogic as any,
        });
      }
    }
    
    return duplicate[0];
  }

  // Template Sections
  async createTemplateSection(section: InsertTemplateSection): Promise<TemplateSection> {
    const result = await db.insert(templateSections).values(section as any).returning();
    return result[0];
  }

  async getTemplateSection(id: string): Promise<TemplateSection | undefined> {
    const result = await db.select().from(templateSections).where(eq(templateSections.id, id)).limit(1);
    return result[0];
  }

  async getTemplateSections(templateId: string): Promise<TemplateSection[]> {
    return await db.select()
      .from(templateSections)
      .where(eq(templateSections.templateId, templateId))
      .orderBy(templateSections.orderIndex);
  }

  async updateTemplateSection(id: string, updates: Partial<InsertTemplateSection>): Promise<TemplateSection | undefined> {
    const result = await db.update(templateSections)
      .set(updates)
      .where(eq(templateSections.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplateSection(id: string): Promise<boolean> {
    const result = await db.delete(templateSections).where(eq(templateSections.id, id)).returning();
    return result.length > 0;
  }

  async reorderTemplateSections(templateId: string, sectionIds: string[]): Promise<boolean> {
    const updates = sectionIds.map((sectionId, index) => 
      db.update(templateSections)
        .set({ orderIndex: index })
        .where(and(
          eq(templateSections.id, sectionId),
          eq(templateSections.templateId, templateId)
        ))
    );
    
    await Promise.all(updates);
    return true;
  }

  // Template Fields
  async createTemplateField(field: InsertTemplateField): Promise<TemplateField> {
    const result = await db.insert(templateFields).values(field).returning();
    return result[0];
  }

  async getTemplateField(id: string): Promise<TemplateField | undefined> {
    const result = await db.select().from(templateFields).where(eq(templateFields.id, id)).limit(1);
    return result[0];
  }

  async getTemplateFields(sectionId: string): Promise<TemplateField[]> {
    return await db.select()
      .from(templateFields)
      .where(eq(templateFields.sectionId, sectionId))
      .orderBy(templateFields.orderIndex);
  }

  async updateTemplateField(id: string, updates: Partial<InsertTemplateField>): Promise<TemplateField | undefined> {
    const result = await db.update(templateFields)
      .set(updates)
      .where(eq(templateFields.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplateField(id: string): Promise<boolean> {
    const result = await db.delete(templateFields).where(eq(templateFields.id, id)).returning();
    return result.length > 0;
  }

  async reorderTemplateFields(sectionId: string, fieldIds: string[]): Promise<boolean> {
    const updates = fieldIds.map((fieldId, index) => 
      db.update(templateFields)
        .set({ orderIndex: index })
        .where(and(
          eq(templateFields.id, fieldId),
          eq(templateFields.sectionId, sectionId)
        ))
    );
    
    await Promise.all(updates);
    return true;
  }

  async createReportInstance(insertInstance: InsertReportInstance): Promise<ReportInstance> {
    const result = await db.insert(reportInstances).values(insertInstance).returning();
    const instance = result[0];

    await this.recalculateReportScore(instance.id);

    return instance;
  }

  async getReportInstance(id: string): Promise<ReportInstance | undefined> {
    const result = await db.select().from(reportInstances).where(eq(reportInstances.id, id)).limit(1);
    return result[0];
  }

  async getAllReportInstances(): Promise<ReportInstance[]> {
    return await db.select().from(reportInstances);
  }

  async getReportInstancesByJob(jobId: string): Promise<ReportInstance[]> {
    return await db.select().from(reportInstances).where(eq(reportInstances.jobId, jobId));
  }

  async getReportInstancesPaginated(params: PaginationParams): Promise<PaginatedResult<ReportInstance>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(reportInstances).limit(limit).offset(offset),
      db.select({ count: count() }).from(reportInstances)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateReportInstance(id: string, updates: Partial<InsertReportInstance>): Promise<ReportInstance | undefined> {
    const result = await db.update(reportInstances)
      .set(updates)
      .where(eq(reportInstances.id, id))
      .returning();
    return result[0];
  }

  async getReportInstancesByStatus(status: string): Promise<ReportInstance[]> {
    return await db.select().from(reportInstances).where(eq(reportInstances.status, status as any));
  }

  async submitReportInstance(id: string): Promise<ReportInstance | undefined> {
    const result = await db.update(reportInstances)
      .set({ status: 'submitted', submittedAt: new Date() })
      .where(eq(reportInstances.id, id))
      .returning();
    return result[0];
  }

  async approveReportInstance(id: string, approverId: string): Promise<ReportInstance | undefined> {
    const result = await db.update(reportInstances)
      .set({ 
        status: 'approved', 
        approvedAt: new Date(),
        approvedBy: approverId 
      })
      .where(eq(reportInstances.id, id))
      .returning();
    return result[0];
  }

  // Report Section Instances
  async createReportSectionInstance(instance: InsertReportSectionInstance): Promise<ReportSectionInstance> {
    const result = await db.insert(reportSectionInstances).values(instance).returning();
    return result[0];
  }

  async getReportSectionInstance(id: string): Promise<ReportSectionInstance | undefined> {
    const result = await db.select().from(reportSectionInstances).where(eq(reportSectionInstances.id, id)).limit(1);
    return result[0];
  }

  async getReportSectionInstances(reportId: string): Promise<ReportSectionInstance[]> {
    return await db.select()
      .from(reportSectionInstances)
      .where(eq(reportSectionInstances.reportInstanceId, reportId));
  }

  async deleteReportSectionInstance(id: string): Promise<boolean> {
    const result = await db.delete(reportSectionInstances).where(eq(reportSectionInstances.id, id)).returning();
    return result.length > 0;
  }

  // Report Field Values
  async createReportFieldValue(value: InsertReportFieldValue): Promise<ReportFieldValue> {
    const result = await db.insert(reportFieldValues).values(value as any).returning();
    return result[0];
  }

  async getReportFieldValue(id: string): Promise<ReportFieldValue | undefined> {
    const result = await db.select().from(reportFieldValues).where(eq(reportFieldValues.id, id)).limit(1);
    return result[0];
  }

  async getReportFieldValues(reportId: string): Promise<ReportFieldValue[]> {
    return await db.select()
      .from(reportFieldValues)
      .where(eq(reportFieldValues.reportInstanceId, reportId));
  }

  async getReportFieldValuesBySection(sectionInstanceId: string): Promise<ReportFieldValue[]> {
    return await db.select()
      .from(reportFieldValues)
      .where(eq(reportFieldValues.sectionInstanceId, sectionInstanceId));
  }

  async updateReportFieldValue(id: string, updates: Partial<InsertReportFieldValue>): Promise<ReportFieldValue | undefined> {
    const result = await db.update(reportFieldValues)
      .set(updates as any)
      .where(eq(reportFieldValues.id, id))
      .returning();
    return result[0];
  }

  async deleteReportFieldValue(id: string): Promise<boolean> {
    const result = await db.delete(reportFieldValues).where(eq(reportFieldValues.id, id)).returning();
    return result.length > 0;
  }

  async bulkSaveFieldValues(reportId: string, values: InsertReportFieldValue[]): Promise<ReportFieldValue[]> {
    if (values.length === 0) return [];
    
    // Delete existing values for this report
    await db.delete(reportFieldValues).where(eq(reportFieldValues.reportInstanceId, reportId));
    
    // Insert new values
    const result = await db.insert(reportFieldValues).values(values as any).returning();
    return result;
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const result = await db.insert(photos).values(insertPhoto).returning();
    return result[0];
  }

  async getPhoto(id: string): Promise<Photo | undefined> {
    const result = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
    return result[0];
  }

  async getAllPhotos(): Promise<Photo[]> {
    return await db.select().from(photos);
  }

  async getPhotosByJob(jobId: string): Promise<Photo[]> {
    return await db.select().from(photos).where(eq(photos.jobId, jobId));
  }

  async getPhotosByChecklistItem(checklistItemId: string): Promise<Photo[]> {
    return await db.select().from(photos).where(eq(photos.checklistItemId, checklistItemId));
  }

  async getPhotosByUser(userId: string): Promise<Photo[]> {
    const results = await db.select({ photo: photos })
      .from(photos)
      .leftJoin(jobs, eq(photos.jobId, jobs.id))
      .where(eq(jobs.createdBy, userId))
      .orderBy(desc(photos.uploadedAt));
    
    return results.map(r => r.photo).filter((p): p is Photo => p !== null);
  }

  async getPhotosPaginated(params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(photos).limit(limit).offset(offset),
      db.select({ count: count() }).from(photos)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(photos).where(eq(photos.jobId, jobId)).limit(limit).offset(offset),
      db.select({ count: count() }).from(photos).where(eq(photos.jobId, jobId))
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosByChecklistItemPaginated(checklistItemId: string, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(photos).where(eq(photos.checklistItemId, checklistItemId)).limit(limit).offset(offset),
      db.select({ count: count() }).from(photos).where(eq(photos.checklistItemId, checklistItemId))
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosFilteredPaginated(filters: PhotoFilterParams, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    const { jobId, checklistItemId, tags, dateFrom, dateTo } = filters;
    
    const conditions = [];
    
    if (jobId) {
      conditions.push(eq(photos.jobId, jobId));
    }
    
    if (checklistItemId) {
      conditions.push(eq(photos.checklistItemId, checklistItemId));
    }
    
    if (tags && tags.length > 0) {
      conditions.push(sql`${photos.tags} @> ${tags}`);
    }
    
    if (dateFrom) {
      conditions.push(gte(photos.uploadedAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(photos.uploadedAt, toDate));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(photos).where(whereClause).limit(limit).offset(offset),
      db.select({ count: count() }).from(photos).where(whereClause)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosCursorPaginated(filters: PhotoFilterParams, params: PhotoCursorPaginationParams): Promise<CursorPaginatedResult<Photo>> {
    const { cursor, limit, sortOrder } = params;
    const { jobId, checklistItemId, tags, dateFrom, dateTo } = filters;
    
    const conditions = [];
    
    // Add filter conditions
    if (jobId) {
      conditions.push(eq(photos.jobId, jobId));
    }
    
    if (checklistItemId) {
      conditions.push(eq(photos.checklistItemId, checklistItemId));
    }
    
    if (tags && tags.length > 0) {
      conditions.push(sql`${photos.tags} @> ${tags}`);
    }
    
    if (dateFrom) {
      conditions.push(gte(photos.uploadedAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(photos.uploadedAt, toDate));
    }
    
    // Add cursor condition for pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (sortOrder === 'desc') {
        conditions.push(lt(photos.uploadedAt, cursorDate));
      } else {
        conditions.push(gt(photos.uploadedAt, cursorDate));
      }
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Fetch limit + 1 to determine if there are more results
    const results = await db.select()
      .from(photos)
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(photos.uploadedAt) : asc(photos.uploadedAt))
      .limit(limit + 1);
    
    // Determine if there are more results
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    
    // Get next cursor from last item's uploadedAt
    const nextCursor = hasMore && data.length > 0 
      ? data[data.length - 1].uploadedAt.toISOString()
      : null;
    
    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async getPhotosCursorPaginatedByUser(userId: string, filters: PhotoFilterParams, params: PhotoCursorPaginationParams): Promise<CursorPaginatedResult<Photo>> {
    const { cursor, limit, sortOrder } = params;
    const { jobId, checklistItemId, tags, dateFrom, dateTo } = filters;
    
    // Build conditions for filtering photos
    const conditions = [];
    
    // Filter by user ownership through jobs table
    conditions.push(eq(jobs.createdBy, userId));
    
    // Add other filter conditions
    if (jobId) {
      conditions.push(eq(photos.jobId, jobId));
    }
    
    if (checklistItemId) {
      conditions.push(eq(photos.checklistItemId, checklistItemId));
    }
    
    if (tags && tags.length > 0) {
      conditions.push(sql`${photos.tags} @> ${tags}`);
    }
    
    if (dateFrom) {
      conditions.push(gte(photos.uploadedAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(photos.uploadedAt, toDate));
    }
    
    // Add cursor condition for pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (sortOrder === 'desc') {
        conditions.push(lt(photos.uploadedAt, cursorDate));
      } else {
        conditions.push(gt(photos.uploadedAt, cursorDate));
      }
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Fetch with join to jobs table for ownership filtering
    const results = await db.select({ photo: photos })
      .from(photos)
      .leftJoin(jobs, eq(photos.jobId, jobs.id))
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(photos.uploadedAt) : asc(photos.uploadedAt))
      .limit(limit + 1);
    
    // Extract photos from joined results
    const photoResults = results.map(r => r.photo).filter((p): p is Photo => p !== null);
    
    // Determine if there are more results
    const hasMore = photoResults.length > limit;
    const data = hasMore ? photoResults.slice(0, limit) : photoResults;
    
    // Get next cursor from last item's uploadedAt
    const nextCursor = hasMore && data.length > 0 
      ? data[data.length - 1].uploadedAt.toISOString()
      : null;
    
    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async updatePhoto(id: string, updates: Partial<InsertPhoto>): Promise<Photo | undefined> {
    const result = await db.update(photos)
      .set(updates)
      .where(eq(photos.id, id))
      .returning();
    return result[0];
  }

  async deletePhoto(id: string): Promise<boolean> {
    const result = await db.delete(photos).where(eq(photos.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeletePhotos(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(photos).where(inArray(photos.id, ids)).returning();
    return result.length;
  }

  async bulkUpdatePhotoTags(
    ids: string[],
    mode: 'add' | 'remove' | 'replace',
    tags: string[]
  ): Promise<number> {
    if (ids.length === 0) return 0;

    let updateSql;
    
    switch (mode) {
      case 'add':
        updateSql = sql`ARRAY(SELECT DISTINCT unnest(COALESCE(${photos.tags}, ARRAY[]::text[]) || ${tags}::text[]))`;
        break;
      case 'remove':
        updateSql = sql`ARRAY(SELECT unnest(COALESCE(${photos.tags}, ARRAY[]::text[])) EXCEPT SELECT unnest(${tags}::text[]))`;
        break;
      case 'replace':
        updateSql = tags;
        break;
    }

    const result = await db.update(photos)
      .set({ tags: updateSql })
      .where(inArray(photos.id, ids))
      .returning();
    
    return result.length;
  }

  async createForecast(insertForecast: InsertForecast): Promise<Forecast> {
    const result = await db.insert(forecasts).values(insertForecast as any).returning();
    return result[0];
  }

  async getForecast(id: string): Promise<Forecast | undefined> {
    const result = await db.select().from(forecasts).where(eq(forecasts.id, id)).limit(1);
    return result[0];
  }

  async getAllForecasts(): Promise<Forecast[]> {
    return await db.select().from(forecasts);
  }

  async getForecastsByJob(jobId: string): Promise<Forecast[]> {
    return await db.select().from(forecasts).where(eq(forecasts.jobId, jobId));
  }

  async updateForecast(id: string, updates: Partial<InsertForecast>): Promise<Forecast | undefined> {
    const result = await db.update(forecasts)
      .set(updates as any)
      .where(eq(forecasts.id, id))
      .returning();
    return result[0];
  }

  async deleteForecast(id: string): Promise<boolean> {
    const result = await db.delete(forecasts).where(eq(forecasts.id, id)).returning();
    return result.length > 0;
  }

  async generateChecklistFromTemplate(jobId: string, inspectionType: string): Promise<ChecklistItem[]> {
    const { getTemplateForInspectionType } = await import('@shared/checklistTemplates');
    const template = getTemplateForInspectionType(inspectionType);
    
    if (!template) {
      // No template for this inspection type, return empty array
      return [];
    }

    const itemsToCreate = template.items.map(item => ({
      jobId,
      itemNumber: item.itemNumber,
      title: item.title,
      completed: false,
      status: 'pending' as const,
      notes: item.defaultNotes || null,
      photoCount: 0,
      photoRequired: item.photoRequired,
      voiceNoteUrl: null,
      voiceNoteDuration: null,
    }));

    const result = await db.insert(checklistItems).values(itemsToCreate).returning();
    return result;
  }

  async createChecklistItem(insertItem: InsertChecklistItem): Promise<ChecklistItem> {
    const result = await db.insert(checklistItems).values(insertItem).returning();
    const item = result[0];

    const instances = await this.getReportInstancesByJob(insertItem.jobId);
    for (const instance of instances) {
      await this.recalculateReportScore(instance.id);
    }

    return item;
  }

  async getChecklistItem(id: string): Promise<ChecklistItem | undefined> {
    const result = await db.select().from(checklistItems).where(eq(checklistItems.id, id)).limit(1);
    return result[0];
  }

  async getChecklistItemsByJob(jobId: string): Promise<ChecklistItem[]> {
    return await db.select().from(checklistItems)
      .where(eq(checklistItems.jobId, jobId))
      .orderBy(asc(checklistItems.itemNumber));
  }

  async getChecklistItemsByJobs(jobIds: string[]): Promise<Map<string, ChecklistItem[]>> {
    if (jobIds.length === 0) {
      return new Map();
    }
    
    const items = await db.select().from(checklistItems)
      .where(inArray(checklistItems.jobId, jobIds))
      .orderBy(asc(checklistItems.itemNumber));
    
    const itemsByJob = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      if (!itemsByJob.has(item.jobId)) {
        itemsByJob.set(item.jobId, []);
      }
      itemsByJob.get(item.jobId)!.push(item);
    }
    
    return itemsByJob;
  }

  async updateChecklistItem(id: string, updates: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined> {
    const result = await db.update(checklistItems)
      .set(updates)
      .where(eq(checklistItems.id, id))
      .returning();
    
    const updated = result[0];
    if (!updated) return undefined;

    const instances = await this.getReportInstancesByJob(updated.jobId);
    for (const instance of instances) {
      await this.recalculateReportScore(instance.id);
    }

    return updated;
  }

  async deleteChecklistItem(id: string): Promise<boolean> {
    const result = await db.delete(checklistItems).where(eq(checklistItems.id, id)).returning();
    return result.length > 0;
  }

  async createComplianceRule(insertRule: InsertComplianceRule): Promise<ComplianceRule> {
    const result = await db.insert(complianceRules).values(insertRule).returning();
    return result[0];
  }

  async getComplianceRules(): Promise<ComplianceRule[]> {
    return await db.select().from(complianceRules).where(eq(complianceRules.isActive, true));
  }

  async updateComplianceRule(id: string, updates: Partial<InsertComplianceRule>): Promise<ComplianceRule | undefined> {
    const result = await db.update(complianceRules)
      .set(updates)
      .where(eq(complianceRules.id, id))
      .returning();
    return result[0];
  }

  async deleteComplianceRule(id: string): Promise<boolean> {
    const result = await db.delete(complianceRules).where(eq(complianceRules.id, id)).returning();
    return result.length > 0;
  }

  async getComplianceHistory(entityType?: string, entityId?: string): Promise<ComplianceHistory[]> {
    const conditions = [];
    
    if (entityType) {
      conditions.push(eq(complianceHistory.entityType, entityType));
    }
    
    if (entityId) {
      conditions.push(eq(complianceHistory.entityId, entityId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    return await db.select().from(complianceHistory)
      .where(whereClause)
      .orderBy(desc(complianceHistory.evaluatedAt));
  }

  async createComplianceHistoryEntry(insertEntry: InsertComplianceHistory): Promise<ComplianceHistory> {
    const result = await db.insert(complianceHistory).values(insertEntry).returning();
    return result[0];
  }

  async getCalendarPreferences(): Promise<CalendarPreference[]> {
    return await db.select().from(calendarPreferences);
  }

  async saveCalendarPreferences(preferences: InsertCalendarPreference[]): Promise<CalendarPreference[]> {
    const savedPreferences: CalendarPreference[] = [];
    
    for (const pref of preferences) {
      const existing = await db.select().from(calendarPreferences)
        .where(eq(calendarPreferences.calendarId, pref.calendarId))
        .limit(1);
      
      if (existing.length > 0) {
        const result = await db.update(calendarPreferences)
          .set(pref)
          .where(eq(calendarPreferences.id, existing[0].id))
          .returning();
        savedPreferences.push(result[0]);
      } else {
        const result = await db.insert(calendarPreferences)
          .values(pref)
          .returning();
        savedPreferences.push(result[0]);
      }
    }
    
    return savedPreferences;
  }

  async updateCalendarToggle(calendarId: string, isEnabled: boolean): Promise<CalendarPreference | undefined> {
    const result = await db.update(calendarPreferences)
      .set({ isEnabled })
      .where(eq(calendarPreferences.calendarId, calendarId))
      .returning();
    return result[0];
  }

  async deleteCalendarPreference(calendarId: string): Promise<boolean> {
    const result = await db.delete(calendarPreferences)
      .where(eq(calendarPreferences.calendarId, calendarId))
      .returning();
    return result.length > 0;
  }

  async createGoogleEvent(event: InsertGoogleEvent): Promise<GoogleEvent> {
    const result = await db.insert(googleEvents).values(event).returning();
    return result[0];
  }

  async getGoogleEvent(id: string): Promise<GoogleEvent | undefined> {
    const result = await db.select().from(googleEvents).where(eq(googleEvents.id, id)).limit(1);
    return result[0];
  }

  async getGoogleEventByGoogleId(googleEventId: string, calendarId: string): Promise<GoogleEvent | undefined> {
    const result = await db.select().from(googleEvents)
      .where(
        and(
          eq(googleEvents.googleEventId, googleEventId),
          eq(googleEvents.googleCalendarId, calendarId)
        )
      )
      .limit(1);
    return result[0];
  }

  async getGoogleEventsByDateRange(startDate: Date, endDate: Date): Promise<GoogleEvent[]> {
    return await db.select().from(googleEvents)
      .where(
        and(
          lte(googleEvents.startTime, endDate),
          gte(googleEvents.endTime, startDate)
        )
      );
  }

  async updateGoogleEvent(id: string, event: Partial<InsertGoogleEvent>): Promise<GoogleEvent | undefined> {
    const result = await db.update(googleEvents)
      .set(event)
      .where(eq(googleEvents.id, id))
      .returning();
    return result[0];
  }

  async deleteGoogleEvent(id: string): Promise<boolean> {
    const result = await db.delete(googleEvents).where(eq(googleEvents.id, id)).returning();
    return result.length > 0;
  }

  async markGoogleEventAsConverted(id: string, jobId: string): Promise<GoogleEvent | undefined> {
    const result = await db.update(googleEvents)
      .set({ isConverted: true, convertedToJobId: jobId })
      .where(eq(googleEvents.id, id))
      .returning();
    return result[0];
  }

  async getTodaysUnconvertedGoogleEvents(): Promise<GoogleEvent[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await db.select().from(googleEvents)
      .where(
        and(
          gte(googleEvents.startTime, startOfDay),
          lte(googleEvents.startTime, endOfDay),
          eq(googleEvents.isConverted, false)
        )
      )
      .orderBy(asc(googleEvents.startTime));
  }

  async getJobsByStatus(statuses: string[]): Promise<Job[]> {
    return await db.select().from(jobs)
      .where(inArray(jobs.status, statuses))
      .orderBy(desc(jobs.scheduledDate));
  }

  async getTodaysJobsByStatus(statuses: string[]): Promise<Job[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await db.select().from(jobs)
      .where(
        and(
          inArray(jobs.status, statuses),
          gte(jobs.scheduledDate, startOfDay),
          lte(jobs.scheduledDate, endOfDay)
        )
      )
      .orderBy(asc(jobs.scheduledDate));
  }

  async recalculateReportScore(reportInstanceId: string): Promise<void> {
    const instance = await this.getReportInstance(reportInstanceId);
    if (!instance) return;

    const items = await this.getChecklistItemsByJob(instance.jobId);
    const score = calculateScore(items);

    const scoreSummary: ScoreSummary = {
      grade: score.grade,
      passRate: score.passRate,
      failRate: score.failRate,
      completionRate: score.completionRate,
      totalItems: score.totalItems,
      passedItems: score.passedItems,
      failedItems: score.failedItems,
      updatedAt: new Date().toISOString(),
    };

    await this.updateReportInstance(reportInstanceId, {
      scoreSummary: JSON.stringify(scoreSummary),
    });
  }

  async createUploadSession(data: InsertUploadSession): Promise<UploadSession> {
    const result = await db.insert(uploadSessions).values(data).returning();
    return result[0];
  }

  async getUploadSessions(): Promise<UploadSession[]> {
    return await db.select().from(uploadSessions).orderBy(desc(uploadSessions.timestamp));
  }

  async acknowledgeUploadSession(id: string): Promise<void> {
    await db.update(uploadSessions)
      .set({ 
        acknowledged: true, 
        acknowledgedAt: new Date() 
      })
      .where(eq(uploadSessions.id, id));
  }

  async getDashboardSummary(): Promise<any> {
    const getTierColor = (tier: string): string => {
      const colors: Record<string, string> = {
        'Elite': '#0B7285',
        'Excellent': '#2E8B57',
        'Very Good': '#3FA34D',
        'Good': '#A0C34E',
        'Passing': '#FFC107',
        'Failing': '#DC3545',
      };
      return colors[tier] || '#6C757D';
    };

    const overallStats = await db.select({
      totalInspections: count(jobs.id),
      averageACH50: sql<number>`AVG(${forecasts.actualACH50})`,
      eliteCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} <= 1.0 THEN 1 ELSE 0 END)`,
      excellentCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 1.0 AND ${forecasts.actualACH50} <= 1.5 THEN 1 ELSE 0 END)`,
      veryGoodCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 1.5 AND ${forecasts.actualACH50} <= 2.0 THEN 1 ELSE 0 END)`,
      goodCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 2.0 AND ${forecasts.actualACH50} <= 2.5 THEN 1 ELSE 0 END)`,
      passingCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 2.5 AND ${forecasts.actualACH50} <= 3.0 THEN 1 ELSE 0 END)`,
      failingCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 3.0 THEN 1 ELSE 0 END)`,
      passCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} <= 3.0 THEN 1 ELSE 0 END)`,
      failCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 3.0 THEN 1 ELSE 0 END)`,
    })
      .from(jobs)
      .innerJoin(forecasts, eq(jobs.id, forecasts.jobId))
      .where(and(
        eq(jobs.status, 'completed'),
        sql`${forecasts.actualACH50} IS NOT NULL`
      ));

    const stats = overallStats[0];
    const totalInspections = Number(stats.totalInspections) || 0;

    if (totalInspections === 0) {
      return {
        totalInspections: 0,
        averageACH50: 0,
        tierDistribution: [],
        passRate: 0,
        failRate: 0,
        tax45LEligibleCount: 0,
        totalPotentialTaxCredits: 0,
        monthlyHighlights: [],
      };
    }

    const averageACH50 = Number(stats.averageACH50) || 0;
    const passCount = Number(stats.passCount) || 0;
    const failCount = Number(stats.failCount) || 0;

    const tierDistribution = [
      { tier: 'Elite', count: Number(stats.eliteCount) || 0, percentage: ((Number(stats.eliteCount) || 0) / totalInspections) * 100, color: getTierColor('Elite') },
      { tier: 'Excellent', count: Number(stats.excellentCount) || 0, percentage: ((Number(stats.excellentCount) || 0) / totalInspections) * 100, color: getTierColor('Excellent') },
      { tier: 'Very Good', count: Number(stats.veryGoodCount) || 0, percentage: ((Number(stats.veryGoodCount) || 0) / totalInspections) * 100, color: getTierColor('Very Good') },
      { tier: 'Good', count: Number(stats.goodCount) || 0, percentage: ((Number(stats.goodCount) || 0) / totalInspections) * 100, color: getTierColor('Good') },
      { tier: 'Passing', count: Number(stats.passingCount) || 0, percentage: ((Number(stats.passingCount) || 0) / totalInspections) * 100, color: getTierColor('Passing') },
      { tier: 'Failing', count: Number(stats.failingCount) || 0, percentage: ((Number(stats.failingCount) || 0) / totalInspections) * 100, color: getTierColor('Failing') },
    ];

    const passRate = (passCount / totalInspections) * 100;
    const failRate = (failCount / totalInspections) * 100;
    const tax45LEligibleCount = passCount;
    const totalPotentialTaxCredits = tax45LEligibleCount * 2000;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyStats = await db.select({
      monthlyCount: count(jobs.id),
      bestACH50: sql<number>`MIN(${forecasts.actualACH50})`,
      monthlyPassCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} <= 3.0 THEN 1 ELSE 0 END)`,
    })
      .from(jobs)
      .innerJoin(forecasts, eq(jobs.id, forecasts.jobId))
      .where(and(
        eq(jobs.status, 'completed'),
        sql`${forecasts.actualACH50} IS NOT NULL`,
        gte(jobs.completedDate, startOfMonth)
      ));

    const monthData = monthlyStats[0];
    const monthlyCount = Number(monthData.monthlyCount) || 0;
    const monthlyHighlights = [];

    if (monthlyCount > 0) {
      const bestThisMonth = Number(monthData.bestACH50) || 0;
      monthlyHighlights.push({
        label: 'Best Performance This Month',
        value: `${bestThisMonth.toFixed(2)} ACH50`,
        type: 'success',
      });

      monthlyHighlights.push({
        label: 'Inspections This Month',
        value: monthlyCount,
        type: 'info',
      });

      const monthlyPassCount = Number(monthData.monthlyPassCount) || 0;
      const monthlyPassRate = (monthlyPassCount / monthlyCount) * 100;
      monthlyHighlights.push({
        label: 'Monthly Pass Rate',
        value: `${monthlyPassRate.toFixed(1)}%`,
        type: monthlyPassRate >= 80 ? 'success' : 'warning',
      });
    }

    return {
      totalInspections,
      averageACH50,
      tierDistribution,
      passRate,
      failRate,
      tax45LEligibleCount,
      totalPotentialTaxCredits,
      monthlyHighlights,
    };
  }

  async getBuilderLeaderboard(): Promise<any[]> {
    const calculateTier = (ach50: number): string => {
      if (ach50 <= 1.0) return 'Elite';
      if (ach50 <= 1.5) return 'Excellent';
      if (ach50 <= 2.0) return 'Very Good';
      if (ach50 <= 2.5) return 'Good';
      if (ach50 <= 3.0) return 'Passing';
      return 'Failing';
    };

    const getTierColor = (tier: string): string => {
      const colors: Record<string, string> = {
        'Elite': '#0B7285',
        'Excellent': '#2E8B57',
        'Very Good': '#3FA34D',
        'Good': '#A0C34E',
        'Passing': '#FFC107',
        'Failing': '#DC3545',
      };
      return colors[tier] || '#6C757D';
    };

    const builderStats = await db
      .select({
        builderId: builders.id,
        builderName: builders.name,
        totalJobs: count(jobs.id),
        averageACH50: sql<number>`AVG(${forecasts.actualACH50})`,
        bestACH50: sql<number>`MIN(${forecasts.actualACH50})`,
        passCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} <= 3.0 THEN 1 ELSE 0 END)`,
        eliteCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} <= 1.0 THEN 1 ELSE 0 END)`,
        excellentCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 1.0 AND ${forecasts.actualACH50} <= 1.5 THEN 1 ELSE 0 END)`,
        veryGoodCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 1.5 AND ${forecasts.actualACH50} <= 2.0 THEN 1 ELSE 0 END)`,
        goodCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 2.0 AND ${forecasts.actualACH50} <= 2.5 THEN 1 ELSE 0 END)`,
        passingCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 2.5 AND ${forecasts.actualACH50} <= 3.0 THEN 1 ELSE 0 END)`,
        failingCount: sql<number>`SUM(CASE WHEN ${forecasts.actualACH50} > 3.0 THEN 1 ELSE 0 END)`,
        latestCompletedDate: sql<Date | null>`MAX(${jobs.completedDate})`,
      })
      .from(builders)
      .leftJoin(jobs, and(
        eq(builders.id, jobs.builderId),
        eq(jobs.status, 'completed')
      ))
      .leftJoin(forecasts, and(
        eq(jobs.id, forecasts.jobId),
        sql`${forecasts.actualACH50} IS NOT NULL`
      ))
      .groupBy(builders.id, builders.name);

    const latestACH50ByBuilder = await db
      .select({
        builderId: jobs.builderId,
        latestACH50: forecasts.actualACH50,
      })
      .from(jobs)
      .innerJoin(forecasts, eq(jobs.id, forecasts.jobId))
      .where(and(
        eq(jobs.status, 'completed'),
        sql`${forecasts.actualACH50} IS NOT NULL`,
        sql`${jobs.completedDate} IN (
          SELECT MAX(j2.completed_date)
          FROM jobs j2
          INNER JOIN forecasts f2 ON j2.id = f2.job_id
          WHERE j2.builder_id = ${jobs.builderId}
            AND j2.status = 'completed'
            AND f2.actual_ach50 IS NOT NULL
        )`
      ));

    const latestACH50Map = new Map<string, number>();
    latestACH50ByBuilder.forEach(row => {
      if (row.builderId && row.latestACH50) {
        latestACH50Map.set(row.builderId, Number(row.latestACH50));
      }
    });

    const leaderboard = builderStats
      .map(builder => {
        const totalJobs = Number(builder.totalJobs) || 0;
        
        if (totalJobs === 0) {
          return null;
        }

        const averageACH50 = Number(builder.averageACH50) || 0;
        const tier = calculateTier(averageACH50);
        const passCount = Number(builder.passCount) || 0;
        const passRate = (passCount / totalJobs) * 100;
        const bestACH50 = Number(builder.bestACH50) || 0;
        const latestACH50 = latestACH50Map.get(builder.builderId) || null;

        const tierDistribution = [
          { tier: 'Elite', count: Number(builder.eliteCount) || 0, percentage: ((Number(builder.eliteCount) || 0) / totalJobs) * 100, color: getTierColor('Elite') },
          { tier: 'Excellent', count: Number(builder.excellentCount) || 0, percentage: ((Number(builder.excellentCount) || 0) / totalJobs) * 100, color: getTierColor('Excellent') },
          { tier: 'Very Good', count: Number(builder.veryGoodCount) || 0, percentage: ((Number(builder.veryGoodCount) || 0) / totalJobs) * 100, color: getTierColor('Very Good') },
          { tier: 'Good', count: Number(builder.goodCount) || 0, percentage: ((Number(builder.goodCount) || 0) / totalJobs) * 100, color: getTierColor('Good') },
          { tier: 'Passing', count: Number(builder.passingCount) || 0, percentage: ((Number(builder.passingCount) || 0) / totalJobs) * 100, color: getTierColor('Passing') },
          { tier: 'Failing', count: Number(builder.failingCount) || 0, percentage: ((Number(builder.failingCount) || 0) / totalJobs) * 100, color: getTierColor('Failing') },
        ];

        return {
          builderId: builder.builderId,
          builderName: builder.builderName,
          averageACH50,
          tier,
          totalJobs,
          passRate,
          bestACH50,
          latestACH50,
          tierDistribution,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => a.averageACH50 - b.averageACH50);

    return leaderboard;
  }

  async getEmailPreferences(userId: string): Promise<EmailPreference | undefined> {
    const result = await db.select().from(emailPreferences).where(eq(emailPreferences.userId, userId)).limit(1);
    return result[0];
  }

  async createEmailPreferences(prefs: InsertEmailPreference): Promise<EmailPreference> {
    const result = await db.insert(emailPreferences).values(prefs).returning();
    return result[0];
  }

  async updateEmailPreferences(userId: string, prefs: Partial<InsertEmailPreference>): Promise<EmailPreference | undefined> {
    const result = await db
      .update(emailPreferences)
      .set({ ...prefs, updatedAt: new Date() })
      .where(eq(emailPreferences.userId, userId))
      .returning();
    return result[0];
  }

  async getEmailPreferencesByToken(token: string): Promise<EmailPreference | undefined> {
    const result = await db.select().from(emailPreferences).where(eq(emailPreferences.unsubscribeToken, token)).limit(1);
    return result[0];
  }

  async generateUnsubscribeToken(userId: string): Promise<string> {
    // Generate a unique token for unsubscribe
    const token = `unsub_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await db
      .update(emailPreferences)
      .set({ unsubscribeToken: token, updatedAt: new Date() })
      .where(eq(emailPreferences.userId, userId));
    return token;
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getAuditLogs(params: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: AuditLog[], total: number }> {
    const { limit = 50, offset = 0, userId, action, resourceType, startDate, endDate } = params;
    let conditions = [];
    
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
    if (startDate) conditions.push(gte(auditLogs.timestamp, startDate));
    if (endDate) conditions.push(lte(auditLogs.timestamp, endDate));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);
    
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);
    
    return { logs, total: Number(totalCount) };
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements).orderBy(achievements.name);
  }

  async getAchievement(id: string): Promise<Achievement | undefined> {
    const result = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1);
    return result[0];
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.earnedAt));
  }

  async getUserAchievementWithDetails(userId: string): Promise<Array<UserAchievement & { achievement: Achievement }>> {
    const result = await db
      .select({
        id: userAchievements.id,
        userId: userAchievements.userId,
        achievementId: userAchievements.achievementId,
        earnedAt: userAchievements.earnedAt,
        progress: userAchievements.progress,
        metadata: userAchievements.metadata,
        achievement: achievements,
      })
      .from(userAchievements)
      .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.earnedAt));
    
    return result.map(row => ({
      ...row,
      achievement: row.achievement!,
    }));
  }

  async awardAchievement(userId: string, achievementId: string, metadata?: any): Promise<UserAchievement> {
    // Check if already awarded
    const existing = await db
      .select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    const [userAchievement] = await db
      .insert(userAchievements)
      .values({
        userId,
        achievementId,
        progress: 100,
        metadata,
      })
      .returning();
    
    return userAchievement;
  }

  async updateUserAchievementProgress(userId: string, achievementId: string, progress: number): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db
      .update(userAchievements)
      .set({ progress })
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ))
      .returning();
    
    return userAchievement;
  }

  async checkUserHasAchievement(userId: string, achievementId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ))
      .limit(1);
    
    return result.length > 0;
  }

  async seedAchievements(achievementDefs: InsertAchievement[]): Promise<void> {
    // Insert achievements if they don't exist
    for (const def of achievementDefs) {
      const existing = await db
        .select()
        .from(achievements)
        .where(eq(achievements.name, def.name))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(achievements).values(def);
      }
    }
  }

  async getBuilderAbbreviations(): Promise<BuilderAbbreviation[]> {
    return await db.select().from(builderAbbreviations);
  }

  async getBuilderAbbreviationsByBuilder(builderId: string): Promise<BuilderAbbreviation[]> {
    return await db.select().from(builderAbbreviations).where(eq(builderAbbreviations.builderId, builderId));
  }

  async createBuilderAbbreviation(abbr: InsertBuilderAbbreviation): Promise<BuilderAbbreviation> {
    const result = await db.insert(builderAbbreviations).values(abbr).returning();
    return result[0];
  }

  async deleteBuilderAbbreviation(id: string): Promise<boolean> {
    const result = await db.delete(builderAbbreviations).where(eq(builderAbbreviations.id, id)).returning();
    return result.length > 0;
  }

  async updateBuilderAbbreviation(id: string, data: Partial<InsertBuilderAbbreviation>): Promise<BuilderAbbreviation | undefined> {
    const result = await db.update(builderAbbreviations)
      .set(data)
      .where(eq(builderAbbreviations.id, id))
      .returning();
    return result[0];
  }

  async setPrimaryBuilderAbbreviation(builderId: string, abbreviationId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(builderAbbreviations)
        .set({ isPrimary: false })
        .where(eq(builderAbbreviations.builderId, builderId));
      
      await tx.update(builderAbbreviations)
        .set({ isPrimary: true })
        .where(eq(builderAbbreviations.id, abbreviationId));
    });
  }

  async seedBuilderAbbreviations(builderId: string, abbreviations: string[]): Promise<void> {
    for (const abbr of abbreviations) {
      await db.insert(builderAbbreviations)
        .values({ builderId, abbreviation: abbr, isPrimary: abbr === abbreviations[0] })
        .onConflictDoNothing();
    }
  }

  async getBuilderById(id: string): Promise<Builder | undefined> {
    return await this.getBuilder(id);
  }

  async getUnmatchedEvents(filters?: {
    status?: string;
    minConfidence?: number;
    maxConfidence?: number;
    startDate?: Date;
    endDate?: Date;
    builderMatch?: 'matched' | 'unmatched' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<{ events: UnmatchedCalendarEvent[], total: number }> {
    const { 
      status, 
      minConfidence, 
      maxConfidence, 
      startDate, 
      endDate, 
      builderMatch = 'all',
      limit = 50, 
      offset = 0 
    } = filters || {};
    
    const conditions = [];
    
    if (status) {
      conditions.push(eq(unmatchedCalendarEvents.status, status as any));
    }
    if (minConfidence !== undefined) {
      conditions.push(gte(unmatchedCalendarEvents.confidenceScore, minConfidence));
    }
    if (maxConfidence !== undefined) {
      conditions.push(lte(unmatchedCalendarEvents.confidenceScore, maxConfidence));
    }
    if (startDate) {
      conditions.push(gte(unmatchedCalendarEvents.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(unmatchedCalendarEvents.endTime, endDate));
    }
    
    // Builder match filtering using rawEventJson
    if (builderMatch === 'matched') {
      // Events where parsed.builderName is not 'Unknown' and not null
      conditions.push(
        sql`${unmatchedCalendarEvents.rawEventJson}::jsonb->'parsed'->>'builderName' IS NOT NULL AND ${unmatchedCalendarEvents.rawEventJson}::jsonb->'parsed'->>'builderName' != 'Unknown'`
      );
    } else if (builderMatch === 'unmatched') {
      // Events where parsed.builderName is 'Unknown' or null
      conditions.push(
        sql`(${unmatchedCalendarEvents.rawEventJson}::jsonb->'parsed'->>'builderName' IS NULL OR ${unmatchedCalendarEvents.rawEventJson}::jsonb->'parsed'->>'builderName' = 'Unknown')`
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [events, totalResult] = await Promise.all([
      db.select()
        .from(unmatchedCalendarEvents)
        .where(whereClause)
        .orderBy(desc(unmatchedCalendarEvents.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(unmatchedCalendarEvents)
        .where(whereClause)
    ]);
    
    return {
      events,
      total: totalResult[0].count,
    };
  }

  async getUnmatchedEvent(id: string): Promise<UnmatchedCalendarEvent | undefined> {
    const result = await db.select()
      .from(unmatchedCalendarEvents)
      .where(eq(unmatchedCalendarEvents.id, id))
      .limit(1);
    return result[0];
  }

  async createUnmatchedEvent(event: InsertUnmatchedCalendarEvent): Promise<UnmatchedCalendarEvent> {
    const result = await db.insert(unmatchedCalendarEvents)
      .values(event)
      .returning();
    return result[0];
  }

  async updateUnmatchedEventStatus(id: string, status: string, reviewedBy?: string): Promise<UnmatchedCalendarEvent | undefined> {
    const updates: any = { status };
    if (reviewedBy) {
      updates.reviewedBy = reviewedBy;
      updates.reviewedAt = new Date();
    }
    
    const result = await db.update(unmatchedCalendarEvents)
      .set(updates)
      .where(eq(unmatchedCalendarEvents.id, id))
      .returning();
    return result[0];
  }

  async approveUnmatchedEvent(id: string, builderId: string, inspectionType: string, reviewedBy: string): Promise<{ event: UnmatchedCalendarEvent, job: Job }> {
    const unmatchedEvent = await this.getUnmatchedEvent(id);
    if (!unmatchedEvent) {
      throw new Error('Unmatched event not found');
    }
    
    // Create job from approved event
    const jobData: InsertJob = {
      name: unmatchedEvent.title || 'Imported Inspection',
      contractor: 'TBD',
      builderId,
      inspectionType,
      address: unmatchedEvent.location || '',
      scheduledDate: unmatchedEvent.startTime,
      status: 'scheduled',
      createdBy: reviewedBy,
      notes: `Auto-created from calendar event: ${unmatchedEvent.title}`,
    };
    
    const job = await this.createJob(jobData);
    
    // Update event status
    const updatedEvent = await this.updateUnmatchedEventStatus(id, 'approved', reviewedBy);
    if (!updatedEvent) {
      throw new Error('Failed to update event status');
    }
    
    return { event: updatedEvent, job };
  }

  async rejectUnmatchedEvent(id: string, reviewedBy: string, reason?: string): Promise<UnmatchedCalendarEvent | undefined> {
    const updates: any = {
      status: 'rejected',
      reviewedBy,
      reviewedAt: new Date(),
    };
    
    // Store rejection reason in raw_event_json metadata
    const event = await this.getUnmatchedEvent(id);
    if (event && reason) {
      const rawEvent = typeof event.rawEventJson === 'string' 
        ? JSON.parse(event.rawEventJson) 
        : event.rawEventJson;
      rawEvent.rejectionReason = reason;
      updates.rawEventJson = rawEvent;
    }
    
    const result = await db.update(unmatchedCalendarEvents)
      .set(updates)
      .where(eq(unmatchedCalendarEvents.id, id))
      .returning();
    return result[0];
  }

  async createCalendarImportLog(log: InsertCalendarImportLog): Promise<CalendarImportLog> {
    const result = await db.insert(calendarImportLogs)
      .values(log)
      .returning();
    return result[0];
  }

  async getImportLogsByCalendar(calendarId: string, limit: number = 50): Promise<CalendarImportLog[]> {
    return await db.select()
      .from(calendarImportLogs)
      .where(eq(calendarImportLogs.calendarId, calendarId))
      .orderBy(desc(calendarImportLogs.importTimestamp))
      .limit(limit);
  }

  async getRecentImportLogs(limit: number = 50): Promise<CalendarImportLog[]> {
    return await db.select()
      .from(calendarImportLogs)
      .orderBy(desc(calendarImportLogs.importTimestamp))
      .limit(limit);
  }

  async getFilteredImportLogs(options: {
    limit?: number;
    offset?: number;
    calendarId?: string;
    hasErrors?: boolean;
  }): Promise<{ logs: CalendarImportLog[]; total: number }> {
    const { limit = 50, offset = 0, calendarId, hasErrors } = options;
    // Build filter conditions
    const conditions = [];
    
    if (calendarId) {
      conditions.push(eq(calendarImportLogs.calendarId, calendarId));
    }
    
    if (hasErrors) {
      conditions.push(sql`${calendarImportLogs.errors} IS NOT NULL AND ${calendarImportLogs.errors} != ''`);
    }
    
    // Build WHERE clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Fetch logs with filters
    const logs = await db.select()
      .from(calendarImportLogs)
      .where(whereClause)
      .orderBy(desc(calendarImportLogs.importTimestamp))
      .limit(limit)
      .offset(offset);
    
    // Get total count with same filters
    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(calendarImportLogs)
      .where(whereClause);
    
    const total = countResult[0]?.count || 0;
    
    return { logs, total };
  }
}

export const storage = new DatabaseStorage();
