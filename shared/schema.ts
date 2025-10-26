import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
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

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
// Note: Users are uniquely identified by OIDC sub (stored in id), not email
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Keep default for migration compatibility
  email: varchar("email"), // Removed unique constraint - users identified by OIDC sub
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role", { enum: ["admin", "inspector", "manager", "viewer"] })
    .notNull()
    .default("inspector"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  volumeTier: text("volume_tier", { enum: ["low", "medium", "high", "premium"] }),
  billingTerms: text("billing_terms"),
  preferredLeadTime: integer("preferred_lead_time"),
}, (table) => [
  index("idx_builders_company_name").on(table.companyName),
  index("idx_builders_name_company").on(table.name, table.companyName),
]);

export const builderContacts = pgTable("builder_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  role: text("role", { 
    enum: ["superintendent", "project_manager", "owner", "estimator", "office_manager", "other"] 
  }).notNull(),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  isPrimary: boolean("is_primary").default(false),
  preferredContact: text("preferred_contact", { enum: ["phone", "email", "text"] }).default("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_contacts_builder_id").on(table.builderId),
  index("idx_builder_contacts_is_primary").on(table.isPrimary),
]);

export const builderAgreements = pgTable("builder_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  agreementName: text("agreement_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status", { enum: ["active", "expired", "terminated", "pending"] }).notNull(),
  defaultInspectionPrice: decimal("default_inspection_price", { precision: 10, scale: 2 }),
  paymentTerms: text("payment_terms"),
  inspectionTypesIncluded: text("inspection_types_included").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_builder_agreements_builder_id").on(table.builderId),
  index("idx_builder_agreements_status").on(table.status),
  index("idx_builder_agreements_builder_status").on(table.builderId, table.status),
]);

export const builderPrograms = pgTable("builder_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  programName: text("program_name").notNull(),
  programType: text("program_type", { 
    enum: ["tax_credit", "energy_star", "utility_rebate", "certification", "other"] 
  }).notNull(),
  enrollmentDate: timestamp("enrollment_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).notNull(),
  certificationNumber: text("certification_number"),
  rebateAmount: decimal("rebate_amount", { precision: 10, scale: 2 }),
  requiresDocumentation: boolean("requires_documentation").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_programs_builder_id").on(table.builderId),
  index("idx_builder_programs_builder_status").on(table.builderId, table.status),
  index("idx_builder_programs_program_type").on(table.programType),
]);

export const builderInteractions = pgTable("builder_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  interactionType: text("interaction_type", { 
    enum: ["call", "email", "meeting", "text", "site_visit", "other"] 
  }).notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  interactionDate: timestamp("interaction_date").notNull(),
  contactId: varchar("contact_id").references(() => builderContacts.id, { onDelete: 'set null' }),
  outcome: text("outcome"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_interactions_builder_id").on(table.builderId),
  index("idx_builder_interactions_builder_date").on(table.builderId, table.interactionDate),
  index("idx_builder_interactions_created_by").on(table.createdBy),
  index("idx_builder_interactions_contact_id").on(table.contactId),
]);

export const developments = pgTable("developments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  region: text("region"),
  municipality: text("municipality"),
  address: text("address"),
  status: text("status", { enum: ["planning", "active", "completed", "on_hold"] }).notNull(),
  totalLots: integer("total_lots").default(0),
  completedLots: integer("completed_lots").default(0),
  startDate: timestamp("start_date"),
  targetCompletionDate: timestamp("target_completion_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_developments_builder_id").on(table.builderId),
  index("idx_developments_builder_status").on(table.builderId, table.status),
  index("idx_developments_municipality").on(table.municipality),
]);

export const lots = pgTable("lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developmentId: varchar("development_id").notNull().references(() => developments.id, { onDelete: 'cascade' }),
  lotNumber: text("lot_number").notNull(),
  phase: text("phase"),
  block: text("block"),
  streetAddress: text("street_address"),
  planId: varchar("plan_id").references(() => plans.id, { onDelete: 'set null' }),
  status: text("status", { enum: ["available", "under_construction", "completed", "sold", "on_hold"] }).notNull(),
  squareFootage: decimal("square_footage", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lots_development_id").on(table.developmentId),
  index("idx_lots_development_lot_number").on(table.developmentId, table.lotNumber),
  index("idx_lots_plan_id").on(table.planId),
  index("idx_lots_status").on(table.status),
]);

export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  planName: text("plan_name").notNull(),
  floorArea: decimal("floor_area", { precision: 10, scale: 2 }),
  surfaceArea: decimal("surface_area", { precision: 10, scale: 2 }),
  houseVolume: decimal("house_volume", { precision: 10, scale: 2 }),
  stories: decimal("stories", { precision: 3, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_plans_builder_id").on(table.builderId),
  index("idx_plans_plan_name").on(table.planName),
]);

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  builderId: varchar("builder_id").references(() => builders.id, { onDelete: 'cascade' }),
  planId: varchar("plan_id").references(() => plans.id, { onDelete: 'set null' }),
  lotId: varchar("lot_id").references(() => lots.id, { onDelete: 'set null' }),
  contractor: text("contractor").notNull(),
  status: text("status").notNull(),
  inspectionType: text("inspection_type").notNull(),
  pricing: decimal("pricing", { precision: 10, scale: 2 }),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  completedItems: integer("completed_items").default(0),
  totalItems: integer("total_items").default(52),
  priority: text("priority").default('medium'),
  latitude: real("latitude"),
  longitude: real("longitude"),
  floorArea: decimal("floor_area", { precision: 10, scale: 2 }),
  surfaceArea: decimal("surface_area", { precision: 10, scale: 2 }),
  houseVolume: decimal("house_volume", { precision: 10, scale: 2 }),
  stories: decimal("stories", { precision: 3, scale: 1 }),
  notes: text("notes"),
  builderSignatureUrl: text("builder_signature_url"),
  builderSignedAt: timestamp("builder_signed_at"),
  builderSignerName: text("builder_signer_name"),
  complianceStatus: text("compliance_status"),
  complianceFlags: jsonb("compliance_flags"),
  lastComplianceCheck: timestamp("last_compliance_check"),
  sourceGoogleEventId: varchar("source_google_event_id"),
  googleEventId: varchar("google_event_id").unique(),
  originalScheduledDate: timestamp("original_scheduled_date"),
  isCancelled: boolean("is_cancelled").default(false),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
}, (table) => [
  index("idx_jobs_builder_id").on(table.builderId),
  index("idx_jobs_plan_id").on(table.planId),
  index("idx_jobs_lot_id").on(table.lotId),
  index("idx_jobs_scheduled_date").on(table.scheduledDate),
  index("idx_jobs_status_scheduled_date").on(table.status, table.scheduledDate),
  index("idx_jobs_created_by").on(table.createdBy),
  index("idx_jobs_address").on(table.address),
  index("idx_jobs_status_created_by").on(table.status, table.createdBy),
  index("google_event_id_idx").on(table.googleEventId),
]);

export const scheduleEvents = pgTable("schedule_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  notes: text("notes"),
  googleCalendarEventId: text("google_calendar_event_id"),
  googleCalendarId: text("google_calendar_id"),
  lastSyncedAt: timestamp("last_synced_at"),
  color: text("color"),
}, (table) => [
  index("idx_schedule_events_job_id_start_time").on(table.jobId, table.startTime),
  index("idx_schedule_events_google_event_id").on(table.googleCalendarEventId),
  index("idx_schedule_events_start_end_time").on(table.startTime, table.endTime),
]);

export const googleEvents = pgTable("google_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleEventId: text("google_event_id").notNull(),
  googleCalendarId: text("google_calendar_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  colorId: text("color_id"),
  isConverted: boolean("is_converted").default(false),
  convertedToJobId: varchar("converted_to_job_id").references(() => jobs.id, { onDelete: 'set null' }),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => [
  index("idx_google_events_calendar_event").on(table.googleCalendarId, table.googleEventId),
  index("idx_google_events_is_converted").on(table.isConverted),
  index("idx_google_events_start_time").on(table.startTime),
]);

// Builder abbreviation lookup table for calendar event parsing
export const builderAbbreviations = pgTable("builder_abbreviations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  abbreviation: text("abbreviation").notNull(),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_abbreviations_abbreviation").on(table.abbreviation),
  index("idx_builder_abbreviations_builder_id").on(table.builderId),
]);

