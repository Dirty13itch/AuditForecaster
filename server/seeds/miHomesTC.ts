/**
 * M/I Homes Twin Cities Seed Data
 * 
 * Comprehensive seed kit for production-like testing scenarios
 * Based on ACTIVE/COMING communities only (as of Nov 2025)
 * 
 * Communities:
 * - Maple Grove — Rush Hollow North (Now Selling; single-family)
 * - Shakopee — Valley Crest (single-family + villas)
 * - Hugo — Oneka Shores (Carriage + Hans Hagen Villa collections)
 * - Rosemount — Amber Fields (3 enclaves: Annagaire, Artaine, Alder Glen)
 * - Rogers — Towns at Fox Creek (townhomes)
 */

import { db } from "../db";
import { 
  builders, 
  plans, 
  jobs, 
  taxCreditProjects
} from "@shared/schema";
import { serverLogger } from "../logger";

interface Community {
  name: string;
  city: string;
  state: string;
  zipCodes: string[];
  gps: { lat: number; lng: number };
  enclaves?: string[];
}

const COMMUNITIES: Community[] = [
  {
    name: "Rush Hollow North",
    city: "Maple Grove",
    state: "MN",
    zipCodes: ["55311"],
    gps: { lat: 45.1075, lng: -93.4558 }
  },
  {
    name: "Valley Crest",
    city: "Shakopee",
    state: "MN",
    zipCodes: ["55379"],
    gps: { lat: 44.7994, lng: -93.5266 }
  },
  {
    name: "Oneka Shores",
    city: "Hugo",
    state: "MN",
    zipCodes: ["55038"],
    gps: { lat: 45.1619, lng: -92.9944 }
  },
  {
    name: "Amber Fields",
    city: "Rosemount",
    state: "MN",
    zipCodes: ["55068"],
    gps: { lat: 44.7394, lng: -93.1258 },
    enclaves: ["Annagaire", "Artaine", "Alder Glen"]
  },
  {
    name: "Towns at Fox Creek",
    city: "Rogers",
    state: "MN",
    zipCodes: ["55374"],
    gps: { lat: 45.1889, lng: -93.5833 }
  }
];

// Plan collections by community type
const PLAN_COLLECTIONS = {
  singleFamily: ["Alexander", "Victoria", "Birchwood II", "Columbia", "Hudson"],
  villa: ["Cedarwood", "Grayson", "Willow II"],
  townhome: ["Savanna", "Camden"]
};

