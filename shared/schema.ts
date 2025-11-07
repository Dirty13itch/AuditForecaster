import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, real, jsonb, index, date, time, check, bigint } from "drizzle-orm/pg-core";
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

// Analytics interfaces for Phase 5.1
export interface ProfitabilitySummary {
  revenue: string;
  expenses: string;
  profit: string;
  profitMargin: string;
  invoiceCount: number;
  expenseCount: number;
}

export interface JobTypeRevenue {
  jobType: string;
  revenue: string;
  jobCount: number;
  avgRevenue: string;
}

export interface BuilderProfitability {
  builderId: string;
  builderName: string;
  revenue: string;
  jobCount: number;
  avgRevenue: string;
  outstandingAR: string;
}

export interface CashFlowForecast {
  projectedCashIn: string;
  projectedCashOut: string;
  netCashFlow: string;
  arCurrent: string;
  arOverdue: string;
}

export interface InspectorUtilization {
  inspectorId: string;
  inspectorName: string;
  jobsCompleted: number;
  revenueGenerated: string;
  avgJobsPerDay: string;
  utilizationRate: string;
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
  role: text("role", { enum: ["admin", "inspector", "partner_contractor"] })
    .notNull()
    .default("inspector"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WebAuthn credential storage
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text("credential_id").notNull(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceName: text("device_name"),
  deviceType: text("device_type", { enum: ["platform", "cross-platform", "unknown"] }).default("unknown"),
  transports: text("transports").array(),
  aaguid: text("aaguid"),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_webauthn_credentials_user_id").on(table.userId),
  index("idx_webauthn_credentials_credential_id").on(table.credentialId),
]);

// WebAuthn challenges storage
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  challenge: text("challenge").notNull(),
  type: text("type", { enum: ["registration", "authentication"] }).notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_webauthn_challenges_user_id").on(table.userId),
  index("idx_webauthn_challenges_type").on(table.type),
  index("idx_webauthn_challenges_expires_at").on(table.expiresAt),
]);

// Organizations table for multi-tenant architecture
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  resnetCertification: text("resnet_certification"),
  insuranceProvider: text("insurance_provider"),
  insurancePolicyNumber: text("insurance_policy_number"),
  serviceAreas: text("service_areas").array(),
  primaryContactEmail: text("primary_contact_email").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_organizations_name").on(table.name),
]);

// Organization users join table for multi-tenant relationships
export const organizationUsers = pgTable("organization_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text("role", { enum: ["owner", "admin", "inspector", "contractor"] }).notNull(),
  permissions: jsonb("permissions").default({}), // Granular permissions JSON
  invitedBy: varchar("invited_by").references(() => users.id, { onDelete: 'set null' }),
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at"),
  status: text("status", { enum: ["pending", "active", "deactivated"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_organization_users_org_id").on(table.organizationId),
  index("idx_organization_users_user_id").on(table.userId),
  index("idx_organization_users_org_user").on(table.organizationId, table.userId),
  index("idx_organization_users_status").on(table.status),
  index("idx_organization_users_invited_by").on(table.invitedBy),
]);

// Organization settings for configurable behavior
export const organizationSettings = pgTable("organization_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  category: text("category", { 
    enum: ["financial", "workflow", "integration", "security", "notification"] 
  }).notNull(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_organization_settings_org_id").on(table.organizationId),
  index("idx_organization_settings_category").on(table.category),
  index("idx_organization_settings_org_category").on(table.organizationId, table.category),
  index("idx_organization_settings_updated_by").on(table.updatedBy),
]);

// User invitations for team management
export const userInvitations = pgTable("user_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text("email").notNull(),
  role: text("role", { enum: ["owner", "admin", "inspector", "contractor"] }).notNull(),
  token: text("token").notNull(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  status: text("status", { enum: ["pending", "accepted", "expired", "cancelled"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_invitations_org_id").on(table.organizationId),
  index("idx_user_invitations_token").on(table.token),
  index("idx_user_invitations_email").on(table.email),
  index("idx_user_invitations_status").on(table.status),
]);

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
  abbreviations: text("abbreviations").array(), // Calendar parsing abbreviations e.g. ['MI', 'MIH', 'M/I']
  status: text("status", { enum: ["active", "temporary", "merged"] }).default("active"),
  autoCreatedFromEvent: boolean("auto_created_from_event").default(false),
  needsReview: boolean("needs_review").default(false),
  confidence: integer("confidence"), // 0-100 score from parser
  constructionManagerName: text("construction_manager_name"),
  constructionManagerEmail: text("construction_manager_email"),
  constructionManagerPhone: text("construction_manager_phone"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builders_company_name").on(table.companyName),
  index("idx_builders_name_company").on(table.name, table.companyName),
  index("idx_builders_created_by").on(table.createdBy),
  index("idx_builders_status").on(table.status),
  index("idx_builders_needs_review").on(table.needsReview),
  check("builders_rating_range", sql`${table.rating} IS NULL OR (${table.rating} >= 0 AND ${table.rating} <= 5)`),
  check("builders_confidence_range", sql`${table.confidence} IS NULL OR (${table.confidence} >= 0 AND ${table.confidence} <= 100)`),
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
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_contacts_builder_id").on(table.builderId),
  index("idx_builder_contacts_is_primary").on(table.isPrimary),
  index("idx_builder_contacts_created_by").on(table.createdBy),
]);

export const builderAgreements = pgTable("builder_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  agreementName: text("agreement_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status", { enum: ["active", "expired", "terminated", "pending"] }).notNull(),
  defaultInspectionPrice: real("default_inspection_price"),
  paymentTerms: text("payment_terms"),
  inspectionTypesIncluded: text("inspection_types_included").array(),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_builder_agreements_builder_id").on(table.builderId),
  index("idx_builder_agreements_status").on(table.status),
  index("idx_builder_agreements_builder_status").on(table.builderId, table.status),
  index("idx_builder_agreements_created_by").on(table.createdBy),
  check("builder_agreements_end_after_start", sql`${table.endDate} IS NULL OR ${table.endDate} > ${table.startDate}`),
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
  rebateAmount: real("rebate_amount"),
  requiresDocumentation: boolean("requires_documentation").default(true),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_programs_builder_id").on(table.builderId),
  index("idx_builder_programs_builder_status").on(table.builderId, table.status),
  index("idx_builder_programs_program_type").on(table.programType),
  index("idx_builder_programs_created_by").on(table.createdBy),
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

export const constructionManagers = pgTable("construction_managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  title: text("title", {
    enum: ["construction_manager", "area_construction_manager", "director", "superintendent"]
  }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cms_email").on(table.email),
  index("idx_cms_isActive").on(table.isActive),
  index("idx_cms_name").on(table.name),
  index("idx_cms_created_by").on(table.createdBy),
]);

// Construction Manager Cities - tracks which cities each CM covers
export const constructionManagerCities = pgTable("construction_manager_cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  constructionManagerId: varchar("construction_manager_id").notNull().references(() => constructionManagers.id, { onDelete: 'cascade' }),
  city: text("city").notNull(),
  state: text("state").notNull().default('MN'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_cm_cities_cm_id").on(table.constructionManagerId),
  index("idx_cm_cities_city").on(table.city),
  index("idx_cm_cities_cm_city").on(table.constructionManagerId, table.city),
]);

// Pending calendar events from Building Knowledge calendar awaiting assignment
export const pendingCalendarEvents = pgTable("pending_calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleEventId: text("google_event_id").notNull().unique(), // For deduplication and sync tracking
  rawTitle: text("raw_title").notNull(), // Original event title from Google Calendar
  rawDescription: text("raw_description"), // Original event description
  eventDate: timestamp("event_date").notNull(), // When the inspection is scheduled
  eventTime: text("event_time"), // Optional time info (flexible "get it done that day")
  parsedBuilderName: text("parsed_builder_name"), // Extracted builder name from title
  parsedBuilderId: varchar("parsed_builder_id").references(() => builders.id, { onDelete: 'set null' }), // Matched builder
  parsedJobType: text("parsed_job_type", { 
    enum: ["sv2", "full_test", "code_bdoor", "rough_duct", "rehab", "bdoor_retest", "multifamily", "energy_star", "other"] 
  }), // Comprehensive job type enum matching jobs table
  confidenceScore: integer("confidence_score").default(0), // 0-100 match confidence
  status: text("status", { 
    enum: ["pending", "assigned", "rejected", "duplicate"] 
  }).notNull().default("pending"),
  assignedJobId: varchar("assigned_job_id").references(() => jobs.id, { onDelete: 'set null' }), // Link to created job if assigned
  metadata: jsonb("metadata"), // Store full Google Calendar event data
  importedAt: timestamp("imported_at").defaultNow(),
  importedBy: varchar("imported_by").references(() => users.id, { onDelete: 'set null' }), // Who triggered the import
  processedAt: timestamp("processed_at"), // When assigned/rejected
  processedBy: varchar("processed_by").references(() => users.id, { onDelete: 'set null' }), // Who assigned/rejected
}, (table) => [
  index("idx_pending_events_google_id").on(table.googleEventId),
  index("idx_pending_events_status").on(table.status),
  index("idx_pending_events_date").on(table.eventDate),
  index("idx_pending_events_builder").on(table.parsedBuilderId),
  index("idx_pending_events_status_date").on(table.status, table.eventDate),
  index("idx_pending_events_assigned_job_id").on(table.assignedJobId),
  index("idx_pending_events_imported_by").on(table.importedBy),
  index("idx_pending_events_processed_by").on(table.processedBy),
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
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_developments_builder_id").on(table.builderId),
  index("idx_developments_builder_status").on(table.builderId, table.status),
  index("idx_developments_municipality").on(table.municipality),
  index("idx_developments_created_by").on(table.createdBy),
]);

