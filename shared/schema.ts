import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export interface ScoreSummary {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passRate: number;
  failRate: number;
  completionRate: number;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  updatedAt: string;
}

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const builders = pgTable("builders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tradeSpecialization: text("trade_specialization"),
  rating: integer("rating"),
  totalJobs: integer("total_jobs").default(0),
  notes: text("notes"),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  builderId: varchar("builder_id"),
  contractor: text("contractor").notNull(),
  status: text("status").notNull(),
  inspectionType: text("inspection_type").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  completedItems: integer("completed_items").default(0),
  totalItems: integer("total_items").default(52),
  priority: text("priority").default('medium'),
  latitude: real("latitude"),
  longitude: real("longitude"),
  notes: text("notes"),
  builderSignatureUrl: text("builder_signature_url"),
  builderSignedAt: timestamp("builder_signed_at"),
  builderSignerName: text("builder_signer_name"),
  complianceStatus: text("compliance_status"),
  complianceFlags: jsonb("compliance_flags"),
  lastComplianceCheck: timestamp("last_compliance_check"),
});

export const scheduleEvents = pgTable("schedule_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  notes: text("notes"),
  googleCalendarEventId: text("google_calendar_event_id"),
  lastSyncedAt: timestamp("last_synced_at"),
  color: text("color"),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id"),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  date: timestamp("date").notNull(),
  isWorkRelated: boolean("is_work_related").default(true),
});

export const mileageLogs = pgTable("mileage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  distance: decimal("distance", { precision: 10, scale: 2 }).notNull(),
  purpose: text("purpose"),
  isWorkRelated: boolean("is_work_related"),
  jobId: varchar("job_id"),
  startLatitude: real("start_latitude"),
  startLongitude: real("start_longitude"),
  endLatitude: real("end_latitude"),
  endLongitude: real("end_longitude"),
});

export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sections: text("sections").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const reportInstances = pgTable("report_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  templateId: varchar("template_id").notNull(),
  data: text("data").notNull(),
  pdfUrl: text("pdf_url"),
  emailedTo: text("emailed_to"),
  emailedAt: timestamp("emailed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  scoreSummary: text("score_summary"),
  complianceStatus: text("compliance_status"),
  complianceFlags: jsonb("compliance_flags"),
  lastComplianceCheck: timestamp("last_compliance_check"),
});

export const forecasts = pgTable("forecasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  predictedTDL: decimal("predicted_tdl", { precision: 10, scale: 2 }),
  predictedDLO: decimal("predicted_dlo", { precision: 10, scale: 2 }),
  predictedACH50: decimal("predicted_ach50", { precision: 10, scale: 2 }),
  actualTDL: decimal("actual_tdl", { precision: 10, scale: 2 }),
  actualDLO: decimal("actual_dlo", { precision: 10, scale: 2 }),
  actualACH50: decimal("actual_ach50", { precision: 10, scale: 2 }),
  confidence: integer("confidence"),
});

export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  itemNumber: integer("item_number").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  status: text("status").notNull().default('pending'),
  notes: text("notes"),
  photoCount: integer("photo_count").default(0),
  photoRequired: boolean("photo_required").default(false),
  voiceNoteUrl: text("voice_note_url"),
  voiceNoteDuration: integer("voice_note_duration"),
});

export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  checklistItemId: varchar("checklist_item_id"),
  filePath: text("file_path").notNull(),
  fullUrl: text("full_url"),
  // TODO: Add real thumbnail generation during upload:
  // When a photo is uploaded, generate thumbnail (400x400) and blur placeholder (24x24)
  // Store all versions in object storage and add these fields:
  // thumbnailUrl: text("thumbnail_url"), // Generated during upload
  // blurDataUrl: text("blur_data_url"),  // Generated during upload
  caption: text("caption"),
  tags: text("tags").array(),
  annotationData: jsonb("annotation_data"),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
});

export const complianceRules = pgTable("compliance_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  codeYear: text("code_year").notNull(),
  metricType: text("metric_type").notNull(),
  threshold: decimal("threshold", { precision: 10, scale: 2 }).notNull(),
  units: text("units").notNull(),
  severity: text("severity").notNull(),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const complianceHistory = pgTable("compliance_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  evaluatedAt: timestamp("evaluated_at").notNull().default(sql`now()`),
  status: text("status").notNull(),
  violations: jsonb("violations"),
  ruleSnapshot: jsonb("rule_snapshot"),
});

export const calendarPreferences = pgTable("calendar_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  calendarId: text("calendar_id").notNull(),
  calendarName: text("calendar_name").notNull(),
  backgroundColor: text("background_color"),
  foregroundColor: text("foreground_color"),
  isEnabled: boolean("is_enabled").default(true),
  isPrimary: boolean("is_primary").default(false),
  accessRole: text("access_role"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBuilderSchema = createInsertSchema(builders).omit({ id: true, totalJobs: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true }).extend({
  builderSignatureUrl: z.string().nullable().optional(),
  builderSignedAt: z.date().nullable().optional(),
  builderSignerName: z.string().nullable().optional(),
});
export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export const insertMileageLogSchema = createInsertSchema(mileageLogs).omit({ id: true });
export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true, createdAt: true });
export const insertReportInstanceSchema = createInsertSchema(reportInstances).omit({ id: true, createdAt: true });
export const insertForecastSchema = createInsertSchema(forecasts).omit({ id: true });
export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({ id: true });
export const updateChecklistItemSchema = z.object({
  jobId: z.string().optional(),
  itemNumber: z.number().optional(),
  title: z.string().optional(),
  completed: z.boolean().optional(),
  status: z.enum(['pending', 'passed', 'failed', 'not_applicable']).optional(),
  notes: z.string().nullable().optional(),
  photoCount: z.number().optional(),
  photoRequired: z.boolean().optional(),
  voiceNoteUrl: z.string().nullable().optional(),
  voiceNoteDuration: z.number().nullable().optional(),
});
export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true, uploadedAt: true });
export const insertComplianceRuleSchema = createInsertSchema(complianceRules).omit({ id: true, createdAt: true });
export const insertComplianceHistorySchema = createInsertSchema(complianceHistory).omit({ id: true });
export const insertCalendarPreferenceSchema = createInsertSchema(calendarPreferences).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Builder = typeof builders.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type MileageLog = typeof mileageLogs.$inferSelect;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type ReportInstance = typeof reportInstances.$inferSelect;
export type Forecast = typeof forecasts.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type ComplianceRule = typeof complianceRules.$inferSelect;
export type ComplianceHistory = typeof complianceHistory.$inferSelect;
export type InsertBuilder = z.infer<typeof insertBuilderSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertMileageLog = z.infer<typeof insertMileageLogSchema>;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type InsertReportInstance = z.infer<typeof insertReportInstanceSchema>;
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type UpdateChecklistItem = z.infer<typeof updateChecklistItemSchema>;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type InsertComplianceRule = z.infer<typeof insertComplianceRuleSchema>;
export type InsertComplianceHistory = z.infer<typeof insertComplianceHistorySchema>;
export type CalendarPreference = typeof calendarPreferences.$inferSelect;
export type InsertCalendarPreference = z.infer<typeof insertCalendarPreferenceSchema>;
