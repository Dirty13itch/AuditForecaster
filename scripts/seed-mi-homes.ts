/**
 * M/I Homes Twin Cities Seed Data
 * 
 * Creates realistic seed data for M/I Homes developments across Twin Cities:
 * - 5 Twin Cities communities
 * - 50 jobs (various HERS inspection types)
 * - 15 field visits with photos
 * - 5 QA items
 * - 2 45L tax credit cases
 * 
 * Usage: tsx scripts/seed-mi-homes.ts
 */

import { db } from '../server/db';
import {
  organizations,
  builders,
  builderContacts,
  constructionManagers,
  developments,
  lots,
  plans,
  users,
  jobs,
  photos,
  qaInspectionScores,
  taxCreditProjects,
  blowerDoorTests,
  ductLeakageTests,
  ventilationTests,
  forecasts,
} from '../shared/schema';
import { sql, eq, or } from 'drizzle-orm';

// ============================================================================
// Helper Functions
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// M/I Homes Twin Cities Development Data
// ============================================================================

const MI_HOMES_TWIN_CITIES = {
  builder: {
    name: 'M/I Homes',
    companyName: 'M/I Homes of Minnesota',
    email: 'minnesota@mihomes.com',
    phone: '(612) 555-1000',
    address: '5775 Wayzata Blvd, Suite 700, Minneapolis, MN 55416',
  },
  
  developments: [
    {
      name: 'Rush Hollow North',
      municipality: 'Maple Grove',
      region: 'Twin Cities Metro',
      totalLots: 120,
      plans: [
        { planName: 'Alexander', floorArea: 2850 },
        { planName: 'Victoria', floorArea: 3100 },
        { planName: 'Camden', floorArea: 2450 },
      ],
    },
    {
      name: 'Valley Crest',
      municipality: 'Shakopee',
      region: 'Twin Cities Metro',
      totalLots: 85,
      plans: [
        { planName: 'Columbia', floorArea: 2650 },
        { planName: 'Hudson', floorArea: 3300 },
      ],
    },
    {
      name: 'Oneka Shores',
      municipality: 'Hugo',
      region: 'Twin Cities Metro',
      totalLots: 95,
      plans: [
        { planName: 'Birchwood II', floorArea: 2750 },
        { planName: 'Cedarwood', floorArea: 2950 },
      ],
    },
    {
      name: 'Amber Fields',
      municipality: 'Rosemount',
      region: 'Twin Cities Metro',
      totalLots: 65,
      plans: [
        { planName: 'Grayson', floorArea: 2500 },
        { planName: 'Willow II', floorArea: 2850 },
      ],
    },
    {
      name: 'Towns at Fox Creek',
      municipality: 'Rogers',
      region: 'Twin Cities Metro',
      totalLots: 75,
      plans: [
        { planName: 'Savanna', floorArea: 2350 },
        { planName: 'Victoria', floorArea: 2650 },
      ],
    },
  ],
  
  constructionManagers: [
    { name: 'Mike Anderson', email: 'manderson@mihomes.com', phone: '(612) 555-1001', title: 'area_construction_manager' },
    { name: 'Sarah Johnson', email: 'sjohnson@mihomes.com', phone: '(612) 555-1002', title: 'construction_manager' },
    { name: 'Tom Peterson', email: 'tpeterson@mihomes.com', phone: '(612) 555-1003', title: 'superintendent' },
  ],
};

// ============================================================================
// Main Seed Function
// ============================================================================