// Development Construction Managers - join table for many-to-many relationship between developments and construction managers
export const developmentConstructionManagers = pgTable("development_construction_managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developmentId: varchar("development_id").notNull().references(() => developments.id, { onDelete: 'cascade' }),
  constructionManagerId: varchar("construction_manager_id").notNull().references(() => constructionManagers.id, { onDelete: 'cascade' }),
  isPrimary: boolean("is_primary").notNull().default(false),
  coverageNotes: text("coverage_notes"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index("idx_dev_cms_dev_id").on(table.developmentId),
  index("idx_dev_cms_cm_id").on(table.constructionManagerId),
  index("idx_dev_cms_is_primary").on(table.isPrimary),
  index("idx_dev_cms_assigned_by").on(table.assignedBy),
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
  squareFootage: real("square_footage"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lots_development_id").on(table.developmentId),
  index("idx_lots_development_lot_number").on(table.developmentId, table.lotNumber),
  index("idx_lots_plan_id").on(table.planId),
  index("idx_lots_status").on(table.status),
  index("idx_lots_created_by").on(table.createdBy),
]);

export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  planName: text("plan_name").notNull(),
  floorArea: real("floor_area"),
  surfaceArea: real("surface_area"),
  houseVolume: real("house_volume"),
  stories: real("stories"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_plans_builder_id").on(table.builderId),
  index("idx_plans_plan_name").on(table.planName),
]);

export const planOptionalFeatures = pgTable("plan_optional_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => plans.id, { onDelete: 'cascade' }),
  featureName: text("feature_name").notNull(),
  featureType: text("feature_type", { enum: ["room", "upgrade", "structural"] }).notNull(),
  impactsFloorArea: boolean("impacts_floor_area").default(false),
  impactsVolume: boolean("impacts_volume").default(false),
  floorAreaDelta: real("floor_area_delta"),
  volumeDelta: real("volume_delta"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_plan_features_plan_id").on(table.planId),
  index("idx_plan_features_feature_name").on(table.featureName),
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
  inspectionType: text("inspection_type", {
    enum: [
      // HERS Job Types (9 primary types)
      "qa_rough",           // HERS/QA Rough Inspection
      "qa_final",           // HERS/QA Final Inspection  
      "hers_blower_door",   // HERS Blower Door Test Only
      "hers_duct_leakage",  // HERS Duct Leakage Test Only
      "hers_ventilation",   // HERS Ventilation Test Only
      "mf_rough",           // Multifamily Rough
      "mf_final",           // Multifamily Final
      "compliance_review",  // Compliance Review
      "other",              // Other/Custom
      
      // Legacy Job Types (kept for backward compatibility)
      "sv2",                // Pre-Drywall (SV2)
      "full_test",          // Final Testing (Complete)
      "code_bdoor",         // Code + Blower Door
      "rough_duct",         // Rough Duct Inspection
      "rehab",              // Rehabilitation
      "bdoor_retest",       // Blower Door Retest
      "multifamily",        // Multifamily (Legacy)
      "energy_star"         // Energy Star
    ]
  }).notNull(),
  pricing: real("pricing"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  fieldWorkComplete: boolean("field_work_complete").default(false),
  fieldWorkCompletedAt: timestamp("field_work_completed_at"),
  photoUploadComplete: boolean("photo_upload_complete").default(false),
  photoUploadCompletedAt: timestamp("photo_upload_completed_at"),
  completedItems: integer("completed_items").default(0),
  totalItems: integer("total_items").default(52),
  priority: text("priority").default('medium'),
  latitude: real("latitude"),
  longitude: real("longitude"),
  locationAccuracy: real("location_accuracy"), // GPS accuracy in meters
  locationCapturedAt: timestamp("location_captured_at"), // When GPS was captured
  floorArea: real("floor_area"),
  surfaceArea: real("surface_area"),
  houseVolume: real("house_volume"),
  stories: real("stories"),
  notes: text("notes"),
  builderSignatureUrl: text("builder_signature_url"),
  builderSignedAt: timestamp("builder_signed_at"),
  builderSignerName: text("builder_signer_name"),
  complianceStatus: text("compliance_status"),
  complianceFlags: jsonb("compliance_flags"),
  lastComplianceCheck: timestamp("last_compliance_check"),
  lastReportSentAt: timestamp("last_report_sent_at"), // When report was last sent to CM
  sourceGoogleEventId: varchar("source_google_event_id"),
  googleEventId: varchar("google_event_id").unique(),
  originalScheduledDate: timestamp("original_scheduled_date"),
  isCancelled: boolean("is_cancelled").default(false),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp("assigned_at"),
  assignedBy: varchar("assigned_by").references(() => users.id, { onDelete: 'set null' }),
  estimatedDuration: integer("estimated_duration"), // Duration in minutes
  territory: text("territory"), // Geographic zone/territory
  previousTestId: varchar("previous_test_id"), // Link to failed test for retest jobs
  // Multifamily compliance tracking columns
  multifamilyProgram: varchar("multifamily_program", { 
    enum: ["energy_star_mfnc", "mn_housing_egcc", "zerh", "benchmarking", "none"] 
  }),
  certificationPath: varchar("certification_path", { 
    enum: ["prescriptive", "eri", "ashrae"] 
  }),
  unitCount: integer("unit_count"),
  sampleSize: integer("sample_size"),
  mroOrganization: varchar("mro_organization"),
  builderVerifiedItemsCount: integer("builder_verified_items_count"),
  builderVerifiedItemsPhotoRequired: boolean("builder_verified_items_photo_required").default(false),
  billedInInvoiceId: varchar("billed_in_invoice_id").references(() => invoices.id, { onDelete: 'set null' }),
  selectedOptionalFeatures: jsonb("selected_optional_features").default('[]'),
  adjustedFloorArea: real("adjusted_floor_area"),
  adjustedVolume: real("adjusted_volume"),
  adjustedSurfaceArea: real("adjusted_surface_area"),
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
  index("idx_jobs_assigned_to").on(table.assignedTo),
  index("idx_jobs_assigned_to_scheduled_date").on(table.assignedTo, table.scheduledDate),
  index("idx_jobs_territory").on(table.territory),
  // Analytics-specific indexes
  index("idx_jobs_completed_date").on(table.completedDate),
  index("idx_jobs_status_completed_date").on(table.status, table.completedDate),
  index("idx_jobs_builder_completed_date").on(table.builderId, table.completedDate),
  index("idx_jobs_compliance_status").on(table.complianceStatus),
  // Completion tracking indexes
  index("idx_jobs_field_work_complete").on(table.fieldWorkComplete),
  index("idx_jobs_photo_upload_complete").on(table.photoUploadComplete),
  // Invoice billing index
  index("idx_jobs_billed_in_invoice_id").on(table.billedInInvoiceId),
  index("idx_jobs_assigned_by").on(table.assignedBy),
]);

// Job Type Configuration table for storing job type metadata
export const jobTypeConfig = pgTable("job_type_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobType: text("job_type").notNull().unique(), // Maps to inspectionType enum values
  displayName: text("display_name").notNull(),
  shortName: text("short_name").notNull(),
  category: text("category", {
    enum: ["quality_assurance", "performance_testing", "multifamily", "compliance", "other", "legacy"]
  }).notNull(),
  requiredTests: text("required_tests").array().default(sql`ARRAY[]::text[]`), // ['blower_door', 'duct_leakage', 'ventilation']
  defaultDuration: integer("default_duration").default(120), // Minutes
  basePricing: real("base_pricing"), // Default pricing
  workflowTemplate: text("workflow_template"), // Reference to workflow template type
  requiredPhotos: text("required_photos").array().default(sql`ARRAY[]::text[]`), // Required photo types
  completionRequirements: jsonb("completion_requirements").default({
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: false,
    photoUploadRequired: true
  }),
  guidanceNotes: text("guidance_notes"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_job_type_config_job_type").on(table.jobType),
  index("idx_job_type_config_category").on(table.category),
  index("idx_job_type_config_is_active").on(table.isActive),
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
  index("idx_google_events_converted_to_job_id").on(table.convertedToJobId),
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
  suggestedInspectorId: varchar("suggested_inspector_id").references(() => users.id, { onDelete: 'set null' }),
  suggestedBuilderId: varchar("suggested_builder_id").references(() => builders.id, { onDelete: 'set null' }),
  suggestedInspectionType: text("suggested_inspection_type"),
  parsedAddress: text("parsed_address"),
  urgencyLevel: text("urgency_level", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("unmatched_events_google_event_id_idx").on(table.googleEventId),
  index("unmatched_events_status_idx").on(table.status),
  index("unmatched_events_confidence_score_idx").on(table.confidenceScore),
  index("unmatched_events_created_at_idx").on(table.createdAt),
  index("unmatched_events_status_confidence_idx").on(table.status, table.confidenceScore),
]);

// Inspector Workload Tracking table
export const inspectorWorkload = pgTable("inspector_workload", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectorId: varchar("inspector_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  jobCount: integer("job_count").default(0),
  scheduledMinutes: integer("scheduled_minutes").default(0),
  territory: text("territory"),
  workloadLevel: text("workload_level", { enum: ["light", "moderate", "heavy", "overbooked"] }).default("light"),
  lastJobLocation: text("last_job_location"),
  lastJobLatitude: real("last_job_latitude"),
  lastJobLongitude: real("last_job_longitude"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspector_workload_inspector_date").on(table.inspectorId, table.date),
  index("idx_inspector_workload_level").on(table.workloadLevel),
  index("idx_inspector_workload_territory").on(table.territory),
]);

// Assignment History table for tracking who assigned jobs to whom
export const assignmentHistory = pgTable("assignment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  assignedBy: varchar("assigned_by").references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  action: text("action", { enum: ["assigned", "reassigned", "unassigned", "auto_assigned"] }).notNull(),
  previousAssignee: varchar("previous_assignee").references(() => users.id, { onDelete: 'set null' }),
  reason: text("reason"),
  metadata: jsonb("metadata"), // Additional assignment data (e.g., workload score, distance, priority)
}, (table) => [
  index("idx_assignment_history_job_id").on(table.jobId),
  index("idx_assignment_history_assigned_to").on(table.assignedTo),
  index("idx_assignment_history_assigned_by").on(table.assignedBy),
  index("idx_assignment_history_assigned_at").on(table.assignedAt),
  index("idx_assignment_history_previous_assignee").on(table.previousAssignee),
]);

// Inspector Preferences table for territory and availability preferences
export const inspectorPreferences = pgTable("inspector_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectorId: varchar("inspector_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  preferredTerritories: text("preferred_territories").array(),
  maxDailyJobs: integer("max_daily_jobs").default(5),
  maxWeeklyJobs: integer("max_weekly_jobs").default(25),
  availabilityHours: jsonb("availability_hours"), // e.g., { "monday": { "start": "08:00", "end": "17:00" }, ... }
  specializations: text("specializations").array(), // Types of inspections they specialize in
  vehicleRange: integer("vehicle_range"), // Maximum miles willing to travel
  homeBase: text("home_base"), // Primary location
  homeBaseLatitude: real("home_base_latitude"),
  homeBaseLongitude: real("home_base_longitude"),
  autoAssignEnabled: boolean("auto_assign_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspector_preferences_inspector_id").on(table.inspectorId),
  index("idx_inspector_preferences_territories").using("gin", table.preferredTerritories),
]);

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  date: timestamp("date").notNull(),
  isDeductible: boolean("is_deductible").default(true),
  ocrText: text("ocr_text"),
  ocrConfidence: real("ocr_confidence"),
  ocrMetadata: jsonb("ocr_metadata"),
  // New financial tracking columns
  categoryId: varchar("category_id").references(() => expenseCategories.id, { onDelete: 'set null' }),
  approvalStatus: varchar("approval_status", { 
    enum: ["pending", "approved", "rejected", "reimbursed"] 
  }).default("pending"),
  swipeClassification: varchar("swipe_classification", { 
    enum: ["business", "personal"] 
  }),
  gpsLatitude: real("gps_latitude"),
  gpsLongitude: real("gps_longitude"),
  receiptPath: varchar("receipt_path"),
  ocrAmount: real("ocr_amount"),
  ocrVendor: varchar("ocr_vendor"),
  ocrDate: date("ocr_date"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp("approved_at"),
}, (table) => [
  index("idx_expenses_job_id").on(table.jobId),
  index("idx_expenses_date").on(table.date),
  index("idx_expenses_date_category").on(table.date, table.category),
  index("idx_expenses_category_id").on(table.categoryId),
  index("idx_expenses_approval_status").on(table.approvalStatus),
  index("idx_expenses_user_approval").on(table.userId, table.approvalStatus),
  index("idx_expenses_user_id").on(table.userId),
  index("idx_expenses_approved_by").on(table.approvedBy),
  check("expenses_amount_positive", sql`${table.amount} > 0`),
]);

