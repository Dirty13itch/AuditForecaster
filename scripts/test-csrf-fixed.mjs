#!/usr/bin/env node

import http from 'http';

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data ? (data.startsWith('{') || data.startsWith('[') ? JSON.parse(data) : data) : null
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTest() {
  console.log('🧪 Testing CSRF Fix');
  console.log('==================\n');

  try {
    // Step 1: Login
    console.log('1. Logging in as test-admin...');
    const loginRes = await makeRequest('/api/dev-login/test-admin', {
      headers: { 'User-Agent': 'Test-Script' }
    });
    
    const cookies = loginRes.headers['set-cookie'];
    if (!cookies || cookies.length === 0) {
      throw new Error('No session cookie received');
    }
    
    const sessionCookie = cookies.join('; ');
    console.log('✅ Logged in successfully\n');

    // Step 2: Get CSRF token
    console.log('2. Getting CSRF token...');
    const csrfRes = await makeRequest('/api/csrf-token', {
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Test-Script'
      }
    });

    if (csrfRes.status !== 200) {
      throw new Error(`Failed to get CSRF token: ${csrfRes.status}`);
    }

    const csrfToken = csrfRes.data.csrfToken;
    console.log(`✅ Got CSRF token: ${csrfToken.substring(0, 20)}...\n`);

    // Step 3: Create job with lowercase header (our fix)
    console.log('3. Creating job with lowercase x-csrf-token header...');
    const jobData = {
      name: 'Test Job - CSRF Fix Verification',
      address: '123 Test Street',
      contractor: 'Test Builder',
      builderName: 'Test Builder Corp',
      inspectionType: 'pre-drywall'
    };

    const createRes = await makeRequest('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,  // Using lowercase as per our fix
        'Cookie': sessionCookie,
        'User-Agent': 'Test-Script'
      },
      body: JSON.stringify(jobData)
    });

    console.log(`Response status: ${createRes.status}`);
    
    if (createRes.status === 200 || createRes.status === 201) {
      console.log(`✅ SUCCESS! Job created with ID: ${createRes.data.id}`);
      console.log(`   Job Name: ${createRes.data.name}`);
      console.log('\n🎉 CSRF token validation is working correctly!');
      console.log('   The lowercase header fix resolved the issue.');
    } else {
      console.log(`❌ Failed to create job: ${createRes.status}`);
      console.log(`   Response: ${JSON.stringify(createRes.data, null, 2)}`);
    }

    // Step 4: Test with wrong header format (should fail)
    console.log('\n4. Testing with uppercase header (should fail)...');
    const failRes = await makeRequest('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,  // Wrong case - should fail
        'Cookie': sessionCookie,
        'User-Agent': 'Test-Script'
      },
      body: JSON.stringify({
        ...jobData,
        name: 'This should fail - wrong header case'
      })
    });

    if (failRes.status === 403) {
      console.log('✅ Correctly rejected request with wrong header case');
    } else {
      console.log('⚠️  Unexpected: Request with wrong header case was accepted');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check server is running
makeRequest('/healthz')
  .then(res => {
    if (res.status === 200) {
      console.log('✅ Server is running\n');
      return runTest();
    } else {
      throw new Error('Server is not responding');
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error('Make sure the server is running on port 5000');
    process.exit(1);
  });