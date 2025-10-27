#!/usr/bin/env node

/**
 * Test script to verify job creation and persistence with dev authentication
 */

const http = require('http');

async function loginAsTestAdmin() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/dev-login/test-admin',
      method: 'GET',
    };
    
    const req = http.request(options, (res) => {
      let cookies = res.headers['set-cookie'] || [];
      const sessionCookie = cookies.find(c => c.includes('connect.sid'));
      
      if (sessionCookie && res.statusCode === 302) {
        console.log('✅ Logged in as test-admin');
        resolve(sessionCookie.split(';')[0]);
      } else {
        reject(new Error(`Login failed with status ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function makeAuthenticatedRequest(path, options = {}, sessionCookie) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: options.method || 'GET',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers,
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testJobCreation() {
  console.log('🧪 Testing Job Creation and Persistence (Authenticated)');
  console.log('=' . repeat(50));
  
  try {
    // Step 1: Login as test admin
    console.log('\n1. Logging in as test-admin...');
    const sessionCookie = await loginAsTestAdmin();
    
    // Step 2: Get CSRF token
    console.log('\n2. Getting CSRF token...');
    const csrfResult = await makeAuthenticatedRequest('/api/csrf-token', {}, sessionCookie);
    
    if (csrfResult.status !== 200) {
      console.error('❌ Failed to get CSRF token');
      return;
    }
    
    const csrfToken = csrfResult.data.csrfToken;
    console.log('✅ Got CSRF token');
    
    // Step 3: Create a test job
    console.log('\n3. Creating test job...');
    const testJob = {
      name: `Test Job ${Date.now()}`,
      address: '123 Test Street, Test City, TS 12345',
      contractor: 'Test Contractor Inc',
      status: 'scheduled',
      inspectionType: 'pre_drywall',
      scheduledDate: new Date().toISOString(),
      notes: 'This is a test job to verify persistence',
    };
    
    const createResult = await makeAuthenticatedRequest('/api/jobs', {
      method: 'POST',
      headers: {
        'x-csrf-token': csrfToken,
      },
      body: testJob,
    }, sessionCookie);
    
    console.log(`   Response status: ${createResult.status}`);
    
    if (createResult.status !== 201) {
      console.error('❌ Failed to create job:', createResult.data);
      return;
    }
    
    const createdJob = createResult.data;
    console.log('✅ Job created successfully:');
    console.log('   ID:', createdJob.id);
    console.log('   Name:', createdJob.name);
    console.log('   Status:', createdJob.status);
    console.log('   Address:', createdJob.address);
    
    // Step 4: Verify job exists by fetching it directly
    console.log('\n4. Fetching job from database by ID...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for any async operations
    
    const getResult = await makeAuthenticatedRequest(`/api/jobs/${createdJob.id}`, {}, sessionCookie);
    
    if (getResult.status !== 200) {
      console.error('❌ Failed to fetch job by ID');
      console.error('   Status:', getResult.status);
      console.error('   Response:', getResult.data);
    } else {
      const fetchedJob = getResult.data;
      console.log('✅ Job found in database:');
      console.log('   ID matches:', fetchedJob.id === createdJob.id);
      console.log('   Name matches:', fetchedJob.name === createdJob.name);
    }
    
    // Step 5: Verify job appears in list
    console.log('\n5. Checking if job appears in jobs list...');
    const listResult = await makeAuthenticatedRequest('/api/jobs?limit=10', {}, sessionCookie);
    
    if (listResult.status !== 200) {
      console.error('❌ Failed to fetch jobs list');
      return;
    }
    
    const jobsList = listResult.data;
    const foundInList = jobsList.data?.find(j => j.id === createdJob.id);
    
    if (foundInList) {
      console.log('✅ Job found in jobs list!');
      console.log('   Position in list:', jobsList.data.findIndex(j => j.id === createdJob.id) + 1);
      console.log(`   Total jobs in list: ${jobsList.data.length}`);
    } else {
      console.error('❌ Job NOT found in jobs list!');
      console.log(`   Searched through ${jobsList.data?.length || 0} jobs`);
      console.log('   First few job IDs in list:', jobsList.data?.slice(0, 3).map(j => j.id));
    }
    
    // Summary
    console.log('\n' + '=' . repeat(50));
    console.log('📊 Test Summary:');
    const creationSuccess = createResult.status === 201;
    const fetchSuccess = getResult.status === 200;
    const listSuccess = !!foundInList;
    
    console.log('   ✅ Job Creation:', creationSuccess ? 'SUCCESS' : 'FAILED');
    console.log('   ' + (fetchSuccess ? '✅' : '❌') + ' Direct Fetch:', fetchSuccess ? 'SUCCESS' : 'FAILED');
    console.log('   ' + (listSuccess ? '✅' : '❌') + ' List Inclusion:', listSuccess ? 'SUCCESS - Job is persisting!' : 'FAILED - Job not persisting!');
    
    if (creationSuccess && fetchSuccess && listSuccess) {
      console.log('\n🎉 All tests passed! Job creation and persistence is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Check if server is running first
http.get('http://localhost:5000/healthz', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Server is running');
    testJobCreation().catch(console.error);
  } else {
    console.error('❌ Server health check failed');
  }
}).on('error', (error) => {
  console.error('❌ Cannot connect to server at http://localhost:5000');
  console.error('   Make sure the server is running with: npm run dev');
});