export const mileageLogs = pgTable("mileage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  distance: real("distance").notNull(),
  purpose: text("purpose"),
  isWorkRelated: boolean("is_work_related"),
  jobId: varchar("job_id"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  startLatitude: real("start_latitude"),
  startLongitude: real("start_longitude"),
  endLatitude: real("end_latitude"),
  endLongitude: real("end_longitude"),
  // Manual odometer fields (legacy, still used for manual entries)
  startOdometer: integer("start_odometer"),
  endOdometer: integer("end_odometer"),
  rate: real("rate"),
  notes: text("notes"),
  // GPS auto-tracking fields
  startTimestamp: timestamp("start_timestamp"),
  endTimestamp: timestamp("end_timestamp"),
  distanceMeters: integer("distance_meters"), // Calculated from GPS points
  durationSeconds: integer("duration_seconds"),
  averageSpeed: real("average_speed"), // m/s
  businessProbability: real("business_probability"), // 0-1 AI score
  routeSummary: jsonb("route_summary"), // { totalDistance, totalTime, startCoords, endCoords, waypoints }
  trackingSource: text("tracking_source", { 
    enum: ["manual", "gps_auto", "gps_manual"] 
  }).default("manual"),
  vehicleState: text("vehicle_state", { 
    enum: ["idle", "monitoring", "recording", "unclassified", "completed"] 
  }).default("completed"),
}, (table) => [
  index("idx_mileage_logs_date").on(table.date),
  index("idx_mileage_logs_tracking_source").on(table.trackingSource),
  index("idx_mileage_logs_vehicle_state").on(table.vehicleState),
  index("idx_mileage_logs_date_source").on(table.date, table.trackingSource),
  index("idx_mileage_logs_user_id").on(table.userId),
  // Performance indexes for MileIQ functionality
  index("idx_mileage_unclassified").on(table.vehicleState, table.date).where(sql`vehicle_state = 'unclassified'`),
  index("idx_mileage_monthly_summary").on(table.date, table.purpose).where(sql`vehicle_state IN ('completed', 'unclassified')`),
  check("mileage_logs_distance_positive", sql`${table.distance} > 0`),
]);

export const mileageRoutePoints = pgTable("mileage_route_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logId: varchar("log_id").notNull().references(() => mileageLogs.id, { onDelete: 'cascade' }),
  timestamp: timestamp("timestamp").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: real("speed"), // m/s
  accuracy: real("accuracy"), // meters
  source: text("source", { enum: ["gps", "network", "cached"] }).default("gps"),
}, (table) => [
  index("idx_mileage_route_points_log_id").on(table.logId),
  index("idx_mileage_route_points_log_timestamp").on(table.logId, table.timestamp),
]);

// Report Templates - Enhanced for iAuditor-style inspection system with visual designer
export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category", { 
    enum: ["pre_drywall", "final", "duct_testing", "blower_door", "pre_insulation", "post_insulation", "rough_in", "energy_audit", "custom"] 
  }).notNull(),
  version: integer("version").notNull().default(1),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  // Visual designer specific fields
  components: jsonb("components"), // Array of component definitions with types, properties, and IDs
  layout: jsonb("layout"), // Grid layout configuration for visual positioning
  conditionalRules: jsonb("conditional_rules"), // Array of if-then-else logic rules
  calculations: jsonb("calculations"), // Array of calculation formulas and dependencies
  metadata: jsonb("metadata"), // Additional settings (grid size, theme, etc.)
  // Version control
  parentTemplateId: varchar("parent_template_id"), // Reference to parent template for version history
  versionNotes: text("version_notes"), // Notes about what changed in this version
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
}, (table) => [
  index("idx_report_templates_category").on(table.category),
  index("idx_report_templates_status").on(table.status),
  index("idx_report_templates_created_by").on(table.createdBy),
  index("idx_report_templates_is_active").on(table.isActive),
  index("idx_report_templates_parent_id").on(table.parentTemplateId),
]);

// Report Instances - Enhanced for storing actual reports created from templates
export const reportInstances = pgTable("report_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'cascade' }),
  templateId: varchar("template_id").notNull().references(() => reportTemplates.id, { onDelete: 'restrict' }),
  templateVersion: integer("template_version").notNull().default(1),
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
  templateSectionId: varchar("template_section_id").notNull(), // No FK constraint - migrated to component-based templates
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
  sectionInstanceId: varchar("section_instance_id").references(() => reportSectionInstances.id, { onDelete: 'cascade' }), // Nullable for component-based templates
  templateFieldId: varchar("template_field_id").notNull(),  // No FK constraint for component-based templates
  // Store different value types
  valueText: text("value_text"),
  valueNumber: real("value_number"),
  valueBoolean: boolean("value_boolean"),
  valueDate: date("value_date"),
  valueTime: time("value_time"),
  valueDatetime: timestamp("value_datetime"),
  valueJson: jsonb("value_json"), // For complex types like multiselect, photo metadata, signatures
  photoIds: text("photo_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_report_field_values_report_id").on(table.reportInstanceId),
  index("idx_report_field_values_section_instance_id").on(table.sectionInstanceId),
  index("idx_report_field_values_template_field_id").on(table.templateFieldId),
]);

// Field Dependencies - Tracks relationships and conditional logic between fields
export const fieldDependencies = pgTable("field_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldId: varchar("field_id").notNull(), // No FK constraint - migrated to component-based templates
  dependsOnFieldId: varchar("depends_on_field_id").notNull(), // No FK constraint - migrated to component-based templates
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
  predictedTdl: real("predicted_tdl"),
  predictedDlo: real("predicted_dlo"),
  predictedAch50: real("predicted_ach50"),
  actualTdl: real("actual_tdl"),
  actualDlo: real("actual_dlo"),
  actualAch50: real("actual_ach50"),
  cfm50: real("cfm50"),
  houseVolume: real("house_volume"),
  houseSurfaceArea: real("house_surface_area"),
  totalDuctLeakageCfm25: real("total_duct_leakage_cfm25"),
  ductLeakageToOutsideCfm25: real("duct_leakage_to_outside_cfm25"),
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
  outdoorTemp: real("outdoor_temp"),
  indoorTemp: real("indoor_temp"),
  windSpeed: real("wind_speed"),
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
  // Analytics-specific indexes for checklistItems
  index("idx_checklist_items_job_completed").on(table.jobId, table.completed),
  index("idx_checklist_items_job_status").on(table.jobId, table.status),
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
  ocrConfidence: real("ocr_confidence"),
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
  index("idx_photos_uploaded_by").on(table.uploadedBy),
]);

