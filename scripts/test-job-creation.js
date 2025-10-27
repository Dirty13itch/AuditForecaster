#!/usr/bin/env node

/**
 * Test script to verify job creation and persistence
 */

async function testJobCreation() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing Job Creation and Persistence');
  console.log('=' . repeat(50));
  
  try {
    // Step 1: Get CSRF token (assuming dev mode)
    console.log('\n1. Getting CSRF token...');
    const csrfResponse = await fetch(`${baseUrl}/api/csrf-token`, {
      credentials: 'include',
    });
    
    if (!csrfResponse.ok) {
      console.log('⚠️  Could not get CSRF token - may need authentication');
      console.log('   Skipping authenticated tests');
      return;
    }
    
    const { csrfToken } = await csrfResponse.json();
    console.log('✅ Got CSRF token');
    
    // Step 2: Create a test job
    console.log('\n2. Creating test job...');
    const testJob = {
      name: `Test Job ${Date.now()}`,
      address: '123 Test Street',
      contractor: 'Test Contractor',
      status: 'scheduled',
      inspectionType: 'pre_drywall',
      scheduledDate: new Date().toISOString(),
    };
    
    const createResponse = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify(testJob),
    });
    
    console.log(`   Response status: ${createResponse.status}`);
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('❌ Failed to create job:', error);
      return;
    }
    
    const createdJob = await createResponse.json();
    console.log('✅ Job created with ID:', createdJob.id);
    console.log('   Name:', createdJob.name);
    console.log('   Status:', createdJob.status);
    
    // Step 3: Verify job exists in database
    console.log('\n3. Fetching job from database...');
    const getResponse = await fetch(`${baseUrl}/api/jobs/${createdJob.id}`, {
      credentials: 'include',
    });
    
    if (!getResponse.ok) {
      console.error('❌ Failed to fetch job');
      return;
    }
    
    const fetchedJob = await getResponse.json();
    console.log('✅ Job found in database:');
    console.log('   ID:', fetchedJob.id);
    console.log('   Name:', fetchedJob.name);
    console.log('   Status:', fetchedJob.status);
    
    // Step 4: Verify job appears in list
    console.log('\n4. Checking if job appears in jobs list...');
    const listResponse = await fetch(`${baseUrl}/api/jobs?limit=10`, {
      credentials: 'include',
    });
    
    if (!listResponse.ok) {
      console.error('❌ Failed to fetch jobs list');
      return;
    }
    
    const jobsList = await listResponse.json();
    const foundInList = jobsList.data?.find(j => j.id === createdJob.id);
    
    if (foundInList) {
      console.log('✅ Job found in jobs list');
      console.log(`   Total jobs in list: ${jobsList.data.length}`);
    } else {
      console.error('❌ Job NOT found in jobs list!');
      console.log(`   Checked ${jobsList.data?.length || 0} jobs`);
    }
    
    // Summary
    console.log('\n' + '=' . repeat(50));
    console.log('📊 Test Summary:');
    console.log('   Job Creation: ✅ SUCCESS');
    console.log('   Database Persistence: ' + (fetchedJob ? '✅ SUCCESS' : '❌ FAILED'));
    console.log('   List Inclusion: ' + (foundInList ? '✅ SUCCESS' : '❌ FAILED'));
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Check if server is running first
fetch('http://localhost:5000/healthz')
  .then(response => {
    if (response.ok) {
      console.log('✅ Server is running');
      return testJobCreation();
    } else {
      console.error('❌ Server health check failed');
    }
  })
  .catch(error => {
    console.error('❌ Cannot connect to server at http://localhost:5000');
    console.error('   Make sure the server is running with: npm run dev');
  });