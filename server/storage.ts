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
  type FieldDependency,
  type InsertFieldDependency,
  type ReportInstance,
  type InsertReportInstance,
  type ReportSectionInstance,
  type InsertReportSectionInstance,
  type ReportFieldValue,
  type InsertReportFieldValue,
  type PhotoAlbum,
  type InsertPhotoAlbum,
  type PhotoAlbumItem,
  type InsertPhotoAlbumItem,
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
  type PhotoUploadSession,
  type InsertPhotoUploadSession,
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
  type BlowerDoorTest,
  type InsertBlowerDoorTest,
  type DuctLeakageTest,
  type InsertDuctLeakageTest,
  type Invoice,
  type InsertInvoice,
  type Payment,
  type InsertPayment,
  type FinancialSettings,
  type InsertFinancialSettings,
  type TaxCreditProject,
  type InsertTaxCreditProject,
  type TaxCreditRequirement,
  type InsertTaxCreditRequirement,
  type TaxCreditDocument,
  type InsertTaxCreditDocument,
  type UnitCertification,
  type InsertUnitCertification,
  type Equipment,
  type InsertEquipment,
  type EquipmentCalibration,
  type InsertEquipmentCalibration,
  type EquipmentMaintenance,
  type InsertEquipmentMaintenance,
  type EquipmentCheckout,
  type InsertEquipmentCheckout,
  type QaInspectionScore,
  type InsertQaInspectionScore,
  type QaChecklist,
  type InsertQaChecklist,
  type QaChecklistItem,
  type InsertQaChecklistItem,
  type QaChecklistResponse,
  type InsertQaChecklistResponse,
  type QaPerformanceMetric,
  type InsertQaPerformanceMetric,
  type ScoreSummary,
  type Notification,
  type InsertNotification,
  type NotificationPreference,
  type InsertNotificationPreference,
  type InspectorWorkload,
  type InsertInspectorWorkload,
  type AssignmentHistory,
  type InsertAssignmentHistory,
  type InspectorPreferences,
  type InsertInspectorPreferences,
  type PendingCalendarEvent,
  type InsertPendingCalendarEvent,
  notifications,
  notificationPreferences,
  inspectorWorkload,
  assignmentHistory,
  inspectorPreferences,
  pendingCalendarEvents,
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
  mileageRoutePoints,
  reportTemplates,
  templateSections,
  templateFields,
  fieldDependencies,
  reportInstances,
  reportSectionInstances,
  reportFieldValues,
  photoAlbums,
  photoAlbumItems,
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
  photoUploadSessions,
  emailPreferences,
  auditLogs,
  achievements,
  userAchievements,
  builderAbbreviations,
  blowerDoorTests,
  ductLeakageTests,
  invoices,
  payments,
  financialSettings,
  taxCreditProjects,
  taxCreditRequirements,
  taxCreditDocuments,
  unitCertifications,
  equipment,
  equipmentCalibrations,
  equipmentMaintenance,
  equipmentCheckouts,
  qaInspectionScores,
  qaChecklists,
  qaChecklistItems,
  qaChecklistResponses,
  qaPerformanceMetrics,
} from "@shared/schema";
import { calculateScore } from "@shared/scoring";
import { type PaginationParams, type PaginatedResult, type PhotoFilterParams, type PhotoCursorPaginationParams, type CursorPaginationParams, type CursorPaginatedResult } from "@shared/pagination";
import { type UserRole } from "./permissions";
import { db } from "./db";
import { eq, and, or, gte, lte, gt, lt, inArray, desc, asc, sql, count, isNull } from "drizzle-orm";
import { serverLogger } from "./logger";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>; // Alias for getUser, used by audit logger
  getUserByEmail(email: string): Promise<User | undefined>; // Get user by email address
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: UserRole): Promise<User[]>;
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
  getScheduleEventsByDateRange(startDate: Date, endDate: Date, userId?: string, userRole?: UserRole): Promise<ScheduleEvent[]>;
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
  createMileageLogWithRoute(log: InsertMileageLog, routePoints: any[]): Promise<MileageLog>;
  getMileageLogRoute(logId: string): Promise<any[]>;
  updateMileageLogRoute(logId: string, points: any[]): Promise<void>;

  // Report Templates - Enhanced for visual designer
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  getAllReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplates(): Promise<ReportTemplate[]>;
  getActiveReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplatesByCategory(category: string): Promise<ReportTemplate[]>;
  getPublishedReportTemplates(): Promise<ReportTemplate[]>;
  updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string): Promise<boolean>;
  publishReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  duplicateReportTemplate(id: string, newName: string): Promise<ReportTemplate>;
  cloneReportTemplate(id: string, newName?: string): Promise<ReportTemplate>;
  archiveReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  getTemplateVersions(parentTemplateId: string): Promise<ReportTemplate[]>;

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

  // Field Dependencies for Conditional Logic
  createFieldDependency(dependency: InsertFieldDependency): Promise<FieldDependency>;
  getFieldDependency(id: string): Promise<FieldDependency | undefined>;
  getFieldDependencies(fieldId: string): Promise<FieldDependency[]>;
  getDependenciesByDependsOn(dependsOnFieldId: string): Promise<FieldDependency[]>;
  updateFieldDependency(id: string, dependency: Partial<InsertFieldDependency>): Promise<FieldDependency | undefined>;
  deleteFieldDependency(id: string): Promise<boolean>;
  deleteFieldDependencies(fieldId: string): Promise<boolean>;

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
  bulkMovePhotosToJob(photoIds: string[], jobId: string): Promise<number>;
  bulkUpdatePhotoFavorites(photoIds: string[], isFavorite: boolean): Promise<number>;
  
  // Photo albums
  createPhotoAlbum(album: InsertPhotoAlbum): Promise<PhotoAlbum>;
  getPhotoAlbum(id: string): Promise<PhotoAlbum | undefined>;
  getPhotoAlbums(): Promise<PhotoAlbum[]>;
  getPhotoAlbumsByUser(userId: string): Promise<PhotoAlbum[]>;
  updatePhotoAlbum(id: string, album: Partial<InsertPhotoAlbum>): Promise<PhotoAlbum | undefined>;
  deletePhotoAlbum(id: string): Promise<boolean>;
  
  // Album items management
  addPhotosToAlbum(albumId: string, photoIds: string[]): Promise<PhotoAlbumItem[]>;
  removePhotosFromAlbum(albumId: string, photoIds: string[]): Promise<number>;
  getAlbumPhotos(albumId: string): Promise<Photo[]>;
  updatePhotoOrder(albumId: string, photoId: string, newOrder: number): Promise<boolean>;
  bulkUpdatePhotoOrder(albumId: string, photoOrders: Array<{ photoId: string; orderIndex: number }>): Promise<boolean>;
  
  // Photo organization
  getFavoritePhotos(userId?: string): Promise<Photo[]>;
  getRecentPhotos(limit?: number, userId?: string): Promise<Photo[]>;
  getPhotosByLocation(location: string): Promise<Photo[]>;
  detectDuplicatePhotos(): Promise<Array<{ hash: string; photos: Photo[] }>>;
  
  // Photo OCR and annotations
  updatePhotoOCR(photoId: string, ocrText: string | null, ocrConfidence: number | null, ocrMetadata: any): Promise<Photo | undefined>;
  updatePhotoAnnotations(photoId: string, annotations: any): Promise<Photo | undefined>;
  updatePhotoMetadata(photoId: string, metadata: { width?: number; height?: number; fileSize?: number; mimeType?: string; exifData?: any }): Promise<Photo | undefined>;
  
  // Photo upload sessions for cleanup reminders
  createPhotoUploadSession(session: InsertPhotoUploadSession): Promise<PhotoUploadSession>;
  getPhotoUploadSession(id: string): Promise<PhotoUploadSession | undefined>;
  getPhotoUploadSessionsByUser(userId: string): Promise<PhotoUploadSession[]>;
  getPendingCleanupSessions(userId: string): Promise<PhotoUploadSession[]>;
  confirmPhotoCleanup(sessionId: string): Promise<PhotoUploadSession | undefined>;
  updatePhotoUploadSession(id: string, session: Partial<InsertPhotoUploadSession>): Promise<PhotoUploadSession | undefined>;

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
  getUnconvertedGoogleEvents(startDate: Date, endDate: Date): Promise<GoogleEvent[]>;
  updateGoogleEvent(id: string, event: Partial<InsertGoogleEvent>): Promise<GoogleEvent | undefined>;
  deleteGoogleEvent(id: string): Promise<boolean>;
  markGoogleEventAsConverted(id: string, jobId: string): Promise<GoogleEvent | undefined>;
  getJobsByStatus(statuses: string[]): Promise<Job[]>;
  getTodaysJobsByStatus(statuses: string[]): Promise<Job[]>;
  getTodaysJobsByStatusPaginated(statuses: string[], params: PaginationParams): Promise<PaginatedResult<Job>>;

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

  // Pending calendar events (Building Knowledge calendar sync)
  createPendingCalendarEvent(event: InsertPendingCalendarEvent): Promise<PendingCalendarEvent>;
  getPendingCalendarEvent(id: string): Promise<PendingCalendarEvent | undefined>;
  getPendingCalendarEventByGoogleId(googleEventId: string): Promise<PendingCalendarEvent | undefined>;
  getPendingEvents(filters?: {
    status?: 'pending' | 'assigned' | 'rejected' | 'duplicate';
    builderId?: string;
    startDate?: Date;
    endDate?: Date;
    jobType?: 'pre_drywall' | 'final' | 'final_special' | 'multifamily' | 'other';
    confidence?: 'all' | 'high' | 'medium' | 'low' | 'unmatched';
    builderUnmatched?: boolean;
    sortBy?: 'date' | 'confidence' | 'importTime';
    limit?: number;
    offset?: number;
  }): Promise<{ events: PendingCalendarEvent[], total: number }>;
  assignEventToInspector(eventId: string, inspectorId: string, userId: string): Promise<{ event: PendingCalendarEvent, job: Job }>;
  bulkAssignEvents(eventIds: string[], inspectorId: string, userId: string): Promise<{ events: PendingCalendarEvent[], jobs: Job[] }>;
  rejectEvent(eventId: string, userId: string): Promise<PendingCalendarEvent | undefined>;
  getWeeklyWorkload(startDate: Date, endDate: Date): Promise<Array<{
    inspectorId: string;
    inspectorName: string;
    date: string;
    jobCount: number;
    scheduledMinutes: number;
  }>>;

  // New assignment endpoints with ScheduleEvent creation
  assignPendingEventToInspector(params: {
    eventId: string;
    inspectorId: string;
    adminId: string;
  }): Promise<{ job: Job; scheduleEvent: ScheduleEvent }>;

  bulkAssignPendingEvents(params: {
    eventIds: string[];
    inspectorId: string;
    adminId: string;
  }): Promise<{ assignedCount: number; errors: string[] }>;

  getInspectorWorkload(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<Array<{ inspectorId: string; inspectorName: string; jobCount: number }>>;

  // Financial operations
  // Invoices
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByUser(userId: string): Promise<Invoice[]>;
  getInvoicesByBuilder(builderId: string): Promise<Invoice[]>;
  getInvoicesByJob(jobId: string): Promise<Invoice[]>;
  getInvoicesByStatus(status: string): Promise<Invoice[]>;
  getInvoicesPaginated(params: PaginationParams): Promise<PaginatedResult<Invoice>>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  getNextInvoiceNumber(userId: string): Promise<string>;
  markInvoiceAsPaid(id: string, paymentDetails: Partial<InsertPayment>): Promise<Invoice | undefined>;
  
  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  getPaymentsPaginated(params: PaginationParams): Promise<PaginatedResult<Payment>>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;
  
  // Financial Settings
  getFinancialSettings(userId: string): Promise<FinancialSettings | undefined>;
  createFinancialSettings(settings: InsertFinancialSettings): Promise<FinancialSettings>;
  updateFinancialSettings(userId: string, settings: Partial<InsertFinancialSettings>): Promise<FinancialSettings | undefined>;
  
  // Financial Reports
  getFinancialSummary(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
  getRevenueByPeriod(userId: string, period: 'day' | 'week' | 'month' | 'quarter' | 'year'): Promise<any>;
  getExpensesByCategory(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
  getMileageSummary(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
  getJobProfitability(jobId: string): Promise<any>;

  // Blower Door Tests
  createBlowerDoorTest(test: InsertBlowerDoorTest): Promise<BlowerDoorTest>;
  getBlowerDoorTest(id: string): Promise<BlowerDoorTest | undefined>;
  getBlowerDoorTestsByJob(jobId: string): Promise<BlowerDoorTest[]>;
  getLatestBlowerDoorTest(jobId: string): Promise<BlowerDoorTest | undefined>;
  updateBlowerDoorTest(id: string, test: Partial<InsertBlowerDoorTest>): Promise<BlowerDoorTest | undefined>;
  deleteBlowerDoorTest(id: string): Promise<boolean>;

  // Duct Leakage Tests
  createDuctLeakageTest(test: InsertDuctLeakageTest): Promise<DuctLeakageTest>;
  getDuctLeakageTest(id: string): Promise<DuctLeakageTest | undefined>;
  getDuctLeakageTestsByJob(jobId: string): Promise<DuctLeakageTest[]>;
  getLatestDuctLeakageTest(jobId: string): Promise<DuctLeakageTest | undefined>;
  updateDuctLeakageTest(id: string, test: Partial<InsertDuctLeakageTest>): Promise<DuctLeakageTest | undefined>;
  deleteDuctLeakageTest(id: string): Promise<boolean>;

  // 45L Tax Credit operations
  // Tax Credit Projects
  createTaxCreditProject(project: InsertTaxCreditProject): Promise<TaxCreditProject>;
  getTaxCreditProject(id: string): Promise<TaxCreditProject | undefined>;
  getTaxCreditProjectsByBuilder(builderId: string): Promise<TaxCreditProject[]>;
  getTaxCreditProjectsByYear(taxYear: number): Promise<TaxCreditProject[]>;
  getTaxCreditProjectsPaginated(params: PaginationParams): Promise<PaginatedResult<TaxCreditProject>>;
  updateTaxCreditProject(id: string, project: Partial<InsertTaxCreditProject>): Promise<TaxCreditProject | undefined>;
  deleteTaxCreditProject(id: string): Promise<boolean>;

  // Tax Credit Requirements
  createTaxCreditRequirement(requirement: InsertTaxCreditRequirement): Promise<TaxCreditRequirement>;
  getTaxCreditRequirement(id: string): Promise<TaxCreditRequirement | undefined>;
  getTaxCreditRequirementsByProject(projectId: string): Promise<TaxCreditRequirement[]>;
  updateTaxCreditRequirement(id: string, requirement: Partial<InsertTaxCreditRequirement>): Promise<TaxCreditRequirement | undefined>;
  deleteTaxCreditRequirement(id: string): Promise<boolean>;

  // Tax Credit Documents
  createTaxCreditDocument(document: InsertTaxCreditDocument): Promise<TaxCreditDocument>;
  getTaxCreditDocument(id: string): Promise<TaxCreditDocument | undefined>;
  getTaxCreditDocumentsByProject(projectId: string): Promise<TaxCreditDocument[]>;
  updateTaxCreditDocument(id: string, document: Partial<InsertTaxCreditDocument>): Promise<TaxCreditDocument | undefined>;
  deleteTaxCreditDocument(id: string): Promise<boolean>;

  // Unit Certifications
  createUnitCertification(certification: InsertUnitCertification): Promise<UnitCertification>;
  getUnitCertification(id: string): Promise<UnitCertification | undefined>;
  getUnitCertificationsByProject(projectId: string): Promise<UnitCertification[]>;
  getUnitCertificationByJob(jobId: string): Promise<UnitCertification | undefined>;
  updateUnitCertification(id: string, certification: Partial<InsertUnitCertification>): Promise<UnitCertification | undefined>;
  deleteUnitCertification(id: string): Promise<boolean>;

  // Equipment Management
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  getEquipment(id: string): Promise<Equipment | undefined>;
  getEquipmentByUser(userId: string): Promise<Equipment[]>;
  getEquipmentByStatus(status: string): Promise<Equipment[]>;
  getEquipmentDueForCalibration(days: number): Promise<Equipment[]>;
  getEquipmentDueForMaintenance(days: number): Promise<Equipment[]>;
  getAllEquipment(): Promise<Equipment[]>;
  getEquipmentPaginated(params: PaginationParams): Promise<PaginatedResult<Equipment>>;
  updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<boolean>;

  // Equipment Calibrations
  createEquipmentCalibration(calibration: InsertEquipmentCalibration): Promise<EquipmentCalibration>;
  getEquipmentCalibration(id: string): Promise<EquipmentCalibration | undefined>;
  getEquipmentCalibrations(equipmentId: string): Promise<EquipmentCalibration[]>;
  getUpcomingCalibrations(days: number): Promise<EquipmentCalibration[]>;
  getOverdueCalibrations(): Promise<EquipmentCalibration[]>;
  updateEquipmentCalibration(id: string, calibration: Partial<InsertEquipmentCalibration>): Promise<EquipmentCalibration | undefined>;
  deleteEquipmentCalibration(id: string): Promise<boolean>;

  // Equipment Maintenance
  createEquipmentMaintenance(maintenance: InsertEquipmentMaintenance): Promise<EquipmentMaintenance>;
  getEquipmentMaintenance(id: string): Promise<EquipmentMaintenance | undefined>;
  getEquipmentMaintenanceHistory(equipmentId: string): Promise<EquipmentMaintenance[]>;
  getUpcomingMaintenance(days: number): Promise<EquipmentMaintenance[]>;
  updateEquipmentMaintenance(id: string, maintenance: Partial<InsertEquipmentMaintenance>): Promise<EquipmentMaintenance | undefined>;
  deleteEquipmentMaintenance(id: string): Promise<boolean>;

  // Equipment Checkouts
  createEquipmentCheckout(checkout: InsertEquipmentCheckout): Promise<EquipmentCheckout>;
  getEquipmentCheckout(id: string): Promise<EquipmentCheckout | undefined>;
  getEquipmentCheckouts(equipmentId: string): Promise<EquipmentCheckout[]>;
  getActiveCheckouts(): Promise<EquipmentCheckout[]>;
  getCheckoutsByUser(userId: string): Promise<EquipmentCheckout[]>;
  getCheckoutsByJob(jobId: string): Promise<EquipmentCheckout[]>;
  checkInEquipment(checkoutId: string, actualReturn: Date, condition: string, notes?: string): Promise<EquipmentCheckout | undefined>;
  updateEquipmentCheckout(id: string, checkout: Partial<InsertEquipmentCheckout>): Promise<EquipmentCheckout | undefined>;
  deleteEquipmentCheckout(id: string): Promise<boolean>;

  // Quality Assurance Operations
  // QA Inspection Scores
  createQaInspectionScore(score: InsertQaInspectionScore): Promise<QaInspectionScore>;
  getQaInspectionScore(id: string): Promise<QaInspectionScore | undefined>;
  getQaInspectionScoreByJob(jobId: string): Promise<QaInspectionScore | undefined>;
  getQaInspectionScoresByInspector(inspectorId: string): Promise<QaInspectionScore[]>;
  getQaInspectionScoresByReviewStatus(status: string): Promise<QaInspectionScore[]>;
  getQaInspectionScoresPaginated(params: PaginationParams): Promise<PaginatedResult<QaInspectionScore>>;
  updateQaInspectionScore(id: string, score: Partial<InsertQaInspectionScore>): Promise<QaInspectionScore | undefined>;
  reviewQaInspectionScore(id: string, reviewerId: string, status: string, notes?: string): Promise<QaInspectionScore | undefined>;
  deleteQaInspectionScore(id: string): Promise<boolean>;

  // QA Checklists
  createQaChecklist(checklist: InsertQaChecklist): Promise<QaChecklist>;
  getQaChecklist(id: string): Promise<QaChecklist | undefined>;
  getAllQaChecklists(): Promise<QaChecklist[]>;
  getQaChecklistsByCategory(category: string): Promise<QaChecklist[]>;
  getActiveQaChecklists(): Promise<QaChecklist[]>;
  updateQaChecklist(id: string, checklist: Partial<InsertQaChecklist>): Promise<QaChecklist | undefined>;
  toggleQaChecklistActive(id: string): Promise<QaChecklist | undefined>;
  deleteQaChecklist(id: string): Promise<boolean>;

  // QA Checklist Items
  createQaChecklistItem(item: InsertQaChecklistItem): Promise<QaChecklistItem>;
  getQaChecklistItem(id: string): Promise<QaChecklistItem | undefined>;
  getQaChecklistItems(checklistId: string): Promise<QaChecklistItem[]>;
  getCriticalQaChecklistItems(checklistId: string): Promise<QaChecklistItem[]>;
  updateQaChecklistItem(id: string, item: Partial<InsertQaChecklistItem>): Promise<QaChecklistItem | undefined>;
  reorderQaChecklistItems(checklistId: string, itemIds: string[]): Promise<boolean>;
  deleteQaChecklistItem(id: string): Promise<boolean>;

  // QA Checklist Responses
  createQaChecklistResponse(response: InsertQaChecklistResponse): Promise<QaChecklistResponse>;
  getQaChecklistResponse(id: string): Promise<QaChecklistResponse | undefined>;
  getQaChecklistResponsesByJob(jobId: string): Promise<QaChecklistResponse[]>;
  getQaChecklistResponsesByChecklist(checklistId: string): Promise<QaChecklistResponse[]>;
  getQaChecklistResponsesByUser(userId: string): Promise<QaChecklistResponse[]>;
  bulkCreateQaChecklistResponses(responses: InsertQaChecklistResponse[]): Promise<QaChecklistResponse[]>;
  updateQaChecklistResponse(id: string, response: Partial<InsertQaChecklistResponse>): Promise<QaChecklistResponse | undefined>;
  deleteQaChecklistResponse(id: string): Promise<boolean>;

  // QA Performance Metrics
  createQaPerformanceMetric(metric: InsertQaPerformanceMetric): Promise<QaPerformanceMetric>;
  getQaPerformanceMetric(id: string): Promise<QaPerformanceMetric | undefined>;
  getQaPerformanceMetricsByUser(userId: string): Promise<QaPerformanceMetric[]>;
  getQaPerformanceMetricsByPeriod(period: string, startDate: Date, endDate: Date): Promise<QaPerformanceMetric[]>;
  getLatestQaPerformanceMetric(userId: string, period: string): Promise<QaPerformanceMetric | undefined>;
  getTeamQaPerformanceMetrics(period: string, startDate: Date, endDate: Date): Promise<QaPerformanceMetric[]>;
  calculateQaPerformanceMetrics(userId: string, period: string, startDate: Date, endDate: Date): Promise<QaPerformanceMetric>;
  updateQaPerformanceMetric(id: string, metric: Partial<InsertQaPerformanceMetric>): Promise<QaPerformanceMetric | undefined>;
  deleteQaPerformanceMetric(id: string): Promise<boolean>;

  // QA Analytics
  getQaScoreTrends(userId?: string, days?: number): Promise<any>;
  getQaCategoryBreakdown(userId?: string, startDate?: Date, endDate?: Date): Promise<any>;
  getQaLeaderboard(period: string, limit?: number): Promise<any>;
  getQaTrainingNeeds(): Promise<any>;
  getQaComplianceRate(startDate?: Date, endDate?: Date): Promise<any>;

  // Notification Operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(id: string): Promise<Notification | undefined>;
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;
  deleteExpiredNotifications(): Promise<number>;
  
  // Notification Preferences
  createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference>;
  getNotificationPreference(id: string): Promise<NotificationPreference | undefined>;
  getUserNotificationPreferences(userId: string): Promise<NotificationPreference[]>;
  updateNotificationPreference(id: string, preference: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined>;
  upsertNotificationPreference(userId: string, notificationType: string, preference: Partial<InsertNotificationPreference>): Promise<NotificationPreference>;
  deleteNotificationPreference(id: string): Promise<boolean>;
  
  // Inspector Assignment Operations
  getInspectorWorkload(inspectorId: string, date: Date): Promise<InspectorWorkload | undefined>;
  getInspectorWorkloadRange(inspectorId: string, startDate: Date, endDate: Date): Promise<InspectorWorkload[]>;
  getAllInspectorsWorkload(date: Date): Promise<InspectorWorkload[]>;
  upsertInspectorWorkload(workload: InsertInspectorWorkload): Promise<InspectorWorkload>;
  updateInspectorWorkloadFromJobs(inspectorId: string, date: Date): Promise<InspectorWorkload>;
  
  // Assignment History
  createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory>;
  getAssignmentHistoryByJob(jobId: string): Promise<AssignmentHistory[]>;
  getAssignmentHistoryByInspector(inspectorId: string, params?: PaginationParams): Promise<PaginatedResult<AssignmentHistory>>;
  
  // Inspector Preferences
  getInspectorPreferences(inspectorId: string): Promise<InspectorPreferences | undefined>;
  upsertInspectorPreferences(preferences: InsertInspectorPreferences): Promise<InspectorPreferences>;
  getAllInspectorPreferences(): Promise<InspectorPreferences[]>;
  getInspectorsByTerritory(territory: string): Promise<InspectorPreferences[]>;
  
  // Enhanced Job Assignment Operations
  assignJobToInspector(jobId: string, inspectorId: string | null, assignedBy: string, reason?: string): Promise<Job>;
  getInspectorJobs(inspectorId: string, params?: PaginationParams): Promise<PaginatedResult<Job>>;
  getInspectorJobsByDateRange(inspectorId: string, startDate: Date, endDate: Date): Promise<Job[]>;
  suggestOptimalInspector(jobId: string, date: Date): Promise<{ inspectorId: string; score: number; reasons: string[] }[]>;
  bulkAssignJobs(jobIds: string[], inspectorId: string | null, assignedBy: string): Promise<Job[]>;
  
  // Analytics Dashboard Methods
  getDashboardSummary(): Promise<any>;
  getBuilderLeaderboard(): Promise<any[]>;
  getDashboardMetrics(startDate?: Date, endDate?: Date): Promise<any>;
  getInspectionTrends(period: 'daily' | 'weekly' | 'monthly', startDate?: Date, endDate?: Date): Promise<any[]>;
  getBuilderPerformance(limit?: number): Promise<any[]>;
  getFinancialMetrics(startDate?: Date, endDate?: Date): Promise<any>;
  getPhotoAnalytics(startDate?: Date, endDate?: Date): Promise<any>;
  getInspectorPerformance(inspectorId?: string, startDate?: Date, endDate?: Date): Promise<any[]>;
  getComplianceMetrics(startDate?: Date, endDate?: Date): Promise<any>;
  getRevenueExpenseData(period: 'daily' | 'weekly' | 'monthly', startDate?: Date, endDate?: Date): Promise<any[]>;
  getKPIMetrics(): Promise<any[]>;
  getForecastData(metric: string, lookbackDays?: number): Promise<any[]>;
  
  // Gamification/Achievement Stats
  getUserAchievementStats(userId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    recentUnlocks: UserAchievement[];
  }>;
  getUserXP(userId: string): Promise<number>;
  getUserStatistics(userId: string): Promise<Record<string, number>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    // CRITICAL: Check for null/undefined/empty id to prevent crashes
    if (!id || typeof id !== 'string' || id.trim() === '') {
      serverLogger.warn(`[Storage/getUser] Invalid id parameter: ${id === null ? 'null' : id === undefined ? 'undefined' : `'${id}'`} - returning undefined`);
      return undefined;
    }
    
    // Sanitize the id by trimming whitespace
    const sanitizedId = id.trim();
    
    try {
      // First try to get by ID (OIDC sub claim)
      const resultById = await db.select().from(users).where(eq(users.id, sanitizedId)).limit(1);
      
      if (resultById[0]) {
        serverLogger.info(`[Storage/getUser] Found user by ID: ${sanitizedId} - ${resultById[0].email} with role: ${resultById[0].role}`);
        return resultById[0];
      }
      
      // ID lookup failed - this might be an email instead of ID, or OIDC sub doesn't match DB ID
      // Try to find by email as fallback
      serverLogger.warn(`[Storage/getUser] No user found with ID: ${sanitizedId} - attempting email fallback`);
      
      // Check if the ID looks like an email (DEFENSIVE: check string exists first)
      if (sanitizedId.includes('@')) {
        const resultByEmail = await db.select().from(users).where(eq(users.email, sanitizedId)).limit(1);
        if (resultByEmail[0]) {
          serverLogger.info(`[Storage/getUser] Found user by email fallback: ${resultByEmail[0].email} with role: ${resultByEmail[0].role}`);
          return resultByEmail[0];
        }
      }
      
      serverLogger.error(`[Storage/getUser] User not found by ID or email: ${sanitizedId}`);
      return undefined;
    } catch (error) {
      serverLogger.error(`[Storage/getUser] Database error while fetching user:`, error);
      return undefined;
    }
  }
  
  // Alias for getUser, used by audit logger
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }
  
  // Get user by email address
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (result[0]) {
      serverLogger.info(`[Storage/getUserByEmail] Found user: ${result[0].id} - ${result[0].email} with role: ${result[0].role}`);
      return result[0];
    }
    
    serverLogger.warn(`[Storage/getUserByEmail] No user found with email: ${email}`);
    return undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists - try by ID first, then by email
    let existingUser = await this.getUser(userData.id);
    
    // If not found by ID but we have an email, check if user exists with that email
    // This handles OIDC sub claim mismatches
    if (!existingUser && userData.email) {
      serverLogger.info(`[Storage/upsertUser] No user found with ID ${userData.id}, checking by email ${userData.email}`);
      const userByEmail = await db.select().from(users)
        .where(eq(users.email, userData.email))
        .limit(1);
      
      if (userByEmail[0]) {
        existingUser = userByEmail[0];
        serverLogger.warn(`[Storage/upsertUser] Found existing user by email with different ID. DB ID: ${existingUser.id}, OIDC ID: ${userData.id}`);
        // Update the userData.id to match the existing database ID
        // This ensures consistency and prevents duplicate users
        userData.id = existingUser.id;
        serverLogger.info(`[Storage/upsertUser] Using existing database ID: ${userData.id} for user ${userData.email}`);
      }
    }
    
    // Build the update set object
    const updateSet: any = {
      ...userData,
      updatedAt: new Date(),
    };
    
    // PRODUCTION SAFETY: NEVER downgrade existing admins
    // This ensures admin roles are always preserved regardless of what OIDC claims provide
    if (existingUser?.role === 'admin') {
      // CRITICAL: Preserve admin role - never downgrade
      updateSet.role = 'admin';
      serverLogger.info(`[Storage/upsertUser] PROTECTED: Preserving admin role for user ${userData.id} (${userData.email})`);
    } else if ('role' in userData && userData.role) {
      // Role explicitly provided in userData - use it
      updateSet.role = userData.role;
      serverLogger.info(`[Storage/upsertUser] User ${userData.id}: Setting explicit role to ${userData.role}`);
    } else if (existingUser?.role) {
      // No role provided but user exists - preserve existing role
      updateSet.role = existingUser.role;
      serverLogger.info(`[Storage/upsertUser] User ${userData.id}: Preserving existing role ${existingUser.role}`);
    } else {
      // New user with no role specified - set default
      updateSet.role = 'inspector';
      serverLogger.info(`[Storage/upsertUser] User ${userData.id}: New user, setting default role to 'inspector'`);
    }
    
    // CRITICAL FIX: Use the corrected ID (after email lookup) for BOTH insert and conflict target
    const finalUserData = {
      ...userData,
      id: userData.id, // This is now the corrected ID if we found user by email
      role: updateSet.role, // Ensure role is set for inserts
    };
    
    const [user] = await db
      .insert(users)
      .values(finalUserData)
      .onConflictDoUpdate({
        target: users.id,
        set: updateSet,
      })
      .returning();
    
    serverLogger.info(`[Storage/upsertUser] FINAL - User ${user.id} (${user.email}) has role: ${user.role}`);
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
      db.select().from(builders)
        .orderBy(desc(builders.id))  // Order by ID descending to show newest builders first
        .limit(limit)
        .offset(offset),
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
    
    serverLogger.info('[Storage] Creating job with values:', {
      name: values.name,
      address: values.address,
      status: values.status,
      builderId: values.builderId,
      inspectionType: values.inspectionType,
      createdBy: values.createdBy,
      scheduledDate: values.scheduledDate,
    });
    
    // CRITICAL: NO try-catch block that returns fallback jobs
    // Database errors MUST propagate to return 500 status
    let result;
    try {
      result = await db.insert(jobs).values(values as any).returning();
    } catch (error) {
      // Log the error but RE-THROW it - never swallow database errors
      serverLogger.error('[Storage] CRITICAL: Database insert failed for job:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        values: {
          name: values.name,
          address: values.address,
          builderId: values.builderId,
          status: values.status,
        },
        dbError: error, // Log full database error for debugging
      });
      
      // CRITICAL: Re-throw the error to ensure API returns 500, not 201
      throw new Error(`Database insert failed: ${error instanceof Error ? error.message : 'Unknown database error'}`);
    }
    
    // Verify we got a result from the insert
    if (!result || result.length === 0) {
      const errorMsg = 'CRITICAL: Job insertion returned no results - database insert failed silently';
      serverLogger.error('[Storage] ' + errorMsg);
      throw new Error(errorMsg);
    }
    
    const createdJob = result[0];
    
    // Double-check the job has an ID (critical for persistence)
    if (!createdJob.id) {
      const errorMsg = 'CRITICAL: Created job has no ID - database insert failed';
      serverLogger.error('[Storage] ' + errorMsg, { createdJob });
      throw new Error(errorMsg);
    }
    
    serverLogger.info('[Storage] Job created with ID:', {
      id: createdJob.id,
      name: createdJob.name,
      status: createdJob.status,
    });
    
    // CRITICAL VERIFICATION: Ensure job actually exists in database
    try {
      const verification = await db.select().from(jobs).where(eq(jobs.id, createdJob.id)).limit(1);
      
      if (!verification || verification.length === 0) {
        // CRITICAL ERROR: Job not found after creation - database persistence failed
        const errorMsg = `CRITICAL: Job with ID ${createdJob.id} not found in database after creation - persistence failed`;
        serverLogger.error('[Storage] ' + errorMsg);
        throw new Error(errorMsg);
      }
      
      serverLogger.info('[Storage] Job persistence verified successfully:', {
        id: verification[0].id,
        name: verification[0].name,
        address: verification[0].address,
      });
      
      // Return the verified job from database, not the insert result
      // This ensures we're returning what's actually persisted
      return verification[0];
      
    } catch (verifyError) {
      if (verifyError instanceof Error && verifyError.message.includes('CRITICAL')) {
        // Re-throw critical verification errors
        throw verifyError;
      }
      
      // Log verification query errors but still fail
      serverLogger.error('[Storage] Failed to verify job persistence:', {
        jobId: createdJob.id,
        error: verifyError instanceof Error ? verifyError.message : String(verifyError),
      });
      throw new Error(`Job persistence verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
    }
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
      .where(eq(jobs.assignedTo, userId))
      .orderBy(desc(jobs.id));
  }

  async getJobsPaginated(params: PaginationParams): Promise<PaginatedResult<Job>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(jobs)
        .orderBy(desc(jobs.id))  // Order by ID descending to show newest jobs first
        .limit(limit)
        .offset(offset),
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
          eq(jobs.assignedTo, userId),
          sortOrder === 'desc' ? lt(jobs.id, cursor) : gt(jobs.id, cursor)
        )
      : eq(jobs.assignedTo, userId);
    
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

  async getScheduleEventsByDateRange(
    startDate: Date, 
    endDate: Date, 
    userId?: string, 
    userRole?: UserRole
  ): Promise<ScheduleEvent[]> {
    // If inspector role, join with jobs and filter by assignedTo
    if (userRole === 'inspector' && userId) {
      const eventsWithJobs = await db
        .select({
          id: scheduleEvents.id,
          jobId: scheduleEvents.jobId,
          title: scheduleEvents.title,
          startTime: scheduleEvents.startTime,
          endTime: scheduleEvents.endTime,
          notes: scheduleEvents.notes,
          googleCalendarEventId: scheduleEvents.googleCalendarEventId,
          googleCalendarId: scheduleEvents.googleCalendarId,
          lastSyncedAt: scheduleEvents.lastSyncedAt,
          color: scheduleEvents.color,
        })
        .from(scheduleEvents)
        .innerJoin(jobs, eq(scheduleEvents.jobId, jobs.id))
        .where(
          and(
            gte(scheduleEvents.startTime, startDate),
            lte(scheduleEvents.startTime, endDate),
            eq(jobs.assignedTo, userId)
          )
        );
      return eventsWithJobs;
    }
    
    // Admin and other roles see all events
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
      db.select().from(expenses)
        .orderBy(desc(expenses.id))  // Order by ID descending to show newest expenses first
        .limit(limit)
        .offset(offset),
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
      db.select().from(expenses)
        .where(eq(expenses.jobId, jobId))
        .orderBy(desc(expenses.id))  // Order by ID descending to show newest expenses first
        .limit(limit)
        .offset(offset),
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
      db.select().from(mileageLogs)
        .orderBy(desc(mileageLogs.date))  // Order by date descending to show newest logs first
        .limit(limit)
        .offset(offset),
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

  async createMileageLogWithRoute(insertLog: InsertMileageLog, routePoints: any[]): Promise<MileageLog> {
    const [log] = await db.insert(mileageLogs).values(insertLog).returning();
    
    if (routePoints && routePoints.length > 0) {
      const pointsToInsert = routePoints.map(point => ({
        logId: log.id,
        timestamp: point.timestamp,
        latitude: point.latitude,
        longitude: point.longitude,
        speed: point.speed,
        accuracy: point.accuracy,
        source: point.source || 'gps',
      }));
      
      await db.insert(mileageRoutePoints).values(pointsToInsert);
    }
    
    return log;
  }

  async getMileageLogRoute(logId: string): Promise<any[]> {
    return await db.select().from(mileageRoutePoints)
      .where(eq(mileageRoutePoints.logId, logId))
      .orderBy(asc(mileageRoutePoints.timestamp));
  }

  async updateMileageLogRoute(logId: string, points: any[]): Promise<void> {
    // Use transaction to atomically delete old points and insert new ones
    await db.transaction(async (tx) => {
      // Delete all existing points for this logId
      await tx.delete(mileageRoutePoints).where(eq(mileageRoutePoints.logId, logId));
      
      // Insert new points if provided
      if (points && points.length > 0) {
        const pointsToInsert = points.map(point => ({
          logId,
          timestamp: point.timestamp,
          latitude: point.latitude,
          longitude: point.longitude,
          speed: point.speed,
          accuracy: point.accuracy,
          source: point.source || 'gps',
        }));
        
        await tx.insert(mileageRoutePoints).values(pointsToInsert);
      }
    });
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
        isActive: true,
        components: original.components,
        layout: original.layout,
        conditionalRules: original.conditionalRules,
        calculations: original.calculations,
        metadata: original.metadata,
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

  async getReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select()
      .from(reportTemplates)
      .where(eq(reportTemplates.isActive, true))
      .orderBy(desc(reportTemplates.createdAt));
  }

  async getActiveReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select()
      .from(reportTemplates)
      .where(and(
        eq(reportTemplates.isActive, true),
        eq(reportTemplates.status, 'published')
      ))
      .orderBy(desc(reportTemplates.createdAt));
  }

  async cloneReportTemplate(id: string, newName?: string): Promise<ReportTemplate> {
    const original = await this.getReportTemplate(id);
    if (!original) {
      throw new Error('Template not found');
    }
    
    const clonedName = newName || `${original.name} (Copy)`;
    
    // Create a new version linked to the parent
    const cloned = await db.insert(reportTemplates)
      .values({
        name: clonedName,
        description: original.description,
        category: original.category,
        version: (original.version || 1) + 1,
        status: 'draft',
        isDefault: false,
        isActive: true,
        components: original.components,
        layout: original.layout,
        conditionalRules: original.conditionalRules,
        calculations: original.calculations,
        metadata: original.metadata,
        parentTemplateId: original.parentTemplateId || id,
        versionNotes: `Cloned from "${original.name}" version ${original.version || 1}`,
        createdBy: original.createdBy,
      })
      .returning();
    
    return cloned[0];
  }

  async archiveReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const result = await db.update(reportTemplates)
      .set({ 
        status: 'archived' as const,
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(reportTemplates.id, id))
      .returning();
    return result[0];
  }

  async getTemplateVersions(parentTemplateId: string): Promise<ReportTemplate[]> {
    return await db.select()
      .from(reportTemplates)
      .where(or(
        eq(reportTemplates.id, parentTemplateId),
        eq(reportTemplates.parentTemplateId, parentTemplateId)
      ))
      .orderBy(desc(reportTemplates.version));
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

  async getTemplateFieldById(id: string): Promise<TemplateField | undefined> {
    const result = await db.select().from(templateFields).where(eq(templateFields.id, id)).limit(1);
    return result[0];
  }

  async getTemplateFieldsByTemplateId(templateId: string): Promise<TemplateField[]> {
    return await db.select()
      .from(templateFields)
      .where(eq(templateFields.templateId, templateId))
      .orderBy(templateFields.orderIndex);
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

  // Field Dependencies for Conditional Logic
  async createFieldDependency(dependency: InsertFieldDependency): Promise<FieldDependency> {
    const result = await db.insert(fieldDependencies).values(dependency).returning();
    return result[0];
  }

  async getFieldDependency(id: string): Promise<FieldDependency | undefined> {
    const result = await db.select().from(fieldDependencies).where(eq(fieldDependencies.id, id)).limit(1);
    return result[0];
  }

  async getFieldDependencies(fieldId: string): Promise<FieldDependency[]> {
    return await db.select()
      .from(fieldDependencies)
      .where(and(
        eq(fieldDependencies.fieldId, fieldId),
        eq(fieldDependencies.isActive, true)
      ))
      .orderBy(fieldDependencies.priority);
  }

  async getDependenciesByDependsOn(dependsOnFieldId: string): Promise<FieldDependency[]> {
    return await db.select()
      .from(fieldDependencies)
      .where(and(
        eq(fieldDependencies.dependsOnFieldId, dependsOnFieldId),
        eq(fieldDependencies.isActive, true)
      ))
      .orderBy(fieldDependencies.priority);
  }

  async updateFieldDependency(id: string, updates: Partial<InsertFieldDependency>): Promise<FieldDependency | undefined> {
    const result = await db.update(fieldDependencies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fieldDependencies.id, id))
      .returning();
    return result[0];
  }

  async deleteFieldDependency(id: string): Promise<boolean> {
    await db.delete(fieldDependencies).where(eq(fieldDependencies.id, id));
    return true;
  }

  async deleteFieldDependencies(fieldId: string): Promise<boolean> {
    await db.delete(fieldDependencies).where(eq(fieldDependencies.fieldId, fieldId));
    return true;
  }

  async getFieldDependenciesByTemplate(templateId: string): Promise<FieldDependency[]> {
    return await db.select()
      .from(fieldDependencies)
      .where(and(
        eq(fieldDependencies.templateId, templateId),
        eq(fieldDependencies.isActive, true)
      ))
      .orderBy(fieldDependencies.priority);
  }

  async upsertFieldDependency(dependency: InsertFieldDependency): Promise<FieldDependency> {
    // Try to find existing dependency
    const existing = await db.select()
      .from(fieldDependencies)
      .where(and(
        eq(fieldDependencies.templateId, dependency.templateId),
        eq(fieldDependencies.sourceFieldId, dependency.sourceFieldId || ''),
        eq(fieldDependencies.targetFieldId, dependency.targetFieldId || '')
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const result = await db.update(fieldDependencies)
        .set({ ...dependency, updatedAt: new Date() })
        .where(eq(fieldDependencies.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      // Create new
      const result = await db.insert(fieldDependencies).values(dependency).returning();
      return result[0];
    }
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
      db.select().from(reportInstances)
        .orderBy(desc(reportInstances.id))  // Order by ID descending to show newest reports first
        .limit(limit)
        .offset(offset),
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
      db.select().from(photos)
        .orderBy(desc(photos.uploadedAt))  // Order by upload time descending to show newest photos first
        .limit(limit)
        .offset(offset),
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
      db.select().from(photos)
        .where(eq(photos.jobId, jobId))
        .orderBy(desc(photos.uploadedAt))  // Order by upload time descending to show newest photos first
        .limit(limit)
        .offset(offset),
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
      db.select().from(photos)
        .where(eq(photos.checklistItemId, checklistItemId))
        .orderBy(desc(photos.uploadedAt))  // Order by upload time descending to show newest photos first
        .limit(limit)
        .offset(offset),
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
      // Convert JavaScript array to PostgreSQL array format
      // Use sql.join to safely construct array elements with proper escaping
      const arrayElements = sql.join(tags.map(tag => sql`${tag}`), sql`, `);
      const pgArray = sql`ARRAY[${arrayElements}]::text[]`;
      conditions.push(sql`${photos.tags} @> ${pgArray}`);
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
      // Convert JavaScript array to PostgreSQL array format
      // Use sql.join to safely construct array elements with proper escaping
      const arrayElements = sql.join(tags.map(tag => sql`${tag}`), sql`, `);
      const pgArray = sql`ARRAY[${arrayElements}]::text[]`;
      conditions.push(sql`${photos.tags} @> ${pgArray}`);
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
      // Convert JavaScript array to PostgreSQL array format
      // Use sql.join to safely construct array elements with proper escaping
      const arrayElements = sql.join(tags.map(tag => sql`${tag}`), sql`, `);
      const pgArray = sql`ARRAY[${arrayElements}]::text[]`;
      conditions.push(sql`${photos.tags} @> ${pgArray}`);
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

  async updatePhotoOCR(
    photoId: string,
    ocrText: string | null,
    ocrConfidence: number | null,
    ocrMetadata: any
  ): Promise<Photo | undefined> {
    const result = await db.update(photos)
      .set({
        ocrText,
        ocrConfidence: ocrConfidence?.toString(),
        ocrMetadata
      })
      .where(eq(photos.id, photoId))
      .returning();
    return result[0];
  }

  async updatePhotoAnnotations(photoId: string, annotations: any): Promise<Photo | undefined> {
    const result = await db.update(photos)
      .set({ annotationData: annotations })
      .where(eq(photos.id, photoId))
      .returning();
    return result[0];
  }

  async createPhotoUploadSession(session: InsertPhotoUploadSession): Promise<PhotoUploadSession> {
    const result = await db.insert(photoUploadSessions).values(session).returning();
    return result[0];
  }

  async getPhotoUploadSession(id: string): Promise<PhotoUploadSession | undefined> {
    const result = await db.select()
      .from(photoUploadSessions)
      .where(eq(photoUploadSessions.id, id))
      .limit(1);
    return result[0];
  }

  async getPhotoUploadSessionsByUser(userId: string): Promise<PhotoUploadSession[]> {
    return await db.select()
      .from(photoUploadSessions)
      .where(eq(photoUploadSessions.userId, userId))
      .orderBy(desc(photoUploadSessions.uploadDate));
  }

  async getPendingCleanupSessions(userId: string): Promise<PhotoUploadSession[]> {
    return await db.select()
      .from(photoUploadSessions)
      .where(and(
        eq(photoUploadSessions.userId, userId),
        eq(photoUploadSessions.cleanupConfirmed, false)
      ))
      .orderBy(desc(photoUploadSessions.uploadDate));
  }

  async confirmPhotoCleanup(sessionId: string): Promise<PhotoUploadSession | undefined> {
    const result = await db.update(photoUploadSessions)
      .set({ 
        cleanupConfirmed: true,
        cleanupConfirmedAt: new Date()
      })
      .where(eq(photoUploadSessions.id, sessionId))
      .returning();
    return result[0];
  }

  async updatePhotoUploadSession(
    id: string,
    session: Partial<InsertPhotoUploadSession>
  ): Promise<PhotoUploadSession | undefined> {
    const result = await db.update(photoUploadSessions)
      .set({
        ...session,
        updatedAt: new Date()
      })
      .where(eq(photoUploadSessions.id, id))
      .returning();
    return result[0];
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

  async bulkMovePhotosToJob(photoIds: string[], jobId: string): Promise<number> {
    if (photoIds.length === 0) return 0;
    
    const result = await db.update(photos)
      .set({ jobId })
      .where(inArray(photos.id, photoIds))
      .returning();
    
    return result.length;
  }

  async bulkUpdatePhotoFavorites(photoIds: string[], isFavorite: boolean): Promise<number> {
    if (photoIds.length === 0) return 0;
    
    const result = await db.update(photos)
      .set({ isFavorite })
      .where(inArray(photos.id, photoIds))
      .returning();
    
    return result.length;
  }

  // Photo albums
  async createPhotoAlbum(album: InsertPhotoAlbum): Promise<PhotoAlbum> {
    const result = await db.insert(photoAlbums).values(album).returning();
    return result[0];
  }

  async getPhotoAlbum(id: string): Promise<PhotoAlbum | undefined> {
    const result = await db.select()
      .from(photoAlbums)
      .where(eq(photoAlbums.id, id))
      .limit(1);
    return result[0];
  }

  async getPhotoAlbums(): Promise<PhotoAlbum[]> {
    return await db.select()
      .from(photoAlbums)
      .orderBy(desc(photoAlbums.createdAt));
  }

  async getPhotoAlbumsByUser(userId: string): Promise<PhotoAlbum[]> {
    return await db.select()
      .from(photoAlbums)
      .where(eq(photoAlbums.createdBy, userId))
      .orderBy(desc(photoAlbums.createdAt));
  }

  async updatePhotoAlbum(id: string, album: Partial<InsertPhotoAlbum>): Promise<PhotoAlbum | undefined> {
    const result = await db.update(photoAlbums)
      .set({
        ...album,
        updatedAt: new Date()
      })
      .where(eq(photoAlbums.id, id))
      .returning();
    return result[0];
  }

  async deletePhotoAlbum(id: string): Promise<boolean> {
    const result = await db.delete(photoAlbums)
      .where(eq(photoAlbums.id, id))
      .returning();
    return result.length > 0;
  }

  // Album items management
  async addPhotosToAlbum(albumId: string, photoIds: string[]): Promise<PhotoAlbumItem[]> {
    if (photoIds.length === 0) return [];
    
    // Get current max order index
    const maxOrderResult = await db.select({ maxOrder: sql<number>`COALESCE(MAX(${photoAlbumItems.orderIndex}), 0)` })
      .from(photoAlbumItems)
      .where(eq(photoAlbumItems.albumId, albumId));
    
    const startOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
    
    const items = photoIds.map((photoId, index) => ({
      albumId,
      photoId,
      orderIndex: startOrder + index
    }));
    
    const result = await db.insert(photoAlbumItems)
      .values(items)
      .onConflictDoNothing()
      .returning();
    
    return result;
  }

  async removePhotosFromAlbum(albumId: string, photoIds: string[]): Promise<number> {
    if (photoIds.length === 0) return 0;
    
    const result = await db.delete(photoAlbumItems)
      .where(and(
        eq(photoAlbumItems.albumId, albumId),
        inArray(photoAlbumItems.photoId, photoIds)
      ))
      .returning();
    
    return result.length;
  }

  async getAlbumPhotos(albumId: string): Promise<Photo[]> {
    const results = await db.select({
      photo: photos,
      orderIndex: photoAlbumItems.orderIndex
    })
      .from(photoAlbumItems)
      .innerJoin(photos, eq(photoAlbumItems.photoId, photos.id))
      .where(eq(photoAlbumItems.albumId, albumId))
      .orderBy(photoAlbumItems.orderIndex);
    
    return results.map(r => r.photo);
  }

  async updatePhotoOrder(albumId: string, photoId: string, newOrder: number): Promise<boolean> {
    const result = await db.update(photoAlbumItems)
      .set({ orderIndex: newOrder })
      .where(and(
        eq(photoAlbumItems.albumId, albumId),
        eq(photoAlbumItems.photoId, photoId)
      ))
      .returning();
    
    return result.length > 0;
  }

  async bulkUpdatePhotoOrder(albumId: string, photoOrders: Array<{ photoId: string; orderIndex: number }>): Promise<boolean> {
    if (photoOrders.length === 0) return false;
    
    // Use a transaction to update all orders at once
    await db.transaction(async (tx) => {
      for (const { photoId, orderIndex } of photoOrders) {
        await tx.update(photoAlbumItems)
          .set({ orderIndex })
          .where(and(
            eq(photoAlbumItems.albumId, albumId),
            eq(photoAlbumItems.photoId, photoId)
          ));
      }
    });
    
    return true;
  }

  // Photo organization
  async getFavoritePhotos(userId?: string): Promise<Photo[]> {
    let query = db.select().from(photos).where(eq(photos.isFavorite, true));
    
    if (userId) {
      const results = await db.select({ photo: photos })
        .from(photos)
        .innerJoin(jobs, eq(photos.jobId, jobs.id))
        .where(and(
          eq(photos.isFavorite, true),
          eq(jobs.createdBy, userId)
        ))
        .orderBy(desc(photos.uploadedAt));
      
      return results.map(r => r.photo);
    }
    
    return await query.orderBy(desc(photos.uploadedAt));
  }

  async getRecentPhotos(limit: number = 50, userId?: string): Promise<Photo[]> {
    if (userId) {
      const results = await db.select({ photo: photos })
        .from(photos)
        .innerJoin(jobs, eq(photos.jobId, jobs.id))
        .where(eq(jobs.createdBy, userId))
        .orderBy(desc(photos.uploadedAt))
        .limit(limit);
      
      return results.map(r => r.photo);
    }
    
    return await db.select()
      .from(photos)
      .orderBy(desc(photos.uploadedAt))
      .limit(limit);
  }

  async getPhotosByLocation(location: string): Promise<Photo[]> {
    return await db.select()
      .from(photos)
      .where(eq(photos.location, location))
      .orderBy(desc(photos.uploadedAt));
  }

  async detectDuplicatePhotos(): Promise<Array<{ hash: string; photos: Photo[] }>> {
    // Find photos grouped by hash where hash is not null and there are duplicates
    const duplicates = await db.select({
      hash: photos.hash,
      count: sql<number>`COUNT(*)`,
    })
      .from(photos)
      .where(sql`${photos.hash} IS NOT NULL`)
      .groupBy(photos.hash)
      .having(sql`COUNT(*) > 1`);
    
    const results: Array<{ hash: string; photos: Photo[] }> = [];
    
    for (const dup of duplicates) {
      if (dup.hash) {
        const duplicatePhotos = await db.select()
          .from(photos)
          .where(eq(photos.hash, dup.hash));
        
        results.push({
          hash: dup.hash,
          photos: duplicatePhotos
        });
      }
    }
    
    return results;
  }

  async updatePhotoMetadata(
    photoId: string,
    metadata: { width?: number; height?: number; fileSize?: number; mimeType?: string; exifData?: any }
  ): Promise<Photo | undefined> {
    const result = await db.update(photos)
      .set(metadata)
      .where(eq(photos.id, photoId))
      .returning();
    return result[0];
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

  async getUnconvertedGoogleEvents(startDate: Date, endDate: Date): Promise<GoogleEvent[]> {
    return await db.select().from(googleEvents)
      .where(
        and(
          gte(googleEvents.startTime, startDate),
          lte(googleEvents.startTime, endDate),
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

  async getTodaysJobsByStatusPaginated(statuses: string[], params: PaginationParams): Promise<PaginatedResult<Job>> {
    const { limit, offset } = params;
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const whereCondition = and(
      inArray(jobs.status, statuses),
      gte(jobs.scheduledDate, startOfDay),
      lte(jobs.scheduledDate, endOfDay)
    );

    const [data, totalResult] = await Promise.all([
      db.select().from(jobs)
        .where(whereCondition)
        .orderBy(asc(jobs.scheduledDate))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(jobs)
        .where(whereCondition)
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

  // Pending Calendar Events Implementation
  async createPendingCalendarEvent(event: InsertPendingCalendarEvent): Promise<PendingCalendarEvent> {
    const result = await db.insert(pendingCalendarEvents)
      .values(event)
      .returning();
    return result[0];
  }

  async getPendingCalendarEvent(id: string): Promise<PendingCalendarEvent | undefined> {
    const result = await db.select()
      .from(pendingCalendarEvents)
      .where(eq(pendingCalendarEvents.id, id))
      .limit(1);
    return result[0];
  }

  async getPendingCalendarEventByGoogleId(googleEventId: string): Promise<PendingCalendarEvent | undefined> {
    const result = await db.select()
      .from(pendingCalendarEvents)
      .where(eq(pendingCalendarEvents.googleEventId, googleEventId))
      .limit(1);
    return result[0];
  }

  async getPendingEvents(filters?: {
    status?: 'pending' | 'assigned' | 'rejected' | 'duplicate';
    builderId?: string;
    startDate?: Date;
    endDate?: Date;
    jobType?: 'pre_drywall' | 'final' | 'final_special' | 'multifamily' | 'other';
    confidence?: 'all' | 'high' | 'medium' | 'low' | 'unmatched';
    builderUnmatched?: boolean;
    sortBy?: 'date' | 'confidence' | 'importTime';
    limit?: number;
    offset?: number;
  }): Promise<{ events: PendingCalendarEvent[], total: number }> {
    const { status, builderId, startDate, endDate, jobType, confidence, builderUnmatched, sortBy, limit = 50, offset = 0 } = filters || {};
    
    // Build filter conditions
    const conditions = [];
    
    if (status) {
      conditions.push(eq(pendingCalendarEvents.status, status));
    }
    
    if (builderId) {
      conditions.push(eq(pendingCalendarEvents.parsedBuilderId, builderId));
    }
    
    if (startDate) {
      conditions.push(gte(pendingCalendarEvents.eventDate, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(pendingCalendarEvents.eventDate, endDate));
    }
    
    if (jobType) {
      conditions.push(eq(pendingCalendarEvents.parsedJobType, jobType));
    }
    
    // Confidence filter
    if (confidence && confidence !== 'all') {
      if (confidence === 'high') {
        conditions.push(gt(pendingCalendarEvents.confidenceScore, 85));
      } else if (confidence === 'medium') {
        conditions.push(and(
          gte(pendingCalendarEvents.confidenceScore, 60),
          lte(pendingCalendarEvents.confidenceScore, 85)
        ));
      } else if (confidence === 'low') {
        conditions.push(and(
          gte(pendingCalendarEvents.confidenceScore, 1),
          lt(pendingCalendarEvents.confidenceScore, 60)
        ));
      } else if (confidence === 'unmatched') {
        conditions.push(eq(pendingCalendarEvents.confidenceScore, 0));
      }
    }
    
    // Builder unmatched filter
    if (builderUnmatched === true) {
      conditions.push(isNull(pendingCalendarEvents.parsedBuilderId));
    }
    
    // Build WHERE clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Determine sorting
    let orderByClause;
    if (sortBy === 'confidence') {
      orderByClause = asc(pendingCalendarEvents.confidenceScore);
    } else if (sortBy === 'importTime') {
      orderByClause = desc(pendingCalendarEvents.importedAt);
    } else {
      // Default to date sorting
      orderByClause = asc(pendingCalendarEvents.eventDate);
    }
    
    // Fetch events with filters
    const events = await db.select()
      .from(pendingCalendarEvents)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    // Get total count with same filters
    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(pendingCalendarEvents)
      .where(whereClause);
    
    const total = countResult[0]?.count || 0;
    
    return { events, total };
  }

  async assignEventToInspector(eventId: string, inspectorId: string, userId: string): Promise<{ event: PendingCalendarEvent, job: Job }> {
    // Get the pending event
    const event = await this.getPendingCalendarEvent(eventId);
    if (!event) {
      throw new Error('Pending event not found');
    }
    
    // Verify inspector exists
    const inspector = await this.getUser(inspectorId);
    if (!inspector) {
      throw new Error('Inspector not found');
    }
    
    // Create job from the event
    const job = await this.createJob({
      name: event.rawTitle,
      address: event.parsedBuilderName || 'Address TBD',
      builderId: event.parsedBuilderId || undefined,
      contractor: event.parsedBuilderName || 'Unknown',
      status: 'scheduled',
      inspectionType: event.parsedJobType || 'other',
      scheduledDate: event.eventDate,
      assignedTo: inspectorId,
      assignedBy: userId,
      assignedAt: new Date(),
      createdBy: userId,
      sourceGoogleEventId: event.googleEventId,
      notes: event.rawDescription || undefined,
    });
    
    // Update event status
    const updatedEvent = await db.update(pendingCalendarEvents)
      .set({
        status: 'assigned',
        assignedJobId: job.id,
        processedAt: new Date(),
        processedBy: userId,
      })
      .where(eq(pendingCalendarEvents.id, eventId))
      .returning();
    
    if (!updatedEvent[0]) {
      throw new Error('Failed to update event status');
    }
    
    return { event: updatedEvent[0], job };
  }

  async bulkAssignEvents(eventIds: string[], inspectorId: string, userId: string): Promise<{ events: PendingCalendarEvent[], jobs: Job[] }> {
    const events: PendingCalendarEvent[] = [];
    const jobs: Job[] = [];
    
    // Process each event
    for (const eventId of eventIds) {
      try {
        const result = await this.assignEventToInspector(eventId, inspectorId, userId);
        events.push(result.event);
        jobs.push(result.job);
      } catch (error) {
        // Log error but continue with other events
        console.error(`Failed to assign event ${eventId}:`, error);
      }
    }
    
    return { events, jobs };
  }

  async rejectEvent(eventId: string, userId: string): Promise<PendingCalendarEvent | undefined> {
    const result = await db.update(pendingCalendarEvents)
      .set({
        status: 'rejected',
        processedAt: new Date(),
        processedBy: userId,
      })
      .where(eq(pendingCalendarEvents.id, eventId))
      .returning();
    
    return result[0];
  }

  async getWeeklyWorkload(startDate: Date, endDate: Date): Promise<Array<{
    inspectorId: string;
    inspectorName: string;
    date: string;
    jobCount: number;
    scheduledMinutes: number;
  }>> {
    // Query jobs grouped by inspector and date
    const workload = await db.select({
      inspectorId: jobs.assignedTo,
      date: sql<string>`DATE(${jobs.scheduledDate})`,
      jobCount: sql<number>`count(*)::int`,
      // Assume 2 hours (120 minutes) per job as default duration
      scheduledMinutes: sql<number>`count(*) * 120`,
    })
      .from(jobs)
      .where(
        and(
          gte(jobs.scheduledDate, startDate),
          lte(jobs.scheduledDate, endDate),
          sql`${jobs.assignedTo} IS NOT NULL`,
          sql`${jobs.isCancelled} = false OR ${jobs.isCancelled} IS NULL`
        )
      )
      .groupBy(jobs.assignedTo, sql`DATE(${jobs.scheduledDate})`);
    
    // Enrich with inspector names
    const result = [];
    for (const item of workload) {
      if (!item.inspectorId) continue;
      
      const inspector = await this.getUser(item.inspectorId);
      result.push({
        inspectorId: item.inspectorId,
        inspectorName: inspector 
          ? `${inspector.firstName || ''} ${inspector.lastName || ''}`.trim() || inspector.email || 'Unknown'
          : 'Unknown',
        date: item.date,
        jobCount: item.jobCount,
        scheduledMinutes: item.scheduledMinutes,
      });
    }
    
    return result;
  }

  // New assignment methods with ScheduleEvent creation
  async assignPendingEventToInspector(params: {
    eventId: string;
    inspectorId: string;
    adminId: string;
  }): Promise<{ job: Job; scheduleEvent: ScheduleEvent }> {
    const { eventId, inspectorId, adminId } = params;

    // 1. Get pending event by ID
    const event = await this.getPendingCalendarEvent(eventId);
    if (!event) {
      throw new Error('Pending event not found');
    }

    if (event.status === 'assigned') {
      throw new Error('Event has already been assigned');
    }

    // 2. Verify inspector exists
    const inspector = await this.getUser(inspectorId);
    if (!inspector) {
      throw new Error('Inspector not found');
    }

    // 3. Create Job with assignment details
    const job = await this.createJob({
      name: event.rawTitle,
      address: event.parsedBuilderName || 'Address TBD',
      builderId: event.parsedBuilderId || undefined,
      contractor: event.parsedBuilderName || 'Unknown',
      status: 'scheduled',
      inspectionType: event.parsedJobType || 'other',
      scheduledDate: event.eventDate,
      assignedTo: inspectorId,
      assignedBy: adminId,
      assignedAt: new Date(),
      createdBy: adminId,
      sourceGoogleEventId: event.googleEventId,
      notes: event.rawDescription || undefined,
    });

    // 4. Create ScheduleEvent linked to job
    const scheduleEvent = await this.createScheduleEvent({
      jobId: job.id,
      title: event.rawTitle,
      startTime: event.eventDate,
      endTime: new Date(event.eventDate.getTime() + 2 * 60 * 60 * 1000), // Default 2 hours
      eventType: 'inspection',
      status: 'scheduled',
      location: event.parsedBuilderName || undefined,
      description: event.rawDescription || undefined,
    });

    // 5. Update pending event status
    await db.update(pendingCalendarEvents)
      .set({
        status: 'assigned',
        assignedJobId: job.id,
        processedAt: new Date(),
        processedBy: adminId,
      })
      .where(eq(pendingCalendarEvents.id, eventId));

    // 6. Return job and schedule event
    return { job, scheduleEvent };
  }

  async bulkAssignPendingEvents(params: {
    eventIds: string[];
    inspectorId: string;
    adminId: string;
  }): Promise<{ assignedCount: number; errors: string[] }> {
    const { eventIds, inspectorId, adminId } = params;
    const errors: string[] = [];
    let assignedCount = 0;

    // Loop through eventIds and assign each
    for (const eventId of eventIds) {
      try {
        await this.assignPendingEventToInspector({
          eventId,
          inspectorId,
          adminId,
        });
        assignedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Event ${eventId}: ${errorMessage}`);
      }
    }

    return { assignedCount, errors };
  }

  async getInspectorWorkload(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<Array<{ inspectorId: string; inspectorName: string; jobCount: number }>> {
    const { startDate, endDate } = params;

    // Query jobs grouped by assigned_to
    const workloadData = await db
      .select({
        inspectorId: jobs.assignedTo,
        jobCount: sql<number>`count(*)::int`,
      })
      .from(jobs)
      .where(
        and(
          gte(jobs.scheduledDate, startDate),
          lte(jobs.scheduledDate, endDate),
          sql`${jobs.assignedTo} IS NOT NULL`,
          sql`${jobs.isCancelled} = false OR ${jobs.isCancelled} IS NULL`
        )
      )
      .groupBy(jobs.assignedTo);

    // Enrich with inspector names from users table
    const result = [];
    for (const item of workloadData) {
      if (!item.inspectorId) continue;

      const inspector = await this.getUser(item.inspectorId);
      result.push({
        inspectorId: item.inspectorId,
        inspectorName: inspector
          ? `${inspector.firstName || ''} ${inspector.lastName || ''}`.trim() || inspector.email || 'Unknown'
          : 'Unknown',
        jobCount: item.jobCount,
      });
    }

    return result;
  }

  // Blower Door Tests Implementation
  async createBlowerDoorTest(test: InsertBlowerDoorTest): Promise<BlowerDoorTest> {
    const result = await db.insert(blowerDoorTests)
      .values(test)
      .returning();
    return result[0];
  }

  async getBlowerDoorTest(id: string): Promise<BlowerDoorTest | undefined> {
    const result = await db.select()
      .from(blowerDoorTests)
      .where(eq(blowerDoorTests.id, id))
      .limit(1);
    return result[0];
  }

  async getBlowerDoorTestsByJob(jobId: string): Promise<BlowerDoorTest[]> {
    return await db.select()
      .from(blowerDoorTests)
      .where(eq(blowerDoorTests.jobId, jobId))
      .orderBy(desc(blowerDoorTests.testDate));
  }

  async getLatestBlowerDoorTest(jobId: string): Promise<BlowerDoorTest | undefined> {
    const result = await db.select()
      .from(blowerDoorTests)
      .where(eq(blowerDoorTests.jobId, jobId))
      .orderBy(desc(blowerDoorTests.testDate))
      .limit(1);
    return result[0];
  }

  async updateBlowerDoorTest(id: string, test: Partial<InsertBlowerDoorTest>): Promise<BlowerDoorTest | undefined> {
    const result = await db.update(blowerDoorTests)
      .set({
        ...test,
        updatedAt: new Date(),
      })
      .where(eq(blowerDoorTests.id, id))
      .returning();
    return result[0];
  }

  async deleteBlowerDoorTest(id: string): Promise<boolean> {
    const result = await db.delete(blowerDoorTests)
      .where(eq(blowerDoorTests.id, id))
      .returning();
    return result.length > 0;
  }

  // Financial Operations Implementation
  // Invoices
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices)
      .values(invoice)
      .returning();
    return result[0];
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const result = await db.select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    return result[0];
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .orderBy(desc(invoices.issueDate));
  }

  async getInvoicesByUser(userId: string): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.issueDate));
  }

  async getInvoicesByBuilder(builderId: string): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.builderId, builderId))
      .orderBy(desc(invoices.issueDate));
  }

  async getInvoicesByJob(jobId: string): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.jobId, jobId))
      .orderBy(desc(invoices.issueDate));
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.status, status as any))
      .orderBy(desc(invoices.issueDate));
  }

  async getInvoicesPaginated(params: PaginationParams): Promise<PaginatedResult<Invoice>> {
    const { limit = 10, offset = 0, sortBy = 'issueDate', sortOrder = 'desc' } = params;
    
    const orderByColumn = invoices[sortBy as keyof typeof invoices] || invoices.issueDate;
    const orderByDirection = sortOrder === 'asc' ? asc : desc;
    
    const [totalResult, itemsResult] = await Promise.all([
      db.select({ count: count() }).from(invoices),
      db.select()
        .from(invoices)
        .orderBy(orderByDirection(orderByColumn))
        .limit(limit)
        .offset(offset)
    ]);

    return {
      items: itemsResult,
      total: totalResult[0]?.count ?? 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
    };
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoices)
      .set({
        ...invoice,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();
    return result[0];
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices)
      .where(eq(invoices.id, id))
      .returning();
    return result.length > 0;
  }

  async getNextInvoiceNumber(userId: string): Promise<string> {
    const settings = await this.getFinancialSettings(userId);
    const prefix = settings?.invoicePrefix || 'INV';
    const nextNumber = settings?.nextInvoiceNumber || 1000;
    
    // Update the next invoice number
    if (settings) {
      await this.updateFinancialSettings(userId, {
        nextInvoiceNumber: nextNumber + 1,
      });
    }
    
    return `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
  }

  async markInvoiceAsPaid(id: string, paymentDetails: Partial<InsertPayment>): Promise<Invoice | undefined> {
    // Start a transaction
    const invoice = await this.getInvoice(id);
    if (!invoice) return undefined;

    // Create payment record
    await this.createPayment({
      invoiceId: id,
      amount: paymentDetails.amount || parseFloat(invoice.total),
      paymentDate: paymentDetails.paymentDate || new Date(),
      method: paymentDetails.method || 'cash',
      reference: paymentDetails.reference,
      notes: paymentDetails.notes,
    } as InsertPayment);

    // Update invoice status
    return await this.updateInvoice(id, {
      status: 'paid',
      paidDate: paymentDetails.paymentDate || new Date(),
      paymentMethod: paymentDetails.method,
      paymentReference: paymentDetails.reference,
    });
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments)
      .values(payment)
      .returning();
    return result[0];
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await db.select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return result[0];
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(desc(payments.paymentDate));
  }

  async getPaymentsPaginated(params: PaginationParams): Promise<PaginatedResult<Payment>> {
    const { limit = 10, offset = 0 } = params;
    
    const [totalResult, itemsResult] = await Promise.all([
      db.select({ count: count() }).from(payments),
      db.select()
        .from(payments)
        .orderBy(desc(payments.paymentDate))
        .limit(limit)
        .offset(offset)
    ]);

    return {
      items: itemsResult,
      total: totalResult[0]?.count ?? 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
    };
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const result = await db.update(payments)
      .set(payment)
      .where(eq(payments.id, id))
      .returning();
    return result[0];
  }

  async deletePayment(id: string): Promise<boolean> {
    const result = await db.delete(payments)
      .where(eq(payments.id, id))
      .returning();
    return result.length > 0;
  }

  // Financial Settings
  async getFinancialSettings(userId: string): Promise<FinancialSettings | undefined> {
    const result = await db.select()
      .from(financialSettings)
      .where(eq(financialSettings.userId, userId))
      .limit(1);
    return result[0];
  }

  async createFinancialSettings(settings: InsertFinancialSettings): Promise<FinancialSettings> {
    const result = await db.insert(financialSettings)
      .values(settings)
      .returning();
    return result[0];
  }

  async updateFinancialSettings(userId: string, settings: Partial<InsertFinancialSettings>): Promise<FinancialSettings | undefined> {
    const result = await db.update(financialSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(financialSettings.userId, userId))
      .returning();
    return result[0];
  }

  // Financial Reports
  async getFinancialSummary(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const invoiceConditions = [eq(invoices.userId, userId)];
    const expenseConditions = [eq(expenses.userId, userId)];
    const mileageConditions = [eq(mileageLogs.userId, userId)];
    
    if (startDate) {
      invoiceConditions.push(gte(invoices.issueDate, startDate));
      expenseConditions.push(gte(expenses.date, startDate));
      mileageConditions.push(gte(mileageLogs.date, startDate));
    }
    if (endDate) {
      invoiceConditions.push(lte(invoices.issueDate, endDate));
      expenseConditions.push(lte(expenses.date, endDate));
      mileageConditions.push(lte(mileageLogs.date, endDate));
    }

    const [totalRevenue, totalExpenses, totalMileage, outstandingInvoices, overdueInvoices] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
        .from(invoices)
        .where(and(...invoiceConditions, eq(invoices.status, 'paid'))),
      
      db.select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
        .from(expenses)
        .where(and(...expenseConditions)),
      
      db.select({ 
        totalMiles: sql<number>`COALESCE(SUM(${mileageLogs.distance}), 0)`,
        totalDeduction: sql<number>`COALESCE(SUM(${mileageLogs.deductionAmount}), 0)` 
      })
        .from(mileageLogs)
        .where(and(...mileageConditions, eq(mileageLogs.purpose, 'business'))),
      
      db.select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
        .from(invoices)
        .where(and(...invoiceConditions, inArray(invoices.status, ['sent', 'overdue']))),
      
      db.select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
        .from(invoices)
        .where(and(...invoiceConditions, eq(invoices.status, 'overdue'))),
    ]);

    return {
      totalRevenue: totalRevenue[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      totalMileage: totalMileage[0]?.totalMiles || 0,
      mileageDeduction: totalMileage[0]?.totalDeduction || 0,
      netProfit: (totalRevenue[0]?.total || 0) - (totalExpenses[0]?.total || 0) - (totalMileage[0]?.totalDeduction || 0),
      outstandingInvoices: outstandingInvoices[0]?.total || 0,
      overdueInvoices: overdueInvoices[0]?.total || 0,
    };
  }

  async getRevenueByPeriod(userId: string, period: 'day' | 'week' | 'month' | 'quarter' | 'year'): Promise<any> {
    const dateFormat = {
      day: '%Y-%m-%d',
      week: '%Y-%W',
      month: '%Y-%m',
      quarter: '%Y-Q',
      year: '%Y',
    }[period];

    const result = await db.select({
      period: sql<string>`TO_CHAR(${invoices.issueDate}, '${sql.raw(dateFormat)}')`,
      revenue: sql<number>`COALESCE(SUM(${invoices.total}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
      .from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'paid')
      ))
      .groupBy(sql`TO_CHAR(${invoices.issueDate}, '${sql.raw(dateFormat)}')`)
      .orderBy(sql`TO_CHAR(${invoices.issueDate}, '${sql.raw(dateFormat)}')`);

    return result;
  }

  async getExpensesByCategory(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const conditions = [eq(expenses.userId, userId)];
    if (startDate) conditions.push(gte(expenses.date, startDate));
    if (endDate) conditions.push(lte(expenses.date, endDate));

    const result = await db.select({
      category: expenses.category,
      total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
      .from(expenses)
      .where(and(...conditions))
      .groupBy(expenses.category)
      .orderBy(desc(sql`COALESCE(SUM(${expenses.amount}), 0)`));

    return result;
  }

  async getMileageSummary(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const conditions = [eq(mileageLogs.userId, userId)];
    if (startDate) conditions.push(gte(mileageLogs.date, startDate));
    if (endDate) conditions.push(lte(mileageLogs.date, endDate));

    const result = await db.select({
      purpose: mileageLogs.purpose,
      totalMiles: sql<number>`COALESCE(SUM(${mileageLogs.distance}), 0)`,
      totalDeduction: sql<number>`COALESCE(SUM(${mileageLogs.deductionAmount}), 0)`,
      tripCount: sql<number>`COUNT(*)`,
    })
      .from(mileageLogs)
      .where(and(...conditions))
      .groupBy(mileageLogs.purpose);

    return result;
  }

  async getJobProfitability(jobId: string): Promise<any> {
    const [invoice, jobExpenses, jobMileage] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
        .from(invoices)
        .where(and(eq(invoices.jobId, jobId), eq(invoices.status, 'paid'))),
      
      db.select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
        .from(expenses)
        .where(eq(expenses.jobId, jobId)),
      
      db.select({ 
        totalMiles: sql<number>`COALESCE(SUM(${mileageLogs.distance}), 0)`,
        totalDeduction: sql<number>`COALESCE(SUM(${mileageLogs.deductionAmount}), 0)` 
      })
        .from(mileageLogs)
        .where(and(eq(mileageLogs.jobId, jobId), eq(mileageLogs.purpose, 'business'))),
    ]);

    const revenue = invoice[0]?.total || 0;
    const expenses = jobExpenses[0]?.total || 0;
    const mileageDeduction = jobMileage[0]?.totalDeduction || 0;
    const profit = revenue - expenses - mileageDeduction;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      expenses,
      mileageDeduction,
      profit,
      margin,
    };
  }

  // Duct Leakage Tests Implementation
  async createDuctLeakageTest(test: InsertDuctLeakageTest): Promise<DuctLeakageTest> {
    const result = await db.insert(ductLeakageTests)
      .values(test)
      .returning();
    return result[0];
  }

  async getDuctLeakageTest(id: string): Promise<DuctLeakageTest | undefined> {
    const result = await db.select()
      .from(ductLeakageTests)
      .where(eq(ductLeakageTests.id, id))
      .limit(1);
    return result[0];
  }

  async getDuctLeakageTestsByJob(jobId: string): Promise<DuctLeakageTest[]> {
    return await db.select()
      .from(ductLeakageTests)
      .where(eq(ductLeakageTests.jobId, jobId))
      .orderBy(desc(ductLeakageTests.testDate));
  }

  async getLatestDuctLeakageTest(jobId: string): Promise<DuctLeakageTest | undefined> {
    const result = await db.select()
      .from(ductLeakageTests)
      .where(eq(ductLeakageTests.jobId, jobId))
      .orderBy(desc(ductLeakageTests.testDate))
      .limit(1);
    return result[0];
  }

  async updateDuctLeakageTest(id: string, test: Partial<InsertDuctLeakageTest>): Promise<DuctLeakageTest | undefined> {
    const result = await db.update(ductLeakageTests)
      .set({
        ...test,
        updatedAt: new Date(),
      })
      .where(eq(ductLeakageTests.id, id))
      .returning();
    return result[0];
  }

  async deleteDuctLeakageTest(id: string): Promise<boolean> {
    const result = await db.delete(ductLeakageTests)
      .where(eq(ductLeakageTests.id, id))
      .returning();
    return result.length > 0;
  }

  // 45L Tax Credit Implementations
  
  // Tax Credit Projects
  async createTaxCreditProject(project: InsertTaxCreditProject): Promise<TaxCreditProject> {
    const result = await db.insert(taxCreditProjects)
      .values(project)
      .returning();
    return result[0];
  }

  async getTaxCreditProject(id: string): Promise<TaxCreditProject | undefined> {
    const result = await db.select()
      .from(taxCreditProjects)
      .where(eq(taxCreditProjects.id, id))
      .limit(1);
    return result[0];
  }

  async getTaxCreditProjectsByBuilder(builderId: string): Promise<TaxCreditProject[]> {
    return await db.select()
      .from(taxCreditProjects)
      .where(eq(taxCreditProjects.builderId, builderId))
      .orderBy(desc(taxCreditProjects.createdAt));
  }

  async getTaxCreditProjectsByYear(taxYear: number): Promise<TaxCreditProject[]> {
    return await db.select()
      .from(taxCreditProjects)
      .where(eq(taxCreditProjects.taxYear, taxYear))
      .orderBy(desc(taxCreditProjects.createdAt));
  }

  async getTaxCreditProjectsPaginated(params: PaginationParams): Promise<PaginatedResult<TaxCreditProject>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(taxCreditProjects).limit(limit).offset(offset).orderBy(desc(taxCreditProjects.createdAt)),
      db.select({ count: count() }).from(taxCreditProjects)
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

  async updateTaxCreditProject(id: string, project: Partial<InsertTaxCreditProject>): Promise<TaxCreditProject | undefined> {
    const result = await db.update(taxCreditProjects)
      .set({
        ...project,
        updatedAt: new Date(),
      })
      .where(eq(taxCreditProjects.id, id))
      .returning();
    return result[0];
  }

  async deleteTaxCreditProject(id: string): Promise<boolean> {
    const result = await db.delete(taxCreditProjects)
      .where(eq(taxCreditProjects.id, id))
      .returning();
    return result.length > 0;
  }

  // Tax Credit Requirements
  async createTaxCreditRequirement(requirement: InsertTaxCreditRequirement): Promise<TaxCreditRequirement> {
    const result = await db.insert(taxCreditRequirements)
      .values(requirement)
      .returning();
    return result[0];
  }

  async getTaxCreditRequirement(id: string): Promise<TaxCreditRequirement | undefined> {
    const result = await db.select()
      .from(taxCreditRequirements)
      .where(eq(taxCreditRequirements.id, id))
      .limit(1);
    return result[0];
  }

  async getTaxCreditRequirementsByProject(projectId: string): Promise<TaxCreditRequirement[]> {
    return await db.select()
      .from(taxCreditRequirements)
      .where(eq(taxCreditRequirements.projectId, projectId))
      .orderBy(taxCreditRequirements.requirementType);
  }

  async updateTaxCreditRequirement(id: string, requirement: Partial<InsertTaxCreditRequirement>): Promise<TaxCreditRequirement | undefined> {
    const result = await db.update(taxCreditRequirements)
      .set({
        ...requirement,
        updatedAt: new Date(),
      })
      .where(eq(taxCreditRequirements.id, id))
      .returning();
    return result[0];
  }

  async deleteTaxCreditRequirement(id: string): Promise<boolean> {
    const result = await db.delete(taxCreditRequirements)
      .where(eq(taxCreditRequirements.id, id))
      .returning();
    return result.length > 0;
  }

  // Tax Credit Documents
  async createTaxCreditDocument(document: InsertTaxCreditDocument): Promise<TaxCreditDocument> {
    const result = await db.insert(taxCreditDocuments)
      .values(document)
      .returning();
    return result[0];
  }

  async getTaxCreditDocument(id: string): Promise<TaxCreditDocument | undefined> {
    const result = await db.select()
      .from(taxCreditDocuments)
      .where(eq(taxCreditDocuments.id, id))
      .limit(1);
    return result[0];
  }

  async getTaxCreditDocumentsByProject(projectId: string): Promise<TaxCreditDocument[]> {
    return await db.select()
      .from(taxCreditDocuments)
      .where(eq(taxCreditDocuments.projectId, projectId))
      .orderBy(desc(taxCreditDocuments.uploadDate));
  }

  async updateTaxCreditDocument(id: string, document: Partial<InsertTaxCreditDocument>): Promise<TaxCreditDocument | undefined> {
    const result = await db.update(taxCreditDocuments)
      .set(document)
      .where(eq(taxCreditDocuments.id, id))
      .returning();
    return result[0];
  }

  async deleteTaxCreditDocument(id: string): Promise<boolean> {
    const result = await db.delete(taxCreditDocuments)
      .where(eq(taxCreditDocuments.id, id))
      .returning();
    return result.length > 0;
  }

  // Unit Certifications
  async createUnitCertification(certification: InsertUnitCertification): Promise<UnitCertification> {
    const result = await db.insert(unitCertifications)
      .values(certification)
      .returning();
    return result[0];
  }

  async getUnitCertification(id: string): Promise<UnitCertification | undefined> {
    const result = await db.select()
      .from(unitCertifications)
      .where(eq(unitCertifications.id, id))
      .limit(1);
    return result[0];
  }

  async getUnitCertificationsByProject(projectId: string): Promise<UnitCertification[]> {
    return await db.select()
      .from(unitCertifications)
      .where(eq(unitCertifications.projectId, projectId))
      .orderBy(unitCertifications.unitAddress);
  }

  async getUnitCertificationByJob(jobId: string): Promise<UnitCertification | undefined> {
    const result = await db.select()
      .from(unitCertifications)
      .where(eq(unitCertifications.jobId, jobId))
      .limit(1);
    return result[0];
  }

  async updateUnitCertification(id: string, certification: Partial<InsertUnitCertification>): Promise<UnitCertification | undefined> {
    const result = await db.update(unitCertifications)
      .set({
        ...certification,
        updatedAt: new Date(),
      })
      .where(eq(unitCertifications.id, id))
      .returning();
    return result[0];
  }

  async deleteUnitCertification(id: string): Promise<boolean> {
    const result = await db.delete(unitCertifications)
      .where(eq(unitCertifications.id, id))
      .returning();
    return result.length > 0;
  }

  // Equipment Management Implementation
  async createEquipment(insertEquipment: InsertEquipment): Promise<Equipment> {
    const result = await db.insert(equipment).values(insertEquipment).returning();
    return result[0];
  }

  async getEquipment(id: string): Promise<Equipment | undefined> {
    const result = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
    return result[0];
  }

  async getEquipmentByUser(userId: string): Promise<Equipment[]> {
    return await db.select()
      .from(equipment)
      .where(eq(equipment.userId, userId))
      .orderBy(asc(equipment.name));
  }

  async getEquipmentByStatus(status: string): Promise<Equipment[]> {
    return await db.select()
      .from(equipment)
      .where(eq(equipment.status, status))
      .orderBy(asc(equipment.name));
  }

  async getEquipmentDueForCalibration(days: number): Promise<Equipment[]> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    
    return await db.select()
      .from(equipment)
      .where(and(
        lte(equipment.calibrationDue, dueDate),
        eq(equipment.status, 'available')
      ))
      .orderBy(asc(equipment.calibrationDue));
  }

  async getEquipmentDueForMaintenance(days: number): Promise<Equipment[]> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    
    return await db.select()
      .from(equipment)
      .where(and(
        lte(equipment.maintenanceDue, dueDate),
        eq(equipment.status, 'available')
      ))
      .orderBy(asc(equipment.maintenanceDue));
  }

  async getAllEquipment(): Promise<Equipment[]> {
    return await db.select().from(equipment).orderBy(asc(equipment.name));
  }

  async getEquipmentPaginated(params: PaginationParams): Promise<PaginatedResult<Equipment>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(equipment).limit(limit).offset(offset).orderBy(asc(equipment.name)),
      db.select({ count: count() }).from(equipment)
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

  async updateEquipment(id: string, updates: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const result = await db.update(equipment)
      .set(updates)
      .where(eq(equipment.id, id))
      .returning();
    return result[0];
  }

  async deleteEquipment(id: string): Promise<boolean> {
    const result = await db.delete(equipment).where(eq(equipment.id, id)).returning();
    return result.length > 0;
  }

  // Equipment Calibrations Implementation
  async createEquipmentCalibration(calibration: InsertEquipmentCalibration): Promise<EquipmentCalibration> {
    const result = await db.insert(equipmentCalibrations).values(calibration).returning();
    
    // Update equipment's calibration dates
    if (result[0]) {
      await db.update(equipment)
        .set({
          lastCalibration: calibration.calibrationDate,
          calibrationDue: calibration.nextDue,
        })
        .where(eq(equipment.id, calibration.equipmentId));
    }
    
    return result[0];
  }

  async getEquipmentCalibration(id: string): Promise<EquipmentCalibration | undefined> {
    const result = await db.select()
      .from(equipmentCalibrations)
      .where(eq(equipmentCalibrations.id, id))
      .limit(1);
    return result[0];
  }

  async getEquipmentCalibrations(equipmentId: string): Promise<EquipmentCalibration[]> {
    return await db.select()
      .from(equipmentCalibrations)
      .where(eq(equipmentCalibrations.equipmentId, equipmentId))
      .orderBy(desc(equipmentCalibrations.calibrationDate));
  }

  async getUpcomingCalibrations(days: number): Promise<EquipmentCalibration[]> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    
    return await db.select()
      .from(equipmentCalibrations)
      .where(lte(equipmentCalibrations.nextDue, dueDate))
      .orderBy(asc(equipmentCalibrations.nextDue));
  }

  async getOverdueCalibrations(): Promise<EquipmentCalibration[]> {
    const today = new Date();
    
    return await db.select()
      .from(equipmentCalibrations)
      .where(lt(equipmentCalibrations.nextDue, today))
      .orderBy(asc(equipmentCalibrations.nextDue));
  }

  async updateEquipmentCalibration(id: string, updates: Partial<InsertEquipmentCalibration>): Promise<EquipmentCalibration | undefined> {
    const result = await db.update(equipmentCalibrations)
      .set(updates)
      .where(eq(equipmentCalibrations.id, id))
      .returning();
    return result[0];
  }

  async deleteEquipmentCalibration(id: string): Promise<boolean> {
    const result = await db.delete(equipmentCalibrations)
      .where(eq(equipmentCalibrations.id, id))
      .returning();
    return result.length > 0;
  }

  // Equipment Maintenance Implementation
  async createEquipmentMaintenance(maintenance: InsertEquipmentMaintenance): Promise<EquipmentMaintenance> {
    const result = await db.insert(equipmentMaintenance).values(maintenance).returning();
    
    // Update equipment's maintenance dates
    if (result[0]) {
      await db.update(equipment)
        .set({
          lastMaintenance: maintenance.maintenanceDate,
          maintenanceDue: maintenance.nextDue,
        })
        .where(eq(equipment.id, maintenance.equipmentId));
    }
    
    return result[0];
  }

  async getEquipmentMaintenance(id: string): Promise<EquipmentMaintenance | undefined> {
    const result = await db.select()
      .from(equipmentMaintenance)
      .where(eq(equipmentMaintenance.id, id))
      .limit(1);
    return result[0];
  }

  async getEquipmentMaintenanceHistory(equipmentId: string): Promise<EquipmentMaintenance[]> {
    return await db.select()
      .from(equipmentMaintenance)
      .where(eq(equipmentMaintenance.equipmentId, equipmentId))
      .orderBy(desc(equipmentMaintenance.maintenanceDate));
  }

  async getUpcomingMaintenance(days: number): Promise<EquipmentMaintenance[]> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    
    return await db.select()
      .from(equipmentMaintenance)
      .where(lte(equipmentMaintenance.nextDue, dueDate))
      .orderBy(asc(equipmentMaintenance.nextDue));
  }

  async updateEquipmentMaintenance(id: string, updates: Partial<InsertEquipmentMaintenance>): Promise<EquipmentMaintenance | undefined> {
    const result = await db.update(equipmentMaintenance)
      .set(updates)
      .where(eq(equipmentMaintenance.id, id))
      .returning();
    return result[0];
  }

  async deleteEquipmentMaintenance(id: string): Promise<boolean> {
    const result = await db.delete(equipmentMaintenance)
      .where(eq(equipmentMaintenance.id, id))
      .returning();
    return result.length > 0;
  }

  // Equipment Checkouts Implementation
  async createEquipmentCheckout(checkout: InsertEquipmentCheckout): Promise<EquipmentCheckout> {
    const result = await db.insert(equipmentCheckouts).values(checkout).returning();
    
    // Update equipment status to in_use
    if (result[0]) {
      await db.update(equipment)
        .set({
          status: 'in_use',
          assignedTo: checkout.userId,
        })
        .where(eq(equipment.id, checkout.equipmentId));
    }
    
    return result[0];
  }

  async getEquipmentCheckout(id: string): Promise<EquipmentCheckout | undefined> {
    const result = await db.select()
      .from(equipmentCheckouts)
      .where(eq(equipmentCheckouts.id, id))
      .limit(1);
    return result[0];
  }

  async getEquipmentCheckouts(equipmentId: string): Promise<EquipmentCheckout[]> {
    return await db.select()
      .from(equipmentCheckouts)
      .where(eq(equipmentCheckouts.equipmentId, equipmentId))
      .orderBy(desc(equipmentCheckouts.checkoutDate));
  }

  async getActiveCheckouts(): Promise<EquipmentCheckout[]> {
    return await db.select()
      .from(equipmentCheckouts)
      .where(eq(equipmentCheckouts.actualReturn, null))
      .orderBy(desc(equipmentCheckouts.checkoutDate));
  }

  async getCheckoutsByUser(userId: string): Promise<EquipmentCheckout[]> {
    return await db.select()
      .from(equipmentCheckouts)
      .where(eq(equipmentCheckouts.userId, userId))
      .orderBy(desc(equipmentCheckouts.checkoutDate));
  }

  async getCheckoutsByJob(jobId: string): Promise<EquipmentCheckout[]> {
    return await db.select()
      .from(equipmentCheckouts)
      .where(eq(equipmentCheckouts.jobId, jobId))
      .orderBy(desc(equipmentCheckouts.checkoutDate));
  }

  async checkInEquipment(checkoutId: string, actualReturn: Date, condition: string, notes?: string): Promise<EquipmentCheckout | undefined> {
    const checkout = await this.getEquipmentCheckout(checkoutId);
    if (!checkout) return undefined;

    const result = await db.update(equipmentCheckouts)
      .set({
        actualReturn,
        condition,
        notes: notes || checkout.notes,
      })
      .where(eq(equipmentCheckouts.id, checkoutId))
      .returning();
    
    // Update equipment status to available
    if (result[0]) {
      await db.update(equipment)
        .set({
          status: 'available',
          assignedTo: null,
        })
        .where(eq(equipment.id, checkout.equipmentId));
    }
    
    return result[0];
  }

  async updateEquipmentCheckout(id: string, updates: Partial<InsertEquipmentCheckout>): Promise<EquipmentCheckout | undefined> {
    const result = await db.update(equipmentCheckouts)
      .set(updates)
      .where(eq(equipmentCheckouts.id, id))
      .returning();
    return result[0];
  }

  async deleteEquipmentCheckout(id: string): Promise<boolean> {
    const result = await db.delete(equipmentCheckouts)
      .where(eq(equipmentCheckouts.id, id))
      .returning();
    return result.length > 0;
  }

  // Gamification methods are now defined earlier in the file (lines 3309-3416)
  // using the correct achievement/userAchievement schema
  
  // Achievement Stats
  async getUserAchievementStats(userId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    recentUnlocks: UserAchievement[];
  }> {
    const userAchievementsWithDetails = await this.getUserAchievementWithDetails(userId);
    
    const byCategory: Record<string, number> = {};
    for (const ua of userAchievementsWithDetails) {
      const category = ua.achievement?.type || 'other';
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    // Return just the base userAchievement data without the joined achievement
    const baseAchievements = userAchievementsWithDetails.map(ua => ({
      id: ua.id,
      userId: ua.userId,
      achievementId: ua.achievementId,
      earnedAt: ua.earnedAt,
      progress: ua.progress,
      metadata: ua.metadata,
    }));

    return {
      total: baseAchievements.length,
      byCategory,
      recentUnlocks: baseAchievements.slice(0, 5)
    };
  }
  
  // XP and Level Methods
  async getUserXP(userId: string): Promise<number> {
    const userAchievements = await this.getUserAchievements(userId);
    let totalXP = 0;
    
    // Sum XP from user achievements
    for (const ua of userAchievements) {
      totalXP += ua.progress || 0;
    }
    
    return totalXP;
  }

  async updateUserXP(userId: string, xpToAdd: number): Promise<number> {
    const currentXP = await this.getUserXP(userId);
    return currentXP + xpToAdd;
  }

  // Leaderboard Methods
  async getLeaderboard(
    period: 'week' | 'month' | 'year' | 'all_time',
    category: 'overall' | 'inspections' | 'quality' | 'speed' | 'photos',
    limit: number = 10
  ): Promise<Array<{
    userId: string;
    userName: string;
    totalXP: number;
    achievementCount: number;
    rank: number;
  }>> {
    const allUsers = await db.select().from(users);
    
    const userScores = await Promise.all(
      allUsers.map(async (user) => {
        const xp = await this.getUserXP(user.id);
        const achievements = await this.getUserAchievements(user.id);
        
        return {
          userId: user.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
          totalXP: xp,
          achievementCount: achievements.length,
          rank: 0
        };
      })
    );

    userScores.sort((a, b) => b.totalXP - a.totalXP);
    userScores.forEach((score, index) => {
      score.rank = index + 1;
    });

    return userScores.slice(0, limit);
  }

  async getUserLeaderboardPosition(
    userId: string,
    period: 'week' | 'month' | 'year' | 'all_time'
  ): Promise<{ rank: number; nearbyUsers: any[] }> {
    const leaderboard = await this.getLeaderboard(period, 'overall', 1000);
    const userIndex = leaderboard.findIndex(entry => entry.userId === userId);
    
    if (userIndex === -1) {
      return { rank: 0, nearbyUsers: [] };
    }

    const rank = userIndex + 1;
    const start = Math.max(0, userIndex - 2);
    const end = Math.min(leaderboard.length, userIndex + 3);
    const nearbyUsers = leaderboard.slice(start, end);

    return { rank, nearbyUsers };
  }

  // Streak Methods
  async getUserStreaks(userId: string): Promise<Array<{
    type: string;
    current: number;
    best: number;
    lastDate: string;
  }>> {
    return [];
  }

  async updateStreak(
    userId: string,
    streakType: string,
    increment: boolean = true
  ): Promise<void> {
    // Streak tracking would be implemented with a dedicated table
  }

  // Challenge Methods
  async getActiveChallenges(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    requirements: any[];
    rewards: any;
    startDate: Date;
    endDate: Date;
  }>> {
    return [
      {
        id: 'weekly_inspections',
        name: 'Weekly Warrior',
        description: 'Complete 20 inspections this week',
        type: 'weekly',
        requirements: [{ type: 'inspections_completed', target: 20, current: 0 }],
        rewards: { xp: 500, badges: ['weekly_warrior'] },
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  async getChallengeProgress(userId: string, challengeId: string): Promise<any> {
    return {
      challengeId,
      userId,
      progress: 0,
      completed: false
    };
  }

  async joinChallenge(userId: string, challengeId: string): Promise<void> {
    // Challenge participation tracking would be implemented
  }

  async updateChallengeProgress(
    userId: string,
    challengeId: string,
    progress: number
  ): Promise<void> {
    // Challenge progress tracking would be implemented
  }

  // Statistics Methods
  async getUserStatistics(userId: string): Promise<Record<string, number>> {
    const jobs = await this.getJobsByUser(userId);
    const photos = await this.getPhotosByUser(userId);
    const achievements = await this.getUserAchievements(userId);
    
    const stats: Record<string, number> = {
      inspections_completed: jobs.filter(j => j.status === 'completed').length,
      photos_taken: photos.length,
      achievements_unlocked: achievements.length,
      total_xp: await this.getUserXP(userId),
    };

    return stats;
  }

  async getGlobalStatistics(): Promise<Record<string, any>> {
    const totalUsers = await db.select({ count: count() }).from(users);
    const totalJobs = await db.select({ count: count() }).from(jobs);
    const totalAchievements = await db.select({ count: count() }).from(achievements);
    
    return {
      totalUsers: totalUsers[0].count,
      totalJobs: totalJobs[0].count,
      totalAchievements: totalAchievements[0].count,
    };
  }

  // Notification Operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [result] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return result;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [result] = await db
      .update(notifications)
      .set({ 
        isRead: true, 
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(notifications.id, id))
      .returning();
    return result;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        isRead: true, 
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return result.length > 0;
  }

  async deleteExpiredNotifications(): Promise<number> {
    const result = await db
      .delete(notifications)
      .where(and(
        lte(notifications.expiresAt, new Date()),
        eq(notifications.isRead, true)
      ));
    return result.length;
  }

  // Notification Preferences
  async createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference> {
    const [result] = await db.insert(notificationPreferences).values(preference).returning();
    return result;
  }

  async getNotificationPreference(id: string): Promise<NotificationPreference | undefined> {
    const [result] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.id, id))
      .limit(1);
    return result;
  }

  async getUserNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    return await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  async updateNotificationPreference(
    id: string, 
    preference: Partial<InsertNotificationPreference>
  ): Promise<NotificationPreference | undefined> {
    const [result] = await db
      .update(notificationPreferences)
      .set({
        ...preference,
        updatedAt: new Date()
      })
      .where(eq(notificationPreferences.id, id))
      .returning();
    return result;
  }

  async upsertNotificationPreference(
    userId: string,
    notificationType: string,
    preference: Partial<InsertNotificationPreference>
  ): Promise<NotificationPreference> {
    // Check if preference exists
    const existing = await db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, notificationType)
      ))
      .limit(1);

    if (existing[0]) {
      // Update existing preference
      const [result] = await db
        .update(notificationPreferences)
        .set({
          ...preference,
          updatedAt: new Date()
        })
        .where(eq(notificationPreferences.id, existing[0].id))
        .returning();
      return result;
    } else {
      // Create new preference
      const [result] = await db
        .insert(notificationPreferences)
        .values({
          userId,
          notificationType,
          ...preference
        })
        .returning();
      return result;
    }
  }

  async deleteNotificationPreference(id: string): Promise<boolean> {
    const result = await db.delete(notificationPreferences).where(eq(notificationPreferences.id, id));
    return result.length > 0;
  }

  // Inspector Assignment Operations
  async getInspectorWorkload(inspectorId: string, date: Date): Promise<InspectorWorkload | undefined> {
    const [result] = await db
      .select()
      .from(inspectorWorkload)
      .where(and(
        eq(inspectorWorkload.inspectorId, inspectorId),
        eq(inspectorWorkload.date, date)
      ))
      .limit(1);
    return result;
  }

  async getInspectorWorkloadRange(inspectorId: string, startDate: Date, endDate: Date): Promise<InspectorWorkload[]> {
    return await db
      .select()
      .from(inspectorWorkload)
      .where(and(
        eq(inspectorWorkload.inspectorId, inspectorId),
        gte(inspectorWorkload.date, startDate),
        lte(inspectorWorkload.date, endDate)
      ))
      .orderBy(asc(inspectorWorkload.date));
  }

  async getAllInspectorsWorkload(date: Date): Promise<InspectorWorkload[]> {
    return await db
      .select()
      .from(inspectorWorkload)
      .where(eq(inspectorWorkload.date, date))
      .orderBy(asc(inspectorWorkload.workloadLevel), asc(inspectorWorkload.jobCount));
  }

  async upsertInspectorWorkload(workload: InsertInspectorWorkload): Promise<InspectorWorkload> {
    const existing = await this.getInspectorWorkload(workload.inspectorId, workload.date);
    
    if (existing) {
      const [result] = await db
        .update(inspectorWorkload)
        .set({
          ...workload,
          updatedAt: new Date()
        })
        .where(eq(inspectorWorkload.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(inspectorWorkload)
        .values(workload)
        .returning();
      return result;
    }
  }

  async updateInspectorWorkloadFromJobs(inspectorId: string, date: Date): Promise<InspectorWorkload> {
    // Get all jobs for this inspector on the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const jobsList = await db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.assignedTo, inspectorId),
        gte(jobs.scheduledDate, startOfDay),
        lte(jobs.scheduledDate, endOfDay)
      ));

    // Calculate workload metrics
    const jobCount = jobsList.length;
    const scheduledMinutes = jobsList.reduce((total, job) => {
      // Estimate time based on inspection type
      const baseTime = job.inspectionType === 'final' ? 120 : 90;
      const travelTime = 30; // Average travel time between jobs
      return total + baseTime + travelTime;
    }, 0);

    // Determine workload level
    let workloadLevel: 'light' | 'moderate' | 'heavy' | 'overbooked' = 'light';
    if (jobCount === 0) {
      workloadLevel = 'light';
    } else if (jobCount <= 3) {
      workloadLevel = 'moderate';
    } else if (jobCount <= 5) {
      workloadLevel = 'heavy';
    } else {
      workloadLevel = 'overbooked';
    }

    // Get last job location
    const lastJob = jobsList[jobsList.length - 1];
    
    return await this.upsertInspectorWorkload({
      inspectorId,
      date,
      jobCount,
      scheduledMinutes,
      workloadLevel,
      lastJobLatitude: null, // Would need geocoding to get actual coordinates
      lastJobLongitude: null,
    });
  }

  // Assignment History
  async createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory> {
    const [result] = await db.insert(assignmentHistory).values(history).returning();
    return result;
  }

  async getAssignmentHistory(jobId: string): Promise<AssignmentHistory[]> {
    return await db
      .select()
      .from(assignmentHistory)
      .where(eq(assignmentHistory.jobId, jobId))
      .orderBy(desc(assignmentHistory.assignedAt));
  }

  async getInspectorAssignmentHistory(inspectorId: string, startDate?: Date, endDate?: Date): Promise<AssignmentHistory[]> {
    let query = db
      .select()
      .from(assignmentHistory)
      .where(eq(assignmentHistory.assignedTo, inspectorId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(assignmentHistory.assignedTo, inspectorId),
        gte(assignmentHistory.assignedAt, startDate),
        lte(assignmentHistory.assignedAt, endDate)
      ));
    }
    
    return await query.orderBy(desc(assignmentHistory.assignedAt));
  }

  // Inspector Preferences
  async getInspectorPreferences(inspectorId: string): Promise<InspectorPreferences | undefined> {
    const [result] = await db
      .select()
      .from(inspectorPreferences)
      .where(eq(inspectorPreferences.inspectorId, inspectorId))
      .limit(1);
    return result;
  }

  async getAllInspectorPreferences(): Promise<InspectorPreferences[]> {
    return await db.select().from(inspectorPreferences);
  }

  async upsertInspectorPreferences(preferences: InsertInspectorPreferences): Promise<InspectorPreferences> {
    const existing = await this.getInspectorPreferences(preferences.inspectorId);
    
    if (existing) {
      const [result] = await db
        .update(inspectorPreferences)
        .set({
          ...preferences,
          updatedAt: new Date()
        })
        .where(eq(inspectorPreferences.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(inspectorPreferences)
        .values(preferences)
        .returning();
      return result;
    }
  }

  async deleteInspectorPreferences(inspectorId: string): Promise<boolean> {
    const result = await db
      .delete(inspectorPreferences)
      .where(eq(inspectorPreferences.inspectorId, inspectorId))
      .returning();
    return result.length > 0;
  }

  // Workload Calculation and Assignment
  async suggestOptimalInspector(jobId: string, date: Date): Promise<{ inspectorId: string; score: number; reasons: string[] } | null> {
    // Get the job details
    const job = await this.getJob(jobId);
    if (!job) return null;

    // Get all inspectors
    const inspectorsList = await db
      .select()
      .from(users)
      .where(or(eq(users.role, 'inspector'), eq(users.role, 'admin')));

    // Get workloads for all inspectors on the target date
    const workloads = await this.getAllInspectorsWorkload(date);
    const preferences = await this.getAllInspectorPreferences();

    let bestInspector: { inspectorId: string; score: number; reasons: string[] } | null = null;
    let bestScore = -Infinity;

    for (const inspector of inspectorsList) {
      const workload = workloads.find(w => w.inspectorId === inspector.id);
      const preference = preferences.find(p => p.inspectorId === inspector.id);
      
      let score = 100; // Start with perfect score
      const reasons: string[] = [];

      // Check workload level
      if (!workload || workload.workloadLevel === 'light') {
        score += 30;
        reasons.push('Light workload');
      } else if (workload.workloadLevel === 'moderate') {
        score += 10;
        reasons.push('Moderate workload');
      } else if (workload.workloadLevel === 'heavy') {
        score -= 20;
        reasons.push('Heavy workload');
      } else if (workload.workloadLevel === 'overbooked') {
        score -= 50;
        reasons.push('Overbooked');
      }

      // Check job count
      const jobCount = workload?.jobCount || 0;
      if (jobCount < (preference?.maxDailyJobs || 5)) {
        score += 20;
        reasons.push(`${(preference?.maxDailyJobs || 5) - jobCount} slots available`);
      } else {
        score -= 40;
        reasons.push('At daily capacity');
      }

      // Check territory preferences
      if (preference?.preferredTerritories?.length) {
        // Simple territory matching based on address
        const jobTerritory = job.address?.split(',')[1]?.trim(); // Get city from address
        if (jobTerritory && preference.preferredTerritories.includes(jobTerritory)) {
          score += 25;
          reasons.push('Preferred territory');
        }
      }

      // Check availability
      if (preference?.unavailableDates) {
        const isUnavailable = preference.unavailableDates.some(d => {
          const unavailDate = new Date(d);
          return unavailDate.toDateString() === date.toDateString();
        });
        if (isUnavailable) {
          score -= 100;
          reasons.push('Not available on this date');
        }
      }

      // Check specializations
      if (preference?.specializations?.includes(job.inspectionType)) {
        score += 15;
        reasons.push(`Specializes in ${job.inspectionType}`);
      }

      // Update best inspector if this one has a better score
      if (score > bestScore) {
        bestScore = score;
        bestInspector = {
          inspectorId: inspector.id,
          score,
          reasons
        };
      }
    }

    return bestInspector;
  }

  async assignJobToInspector(jobId: string, inspectorId: string, assignedBy: string, reason?: string): Promise<Job> {
    // Get current job to check previous assignment
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const previousAssignee = job.assignedTo;

    // Update the job with the new assignment
    const updatedJob = await this.updateJob(jobId, { assignedTo: inspectorId });
    if (!updatedJob) {
      throw new Error('Failed to update job assignment');
    }

    // Create assignment history record
    await this.createAssignmentHistory({
      jobId,
      assignedTo: inspectorId,
      assignedBy,
      action: previousAssignee ? 'reassigned' : 'assigned',
      previousAssignee,
      reason,
      metadata: {
        jobName: job.name,
        inspectionType: job.inspectionType,
        scheduledDate: job.scheduledDate
      }
    });

    // Update workload for the new inspector
    if (job.scheduledDate) {
      await this.updateInspectorWorkloadFromJobs(inspectorId, job.scheduledDate);
    }

    // Update workload for previous inspector if there was one
    if (previousAssignee && job.scheduledDate) {
      await this.updateInspectorWorkloadFromJobs(previousAssignee, job.scheduledDate);
    }

    return updatedJob;
  }

  async bulkAssignJobs(assignments: Array<{ jobId: string; inspectorId: string }>, assignedBy: string): Promise<Job[]> {
    const results: Job[] = [];
    
    for (const { jobId, inspectorId } of assignments) {
      try {
        const assignedJob = await this.assignJobToInspector(
          jobId,
          inspectorId,
          assignedBy,
          'Bulk assignment'
        );
        results.push(assignedJob);
      } catch (error) {
        serverLogger.error(`Failed to assign job ${jobId} to inspector ${inspectorId}:`, error);
      }
    }
    
    return results;
  }

  async getAllInspectorWorkloads(date: Date): Promise<Array<{ inspector: User; workload: InspectorWorkload | null }>> {
    // Get all inspectors
    const inspectorsList = await db
      .select()
      .from(users)
      .where(or(eq(users.role, 'inspector'), eq(users.role, 'admin')));

    // Get workloads for the date
    const workloads = await this.getAllInspectorsWorkload(date);

    // Combine inspector data with workloads
    return inspectorsList.map(inspector => ({
      inspector,
      workload: workloads.find(w => w.inspectorId === inspector.id) || null
    }));
  }

  async updateInspectorPreferences(inspectorId: string, preferences: Partial<InsertInspectorPreferences>): Promise<InspectorPreferences> {
    return await this.upsertInspectorPreferences({
      ...preferences,
      inspectorId
    });
  }

  // Additional Helper Methods for Inspector Assignment
  async getJobsByDateRange(startDate: Date, endDate: Date): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(and(
        gte(jobs.scheduledDate, startDate),
        lte(jobs.scheduledDate, endDate)
      ))
      .orderBy(asc(jobs.scheduledDate));
  }

  async getUsersByRoles(roles: string[]): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(inArray(users.role, roles));
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(asc(users.firstName), asc(users.lastName));
  }

  // Analytics Dashboard Implementation Methods
  async getDashboardSummary(): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get all blower door tests for ACH50 calculations
    const blowerTests = await db.select().from(blowerDoorTests);
    
    // Calculate total inspections and average ACH50
    const totalInspections = blowerTests.length;
    const avgACH50 = totalInspections > 0
      ? blowerTests.reduce((sum, test) => sum + (test.ach50 || 0), 0) / totalInspections
      : 0;
    
    // Calculate tier distribution
    const tierDistribution = this.calculateTierDistribution(blowerTests);
    
    // Calculate pass/fail rates (ACH50 <= 3.0 is passing)
    const passedTests = blowerTests.filter(test => test.ach50 && test.ach50 <= 3.0);
    const passRate = totalInspections > 0 ? (passedTests.length / totalInspections) * 100 : 0;
    const failRate = 100 - passRate;
    
    // Calculate 45L eligible count (ACH50 <= 2.5)
    const tax45LEligibleCount = blowerTests.filter(test => test.ach50 && test.ach50 <= 2.5).length;
    
    // Calculate potential tax credits ($2500 per eligible unit)
    const totalPotentialTaxCredits = tax45LEligibleCount * 2500;
    
    // Get monthly highlights
    const monthlyHighlights = await this.getMonthlyHighlights(startOfMonth, endOfMonth);
    
    return {
      totalInspections,
      averageACH50: parseFloat(avgACH50.toFixed(2)),
      tierDistribution,
      passRate: parseFloat(passRate.toFixed(1)),
      failRate: parseFloat(failRate.toFixed(1)),
      tax45LEligibleCount,
      totalPotentialTaxCredits,
      monthlyHighlights
    };
  }

  async getBuilderLeaderboard(): Promise<any[]> {
    // Get all builders with their jobs and test results
    const buildersData = await db.select().from(builders);
    const jobsData = await db.select().from(jobs);
    const blowerTests = await db.select().from(blowerDoorTests);
    
    const leaderboard = await Promise.all(buildersData.map(async (builder) => {
      // Get all jobs for this builder
      const builderJobs = jobsData.filter(job => job.builderId === builder.id);
      const builderJobIds = builderJobs.map(j => j.id);
      
      // Get all blower door tests for builder's jobs
      const builderTests = blowerTests.filter(test => 
        test.jobId && builderJobIds.includes(test.jobId)
      );
      
      const totalJobs = builderJobs.length;
      const completedJobs = builderJobs.filter(job => job.status === 'completed').length;
      
      // Calculate average ACH50
      const avgACH50 = builderTests.length > 0
        ? builderTests.reduce((sum, test) => sum + (test.ach50 || 0), 0) / builderTests.length
        : 0;
      
      // Get best and latest ACH50
      const bestACH50 = builderTests.length > 0
        ? Math.min(...builderTests.filter(t => t.ach50).map(t => t.ach50!))
        : 0;
        
      const sortedTests = [...builderTests].sort((a, b) => 
        new Date(b.testDate || 0).getTime() - new Date(a.testDate || 0).getTime()
      );
      const latestACH50 = sortedTests[0]?.ach50 || null;
      
      // Calculate pass rate
      const passedTests = builderTests.filter(test => test.ach50 && test.ach50 <= 3.0);
      const passRate = builderTests.length > 0 
        ? (passedTests.length / builderTests.length) * 100 
        : 0;
      
      // Calculate tier
      const tier = this.calculateTier(avgACH50);
      
      // Calculate tier distribution for this builder
      const tierDistribution = this.calculateTierDistribution(builderTests);
      
      return {
        builderId: builder.id,
        builderName: builder.name,
        averageACH50: parseFloat(avgACH50.toFixed(2)),
        tier,
        totalJobs,
        passRate: parseFloat(passRate.toFixed(1)),
        bestACH50: parseFloat(bestACH50.toFixed(2)),
        latestACH50: latestACH50 ? parseFloat(latestACH50.toFixed(2)) : null,
        tierDistribution
      };
    }));
    
    // Sort by average ACH50 (lower is better)
    return leaderboard
      .filter(b => b.averageACH50 > 0)
      .sort((a, b) => a.averageACH50 - b.averageACH50);
  }

  async getDashboardMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();
    
    // Get jobs in date range
    const jobsInRange = await db
      .select()
      .from(jobs)
      .where(and(
        gte(jobs.scheduledDate, start),
        lte(jobs.scheduledDate, end)
      ));
    
    // Get financial data
    const expensesInRange = await db
      .select()
      .from(expenses)
      .where(and(
        gte(expenses.date, start),
        lte(expenses.date, end)
      ));
    
    const invoicesInRange = await db
      .select()
      .from(invoices)
      .where(and(
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end)
      ));
    
    // Calculate metrics
    const totalJobs = jobsInRange.length;
    const completedJobs = jobsInRange.filter(j => j.status === 'completed').length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    
    const totalRevenue = invoicesInRange.reduce((sum, inv) => 
      sum + parseFloat(inv.totalAmount || '0'), 0
    );
    
    const totalExpenses = expensesInRange.reduce((sum, exp) => 
      sum + parseFloat(exp.amount || '0'), 0
    );
    
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    // Get photos count
    const photosInRange = await db
      .select({ count: count() })
      .from(photos)
      .where(and(
        gte(photos.uploadedAt, start),
        lte(photos.uploadedAt, end)
      ));
    
    return {
      totalJobs,
      completedJobs,
      completionRate: parseFloat(completionRate.toFixed(1)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(1)),
      photosUploaded: photosInRange[0]?.count || 0,
      activeJobs: jobsInRange.filter(j => j.status === 'scheduled' || j.status === 'in-progress').length,
      pendingJobs: jobsInRange.filter(j => j.status === 'pending').length
    };
  }

  async getInspectionTrends(period: 'daily' | 'weekly' | 'monthly', startDate?: Date, endDate?: Date): Promise<any[]> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    
    const jobsInRange = await db
      .select()
      .from(jobs)
      .where(and(
        gte(jobs.scheduledDate, start),
        lte(jobs.scheduledDate, end)
      ))
      .orderBy(asc(jobs.scheduledDate));
    
    const trends: Map<string, any> = new Map();
    
    jobsInRange.forEach(job => {
      const date = new Date(job.scheduledDate || job.createdAt || new Date());
      let key: string;
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!trends.has(key)) {
        trends.set(key, {
          date: key,
          total: 0,
          completed: 0,
          scheduled: 0,
          inProgress: 0,
          pending: 0
        });
      }
      
      const trend = trends.get(key);
      trend.total++;
      
      if (job.status === 'completed') trend.completed++;
      else if (job.status === 'scheduled') trend.scheduled++;
      else if (job.status === 'in-progress') trend.inProgress++;
      else if (job.status === 'pending') trend.pending++;
    });
    
    return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getBuilderPerformance(limit: number = 10): Promise<any[]> {
    const buildersData = await db.select().from(builders);
    const jobsData = await db.select().from(jobs);
    const checklistData = await db.select().from(checklistItems);
    
    const performance = await Promise.all(buildersData.map(async (builder) => {
      const builderJobs = jobsData.filter(j => j.builderId === builder.id);
      const completedJobs = builderJobs.filter(j => j.status === 'completed');
      
      // Calculate average completion time
      const completionTimes = completedJobs
        .filter(j => j.scheduledDate && j.completedDate)
        .map(j => {
          const scheduled = new Date(j.scheduledDate!);
          const completed = new Date(j.completedDate!);
          return (completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60); // Hours
        });
      
      const avgCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;
      
      // Calculate quality score from checklist items
      const builderJobIds = builderJobs.map(j => j.id);
      const builderChecklistItems = checklistData.filter(item => 
        item.jobId && builderJobIds.includes(item.jobId)
      );
      
      const passedItems = builderChecklistItems.filter(item => item.status === 'pass');
      const qualityScore = builderChecklistItems.length > 0
        ? (passedItems.length / builderChecklistItems.length) * 100
        : 0;
      
      return {
        builderId: builder.id,
        builderName: builder.name,
        companyName: builder.companyName,
        totalJobs: builderJobs.length,
        completedJobs: completedJobs.length,
        completionRate: builderJobs.length > 0 
          ? (completedJobs.length / builderJobs.length) * 100 
          : 0,
        avgCompletionTime: parseFloat(avgCompletionTime.toFixed(1)),
        qualityScore: parseFloat(qualityScore.toFixed(1)),
        rating: builder.rating || 0
      };
    }));
    
    // Sort by total jobs and limit
    return performance
      .sort((a, b) => b.totalJobs - a.totalJobs)
      .slice(0, limit);
  }

  async getFinancialMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();
    
    // Get invoices
    const invoicesData = await db
      .select()
      .from(invoices)
      .where(and(
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end)
      ));
    
    // Get expenses
    const expensesData = await db
      .select()
      .from(expenses)
      .where(and(
        gte(expenses.date, start),
        lte(expenses.date, end)
      ));
    
    // Get mileage logs
    const mileageData = await db
      .select()
      .from(mileageLogs)
      .where(and(
        gte(mileageLogs.date, start),
        lte(mileageLogs.date, end)
      ));
    
    // Calculate totals
    const totalRevenue = invoicesData.reduce((sum, inv) => 
      sum + parseFloat(inv.totalAmount || '0'), 0
    );
    
    const paidInvoices = invoicesData.filter(inv => inv.status === 'paid');
    const receivedRevenue = paidInvoices.reduce((sum, inv) => 
      sum + parseFloat(inv.totalAmount || '0'), 0
    );
    
    const pendingRevenue = totalRevenue - receivedRevenue;
    
    const totalExpenses = expensesData.reduce((sum, exp) => 
      sum + parseFloat(exp.amount || '0'), 0
    );
    
    const expensesByCategory = expensesData.reduce((acc, exp) => {
      const category = exp.category || 'Other';
      if (!acc[category]) acc[category] = 0;
      acc[category] += parseFloat(exp.amount || '0');
      return acc;
    }, {} as Record<string, number>);
    
    const totalMiles = mileageData.reduce((sum, log) => 
      sum + (log.endOdometer - log.startOdometer), 0
    );
    
    const mileageDeduction = totalMiles * 0.655; // IRS rate
    
    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      receivedRevenue: parseFloat(receivedRevenue.toFixed(2)),
      pendingRevenue: parseFloat(pendingRevenue.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netProfit: parseFloat((receivedRevenue - totalExpenses).toFixed(2)),
      projectedProfit: parseFloat((totalRevenue - totalExpenses).toFixed(2)),
      expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount: parseFloat(amount.toFixed(2))
      })),
      totalMiles,
      mileageDeduction: parseFloat(mileageDeduction.toFixed(2)),
      invoiceCount: invoicesData.length,
      paidInvoiceCount: paidInvoices.length,
      overdueInvoices: invoicesData.filter(inv => 
        inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date()
      ).length
    };
  }

  async getPhotoAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();
    
    // Get photos in date range
    const photosData = await db
      .select()
      .from(photos)
      .where(and(
        gte(photos.uploadedAt, start),
        lte(photos.uploadedAt, end)
      ));
    
    // Count photos by type
    const photosByType = photosData.reduce((acc, photo) => {
      const type = photo.captureType || 'manual';
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);
    
    // Count tags
    const tagCounts: Record<string, number> = {};
    photosData.forEach(photo => {
      if (photo.tags && Array.isArray(photo.tags)) {
        photo.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    // Get photos by job
    const photosByJob = photosData.reduce((acc, photo) => {
      if (photo.jobId) {
        if (!acc[photo.jobId]) acc[photo.jobId] = 0;
        acc[photo.jobId]++;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const jobsWithPhotos = Object.keys(photosByJob).length;
    const avgPhotosPerJob = jobsWithPhotos > 0
      ? Object.values(photosByJob).reduce((a, b) => a + b, 0) / jobsWithPhotos
      : 0;
    
    // Calculate storage size (approximate)
    const totalSize = photosData.length * 2 * 1024 * 1024; // Assume 2MB average
    
    return {
      totalPhotos: photosData.length,
      photosByType: Object.entries(photosByType).map(([type, count]) => ({ type, count })),
      topTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
      jobsWithPhotos,
      avgPhotosPerJob: parseFloat(avgPhotosPerJob.toFixed(1)),
      totalStorageSize: totalSize,
      storageUsedGB: parseFloat((totalSize / (1024 * 1024 * 1024)).toFixed(2)),
      photosWithAnnotations: photosData.filter(p => p.annotations && p.annotations.length > 0).length,
      photosWithOCR: photosData.filter(p => p.ocrText).length
    };
  }

  async getInspectorPerformance(inspectorId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();
    
    // Get all inspectors
    const inspectors = inspectorId 
      ? await db.select().from(users).where(eq(users.id, inspectorId))
      : await db.select().from(users).where(eq(users.role, 'inspector'));
    
    const performance = await Promise.all(inspectors.map(async (inspector) => {
      // Get jobs assigned to inspector
      const inspectorJobs = await db
        .select()
        .from(jobs)
        .where(and(
          eq(jobs.assignedTo, inspector.id),
          gte(jobs.scheduledDate, start),
          lte(jobs.scheduledDate, end)
        ));
      
      const completedJobs = inspectorJobs.filter(j => j.status === 'completed');
      
      // Calculate metrics
      const completionRate = inspectorJobs.length > 0
        ? (completedJobs.length / inspectorJobs.length) * 100
        : 0;
      
      // Calculate average inspection time
      const inspectionTimes = completedJobs
        .filter(j => j.scheduledDate && j.completedDate)
        .map(j => {
          const scheduled = new Date(j.scheduledDate!);
          const completed = new Date(j.completedDate!);
          return (completed.getTime() - scheduled.getTime()) / (1000 * 60); // Minutes
        });
      
      const avgInspectionTime = inspectionTimes.length > 0
        ? inspectionTimes.reduce((a, b) => a + b, 0) / inspectionTimes.length
        : 0;
      
      // Get checklist performance
      const jobIds = inspectorJobs.map(j => j.id);
      const checklistData = jobIds.length > 0
        ? await db
            .select()
            .from(checklistItems)
            .where(inArray(checklistItems.jobId, jobIds))
        : [];
      
      const passedItems = checklistData.filter(item => item.status === 'pass');
      const qualityScore = checklistData.length > 0
        ? (passedItems.length / checklistData.length) * 100
        : 0;
      
      // Get photos uploaded
      const photosUploaded = jobIds.length > 0
        ? await db
            .select({ count: count() })
            .from(photos)
            .where(and(
              inArray(photos.jobId, jobIds),
              eq(photos.uploadedBy, inspector.id)
            ))
        : [{ count: 0 }];
      
      return {
        inspectorId: inspector.id,
        inspectorName: `${inspector.firstName} ${inspector.lastName}`,
        totalJobs: inspectorJobs.length,
        completedJobs: completedJobs.length,
        completionRate: parseFloat(completionRate.toFixed(1)),
        avgInspectionTime: parseFloat(avgInspectionTime.toFixed(0)),
        qualityScore: parseFloat(qualityScore.toFixed(1)),
        photosUploaded: photosUploaded[0]?.count || 0,
        scheduledJobs: inspectorJobs.filter(j => j.status === 'scheduled').length,
        inProgressJobs: inspectorJobs.filter(j => j.status === 'in-progress').length
      };
    }));
    
    return performance.sort((a, b) => b.completedJobs - a.completedJobs);
  }

  async getComplianceMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();
    
    // Get compliance history
    const complianceData = await db
      .select()
      .from(complianceHistory)
      .where(and(
        gte(complianceHistory.evaluatedAt, start),
        lte(complianceHistory.evaluatedAt, end)
      ));
    
    // Get QA scores
    const qaScores = await db
      .select()
      .from(qaInspectionScores)
      .where(and(
        gte(qaInspectionScores.createdAt, start),
        lte(qaInspectionScores.createdAt, end)
      ));
    
    // Calculate compliance rate
    const compliantItems = complianceData.filter(item => item.status === 'compliant');
    const complianceRate = complianceData.length > 0
      ? (compliantItems.length / complianceData.length) * 100
      : 0;
    
    // Get violations by type
    const violationsByType = complianceData
      .filter(item => item.violations && item.violations.length > 0)
      .reduce((acc, item) => {
        if (item.violations && Array.isArray(item.violations)) {
          item.violations.forEach((violation: any) => {
            const type = violation.type || 'Other';
            if (!acc[type]) acc[type] = 0;
            acc[type]++;
          });
        }
        return acc;
      }, {} as Record<string, number>);
    
    // Calculate average QA score
    const avgQaScore = qaScores.length > 0
      ? qaScores.reduce((sum, score) => sum + (score.overallScore || 0), 0) / qaScores.length
      : 0;
    
    // Get critical violations
    const criticalViolations = complianceData
      .filter(item => item.violations && Array.isArray(item.violations))
      .reduce((sum, item) => {
        return sum + (item.violations as any[]).filter(v => v.severity === 'critical').length;
      }, 0);
    
    return {
      complianceRate: parseFloat(complianceRate.toFixed(1)),
      totalEvaluations: complianceData.length,
      compliantCount: compliantItems.length,
      nonCompliantCount: complianceData.length - compliantItems.length,
      violationsByType: Object.entries(violationsByType).map(([type, count]) => ({ type, count })),
      averageQaScore: parseFloat(avgQaScore.toFixed(1)),
      criticalViolations,
      recentViolations: complianceData
        .filter(item => item.violations && item.violations.length > 0)
        .slice(-5)
        .map(item => ({
          date: item.evaluatedAt,
          entityType: item.entityType,
          violations: item.violations
        }))
    };
  }

  async getRevenueExpenseData(period: 'daily' | 'weekly' | 'monthly', startDate?: Date, endDate?: Date): Promise<any[]> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000); // Default 90 days
    
    // Get invoices and expenses
    const invoicesData = await db
      .select()
      .from(invoices)
      .where(and(
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end)
      ));
    
    const expensesData = await db
      .select()
      .from(expenses)
      .where(and(
        gte(expenses.date, start),
        lte(expenses.date, end)
      ));
    
    const dataMap: Map<string, any> = new Map();
    
    // Process invoices
    invoicesData.forEach(invoice => {
      const date = new Date(invoice.createdAt || new Date());
      const key = this.getDateKey(date, period);
      
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          date: key,
          revenue: 0,
          expenses: 0,
          profit: 0
        });
      }
      
      const data = dataMap.get(key);
      data.revenue += parseFloat(invoice.totalAmount || '0');
    });
    
    // Process expenses
    expensesData.forEach(expense => {
      const date = new Date(expense.date);
      const key = this.getDateKey(date, period);
      
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          date: key,
          revenue: 0,
          expenses: 0,
          profit: 0
        });
      }
      
      const data = dataMap.get(key);
      data.expenses += parseFloat(expense.amount || '0');
    });
    
    // Calculate profit for each period
    dataMap.forEach(data => {
      data.profit = data.revenue - data.expenses;
      data.revenue = parseFloat(data.revenue.toFixed(2));
      data.expenses = parseFloat(data.expenses.toFixed(2));
      data.profit = parseFloat(data.profit.toFixed(2));
    });
    
    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getKPIMetrics(): Promise<any[]> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get current month data
    const currentMetrics = await this.getDashboardMetrics(thisMonth, now);
    const lastMonthMetrics = await this.getDashboardMetrics(lastMonth, lastMonthEnd);
    
    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    return [
      {
        id: 'total_inspections',
        name: 'Total Inspections',
        value: currentMetrics.totalJobs,
        trend: calculateTrend(currentMetrics.totalJobs, lastMonthMetrics.totalJobs),
        unit: 'jobs',
        icon: 'checklist'
      },
      {
        id: 'completion_rate',
        name: 'Completion Rate',
        value: currentMetrics.completionRate,
        trend: calculateTrend(currentMetrics.completionRate, lastMonthMetrics.completionRate),
        unit: '%',
        icon: 'percentage'
      },
      {
        id: 'monthly_revenue',
        name: 'Monthly Revenue',
        value: currentMetrics.totalRevenue,
        trend: calculateTrend(currentMetrics.totalRevenue, lastMonthMetrics.totalRevenue),
        unit: '$',
        icon: 'dollar'
      },
      {
        id: 'profit_margin',
        name: 'Profit Margin',
        value: currentMetrics.profitMargin,
        trend: calculateTrend(currentMetrics.profitMargin, lastMonthMetrics.profitMargin),
        unit: '%',
        icon: 'trending'
      },
      {
        id: 'active_jobs',
        name: 'Active Jobs',
        value: currentMetrics.activeJobs,
        trend: calculateTrend(currentMetrics.activeJobs, lastMonthMetrics.activeJobs),
        unit: 'jobs',
        icon: 'activity'
      },
      {
        id: 'photos_uploaded',
        name: 'Photos Uploaded',
        value: currentMetrics.photosUploaded,
        trend: calculateTrend(currentMetrics.photosUploaded, lastMonthMetrics.photosUploaded),
        unit: 'photos',
        icon: 'camera'
      }
    ];
  }

  async getForecastData(metric: string, lookbackDays: number = 30): Promise<any[]> {
    const now = new Date();
    const historicalStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    
    // Get historical data based on metric type
    let historicalData: any[] = [];
    
    if (metric === 'revenue') {
      historicalData = await this.getRevenueExpenseData('daily', historicalStart, now);
    } else if (metric === 'jobs') {
      historicalData = await this.getInspectionTrends('daily', historicalStart, now);
    }
    
    // Simple linear regression for forecasting
    if (historicalData.length > 0) {
      const n = historicalData.length;
      const xValues = historicalData.map((_, i) => i);
      const yValues = historicalData.map(d => 
        metric === 'revenue' ? d.revenue : d.total
      );
      
      const xSum = xValues.reduce((a, b) => a + b, 0);
      const ySum = yValues.reduce((a, b) => a + b, 0);
      const xySum = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const xxSum = xValues.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
      const intercept = (ySum - slope * xSum) / n;
      
      // Generate forecast for next 7 days
      const forecast = [];
      for (let i = 0; i < 7; i++) {
        const futureDate = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        const predictedValue = slope * (n + i) + intercept;
        
        forecast.push({
          date: futureDate.toISOString().split('T')[0],
          predicted: Math.max(0, parseFloat(predictedValue.toFixed(2))),
          confidence: Math.max(0.6, 0.95 - (i * 0.05)) // Confidence decreases with distance
        });
      }
      
      return [
        ...historicalData.map(d => ({
          date: d.date,
          actual: metric === 'revenue' ? d.revenue : d.total,
          predicted: null
        })),
        ...forecast
      ];
    }
    
    return [];
  }

  // Helper methods for analytics
  private calculateTier(ach50: number): string {
    if (ach50 <= 1.0) return 'Elite';
    if (ach50 <= 1.5) return 'Excellent';
    if (ach50 <= 2.0) return 'Very Good';
    if (ach50 <= 2.5) return 'Good';
    if (ach50 <= 3.0) return 'Passing';
    return 'Failing';
  }

  private calculateTierDistribution(tests: BlowerDoorTest[]): any[] {
    const tiers = {
      Elite: { min: 0.5, max: 1.0, color: '#0B7285', count: 0 },
      Excellent: { min: 1.0, max: 1.5, color: '#2E8B57', count: 0 },
      'Very Good': { min: 1.5, max: 2.0, color: '#3FA34D', count: 0 },
      Good: { min: 2.0, max: 2.5, color: '#A0C34E', count: 0 },
      Passing: { min: 2.5, max: 3.0, color: '#FFC107', count: 0 },
      Failing: { min: 3.0, max: Infinity, color: '#DC3545', count: 0 }
    };
    
    tests.forEach(test => {
      if (test.ach50) {
        const tier = this.calculateTier(test.ach50);
        if (tiers[tier]) {
          tiers[tier].count++;
        }
      }
    });
    
    const total = tests.length || 1;
    
    return Object.entries(tiers).map(([tier, data]) => ({
      tier,
      count: data.count,
      percentage: parseFloat(((data.count / total) * 100).toFixed(1)),
      color: data.color
    }));
  }

  private async getMonthlyHighlights(startDate: Date, endDate: Date): Promise<any[]> {
    const highlights = [];
    
    // Get jobs this month
    const monthlyJobs = await db
      .select()
      .from(jobs)
      .where(and(
        gte(jobs.scheduledDate, startDate),
        lte(jobs.scheduledDate, endDate)
      ));
    
    const completedJobs = monthlyJobs.filter(j => j.status === 'completed');
    
    highlights.push({
      label: 'Jobs Completed',
      value: completedJobs.length,
      type: 'success'
    });
    
    // Get revenue this month
    const monthlyInvoices = await db
      .select()
      .from(invoices)
      .where(and(
        gte(invoices.createdAt, startDate),
        lte(invoices.createdAt, endDate)
      ));
    
    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => 
      sum + parseFloat(inv.totalAmount || '0'), 0
    );
    
    highlights.push({
      label: 'Monthly Revenue',
      value: `$${monthlyRevenue.toFixed(0)}`,
      type: 'info'
    });
    
    // Get new builders this month
    const newBuilders = await db
      .select({ count: count() })
      .from(builders);
    
    if (newBuilders[0]?.count) {
      highlights.push({
        label: 'Active Builders',
        value: newBuilders[0].count,
        type: 'info'
      });
    }
    
    // Get pending jobs
    const pendingJobs = monthlyJobs.filter(j => j.status === 'pending' || j.status === 'scheduled');
    
    if (pendingJobs.length > 5) {
      highlights.push({
        label: 'Pending Jobs',
        value: pendingJobs.length,
        type: 'warning'
      });
    }
    
    return highlights;
  }

  private getDateKey(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    if (period === 'daily') {
      return date.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  // QA Performance Metrics Implementation
  async createQaPerformanceMetric(metric: InsertQaPerformanceMetric): Promise<QaPerformanceMetric> {
    const result = await db.insert(qaPerformanceMetrics).values(metric).returning();
    return result[0];
  }

  async getQaPerformanceMetric(id: string): Promise<QaPerformanceMetric | undefined> {
    const result = await db.select()
      .from(qaPerformanceMetrics)
      .where(eq(qaPerformanceMetrics.id, id))
      .limit(1);
    return result[0];
  }

  async getQaPerformanceMetricsByUser(userId: string): Promise<QaPerformanceMetric[]> {
    return await db.select()
      .from(qaPerformanceMetrics)
      .where(eq(qaPerformanceMetrics.userId, userId))
      .orderBy(desc(qaPerformanceMetrics.calculatedAt));
  }

  async getQaPerformanceMetricsByPeriod(period: string, startDate: Date, endDate: Date): Promise<QaPerformanceMetric[]> {
    return await db.select()
      .from(qaPerformanceMetrics)
      .where(and(
        eq(qaPerformanceMetrics.period, period),
        gte(qaPerformanceMetrics.periodStart, startDate),
        lte(qaPerformanceMetrics.periodEnd, endDate)
      ))
      .orderBy(desc(qaPerformanceMetrics.calculatedAt));
  }

  async getLatestQaPerformanceMetric(userId: string, period: string): Promise<QaPerformanceMetric | undefined> {
    const result = await db.select()
      .from(qaPerformanceMetrics)
      .where(and(
        eq(qaPerformanceMetrics.userId, userId),
        eq(qaPerformanceMetrics.period, period)
      ))
      .orderBy(desc(qaPerformanceMetrics.calculatedAt))
      .limit(1);
    return result[0];
  }

  async getTeamQaPerformanceMetrics(period: string, startDate: Date, endDate: Date): Promise<QaPerformanceMetric[]> {
    return await db.select()
      .from(qaPerformanceMetrics)
      .where(and(
        eq(qaPerformanceMetrics.period, period),
        gte(qaPerformanceMetrics.periodStart, startDate),
        lte(qaPerformanceMetrics.periodEnd, endDate)
      ))
      .orderBy(desc(qaPerformanceMetrics.calculatedAt));
  }

  async calculateQaPerformanceMetrics(userId: string, period: string, startDate: Date, endDate: Date): Promise<QaPerformanceMetric> {
    // Get all jobs for the user in the period
    const userJobs = await db.select()
      .from(jobs)
      .where(and(
        eq(jobs.assignedTo, userId),
        gte(jobs.scheduledDate, startDate),
        lte(jobs.scheduledDate, endDate)
      ));
    
    const completedJobs = userJobs.filter(j => j.status === 'completed');
    const jobsCompleted = completedJobs.length;
    const jobsReviewed = userJobs.filter(j => j.reviewStatus === 'reviewed').length;
    
    // Calculate on-time rate
    const onTimeJobs = completedJobs.filter(j => {
      if (!j.scheduledDate || !j.completedDate) return false;
      const scheduled = new Date(j.scheduledDate);
      const completed = new Date(j.completedDate);
      // Consider on-time if completed within 24 hours of scheduled
      return (completed.getTime() - scheduled.getTime()) <= 24 * 60 * 60 * 1000;
    });
    const onTimeRate = jobsCompleted > 0 ? (onTimeJobs.length / jobsCompleted) * 100 : 0;
    
    // Get QA scores for this user
    const qaScores = await db.select()
      .from(qaInspectionScores)
      .where(and(
        eq(qaInspectionScores.inspectorId, userId),
        gte(qaInspectionScores.createdAt, startDate),
        lte(qaInspectionScores.createdAt, endDate)
      ));
    
    const avgScore = qaScores.length > 0
      ? qaScores.reduce((sum, score) => sum + (score.overallScore || 0), 0) / qaScores.length
      : 0;
    
    // Calculate first pass rate
    const firstPassScores = qaScores.filter(s => s.overallScore && s.overallScore >= 80);
    const firstPassRate = qaScores.length > 0 ? (firstPassScores.length / qaScores.length) * 100 : 0;
    
    // Get customer satisfaction (mock for now - would come from reviews)
    const customerSatisfaction = 4.5;
    
    // Determine strong and improvement areas based on checklist categories
    const strongAreas: string[] = [];
    const improvementAreas: string[] = [];
    
    if (qaScores.length > 0) {
      // Analyze category scores
      const categoryScores: Record<string, number[]> = {};
      
      for (const score of qaScores) {
        if (score.categoryScores && typeof score.categoryScores === 'object') {
          for (const [category, catScore] of Object.entries(score.categoryScores as Record<string, number>)) {
            if (!categoryScores[category]) categoryScores[category] = [];
            categoryScores[category].push(catScore);
          }
        }
      }
      
      // Calculate average for each category
      for (const [category, scores] of Object.entries(categoryScores)) {
        const avgCategoryScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgCategoryScore >= 90) {
          strongAreas.push(category);
        } else if (avgCategoryScore < 75) {
          improvementAreas.push(category);
        }
      }
    }
    
    // Default areas if none calculated
    if (strongAreas.length === 0) strongAreas.push('Documentation', 'Photo Quality', 'Timeliness');
    if (improvementAreas.length === 0) improvementAreas.push('Accuracy', 'Compliance');
    
    // Save the calculated metrics
    const metric = await this.createQaPerformanceMetric({
      userId,
      period,
      periodStart: startDate,
      periodEnd: endDate,
      avgScore: avgScore.toFixed(2),
      jobsCompleted,
      jobsReviewed,
      onTimeRate: onTimeRate.toFixed(2),
      firstPassRate: firstPassRate.toFixed(2),
      customerSatisfaction: customerSatisfaction.toFixed(2),
      strongAreas,
      improvementAreas
    });
    
    return metric;
  }

  async updateQaPerformanceMetric(id: string, metric: Partial<InsertQaPerformanceMetric>): Promise<QaPerformanceMetric | undefined> {
    const result = await db.update(qaPerformanceMetrics)
      .set(metric)
      .where(eq(qaPerformanceMetrics.id, id))
      .returning();
    return result[0];
  }

  async deleteQaPerformanceMetric(id: string): Promise<boolean> {
    const result = await db.delete(qaPerformanceMetrics)
      .where(eq(qaPerformanceMetrics.id, id))
      .returning();
    return result.length > 0;
  }

  // QA Analytics Methods
  async getQaScoreTrends(userId?: string, days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const scores = await db.select()
      .from(qaInspectionScores)
      .where(and(
        userId ? eq(qaInspectionScores.inspectorId, userId) : undefined,
        gte(qaInspectionScores.createdAt, startDate),
        lte(qaInspectionScores.createdAt, endDate)
      ))
      .orderBy(asc(qaInspectionScores.createdAt));
    
    // Group scores by date
    const trendData: Record<string, { total: number, count: number }> = {};
    
    for (const score of scores) {
      const date = score.createdAt ? new Date(score.createdAt).toISOString().split('T')[0] : '';
      if (!trendData[date]) {
        trendData[date] = { total: 0, count: 0 };
      }
      trendData[date].total += score.overallScore || 0;
      trendData[date].count++;
    }
    
    return Object.entries(trendData).map(([date, data]) => ({
      date,
      avgScore: data.count > 0 ? (data.total / data.count).toFixed(1) : 0,
      count: data.count
    }));
  }

  async getQaCategoryBreakdown(userId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const scores = await db.select()
      .from(qaInspectionScores)
      .where(and(
        userId ? eq(qaInspectionScores.inspectorId, userId) : undefined,
        gte(qaInspectionScores.createdAt, start),
        lte(qaInspectionScores.createdAt, end)
      ));
    
    // Aggregate category scores
    const categoryTotals: Record<string, { total: number, count: number }> = {
      'Completeness': { total: 0, count: 0 },
      'Accuracy': { total: 0, count: 0 },
      'Compliance': { total: 0, count: 0 },
      'Photo Quality': { total: 0, count: 0 },
      'Timeliness': { total: 0, count: 0 }
    };
    
    for (const score of scores) {
      if (score.categoryScores && typeof score.categoryScores === 'object') {
        for (const [category, catScore] of Object.entries(score.categoryScores as Record<string, number>)) {
          if (!categoryTotals[category]) {
            categoryTotals[category] = { total: 0, count: 0 };
          }
          categoryTotals[category].total += catScore;
          categoryTotals[category].count++;
        }
      }
    }
    
    return Object.entries(categoryTotals).map(([category, data]) => ({
      category,
      score: data.count > 0 ? parseFloat((data.total / data.count).toFixed(1)) : 85,
      fullMark: 100
    }));
  }

  async getQaLeaderboard(period: string, limit: number = 10): Promise<any> {
    // Get period dates
    const now = new Date();
    let startDate: Date;
    let endDate = now;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // Get all inspectors
    const inspectors = await db.select()
      .from(users)
      .where(or(eq(users.role, 'inspector'), eq(users.role, 'admin')));
    
    const leaderboard = await Promise.all(inspectors.map(async (inspector) => {
      // Get scores for this inspector
      const scores = await db.select()
        .from(qaInspectionScores)
        .where(and(
          eq(qaInspectionScores.inspectorId, inspector.id),
          gte(qaInspectionScores.createdAt, startDate),
          lte(qaInspectionScores.createdAt, endDate)
        ));
      
      const avgScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + (s.overallScore || 0), 0) / scores.length
        : 0;
      
      // Get job count
      const jobCount = await db.select({ count: count() })
        .from(jobs)
        .where(and(
          eq(jobs.assignedTo, inspector.id),
          eq(jobs.status, 'completed'),
          gte(jobs.scheduledDate, startDate),
          lte(jobs.scheduledDate, endDate)
        ));
      
      // Calculate trend
      const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
      const previousScores = await db.select()
        .from(qaInspectionScores)
        .where(and(
          eq(qaInspectionScores.inspectorId, inspector.id),
          gte(qaInspectionScores.createdAt, previousPeriodStart),
          lt(qaInspectionScores.createdAt, startDate)
        ));
      
      const prevAvgScore = previousScores.length > 0
        ? previousScores.reduce((sum, s) => sum + (s.overallScore || 0), 0) / previousScores.length
        : avgScore;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (avgScore > prevAvgScore + 1) trend = 'up';
      else if (avgScore < prevAvgScore - 1) trend = 'down';
      
      return {
        id: inspector.id,
        name: `${inspector.firstName || ''} ${inspector.lastName || ''}`.trim() || 'Unknown',
        score: parseFloat(avgScore.toFixed(1)),
        jobsCompleted: jobCount[0]?.count || 0,
        trend
      };
    }));
    
    return leaderboard
      .filter(member => member.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getQaTrainingNeeds(): Promise<any> {
    // Get all inspectors' recent performance
    const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const scores = await db.select()
      .from(qaInspectionScores)
      .where(gte(qaInspectionScores.createdAt, thirtyDaysAgo));
    
    // Analyze category performance
    const categoryPerformance: Record<string, { total: number, count: number, failCount: number }> = {};
    
    for (const score of scores) {
      if (score.categoryScores && typeof score.categoryScores === 'object') {
        for (const [category, catScore] of Object.entries(score.categoryScores as Record<string, number>)) {
          if (!categoryPerformance[category]) {
            categoryPerformance[category] = { total: 0, count: 0, failCount: 0 };
          }
          categoryPerformance[category].total += catScore;
          categoryPerformance[category].count++;
          if (catScore < 80) {
            categoryPerformance[category].failCount++;
          }
        }
      }
    }
    
    // Identify training needs
    const trainingNeeds = Object.entries(categoryPerformance)
      .map(([category, data]) => ({
        category,
        avgScore: data.count > 0 ? data.total / data.count : 0,
        failRate: data.count > 0 ? (data.failCount / data.count) * 100 : 0,
        affectedInspectors: data.failCount,
        priority: data.failCount >= 5 ? 'high' : data.failCount >= 3 ? 'medium' : 'low'
      }))
      .filter(need => need.failRate > 20)
      .sort((a, b) => b.failRate - a.failRate);
    
    return trainingNeeds;
  }

  async getQaComplianceRate(startDate?: Date, endDate?: Date): Promise<any> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get compliance history
    const complianceData = await db.select()
      .from(complianceHistory)
      .where(and(
        gte(complianceHistory.evaluatedAt, start),
        lte(complianceHistory.evaluatedAt, end)
      ));
    
    const compliantCount = complianceData.filter(c => c.status === 'compliant').length;
    const totalCount = complianceData.length;
    
    return {
      rate: totalCount > 0 ? (compliantCount / totalCount) * 100 : 100,
      compliant: compliantCount,
      nonCompliant: totalCount - compliantCount,
      total: totalCount
    };
  }

  // QA Inspection Scores Implementation  
  async createQaInspectionScore(score: InsertQaInspectionScore): Promise<QaInspectionScore> {
    const result = await db.insert(qaInspectionScores).values(score).returning();
    return result[0];
  }

  async getQaInspectionScore(id: string): Promise<QaInspectionScore | undefined> {
    const result = await db.select()
      .from(qaInspectionScores)
      .where(eq(qaInspectionScores.id, id))
      .limit(1);
    return result[0];
  }

  async getQaInspectionScoreByJob(jobId: string): Promise<QaInspectionScore | undefined> {
    const result = await db.select()
      .from(qaInspectionScores)
      .where(eq(qaInspectionScores.jobId, jobId))
      .orderBy(desc(qaInspectionScores.createdAt))
      .limit(1);
    return result[0];
  }

  async getQaInspectionScoresByInspector(inspectorId: string): Promise<QaInspectionScore[]> {
    return await db.select()
      .from(qaInspectionScores)
      .where(eq(qaInspectionScores.inspectorId, inspectorId))
      .orderBy(desc(qaInspectionScores.createdAt));
  }

  async getQaInspectionScoresByReviewStatus(status: string): Promise<QaInspectionScore[]> {
    return await db.select()
      .from(qaInspectionScores)
      .where(eq(qaInspectionScores.reviewStatus, status))
      .orderBy(desc(qaInspectionScores.createdAt));
  }

  async getQaInspectionScoresPaginated(params: PaginationParams): Promise<PaginatedResult<QaInspectionScore>> {
    const limit = params.limit || 10;
    const offset = params.offset || 0;
    
    const [totalResult, scores] = await Promise.all([
      db.select({ count: count() }).from(qaInspectionScores),
      db.select()
        .from(qaInspectionScores)
        .orderBy(desc(qaInspectionScores.createdAt))
        .limit(limit)
        .offset(offset)
    ]);
    
    return {
      items: scores,
      total: totalResult[0]?.count || 0,
      limit,
      offset
    };
  }

  async updateQaInspectionScore(id: string, score: Partial<InsertQaInspectionScore>): Promise<QaInspectionScore | undefined> {
    const result = await db.update(qaInspectionScores)
      .set(score)
      .where(eq(qaInspectionScores.id, id))
      .returning();
    return result[0];
  }

  async deleteQaInspectionScore(id: string): Promise<boolean> {
    const result = await db.delete(qaInspectionScores)
      .where(eq(qaInspectionScores.id, id))
      .returning();
    return result.length > 0;
  }

  // QA Checklists Implementation
  async createQaChecklist(checklist: InsertQaChecklist): Promise<QaChecklist> {
    const result = await db.insert(qaChecklists).values(checklist).returning();
    return result[0];
  }

  async getQaChecklist(id: string): Promise<QaChecklist | undefined> {
    const result = await db.select()
      .from(qaChecklists)
      .where(eq(qaChecklists.id, id))
      .limit(1);
    return result[0];
  }

  async getAllQaChecklists(): Promise<QaChecklist[]> {
    return await db.select()
      .from(qaChecklists)
      .orderBy(asc(qaChecklists.sortOrder));
  }

  async getQaChecklistsByCategory(category: string): Promise<QaChecklist[]> {
    return await db.select()
      .from(qaChecklists)
      .where(eq(qaChecklists.category, category))
      .orderBy(asc(qaChecklists.sortOrder));
  }

  async updateQaChecklist(id: string, checklist: Partial<InsertQaChecklist>): Promise<QaChecklist | undefined> {
    const result = await db.update(qaChecklists)
      .set(checklist)
      .where(eq(qaChecklists.id, id))
      .returning();
    return result[0];
  }

  async deleteQaChecklist(id: string): Promise<boolean> {
    const result = await db.delete(qaChecklists)
      .where(eq(qaChecklists.id, id))
      .returning();
    return result.length > 0;
  }

  // QA Checklist Items Implementation
  async createQaChecklistItem(item: InsertQaChecklistItem): Promise<QaChecklistItem> {
    const result = await db.insert(qaChecklistItems).values(item).returning();
    return result[0];
  }

  async getQaChecklistItem(id: string): Promise<QaChecklistItem | undefined> {
    const result = await db.select()
      .from(qaChecklistItems)
      .where(eq(qaChecklistItems.id, id))
      .limit(1);
    return result[0];
  }

  async getQaChecklistItems(checklistId: string): Promise<QaChecklistItem[]> {
    return await db.select()
      .from(qaChecklistItems)
      .where(eq(qaChecklistItems.checklistId, checklistId))
      .orderBy(asc(qaChecklistItems.sortOrder));
  }

  async updateQaChecklistItem(id: string, item: Partial<InsertQaChecklistItem>): Promise<QaChecklistItem | undefined> {
    const result = await db.update(qaChecklistItems)
      .set(item)
      .where(eq(qaChecklistItems.id, id))
      .returning();
    return result[0];
  }

  async deleteQaChecklistItem(id: string): Promise<boolean> {
    const result = await db.delete(qaChecklistItems)
      .where(eq(qaChecklistItems.id, id))
      .returning();
    return result.length > 0;
  }

  // QA Checklist Responses Implementation
  async createQaChecklistResponse(response: InsertQaChecklistResponse): Promise<QaChecklistResponse> {
    const result = await db.insert(qaChecklistResponses).values(response).returning();
    return result[0];
  }

  async getQaChecklistResponse(id: string): Promise<QaChecklistResponse | undefined> {
    const result = await db.select()
      .from(qaChecklistResponses)
      .where(eq(qaChecklistResponses.id, id))
      .limit(1);
    return result[0];
  }

  async getQaChecklistResponsesByJob(jobId: string): Promise<QaChecklistResponse[]> {
    return await db.select()
      .from(qaChecklistResponses)
      .where(eq(qaChecklistResponses.jobId, jobId))
      .orderBy(desc(qaChecklistResponses.completedAt));
  }

  async getQaChecklistResponsesByChecklist(checklistId: string): Promise<QaChecklistResponse[]> {
    return await db.select()
      .from(qaChecklistResponses)
      .where(eq(qaChecklistResponses.checklistId, checklistId))
      .orderBy(desc(qaChecklistResponses.completedAt));
  }

  async getQaChecklistResponsesByUser(userId: string): Promise<QaChecklistResponse[]> {
    return await db.select()
      .from(qaChecklistResponses)
      .where(eq(qaChecklistResponses.userId, userId))
      .orderBy(desc(qaChecklistResponses.completedAt));
  }

  async updateQaChecklistResponse(id: string, response: Partial<InsertQaChecklistResponse>): Promise<QaChecklistResponse | undefined> {
    const result = await db.update(qaChecklistResponses)
      .set(response)
      .where(eq(qaChecklistResponses.id, id))
      .returning();
    return result[0];
  }

  async deleteQaChecklistResponse(id: string): Promise<boolean> {
    const result = await db.delete(qaChecklistResponses)
      .where(eq(qaChecklistResponses.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