export const complianceRules = pgTable("compliance_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  codeYear: text("code_year").notNull(),
  metricType: text("metric_type").notNull(),
  threshold: real("threshold").notNull(),
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
  actorId: varchar("actor_id").references(() => users.id, { onDelete: 'set null' }),
  action: text("action").notNull(),
  entityRef: text("entity_ref").notNull(), // Format: "type:id" e.g. "job:abc123"
  before: jsonb("before"), // State before mutation (for updates/deletes)
  after: jsonb("after"), // State after mutation (for creates/updates)
  metadata: jsonb("metadata"),
  corrId: varchar("corr_id").notNull(), // Correlation ID for request tracing
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  ts: bigint("ts", { mode: 'number' }).notNull(), // Unix timestamp in milliseconds
}, (table) => [
  index("idx_audit_logs_actor_id").on(table.actorId),
  index("idx_audit_logs_entity_ref").on(table.entityRef),
  index("idx_audit_logs_ts").on(table.ts),
  index("idx_audit_logs_corr_id").on(table.corrId),
  index("idx_audit_logs_action").on(table.action),
]);

// Analytics Events - AAA Blueprint Observability
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: 'set null' }), // Nullable - server injects from req.user.id
  eventType: text("event_type").notNull(), // view_route, search_entity, create_entity, etc.
  entityType: text("entity_type"), // job, photo, builder, etc. (optional)
  entityId: varchar("entity_id"), // Specific entity ID (optional)
  route: text("route").notNull(), // URL path where event occurred
  correlationId: varchar("correlation_id"), // Request correlation ID for tracing
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Event-specific data (query, filters, counts, etc.)
}, (table) => [
  index("idx_analytics_events_actor_id").on(table.actorId),
  index("idx_analytics_events_event_type").on(table.eventType),
  index("idx_analytics_events_entity").on(table.entityType, table.entityId),
  index("idx_analytics_events_timestamp").on(table.timestamp),
  index("idx_analytics_events_correlation_id").on(table.correlationId),
  index("idx_analytics_events_route").on(table.route),
]);

export const goldenPathResults = pgTable("golden_path_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goldenPathId: text("golden_path_id").notNull(),
  route: text("route").notNull(),
  status: text("status").notNull(),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
  duration: integer("duration"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
}, (table) => [
  index("idx_golden_path_results_golden_path_id").on(table.goldenPathId),
  index("idx_golden_path_results_route").on(table.route),
  index("idx_golden_path_results_executed_at").on(table.executedAt),
]);

export const accessibilityAuditResults = pgTable("accessibility_audit_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  route: text("route").notNull(),
  status: text("status").notNull(),
  violations: integer("violations").notNull().default(0),
  auditedAt: timestamp("audited_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("idx_accessibility_audit_results_route").on(table.route),
  index("idx_accessibility_audit_results_audited_at").on(table.auditedAt),
]);

export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  route: text("route").notNull(),
  lighthouseScore: integer("lighthouse_score"),
  testCoverage: integer("test_coverage"),
  measuredAt: timestamp("measured_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("idx_performance_metrics_route").on(table.route),
  index("idx_performance_metrics_measured_at").on(table.measuredAt),
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
  houseVolume: real("house_volume").notNull(), // cubic feet
  conditionedArea: real("conditioned_area").notNull(), // square feet
  surfaceArea: real("surface_area"), // square feet
  numberOfStories: real("number_of_stories").notNull(),
  basementType: text("basement_type", { enum: ["none", "unconditioned", "conditioned"] }).notNull(),
  
  // Weather Conditions for corrections
  outdoorTemp: real("outdoor_temp"), // Fahrenheit
  indoorTemp: real("indoor_temp"), // Fahrenheit
  outdoorHumidity: real("outdoor_humidity"), // percentage
  indoorHumidity: real("indoor_humidity"), // percentage
  windSpeed: real("wind_speed"), // mph
  barometricPressure: real("barometric_pressure"), // inches Hg
  altitude: real("altitude"), // feet above sea level
  
  // Multi-point test data (stored as JSON array)
  testPoints: jsonb("test_points"), // Array of {housePressure, fanPressure, cfm, ringConfiguration}
  
  // Calculated Results
  cfm50: real("cfm50").notNull(), // CFM at 50 Pa
  ach50: real("ach50").notNull(), // Air changes per hour at 50 Pa
  ela: real("ela"), // Effective Leakage Area (sq inches)
  nFactor: real("n_factor"), // Flow exponent (typically 0.5-0.7)
  correlationCoefficient: real("correlation_coefficient"), // R² value
  
  // Minnesota Code Compliance (2020 Energy Code)
  codeYear: text("code_year").default("2020"),
  codeLimit: real("code_limit"), // ACH50 limit per code
  meetsCode: boolean("meets_code").notNull(),
  margin: real("margin"), // How much under/over the limit
  
  // Additional fields
  notes: text("notes"),
  weatherCorrectionApplied: boolean("weather_correction_applied").default(false),
  altitudeCorrectionFactor: real("altitude_correction_factor"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
}, (table) => [
  index("idx_blower_door_tests_job_id").on(table.jobId),
  index("idx_blower_door_tests_report_instance_id").on(table.reportInstanceId),
  index("idx_blower_door_tests_test_date").on(table.testDate),
  index("idx_blower_door_tests_meets_code").on(table.meetsCode),
  check("blower_door_tests_cfm50_non_negative", sql`${table.cfm50} >= 0`),
  check("blower_door_tests_ach50_non_negative", sql`${table.ach50} >= 0`),
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
  conditionedArea: real("conditioned_area").notNull(), // square feet
  systemAirflow: real("system_airflow"), // Design CFM
  
  // Total Duct Leakage Test (at 25 Pa)
  totalFanPressure: real("total_fan_pressure"), // Pa
  totalRingConfiguration: text("total_ring_configuration"),
  cfm25Total: real("cfm25_total"), // Total leakage CFM at 25 Pa
  totalCfmPerSqFt: real("total_cfm_per_sqft"), // CFM25/100 sq ft
  totalPercentOfFlow: real("total_percent_of_flow"), // As % of system airflow
  
  // Duct Leakage to Outside (at 25 Pa)
  outsideHousePressure: real("outside_house_pressure"), // Pa
  outsideFanPressure: real("outside_fan_pressure"), // Pa
  outsideRingConfiguration: text("outside_ring_configuration"),
  cfm25Outside: real("cfm25_outside"), // Leakage to outside CFM at 25 Pa
  outsideCfmPerSqFt: real("outside_cfm_per_sqft"), // CFM25/100 sq ft
  outsidePercentOfFlow: real("outside_percent_of_flow"), // As % of system airflow
  
  // Pressure Pan Testing
  pressurePanReadings: jsonb("pressure_pan_readings"), // Array of {location, supplyReturn, reading, passFail}
  
  // Minnesota Code Compliance (2020 Energy Code)
  codeYear: text("code_year").default("2020"),
  totalDuctLeakageLimit: real("total_duct_leakage_limit"), // CFM25/100 sq ft
  outsideLeakageLimit: real("outside_leakage_limit"), // CFM25/100 sq ft
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
  index("idx_duct_leakage_tests_created_by").on(table.createdBy),
  check("duct_leakage_tests_cfm25_total_non_negative", sql`${table.cfm25Total} IS NULL OR ${table.cfm25Total} >= 0`),
  check("duct_leakage_tests_cfm25_outside_non_negative", sql`${table.cfm25Outside} IS NULL OR ${table.cfm25Outside} >= 0`),
]);