// Calendar import logs for tracking automated imports
export const calendarImportLogs = pgTable("calendar_import_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  calendarId: text("calendar_id").notNull(),
  calendarName: text("calendar_name"),
  importTimestamp: timestamp("import_timestamp").notNull().defaultNow(),
  eventsProcessed: integer("events_processed").default(0),
  jobsCreated: integer("jobs_created").default(0),
  eventsQueued: integer("events_queued").default(0),
  errors: text("errors"),
}, (table) => [
  index("calendar_import_logs_calendar_id_idx").on(table.calendarId),
  index("calendar_import_logs_import_timestamp_idx").on(table.importTimestamp),
  index("calendar_import_logs_calendar_id_timestamp_idx").on(table.calendarId, table.importTimestamp),
]);

// Unmatched calendar events for manual review
export const unmatchedCalendarEvents = pgTable("unmatched_calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleEventId: text("google_event_id").notNull(),
  calendarId: text("calendar_id").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  rawEventJson: jsonb("raw_event_json"),
  confidenceScore: integer("confidence_score"),
  status: text("status", { enum: ["pending", "approved", "rejected", "auto_created"] }).default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp("reviewed_at"),
  createdJobId: varchar("created_job_id").references(() => jobs.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("unmatched_events_google_event_id_idx").on(table.googleEventId),
  index("unmatched_events_status_idx").on(table.status),
  index("unmatched_events_confidence_score_idx").on(table.confidenceScore),
  index("unmatched_events_created_at_idx").on(table.createdAt),
  index("unmatched_events_status_confidence_idx").on(table.status, table.confidenceScore),
]);

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'cascade' }),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  date: timestamp("date").notNull(),
  isWorkRelated: boolean("is_work_related").default(true),
}, (table) => [
  index("idx_expenses_job_id").on(table.jobId),
  index("idx_expenses_date").on(table.date),
]);

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

// Report Templates - Enhanced for iAuditor-style inspection system
export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category", { 
    enum: ["pre_drywall", "final", "duct_testing", "blower_door", "pre_insulation", "post_insulation", "rough_in", "custom"] 
  }).notNull(),
  version: integer("version").notNull().default(1),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  isDefault: boolean("is_default").default(false),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
}, (table) => [
  index("idx_report_templates_category").on(table.category),
  index("idx_report_templates_status").on(table.status),
  index("idx_report_templates_created_by").on(table.createdBy),
]);

// Template Sections - Hierarchical sections within templates
export const templateSections = pgTable("template_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => reportTemplates.id, { onDelete: 'cascade' }),
  parentSectionId: varchar("parent_section_id"),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  isRepeatable: boolean("is_repeatable").default(false),
  minRepetitions: integer("min_repetitions").default(1),
  maxRepetitions: integer("max_repetitions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_template_sections_template_id").on(table.templateId),
  index("idx_template_sections_parent_id").on(table.parentSectionId),
  index("idx_template_sections_order").on(table.templateId, table.orderIndex),
]);

// Template Fields - Various field types with configuration
export const templateFields = pgTable("template_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => templateSections.id, { onDelete: 'cascade' }),
  fieldType: text("field_type", {
    enum: ["text", "textarea", "number", "checkbox", "select", "multiselect", "yes_no_na", "scale", "date", "time", "datetime", "photo", "photo_group", "signature", "calculation", "conditional_calculation"]
  }).notNull(),
  label: text("label").notNull(),
  description: text("description"),
  placeholder: text("placeholder"),
  orderIndex: integer("order_index").notNull(),
  isRequired: boolean("is_required").default(false),
  isVisible: boolean("is_visible").default(true),
  defaultValue: text("default_value"),
  // Field-specific configuration stored as JSONB
  configuration: jsonb("configuration"),
  /* Configuration examples:
   * number: { min: 0, max: 100, decimals: 2, unit: "kg" }
   * select/multiselect: { options: [{ value: "opt1", label: "Option 1" }] }
   * scale: { min: 1, max: 5, labels: { 1: "Poor", 5: "Excellent" } }
   * photo: { minCount: 1, maxCount: 10, allowAnnotations: true }
   * calculation: { formula: "field1 + field2", dependencies: ["field1", "field2"] }
   */
  // Enhanced conditional logic fields
  conditions: jsonb("conditions"), // Array of condition objects for show/hide logic
  calculation: jsonb("calculation"), // Formula and dependent field references for calculated fields
  validationRules: jsonb("validation_rules"), // Custom validation based on other fields
  conditionalLogic: jsonb("conditional_logic"), // Legacy field - kept for compatibility
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_template_fields_section_id").on(table.sectionId),
  index("idx_template_fields_field_type").on(table.fieldType),
  index("idx_template_fields_order").on(table.sectionId, table.orderIndex),
]);

// Report Instances - Enhanced for storing actual reports created from templates
export const reportInstances = pgTable("report_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  templateId: varchar("template_id").notNull().references(() => reportTemplates.id, { onDelete: 'restrict' }),
  templateVersion: integer("template_version").notNull(),
  status: text("status", { enum: ["draft", "in_progress", "completed", "submitted", "approved"] }).notNull().default("draft"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: 'set null' }),
  inspectorId: varchar("inspector_id").references(() => users.id, { onDelete: 'set null' }),
  pdfUrl: text("pdf_url"),
  emailedTo: text("emailed_to"),
  emailedAt: timestamp("emailed_at"),
  scoreSummary: jsonb("score_summary"),
  complianceStatus: text("compliance_status"),
  complianceFlags: jsonb("compliance_flags"),
  lastComplianceCheck: timestamp("last_compliance_check"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_report_instances_job_id").on(table.jobId),
  index("idx_report_instances_template_id").on(table.templateId),
  index("idx_report_instances_status").on(table.status),
  index("idx_report_instances_inspector_id").on(table.inspectorId),
  index("idx_report_instances_created_at").on(table.createdAt),
]);

// Report Section Instances - Instances of sections in a report
export const reportSectionInstances = pgTable("report_section_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportInstanceId: varchar("report_instance_id").notNull().references(() => reportInstances.id, { onDelete: 'cascade' }),
  templateSectionId: varchar("template_section_id").notNull().references(() => templateSections.id, { onDelete: 'restrict' }),
  parentInstanceId: varchar("parent_instance_id"),
  repetitionIndex: integer("repetition_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_report_section_instances_report_id").on(table.reportInstanceId),
  index("idx_report_section_instances_template_section_id").on(table.templateSectionId),
]);

// Report Field Values - Store values for each field in a report instance
export const reportFieldValues = pgTable("report_field_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportInstanceId: varchar("report_instance_id").notNull().references(() => reportInstances.id, { onDelete: 'cascade' }),
  sectionInstanceId: varchar("section_instance_id").notNull().references(() => reportSectionInstances.id, { onDelete: 'cascade' }),
  templateFieldId: varchar("template_field_id").notNull().references(() => templateFields.id, { onDelete: 'restrict' }),
  fieldType: text("field_type").notNull(),
  // Store different value types
  textValue: text("text_value"),
  numberValue: decimal("number_value", { precision: 20, scale: 5 }),
  booleanValue: boolean("boolean_value"),
  dateValue: timestamp("date_value"),
  jsonValue: jsonb("json_value"), // For complex types like multiselect, photo metadata, signatures
  // Calculated fields
  isCalculated: boolean("is_calculated").default(false),
  calculationError: text("calculation_error"),
  // Metadata
  modifiedBy: varchar("modified_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_report_field_values_report_id").on(table.reportInstanceId),
  index("idx_report_field_values_section_instance_id").on(table.sectionInstanceId),
  index("idx_report_field_values_template_field_id").on(table.templateFieldId),
  index("idx_report_field_values_field_type").on(table.fieldType),
]);

// Field Dependencies - Tracks relationships and conditional logic between fields
export const fieldDependencies = pgTable("field_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldId: varchar("field_id").notNull().references(() => templateFields.id, { onDelete: 'cascade' }),
  dependsOnFieldId: varchar("depends_on_field_id").notNull().references(() => templateFields.id, { onDelete: 'cascade' }),
  conditionType: text("condition_type", {
    enum: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equals", "less_than_or_equals", "contains", "not_contains", "empty", "not_empty", "in", "not_in"]
  }).notNull(),
  conditionValue: jsonb("condition_value"), // Can be string, number, array, or object depending on condition
  action: text("action", {
    enum: ["show", "hide", "require", "unrequire", "enable", "disable", "calculate", "validate", "set_value", "clear_value"]
  }).notNull(),
  actionValue: jsonb("action_value"), // Additional data for the action (e.g., value to set, calculation formula)
  priority: integer("priority").default(0), // Order of execution when multiple dependencies exist
  groupId: varchar("group_id"), // For grouping related conditions with AND/OR logic
  groupOperator: text("group_operator", { enum: ["AND", "OR"] }).default("AND"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_field_dependencies_field_id").on(table.fieldId),
  index("idx_field_dependencies_depends_on_field_id").on(table.dependsOnFieldId),
  index("idx_field_dependencies_group_id").on(table.groupId),
  index("idx_field_dependencies_action").on(table.action),
  index("idx_field_dependencies_is_active").on(table.isActive),
]);

