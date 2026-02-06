-- ============================================================================
-- Baseline Migration: Full Schema for AuditForecaster
-- Generated: 2026-02-06
-- Provider: SQLite
--
-- This baseline captures the COMPLETE current schema state.
-- All prior incremental migrations (which were PostgreSQL-dialect and
-- incomplete due to heavy use of `db push`) are superseded by this file.
-- ============================================================================

-- Disable FK checks during table creation to allow any ordering
PRAGMA foreign_keys=OFF;

-- ============================================================================
-- TIER 0: Tables with no foreign key dependencies
-- ============================================================================

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,

    PRIMARY KEY ("identifier", "token")
);

-- CreateTable
CREATE TABLE "Builder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contactInfo" TEXT,
    "paymentTerms" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "structure" TEXT,
    "scoring" TEXT,
    "checklistItems" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CorporateDoc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subcontractor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "taxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "changes" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "jobId" TEXT,
    "request" TEXT,
    "response" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ekotropeApiKey" TEXT,
    "ekotropeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "supplyProApiKey" TEXT,
    "supplyProEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoCreateJobsFromBuildPro" BOOLEAN NOT NULL DEFAULT true,
    "autoSyncToEkotrope" BOOLEAN NOT NULL DEFAULT true,
    "autoGenerateHERSCerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- ============================================================================
-- TIER 1: Tables depending only on Tier 0
-- ============================================================================

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'INSPECTOR',
    "passwordHash" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "baseRate" REAL,
    "googleCalendarId" TEXT,
    "nextSyncToken" TEXT,
    "watchResourceId" TEXT,
    "watchExpiration" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "builderId" TEXT,
    "hersRaterId" TEXT,
    CONSTRAINT "User_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Builder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subdivision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "builderId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subdivision_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Builder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pdfUrl" TEXT,
    "builderId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Builder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" REAL NOT NULL,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "sentAt" DATETIME,
    "paidAt" DATETIME,
    "builderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Builder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceDoc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expirationDate" DATETIME,
    "subcontractorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ComplianceDoc_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- TIER 2: Tables depending on User (and possibly Tier 0/1)
-- ============================================================================

-- CreateTable
CREATE TABLE "OnboardingChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uniformIssued" BOOLEAN NOT NULL DEFAULT false,
    "ipadIssued" BOOLEAN NOT NULL DEFAULT false,
    "badgePrinted" BOOLEAN NOT NULL DEFAULT false,
    "trainingComplete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OnboardingChecklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "issuedDate" DATETIME,
    "expirationDate" DATETIME,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Certification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("provider", "providerAccountId"),
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "lastUsed" DATETIME,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalDistance" REAL,
    "totalDuration" INTEGER,
    "driverId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Route_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vin" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastService" DATETIME,
    "nextService" DATETIME,
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastCalibration" DATETIME,
    "nextCalibration" DATETIME,
    "purchasePrice" REAL,
    "purchaseDate" DATETIME,
    "assignedTo" TEXT,
    "calibrationCertUrl" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "builderId" TEXT,
    "subdivisionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceList_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Builder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceList_subdivisionId_fkey" FOREIGN KEY ("subdivisionId") REFERENCES "Subdivision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================================
-- TIER 3: Tables depending on Tier 2
-- ============================================================================

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "description" TEXT,
    "mileage" INTEGER,
    "vehicleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipmentAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" DATETIME,
    "notes" TEXT,
    CONSTRAINT "EquipmentAssignment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EquipmentAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotNumber" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledDate" DATETIME,
    "rejectionReason" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "googleEventId" TEXT,
    "googleHtmlLink" TEXT,
    "googleAlbumId" TEXT,
    "googleAlbumUrl" TEXT,
    "buildProOrderId" TEXT,
    "buildProSyncedAt" DATETIME,
    "ekotropeProjectId" TEXT,
    "ekotropeSyncedAt" DATETIME,
    "hersScore" INTEGER,
    "hersCertUrl" TEXT,
    "inspectorId" TEXT,
    "builderId" TEXT,
    "subdivisionId" TEXT,
    "payoutId" TEXT,
    "payoutAmount" REAL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_builderId_fkey" FOREIGN KEY ("builderId") REFERENCES "Builder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_subdivisionId_fkey" FOREIGN KEY ("subdivisionId") REFERENCES "Subdivision" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "priceListId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceListItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================================