// Ventilation Testing (ASHRAE 62.2)
export const ventilationTests = pgTable("ventilation_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  reportInstanceId: varchar("report_instance_id").references(() => reportInstances.id, { onDelete: 'set null' }),
  
  // Test Information
  testDate: timestamp("test_date").notNull(),
  testTime: text("test_time").notNull(),
  equipmentSerial: text("equipment_serial"),
  equipmentCalibrationDate: timestamp("equipment_calibration_date"),
  
  // House Characteristics
  floorArea: real("floor_area").notNull(), // Total conditioned floor area (sq ft)
  bedrooms: integer("bedrooms").notNull(),
  stories: real("stories").default("1"), // Building height (1, 1.5, 2, etc.)
  
  // ASHRAE 62.2 Whole-House Ventilation Calculations
  requiredVentilationRate: real("required_ventilation_rate"), // Qtotal (cfm)
  requiredContinuousRate: real("required_continuous_rate"), // For continuous operation
  infiltrationCredit: real("infiltration_credit"), // From blower door if available (cfm)
  adjustedRequiredRate: real("adjusted_required_rate"), // After infiltration credit
  
  // Kitchen Exhaust Fan
  kitchenExhaustType: text("kitchen_exhaust_type", { enum: ["intermittent", "continuous", "none"] }),
  kitchenRatedCFM: real("kitchen_rated_cfm"),
  kitchenMeasuredCFM: real("kitchen_measured_cfm"),
  kitchenMeetsCode: boolean("kitchen_meets_code"), // ≥100 intermittent or ≥25 continuous
  kitchenNotes: text("kitchen_notes"),
  
  // Bathroom Exhaust Fans (supporting up to 4 bathrooms)
  bathroom1Type: text("bathroom1_type", { enum: ["intermittent", "continuous", "none"] }),
  bathroom1RatedCFM: real("bathroom1_rated_cfm"),
  bathroom1MeasuredCFM: real("bathroom1_measured_cfm"),
  bathroom1MeetsCode: boolean("bathroom1_meets_code"), // ≥50 intermittent or ≥20 continuous
  
  bathroom2Type: text("bathroom2_type", { enum: ["intermittent", "continuous", "none"] }),
  bathroom2RatedCFM: real("bathroom2_rated_cfm"),
  bathroom2MeasuredCFM: real("bathroom2_measured_cfm"),
  bathroom2MeetsCode: boolean("bathroom2_meets_code"),
  
  bathroom3Type: text("bathroom3_type", { enum: ["intermittent", "continuous", "none"] }),
  bathroom3RatedCFM: real("bathroom3_rated_cfm"),
  bathroom3MeasuredCFM: real("bathroom3_measured_cfm"),
  bathroom3MeetsCode: boolean("bathroom3_meets_code"),
  
  bathroom4Type: text("bathroom4_type", { enum: ["intermittent", "continuous", "none"] }),
  bathroom4RatedCFM: real("bathroom4_rated_cfm"),
  bathroom4MeasuredCFM: real("bathroom4_measured_cfm"),
  bathroom4MeetsCode: boolean("bathroom4_meets_code"),
  
  // Mechanical Ventilation System
  mechanicalVentilationType: text("mechanical_ventilation_type", { 
    enum: ["none", "supply_only", "exhaust_only", "balanced_hrv", "balanced_erv", "other"] 
  }).default("none"),
  mechanicalRatedCFM: real("mechanical_rated_cfm"),
  mechanicalMeasuredSupplyCFM: real("mechanical_measured_supply_cfm"),
  mechanicalMeasuredExhaustCFM: real("mechanical_measured_exhaust_cfm"),
  mechanicalOperatingSchedule: text("mechanical_operating_schedule", { enum: ["continuous", "intermittent", "on_demand"] }),
  mechanicalControls: text("mechanical_controls"), // Timer, humidity sensor, manual, etc.
  mechanicalNotes: text("mechanical_notes"),
  
  // Total Ventilation Provided
  totalVentilationProvided: real("total_ventilation_provided"), // Total cfm from all sources
  meetsVentilationRequirement: boolean("meets_ventilation_requirement"), // Provided ≥ Required
  
  // Minnesota Code Compliance (2020 Energy Code + ASHRAE 62.2)
  codeYear: text("code_year").default("2020"),
  overallCompliant: boolean("overall_compliant"), // All requirements met
  nonComplianceNotes: text("non_compliance_notes"),
  recommendations: text("recommendations"),
  
  // Additional Data
  weatherConditions: text("weather_conditions"),
  inspectorNotes: text("inspector_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
}, (table) => [
  index("idx_ventilation_tests_job_id").on(table.jobId),
  index("idx_ventilation_tests_report_instance_id").on(table.reportInstanceId),
  index("idx_ventilation_tests_test_date").on(table.testDate),
  index("idx_ventilation_tests_overall_compliant").on(table.overallCompliant),
  index("idx_ventilation_tests_meets_ventilation_requirement").on(table.meetsVentilationRequirement),
  check("ventilation_tests_kitchen_rated_cfm_non_negative", sql`${table.kitchenRatedCFM} IS NULL OR ${table.kitchenRatedCFM} >= 0`),
  check("ventilation_tests_kitchen_measured_cfm_non_negative", sql`${table.kitchenMeasuredCFM} IS NULL OR ${table.kitchenMeasuredCFM} >= 0`),
  check("ventilation_tests_mechanical_rated_cfm_non_negative", sql`${table.mechanicalRatedCFM} IS NULL OR ${table.mechanicalRatedCFM} >= 0`),
  check("ventilation_tests_mechanical_supply_cfm_non_negative", sql`${table.mechanicalMeasuredSupplyCFM} IS NULL OR ${table.mechanicalMeasuredSupplyCFM} >= 0`),
  check("ventilation_tests_mechanical_exhaust_cfm_non_negative", sql`${table.mechanicalMeasuredExhaustCFM} IS NULL OR ${table.mechanicalMeasuredExhaustCFM} >= 0`),
]);

// Financial Management Tables
// Builder Rate Cards - Pricing agreements with volume tiers
export const builderRateCards = pgTable("builder_rate_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  jobType: varchar("job_type").notNull(),
  baseRate: real("base_rate").notNull(),
  volumeTierStart: integer("volume_tier_start").default(0).notNull(),
  volumeDiscount: real("volume_discount").default("0"),
  effectiveStartDate: date("effective_start_date").notNull(),
  effectiveEndDate: date("effective_end_date"),
  billingCodes: jsonb("billing_codes"), // {rush: 50, weekend: 75}
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_rate_cards_builder_id").on(table.builderId),
  index("idx_builder_rate_cards_builder_job_type").on(table.builderId, table.jobType),
  index("idx_builder_rate_cards_effective_start").on(table.effectiveStartDate),
]);

// Invoices - Monthly invoices to Building Knowledge
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").default("0").notNull(),
  total: real("total").notNull(),
  status: varchar("status", { 
    enum: ["draft", "reviewed", "sent", "paid"] 
  }).notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_invoices_builder_id").on(table.builderId),
  index("idx_invoices_status").on(table.status),
  index("idx_invoices_invoice_number").on(table.invoiceNumber),
  index("idx_invoices_builder_status").on(table.builderId, table.status),
  index("idx_invoices_period_start").on(table.periodStart),
  check("invoices_subtotal_non_negative", sql`${table.subtotal} >= 0`),
  check("invoices_total_non_negative", sql`${table.total} >= 0`),
]);

// Invoice Line Items - Line items for each invoice
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'set null' }),
  description: text("description").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: real("unit_price").notNull(),
  lineTotal: real("line_total").notNull(),
  jobType: varchar("job_type"),
}, (table) => [
  index("idx_invoice_line_items_invoice_id").on(table.invoiceId),
  index("idx_invoice_line_items_job_id").on(table.jobId),
]);

// Payments - Payment tracking from Building Knowledge
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id, { onDelete: 'set null' }),
  amount: real("amount").notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: varchar("payment_method", { 
    enum: ["direct_deposit", "check", "wire"] 
  }),
  referenceNumber: varchar("reference_number"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payments_invoice_id").on(table.invoiceId),
  index("idx_payments_payment_date").on(table.paymentDate),
  index("idx_payments_created_by").on(table.createdBy),
  check("payments_amount_positive", sql`${table.amount} > 0`),
]);

// AR Snapshots - AR aging snapshots (daily)
export const arSnapshots = pgTable("ar_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  snapshotDate: date("snapshot_date").notNull(),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  current: real("current").default("0").notNull(),
  days30: real("days_30").default("0").notNull(),
  days60: real("days_60").default("0").notNull(),
  days90Plus: real("days_90_plus").default("0").notNull(),
  totalAR: real("total_ar").notNull(),
}, (table) => [
  index("idx_ar_snapshots_snapshot_builder").on(table.snapshotDate, table.builderId),
  index("idx_ar_snapshots_builder_id").on(table.builderId),
]);

// Expense Categories - Expense classification categories
export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  color: varchar("color"),
  icon: varchar("icon"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expense Rules - Auto-classification rules
export const expenseRules = pgTable("expense_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorPattern: varchar("vendor_pattern").notNull(),
  categoryId: varchar("category_id").notNull().references(() => expenseCategories.id, { onDelete: 'cascade' }),
  autoApprove: boolean("auto_approve").default(false).notNull(),
  maxAutoApproveAmount: real("max_auto_approve_amount"),
  priority: integer("priority").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_expense_rules_priority").on(table.priority),
  index("idx_expense_rules_category_id").on(table.categoryId),
]);

// Job Cost Ledger - Job cost tracking
export const jobCostLedger = pgTable("job_cost_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  costType: varchar("cost_type", { 
    enum: ["labor", "travel", "equipment", "expense"] 
  }).notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  recordedAt: timestamp("recorded_at").defaultNow(),
}, (table) => [
  index("idx_job_cost_ledger_job_id").on(table.jobId),
  index("idx_job_cost_ledger_job_cost_type").on(table.jobId, table.costType),
  index("idx_job_cost_ledger_recorded_at").on(table.recordedAt),
]);

// Mileage Rate History - IRS mileage rate tracking
export const mileageRateHistory = pgTable("mileage_rate_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  effectiveDate: date("effective_date").notNull(),
  ratePerMile: real("rate_per_mile").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_mileage_rate_history_effective_date").on(table.effectiveDate),
]);

// Multifamily Programs - Compliance program templates
export const multifamilyPrograms = pgTable("multifamily_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  requiresPhotoEvidence: boolean("requires_photo_evidence").default(false),
  samplingRequired: boolean("sampling_required").default(false),
  checklistTemplateId: integer("checklist_template_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Compliance Artifacts - Compliance document storage
export const complianceArtifacts = pgTable("compliance_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  programType: varchar("program_type", { 
    length: 50,
    enum: ["energy_star_mfnc", "egcc", "zerh", "benchmarking"] 
  }).notNull(),
  artifactType: varchar("artifact_type", { 
    length: 50,
    enum: ["checklist", "worksheet", "photo", "certificate"] 
  }).notNull(),
  documentPath: varchar("document_path", { length: 500 }).notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => [
  index("idx_compliance_artifacts_job_id").on(table.jobId),
  index("idx_compliance_artifacts_job_program").on(table.jobId, table.programType),
  index("idx_compliance_artifacts_uploaded_by").on(table.uploadedBy),
]);