export const forecasts = pgTable("forecasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  predictedTDL: decimal("predicted_tdl", { precision: 10, scale: 2 }),
  predictedDLO: decimal("predicted_dlo", { precision: 10, scale: 2 }),
  predictedACH50: decimal("predicted_ach50", { precision: 10, scale: 2 }),
  actualTDL: decimal("actual_tdl", { precision: 10, scale: 2 }),
  actualDLO: decimal("actual_dlo", { precision: 10, scale: 2 }),
  actualACH50: decimal("actual_ach50", { precision: 10, scale: 2 }),
  cfm50: decimal("cfm50", { precision: 10, scale: 2 }),
  houseVolume: decimal("house_volume", { precision: 10, scale: 2 }),
  houseSurfaceArea: decimal("house_surface_area", { precision: 10, scale: 2 }),
  totalDuctLeakageCfm25: decimal("total_duct_leakage_cfm25", { precision: 10, scale: 2 }),
  ductLeakageToOutsideCfm25: decimal("duct_leakage_to_outside_cfm25", { precision: 10, scale: 2 }),
  totalLedCount: integer("total_led_count"),
  stripLedCount: integer("strip_led_count"),
  suppliesInsideConditioned: integer("supplies_inside_conditioned"),
  suppliesOutsideConditioned: integer("supplies_outside_conditioned"),
  returnRegistersCount: integer("return_registers_count"),
  centralReturnsCount: integer("central_returns_count"),
  aerosealed: boolean("aerosealed").default(false),
  testConditions: text("test_conditions"),
  equipmentNotes: text("equipment_notes"),
  weatherConditions: text("weather_conditions"),
  outdoorTemp: decimal("outdoor_temp", { precision: 5, scale: 1 }),
  indoorTemp: decimal("indoor_temp", { precision: 5, scale: 1 }),
  windSpeed: decimal("wind_speed", { precision: 5, scale: 1 }),
  confidence: integer("confidence"),
  recordedAt: timestamp("recorded_at").default(sql`now()`),
}, (table) => [
  index("idx_forecasts_job_id").on(table.jobId),
]);

export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  itemNumber: integer("item_number").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  status: text("status").notNull().default('pending'),
  notes: text("notes"),
  photoCount: integer("photo_count").default(0),
  photoRequired: boolean("photo_required").default(false),
  voiceNoteUrl: text("voice_note_url"),
  voiceNoteDuration: integer("voice_note_duration"),
}, (table) => [
  index("idx_checklist_items_job_id").on(table.jobId),
  index("idx_checklist_items_status").on(table.status),
]);

export const photoAlbums = pgTable("photo_albums", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  coverPhotoId: varchar("cover_photo_id"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_photo_albums_created_by").on(table.createdBy),
  index("idx_photo_albums_name").on(table.name),
]);

export const photoAlbumItems = pgTable("photo_album_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  albumId: varchar("album_id").notNull().references(() => photoAlbums.id, { onDelete: 'cascade' }),
  photoId: varchar("photo_id").notNull().references(() => photos.id, { onDelete: 'cascade' }),
  orderIndex: integer("order_index").default(0),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  index("idx_photo_album_items_album_id").on(table.albumId),
  index("idx_photo_album_items_photo_id").on(table.photoId),
  index("idx_photo_album_items_order").on(table.albumId, table.orderIndex),
]);

export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  checklistItemId: varchar("checklist_item_id").references(() => checklistItems.id, { onDelete: 'set null' }),
  filePath: text("file_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  fullUrl: text("full_url"),
  hash: text("hash"),
  caption: text("caption"),
  tags: text("tags").array(),
  annotationData: jsonb("annotation_data"),
  ocrText: text("ocr_text"),
  ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }),
  ocrMetadata: jsonb("ocr_metadata"),
  isFavorite: boolean("is_favorite").default(false),
  orderIndex: integer("order_index").default(0),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  width: integer("width"),
  height: integer("height"),
  exifData: jsonb("exif_data"),
  location: text("location"),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: 'set null' }),
}, (table) => [
  index("idx_photos_job_id_uploaded_at").on(table.jobId, table.uploadedAt),
  index("idx_photos_hash").on(table.hash),
  index("idx_photos_tags").using("gin", table.tags),
  index("idx_photos_checklist_item_id").on(table.checklistItemId).where(sql`${table.checklistItemId} IS NOT NULL`),
  index("idx_photos_is_favorite").on(table.isFavorite),
  index("idx_photos_order_index").on(table.orderIndex),
  index("idx_photos_location").on(table.location),
]);

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

export const uploadSessions = pgTable("upload_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  photoCount: integer("photo_count").notNull(),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'set null' }),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
});

export const photoUploadSessions = pgTable("photo_upload_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id").notNull(),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  photoCount: integer("photo_count").notNull().default(0),
  deviceInfo: jsonb("device_info"),
  reminderSent: boolean("reminder_sent").default(false),
  cleanupConfirmed: boolean("cleanup_confirmed").default(false),
  cleanupConfirmedAt: timestamp("cleanup_confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_photo_upload_sessions_user_id").on(table.userId),
  index("idx_photo_upload_sessions_cleanup_confirmed").on(table.cleanupConfirmed),
  index("idx_photo_upload_sessions_upload_date").on(table.uploadDate),
]);

export const emailPreferences = pgTable("email_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobAssigned: boolean("job_assigned").default(true),
  jobStatusChanged: boolean("job_status_changed").default(true),
  reportReady: boolean("report_ready").default(true),
  calendarEvents: boolean("calendar_events").default(true),
  dailyDigest: boolean("daily_digest").default(true),
  weeklyPerformanceSummary: boolean("weekly_performance_summary").default(true),
  unsubscribeToken: varchar("unsubscribe_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_email_preferences_user_id").on(table.userId),
]);

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: varchar("resource_id"),
  changesJson: jsonb("changes_json"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("idx_audit_logs_user_id").on(table.userId),
  index("idx_audit_logs_resource").on(table.resourceType, table.resourceId),
  index("idx_audit_logs_timestamp").on(table.timestamp),
  index("idx_audit_logs_action").on(table.action),
]);

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  iconName: text("icon_name").notNull(),
  criteria: jsonb("criteria").notNull(),
  tier: text("tier"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_achievements_type").on(table.type),
]);

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
  progress: integer("progress").default(0),
  metadata: jsonb("metadata"),
}, (table) => [
  index("idx_user_achievements_user_id").on(table.userId),
  index("idx_user_achievements_achievement_id").on(table.achievementId),
  index("idx_user_achievements_earned_at").on(table.earnedAt),
]);

