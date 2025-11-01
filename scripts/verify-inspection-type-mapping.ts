#!/usr/bin/env tsx
/**
 * Verification Script: Inspection Type Mapping
 * 
 * This script verifies that all inspection type values stored in the database
 * can be successfully normalized using the LEGACY_INSPECTION_TYPE_MAP.
 */

import { db } from '../server/db';
import { builderAgreements } from '../shared/schema';
import { sql } from 'drizzle-orm';
import { normalizeInspectionType, getInspectionTypeLabel } from '../shared/inspectionTypes';

interface InspectionTypeStats {
  originalValue: string;
  normalizedValue: string;
  label: string;
  occurrences: number;
  isValid: boolean;
}

async function verifyInspectionTypeMappings() {
  console.log('🔍 Verifying Inspection Type Mappings\n');
  console.log('=' .repeat(80));

  try {
    // Query all unique inspection types from stored data
    const result = await db.execute(sql`
      SELECT DISTINCT unnest(inspection_types_included) as inspection_type
      FROM builder_agreements
      WHERE inspection_types_included IS NOT NULL
      ORDER BY inspection_type
    `);

    const uniqueTypes = result.rows.map((row: any) => row.inspection_type);

    console.log(`\nFound ${uniqueTypes.length} unique inspection type(s) in database:\n`);

    const stats: InspectionTypeStats[] = [];
    const validEnumValues = [
      'sv2', 'full_test', 'code_bdoor', 'rough_duct', 'rehab',
      'bdoor_retest', 'multifamily', 'energy_star', 'other'
    ];

    // Test each unique type
    for (const originalValue of uniqueTypes) {
      const normalizedValue = normalizeInspectionType(originalValue);
      const label = getInspectionTypeLabel(originalValue);
      
      // Count occurrences
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM builder_agreements
        WHERE ${sql.raw(`'${originalValue}' = ANY(inspection_types_included)`)}
      `);
      const occurrences = parseInt((countResult.rows[0] as any).count);
      
      const isValid = validEnumValues.includes(normalizedValue);

      stats.push({
        originalValue,
        normalizedValue,
        label,
        occurrences,
        isValid
      });

      const statusIcon = isValid ? '✅' : '❌';
      console.log(`${statusIcon} "${originalValue}"`);
      console.log(`   → Normalizes to: "${normalizedValue}"`);
      console.log(`   → Display label: "${label}"`);
      console.log(`   → Occurrences: ${occurrences}`);
      console.log(`   → Valid enum: ${isValid ? 'YES' : 'NO'}\n`);
    }

    // Summary
    console.log('=' .repeat(80));
    console.log('\n📊 Summary:\n');
    
    const allValid = stats.every(s => s.isValid);
    const totalOccurrences = stats.reduce((sum, s) => sum + s.occurrences, 0);
    
    console.log(`Total unique types: ${stats.length}`);
    console.log(`Valid mappings: ${stats.filter(s => s.isValid).length}`);
    console.log(`Invalid mappings: ${stats.filter(s => !s.isValid).length}`);
    console.log(`Total occurrences: ${totalOccurrences}`);
    
    if (allValid) {
      console.log('\n✅ SUCCESS: All inspection types normalize correctly!');
    } else {
      console.log('\n❌ FAILURE: Some inspection types do not normalize to valid enum values!');
      console.log('\nInvalid types:');
      stats.filter(s => !s.isValid).forEach(s => {
        console.log(`   - "${s.originalValue}" → "${s.normalizedValue}"`);
      });
    }

    // Test case-insensitive matching
    console.log('\n=' .repeat(80));
    console.log('\n🧪 Testing Case-Insensitive Matching:\n');
    
    const testCases = [
      'FINAL',
      'Final',
      'final',
      'ROUGH',
      'Rough',
      'rough',
      'FINAL TESTING',
      'Final Testing',
      'final testing',
      'PRE-DRYWALL',
      'Pre-Drywall',
      'pre-drywall',
    ];

    for (const testValue of testCases) {
      const normalized = normalizeInspectionType(testValue);
      const label = getInspectionTypeLabel(testValue);
      console.log(`"${testValue}" → "${normalized}" (${label})`);
    }

    console.log('\n=' .repeat(80));
    
    process.exit(allValid ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  }
}

verifyInspectionTypeMappings();