export const financialSettings = pgTable("financial_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name"),
  companyAddress: text("company_address"),
  companyPhone: varchar("company_phone"),
  companyEmail: varchar("company_email"),
  taxRate: real("tax_rate").default("0"),
  invoicePrefix: varchar("invoice_prefix").default("INV"),
  nextInvoiceNumber: integer("next_invoice_number").default(1000),
  paymentTerms: text("payment_terms"),
  invoiceFooterText: text("invoice_footer_text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  purchaseCost: real("purchase_cost"),
  currentValue: real("current_value"),
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
  check("equipment_purchase_cost_non_negative", sql`${table.purchaseCost} IS NULL OR ${table.purchaseCost} >= 0`),
  check("equipment_current_value_non_negative", sql`${table.currentValue} IS NULL OR ${table.currentValue} >= 0`),
]);

export const equipmentCalibrations = pgTable("equipment_calibrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  calibrationDate: timestamp("calibration_date").notNull(),
  nextDue: timestamp("next_due").notNull(),
  performedBy: text("performed_by"),
  certificateNumber: text("certificate_number"),
  cost: real("cost"),
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
  cost: real("cost"),
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
  totalScore: real("total_score").notNull(),
  maxScore: real("max_score").notNull().default("100"),
  percentage: real("percentage").notNull(),
  grade: text("grade", { enum: ["A", "B", "C", "D", "F"] }).notNull(),
  overallScore: real("overall_score"),
  categoryScores: jsonb("category_scores"),
  completenessScore: real("completeness_score"),
  accuracyScore: real("accuracy_score"),
  complianceScore: real("compliance_score"),
  photoQualityScore: real("photo_quality_score"),
  timelinessScore: real("timeliness_score"),
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
  index("idx_qa_inspection_scores_report_instance_id").on(table.reportInstanceId),
  index("idx_qa_inspection_scores_reviewed_by").on(table.reviewedBy),
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
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_qa_checklists_category").on(table.category),
  index("idx_qa_checklists_is_active").on(table.isActive),
  index("idx_qa_checklists_sort_order").on(table.sortOrder),
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
  avgScore: real("avg_score"),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  jobsReviewed: integer("jobs_reviewed").notNull().default(0),
  onTimeRate: real("on_time_rate"),
  firstPassRate: real("first_pass_rate"),
  customerSatisfaction: real("customer_satisfaction"),
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

// Scheduled Exports Table
export const scheduledExports = pgTable("scheduled_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  dataType: text("data_type", {
    enum: ["jobs", "financial", "equipment", "qa-scores", "analytics", "photos"]
  }).notNull(),
  format: text("format", {
    enum: ["csv", "xlsx", "pdf", "json"]
  }).notNull(),
  frequency: text("frequency", {
    enum: ["daily", "weekly", "monthly"]
  }).notNull(),
  time: text("time").notNull(), // Format: "HH:mm"
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly exports (0=Sunday)
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly exports
  recipients: jsonb("recipients").notNull(), // Array of email addresses
  options: jsonb("options"), // Export-specific options (filters, date ranges, etc.)
  enabled: boolean("enabled").default(true),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  failureLog: jsonb("failure_log"), // Array of {timestamp, error, attemptCount}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_scheduled_exports_user_id").on(table.userId),
  index("idx_scheduled_exports_user_enabled").on(table.userId, table.enabled),
  index("idx_scheduled_exports_frequency").on(table.frequency),
  index("idx_scheduled_exports_next_run").on(table.nextRun),
  index("idx_scheduled_exports_enabled_next_run").on(table.enabled, table.nextRun),
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
  creditAmount: real("credit_amount").default("0"),
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
  heatingLoad: real("heating_load"),
  coolingLoad: real("cooling_load"),
  annualEnergyUse: real("annual_energy_use"),
  percentSavings: real("percent_savings"),
  qualified: boolean("qualified").default(false),
  certificationDate: timestamp("certification_date"),
  blowerDoorACH50: real("blower_door_ach50"),
  ductLeakageCFM25: real("duct_leakage_cfm25"),
  hersIndex: integer("hers_index"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_unit_certifications_project_id").on(table.projectId),
  index("idx_unit_certifications_job_id").on(table.jobId),
  index("idx_unit_certifications_qualified").on(table.qualified),
]);

// Feature Flags table for Phase 0 Access Control
export const featureFlags = pgTable("feature_flags", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  featureName: varchar("feature_name").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPercentage: integer("rollout_percentage").notNull().default(0),
  enabledForUsers: jsonb("enabled_for_users").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_feature_flags_feature_name").on(table.featureName),
  index("idx_feature_flags_enabled").on(table.enabled),
]);

// System Configuration table for Phase 0 Access Control
export const systemConfig = pgTable("system_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index("idx_system_config_key").on(table.key),
  index("idx_system_config_updated_by").on(table.updatedBy),
]);

// WebAuthn credentials table for storing biometric authentication data
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text("credential_id").notNull().unique(), // Base64 encoded credential ID
  publicKey: text("public_key").notNull(), // Base64 encoded public key
  counter: integer("counter").notNull().default(0), // Signature counter for replay protection
  deviceName: text("device_name"), // User-friendly device name
  deviceType: text("device_type", { 
    enum: ["platform", "cross-platform", "unknown"] 
  }).notNull().default("unknown"),
  aaguid: text("aaguid"), // Authenticator Attestation GUID
  transports: text("transports").array(), // Available transports (usb, nfc, ble, internal)
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"), // For soft deletion
  revokedReason: text("revoked_reason"),
}, (table) => [
  index("idx_webauthn_credentials_user_id").on(table.userId),
  index("idx_webauthn_credentials_credential_id").on(table.credentialId),
  index("idx_webauthn_credentials_created_at").on(table.createdAt),
  index("idx_webauthn_credentials_last_used").on(table.lastUsedAt),
]);

// WebAuthn challenges table for tracking authentication attempts
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  challenge: text("challenge").notNull(), // Base64 encoded challenge
  type: text("type", { 
    enum: ["registration", "authentication"] 
  }).notNull(),
  verified: boolean("verified").default(false),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("idx_webauthn_challenges_user_id").on(table.userId),
  index("idx_webauthn_challenges_expires_at").on(table.expiresAt),
]);

// Background Jobs Tracking for Production Monitoring
export const backgroundJobs = pgTable("background_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobName: varchar("job_name").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  schedule: varchar("schedule"), // Cron expression
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  lastStatus: text("last_status", { enum: ["success", "failed", "running"] }),
  lastDuration: integer("last_duration_ms"),
  lastError: text("last_error"),
  nextRunAt: timestamp("next_run_at"),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  averageDuration: integer("average_duration_ms"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_background_jobs_job_name").on(table.jobName),
  index("idx_background_jobs_enabled").on(table.enabled),
  index("idx_background_jobs_last_run_at").on(table.lastRunAt),
  index("idx_background_jobs_last_status").on(table.lastStatus),
]);

// Background Job Execution History for Production Monitoring
export const backgroundJobExecutions = pgTable("background_job_executions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobName: varchar("job_name").notNull(),
  status: text("status", { enum: ["success", "failed", "running"] }).notNull(),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration_ms"),
  error: text("error"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_background_job_executions_job_name").on(table.jobName),
  index("idx_background_job_executions_status").on(table.status),
  index("idx_background_job_executions_started_at").on(table.startedAt),
  index("idx_background_job_executions_created_at").on(table.createdAt),
]);

// For Replit Auth upsert operations
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertBuilderSchema = createInsertSchema(builders).omit({ id: true, totalJobs: true, createdBy: true, createdAt: true });
export const insertBuilderContactSchema = createInsertSchema(builderContacts).omit({ id: true, createdBy: true, createdAt: true, isPrimary: true });
export const updateBuilderContactSchema = insertBuilderContactSchema.omit({ builderId: true }).partial();
export const insertBuilderAgreementSchema = createInsertSchema(builderAgreements).omit({ id: true, createdBy: true, createdAt: true, updatedAt: true }).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
});
export const updateBuilderAgreementSchema = insertBuilderAgreementSchema.omit({ builderId: true }).partial();
export const insertBuilderProgramSchema = createInsertSchema(builderPrograms).omit({ id: true, createdBy: true, createdAt: true }).extend({
  enrollmentDate: z.coerce.date(),
  expirationDate: z.coerce.date().nullable().optional(),
});
export const updateBuilderProgramSchema = insertBuilderProgramSchema.omit({ builderId: true }).partial();
export const insertBuilderInteractionSchema = createInsertSchema(builderInteractions).omit({ id: true, createdAt: true }).extend({
  interactionDate: z.coerce.date(),
  followUpDate: z.coerce.date().nullable().optional(),
});
export const updateBuilderInteractionSchema = insertBuilderInteractionSchema.omit({ builderId: true, createdBy: true }).partial();

export const insertConstructionManagerSchema = createInsertSchema(constructionManagers).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true
}).extend({
  email: z.string().email("Please enter a valid email address"),
});
export type InsertConstructionManager = z.infer<typeof insertConstructionManagerSchema>;
export type ConstructionManager = typeof constructionManagers.$inferSelect;