// Blower door test data table for Minnesota code compliance
export const blowerDoorTests = pgTable("blower_door_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  reportInstanceId: varchar("report_instance_id").references(() => reportInstances.id, { onDelete: 'set null' }),
  
  // Test Information
  testDate: timestamp("test_date").notNull(),
  testTime: text("test_time").notNull(),
  equipmentSerial: text("equipment_serial"),
  equipmentCalibrationDate: timestamp("equipment_calibration_date"),
  
  // Building Information
  houseVolume: decimal("house_volume", { precision: 10, scale: 2 }).notNull(), // cubic feet
  conditionedArea: decimal("conditioned_area", { precision: 10, scale: 2 }).notNull(), // square feet
  surfaceArea: decimal("surface_area", { precision: 10, scale: 2 }), // square feet
  numberOfStories: decimal("number_of_stories", { precision: 3, scale: 1 }).notNull(),
  basementType: text("basement_type", { enum: ["none", "unconditioned", "conditioned"] }).notNull(),
  
  // Weather Conditions for corrections
  outdoorTemp: decimal("outdoor_temp", { precision: 5, scale: 1 }), // Fahrenheit
  indoorTemp: decimal("indoor_temp", { precision: 5, scale: 1 }), // Fahrenheit
  outdoorHumidity: decimal("outdoor_humidity", { precision: 5, scale: 1 }), // percentage
  indoorHumidity: decimal("indoor_humidity", { precision: 5, scale: 1 }), // percentage
  windSpeed: decimal("wind_speed", { precision: 5, scale: 1 }), // mph
  barometricPressure: decimal("barometric_pressure", { precision: 6, scale: 2 }), // inches Hg
  altitude: decimal("altitude", { precision: 8, scale: 1 }), // feet above sea level
  
  // Multi-point test data (stored as JSON array)
  testPoints: jsonb("test_points"), // Array of {housePressure, fanPressure, cfm, ringConfiguration}
  
  // Calculated Results
  cfm50: decimal("cfm50", { precision: 10, scale: 2 }).notNull(), // CFM at 50 Pa
  ach50: decimal("ach50", { precision: 6, scale: 2 }).notNull(), // Air changes per hour at 50 Pa
  ela: decimal("ela", { precision: 8, scale: 2 }), // Effective Leakage Area (sq inches)
  nFactor: decimal("n_factor", { precision: 4, scale: 3 }), // Flow exponent (typically 0.5-0.7)
  correlationCoefficient: decimal("correlation_coefficient", { precision: 4, scale: 3 }), // R² value
  
  // Minnesota Code Compliance (2020 Energy Code)
  codeYear: text("code_year").default("2020"),
  codeLimit: decimal("code_limit", { precision: 6, scale: 2 }), // ACH50 limit per code
  meetsCode: boolean("meets_code").notNull(),
  margin: decimal("margin", { precision: 6, scale: 2 }), // How much under/over the limit
  
  // Additional fields
  notes: text("notes"),
  weatherCorrectionApplied: boolean("weather_correction_applied").default(false),
  altitudeCorrectionFactor: decimal("altitude_correction_factor", { precision: 4, scale: 3 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
}, (table) => [
  index("idx_blower_door_tests_job_id").on(table.jobId),
  index("idx_blower_door_tests_report_instance_id").on(table.reportInstanceId),
  index("idx_blower_door_tests_test_date").on(table.testDate),
  index("idx_blower_door_tests_meets_code").on(table.meetsCode),
]);

// Duct leakage test data table for Minnesota code compliance
export const ductLeakageTests = pgTable("duct_leakage_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  reportInstanceId: varchar("report_instance_id").references(() => reportInstances.id, { onDelete: 'set null' }),
  
  // Test Information
  testDate: timestamp("test_date").notNull(),
  testTime: text("test_time").notNull(),
  testType: text("test_type", { enum: ["total", "leakage_to_outside", "both"] }).notNull(),
  equipmentSerial: text("equipment_serial"),
  equipmentCalibrationDate: timestamp("equipment_calibration_date"),
  
  // System Information
  systemType: text("system_type", { enum: ["forced_air", "heat_pump", "hydronic", "other"] }).notNull(),
  numberOfSystems: integer("number_of_systems").default(1),
  conditionedArea: decimal("conditioned_area", { precision: 10, scale: 2 }).notNull(), // square feet
  systemAirflow: decimal("system_airflow", { precision: 10, scale: 2 }), // Design CFM
  
  // Total Duct Leakage Test (at 25 Pa)
  totalFanPressure: decimal("total_fan_pressure", { precision: 8, scale: 2 }), // Pa
  totalRingConfiguration: text("total_ring_configuration"),
  cfm25Total: decimal("cfm25_total", { precision: 10, scale: 2 }), // Total leakage CFM at 25 Pa
  totalCfmPerSqFt: decimal("total_cfm_per_sqft", { precision: 8, scale: 3 }), // CFM25/100 sq ft
  totalPercentOfFlow: decimal("total_percent_of_flow", { precision: 6, scale: 2 }), // As % of system airflow
  
  // Duct Leakage to Outside (at 25 Pa)
  outsideHousePressure: decimal("outside_house_pressure", { precision: 8, scale: 2 }), // Pa
  outsideFanPressure: decimal("outside_fan_pressure", { precision: 8, scale: 2 }), // Pa
  outsideRingConfiguration: text("outside_ring_configuration"),
  cfm25Outside: decimal("cfm25_outside", { precision: 10, scale: 2 }), // Leakage to outside CFM at 25 Pa
  outsideCfmPerSqFt: decimal("outside_cfm_per_sqft", { precision: 8, scale: 3 }), // CFM25/100 sq ft
  outsidePercentOfFlow: decimal("outside_percent_of_flow", { precision: 6, scale: 2 }), // As % of system airflow
  
  // Pressure Pan Testing
  pressurePanReadings: jsonb("pressure_pan_readings"), // Array of {location, supplyReturn, reading, passFail}
  
  // Minnesota Code Compliance (2020 Energy Code)
  codeYear: text("code_year").default("2020"),
  totalDuctLeakageLimit: decimal("total_duct_leakage_limit", { precision: 6, scale: 2 }), // CFM25/100 sq ft
  outsideLeakageLimit: decimal("outside_leakage_limit", { precision: 6, scale: 2 }), // CFM25/100 sq ft
  meetsCodeTDL: boolean("meets_code_tdl"), // Total Duct Leakage compliance
  meetsCodeDLO: boolean("meets_code_dlo"), // Duct Leakage to Outside compliance
  
  // Additional Data
  notes: text("notes"),
  recommendations: text("recommendations"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
}, (table) => [
  index("idx_duct_leakage_tests_job_id").on(table.jobId),
  index("idx_duct_leakage_tests_report_instance_id").on(table.reportInstanceId),
  index("idx_duct_leakage_tests_test_date").on(table.testDate),
  index("idx_duct_leakage_tests_test_type").on(table.testType),
  index("idx_duct_leakage_tests_meets_code_tdl").on(table.meetsCodeTDL),
  index("idx_duct_leakage_tests_meets_code_dlo").on(table.meetsCodeDLO),
]);

// Financial Management Tables
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'set null' }),
  builderId: varchar("builder_id").references(() => builders.id, { onDelete: 'set null' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Amount fields
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  
  // Status and dates
  status: text("status", { 
    enum: ["draft", "sent", "paid", "overdue", "cancelled"] 
  }).notNull().default("draft"),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  
  // Payment details
  paymentMethod: text("payment_method", { 
    enum: ["check", "credit", "ach", "cash", "other"] 
  }),
  paymentReference: text("payment_reference"),
  
  // Additional fields
  notes: text("notes"),
  terms: text("terms"),
  items: jsonb("items"), // Array of line items: {description, quantity, rate, amount}
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_invoices_invoice_number").on(table.invoiceNumber),
  index("idx_invoices_job_id").on(table.jobId),
  index("idx_invoices_builder_id").on(table.builderId),
  index("idx_invoices_user_id").on(table.userId),
  index("idx_invoices_status").on(table.status),
  index("idx_invoices_due_date").on(table.dueDate),
]);

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  method: text("method", { 
    enum: ["check", "credit", "ach", "cash", "other"] 
  }).notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payments_invoice_id").on(table.invoiceId),
  index("idx_payments_payment_date").on(table.paymentDate),
]);

export const financialSettings = pgTable("financial_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  invoicePrefix: varchar("invoice_prefix").default("INV"),
  nextInvoiceNumber: integer("next_invoice_number").default(1000),
  paymentTermsDays: integer("payment_terms_days").default(30),
  invoiceFooterText: text("invoice_footer_text"),
  companyDetails: jsonb("company_details"), // {name, address, phone, email, taxId}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_financial_settings_user_id").on(table.userId),
]);

// Equipment Management Tables
export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type", { 
    enum: ["blower_door", "duct_tester", "manometer", "camera", "flow_hood", "combustion_analyzer", "infrared_camera", "moisture_meter", "other"] 
  }).notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number").unique(),
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }),
  status: text("status", { 
    enum: ["available", "in_use", "maintenance", "retired"] 
  }).notNull().default("available"),
  location: text("location"),
  calibrationDue: timestamp("calibration_due"),
  lastCalibration: timestamp("last_calibration"),
  calibrationInterval: integer("calibration_interval").default(365), // days
  maintenanceDue: timestamp("maintenance_due"),
  lastMaintenance: timestamp("last_maintenance"),
  maintenanceInterval: integer("maintenance_interval").default(90), // days
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  notes: text("notes"),
  qrCode: text("qr_code"),
  lastUsedDate: timestamp("last_used_date"),
  totalUses: integer("total_uses").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_equipment_user_id").on(table.userId),
  index("idx_equipment_status").on(table.status),
  index("idx_equipment_type").on(table.type),
  index("idx_equipment_serial_number").on(table.serialNumber),
  index("idx_equipment_assigned_to").on(table.assignedTo),
  index("idx_equipment_calibration_due").on(table.calibrationDue),
  index("idx_equipment_maintenance_due").on(table.maintenanceDue),
]);

