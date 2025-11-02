/**
 * Seed data for Report Templates
 * Creates realistic sample templates for development and testing
 */

import { storage } from '../storage';
import { serverLogger } from '../logger';
import { db } from '../db';

/**
 * Sample Pre-Drywall Inspection Template
 * This is a production-quality template showing the full structure
 */
const preDrywallTemplate = {
  name: "Pre-Drywall Inspection (RESNET)",
  description: "Comprehensive pre-drywall inspection template for RESNET-certified energy audits. Captures insulation, air sealing, thermal bypasses, and HVAC rough-in details.",
  category: "Inspection",
  inspectionType: "Pre-Drywall" as const,
  version: 1,
  status: "published" as const,
  isActive: true,
  components: [
    // Section 1: Property Information
    {
      id: "prop-info",
      type: "section",
      label: "Property Information",
      properties: {
        description: "Basic property details and scope",
        collapsible: false
      }
    },
    {
      id: "address",
      type: "text",
      label: "Property Address",
      properties: {
        required: true,
        placeholder: "123 Main St, Minneapolis, MN 55401"
      }
    },
    {
      id: "builder-name",
      type: "text",
      label: "Builder Name",
      properties: {
        required: true
      }
    },
    {
      id: "lot-number",
      type: "text",
      label: "Lot Number",
      properties: {
        required: false
      }
    },
    {
      id: "inspection-date",
      type: "date",
      label: "Inspection Date",
      properties: {
        required: true
      }
    },
    
    // Section 2: Insulation Details
    {
      id: "insulation-section",
      type: "section",
      label: "Insulation Installation",
      properties: {
        description: "Document insulation types, R-values, and installation quality",
        collapsible: true
      }
    },
    {
      id: "attic-insulation-type",
      type: "select",
      label: "Attic Insulation Type",
      properties: {
        required: true,
        options: ["Blown Fiberglass", "Blown Cellulose", "Spray Foam", "Batt Fiberglass", "Other"]
      }
    },
    {
      id: "attic-rvalue",
      type: "number",
      label: "Attic R-Value",
      properties: {
        required: true,
        min: 0,
        max: 100,
        unit: "R-Value"
      }
    },
    {
      id: "wall-insulation-type",
      type: "select",
      label: "Wall Insulation Type",
      properties: {
        required: true,
        options: ["Batt Fiberglass", "Spray Foam", "Blown Cellulose", "Rigid Foam", "Other"]
      }
    },
    {
      id: "wall-rvalue",
      type: "number",
      label: "Wall R-Value",
      properties: {
        required: true,
        min: 0,
        max: 50
      }
    },
    {
      id: "basement-insulation",
      type: "select",
      label: "Basement/Foundation Insulation",
      properties: {
        required: false,
        options: ["None", "Batt", "Spray Foam", "Rigid Foam", "N/A"]
      }
    },
    
    // Section 3: Air Sealing
    {
      id: "air-sealing-section",
      type: "section",
      label: "Air Sealing & Thermal Bypasses",
      properties: {
        description: "Critical air sealing checkpoints",
        collapsible: true
      }
    },
    {
      id: "top-plates-sealed",
      type: "boolean",
      label: "Top Plates Sealed",
      properties: {
        required: true
      }
    },
    {
      id: "bottom-plates-sealed",
      type: "boolean",
      label: "Bottom Plates Sealed",
      properties: {
        required: true
      }
    },
    {
      id: "penetrations-sealed",
      type: "boolean",
      label: "Electrical/Plumbing Penetrations Sealed",
      properties: {
        required: true
      }
    },
    {
      id: "recessed-lights",
      type: "select",
      label: "Recessed Light Treatment",
      properties: {
        required: true,
        options: ["IC-Rated & Sealed", "IC-Rated Only", "Not IC-Rated", "None Present"]
      }
    },
    {
      id: "rim-joist-sealed",
      type: "boolean",
      label: "Rim Joist Sealed",
      properties: {
        required: true
      }
    },
    
    // Section 4: HVAC Rough-In
    {
      id: "hvac-section",
      type: "section",
      label: "HVAC Rough-In",
      properties: {
        description: "Duct work and HVAC equipment placement",
        collapsible: true
      }
    },
    {
      id: "duct-location",
      type: "select",
      label: "Primary Duct Location",
      properties: {
        required: true,
        options: ["Conditioned Space", "Unconditioned Attic", "Unconditioned Basement", "Crawlspace"]
      }
    },
    {
      id: "duct-sealed",
      type: "boolean",
      label: "Duct Joints Sealed (Mastic)",
      properties: {
        required: true
      }
    },
    {
      id: "duct-insulation",
      type: "number",
      label: "Duct Insulation R-Value",
      properties: {
        required: false,
        min: 0,
        max: 20
      }
    },
    
    // Section 5: Photos & Documentation
    {
      id: "photos-section",
      type: "section",
      label: "Photo Documentation",
      properties: {
        description: "Required inspection photos",
        collapsible: true
      }
    },
    {
      id: "photo-attic",
      type: "photo",
      label: "Attic Insulation",
      properties: {
        required: true,
        tags: ["insulation", "attic"]
      }
    },
    {
      id: "photo-walls",
      type: "photo",
      label: "Wall Insulation",
      properties: {
        required: true,
        tags: ["insulation", "walls"]
      }
    },
    {
      id: "photo-air-sealing",
      type: "photo",
      label: "Air Sealing Details",
      properties: {
        required: true,
        tags: ["air-sealing", "thermal-bypass"]
      }
    },
    
    // Section 6: Notes & Findings
    {
      id: "notes-section",
      type: "section",
      label: "Inspector Notes",
      properties: {
        description: "Findings, deficiencies, and recommendations",
        collapsible: true
      }
    },
    {
      id: "deficiencies",
      type: "textarea",
      label: "Deficiencies Noted",
      properties: {
        required: false,
        placeholder: "List any issues found during inspection..."
      }
    },
    {
      id: "recommendations",
      type: "textarea",
      label: "Recommendations",
      properties: {
        required: false,
        placeholder: "Corrective actions or improvements..."
      }
    },
    {
      id: "passes-inspection",
      type: "boolean",
      label: "Passes Pre-Drywall Inspection",
      properties: {
        required: true
      }
    }
  ],
  layout: {
    type: "grid",
    columns: 2,
    gap: 16
  },
  metadata: {
    climate_zone: "6",
    compliance_standard: "RESNET",
    typical_duration_minutes: 45
  }
};