-- TIER 4: Tables depending on Job (and other Tier 3)
-- ============================================================================

-- CreateTable
CREATE TABLE "TaxCredit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "creditAmount" REAL NOT NULL,
    "certificationDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxCredit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BLOWER_DOOR',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "score" REAL,
    "maxScore" REAL,
    "answers" TEXT,
    "metadata" TEXT,
    "data" TEXT NOT NULL,
    "checklist" TEXT,
    "signatureUrl" TEXT,
    "reportTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inspection_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_reportTemplateId_fkey" FOREIGN KEY ("reportTemplateId") REFERENCES "ReportTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "rejectionReason" TEXT,
    "receiptUrl" TEXT,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MileageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "distance" REAL NOT NULL,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startLocation" TEXT,
    "endLocation" TEXT,
    "vehicleId" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MileageLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MileageLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL,
    "estimatedArrival" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "routeId" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RouteStop_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================================
-- TIER 5: Tables depending on Inspection
-- ============================================================================

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "takenAt" DATETIME,
    "inspectionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Photo_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "inspectionId" TEXT NOT NULL,
    "assignedToEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- UNIQUE INDEXES (from @unique field-level attributes)
-- ============================================================================

-- User
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- OnboardingChecklist
CREATE UNIQUE INDEX "OnboardingChecklist_userId_key" ON "OnboardingChecklist"("userId");

-- TaxCredit
CREATE UNIQUE INDEX "TaxCredit_jobId_key" ON "TaxCredit"("jobId");

-- Vehicle
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");

-- Equipment
CREATE UNIQUE INDEX "Equipment_serialNumber_key" ON "Equipment"("serialNumber");

-- Session
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- PriceListItem (composite unique)
CREATE UNIQUE INDEX "PriceListItem_priceListId_serviceItemId_key" ON "PriceListItem"("priceListId", "serviceItemId");

-- Job
CREATE UNIQUE INDEX "Job_googleEventId_key" ON "Job"("googleEventId");
CREATE UNIQUE INDEX "Job_buildProOrderId_key" ON "Job"("buildProOrderId");

-- Invoice
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- ApiKey
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- TaskClaim
CREATE UNIQUE INDEX "TaskClaim_taskId_key" ON "TaskClaim"("taskId");

-- ============================================================================
-- PERFORMANCE INDEXES (from @@index model-level attributes)
-- ============================================================================

-- User indexes
CREATE INDEX "User_builderId_idx" ON "User"("builderId");

-- Certification indexes
CREATE INDEX "Certification_userId_idx" ON "Certification"("userId");

-- Vehicle indexes
CREATE INDEX "Vehicle_assignedTo_idx" ON "Vehicle"("assignedTo");
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- VehicleMaintenance indexes
CREATE INDEX "VehicleMaintenance_vehicleId_idx" ON "VehicleMaintenance"("vehicleId");
CREATE INDEX "VehicleMaintenance_date_idx" ON "VehicleMaintenance"("date");

-- SavedReport indexes
CREATE INDEX "SavedReport_userId_idx" ON "SavedReport"("userId");

-- Equipment indexes
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");
CREATE INDEX "Equipment_assignedTo_idx" ON "Equipment"("assignedTo");

-- EquipmentAssignment indexes
CREATE INDEX "EquipmentAssignment_equipmentId_idx" ON "EquipmentAssignment"("equipmentId");
CREATE INDEX "EquipmentAssignment_userId_idx" ON "EquipmentAssignment"("userId");

-- Account indexes
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- Session indexes
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- Subdivision indexes
CREATE INDEX "Subdivision_builderId_idx" ON "Subdivision"("builderId");

-- Plan indexes
CREATE INDEX "Plan_builderId_idx" ON "Plan"("builderId");

-- PriceList indexes
CREATE INDEX "PriceList_builderId_idx" ON "PriceList"("builderId");
CREATE INDEX "PriceList_subdivisionId_idx" ON "PriceList"("subdivisionId");