export const insertConstructionManagerCitySchema = createInsertSchema(constructionManagerCities).omit({
  id: true,
  createdAt: true,
}).extend({
  city: z.string().min(1, "City is required"),
  state: z.string().default('MN'),
});
export type InsertConstructionManagerCity = z.infer<typeof insertConstructionManagerCitySchema>;
export type ConstructionManagerCity = typeof constructionManagerCities.$inferSelect;

export const insertDevelopmentConstructionManagerSchema = createInsertSchema(developmentConstructionManagers).omit({
  id: true,
  assignedAt: true,
  assignedBy: true,
}).extend({
  developmentId: z.string().uuid("Invalid development ID"),
  constructionManagerId: z.string().uuid("Invalid construction manager ID"),
  isPrimary: z.boolean().default(false),
  coverageNotes: z.string().optional(),
});
export type InsertDevelopmentConstructionManager = z.infer<typeof insertDevelopmentConstructionManagerSchema>;
export type DevelopmentConstructionManager = typeof developmentConstructionManagers.$inferSelect;

export const insertPendingCalendarEventSchema = createInsertSchema(pendingCalendarEvents).omit({ 
  id: true, 
  importedAt: true, 
  processedAt: true 
}).extend({
  eventDate: z.coerce.date(),
  confidenceScore: z.number().min(0).max(100).optional(),
});
export const insertDevelopmentSchema = createInsertSchema(developments).omit({ id: true, createdBy: true, createdAt: true }).extend({
  startDate: z.coerce.date().nullable().optional(),
  targetCompletionDate: z.coerce.date().nullable().optional(),
});
export const updateDevelopmentSchema = insertDevelopmentSchema.omit({ builderId: true }).partial();
export const insertLotSchema = createInsertSchema(lots).omit({ id: true, createdBy: true, createdAt: true }).extend({
  squareFootage: z.coerce.number().nullable().optional(),
});
export const updateLotSchema = insertLotSchema.omit({ developmentId: true }).partial();
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, createdAt: true }).extend({
  floorArea: z.coerce.number().nullable().optional(),
  surfaceArea: z.coerce.number().nullable().optional(),
  houseVolume: z.coerce.number().nullable().optional(),
  stories: z.coerce.number().nullable().optional(),
});

export const insertPlanOptionalFeatureSchema = createInsertSchema(planOptionalFeatures).omit({ 
  id: true, 
  createdAt: true 
}).extend({
  floorAreaDelta: z.coerce.number().min(0, "Floor area delta must be >= 0").nullable().optional(),
  volumeDelta: z.coerce.number().min(0, "Volume delta must be >= 0").nullable().optional(),
}).refine(
  (data) => {
    if (data.impactsFloorArea && (!data.floorAreaDelta || data.floorAreaDelta <= 0)) {
      return false;
    }
    if (data.impactsVolume && (!data.volumeDelta || data.volumeDelta <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: "When a feature impacts floor area or volume, the corresponding delta must be greater than 0",
  }
);
export type InsertPlanOptionalFeature = z.infer<typeof insertPlanOptionalFeatureSchema>;
export type PlanOptionalFeature = typeof planOptionalFeatures.$inferSelect;

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
  selectedOptionalFeatures: z.array(z.string().uuid()).optional().default([]),
  adjustedFloorArea: z.coerce.number().nullable().optional(),
  adjustedVolume: z.coerce.number().nullable().optional(),
  adjustedSurfaceArea: z.coerce.number().nullable().optional(),
});
export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({ id: true }).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  lastSyncedAt: z.coerce.date().nullable().optional(),
});
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true }).extend({
  date: z.coerce.date(),
  amount: z.union([z.string(), z.number()]).pipe(z.coerce.string()),
  ocrDate: z.coerce.date().nullable().optional(),
  ocrAmount: z.union([z.string(), z.number()]).pipe(z.coerce.string()).nullable().optional(),
  ocrConfidence: z.union([z.string(), z.number()]).pipe(z.coerce.string()).nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  gpsLatitude: z.coerce.number().nullable().optional(),
  gpsLongitude: z.coerce.number().nullable().optional(),
});
export const insertMileageLogSchema = createInsertSchema(mileageLogs).omit({ id: true }).extend({
  date: z.coerce.date(),
  startTimestamp: z.coerce.date().nullable().optional(),
  endTimestamp: z.coerce.date().nullable().optional(),
});
export const insertMileageRoutePointSchema = createInsertSchema(mileageRoutePoints).omit({ id: true }).extend({
  timestamp: z.coerce.date(),
});
export const autoTripSchema = z.object({
  purpose: z.enum(['business', 'personal']),
  jobId: z.string().optional().nullable(),
  tripId: z.string(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  distanceMeters: z.number().positive(),
  durationSeconds: z.number().nonnegative(),
  points: z.array(z.object({
    timestamp: z.coerce.date(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    speed: z.number().nonnegative().nullable().optional(),
    accuracy: z.number().nonnegative().nullable().optional(),
    source: z.enum(['gps', 'network', 'cached']).optional(),
  })).min(1),
});
// Report template schemas
export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  publishedAt: z.coerce.date().nullable().optional(),
});
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
  valueNumber: z.coerce.number().nullable().optional(),
  valueDate: z.coerce.date().nullable().optional(),
  valueDatetime: z.coerce.date().nullable().optional(),
});
export const insertForecastSchema = createInsertSchema(forecasts).omit({ id: true }).extend({
  recordedAt: z.coerce.date().nullable().optional(),
  cfm50: z.coerce.number().nullable().optional(),
  houseVolume: z.coerce.number().nullable().optional(),
  houseSurfaceArea: z.coerce.number().nullable().optional(),
  actualTdl: z.coerce.number().nullable().optional(),
  actualDlo: z.coerce.number().nullable().optional(),
  actualAch50: z.coerce.number().nullable().optional(),
  outdoorTemp: z.coerce.number().nullable().optional(),
  indoorTemp: z.coerce.number().nullable().optional(),
  windSpeed: z.coerce.number().nullable().optional(),
  predictedTdl: z.coerce.number().nullable().optional(),
  predictedDlo: z.coerce.number().nullable().optional(),
  predictedAch50: z.coerce.number().nullable().optional(),
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
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, ts: true });
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, timestamp: true, actorId: true }); // actorId injected server-side from req.user.id
export const insertGoldenPathResultSchema = createInsertSchema(goldenPathResults).omit({ id: true, executedAt: true });
export const insertAccessibilityAuditResultSchema = createInsertSchema(accessibilityAuditResults).omit({ id: true, auditedAt: true });