export const equipmentCalibrations = pgTable("equipment_calibrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  calibrationDate: timestamp("calibration_date").notNull(),
  nextDue: timestamp("next_due").notNull(),
  performedBy: text("performed_by"),
  certificateNumber: text("certificate_number"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  passed: boolean("passed").notNull().default(true),
  notes: text("notes"),
  documentPath: text("document_path"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_equipment_calibrations_equipment_id").on(table.equipmentId),
  index("idx_equipment_calibrations_next_due").on(table.nextDue),
  index("idx_equipment_calibrations_passed").on(table.passed),
]);

export const equipmentMaintenance = pgTable("equipment_maintenance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  maintenanceDate: timestamp("maintenance_date").notNull(),
  performedBy: text("performed_by"),
  description: text("description").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  nextDue: timestamp("next_due"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_equipment_maintenance_equipment_id").on(table.equipmentId),
  index("idx_equipment_maintenance_date").on(table.maintenanceDate),
  index("idx_equipment_maintenance_next_due").on(table.nextDue),
]);

export const equipmentCheckouts = pgTable("equipment_checkouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'set null' }),
  checkoutDate: timestamp("checkout_date").notNull().defaultNow(),
  expectedReturn: timestamp("expected_return"),
  actualReturn: timestamp("actual_return"),
  condition: text("condition", { enum: ["good", "fair", "poor"] }).notNull().default("good"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_equipment_checkouts_equipment_id").on(table.equipmentId),
  index("idx_equipment_checkouts_user_id").on(table.userId),
  index("idx_equipment_checkouts_job_id").on(table.jobId),
  index("idx_equipment_checkouts_actual_return").on(table.actualReturn),
]);

// Quality Assurance Tables
export const qaInspectionScores = pgTable("qa_inspection_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  inspectorId: varchar("inspector_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  reportInstanceId: varchar("report_instance_id").references(() => reportInstances.id, { onDelete: 'set null' }),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }).notNull(),
  maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull().default("100"),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  grade: text("grade", { enum: ["A", "B", "C", "D", "F"] }).notNull(),
  completenessScore: decimal("completeness_score", { precision: 5, scale: 2 }),
  accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }),
  complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }),
  photoQualityScore: decimal("photo_quality_score", { precision: 5, scale: 2 }),
  timelinessScore: decimal("timeliness_score", { precision: 5, scale: 2 }),
  reviewStatus: text("review_status", { 
    enum: ["pending", "reviewed", "approved", "needs_improvement"] 
  }).notNull().default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: 'set null' }),
  reviewDate: timestamp("review_date"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_qa_inspection_scores_job_id").on(table.jobId),
  index("idx_qa_inspection_scores_inspector_id").on(table.inspectorId),
  index("idx_qa_inspection_scores_review_status").on(table.reviewStatus),
  index("idx_qa_inspection_scores_grade").on(table.grade),
  index("idx_qa_inspection_scores_created_at").on(table.createdAt),
]);

export const qaChecklists = pgTable("qa_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category", { 
    enum: ["pre_inspection", "during", "post", "compliance"] 
  }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  requiredForJobTypes: text("required_for_job_types").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_qa_checklists_category").on(table.category),
  index("idx_qa_checklists_is_active").on(table.isActive),
]);

export const qaChecklistItems = pgTable("qa_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistId: varchar("checklist_id").notNull().references(() => qaChecklists.id, { onDelete: 'cascade' }),
  itemText: text("item_text").notNull(),
  isCritical: boolean("is_critical").notNull().default(false),
  category: text("category"),
  sortOrder: integer("sort_order").notNull().default(0),
  helpText: text("help_text"),
  requiredEvidence: text("required_evidence", { 
    enum: ["photo", "measurement", "signature", "note", "none"] 
  }).default("none"),
}, (table) => [
  index("idx_qa_checklist_items_checklist_id").on(table.checklistId),
  index("idx_qa_checklist_items_is_critical").on(table.isCritical),
  index("idx_qa_checklist_items_sort_order").on(table.sortOrder),
]);

export const qaChecklistResponses = pgTable("qa_checklist_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  checklistId: varchar("checklist_id").notNull().references(() => qaChecklists.id, { onDelete: 'cascade' }),
  itemId: varchar("item_id").notNull().references(() => qaChecklistItems.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  response: text("response", { 
    enum: ["completed", "skipped", "na"] 
  }).notNull(),
  notes: text("notes"),
  evidenceIds: text("evidence_ids").array(),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  index("idx_qa_checklist_responses_job_id").on(table.jobId),
  index("idx_qa_checklist_responses_checklist_id").on(table.checklistId),
  index("idx_qa_checklist_responses_user_id").on(table.userId),
  index("idx_qa_checklist_responses_response").on(table.response),
]);

export const qaPerformanceMetrics = pgTable("qa_performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  period: text("period", { 
    enum: ["month", "quarter", "year"] 
  }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  avgScore: decimal("avg_score", { precision: 5, scale: 2 }),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  jobsReviewed: integer("jobs_reviewed").notNull().default(0),
  onTimeRate: decimal("on_time_rate", { precision: 5, scale: 2 }),
  firstPassRate: decimal("first_pass_rate", { precision: 5, scale: 2 }),
  customerSatisfaction: decimal("customer_satisfaction", { precision: 5, scale: 2 }),
  strongAreas: text("strong_areas").array(),
  improvementAreas: text("improvement_areas").array(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => [
  index("idx_qa_performance_metrics_user_id").on(table.userId),
  index("idx_qa_performance_metrics_period").on(table.period),
  index("idx_qa_performance_metrics_period_dates").on(table.periodStart, table.periodEnd),
  index("idx_qa_performance_metrics_calculated_at").on(table.calculatedAt),
]);

// Notification Tables
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type", { 
    enum: ["calibration_alert", "achievement_unlock", "inspection_milestone", "system", "job_assigned", "report_ready"] 
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  relatedEntityId: varchar("related_entity_id"),
  relatedEntityType: text("related_entity_type", {
    enum: ["job", "equipment", "achievement", "report", "user", "invoice"]
  }),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  priority: text("priority", { 
    enum: ["low", "medium", "high", "urgent"] 
  }).default("medium"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_is_read").on(table.isRead),
  index("idx_notifications_type").on(table.type),
  index("idx_notifications_created_at").on(table.createdAt),
  index("idx_notifications_user_unread").on(table.userId, table.isRead),
]);

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationType: text("notification_type", { 
    enum: ["calibration_alert", "achievement_unlock", "inspection_milestone", "system", "job_assigned", "report_ready"] 
  }).notNull(),
  enabled: boolean("enabled").default(true),
  emailEnabled: boolean("email_enabled").default(false),
  pushEnabled: boolean("push_enabled").default(true),
  inAppEnabled: boolean("in_app_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_notification_preferences_user_id").on(table.userId),
  index("idx_notification_preferences_type").on(table.notificationType),
]);

// 45L Tax Credit Tables
export const taxCreditProjects = pgTable("tax_credit_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  projectName: text("project_name").notNull(),
  projectType: text("project_type", { 
    enum: ["single_family", "multifamily", "manufactured"] 
  }).notNull(),
  totalUnits: integer("total_units").notNull(),
  qualifiedUnits: integer("qualified_units").default(0),
  creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).default("0"),
  certificationDate: timestamp("certification_date"),
  taxYear: integer("tax_year").notNull(),
  status: text("status", { 
    enum: ["pending", "certified", "claimed", "denied"] 
  }).notNull().default("pending"),
  softwareTool: text("software_tool"),
  softwareVersion: text("software_version"),
  referenceHome: jsonb("reference_home"),
  qualifiedHome: jsonb("qualified_home"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index("idx_tax_credit_projects_builder_id").on(table.builderId),
  index("idx_tax_credit_projects_status").on(table.status),
  index("idx_tax_credit_projects_tax_year").on(table.taxYear),
]);

