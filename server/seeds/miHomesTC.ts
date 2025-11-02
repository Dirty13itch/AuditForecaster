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
  jobWorkflow,
  jobPhotos,
  qaItems,
  credits45L
} from "@shared/schema";
import { serverLogger } from "../logger";
import { nanoid } from "nanoid";

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
    // 1. BUILDER SETUP
    // ============================================================================
    
    const [miHomes] = await db.insert(builders).values({
      name: "M/I Homes",
      abbreviation: "MI",
      contactName: "Twin Cities Division",
      contactEmail: "tcbuilds@mihomes.com",
      contactPhone: "(952) 555-0150",
      address: "5000 Baker Road, Minnetonka, MN 55345",
      certifications: ["ENERGY STAR Partner", "Minnesota Housing EGCC"],
      active: true
    }).returning().onConflictDoNothing();

    if (!miHomes) {
      serverLogger.info("[Seed:MIHomesTC] M/I Homes already exists, using existing");
    } else {
      serverLogger.info(`[Seed:MIHomesTC] Created builder: ${miHomes.name}`);
    }

    const builder = miHomes || await db.query.builders.findFirst({
      where: (builders, { eq }) => eq(builders.abbreviation, "MI")
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
        name: plan.name,
        planType: plan.type as any,
        squareFootage: plan.sqft,
        bedrooms: plan.beds,
        bathrooms: plan.baths,
        description: `${plan.name} - ${plan.community} (${plan.sqft} sq ft, ${plan.beds} bed / ${plan.baths} bath)`,
        active: true
      }).returning().onConflictDoNothing();
      
      if (created) {
        createdPlans.push({ ...created, community: plan.community });
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

    const createdJobs: any[] = [];
    let jobCount = 0;
    
    // Get test users for assignment
    const inspectors = await db.query.users.findMany({
      where: (users, { or, eq }) => or(
        eq(users.id, "test-inspector1"),
        eq(users.id, "test-inspector2")
      )
    });

    const adminUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, "test-admin")
    });

    // Generate jobs for each community
    for (const community of COMMUNITIES) {
      const communityPlans = createdPlans.filter(p => p.community.includes(community.name));
      if (communityPlans.length === 0) continue;

      const jobsPerCommunity = 10;
      
      for (let i = 0; i < jobsPerCommunity; i++) {
        jobCount++;
        const lot = 100 + jobCount;
        const plan = communityPlans[Math.floor(Math.random() * communityPlans.length)];
        const jobType = Math.random() < 0.5 ? jobTypes[0] : jobTypes[1];
        const status = jobStatuses[Math.floor(Math.random() * jobStatuses.length)].status;
        
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
        
        const [job] = await db.insert(jobs).values({
          jobNumber: `MIH-${community.city.substring(0, 3).toUpperCase()}-${lot}`,
          builderId: builder.id,
          planId: plan.id,
          address: fullAddress,
          city: community.city,
          state: community.state,
          zip: community.zipCodes[0],
          lotNumber: lot.toString(),
          development: community.name,
          stage: jobType.stage as any,
          status: status as any,
          scheduledAt: scheduledDate,
          assignedTo: inspector?.id,
          createdBy: adminUser?.id || null,
          gpsLatitude: community.gps.lat.toString(),
          gpsLongitude: community.gps.lng.toString(),
          notes: `${community.name} - Lot ${lot} - ${plan.name} plan (${plan.planType})`
        }).returning();

        createdJobs.push(job);
      }
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${createdJobs.length} jobs across ${COMMUNITIES.length} communities`);

    // ============================================================================
    // 4. VISITS & WORKFLOW DATA (15 visits with realistic data)
    // ============================================================================
    
    const completedJobs = createdJobs.filter(j => j.status === "done").slice(0, 15);
    
    for (let i = 0; i < completedJobs.length; i++) {
      const job = completedJobs[i];
      const isFinal = job.stage === "final";
      
      // Create workflow entry with realistic test data
      const workflowData: any = {
        jobId: job.id,
        jobType: isFinal ? "final" : "pre_drywall",
        currentStep: 10, // Completed
        completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        stepData: {
          // Checklist items
          checklist: isFinal ? {
            insulationCoverage: { checked: true, notes: "R-49 attic, R-21 walls verified" },
            airSealingComplete: { checked: true, notes: "All penetrations sealed" },
            ductSealed: { checked: true, notes: "All joints and boots sealed with mastic" },
            equipmentInstalled: { checked: true, notes: "2-ton AC, 80k BTU furnace" },
            ventilationOperable: { checked: true, notes: "ERV operating correctly" }
          } : {
            framingComplete: { checked: true },
            insulationReady: { checked: true },
            hvacRoughIn: { checked: true }
          }
        },
        completedAt: new Date()
      };

      // Add test data for Final inspections
      if (isFinal) {
        // Blower door test
        const ach50 = 2.1 + (Math.random() * 1.2); // 2.1 to 3.3 ACH50
        const buildingVolume = job.planId ? 22000 + (Math.random() * 8000) : 25000;
        const cfm50 = (ach50 * buildingVolume) / 60;
        
        workflowData.stepData.blowerDoor = {
          cfm50: Math.round(cfm50),
          ach50: Number(ach50.toFixed(2)),
          buildingVolume: Math.round(buildingVolume),
          testDate: new Date().toISOString(),
          passed: ach50 <= 3.0
        };

        // Duct leakage test
        const totalDuctLeakage = 120 + (Math.random() * 60); // 120-180 CFM25
        const leakageToOutside = 50 + (Math.random() * 40); // 50-90 CFM25
        
        workflowData.stepData.ductLeakage = {
          totalDuctLeakage: Math.round(totalDuctLeakage),
          leakageToOutside: Math.round(leakageToOutside),
          testType: "DLO",
          passed: leakageToOutside <= 90
        };

        // Ventilation test
        workflowData.stepData.ventilation = {
          ervAirflow: 80 + Math.floor(Math.random() * 40), // 80-120 CFM
          ervType: "ERV",
          passed: true
        };
      }

      await db.insert(jobWorkflow).values(workflowData);
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${completedJobs.length} visits with workflow data`);

    // ============================================================================
    // 5. QA ITEMS (5 quality issues)
    // ============================================================================
    
    const qaItemData = [
      {
        jobId: createdJobs[5]?.id,
        category: "duct_leakage",
        severity: "high",
        description: "Total duct leakage (TDL) exceeds threshold at 195 CFM25. Specification requires ≤ 180 CFM25.",
        status: "open",
        identifiedBy: adminUser?.id
      },
      {
        jobId: createdJobs[12]?.id,
        category: "equipment",
        severity: "medium",
        description: "ERV damper found in closed position. Must be open for proper ventilation.",
        status: "resolved",
        identifiedBy: inspectors[0]?.id,
        resolvedBy: inspectors[0]?.id,
        resolvedAt: new Date()
      },
      {
        jobId: createdJobs[18]?.id,
        category: "air_sealing",
        severity: "high",
        description: "Leaky boot connection at register R-12. Requires mastic seal.",
        status: "open",
        identifiedBy: adminUser?.id
      },
      {
        jobId: createdJobs[25]?.id,
        category: "photo_quality",
        severity: "low",
        description: "Photo MIH-ROS-125-blowerdoor.jpg is blurry. Retake required for compliance documentation.",
        status: "in_progress",
        identifiedBy: adminUser?.id,
        assignedTo: inspectors[1]?.id
      },
      {
        jobId: createdJobs[30]?.id,
        category: "insulation",
        severity: "medium",
        description: "Attic insulation R-value appears below R-49 in northwest corner. Verification needed.",
        status: "open",
        identifiedBy: inspectors[0]?.id
      }
    ].filter(item => item.jobId); // Only create if job exists

    for (const qa of qaItemData) {
      await db.insert(qaItems).values({
        ...qa,
        createdAt: new Date()
      });
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${qaItemData.length} QA items`);

    // ============================================================================
    // 6. 45L TAX CREDITS (seed active cases)
    // ============================================================================
    
    const credit45LData = [
      {
        name: "Rush Hollow North - 2025 Q1",
        builderId: builder.id,
        community: "Rush Hollow North",
        status: "docs_complete",
        dwellingUnits: 12,
        certificationBody: "RESNET",
        notes: "Q1 2025 batch - 12 units completed, documentation submitted"
      },
      {
        name: "Valley Crest - February 2025",
        builderId: builder.id,
        community: "Valley Crest",
        status: "builder_review",
        dwellingUnits: 8,
        certificationBody: "RESNET",
        notes: "Awaiting builder sign-off on 8 villa units"
      },
      {
        name: "Oneka Shores - Q4 2024",
        builderId: builder.id,
        community: "Oneka Shores",
        status: "submitted",
        dwellingUnits: 15,
        certificationBody: "RESNET",
        submittedDate: new Date("2024-12-15"),
        notes: "Submitted to IRS December 2024"
      }
    ];

    for (const credit of credit45LData) {
      await db.insert(credits45L).values({
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
      jobs: createdJobs.length,
      visits: completedJobs.length,
      qaItems: qaItemData.length,
      credits45L: credit45LData.length,
      communities: COMMUNITIES.length
    };

    serverLogger.info("[Seed:MIHomesTC] ============================================");
    serverLogger.info("[Seed:MIHomesTC] M/I Homes Twin Cities Seed Complete!");
    serverLogger.info(`[Seed:MIHomesTC] - Communities: ${summary.communities}`);
    serverLogger.info(`[Seed:MIHomesTC] - Builder: ${summary.builder}`);
    serverLogger.info(`[Seed:MIHomesTC] - Plans: ${summary.plans}`);
    serverLogger.info(`[Seed:MIHomesTC] - Jobs: ${summary.jobs}`);
    serverLogger.info(`[Seed:MIHomesTC] - Visits: ${summary.visits}`);
    serverLogger.info(`[Seed:MIHomesTC] - QA Items: ${summary.qaItems}`);
    serverLogger.info(`[Seed:MIHomesTC] - 45L Credits: ${summary.credits45L}`);
    serverLogger.info("[Seed:MIHomesTC] ============================================");

    return summary;

  } catch (error) {
    serverLogger.error("[Seed:MIHomesTC] Failed to seed M/I Homes data:", error);
    throw error;
  }
}