/**
 * Sample Final Inspection Template
 */
const finalInspectionTemplate = {
  name: "Final Inspection (RESNET)",
  description: "Final inspection template for completed homes. Includes blower door test, duct leakage, and final verification.",
  category: "Inspection",
  inspectionType: "Final" as const,
  version: 1,
  status: "published" as const,
  isActive: true,
  components: [
    {
      id: "property-section",
      type: "section",
      label: "Property Information",
      properties: { collapsible: false }
    },
    {
      id: "address",
      type: "text",
      label: "Property Address",
      properties: { required: true }
    },
    {
      id: "builder",
      type: "text",
      label: "Builder",
      properties: { required: true }
    },
    {
      id: "test-date",
      type: "date",
      label: "Test Date",
      properties: { required: true }
    },
    
    {
      id: "blower-door-section",
      type: "section",
      label: "Blower Door Test Results",
      properties: { collapsible: true }
    },
    {
      id: "conditioned-volume",
      type: "number",
      label: "Conditioned Volume (cu ft)",
      properties: { required: true, min: 0 }
    },
    {
      id: "ach50",
      type: "number",
      label: "ACH50 (Air Changes per Hour)",
      properties: { required: true, min: 0, max: 20, decimals: 2 }
    },
    {
      id: "cfm50",
      type: "number",
      label: "CFM50 (Cubic Feet per Minute)",
      properties: { required: true, min: 0 }
    },
    {
      id: "meets-code",
      type: "boolean",
      label: "Meets Code Requirements",
      properties: { required: true }
    },
    
    {
      id: "duct-test-section",
      type: "section",
      label: "Duct Leakage Test",
      properties: { collapsible: true }
    },
    {
      id: "total-leakage",
      type: "number",
      label: "Total Duct Leakage (CFM25)",
      properties: { required: true, min: 0 }
    },
    {
      id: "leakage-to-outside",
      type: "number",
      label: "Leakage to Outside (CFM25)",
      properties: { required: false, min: 0 }
    },
    
    {
      id: "final-notes",
      type: "textarea",
      label: "Final Notes",
      properties: { required: false }
    },
    {
      id: "certification-ready",
      type: "boolean",
      label: "Ready for RESNET Certification",
      properties: { required: true }
    }
  ],
  layout: {
    type: "grid",
    columns: 2,
    gap: 16
  },
  metadata: {
    climate_zone: "6",
    typical_duration_minutes: 90
  }
};

/**
 * Seed the database with sample report templates
 * Safe to run multiple times - checks for existing templates
 */
export async function seedReportTemplates() {
  try {
    serverLogger.info('[Seed] Starting report template seed...');
    
    // Get admin user for created_by field
    const adminUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, "test-admin")
    });
    
    if (!adminUser) {
      serverLogger.warn('[Seed] No admin user found, skipping report template seeding');
      return { success: true, created: 0 };
    }
    
    // Check if templates already exist
    const existingTemplates = await storage.getAllReportTemplates();
    const existingNames = existingTemplates.map(t => t.name);
    
    let createdCount = 0;
    
    // Seed Pre-Drywall template if not exists
    if (!existingNames.includes(preDrywallTemplate.name)) {
      await storage.createReportTemplate({
        ...preDrywallTemplate,
        createdBy: adminUser.id
      });
      createdCount++;
      serverLogger.info('[Seed] Created Pre-Drywall Inspection template');
    } else {
      serverLogger.info('[Seed] Pre-Drywall template already exists, skipping');
    }
    
    // Seed Final Inspection template if not exists
    if (!existingNames.includes(finalInspectionTemplate.name)) {
      await storage.createReportTemplate({
        ...finalInspectionTemplate,
        createdBy: adminUser.id
      });
      createdCount++;
      serverLogger.info('[Seed] Created Final Inspection template');
    } else {
      serverLogger.info('[Seed] Final Inspection template already exists, skipping');
    }
    
    serverLogger.info(`[Seed] Report template seed complete. Created ${createdCount} templates.`);
    return { success: true, created: createdCount };
    
  } catch (error) {
    serverLogger.error('[Seed] Failed to seed report templates:', error);
    throw error;
  }
}

/**
 * Clear all system-created seed templates (for testing)
 * Only deletes templates with createdBy = null
 */
export async function clearSeedTemplates() {
  try {
    const allTemplates = await storage.getAllReportTemplates();
    const systemTemplates = allTemplates.filter(t => t.createdBy === null);
    
    for (const template of systemTemplates) {
      await storage.deleteReportTemplate(template.id);
    }
    
    serverLogger.info(`[Seed] Cleared ${systemTemplates.length} system seed templates`);
    return { success: true, deleted: systemTemplates.length };
  } catch (error) {
    serverLogger.error('[Seed] Failed to clear seed templates:', error);
    throw error;
  }
}