export async function seedMIHomesTC() {
  try {
    serverLogger.info("[Seed:MIHomesTC] Starting M/I Homes Twin Cities seed...");

    // ============================================================================
    // 0. USER LOOKUP (Required for createdBy fields)
    // ============================================================================
    
    const adminUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, "test-admin")
    });

    if (!adminUser) {
      throw new Error("Admin user (test-admin) not found. Ensure user seed runs before this seed.");
    }

    serverLogger.info(`[Seed:MIHomesTC] Using admin user: ${adminUser.email}`);

    // ============================================================================
    // 1. BUILDER SETUP
    // ============================================================================
    
    const [miHomes] = await db.insert(builders).values({
      name: "M/I Homes",
      companyName: "M/I Homes Twin Cities",
      email: "tcbuilds@mihomes.com",
      phone: "(952) 555-0150",
      address: "5000 Baker Road, Minnetonka, MN 55345",
      abbreviations: ["MI", "MIH", "M/I"],
      volumeTier: "premium",
      status: "active",
      constructionManagerName: "John Smith",
      constructionManagerEmail: "jsmith@mihomes.com",
      createdBy: adminUser.id
    }).returning().onConflictDoNothing();

    if (!miHomes) {
      serverLogger.info("[Seed:MIHomesTC] M/I Homes already exists, using existing");
    } else {
      serverLogger.info(`[Seed:MIHomesTC] Created builder: ${miHomes.name}`);
    }

    const builder = miHomes || await db.query.builders.findFirst({
      where: (builders, { eq }) => eq(builders.name, "M/I Homes")
    });

    if (!builder) {
      throw new Error("Failed to create or find M/I Homes builder");
    }

    // ============================================================================
    // 2. PLAN SETUP
    // ============================================================================
    
    const planData = [
      // Rush Hollow North - Single Family
      { name: "Alexander", type: "Single Family", community: "Rush Hollow North", sqft: 2850, beds: 4, baths: 3.5 },
      { name: "Victoria", type: "Single Family", community: "Rush Hollow North", sqft: 3200, beds: 5, baths: 4 },
      { name: "Birchwood II", type: "Single Family", community: "Rush Hollow North", sqft: 2650, beds: 4, baths: 3 },
      
      // Valley Crest - Single Family + Villas
      { name: "Columbia", type: "Single Family", community: "Valley Crest", sqft: 2950, beds: 4, baths: 3.5 },
      { name: "Hudson", type: "Single Family", community: "Valley Crest", sqft: 3100, beds: 4, baths: 4 },
      { name: "Cedarwood", type: "Villa", community: "Valley Crest", sqft: 1850, beds: 2, baths: 2 },
      
      // Oneka Shores - Carriage + Hans Hagen Villa
      { name: "Grayson", type: "Hans Hagen Villa", community: "Oneka Shores", sqft: 1950, beds: 3, baths: 2.5 },
      { name: "Willow II", type: "Hans Hagen Villa", community: "Oneka Shores", sqft: 2100, beds: 3, baths: 2.5 },
      { name: "Alexander", type: "Carriage", community: "Oneka Shores", sqft: 2750, beds: 4, baths: 3 },
      
      // Amber Fields - Single Family (3 enclaves)
      { name: "Victoria", type: "Single Family", community: "Amber Fields - Annagaire", sqft: 3150, beds: 5, baths: 4 },
      { name: "Columbia", type: "Single Family", community: "Amber Fields - Artaine", sqft: 2900, beds: 4, baths: 3.5 },
      { name: "Hudson", type: "Single Family", community: "Amber Fields - Alder Glen", sqft: 3050, beds: 4, baths: 3.5 },
      
      // Towns at Fox Creek - Townhomes
      { name: "Savanna", type: "Townhome", community: "Towns at Fox Creek", sqft: 1650, beds: 3, baths: 2.5 },
      { name: "Camden", type: "Townhome", community: "Towns at Fox Creek", sqft: 1750, beds: 3, baths: 2.5 }
    ];

    const createdPlans: any[] = [];
    for (const plan of planData) {
      const [created] = await db.insert(plans).values({
        builderId: builder.id,
        planName: plan.name,
        floorArea: plan.sqft,
        notes: `${plan.type} - ${plan.community} (${plan.beds} bed / ${plan.baths} bath)`
      }).returning().onConflictDoNothing();
      
      if (created) {
        createdPlans.push({ ...created, community: plan.community, planType: plan.type });
        serverLogger.info(`[Seed:MIHomesTC] Created plan: ${plan.name} (${plan.community})`);
      }
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${createdPlans.length} plans`);

    // ============================================================================
    // 3. JOBS SETUP (50 jobs across communities)
    // ============================================================================
    
    const jobTypes = [
      { type: "Pre-Drywall", stage: "pre_drywall", weight: 0.5 },
      { type: "Final", stage: "final", weight: 0.5 }
    ];

    const jobStatuses = [
      { status: "scheduled", weight: 0.4 },
      { status: "done", weight: 0.3 },
      { status: "failed", weight: 0.2 },
      { status: "reschedule", weight: 0.1 }
    ];

    let jobCount = 0;
    
    // Get test inspectors for assignment
    const inspectors = await db.query.users.findMany({
      where: (users, { or, eq }) => or(
        eq(users.id, "test-inspector1"),
        eq(users.id, "test-inspector2")
      )
    });

    // Job types and statuses
    const inspectionTypes = ["qa_rough", "qa_final", "hers_blower_door", "hers_duct_leakage"];
    const statuses = ["scheduled", "done", "failed", "reschedule"];

    // Generate jobs for each community
    for (const community of COMMUNITIES) {
      const communityPlans = createdPlans.filter(p => p.community.includes(community.name));
      if (communityPlans.length === 0) continue;

      const jobsPerCommunity = 10;
      
      for (let i = 0; i < jobsPerCommunity; i++) {
        jobCount++;
        const lot = 100 + jobCount;
        const plan = communityPlans[Math.floor(Math.random() * communityPlans.length)];
        const inspectionType = inspectionTypes[Math.floor(Math.random() * inspectionTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Generate realistic address
        const streetNumber = 5000 + jobCount;
        const streetNames = ["Maple", "Oak", "Birch", "Elm", "Pine", "Cedar"];
        const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
        const streetTypes = ["Drive", "Lane", "Court", "Circle"];
        const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
        
        const address = `${streetNumber} ${streetName} ${streetType}`;
        const fullAddress = `${address}, ${community.city}, ${community.state} ${community.zipCodes[0]}`;
        
        // Generate scheduled date (mix of past, today, and future)
        const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + daysOffset);
        scheduledDate.setHours(9 + Math.floor(Math.random() * 6), 0, 0, 0); // 9 AM - 3 PM
        
        // Assign inspector (round-robin)
        const inspector = inspectors[jobCount % inspectors.length];
        
        await db.insert(jobs).values({
          name: `MIH-${community.city.substring(0, 3).toUpperCase()}-${lot}`,
          address: fullAddress,
          builderId: builder.id,
          planId: plan.id,
          contractor: "M/I Homes",
          status: status,
          inspectionType: inspectionType as any,
          scheduledDate: scheduledDate,
          assignedTo: inspector?.id,
          createdBy: adminUser.id,
          latitude: community.gps.lat,
          longitude: community.gps.lng,
          notes: `${community.name} - Lot ${lot} - ${plan.name} plan (${plan.planType})`
        }).onConflictDoNothing();
      }
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${jobCount} jobs across ${COMMUNITIES.length} communities`);

    // ============================================================================
    // 4. 45L TAX CREDITS (seed active cases)
    // ============================================================================
    
    const credit45LData = [
      {
        projectName: "Rush Hollow North - 2025 Q1",
        builderId: builder.id,
        projectType: "single-family",
        totalUnits: 12,
        qualifiedUnits: 12,
        taxYear: 2025,
        status: "certified",
        softwareTool: "REM/Rate",
        softwareVersion: "16.5"
      },
      {
        projectName: "Valley Crest - February 2025",
        builderId: builder.id,
        projectType: "single-family",
        totalUnits: 8,
        qualifiedUnits: 8,
        taxYear: 2025,
        status: "pending",
        softwareTool: "REM/Rate",
        softwareVersion: "16.5"
      },
      {
        projectName: "Oneka Shores - Q4 2024",
        builderId: builder.id,
        projectType: "multifamily",
        totalUnits: 15,
        qualifiedUnits: 15,
        taxYear: 2024,
        status: "claimed",
        certificationDate: new Date("2024-12-15"),
        softwareTool: "REM/Rate",
        softwareVersion: "16.5"
      }
    ];

    for (const credit of credit45LData) {
      await db.insert(taxCreditProjects).values({
        ...credit,
        createdBy: adminUser?.id,
        createdAt: new Date()
      });
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${credit45LData.length} 45L tax credit cases`);

    // ============================================================================
    // SUMMARY
    // ============================================================================
    
    const summary = {
      builder: 1,
      plans: createdPlans.length,
      jobs: jobCount,
      credits45L: credit45LData.length,
      communities: COMMUNITIES.length
    };

    serverLogger.info("[Seed:MIHomesTC] ============================================");
    serverLogger.info("[Seed:MIHomesTC] M/I Homes Twin Cities Seed Complete!");
    serverLogger.info(`[Seed:MIHomesTC] - Communities: ${summary.communities}`);
    serverLogger.info(`[Seed:MIHomesTC] - Builder: ${summary.builder}`);
    serverLogger.info(`[Seed:MIHomesTC] - Plans: ${summary.plans}`);
    serverLogger.info(`[Seed:MIHomesTC] - Jobs: ${summary.jobs}`);
    serverLogger.info(`[Seed:MIHomesTC] - 45L Tax Credit Projects: ${summary.credits45L}`);
    serverLogger.info("[Seed:MIHomesTC] ============================================");

    return summary;

  } catch (error) {
    serverLogger.error("[Seed:MIHomesTC] Failed to seed M/I Homes data:", error);
    throw error;
  }
}
