#!/usr/bin/env node
import { config } from 'dotenv';
config();

// Import storage system
import('../server/storage.js')
  .then(async ({ storage }) => {
    console.log('===== Testing User Integrity Checks =====\n');
    
    // Test 1: Check critical admin user
    console.log('1. Checking critical admin user (shaun.ulrich@ulrichenergyauditing.com)...');
    const adminUser = await storage.getUserByEmail('shaun.ulrich@ulrichenergyauditing.com');
    if (adminUser) {
      console.log('   ✓ Found admin user:');
      console.log(`     - ID: ${adminUser.id}`);
      console.log(`     - Email: ${adminUser.email}`);
      console.log(`     - Role: ${adminUser.role}`);
      console.log(`     - Expected ID: 3pve-s`);
      console.log(`     - ID matches: ${adminUser.id === '3pve-s' ? '✓' : '✗ MISMATCH!'}`);
      console.log(`     - Role is admin: ${adminUser.role === 'admin' ? '✓' : '✗ WRONG ROLE!'}`);
    } else {
      console.error('   ✗ CRITICAL: Admin user not found!');
    }
    
    // Test 2: Run integrity check
    console.log('\n2. Running critical users integrity check...');
    const integrityResult = await storage.verifyCriticalUsersIntegrity();
    console.log(`   - Success: ${integrityResult.success ? '✓' : '✗'}`);
    if (integrityResult.errors && integrityResult.errors.length > 0) {
      console.log('   - Errors:');
      integrityResult.errors.forEach(err => console.log(`     * ${err}`));
    } else {
      console.log('   - No errors found');
    }
    
    // Test 3: Test ID validation
    console.log('\n3. Testing ID validation...');
    const testIDs = [
      { id: '3pve-s', expected: 'valid' },
      { id: 'test-admin', expected: 'valid' },
      { id: null, expected: 'invalid' },
      { id: undefined, expected: 'invalid' },
      { id: '', expected: 'invalid' },
      { id: '  ', expected: 'invalid' },
      { id: 'a'.repeat(256), expected: 'invalid' },
      { id: 'valid-id-123', expected: 'valid' },
      { id: 'id@with@at', expected: 'invalid' }
    ];
    
    for (const test of testIDs) {
      const user = await storage.getUser(test.id);
      const result = user ? 'found' : 'not found';
      const validation = test.expected === 'invalid' && !user ? '✓' : 
                        test.expected === 'valid' && user ? '✓' : 
                        test.expected === 'valid' && !user ? '(not in DB)' : '✗';
      console.log(`   - ID "${test.id}" (${test.expected}): ${result} ${validation}`);
    }
    
    // Test 4: Test upsertUser with critical admin
    console.log('\n4. Testing upsertUser with critical admin...');
    const updatedUser = await storage.upsertUser({
      id: '3pve-s',
      email: 'shaun.ulrich@ulrichenergyauditing.com',
      firstName: 'Shaun',
      lastName: 'Ulrich'
    });
    console.log(`   - Updated user role: ${updatedUser.role}`);
    console.log(`   - Role preserved as admin: ${updatedUser.role === 'admin' ? '✓' : '✗ FAILED!'}`);
    
    console.log('\n===== Integrity Check Tests Complete =====');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to run integrity tests:', error);
    process.exit(1);
  });