export const taxCreditRequirements = pgTable("tax_credit_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => taxCreditProjects.id, { onDelete: 'cascade' }),
  requirementType: text("requirement_type").notNull(),
  description: text("description").notNull(),
  status: text("status", { 
    enum: ["pending", "completed", "failed", "na"] 
  }).notNull().default("pending"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  documentIds: text("document_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tax_credit_requirements_project_id").on(table.projectId),
  index("idx_tax_credit_requirements_status").on(table.status),
]);

export const taxCreditDocuments = pgTable("tax_credit_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => taxCreditProjects.id, { onDelete: 'cascade' }),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadDate: timestamp("upload_date").defaultNow(),
  expirationDate: timestamp("expiration_date"),
  status: text("status", { 
    enum: ["active", "expired", "archived"] 
  }).notNull().default("active"),
  notes: text("notes"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index("idx_tax_credit_documents_project_id").on(table.projectId),
  index("idx_tax_credit_documents_status").on(table.status),
]);

export const unitCertifications = pgTable("unit_certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => taxCreditProjects.id, { onDelete: 'cascade' }),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'set null' }),
  unitAddress: text("unit_address").notNull(),
  unitNumber: text("unit_number"),
  heatingLoad: decimal("heating_load", { precision: 10, scale: 2 }),
  coolingLoad: decimal("cooling_load", { precision: 10, scale: 2 }),
  annualEnergyUse: decimal("annual_energy_use", { precision: 10, scale: 2 }),
  percentSavings: decimal("percent_savings", { precision: 5, scale: 2 }),
  qualified: boolean("qualified").default(false),
  certificationDate: timestamp("certification_date"),
  blowerDoorACH50: decimal("blower_door_ach50", { precision: 8, scale: 2 }),
  ductLeakageCFM25: decimal("duct_leakage_cfm25", { precision: 8, scale: 2 }),
  hersIndex: integer("hers_index"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_unit_certifications_project_id").on(table.projectId),
  index("idx_unit_certifications_job_id").on(table.jobId),
  index("idx_unit_certifications_qualified").on(table.qualified),
]);

// For Replit Auth upsert operations
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertBuilderSchema = createInsertSchema(builders).omit({ id: true, totalJobs: true });
export const insertBuilderContactSchema = createInsertSchema(builderContacts).omit({ id: true, createdAt: true, isPrimary: true });
export const updateBuilderContactSchema = insertBuilderContactSchema.omit({ builderId: true }).partial();
export const insertBuilderAgreementSchema = createInsertSchema(builderAgreements).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
});
export const updateBuilderAgreementSchema = insertBuilderAgreementSchema.omit({ builderId: true }).partial();
export const insertBuilderProgramSchema = createInsertSchema(builderPrograms).omit({ id: true, createdAt: true }).extend({
  enrollmentDate: z.coerce.date(),
  expirationDate: z.coerce.date().nullable().optional(),
});
export const updateBuilderProgramSchema = insertBuilderProgramSchema.omit({ builderId: true }).partial();
export const insertBuilderInteractionSchema = createInsertSchema(builderInteractions).omit({ id: true, createdAt: true }).extend({
  interactionDate: z.coerce.date(),
  followUpDate: z.coerce.date().nullable().optional(),
});
export const updateBuilderInteractionSchema = insertBuilderInteractionSchema.omit({ builderId: true, createdBy: true }).partial();
export const insertDevelopmentSchema = createInsertSchema(developments).omit({ id: true, createdAt: true }).extend({
  startDate: z.coerce.date().nullable().optional(),
  targetCompletionDate: z.coerce.date().nullable().optional(),
});
export const updateDevelopmentSchema = insertDevelopmentSchema.omit({ builderId: true }).partial();
export const insertLotSchema = createInsertSchema(lots).omit({ id: true, createdAt: true }).extend({
  squareFootage: z.coerce.number().nullable().optional(),
});
export const updateLotSchema = insertLotSchema.omit({ developmentId: true }).partial();
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, createdAt: true }).extend({
  floorArea: z.coerce.number().nullable().optional(),
  surfaceArea: z.coerce.number().nullable().optional(),
  houseVolume: z.coerce.number().nullable().optional(),
  stories: z.coerce.number().nullable().optional(),
});
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true }).extend({
  planId: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().nullable().optional()
  ),
  lotId: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().nullable().optional()
  ),
  builderSignatureUrl: z.string().nullable().optional(),
  builderSignedAt: z.coerce.date().nullable().optional(),
  builderSignerName: z.string().nullable().optional(),
  scheduledDate: z.coerce.date().nullable().optional(),
  completedDate: z.coerce.date().nullable().optional(),
  originalScheduledDate: z.coerce.date().nullable().optional(),
  lastComplianceCheck: z.coerce.date().nullable().optional(),
  pricing: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'number' ? val.toString() : val
  ).optional(),
  floorArea: z.coerce.number().nullable().optional(),
  surfaceArea: z.coerce.number().nullable().optional(),
  houseVolume: z.coerce.number().nullable().optional(),
  stories: z.coerce.number().nullable().optional(),
});
export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({ id: true }).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  lastSyncedAt: z.coerce.date().nullable().optional(),
});
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true }).extend({
  date: z.coerce.date(),
});
export const insertMileageLogSchema = createInsertSchema(mileageLogs).omit({ id: true }).extend({
  date: z.coerce.date(),
});
// Report template schemas
export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  publishedAt: z.coerce.date().nullable().optional(),
});
export const insertTemplateSectionSchema = createInsertSchema(templateSections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTemplateFieldSchema = createInsertSchema(templateFields).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReportInstanceSchema = createInsertSchema(reportInstances).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  startedAt: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  submittedAt: z.coerce.date().nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  emailedAt: z.coerce.date().nullable().optional(),
  lastComplianceCheck: z.coerce.date().nullable().optional(),
});
export const insertReportSectionInstanceSchema = createInsertSchema(reportSectionInstances).omit({ id: true, createdAt: true });
export const insertReportFieldValueSchema = createInsertSchema(reportFieldValues).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  numberValue: z.coerce.number().nullable().optional(),
  dateValue: z.coerce.date().nullable().optional(),
});
export const insertForecastSchema = createInsertSchema(forecasts).omit({ id: true }).extend({
  recordedAt: z.coerce.date().nullable().optional(),
  cfm50: z.coerce.number().nullable().optional(),
  houseVolume: z.coerce.number().nullable().optional(),
  houseSurfaceArea: z.coerce.number().nullable().optional(),
  actualTDL: z.coerce.number().nullable().optional(),
  actualDLO: z.coerce.number().nullable().optional(),
  actualACH50: z.coerce.number().nullable().optional(),
  outdoorTemp: z.coerce.number().nullable().optional(),
  indoorTemp: z.coerce.number().nullable().optional(),
  windSpeed: z.coerce.number().nullable().optional(),
  predictedTDL: z.coerce.number().nullable().optional(),
  predictedDLO: z.coerce.number().nullable().optional(),
  predictedACH50: z.coerce.number().nullable().optional(),
  totalDuctLeakageCfm25: z.coerce.number().nullable().optional(),
  ductLeakageToOutsideCfm25: z.coerce.number().nullable().optional(),
  totalLedCount: z.coerce.number().int().nullable().optional(),
  stripLedCount: z.coerce.number().int().nullable().optional(),
  suppliesInsideConditioned: z.coerce.number().int().nullable().optional(),
  suppliesOutsideConditioned: z.coerce.number().int().nullable().optional(),
  returnRegistersCount: z.coerce.number().int().nullable().optional(),
  centralReturnsCount: z.coerce.number().int().nullable().optional(),
});
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
export const insertPhotoAlbumSchema = createInsertSchema(photoAlbums).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPhotoAlbumItemSchema = createInsertSchema(photoAlbumItems).omit({ id: true, addedAt: true });
export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true, uploadedAt: true });
export const insertComplianceRuleSchema = createInsertSchema(complianceRules).omit({ id: true, createdAt: true });
export const insertComplianceHistorySchema = createInsertSchema(complianceHistory).omit({ id: true }).extend({
  evaluatedAt: z.coerce.date(),
});
export const insertCalendarPreferenceSchema = createInsertSchema(calendarPreferences).omit({ id: true, createdAt: true }).extend({
  lastSyncedAt: z.coerce.date().nullable().optional(),
});
export const insertGoogleEventSchema = createInsertSchema(googleEvents).omit({ id: true, createdAt: true }).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  lastSyncedAt: z.coerce.date().nullable().optional(),
});
export const insertBuilderAbbreviationSchema = createInsertSchema(builderAbbreviations).omit({ id: true, createdAt: true });
export const insertCalendarImportLogSchema = createInsertSchema(calendarImportLogs).omit({ id: true, importTimestamp: true });
export const insertUnmatchedCalendarEventSchema = createInsertSchema(unmatchedCalendarEvents).omit({ id: true, createdAt: true }).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  reviewedAt: z.coerce.date().nullable().optional(),
});
export const insertUploadSessionSchema = createInsertSchema(uploadSessions).omit({ id: true }).extend({
  timestamp: z.coerce.date(),
  acknowledgedAt: z.coerce.date().nullable().optional(),
});
export const insertPhotoUploadSessionSchema = createInsertSchema(photoUploadSessions).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  uploadDate: z.coerce.date().optional(),
  cleanupConfirmedAt: z.coerce.date().nullable().optional(),
});
export const insertEmailPreferenceSchema = createInsertSchema(emailPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, createdAt: true });
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true }).extend({
  earnedAt: z.coerce.date().optional(),
});