// Useful insert type exports for services
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({ id: true, measuredAt: true });
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
// Financial schemas
export const insertBuilderRateCardSchema = createInsertSchema(builderRateCards).omit({ id: true, createdAt: true }).extend({
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  baseRate: z.coerce.number(),
  volumeDiscount: z.coerce.number().nullable().optional(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true }).extend({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  sentAt: z.coerce.date().nullable().optional(),
  paidAt: z.coerce.date().nullable().optional(),
  subtotal: z.coerce.number(),
  tax: z.coerce.number().nullable().optional(),
  total: z.coerce.number(),
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({ id: true }).extend({
  unitPrice: z.coerce.number(),
  lineTotal: z.coerce.number(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true }).extend({
  paymentDate: z.coerce.date(),
  amount: z.coerce.number(),
});

export const insertArSnapshotSchema = createInsertSchema(arSnapshots).omit({ id: true }).extend({
  snapshotDate: z.coerce.date(),
  current: z.coerce.number(),
  days30: z.coerce.number(),
  days60: z.coerce.number(),
  days90Plus: z.coerce.number(),
  totalAR: z.coerce.number(),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({ id: true, createdAt: true });

export const insertExpenseRuleSchema = createInsertSchema(expenseRules).omit({ id: true, createdAt: true }).extend({
  maxAutoApproveAmount: z.coerce.number().nullable().optional(),
});

export const insertJobCostLedgerSchema = createInsertSchema(jobCostLedger).omit({ id: true, recordedAt: true }).extend({
  amount: z.coerce.number(),
});

export const insertMileageRateHistorySchema = createInsertSchema(mileageRateHistory).omit({ id: true, createdAt: true }).extend({
  effectiveDate: z.coerce.date(),
  ratePerMile: z.coerce.number(),
});

export const insertMultifamilyProgramSchema = createInsertSchema(multifamilyPrograms).omit({ id: true, createdAt: true }).extend({
  effectiveDate: z.coerce.date(),
});

export const insertComplianceArtifactSchema = createInsertSchema(complianceArtifacts).omit({ id: true, uploadedAt: true });

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

// WebAuthn Insert Schemas
export const insertWebauthnCredentialSchema = createInsertSchema(webauthnCredentials).omit({ 
  id: true, 
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true 
}).extend({
  counter: z.coerce.number().default(0),
});

export const insertWebauthnChallengeSchema = createInsertSchema(webauthnChallenges).omit({ 
  id: true, 
  createdAt: true 
}).extend({
  expiresAt: z.coerce.date(),
  verified: z.boolean().default(false),
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

export const insertScheduledExportSchema = createInsertSchema(scheduledExports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRun: true,
  nextRun: true,
  failureLog: true,
}).extend({
  recipients: z.array(z.string().email()),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format"),
  dayOfWeek: z.number().min(0).max(6).nullable().optional(),
  dayOfMonth: z.number().min(1).max(31).nullable().optional(),
});

// Inspector Assignment Insert Schemas
export const insertInspectorWorkloadSchema = createInsertSchema(inspectorWorkload).omit({ 
  id: true, 
  updatedAt: true 
}).extend({
  date: z.coerce.date(),
  jobCount: z.coerce.number().default(0),
  scheduledMinutes: z.coerce.number().default(0),
  lastJobLatitude: z.coerce.number().nullable().optional(),
  lastJobLongitude: z.coerce.number().nullable().optional(),
});

export const insertAssignmentHistorySchema = createInsertSchema(assignmentHistory).omit({ 
  id: true, 
  assignedAt: true 
});

export const insertInspectorPreferencesSchema = createInsertSchema(inspectorPreferences).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
}).extend({
  maxDailyJobs: z.coerce.number().default(5),
  maxWeeklyJobs: z.coerce.number().default(25),
  vehicleRange: z.coerce.number().nullable().optional(),
  homeBaseLatitude: z.coerce.number().nullable().optional(),
  homeBaseLongitude: z.coerce.number().nullable().optional(),
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

export const insertVentilationTestSchema = createInsertSchema(ventilationTests).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  testDate: z.coerce.date(),
  equipmentCalibrationDate: z.coerce.date().nullable().optional(),
  floorArea: z.coerce.number(),
  bedrooms: z.coerce.number(),
  stories: z.coerce.number().nullable().optional(),
  requiredVentilationRate: z.coerce.number().nullable().optional(),
  requiredContinuousRate: z.coerce.number().nullable().optional(),
  infiltrationCredit: z.coerce.number().nullable().optional(),
  adjustedRequiredRate: z.coerce.number().nullable().optional(),
  kitchenRatedCFM: z.coerce.number().nullable().optional(),
  kitchenMeasuredCFM: z.coerce.number().nullable().optional(),
  bathroom1RatedCFM: z.coerce.number().nullable().optional(),
  bathroom1MeasuredCFM: z.coerce.number().nullable().optional(),
  bathroom2RatedCFM: z.coerce.number().nullable().optional(),
  bathroom2MeasuredCFM: z.coerce.number().nullable().optional(),
  bathroom3RatedCFM: z.coerce.number().nullable().optional(),
  bathroom3MeasuredCFM: z.coerce.number().nullable().optional(),
  bathroom4RatedCFM: z.coerce.number().nullable().optional(),
  bathroom4MeasuredCFM: z.coerce.number().nullable().optional(),
  mechanicalRatedCFM: z.coerce.number().nullable().optional(),
  mechanicalMeasuredSupplyCFM: z.coerce.number().nullable().optional(),
  mechanicalMeasuredExhaustCFM: z.coerce.number().nullable().optional(),
  totalVentilationProvided: z.coerce.number().nullable().optional(),
});

// Feature Flags and System Config insert schemas
export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({ 
  id: true, 
  updatedAt: true 
});

// Background Jobs insert schemas
export const insertBackgroundJobSchema = createInsertSchema(backgroundJobs).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  successCount: true,
  failureCount: true,
  averageDuration: true,
});

export const insertBackgroundJobExecutionSchema = createInsertSchema(backgroundJobExecutions).omit({ 
  id: true, 
  createdAt: true 
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

// Extract UserRole type from database enum - this is the source of truth
export type UserRole = typeof users.role.enumValues[number];
export type Builder = typeof builders.$inferSelect;
export type BuilderContact = typeof builderContacts.$inferSelect;
export type BuilderAgreement = typeof builderAgreements.$inferSelect;
export type BuilderProgram = typeof builderPrograms.$inferSelect;
export type BuilderInteraction = typeof builderInteractions.$inferSelect;
export type PendingCalendarEvent = typeof pendingCalendarEvents.$inferSelect;
export type Development = typeof developments.$inferSelect;
export type Lot = typeof lots.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Job = typeof jobs.$inferSelect;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type MileageLog = typeof mileageLogs.$inferSelect;
export type MileageRoutePoint = typeof mileageRoutePoints.$inferSelect;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
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
export type InsertPendingCalendarEvent = z.infer<typeof insertPendingCalendarEventSchema>;
export type InsertDevelopment = z.infer<typeof insertDevelopmentSchema>;
export type UpdateDevelopment = z.infer<typeof updateDevelopmentSchema>;
export type InsertLot = z.infer<typeof insertLotSchema>;
export type UpdateLot = z.infer<typeof updateLotSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertMileageLog = z.infer<typeof insertMileageLogSchema>;
export type InsertMileageRoutePoint = z.infer<typeof insertMileageRoutePointSchema>;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
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
export type InspectorWorkload = typeof inspectorWorkload.$inferSelect;
export type InsertInspectorWorkload = z.infer<typeof insertInspectorWorkloadSchema>;
export type AssignmentHistory = typeof assignmentHistory.$inferSelect;
export type InsertAssignmentHistory = z.infer<typeof insertAssignmentHistorySchema>;
export type InspectorPreferences = typeof inspectorPreferences.$inferSelect;
export type InsertInspectorPreferences = z.infer<typeof insertInspectorPreferencesSchema>;
export type EmailPreference = typeof emailPreferences.$inferSelect;
export type InsertEmailPreference = z.infer<typeof insertEmailPreferenceSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type GoldenPathResult = typeof goldenPathResults.$inferSelect;
export type InsertGoldenPathResult = z.infer<typeof insertGoldenPathResultSchema>;
export type AccessibilityAuditResult = typeof accessibilityAuditResults.$inferSelect;
export type InsertAccessibilityAuditResult = z.infer<typeof insertAccessibilityAuditResultSchema>;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type BlowerDoorTest = typeof blowerDoorTests.$inferSelect;
export type InsertBlowerDoorTest = z.infer<typeof insertBlowerDoorTestSchema>;
export type DuctLeakageTest = typeof ductLeakageTests.$inferSelect;
export type InsertDuctLeakageTest = z.infer<typeof insertDuctLeakageTestSchema>;
export type VentilationTest = typeof ventilationTests.$inferSelect;
export type InsertVentilationTest = z.infer<typeof insertVentilationTestSchema>;

// Financial types
export type BuilderRateCard = typeof builderRateCards.$inferSelect;
export type InsertBuilderRateCard = z.infer<typeof insertBuilderRateCardSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type ArSnapshot = typeof arSnapshots.$inferSelect;
export type InsertArSnapshot = z.infer<typeof insertArSnapshotSchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseRule = typeof expenseRules.$inferSelect;
export type InsertExpenseRule = z.infer<typeof insertExpenseRuleSchema>;
export type JobCostLedger = typeof jobCostLedger.$inferSelect;
export type InsertJobCostLedger = z.infer<typeof insertJobCostLedgerSchema>;
export type MileageRateHistory = typeof mileageRateHistory.$inferSelect;
export type InsertMileageRateHistory = z.infer<typeof insertMileageRateHistorySchema>;
export type MultifamilyProgram = typeof multifamilyPrograms.$inferSelect;
export type InsertMultifamilyProgram = z.infer<typeof insertMultifamilyProgramSchema>;
export type ComplianceArtifact = typeof complianceArtifacts.$inferSelect;
export type InsertComplianceArtifact = z.infer<typeof insertComplianceArtifactSchema>;
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

// Organization types
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertOrganizationUserSchema = createInsertSchema(organizationUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertOrganizationSettingSchema = createInsertSchema(organizationSettings).omit({
  id: true,
  updatedAt: true
});

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  token: true,
  createdAt: true
});

export type Organization = typeof organizations.$inferSelect;
export type OrganizationUser = typeof organizationUsers.$inferSelect;
export type OrganizationSetting = typeof organizationSettings.$inferSelect;
export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertOrganizationUser = z.infer<typeof insertOrganizationUserSchema>;
export type InsertOrganizationSetting = z.infer<typeof insertOrganizationSettingSchema>;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;

// Job Type Config Schemas
export const insertJobTypeConfigSchema = createInsertSchema(jobTypeConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateJobTypeConfigSchema = insertJobTypeConfigSchema.partial();

export type JobTypeConfig = typeof jobTypeConfig.$inferSelect;
export type InsertJobTypeConfig = z.infer<typeof insertJobTypeConfigSchema>;
export type UpdateJobTypeConfig = z.infer<typeof updateJobTypeConfigSchema>;

export type EquipmentCheckout = typeof equipmentCheckouts.$inferSelect;
export type InsertEquipmentCheckout = z.infer<typeof insertEquipmentCheckoutSchema>;

// Notification Types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;

// Scheduled Export Schemas
export const updateScheduledExportSchema = insertScheduledExportSchema.omit({
  userId: true,
}).partial();

// Scheduled Export Types
export type ScheduledExport = typeof scheduledExports.$inferSelect;
export type InsertScheduledExport = z.infer<typeof insertScheduledExportSchema>;
export type UpdateScheduledExport = z.infer<typeof updateScheduledExportSchema>;

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

// Feature Flag and System Config Types
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

// WebAuthn Types
export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebauthnCredential = z.infer<typeof insertWebauthnCredentialSchema>;
export type WebauthnChallenge = typeof webauthnChallenges.$inferSelect;
export type InsertWebauthnChallenge = z.infer<typeof insertWebauthnChallengeSchema>;

// Background Jobs Types
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = z.infer<typeof insertBackgroundJobSchema>;
export type BackgroundJobExecution = typeof backgroundJobExecutions.$inferSelect;
export type InsertBackgroundJobExecution = z.infer<typeof insertBackgroundJobExecutionSchema>;

export interface CalendarImportLogsResponse {
  logs: CalendarImportLog[];
  total: number;
  limit: number;
  offset: number;
}
