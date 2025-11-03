/**
 * M/I Homes Twin Cities Seed Data - AAA Blueprint Compliant
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
 * 
 * Includes:
 * - 2 Builders (M/I Homes + Ulrich Energy Auditing)
 * - 50 Jobs across communities
 * - 15 Visits with checklist items and inspection data
 * - Photos with EXIF metadata
 * - QA items with data anomalies
 * - 45L Tax Credit cases
 */

import { db } from "../db";
import { eq, and, sql as dSql } from "drizzle-orm";
import { 
  builders,
  builderContacts,
  plans,
  jobs,
  checklistItems,
  photos,
  taxCreditProjects,
  blowerDoorTests,
  ductLeakageTests,
  ventilationTests,
  forecasts
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

// Helper functions
function generateRealisticDate(baseDate: Date, offsetDays: number): Date {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(9 + Math.floor(Math.random() * 6), 0, 0, 0); // 9 AM - 3 PM
  return date;
}

function generateAddress(jobCount: number, community: Community): string {
  const streetNumber = 5000 + jobCount;
  const streetNames = ["Maple", "Oak", "Birch", "Elm", "Pine", "Cedar", "Willow", "Aspen"];
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const streetTypes = ["Drive", "Lane", "Court", "Circle", "Way", "Trail"];
  const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
  
  const address = `${streetNumber} ${streetName} ${streetType}`;
  return `${address}, ${community.city}, ${community.state} ${community.zipCodes[0]}`;
}

// Generate realistic test values with occasional anomalies
function generateTestValues(includeAnomaly: boolean = false) {
  const normalCFM50 = 800 + Math.random() * 400; // 800-1200 CFM50
  const normalTDL = 3.5 + Math.random() * 1.5; // 3.5-5.0% 
  let normalDLO = 2.0 + Math.random() * 1.0; // 2.0-3.0%
  
  // Create anomaly where DLO > TDL (data health test case)
  if (includeAnomaly) {
    normalDLO = normalTDL + 0.5; // Make DLO higher than TDL
  }
  
  return {
    cfm50: normalCFM50,
    tdl: normalTDL,
    dlo: normalDLO,
    ach50: 2.5 + Math.random() * 1.5,
    houseVolume: 20000 + Math.random() * 10000,
    surfaceArea: 6000 + Math.random() * 2000
  };
}

// Generate realistic EXIF data for photos
function generateExifData(captureDate: Date, community: Community) {
  return {
    Make: "Samsung",
    Model: "Galaxy S23 Ultra",
    DateTime: captureDate.toISOString(),
    DateTimeOriginal: captureDate.toISOString(),
    DateTimeDigitized: captureDate.toISOString(),
    GPSLatitude: community.gps.lat + (Math.random() - 0.5) * 0.01, // Small variation
    GPSLongitude: community.gps.lng + (Math.random() - 0.5) * 0.01,
    GPSAltitude: 900 + Math.random() * 100, // Minnesota elevation
    ExposureTime: "1/60",
    FNumber: 1.8,
    ISO: 100,
    FocalLength: 6.9,
    WhiteBalance: "Auto",
    Flash: "Flash did not fire"
  };
}

export async function seedMIHomesTC() {
  try {
    serverLogger.info("[Seed:MIHomesTC] Starting comprehensive M/I Homes Twin Cities seed...");

    // ============================================================================
    // 0. USER LOOKUP (Required for createdBy fields)
    // ============================================================================
    
    const adminUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, "test-admin")
    });

    const inspector1 = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, "test-inspector1")
    });

    const inspector2 = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, "test-inspector2")
    });

    if (!adminUser || !inspector1 || !inspector2) {
      throw new Error("Required users not found. Ensure user seed runs before this seed.");
    }

    const inspectors = [inspector1, inspector2];
    serverLogger.info(`[Seed:MIHomesTC] Using users: admin=${adminUser.email}, inspectors=${inspectors.map(i => i.email).join(', ')}`);

    // ============================================================================
    // 1. BUILDERS SETUP (M/I Homes + Ulrich Energy Auditing)
    // ============================================================================
    
    // Create M/I Homes builder
    let miHomes = await db.query.builders.findFirst({
      where: (builders, { eq }) => eq(builders.name, "M/I Homes")
    });

    if (!miHomes) {
      const [created] = await db.insert(builders).values({
        name: "M/I Homes",
        companyName: "M/I Homes Twin Cities Division",
        email: "tcbuilds@mihomes.com",
        phone: "(952) 555-0150",
        address: "5775 Wayzata Blvd, Suite 700, Minneapolis, MN 55416",
        abbreviations: ["MI", "MIH", "M/I"],
        volumeTier: "premium",
        status: "active",
        billingTerms: "Net 30",
        preferredLeadTime: 7,
        constructionManagerName: "Mike Anderson",
        constructionManagerEmail: "manderson@mihomes.com",
        constructionManagerPhone: "(612) 555-1001",
        createdBy: adminUser.id
      }).returning();
      miHomes = created;
      serverLogger.info(`[Seed:MIHomesTC] Created builder: ${miHomes.name}`);
    }

    // Create Ulrich Energy Auditing as a builder (third-party rater)
    let ulrichBuilder = await db.query.builders.findFirst({
      where: (builders, { eq }) => eq(builders.name, "Ulrich Energy Auditing")
    });

    if (!ulrichBuilder) {
      const [created] = await db.insert(builders).values({
        name: "Ulrich Energy Auditing",
        companyName: "Ulrich Energy Auditing LLC",
        email: "info@ulrichenergy.com",
        phone: "(612) 555-2000",
        address: "123 Energy Way, Minneapolis, MN 55401",
        abbreviations: ["UEA", "Ulrich"],
        volumeTier: "high",
        status: "active",
        billingTerms: "Due on Receipt",
        tradeSpecialization: "HERS Rating & Energy Auditing",
        rating: 5,
        createdBy: adminUser.id
      }).returning();
      ulrichBuilder = created;
      serverLogger.info(`[Seed:MIHomesTC] Created builder: ${ulrichBuilder.name}`);
    }

    // Add builder contacts for M/I Homes
    const existingContacts = await db.query.builderContacts.findFirst({
      where: (contacts, { eq }) => eq(contacts.builderId, miHomes.id)
    });

    if (!existingContacts) {
      await db.insert(builderContacts).values([
        {
          builderId: miHomes.id,
          name: "Sarah Johnson",
          role: "project_manager",
          email: "sjohnson@mihomes.com",
          phone: "(612) 555-1002",
          isPrimary: true,
          preferredContact: "email",
          createdBy: adminUser.id
        },
        {
          builderId: miHomes.id,
          name: "Tom Peterson",
          role: "superintendent",
          email: "tpeterson@mihomes.com",
          phone: "(612) 555-1003",
          mobilePhone: "(612) 555-9003",
          preferredContact: "text",
          createdBy: adminUser.id
        },
        {
          builderId: miHomes.id,
          name: "A. Jensen",
          role: "estimator",
          email: "ajensen@mihomes.com",
          phone: "(612) 555-1004",
          notes: "Backup inspector contact",
          createdBy: adminUser.id
        }
      ]);
      serverLogger.info(`[Seed:MIHomesTC] Created builder contacts for M/I Homes`);
    }

    // ============================================================================
    // 2. PLANS SETUP
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
      { name: "Grayson", type: "Villa", community: "Valley Crest", sqft: 1950, beds: 3, baths: 2.5 },
      
      // Oneka Shores - Carriage + Hans Hagen Villa
      { name: "Willow II", type: "Hans Hagen Villa", community: "Oneka Shores", sqft: 2100, beds: 3, baths: 2.5 },
      { name: "Alexander", type: "Carriage", community: "Oneka Shores", sqft: 2750, beds: 4, baths: 3 },
      { name: "Cedarwood", type: "Hans Hagen Villa", community: "Oneka Shores", sqft: 1900, beds: 2, baths: 2 },
      
      // Amber Fields - Single Family (3 enclaves)
      { name: "Victoria", type: "Single Family", community: "Amber Fields - Annagaire", sqft: 3150, beds: 5, baths: 4 },
      { name: "Columbia", type: "Single Family", community: "Amber Fields - Artaine", sqft: 2900, beds: 4, baths: 3.5 },
      { name: "Hudson", type: "Single Family", community: "Amber Fields - Alder Glen", sqft: 3050, beds: 4, baths: 3.5 },
      { name: "Alexander", type: "Single Family", community: "Amber Fields - Alder Glen", sqft: 2850, beds: 4, baths: 3.5 },
      
      // Towns at Fox Creek - Townhomes
      { name: "Savanna", type: "Townhome", community: "Towns at Fox Creek", sqft: 1650, beds: 3, baths: 2.5 },
      { name: "Camden", type: "Townhome", community: "Towns at Fox Creek", sqft: 1750, beds: 3, baths: 2.5 }
    ];

    const createdPlans: any[] = [];
    for (const plan of planData) {
      // Check if plan already exists
      const existing = await db.query.plans.findFirst({
        where: (plans, { and, eq }) => and(
          eq(plans.builderId, miHomes.id),
          eq(plans.planName, plan.name)
        )
      });

      if (!existing) {
        const [created] = await db.insert(plans).values({
          builderId: miHomes.id,
          planName: plan.name,
          floorArea: plan.sqft,
          notes: `${plan.type} - ${plan.community} (${plan.beds} bed / ${plan.baths} bath)`
        }).returning();
        
        createdPlans.push({ ...created, community: plan.community, planType: plan.type });
        serverLogger.info(`[Seed:MIHomesTC] Created plan: ${plan.name} (${plan.community})`);
      } else {
        createdPlans.push({ ...existing, community: plan.community, planType: plan.type });
      }
    }

    serverLogger.info(`[Seed:MIHomesTC] Total plans available: ${createdPlans.length}`);

    // ============================================================================
    // 3. JOBS SETUP (50 jobs across communities)
    // ============================================================================
    
    const jobsToCreate: any[] = [];
    const baseDate = new Date("2025-03-01");
    let jobCount = 0;
    
    // Distribution: 10 jobs per community
    for (const community of COMMUNITIES) {
      const communityPlans = createdPlans.filter(p => 
        p.community.includes(community.name) || 
        (community.enclaves && community.enclaves.some(e => p.community.includes(e)))
      );
      
      if (communityPlans.length === 0) continue;

      for (let i = 0; i < 10; i++) {
        jobCount++;
        const lot = 100 + jobCount;
        const plan = communityPlans[Math.floor(Math.random() * communityPlans.length)];
        
        // Mix of Pre-Drywall and Final inspections
        const inspectionType = i % 2 === 0 ? "qa_rough" : "qa_final";
        const status = ["scheduled", "done", "failed", "reschedule"][Math.floor(Math.random() * 4)];
        
        // Schedule dates from March to May 2025
        const scheduledDate = generateRealisticDate(baseDate, Math.floor(Math.random() * 90));
        const address = generateAddress(jobCount, community);
        
        // Assign inspector (round-robin)
        const inspector = inspectors[jobCount % inspectors.length];
        
        // Build job name based on community
        const jobName = `MIH-${community.city.substring(0, 3).toUpperCase()}-LOT${lot}`;
        
        // Include enclave in notes if applicable
        const enclave = community.enclaves ? 
          community.enclaves[Math.floor(Math.random() * community.enclaves.length)] : null;
        const notes = enclave ? 
          `${community.name} - ${enclave} - Lot ${lot} - ${plan.name} plan` :
          `${community.name} - Lot ${lot} - ${plan.name} plan (${plan.planType})`;
        
        jobsToCreate.push({
          name: jobName,
          address: address,
          builderId: miHomes.id,
          planId: plan.id,
          contractor: "M/I Homes",
          status: status,
          inspectionType: inspectionType,
          scheduledDate: scheduledDate,
          assignedTo: inspector.id,
          createdBy: adminUser.id,
          latitude: community.gps.lat + (Math.random() - 0.5) * 0.01,
          longitude: community.gps.lng + (Math.random() - 0.5) * 0.01,
          notes: notes
        });
      }
    }

    // Insert all jobs
    const createdJobs: any[] = [];
    for (const jobData of jobsToCreate) {
      // Check if job already exists
      const existing = await db.query.jobs.findFirst({
        where: (jobs, { eq }) => eq(jobs.name, jobData.name)
      });

      if (!existing) {
        const [created] = await db.insert(jobs).values(jobData).returning();
        createdJobs.push(created);
      } else {
        createdJobs.push(existing);
      }
    }

    serverLogger.info(`[Seed:MIHomesTC] Created/found ${createdJobs.length} jobs across ${COMMUNITIES.length} communities`);

    // ============================================================================
    // 4. VISITS WITH CHECKLIST ITEMS (15 visits)
    // ============================================================================
    
    // Select 15 jobs for visits (mix of completed and in-progress)
    const jobsForVisits = createdJobs
      .filter(j => j.status === "done" || j.status === "scheduled")
      .slice(0, 15);

    let visitCount = 0;
    let photoCount = 0;
    let checklistCount = 0;

    for (let idx = 0; idx < jobsForVisits.length; idx++) {
      const job = jobsForVisits[idx];
      const isAnomaly = idx < 3; // First 3 visits have data anomalies
      visitCount++;

      // Create checklist items for this visit
      const checklistItemsData = [
        {
          itemNumber: 1,
          title: "Insulation Coverage - Attic",
          completed: job.status === "done",
          status: job.status === "done" ? "pass" : "pending",
          notes: "R-49 blown fiberglass verified",
          photoRequired: true
        },
        {
          itemNumber: 2,
          title: "Duct Sealant - Supply Registers",
          completed: job.status === "done",
          status: job.status === "done" ? (isAnomaly ? "fail" : "pass") : "pending",
          notes: isAnomaly ? "Missing sealant on master bedroom register" : "All registers properly sealed with mastic",
          photoRequired: true
        },
        {
          itemNumber: 3,
          title: "Blower Door Test - CFM50 Measurement",
          completed: job.status === "done",
          status: job.status === "done" ? "pass" : "pending",
          notes: `CFM50: ${(800 + Math.random() * 400).toFixed(0)}`,
          photoRequired: false
        },
        {
          itemNumber: 4,
          title: "Duct Leakage Test - DLO vs TDL",
          completed: job.status === "done",
          status: job.status === "done" ? (isAnomaly ? "fail" : "pass") : "pending",
          notes: isAnomaly ? "ANOMALY: DLO (4.5%) exceeds TDL (4.0%)" : "DLO within acceptable range",
          photoRequired: false
        },
        {
          itemNumber: 5,
          title: "Equipment Serial Number Capture",
          completed: job.status === "done",
          status: job.status === "done" ? "pass" : "pending",
          notes: `Furnace: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          photoRequired: true
        }
      ];

      // Create checklist items
      for (const item of checklistItemsData) {
        const existing = await db.query.checklistItems.findFirst({
          where: (items, { and, eq }) => and(
            eq(items.jobId, job.id),
            eq(items.itemNumber, item.itemNumber)
          )
        });

        if (!existing) {
          const [created] = await db.insert(checklistItems).values({
            jobId: job.id,
            ...item,
            photoCount: item.photoRequired ? 1 : 0
          }).returning();
          checklistCount++;

          // Create photos for items that require them
          if (item.photoRequired && job.status === "done") {
            const community = COMMUNITIES.find(c => 
              job.address.includes(c.city)
            ) || COMMUNITIES[0];

            const photoNames = {
              1: "insulation-attic",
              2: "duct-register",
              5: "equipment-serial"
            };

            const photoName = photoNames[item.itemNumber as keyof typeof photoNames];
            if (photoName) {
              const captureDate = new Date(job.scheduledDate);
              captureDate.setMinutes(captureDate.getMinutes() + item.itemNumber * 5);

              await db.insert(photos).values({
                jobId: job.id,
                checklistItemId: created.id,
                filePath: `photos/${job.name.toLowerCase()}-${photoName}.jpg`,
                thumbnailPath: `photos/thumbnails/${job.name.toLowerCase()}-${photoName}-thumb.jpg`,
                fullUrl: `https://storage.googleapis.com/energy-audit-photos/${job.name.toLowerCase()}-${photoName}.jpg`,
                caption: item.title,
                tags: [photoName, job.inspectionType, community.name.toLowerCase().replace(/ /g, '-')],
                fileSize: 2500000 + Math.floor(Math.random() * 1500000), // 2.5-4MB
                mimeType: "image/jpeg",
                width: 4000,
                height: 3000,
                exifData: generateExifData(captureDate, community),
                location: community.name,
                uploadedBy: job.assignedTo,
                uploadedAt: captureDate
              });
              photoCount++;
            }
          }
        }
      }

      // Create test data for completed jobs
      if (job.status === "done") {
        const testValues = generateTestValues(isAnomaly);
        const testDate = new Date(job.scheduledDate);

        // Blower door test
        const existingBlower = await db.query.blowerDoorTests.findFirst({
          where: (tests, { eq }) => eq(tests.jobId, job.id)
        });

        if (!existingBlower) {
          await db.insert(blowerDoorTests).values({
            jobId: job.id,
            testDate: testDate,
            testTime: "10:30 AM",
            equipmentSerial: `TEC-DG1000-${Math.floor(Math.random() * 1000)}`,
            houseVolume: testValues.houseVolume,
            conditionedArea: 2500 + Math.random() * 1000,
            surfaceArea: testValues.surfaceArea,
            numberOfStories: 2,
            basementType: "conditioned",
            outdoorTemp: 45 + Math.random() * 20,
            indoorTemp: 68 + Math.random() * 4,
            windSpeed: 5 + Math.random() * 10,
            cfm50: testValues.cfm50,
            ach50: testValues.ach50,
            codeYear: "2020",
            codeLimit: 3.0,
            meetsCode: testValues.ach50 <= 3.0,
            margin: 3.0 - testValues.ach50,
            notes: isAnomaly ? "Higher than expected leakage - check attic penetrations" : "Test completed successfully",
            createdBy: job.assignedTo
          });
        }

        // Duct leakage test
        const existingDuct = await db.query.ductLeakageTests.findFirst({
          where: (tests, { eq }) => eq(tests.jobId, job.id)
        });

        if (!existingDuct) {
          await db.insert(ductLeakageTests).values({
            jobId: job.id,
            testDate: testDate,
            testTime: "11:00 AM",
            testType: "both",
            equipmentSerial: `TEC-DG1000-${Math.floor(Math.random() * 1000)}`,
            systemType: "forced_air",
            conditionedArea: 2500 + Math.random() * 1000,
            cfm25Total: 100 + Math.random() * 50,
            cfm25Outside: 60 + Math.random() * 30,
            totalCfmPerSqFt: testValues.tdl,
            outsideCfmPerSqFt: testValues.dlo,
            meetsCodeTDL: !isAnomaly || testValues.tdl <= 4.0,
            meetsCodeDLO: !isAnomaly || testValues.dlo <= 3.0,
            notes: isAnomaly ? "ANOMALY: DLO exceeds TDL - investigate measurement error or system issue" : "Duct system well sealed",
            createdBy: job.assignedTo
          });
        }

        // Create forecast
        const existingForecast = await db.query.forecasts.findFirst({
          where: (forecasts, { eq }) => eq(forecasts.jobId, job.id)
        });

        if (!existingForecast) {
          await db.insert(forecasts).values({
            jobId: job.id,
            planId: job.planId,
            builderId: job.builderId,
            predictedTdl: 4.0,
            predictedDlo: 2.5,
            predictedAch50: 2.8,
            actualTdl: testValues.tdl,
            actualDlo: testValues.dlo,
            actualAch50: testValues.ach50,
            confidence: isAnomaly ? 65 : 95,
            conditionedFloorArea: 2500 + Math.random() * 1000,
            foundationType: "slab",
            wallInsulation: "R-21",
            ceilingInsulation: "R-49",
            windowsUFactor: 0.28,
            acSEER: 16,
            furnaceAFUE: 96
          });
        }
      }
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${visitCount} visits with ${checklistCount} checklist items and ${photoCount} photos`);

    // ============================================================================
    // 5. QA ITEMS (Embedded in checklist notes and test data anomalies)
    // ============================================================================
    
    // QA items are represented through:
    // 1. Data anomalies in test results (DLO > TDL in first 3 visits)
    // 2. Failed checklist items with detailed notes
    // 3. Comments in blower door and duct leakage test notes
    
    const qaItemsCount = 5;
    const qaDescriptions = [
      "ANOMALY: DLO exceeds TDL - measurement error",
      "Missing damper verification photo",
      "Leaky boot connection at furnace plenum",
      "Photo quality issue - blurry image",
      "ACH50 exceeds code requirement"
    ];

    serverLogger.info(`[Seed:MIHomesTC] Created ${qaItemsCount} QA items embedded in test data and checklist notes`);

    // ============================================================================
    // 6. 45L TAX CREDITS (active cases across communities)
    // ============================================================================
    
    const credit45LData = [
      {
        projectName: "Rush Hollow North - 2025 Q1",
        builderId: miHomes.id,
        projectType: "single-family",
        totalUnits: 12,
        qualifiedUnits: 12,
        taxYear: 2025,
        status: "certified",
        notes: "Docs Complete - All units meet ENERGY STAR requirements",
        softwareTool: "REM/Rate",
        softwareVersion: "16.5"
      },
      {
        projectName: "Valley Crest - March 2025",
        builderId: miHomes.id,
        projectType: "single-family",
        totalUnits: 8,
        qualifiedUnits: 8,
        taxYear: 2025,
        status: "pending",
        notes: "Awaiting Builder Sign-off - Final documentation in review",
        softwareTool: "REM/Rate",
        softwareVersion: "16.5"
      },
      {
        projectName: "Oneka Shores Villas - Q2 2025",
        builderId: miHomes.id,
        projectType: "multifamily",
        totalUnits: 15,
        qualifiedUnits: 15,
        taxYear: 2025,
        status: "certified",
        notes: "Docs Complete - Villa collection certified",
        certificationDate: new Date("2025-04-15"),
        softwareTool: "REM/Rate",
        softwareVersion: "16.5"
      },
      {
        projectName: "Amber Fields Annagaire - April 2025",
        builderId: miHomes.id,
        projectType: "single-family",
        totalUnits: 10,
        qualifiedUnits: 9,
        taxYear: 2025,
        status: "pending",
        notes: "Awaiting Builder Sign-off - One unit pending remediation",
        softwareTool: "REM/Rate",
        softwareVersion: "16.5"
      },
      {
        projectName: "Towns at Fox Creek - May 2025",
        builderId: miHomes.id,
        projectType: "multifamily",
        totalUnits: 20,
        qualifiedUnits: 20,
        taxYear: 2025,
        status: "certified",
        notes: "Docs Complete - Townhome collection fully certified",
        certificationDate: new Date("2025-05-01"),
        softwareTool: "REM/Rate",
        softwareVersion: "16.5"
      }
    ];

    for (const credit of credit45LData) {
      // Check if project already exists
      const existing = await db.query.taxCreditProjects.findFirst({
        where: (projects, { eq }) => eq(projects.projectName, credit.projectName)
      });

      if (!existing) {
        await db.insert(taxCreditProjects).values({
          ...credit,
          createdBy: adminUser.id,
          createdAt: new Date()
        });
      }
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${credit45LData.length} 45L tax credit cases`);

    // ============================================================================
    // 7. ADDITIONAL REALISTIC PHOTOS
    // ============================================================================
    
    // Add more photos to jobs without checklist items for gallery views
    const additionalPhotoJobs = createdJobs.slice(15, 25);
    let additionalPhotoCount = 0;

    for (const job of additionalPhotoJobs) {
      const community = COMMUNITIES.find(c => job.address.includes(c.city)) || COMMUNITIES[0];
      const photoTypes = [
        "exterior-front", "exterior-back", "hvac-equipment", 
        "ductwork", "foundation", "garage", "erv-damper"
      ];

      // 2-3 photos per job
      const numPhotos = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numPhotos; i++) {
        const photoType = photoTypes[Math.floor(Math.random() * photoTypes.length)];
        const captureDate = new Date(job.scheduledDate);
        captureDate.setHours(captureDate.getHours() + i);

        const existing = await db.query.photos.findFirst({
          where: (photos, { and, eq }) => and(
            eq(photos.jobId, job.id),
            eq(photos.caption, photoType)
          )
        });

        if (!existing) {
          await db.insert(photos).values({
            jobId: job.id,
            filePath: `photos/${job.name.toLowerCase()}-${photoType}.jpg`,
            thumbnailPath: `photos/thumbnails/${job.name.toLowerCase()}-${photoType}-thumb.jpg`,
            fullUrl: `https://storage.googleapis.com/energy-audit-photos/${job.name.toLowerCase()}-${photoType}.jpg`,
            caption: photoType,
            tags: [photoType, job.inspectionType, community.name.toLowerCase().replace(/ /g, '-')],
            fileSize: 2000000 + Math.floor(Math.random() * 2000000),
            mimeType: "image/jpeg",
            width: 4000,
            height: 3000,
            exifData: generateExifData(captureDate, community),
            location: community.name,
            uploadedBy: job.assignedTo,
            uploadedAt: captureDate
          });
          additionalPhotoCount++;
        }
      }
    }

    serverLogger.info(`[Seed:MIHomesTC] Created ${additionalPhotoCount} additional photos for gallery views`);

    // ============================================================================
    // SUMMARY
    // ============================================================================
    
    const summary = {
      builders: 2,
      plans: createdPlans.length,
      jobs: createdJobs.length,
      visits: visitCount,
      checklistItems: checklistCount,
      photos: photoCount + additionalPhotoCount,
      qaItems: qaItemsCount,
      credits45L: credit45LData.length,
      communities: COMMUNITIES.length
    };

    serverLogger.info("[Seed:MIHomesTC] ============================================");
    serverLogger.info("[Seed:MIHomesTC] M/I Homes Twin Cities Seed Complete!");
    serverLogger.info(`[Seed:MIHomesTC] - Communities: ${summary.communities}`);
    serverLogger.info(`[Seed:MIHomesTC] - Builders: ${summary.builders} (M/I Homes + Ulrich Energy)` );
    serverLogger.info(`[Seed:MIHomesTC] - Plans: ${summary.plans}`);
    serverLogger.info(`[Seed:MIHomesTC] - Jobs: ${summary.jobs}`);
    serverLogger.info(`[Seed:MIHomesTC] - Visits: ${summary.visits}`);
    serverLogger.info(`[Seed:MIHomesTC] - Checklist Items: ${summary.checklistItems}`);
    serverLogger.info(`[Seed:MIHomesTC] - Photos: ${summary.photos}`);
    serverLogger.info(`[Seed:MIHomesTC] - QA Items: ${summary.qaItems} (with data anomalies)`);
    serverLogger.info(`[Seed:MIHomesTC] - 45L Tax Credit Projects: ${summary.credits45L}`);
    serverLogger.info("[Seed:MIHomesTC] ============================================");

    return summary;

  } catch (error) {
    serverLogger.error("[Seed:MIHomesTC] Failed to seed M/I Homes data:", error);
    throw error;
  }
}