// Blower Door and Duct Leakage Test schemas
export const insertBlowerDoorTestSchema = createInsertSchema(blowerDoorTests).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  testDate: z.coerce.date(),
  equipmentCalibrationDate: z.coerce.date().nullable().optional(),
  houseVolume: z.coerce.number(),
  conditionedArea: z.coerce.number(),
  surfaceArea: z.coerce.number().nullable().optional(),
  numberOfStories: z.coerce.number(),
  outdoorTemp: z.coerce.number().nullable().optional(),
  indoorTemp: z.coerce.number().nullable().optional(),
  outdoorHumidity: z.coerce.number().nullable().optional(),
  indoorHumidity: z.coerce.number().nullable().optional(),
  windSpeed: z.coerce.number().nullable().optional(),
  barometricPressure: z.coerce.number().nullable().optional(),
  altitude: z.coerce.number().nullable().optional(),
  cfm50: z.coerce.number(),
  ach50: z.coerce.number(),
  ela: z.coerce.number().nullable().optional(),
  nFactor: z.coerce.number().nullable().optional(),
  correlationCoefficient: z.coerce.number().nullable().optional(),
  codeLimit: z.coerce.number().nullable().optional(),
  margin: z.coerce.number().nullable().optional(),
  altitudeCorrectionFactor: z.coerce.number().nullable().optional(),
});

// Financial table schemas
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().nullable().optional(),
  amount: z.coerce.number(),
  tax: z.coerce.number().nullable().optional(),
  total: z.coerce.number(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true }).extend({
  paymentDate: z.coerce.date(),
  amount: z.coerce.number(),
});

export const insertFinancialSettingsSchema = createInsertSchema(financialSettings).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  taxRate: z.coerce.number().nullable().optional(),
  nextInvoiceNumber: z.coerce.number().nullable().optional(),
  paymentTermsDays: z.coerce.number().nullable().optional(),
});

// 45L Tax Credit Insert Schemas
export const insertTaxCreditProjectSchema = createInsertSchema(taxCreditProjects).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  taxYear: z.coerce.number(),
  totalUnits: z.coerce.number(),
  qualifiedUnits: z.coerce.number().optional(),
  certificationDate: z.coerce.date().nullable().optional(),
});

export const insertTaxCreditRequirementSchema = createInsertSchema(taxCreditRequirements).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  completedDate: z.coerce.date().nullable().optional(),
});

export const insertTaxCreditDocumentSchema = createInsertSchema(taxCreditDocuments).omit({ id: true, uploadDate: true }).extend({
  expirationDate: z.coerce.date().nullable().optional(),
});

export const insertUnitCertificationSchema = createInsertSchema(unitCertifications).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  certificationDate: z.coerce.date().nullable().optional(),
  heatingLoad: z.coerce.number().nullable().optional(),
  coolingLoad: z.coerce.number().nullable().optional(),
  annualEnergyUse: z.coerce.number().nullable().optional(),
  percentSavings: z.coerce.number().nullable().optional(),
  blowerDoorACH50: z.coerce.number().nullable().optional(),
  ductLeakageCFM25: z.coerce.number().nullable().optional(),
  hersIndex: z.coerce.number().nullable().optional(),
});

// Equipment Management Schemas
export const insertEquipmentSchema = createInsertSchema(equipment).omit({ id: true, createdAt: true }).extend({
  purchaseDate: z.coerce.date().nullable().optional(),
  lastUsedDate: z.coerce.date().nullable().optional(),
  calibrationDue: z.coerce.date().nullable().optional(),
  lastCalibration: z.coerce.date().nullable().optional(),
  maintenanceDue: z.coerce.date().nullable().optional(),
  lastMaintenance: z.coerce.date().nullable().optional(),
  purchaseCost: z.coerce.number().nullable().optional(),
  currentValue: z.coerce.number().nullable().optional(),
  calibrationInterval: z.coerce.number().nullable().optional(),
  maintenanceInterval: z.coerce.number().nullable().optional(),
  totalUses: z.coerce.number().nullable().optional(),
});

export const insertEquipmentCalibrationSchema = createInsertSchema(equipmentCalibrations).omit({ id: true, createdAt: true }).extend({
  calibrationDate: z.coerce.date(),
  nextDue: z.coerce.date(),
  cost: z.coerce.number().nullable().optional(),
});

export const insertEquipmentMaintenanceSchema = createInsertSchema(equipmentMaintenance).omit({ id: true, createdAt: true }).extend({
  maintenanceDate: z.coerce.date(),
  nextDue: z.coerce.date().nullable().optional(),
  cost: z.coerce.number().nullable().optional(),
});

export const insertEquipmentCheckoutSchema = createInsertSchema(equipmentCheckouts).omit({ id: true, createdAt: true, checkoutDate: true }).extend({
  expectedReturn: z.coerce.date().nullable().optional(),
  actualReturn: z.coerce.date().nullable().optional(),
});

// QA Insert Schemas
export const insertQaInspectionScoreSchema = createInsertSchema(qaInspectionScores).omit({ id: true, createdAt: true }).extend({
  reviewDate: z.coerce.date().nullable().optional(),
  totalScore: z.coerce.number(),
  maxScore: z.coerce.number().default(100),
  percentage: z.coerce.number(),
  completenessScore: z.coerce.number().nullable().optional(),
  accuracyScore: z.coerce.number().nullable().optional(),
  complianceScore: z.coerce.number().nullable().optional(),
  photoQualityScore: z.coerce.number().nullable().optional(),
  timelinessScore: z.coerce.number().nullable().optional(),
});

export const insertQaChecklistSchema = createInsertSchema(qaChecklists).omit({ id: true, createdAt: true, updatedAt: true });

export const insertQaChecklistItemSchema = createInsertSchema(qaChecklistItems).omit({ id: true }).extend({
  sortOrder: z.coerce.number().default(0),
});

export const insertQaChecklistResponseSchema = createInsertSchema(qaChecklistResponses).omit({ id: true, completedAt: true });

export const insertQaPerformanceMetricSchema = createInsertSchema(qaPerformanceMetrics).omit({ id: true, calculatedAt: true }).extend({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  avgScore: z.coerce.number().nullable().optional(),
  jobsCompleted: z.coerce.number().default(0),
  jobsReviewed: z.coerce.number().default(0),
  onTimeRate: z.coerce.number().nullable().optional(),
  firstPassRate: z.coerce.number().nullable().optional(),
  customerSatisfaction: z.coerce.number().nullable().optional(),
});

export const insertFieldDependencySchema = createInsertSchema(fieldDependencies).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  priority: z.coerce.number().nullable().optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  isRead: true,
  readAt: true,
  createdAt: true, 
  updatedAt: true 
}).extend({
  expiresAt: z.coerce.date().nullable().optional(),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertDuctLeakageTestSchema = createInsertSchema(ductLeakageTests).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  testDate: z.coerce.date(),
  equipmentCalibrationDate: z.coerce.date().nullable().optional(),
  conditionedArea: z.coerce.number(),
  systemAirflow: z.coerce.number().nullable().optional(),
  totalFanPressure: z.coerce.number().nullable().optional(),
  cfm25Total: z.coerce.number().nullable().optional(),
  totalCfmPerSqFt: z.coerce.number().nullable().optional(),
  totalPercentOfFlow: z.coerce.number().nullable().optional(),
  outsideHousePressure: z.coerce.number().nullable().optional(),
  outsideFanPressure: z.coerce.number().nullable().optional(),
  cfm25Outside: z.coerce.number().nullable().optional(),
  outsideCfmPerSqFt: z.coerce.number().nullable().optional(),
  outsidePercentOfFlow: z.coerce.number().nullable().optional(),
  totalDuctLeakageLimit: z.coerce.number().nullable().optional(),
  outsideLeakageLimit: z.coerce.number().nullable().optional(),
});

