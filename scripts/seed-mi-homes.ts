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
  qaItems,
  taxCreditProjects,
  blowerDoorTests,
  ductLeakageTests,
  ventilationTests,
  forecasts,
} from '../shared/schema';
import { sql } from 'drizzle-orm';

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
    name: 'M/I Homes of Minnesota',
    taxId: '31-0123456',
    website: 'https://www.mihomes.com',
    primaryContactEmail: 'minnesota@mihomes.com',
    primaryContactPhone: '(612) 555-1000',
    address: '5775 Wayzata Blvd, Suite 700, Minneapolis, MN 55416',
  },
  
  developments: [
    {
      name: 'Rush Hollow North',
      city: 'Maple Grove',
      state: 'MN',
      zipCode: '55311',
      lat: 45.0724,
      lon: -93.4557,
      totalLots: 120,
      plans: [
        { name: 'Alexander', sqft: 2850, bedrooms: 4, bathrooms: 3.5, garageSize: 2, basementType: 'walkout' },
        { name: 'Victoria', sqft: 3100, bedrooms: 5, bathrooms: 4, garageSize: 3, basementType: 'walkout' },
        { name: 'Camden', sqft: 2450, bedrooms: 3, bathrooms: 2.5, garageSize: 2, basementType: 'standard' },
      ],
    },
    {
      name: 'Valley Crest',
      city: 'Shakopee',
      state: 'MN',
      zipCode: '55379',
      lat: 44.7973,
      lon: -93.5266,
      totalLots: 85,
      plans: [
        { name: 'Columbia', sqft: 2650, bedrooms: 4, bathrooms: 3, garageSize: 2, basementType: 'standard' },
        { name: 'Hudson', sqft: 3300, bedrooms: 5, bathrooms: 4.5, garageSize: 3, basementType: 'walkout' },
      ],
    },
    {
      name: 'Oneka Shores',
      city: 'Hugo',
      state: 'MN',
      zipCode: '55038',
      lat: 45.1394,
      lon: -92.9944,
      totalLots: 95,
      plans: [
        { name: 'Birchwood II', sqft: 2750, bedrooms: 4, bathrooms: 3, garageSize: 2, basementType: 'walkout' },
        { name: 'Cedarwood', sqft: 2950, bedrooms: 4, bathrooms: 3.5, garageSize: 3, basementType: 'walkout' },
      ],
    },
    {
      name: 'Amber Fields',
      city: 'Rosemount',
      state: 'MN',
      zipCode: '55068',
      lat: 44.7394,
      lon: -93.1258,
      totalLots: 65,
      plans: [
        { name: 'Grayson', sqft: 2500, bedrooms: 3, bathrooms: 2.5, garageSize: 2, basementType: 'standard' },
        { name: 'Willow II', sqft: 2850, bedrooms: 4, bathrooms: 3.5, garageSize: 2, basementType: 'walkout' },
      ],
    },
    {
      name: 'Towns at Fox Creek',
      city: 'Rogers',
      state: 'MN',
      zipCode: '55374',
      lat: 45.1889,
      lon: -93.5833,
      totalLots: 75,
      plans: [
        { name: 'Savanna', sqft: 2350, bedrooms: 3, bathrooms: 2.5, garageSize: 2, basementType: 'standard' },
        { name: 'Victoria', sqft: 2650, bedrooms: 4, bathrooms: 3, garageSize: 2, basementType: 'standard' },
      ],
    },
  ],
  
  constructionManagers: [
    { name: 'Mike Anderson', email: 'manderson@mihomes.com', phone: '(612) 555-1001', role: 'Senior Construction Manager' },
    { name: 'Sarah Johnson', email: 'sjohnson@mihomes.com', phone: '(612) 555-1002', role: 'Construction Manager' },
    { name: 'Tom Peterson', email: 'tpeterson@mihomes.com', phone: '(612) 555-1003', role: 'Site Superintendent' },
  ],
};

// ============================================================================
// Main Seed Function
// ============================================================================

