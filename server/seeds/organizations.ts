import { db } from "../db";
import { organizations, organizationUsers, organizationSettings, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { serverLogger } from "../logger";

export async function seedOrganizations() {
  try {
    serverLogger.info("[Seed] Starting organization setup...");

    // Check if organization already exists
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.name, "Ulrich Energy Auditing"),
    });

    if (existingOrg) {
      serverLogger.info("[Seed] Organization already exists, skipping creation");
      return;
    }

    // Create the default organization
    const [org] = await db.insert(organizations).values({
      name: "Ulrich Energy Auditing",
      primaryContactEmail: "admin@ulrichenergyauditing.com",
      resnetCertification: "RESNET-2024-001",
      serviceAreas: ["Minneapolis", "St. Paul", "Bloomington", "Eden Prairie", "Edina", "Minnetonka"],
      phone: "(612) 555-0100",
      address: "123 Energy Way, Minneapolis, MN 55401",
    }).returning();

    serverLogger.info(`[Seed] Created organization: ${org.name}`);

    // Link existing users to the organization
    const allUsers = await db.query.users.findMany();

    for (const user of allUsers) {
      let role: "owner" | "admin" | "inspector" | "contractor" = "inspector";
      
      // Set role based on existing user role
      if (user.role === "admin") {
        // First admin becomes owner
        const existingOwner = await db.query.organizationUsers.findFirst({
          where: and(
            eq(organizationUsers.organizationId, org.id),
            eq(organizationUsers.role, "owner")
          ),
        });
        
        role = existingOwner ? "admin" : "owner";
      } else if (user.role === "partner_contractor") {
        role = "contractor";
      }

      await db.insert(organizationUsers).values({
        organizationId: org.id,
        userId: user.id,
        role,
        permissions: generateDefaultPermissions(role),
        status: "active",
        joinedAt: new Date(),
      });

      serverLogger.info(`[Seed] Linked user ${user.email} as ${role}`);
    }

    // Create default organization settings
    const defaultSettings = [
      // Financial settings
      { category: "financial", key: "payment_terms", value: 30 },
      { category: "financial", key: "late_fee_percentage", value: 1.5 },
      { category: "financial", key: "mileage_rate", value: 0.65 },
      { category: "financial", key: "price_sv2", value: 350 },
      { category: "financial", key: "price_full_test", value: 500 },
      { category: "financial", key: "price_code_bdoor", value: 175 },
      { category: "financial", key: "price_rough_duct", value: 200 },
      { category: "financial", key: "require_receipts", value: true },
      { category: "financial", key: "auto_approve_mileage", value: true },
      
      // Workflow settings
      { category: "workflow", key: "sv2_checklist_count", value: 25 },
      { category: "workflow", key: "full_test_checklist_count", value: 45 },
      { category: "workflow", key: "min_photos_per_inspection", value: 10 },
      { category: "workflow", key: "require_photo_geotagging", value: false },
      { category: "workflow", key: "ach50_threshold", value: 3.0 },
      { category: "workflow", key: "cfm25_per_ton", value: 4 },
      { category: "workflow", key: "auto_generate_report", value: true },
      { category: "workflow", key: "auto_send_report", value: false },
      { category: "workflow", key: "require_supervisor_review", value: true },
      
      // Integration settings
      { category: "integration", key: "auto_import_events", value: true },
      { category: "integration", key: "webhook_job.completed", value: false },
      { category: "integration", key: "webhook_report.generated", value: false },
      { category: "integration", key: "webhook_invoice.created", value: false },
      { category: "integration", key: "webhook_payment.received", value: false },
      { category: "integration", key: "daily_export_time", value: "disabled" },
      { category: "integration", key: "weekly_invoice_export", value: "disabled" },
      
      // Security settings
      { category: "security", key: "min_password_length", value: 8 },
      { category: "security", key: "require_uppercase", value: true },
      { category: "security", key: "require_numbers", value: true },
      { category: "security", key: "require_special_chars", value: false },
      { category: "security", key: "session_timeout_minutes", value: 60 },
      { category: "security", key: "max_concurrent_sessions", value: 3 },
      { category: "security", key: "require_2fa", value: false },
      { category: "security", key: "require_2fa_admins", value: true },
      { category: "security", key: "audit_log_retention_days", value: 365 },
      { category: "security", key: "job_data_retention_years", value: 7 },
      { category: "security", key: "photo_archive_days", value: 90 },
      { category: "security", key: "enable_ip_whitelist", value: false },
      
      // Notification settings
      { category: "notification", key: "email_job_assigned", value: true },
      { category: "notification", key: "email_report_ready", value: true },
      { category: "notification", key: "email_invoice_created", value: true },
      { category: "notification", key: "email_payment_received", value: true },
      { category: "notification", key: "sms_enabled", value: false },
      { category: "notification", key: "daily_digest_enabled", value: true },
      { category: "notification", key: "weekly_summary_enabled", value: true },
    ];

    // Get the first admin/owner to set as updatedBy
    const adminUser = allUsers.find(u => u.role === "admin");
    
    for (const setting of defaultSettings) {
      await db.insert(organizationSettings).values({
        organizationId: org.id,
        category: setting.category as any,
        key: setting.key,
        value: setting.value,
        updatedBy: adminUser?.id,
      });
    }

    serverLogger.info("[Seed] Created default organization settings");
    serverLogger.info("[Seed] Organization setup completed successfully");

  } catch (error) {
    serverLogger.error("[Seed] Failed to seed organizations:", error);
    throw error;
  }
}

function generateDefaultPermissions(role: "owner" | "admin" | "inspector" | "contractor") {
  const permissions: Record<string, boolean> = {
    manage_jobs: false,
    view_financial: false,
    manage_users: false,
    export_data: false,
    delete_data: false,
    manage_settings: false,
    view_reports: false,
    create_invoices: false,
    manage_builders: false,
    manage_equipment: false,
  };

  switch (role) {
    case "owner":
      // Owners have all permissions
      Object.keys(permissions).forEach(key => permissions[key] = true);
      break;
    case "admin":
      // Admins have most permissions except critical ones
      permissions.manage_jobs = true;
      permissions.view_financial = true;
      permissions.manage_users = true;
      permissions.export_data = true;
      permissions.manage_settings = true;
      permissions.view_reports = true;
      permissions.create_invoices = true;
      permissions.manage_builders = true;
      permissions.manage_equipment = true;
      break;
    case "inspector":
      // Inspectors have job-related permissions
      permissions.manage_jobs = true;
      permissions.view_reports = true;
      permissions.export_data = true;
      permissions.manage_equipment = true;
      break;
    case "contractor":
      // Contractors have limited permissions
      permissions.view_reports = true;
      break;
  }

  return permissions;
}