-- PriceListItem indexes
CREATE INDEX "PriceListItem_priceListId_idx" ON "PriceListItem"("priceListId");
CREATE INDEX "PriceListItem_serviceItemId_idx" ON "PriceListItem"("serviceItemId");

-- Job indexes
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Job_inspectorId_idx" ON "Job"("inspectorId");
CREATE INDEX "Job_builderId_idx" ON "Job"("builderId");
CREATE INDEX "Job_subdivisionId_idx" ON "Job"("subdivisionId");
CREATE INDEX "Job_payoutId_idx" ON "Job"("payoutId");
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");
CREATE INDEX "Job_scheduledDate_idx" ON "Job"("scheduledDate");
CREATE INDEX "Job_lotNumber_idx" ON "Job"("lotNumber");
CREATE INDEX "Job_streetAddress_idx" ON "Job"("streetAddress");

-- Inspection indexes
CREATE INDEX "Inspection_status_idx" ON "Inspection"("status");
CREATE INDEX "Inspection_jobId_idx" ON "Inspection"("jobId");
CREATE INDEX "Inspection_reportTemplateId_idx" ON "Inspection"("reportTemplateId");
CREATE INDEX "Inspection_createdAt_idx" ON "Inspection"("createdAt");

-- Photo indexes
CREATE INDEX "Photo_inspectionId_idx" ON "Photo"("inspectionId");

-- ActionItem indexes
CREATE INDEX "ActionItem_inspectionId_idx" ON "ActionItem"("inspectionId");
CREATE INDEX "ActionItem_status_idx" ON "ActionItem"("status");

-- Expense indexes
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
CREATE INDEX "Expense_jobId_idx" ON "Expense"("jobId");
CREATE INDEX "Expense_status_idx" ON "Expense"("status");
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- MileageLog indexes
CREATE INDEX "MileageLog_vehicleId_idx" ON "MileageLog"("vehicleId");
CREATE INDEX "MileageLog_jobId_idx" ON "MileageLog"("jobId");
CREATE INDEX "MileageLog_status_idx" ON "MileageLog"("status");

-- ComplianceDoc indexes
CREATE INDEX "ComplianceDoc_subcontractorId_idx" ON "ComplianceDoc"("subcontractorId");

-- Invoice indexes
CREATE INDEX "Invoice_builderId_idx" ON "Invoice"("builderId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_date_idx" ON "Invoice"("date");
CREATE INDEX "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");

-- InvoiceItem indexes
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX "InvoiceItem_jobId_idx" ON "InvoiceItem"("jobId");

-- SystemLog indexes
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");
CREATE INDEX "SystemLog_userId_idx" ON "SystemLog"("userId");

-- ApiKey indexes
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- AuditLog indexes
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- Payout indexes
CREATE INDEX "Payout_userId_idx" ON "Payout"("userId");
CREATE INDEX "Payout_status_idx" ON "Payout"("status");
CREATE INDEX "Payout_periodStart_idx" ON "Payout"("periodStart");
CREATE INDEX "Payout_periodEnd_idx" ON "Payout"("periodEnd");

-- Route indexes
CREATE INDEX "Route_driverId_idx" ON "Route"("driverId");
CREATE INDEX "Route_date_idx" ON "Route"("date");
CREATE INDEX "Route_status_idx" ON "Route"("status");

-- RouteStop indexes
CREATE INDEX "RouteStop_routeId_idx" ON "RouteStop"("routeId");
CREATE INDEX "RouteStop_jobId_idx" ON "RouteStop"("jobId");

-- IntegrationLog indexes
CREATE INDEX "IntegrationLog_jobId_idx" ON "IntegrationLog"("jobId");
CREATE INDEX "IntegrationLog_createdAt_idx" ON "IntegrationLog"("createdAt");

-- TaskClaim indexes
CREATE INDEX "TaskClaim_expiresAt_idx" ON "TaskClaim"("expiresAt");
CREATE INDEX "TaskClaim_userId_idx" ON "TaskClaim"("userId");

-- Re-enable foreign key enforcement
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