async function seed() {
  console.log('🌱 Starting M/I Homes Twin Cities seed...');
  
  try {
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
      taxId: MI_HOMES_TWIN_CITIES.builder.taxId,
      website: MI_HOMES_TWIN_CITIES.builder.website,
      primaryContactEmail: MI_HOMES_TWIN_CITIES.builder.primaryContactEmail,
      primaryContactPhone: MI_HOMES_TWIN_CITIES.builder.primaryContactPhone,
      address: MI_HOMES_TWIN_CITIES.builder.address,
      status: 'active',
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
        role: 'Regional Director',
        isPrimary: true,
      },
      {
        id: generateUUID(),
        builderId: builder.id,
        name: 'Robert Thompson',
        email: 'rthompson@mihomes.com',
        phone: '(612) 555-1011',
        role: 'Quality Manager',
        isPrimary: false,
      },
    ]);
    
    console.log('✅ Builder contacts created: 2');
    
    // Step 5: Create Construction Managers
    console.log('Creating construction managers...');
    const cmIds = await db.insert(constructionManagers).values(
      MI_HOMES_TWIN_CITIES.constructionManagers.map(cm => ({
        id: generateUUID(),
        builderId: builder.id,
        name: cm.name,
        email: cm.email,
        phone: cm.phone,
        role: cm.role,
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
        city: devData.city,
        state: devData.state,
        zipCode: devData.zipCode,
        lat: devData.lat,
        lon: devData.lon,
        status: 'active',
      }).returning();
      
      console.log(`  📍 Development: ${dev.name} (${dev.city}, ${dev.state})`);
      
      // Create plans for this development
      const planIds = await db.insert(plans).values(
        devData.plans.map(planData => ({
          id: generateUUID(),
          builderId: builder.id,
          name: planData.name,
          sqft: planData.sqft,
          bedrooms: planData.bedrooms,
          bathrooms: planData.bathrooms,
          garageSize: planData.garageSize,
          basementType: planData.basementType,
          status: 'active',
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
          address: `${1000 + i} ${devData.name} Drive`,
          city: dev.city,
          state: dev.state,
          zipCode: dev.zipCode,
          status: i <= 7 ? 'sold' : 'available',
        }).returning();
        
        lotIds.push(lot);
      }
      
      console.log(`    🏘️ Lots created: ${lotIds.length}`);
      
      // Create jobs for sold lots (7 jobs per development)
      const jobTypes = ['Rough', 'Final', 'Verification'];
      
      for (let i = 0; i < 7; i++) {
        const lot = lotIds[i];
        const plan = randomElement(planIds);
        const inspector = i % 2 === 0 ? inspector1Id : inspector2Id;
        const jobType = randomElement(jobTypes);
        const cm = randomElement(cmIds);
        
        // Calculate scheduled date (random date in next 30 days)
        const scheduledDate = randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        
        const [job] = await db.insert(jobs).values({
          id: generateUUID(),
          builderId: builder.id,
          lotId: lot.id,
          planId: plan.id,
          inspectorId: inspector,
          constructionManagerId: cm.id,
          jobType,
          status: i < 3 ? 'done' : 'scheduled',
          scheduledDate,
          address: lot.address,
          city: lot.city,
          state: lot.state,
          zipCode: lot.zipCode,
        }).returning();
        
        totalJobs++;
        
        // Create test data and visits for completed jobs
        if (job.status === 'done') {
          // Create blower door test
          await db.insert(blowerDoorTests).values({
            id: generateUUID(),
            jobId: job.id,
            buildingVolume: plan.sqft * 8, // Assume 8ft ceilings
            cfm50: 1200 + Math.random() * 500,
            ach50: 2.5 + Math.random() * 1.5,
            surface6: plan.sqft * 8 * 6,
            testDate: scheduledDate.toISOString(),
            weatherConditions: 'Clear, 65°F',
            equipment: 'TEC DG-1000',
            notes: 'Test completed successfully',
          });
          
          // Create duct leakage test
          await db.insert(ductLeakageTests).values({
            id: generateUUID(),
            jobId: job.id,
            totalDuctLeakage: 80 + Math.random() * 40,
            leakageToOutside: 40 + Math.random() * 20,
            testDate: scheduledDate.toISOString(),
            equipment: 'TEC DG-1000',
            notes: 'Duct testing completed',
          });
          
          // Create ventilation test
          await db.insert(ventilationTests).values({
            id: generateUUID(),
            jobId: job.id,
            exhaustFanFlow: 50 + Math.random() * 20,
            supplyFanFlow: 60 + Math.random() * 20,
            testDate: scheduledDate.toISOString(),
            equipment: 'Dwyer 475 Mark III',
            notes: 'Ventilation testing completed',
          });
          
          // Create forecast
          await db.insert(forecasts).values({
            id: generateUUID(),
            jobId: job.id,
            planId: plan.id,
            builderId: builder.id,
            conditionedFloorArea: plan.sqft,
            foundationType: plan.basementType === 'walkout' ? 'walkout_basement' : 'slab',
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
          filename: `job_${job.id}_photo_${i + 1}.jpg`,
          url: `https://storage.googleapis.com/photos/job_${job.id}_photo_${i + 1}.jpg`,
          thumbnailUrl: `https://storage.googleapis.com/photos/thumbnails/job_${job.id}_photo_${i + 1}.jpg`,
          tags: [randomElement(photoTags), randomElement(photoTags)],
          capturedAt: new Date(),
        });
        totalPhotos++;
      }
    }
    
    console.log(`✅ Photos created: ${totalPhotos}`);
    
    // Step 8: Create QA Items
    console.log('Creating QA items...');
    const qaCategories = ['Missing Photo', 'Incorrect Measurement', 'Equipment Calibration', 'Report Error', 'Documentation'];
    const severities = ['low', 'medium', 'high'];
    
    for (let i = 0; i < 5; i++) {
      const job = randomElement(completedJobs);
      await db.insert(qaItems).values({
        id: generateUUID(),
        jobId: job.id,
        builderId: builder.id,
        category: randomElement(qaCategories),
        severity: randomElement(severities),
        description: `QA issue found during review of job ${job.id}`,
        assignedTo: inspector1Id,
        status: i < 2 ? 'resolved' : 'open',
        createdBy: adminId,
      });
    }
    
    console.log('✅ QA items created: 5');
    
    // Step 9: Create 45L Tax Credit Projects
    console.log('Creating 45L tax credit projects...');
    
    await db.insert(taxCreditProjects).values([
      {
        id: generateUUID(),
        builderId: builder.id,
        projectName: '2024 ENERGY STAR Certification - Rush Hollow North',
        year: 2024,
        programType: '45L',
        totalUnits: 25,
        certifiedUnits: 25,
        status: 'docs_complete',
        documents: JSON.stringify([
          { name: 'HERS_Ratings.pdf', url: 'https://storage.googleapis.com/docs/hers_ratings.pdf' },
          { name: 'Builder_Certification.pdf', url: 'https://storage.googleapis.com/docs/builder_cert.pdf' },
        ]),
      },
      {
        id: generateUUID(),
        builderId: builder.id,
        projectName: '2024 ENERGY STAR Certification - Valley Crest',
        year: 2024,
        programType: '45L',
        totalUnits: 18,
        certifiedUnits: 16,
        status: 'awaiting_builder_signoff',
        documents: JSON.stringify([
          { name: 'HERS_Ratings.pdf', url: 'https://storage.googleapis.com/docs/hers_ratings_vc.pdf' },
        ]),
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
