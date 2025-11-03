/**
 * M/I Homes Twin Cities Seed Data
 * 
 * Creates realistic seed data for M/I Homes developments across Twin Cities:
 * - 5 Twin Cities communities
 * - 50 jobs (various HERS inspection types)
 * - 15 field visits with photos (1 photo per completed job)
 * - 5 QA items
 * - 2 45L tax credit cases
 * 
 * Usage: 
 *   tsx scripts/seed-mi-homes.ts           # Run with upsert (idempotent)
 *   tsx scripts/seed-mi-homes.ts --cleanup # Clean all data, then seed fresh
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
import { sql, eq, or, and } from 'drizzle-orm';

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
// Cleanup Function
// ============================================================================

/**
 * Cleanup function to delete all M/I Homes seed data in proper CASCADE order.
 * This ensures idempotency by removing existing data before re-seeding.
 */
async function cleanup() {
  console.log('\n🧹 Starting cleanup of M/I Homes seed data...');
  
  try {
    // Step 1: Delete tax credit projects (no dependencies)
    console.log('  🗑️  Deleting tax credit projects...');
    const deletedTC = await db.delete(taxCreditProjects)
      .where(sql`${taxCreditProjects.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes')`)
      .returning();
    console.log(`     ${deletedTC.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedTC.length} tax credit projects`);
    
    // Step 2: Delete QA inspection scores (depends on jobs)
    console.log('  🗑️  Deleting QA inspection scores...');
    const deletedQA = await db.delete(qaInspectionScores)
      .where(sql`${qaInspectionScores.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes'))`)
      .returning();
    console.log(`     ${deletedQA.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedQA.length} QA inspection scores`);
    
    // Step 3: Delete photos (depends on jobs)
    console.log('  🗑️  Deleting photos...');
    const deletedPhotos = await db.delete(photos)
      .where(sql`${photos.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes'))`)
      .returning();
    console.log(`     ${deletedPhotos.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedPhotos.length} photos`);
    
    // Step 4: Delete test data (depends on jobs)
    console.log('  🗑️  Deleting forecasts...');
    const deletedForecasts = await db.delete(forecasts)
      .where(sql`${forecasts.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes'))`)
      .returning();
    console.log(`     ${deletedForecasts.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedForecasts.length} forecasts`);
    
    console.log('  🗑️  Deleting ventilation tests...');
    const deletedVent = await db.delete(ventilationTests)
      .where(sql`${ventilationTests.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes'))`)
      .returning();
    console.log(`     ${deletedVent.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedVent.length} ventilation tests`);
    
    console.log('  🗑️  Deleting duct leakage tests...');
    const deletedDuct = await db.delete(ductLeakageTests)
      .where(sql`${ductLeakageTests.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes'))`)
      .returning();
    console.log(`     ${deletedDuct.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedDuct.length} duct leakage tests`);
    
    console.log('  🗑️  Deleting blower door tests...');
    const deletedBlower = await db.delete(blowerDoorTests)
      .where(sql`${blowerDoorTests.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes'))`)
      .returning();
    console.log(`     ${deletedBlower.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedBlower.length} blower door tests`);
    
    // Step 5: Delete jobs (CASCADE will handle remaining dependencies)
    console.log('  🗑️  Deleting jobs...');
    const deletedJobs = await db.delete(jobs)
      .where(sql`${jobs.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes')`)
      .returning();
    console.log(`     ${deletedJobs.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedJobs.length} jobs`);
    
    // Step 6: Delete lots (depends on developments)
    console.log('  🗑️  Deleting lots...');
    const deletedLots = await db.delete(lots)
      .where(sql`${lots.developmentId} IN (SELECT id FROM ${developments} WHERE ${developments.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes'))`)
      .returning();
    console.log(`     ${deletedLots.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedLots.length} lots`);
    
    // Step 7: Delete plans (depends on builder)
    console.log('  🗑️  Deleting plans...');
    const deletedPlans = await db.delete(plans)
      .where(sql`${plans.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes')`)
      .returning();
    console.log(`     ${deletedPlans.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedPlans.length} plans`);
    
    // Step 8: Delete developments (depends on builder)
    console.log('  🗑️  Deleting developments...');
    const deletedDevs = await db.delete(developments)
      .where(sql`${developments.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes')`)
      .returning();
    console.log(`     ${deletedDevs.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedDevs.length} developments`);
    
    // Step 9: Delete construction managers (unique email constraint)
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
    console.log(`     ${deletedCMs.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedCMs.length} construction managers`);
    
    // Step 10: Delete builder contacts (depends on builder)
    console.log('  🗑️  Deleting builder contacts...');
    const deletedContacts = await db.delete(builderContacts)
      .where(sql`${builderContacts.builderId} IN (SELECT id FROM ${builders} WHERE name = 'M/I Homes')`)
      .returning();
    console.log(`     ${deletedContacts.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedContacts.length} builder contacts`);
    
    // Step 11: Delete builder (CASCADE handles remaining)
    console.log('  🗑️  Deleting M/I Homes builder...');
    const deletedBuilders = await db.delete(builders)
      .where(eq(builders.name, 'M/I Homes'))
      .returning();
    console.log(`     ${deletedBuilders.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedBuilders.length} builder(s)`);
    
    // Step 12: Delete seed users (unique email constraint)
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
    console.log(`     ${deletedUsers.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedUsers.length} seed users`);
    
    // Step 13: Delete organization (unique primaryContactEmail constraint)
    console.log('  🗑️  Deleting Ulrich Energy Auditing organization...');
    const deletedOrgs = await db.delete(organizations)
      .where(eq(organizations.name, 'Ulrich Energy Auditing'))
      .returning();
    console.log(`     ${deletedOrgs.length > 0 ? '✅' : 'ℹ️ '} Deleted ${deletedOrgs.length} organization(s)`);
    
    console.log('✅ Cleanup complete!\n');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
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
// Main Seed Function with Upsert Logic
// ============================================================================

async function seed() {
  console.log('🌱 Starting M/I Homes Twin Cities seed...');
  
  try {
    // Step 1: Upsert Organization
    console.log('\n📦 Upserting organization...');
    const existingOrg = await db.select().from(organizations)
      .where(eq(organizations.name, 'Ulrich Energy Auditing'))
      .limit(1);
    
    let org;
    if (existingOrg.length > 0) {
      org = existingOrg[0];
      console.log('   ✓ Organization already exists, reusing...');
    } else {
      [org] = await db.insert(organizations).values({
        id: generateUUID(),
        name: 'Ulrich Energy Auditing',
        resnetCertification: 'RESNET-123456',
        primaryContactEmail: 'info@ulrichenergy.com',
        phone: '(612) 555-2000',
        address: '123 Energy St, Minneapolis, MN 55401',
        serviceAreas: ['Twin Cities Metro', 'Greater Minnesota'],
      }).returning();
      console.log('   ✅ Organization created');
    }
    
    // Step 2: Upsert Users (Admin + 2 Inspectors)
    console.log('\n📦 Upserting users...');
    
    // Admin user
    const existingAdmin = await db.select().from(users)
      .where(eq(users.email, 'admin@ulrichenergy.com'))
      .limit(1);
    
    let adminId;
    if (existingAdmin.length > 0) {
      adminId = existingAdmin[0].id;
      console.log('   ✓ Admin user already exists, reusing...');
    } else {
      adminId = generateUUID();
      await db.insert(users).values({
        id: adminId,
        email: 'admin@ulrichenergy.com',
        firstName: 'John',
        lastName: 'Ulrich',
        role: 'admin',
      });
      console.log('   ✅ Admin user created');
    }
    
    // Inspector 1
    const existingInspector1 = await db.select().from(users)
      .where(eq(users.email, 'inspector1@ulrichenergy.com'))
      .limit(1);
    
    let inspector1Id;
    if (existingInspector1.length > 0) {
      inspector1Id = existingInspector1[0].id;
      console.log('   ✓ Inspector 1 already exists, reusing...');
    } else {
      inspector1Id = generateUUID();
      await db.insert(users).values({
        id: inspector1Id,
        email: 'inspector1@ulrichenergy.com',
        firstName: 'David',
        lastName: 'Martinez',
        role: 'inspector',
      });
      console.log('   ✅ Inspector 1 created');
    }
    
    // Inspector 2
    const existingInspector2 = await db.select().from(users)
      .where(eq(users.email, 'inspector2@ulrichenergy.com'))
      .limit(1);
    
    let inspector2Id;
    if (existingInspector2.length > 0) {
      inspector2Id = existingInspector2[0].id;
      console.log('   ✓ Inspector 2 already exists, reusing...');
    } else {
      inspector2Id = generateUUID();
      await db.insert(users).values({
        id: inspector2Id,
        email: 'inspector2@ulrichenergy.com',
        firstName: 'Emily',
        lastName: 'Chen',
        role: 'inspector',
      });
      console.log('   ✅ Inspector 2 created');
    }
    
    // Step 3: Upsert M/I Homes Builder
    console.log('\n📦 Upserting M/I Homes builder...');
    const existingBuilder = await db.select().from(builders)
      .where(eq(builders.name, 'M/I Homes'))
      .limit(1);
    
    let builder;
    if (existingBuilder.length > 0) {
      builder = existingBuilder[0];
      console.log('   ✓ Builder already exists, reusing...');
      
      // Clean up existing developments, lots, jobs, photos, test data, QA, and tax credits
      // to prevent duplicates when re-seeding
      console.log('   🧹 Cleaning existing builder-related data to prevent duplicates...');
      
      // Delete in proper CASCADE order
      await db.delete(taxCreditProjects)
        .where(eq(taxCreditProjects.builderId, builder.id));
      
      await db.delete(qaInspectionScores)
        .where(sql`${qaInspectionScores.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} = ${builder.id})`);
      
      await db.delete(photos)
        .where(sql`${photos.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} = ${builder.id})`);
      
      await db.delete(forecasts)
        .where(sql`${forecasts.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} = ${builder.id})`);
      
      await db.delete(ventilationTests)
        .where(sql`${ventilationTests.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} = ${builder.id})`);
      
      await db.delete(ductLeakageTests)
        .where(sql`${ductLeakageTests.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} = ${builder.id})`);
      
      await db.delete(blowerDoorTests)
        .where(sql`${blowerDoorTests.jobId} IN (SELECT id FROM ${jobs} WHERE ${jobs.builderId} = ${builder.id})`);
      
      await db.delete(jobs)
        .where(eq(jobs.builderId, builder.id));
      
      await db.delete(lots)
        .where(sql`${lots.developmentId} IN (SELECT id FROM ${developments} WHERE ${developments.builderId} = ${builder.id})`);
      
      await db.delete(plans)
        .where(eq(plans.builderId, builder.id));
      
      await db.delete(developments)
        .where(eq(developments.builderId, builder.id));
      
      console.log('   ✅ Cleaned builder-related data');
    } else {
      [builder] = await db.insert(builders).values({
        id: generateUUID(),
        name: MI_HOMES_TWIN_CITIES.builder.name,
        companyName: MI_HOMES_TWIN_CITIES.builder.companyName,
        email: MI_HOMES_TWIN_CITIES.builder.email,
        phone: MI_HOMES_TWIN_CITIES.builder.phone,
        address: MI_HOMES_TWIN_CITIES.builder.address,
        status: 'active',
        createdBy: adminId,
      }).returning();
      console.log('   ✅ Builder created');
    }
    
    // Step 4: Upsert Builder Contacts
    console.log('\n📦 Upserting builder contacts...');
    
    // Upsert contact 1
    const existingContact1 = await db.select().from(builderContacts)
      .where(eq(builderContacts.email, 'jwilliams@mihomes.com'))
      .limit(1);
    
    if (existingContact1.length === 0) {
      await db.insert(builderContacts).values({
        id: generateUUID(),
        builderId: builder.id,
        name: 'Jennifer Williams',
        email: 'jwilliams@mihomes.com',
        phone: '(612) 555-1010',
        role: 'owner',
        isPrimary: true,
        createdBy: adminId,
      });
      console.log('   ✅ Contact 1 created');
    } else {
      console.log('   ✓ Contact 1 already exists, skipping...');
    }
    
    // Upsert contact 2
    const existingContact2 = await db.select().from(builderContacts)
      .where(eq(builderContacts.email, 'rthompson@mihomes.com'))
      .limit(1);
    
    if (existingContact2.length === 0) {
      await db.insert(builderContacts).values({
        id: generateUUID(),
        builderId: builder.id,
        name: 'Robert Thompson',
        email: 'rthompson@mihomes.com',
        phone: '(612) 555-1011',
        role: 'project_manager',
        isPrimary: false,
        createdBy: adminId,
      });
      console.log('   ✅ Contact 2 created');
    } else {
      console.log('   ✓ Contact 2 already exists, skipping...');
    }
    
    // Step 5: Upsert Construction Managers
    console.log('\n📦 Upserting construction managers...');
    const cmIds = [];
    
    for (const cm of MI_HOMES_TWIN_CITIES.constructionManagers) {
      const existingCM = await db.select().from(constructionManagers)
        .where(eq(constructionManagers.email, cm.email))
        .limit(1);
      
      if (existingCM.length > 0) {
        cmIds.push(existingCM[0]);
        console.log(`   ✓ CM ${cm.name} already exists, reusing...`);
      } else {
        const [newCM] = await db.insert(constructionManagers).values({
          id: generateUUID(),
          name: cm.name,
          email: cm.email,
          phone: cm.phone,
          title: cm.title,
          createdBy: adminId,
        }).returning();
        cmIds.push(newCM);
        console.log(`   ✅ CM ${cm.name} created`);
      }
    }
    
    // Step 6: Upsert Developments, Lots, and Plans
    console.log('\n📦 Upserting developments...');
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
    
    // Step 7: Create Photos for completed jobs (1 photo per completed job)
    console.log('\n📦 Creating photo records...');
    const completedJobs = await db.query.jobs.findMany({
      where: (jobs, { eq }) => eq(jobs.status, 'done'),
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
      // Create 1 photo per completed job
      await db.insert(photos).values({
        id: generateUUID(),
        jobId: job.id,
        filePath: `photos/job_${job.id}_photo_1.jpg`,
        thumbnailPath: `photos/thumbnails/job_${job.id}_photo_1.jpg`,
        fullUrl: `https://storage.googleapis.com/photos/job_${job.id}_photo_1.jpg`,
        tags: [randomElement(photoTags), randomElement(photoTags)],
        caption: `Photo for job ${job.id}`,
      });
      totalPhotos++;
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
  }
}

// ============================================================================
// CLI Execution
// ============================================================================

async function main() {
  try {
    // Parse CLI arguments
    const args = process.argv.slice(2);
    const shouldCleanup = args.includes('--cleanup');
    
    if (shouldCleanup) {
      console.log('🔧 Cleanup mode enabled');
      await cleanup();
    }
    
    // Run seed
    await seed();
    
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run main
main();