// Calendar import schemas
export const approveEventSchema = z.object({
  builderId: z.string().min(1, "Builder is required"),
  inspectionType: z.string().min(1, "Inspection type is required"),
});

export const rejectEventSchema = z.object({
  reason: z.string().optional(),
});

export const unmatchedEventFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  minConfidence: z.number().min(0).max(100).optional(),
  maxConfidence: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(50).optional(),
  offset: z.number().min(0).default(0).optional(),
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Builder = typeof builders.$inferSelect;
export type BuilderContact = typeof builderContacts.$inferSelect;
export type BuilderAgreement = typeof builderAgreements.$inferSelect;
export type BuilderProgram = typeof builderPrograms.$inferSelect;
export type BuilderInteraction = typeof builderInteractions.$inferSelect;
export type Development = typeof developments.$inferSelect;
export type Lot = typeof lots.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type MileageLog = typeof mileageLogs.$inferSelect;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type TemplateSection = typeof templateSections.$inferSelect;
export type TemplateField = typeof templateFields.$inferSelect;
export type FieldDependency = typeof fieldDependencies.$inferSelect;
export type ReportInstance = typeof reportInstances.$inferSelect;
export type ReportSectionInstance = typeof reportSectionInstances.$inferSelect;
export type ReportFieldValue = typeof reportFieldValues.$inferSelect;
export type Forecast = typeof forecasts.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type PhotoAlbum = typeof photoAlbums.$inferSelect;
export type PhotoAlbumItem = typeof photoAlbumItems.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type ComplianceRule = typeof complianceRules.$inferSelect;
export type ComplianceHistory = typeof complianceHistory.$inferSelect;
export type InsertBuilder = z.infer<typeof insertBuilderSchema>;
export type InsertBuilderContact = z.infer<typeof insertBuilderContactSchema>;
export type InsertBuilderAgreement = z.infer<typeof insertBuilderAgreementSchema>;
export type UpdateBuilderAgreement = z.infer<typeof updateBuilderAgreementSchema>;
export type InsertBuilderProgram = z.infer<typeof insertBuilderProgramSchema>;
export type UpdateBuilderProgram = z.infer<typeof updateBuilderProgramSchema>;
export type InsertBuilderInteraction = z.infer<typeof insertBuilderInteractionSchema>;
export type UpdateBuilderInteraction = z.infer<typeof updateBuilderInteractionSchema>;
export type InsertDevelopment = z.infer<typeof insertDevelopmentSchema>;
export type UpdateDevelopment = z.infer<typeof updateDevelopmentSchema>;
export type InsertLot = z.infer<typeof insertLotSchema>;
export type UpdateLot = z.infer<typeof updateLotSchema>;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertMileageLog = z.infer<typeof insertMileageLogSchema>;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type InsertTemplateSection = z.infer<typeof insertTemplateSectionSchema>;
export type InsertTemplateField = z.infer<typeof insertTemplateFieldSchema>;
export type InsertFieldDependency = z.infer<typeof insertFieldDependencySchema>;
export type InsertReportInstance = z.infer<typeof insertReportInstanceSchema>;
export type InsertReportSectionInstance = z.infer<typeof insertReportSectionInstanceSchema>;
export type InsertReportFieldValue = z.infer<typeof insertReportFieldValueSchema>;
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type UpdateChecklistItem = z.infer<typeof updateChecklistItemSchema>;
export type InsertPhotoAlbum = z.infer<typeof insertPhotoAlbumSchema>;
export type InsertPhotoAlbumItem = z.infer<typeof insertPhotoAlbumItemSchema>;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type InsertComplianceRule = z.infer<typeof insertComplianceRuleSchema>;
export type InsertComplianceHistory = z.infer<typeof insertComplianceHistorySchema>;
export type CalendarPreference = typeof calendarPreferences.$inferSelect;
export type InsertCalendarPreference = z.infer<typeof insertCalendarPreferenceSchema>;
export type GoogleEvent = typeof googleEvents.$inferSelect;
export type InsertGoogleEvent = z.infer<typeof insertGoogleEventSchema>;
export type BuilderAbbreviation = typeof builderAbbreviations.$inferSelect;
export type InsertBuilderAbbreviation = z.infer<typeof insertBuilderAbbreviationSchema>;
export type CalendarImportLog = typeof calendarImportLogs.$inferSelect;
export type InsertCalendarImportLog = z.infer<typeof insertCalendarImportLogSchema>;
export type UnmatchedCalendarEvent = typeof unmatchedCalendarEvents.$inferSelect;
export type InsertUnmatchedCalendarEvent = z.infer<typeof insertUnmatchedCalendarEventSchema>;
export type UploadSession = typeof uploadSessions.$inferSelect;
export type InsertUploadSession = z.infer<typeof insertUploadSessionSchema>;
export type PhotoUploadSession = typeof photoUploadSessions.$inferSelect;
export type InsertPhotoUploadSession = z.infer<typeof insertPhotoUploadSessionSchema>;
export type EmailPreference = typeof emailPreferences.$inferSelect;
export type InsertEmailPreference = z.infer<typeof insertEmailPreferenceSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type BlowerDoorTest = typeof blowerDoorTests.$inferSelect;
export type InsertBlowerDoorTest = z.infer<typeof insertBlowerDoorTestSchema>;
export type DuctLeakageTest = typeof ductLeakageTests.$inferSelect;
export type InsertDuctLeakageTest = z.infer<typeof insertDuctLeakageTestSchema>;

// Financial types
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type FinancialSettings = typeof financialSettings.$inferSelect;
export type InsertFinancialSettings = z.infer<typeof insertFinancialSettingsSchema>;

// 45L Tax Credit Types
export type TaxCreditProject = typeof taxCreditProjects.$inferSelect;
export type InsertTaxCreditProject = z.infer<typeof insertTaxCreditProjectSchema>;
export type TaxCreditRequirement = typeof taxCreditRequirements.$inferSelect;
export type InsertTaxCreditRequirement = z.infer<typeof insertTaxCreditRequirementSchema>;
export type TaxCreditDocument = typeof taxCreditDocuments.$inferSelect;
export type InsertTaxCreditDocument = z.infer<typeof insertTaxCreditDocumentSchema>;
export type UnitCertification = typeof unitCertifications.$inferSelect;
export type InsertUnitCertification = z.infer<typeof insertUnitCertificationSchema>;

// Equipment Types
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type EquipmentCalibration = typeof equipmentCalibrations.$inferSelect;
export type InsertEquipmentCalibration = z.infer<typeof insertEquipmentCalibrationSchema>;
export type EquipmentMaintenance = typeof equipmentMaintenance.$inferSelect;
export type InsertEquipmentMaintenance = z.infer<typeof insertEquipmentMaintenanceSchema>;
export type EquipmentCheckout = typeof equipmentCheckouts.$inferSelect;
export type InsertEquipmentCheckout = z.infer<typeof insertEquipmentCheckoutSchema>;

// Notification Types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;

// QA Types
export type QaInspectionScore = typeof qaInspectionScores.$inferSelect;
export type InsertQaInspectionScore = z.infer<typeof insertQaInspectionScoreSchema>;
export type QaChecklist = typeof qaChecklists.$inferSelect;
export type InsertQaChecklist = z.infer<typeof insertQaChecklistSchema>;
export type QaChecklistItem = typeof qaChecklistItems.$inferSelect;
export type InsertQaChecklistItem = z.infer<typeof insertQaChecklistItemSchema>;
export type QaChecklistResponse = typeof qaChecklistResponses.$inferSelect;
export type InsertQaChecklistResponse = z.infer<typeof insertQaChecklistResponseSchema>;
export type QaPerformanceMetric = typeof qaPerformanceMetrics.$inferSelect;
export type InsertQaPerformanceMetric = z.infer<typeof insertQaPerformanceMetricSchema>;

export interface CalendarImportLogsResponse {
  logs: CalendarImportLog[];
  total: number;
  limit: number;
  offset: number;
}