async function seed() {
  console.log('🌱 Starting M/I Homes Twin Cities seed...');
  
  try {
    // ========================================================================
    // CLEANUP: Delete existing M/I Homes seed data for idempotency
    // ========================================================================
    console.log('\n🧹 Cleaning up existing M/I Homes seed data...');
    
    // Step 1: Delete builder (cascades to developments, lots, plans, jobs, test data, photos, QA, tax credits)
    console.log('  🗑️  Deleting M/I Homes builder and all related data...');
    const deletedBuilders = await db.delete(builders)
      .where(eq(builders.name, 'M/I Homes'))
      .returning();
    
    if (deletedBuilders.length > 0) {
      console.log(`     ✅ Deleted builder: M/I Homes (cascade deleted: developments, lots, plans, jobs, test data, photos, QA, tax credits)`);
    } else {
      console.log(`     ℹ️  No existing M/I Homes builder found`);
    }
    
    // Step 2: Delete construction managers by email (unique constraint issue)
    console.log('  🗑️  Deleting M/I Homes construction managers...');
    const deletedCMs = await db.delete(constructionManagers)
      .where(
        or(
          eq(constructionManagers.email, 'manderson@mihomes.com'),
          eq(constructionManagers.email, 'sjohnson@mihomes.com'),
          eq(constructionManagers.email, 'tpeterson@mihomes.com')
        )
      )
      .returning();
    
    if (deletedCMs.length > 0) {
      console.log(`     ✅ Deleted ${deletedCMs.length} construction managers`);
    } else {
      console.log(`     ℹ️  No existing construction managers found`);
    }
    
    // Step 3: Delete seed users by email
    console.log('  🗑️  Deleting seed users...');
    const deletedUsers = await db.delete(users)
      .where(
        or(
          eq(users.email, 'admin@ulrichenergy.com'),
          eq(users.email, 'inspector1@ulrichenergy.com'),
          eq(users.email, 'inspector2@ulrichenergy.com')
        )
      )
      .returning();
    
    if (deletedUsers.length > 0) {
      console.log(`     ✅ Deleted ${deletedUsers.length} seed users`);
    } else {
      console.log(`     ℹ️  No existing seed users found`);
    }
    
    // Step 4: Delete organization by name
    console.log('  🗑️  Deleting Ulrich Energy Auditing organization...');
    const deletedOrgs = await db.delete(organizations)
      .where(eq(organizations.name, 'Ulrich Energy Auditing'))
      .returning();
    
    if (deletedOrgs.length > 0) {
      console.log(`     ✅ Deleted organization: Ulrich Energy Auditing`);
    } else {
      console.log(`     ℹ️  No existing organization found`);
    }
    
    console.log('✅ Cleanup complete! Starting fresh seed...\n');
    
    // ========================================================================
    // SEED: Create fresh M/I Homes data
    // ========================================================================
    
    // Step 1: Create Organization
    console.log('Creating organization...');
    const [org] = await db.insert(organizations).values({
      id: generateUUID(),
      name: 'Ulrich Energy Auditing',
      resnetCertification: 'RESNET-123456',
      primaryContactEmail: 'info@ulrichenergy.com',
      phone: '(612) 555-2000',
      address: '123 Energy St, Minneapolis, MN 55401',
      serviceAreas: ['Twin Cities Metro', 'Greater Minnesota'],
    }).returning();
    
    console.log(`✅ Organization created: ${org.name}`);
    
    // Step 2: Create Users (Admin + 2 Inspectors)
    console.log('Creating users...');
    const adminId = generateUUID();
    const inspector1Id = generateUUID();
    const inspector2Id = generateUUID();
    
    await db.insert(users).values([
      {
        id: adminId,
        email: 'admin@ulrichenergy.com',
        firstName: 'John',
        lastName: 'Ulrich',
        role: 'admin',
      },
      {
        id: inspector1Id,
        email: 'inspector1@ulrichenergy.com',
        firstName: 'David',
        lastName: 'Martinez',
        role: 'inspector',
      },
      {
        id: inspector2Id,
        email: 'inspector2@ulrichenergy.com',
        firstName: 'Emily',
        lastName: 'Chen',
        role: 'inspector',
      },
    ]);
    
    console.log('✅ Users created: 3 (1 admin, 2 inspectors)');
    
    // Step 3: Create M/I Homes Builder
    console.log('Creating M/I Homes builder...');
    const [builder] = await db.insert(builders).values({
      id: generateUUID(),
      name: MI_HOMES_TWIN_CITIES.builder.name,
      companyName: MI_HOMES_TWIN_CITIES.builder.companyName,
      email: MI_HOMES_TWIN_CITIES.builder.email,
      phone: MI_HOMES_TWIN_CITIES.builder.phone,
      address: MI_HOMES_TWIN_CITIES.builder.address,
      status: 'active',
      createdBy: adminId,
    }).returning();
    
    console.log(`✅ Builder created: ${builder.name}`);
    
    // Step 4: Create Builder Contacts
    console.log('Creating builder contacts...');
    await db.insert(builderContacts).values([
      {
        id: generateUUID(),
        builderId: builder.id,
        name: 'Jennifer Williams',
        email: 'jwilliams@mihomes.com',
        phone: '(612) 555-1010',
        role: 'owner',
        isPrimary: true,
        createdBy: adminId,
      },
      {
        id: generateUUID(),
        builderId: builder.id,
        name: 'Robert Thompson',
        email: 'rthompson@mihomes.com',
        phone: '(612) 555-1011',
        role: 'project_manager',
        isPrimary: false,
        createdBy: adminId,
      },
    ]);
    
    console.log('✅ Builder contacts created: 2');
    
    // Step 5: Create Construction Managers
    console.log('Creating construction managers...');
    const cmIds = await db.insert(constructionManagers).values(
      MI_HOMES_TWIN_CITIES.constructionManagers.map(cm => ({
        id: generateUUID(),
        name: cm.name,
        email: cm.email,
        phone: cm.phone,
        title: cm.title,
        createdBy: adminId,
      }))
    ).returning();
    
    console.log(`✅ Construction managers created: ${cmIds.length}`);
    
    // Step 6: Create Developments, Lots, and Plans
    console.log('Creating developments...');
    let totalJobs = 0;
    let totalVisits = 0;
    
    for (const devData of MI_HOMES_TWIN_CITIES.developments) {
      const [dev] = await db.insert(developments).values({
        id: generateUUID(),
        builderId: builder.id,
        name: devData.name,
        municipality: devData.municipality,
        region: devData.region,
        totalLots: devData.totalLots,
        status: 'active',
        createdBy: adminId,
      }).returning();
      
      console.log(`  📍 Development: ${dev.name} (${dev.municipality})`);
      
      // Create plans for this development
      const planIds = await db.insert(plans).values(
        devData.plans.map(planData => ({
          id: generateUUID(),
          builderId: builder.id,
          planName: planData.planName,
          floorArea: planData.floorArea,
        }))
      ).returning();
      
      console.log(`    📐 Plans created: ${planIds.length}`);
      
      // Create lots (10 lots per development)
      const lotsPerDev = 10;
      const lotIds = [];
      
      for (let i = 1; i <= lotsPerDev; i++) {
        const [lot] = await db.insert(lots).values({
          id: generateUUID(),
          developmentId: dev.id,
          lotNumber: `LOT-${i.toString().padStart(3, '0')}`,
          streetAddress: `${1000 + i} ${devData.name} Drive`,
          status: i <= 7 ? 'sold' : 'available',
          createdBy: adminId,
        }).returning();
        
        lotIds.push(lot);
      }
      
      console.log(`    🏘️ Lots created: ${lotIds.length}`);
      
      // Create jobs for sold lots (7 jobs per development)
      const inspectionTypes = ['qa_rough', 'qa_final', 'hers_blower_door'];
      
      for (let i = 0; i < 7; i++) {
        const lot = lotIds[i];
        const plan = randomElement(planIds);
        const inspector = i % 2 === 0 ? inspector1Id : inspector2Id;
        const inspectionType = randomElement(inspectionTypes);
        const cm = randomElement(cmIds);
        
        // Calculate scheduled date (random date in next 30 days)
        const scheduledDate = randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        
        const [job] = await db.insert(jobs).values({
          id: generateUUID(),
          name: `${dev.name} - Lot ${lot.lotNumber}`,
          address: lot.streetAddress || `${1000 + i} ${devData.name} Drive`,
          contractor: builder.companyName,
          builderId: builder.id,
          lotId: lot.id,
          planId: plan.id,
          inspectorId: inspector,
          constructionManagerId: cm.id,
          inspectionType,
          status: i < 3 ? 'done' : 'scheduled',
          scheduledDate,
        }).returning();
        
        totalJobs++;
        
        // Create test data and visits for completed jobs
        if (job.status === 'done') {
          // Create blower door test
          const floorArea = parseFloat(plan.floorArea?.toString() || '2500');
          await db.insert(blowerDoorTests).values({
            id: generateUUID(),
            jobId: job.id,
            testDate: scheduledDate,
            testTime: '10:00',
            houseVolume: floorArea * 8, // Assume 8ft ceilings
            conditionedArea: floorArea,
            numberOfStories: 2,
            basementType: 'conditioned',
            cfm50: 1200 + Math.random() * 500,
            ach50: 2.5 + Math.random() * 1.5,
            notes: 'Test completed successfully',
          });
          
          // Create duct leakage test
          await db.insert(ductLeakageTests).values({
            id: generateUUID(),
            jobId: job.id,
            testDate: scheduledDate,
            testTime: '11:00',
            testType: 'both',
            systemType: 'forced_air',
            conditionedArea: floorArea,
            cfm25Total: 80 + Math.random() * 40,
            cfm25Outside: 40 + Math.random() * 20,
            notes: 'Duct testing completed',
          });
          
          // Create ventilation test
          await db.insert(ventilationTests).values({
            id: generateUUID(),
            jobId: job.id,
            testDate: scheduledDate,
            testTime: '12:00',
            floorArea: floorArea,
            bedrooms: 4,
            notes: 'Ventilation testing completed',
          });
          
          // Create forecast
          await db.insert(forecasts).values({
            id: generateUUID(),
            jobId: job.id,
            planId: plan.id,
            builderId: builder.id,
            conditionedFloorArea: floorArea,
            foundationType: 'slab',
            wallInsulation: 'R-21',
            ceilingInsulation: 'R-49',
            windowsUFactor: 0.28,
            acSEER: 16,
            furnaceAFUE: 96,
            predictedACH50: 2.8,
            predictedTDL: 4.0,
            predictedDLO: 2.0,
          });
          
          totalVisits++;
        }
      }
      
      console.log(`    📋 Jobs created: 7 (${totalJobs} total so far)`);
    }
    
    console.log(`✅ Total jobs created: ${totalJobs}`);
    console.log(`✅ Total visits with test data: ${totalVisits}`);
    
    // Step 7: Create Photos for completed jobs
    console.log('Creating photo records...');
    const completedJobs = await db.query.jobs.findMany({
      where: (jobs, { eq }) => eq(jobs.status, 'done'),
      limit: 5, // Add photos to first 5 completed jobs
    });
    
    const photoTags = [
      'exterior_front',
      'exterior_back',
      'hvac_equipment',
      'ductwork',
      'insulation_attic',
      'windows_exterior',
      'foundation',
      'garage',
    ];
    
    let totalPhotos = 0;
    for (const job of completedJobs) {
      const photoCount = 3; // 3 photos per job
      
      for (let i = 0; i < photoCount; i++) {
        await db.insert(photos).values({
          id: generateUUID(),
          jobId: job.id,
          filePath: `photos/job_${job.id}_photo_${i + 1}.jpg`,
          thumbnailPath: `photos/thumbnails/job_${job.id}_photo_${i + 1}.jpg`,
          fullUrl: `https://storage.googleapis.com/photos/job_${job.id}_photo_${i + 1}.jpg`,
          tags: [randomElement(photoTags), randomElement(photoTags)],
          caption: `Photo ${i + 1} for job ${job.id}`,
        });
        totalPhotos++;
      }
    }
    
    console.log(`✅ Photos created: ${totalPhotos}`);
    
    // Step 8: Create QA Inspection Scores
    console.log('Creating QA inspection scores...');
    
    for (let i = 0; i < 5; i++) {
      const job = randomElement(completedJobs);
      const totalScore = 85 + Math.floor(Math.random() * 15); // 85-99 score
      const percentage = totalScore; // Since maxScore is 100
      const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : 'C';
      
      await db.insert(qaInspectionScores).values({
        id: generateUUID(),
        jobId: job.id,
        inspectorId: inspector1Id,
        totalScore: totalScore.toString(),
        maxScore: '100',
        percentage: percentage.toString(),
        grade,
        reviewNotes: `QA review completed for job ${job.id}`,
      });
    }
    
    console.log('✅ QA inspection scores created: 5');
    
    // Step 9: Create 45L Tax Credit Projects
    console.log('Creating 45L tax credit projects...');
    
    await db.insert(taxCreditProjects).values([
      {
        id: generateUUID(),
        builderId: builder.id,
        projectName: '2024 ENERGY STAR Certification - Rush Hollow North',
        projectType: 'single-family',
        taxYear: 2024,
        totalUnits: 25,
        qualifiedUnits: 25,
        status: 'certified',
        createdBy: adminId,
      },
      {
        id: generateUUID(),
        builderId: builder.id,
        projectName: '2024 ENERGY STAR Certification - Valley Crest',
        projectType: 'single-family',
        taxYear: 2024,
        totalUnits: 18,
        qualifiedUnits: 16,
        status: 'pending',
        createdBy: adminId,
      },
    ]);
    
    console.log('✅ 45L tax credit projects created: 2');
    
    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Organization: 1`);
    console.log(`   - Users: 3`);
    console.log(`   - Builder: 1 (M/I Homes)`);
    console.log(`   - Construction Managers: ${cmIds.length}`);
    console.log(`   - Developments: ${MI_HOMES_TWIN_CITIES.developments.length}`);
    console.log(`   - Plans: ${MI_HOMES_TWIN_CITIES.developments.reduce((acc, d) => acc + d.plans.length, 0)}`);
    console.log(`   - Lots: ${MI_HOMES_TWIN_CITIES.developments.length * 10}`);
    console.log(`   - Jobs: ${totalJobs}`);
    console.log(`   - Visits with test data: ${totalVisits}`);
    console.log(`   - Photos: ${totalPhotos}`);
    console.log(`   - QA Items: 5`);
    console.log(`   - 45L Projects: 2`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run seed
seed();
