import { db } from './db';
import { expenseCategories, mileageRateHistory, builderRateCards, builders } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Seed script for financial data
 * Creates initial expense categories, IRS mileage rates, and builder rate cards
 */
async function seedFinancialData() {
  console.log('Starting financial data seed...');

  try {
    // 1. Create expense categories with colors and icons
    const categories = [
      {
        name: 'Fuel',
        color: '#EF4444', // red
        icon: 'Fuel'
      },
      {
        name: 'Equipment',
        color: '#3B82F6', // blue
        icon: 'Wrench'
      },
      {
        name: 'Tolls',
        color: '#8B5CF6', // purple
        icon: 'DollarSign'
      },
      {
        name: 'Meals',
        color: '#10B981', // green
        icon: 'UtensilsCrossed'
      },
      {
        name: 'Supplies',
        color: '#F59E0B', // amber
        icon: 'Package'
      },
      {
        name: 'Other',
        color: '#6B7280', // gray
        icon: 'MoreHorizontal'
      }
    ];

    console.log('Inserting expense categories...');
    for (const category of categories) {
      await db.insert(expenseCategories)
        .values(category)
        .onConflictDoNothing();
    }
    console.log(`✓ Created ${categories.length} expense categories`);

    // 2. Create IRS mileage rate for 2025
    console.log('Inserting IRS mileage rate...');
    await db.insert(mileageRateHistory)
      .values({
        effectiveDate: new Date('2025-01-01'),
        ratePerMile: '0.700',
        notes: 'IRS standard mileage rate for 2025'
      })
      .onConflictDoNothing();
    console.log('✓ Created 2025 IRS mileage rate ($0.70/mile)');

    // 3. Create builder rate cards for common job types
    // First, get Building Knowledge builder ID
    const buildingKnowledgeBuilder = await db
      .select()
      .from(builders)
      .where(sql`${builders.name} ILIKE '%building knowledge%'`)
      .limit(1);

    if (buildingKnowledgeBuilder.length > 0) {
      const builderId = buildingKnowledgeBuilder[0].id;
      
      const rateCards = [
        {
          builderId,
          jobType: 'sv2',
          baseRate: '125.00',
          volumeTierStart: 0,
          volumeDiscount: '0.00',
          effectiveStartDate: new Date('2025-01-01'),
          effectiveEndDate: null,
          billingCodes: { rush: 50, weekend: 75 }
        },
        {
          builderId,
          jobType: 'full_test',
          baseRate: '225.00',
          volumeTierStart: 0,
          volumeDiscount: '0.00',
          effectiveStartDate: new Date('2025-01-01'),
          effectiveEndDate: null,
          billingCodes: { rush: 75, weekend: 100 }
        },
        {
          builderId,
          jobType: 'code_bdoor',
          baseRate: '175.00',
          volumeTierStart: 0,
          volumeDiscount: '0.00',
          effectiveStartDate: new Date('2025-01-01'),
          effectiveEndDate: null,
          billingCodes: { rush: 60, weekend: 85 }
        },
        // Volume tier examples
        {
          builderId,
          jobType: 'sv2',
          baseRate: '120.00',
          volumeTierStart: 20,
          volumeDiscount: '4.00',
          effectiveStartDate: new Date('2025-01-01'),
          effectiveEndDate: null,
          billingCodes: { rush: 50, weekend: 75 }
        },
        {
          builderId,
          jobType: 'sv2',
          baseRate: '115.00',
          volumeTierStart: 50,
          volumeDiscount: '8.00',
          effectiveStartDate: new Date('2025-01-01'),
          effectiveEndDate: null,
          billingCodes: { rush: 50, weekend: 75 }
        }
      ];

      console.log('Inserting builder rate cards...');
      for (const rateCard of rateCards) {
        await db.insert(builderRateCards)
          .values(rateCard)
          .onConflictDoNothing();
      }
      console.log(`✓ Created ${rateCards.length} builder rate cards for Building Knowledge`);
    } else {
      console.log('⚠ Building Knowledge builder not found, skipping rate cards');
    }

    console.log('\n✅ Financial data seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding financial data:', error);
    throw error;
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFinancialData()
    .then(() => {
      console.log('Seed completed, exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

export { seedFinancialData };
