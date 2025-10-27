#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function testJobCreation() {
  console.log('=== Testing Job Creation with Fixed Error Handling ===\n');
  
  // First login as admin to get session
  console.log('Step 1: Logging in as test-admin...');
  try {
    const loginResult = await execPromise(
      `curl -c cookies.txt -X GET http://localhost:5000/api/dev-login/test-admin -s -w "\\nHTTP_STATUS:%{http_code}"`
    );
    console.log('Login response:', loginResult.stdout.split('\n').pop());
  } catch (error) {
    console.error('Login failed:', error.message);
    return;
  }
  
  // Get CSRF token
  console.log('\nStep 2: Getting CSRF token...');
  try {
    const csrfResult = await execPromise(
      `curl -b cookies.txt -X GET http://localhost:5000/api/csrf-token -s`
    );
    const csrfData = JSON.parse(csrfResult.stdout);
    console.log('CSRF token obtained:', csrfData.token);
    
    // Save CSRF token
    await execPromise(`echo "${csrfData.token}" > csrf.txt`);
  } catch (error) {
    console.error('Failed to get CSRF token:', error.message);
    return;
  }
  
  // Create a test job
  console.log('\nStep 3: Creating a test job...');
  const jobData = {
    name: `Test Job ${Date.now()}`,
    address: '123 Test Street, Test City, TC 12345',
    status: 'pending',
    inspectionType: 'pre_drywall',
    builderId: null,
    scheduledDate: new Date().toISOString()
  };
  
  console.log('Job data:', JSON.stringify(jobData, null, 2));
  
  try {
    const createResult = await execPromise(
      `curl -b cookies.txt ` +
      `-H "X-CSRF-Token: $(cat csrf.txt)" ` +
      `-H "Content-Type: application/json" ` +
      `-X POST http://localhost:5000/api/jobs ` +
      `-d '${JSON.stringify(jobData)}' ` +
      `-s -w "\\nHTTP_STATUS:%{http_code}"`
    );
    
    const output = createResult.stdout;
    const lines = output.split('\n');
    const statusLine = lines.pop();
    const responseBody = lines.join('\n');
    const httpStatus = statusLine.replace('HTTP_STATUS:', '');
    
    console.log('\nHTTP Status:', httpStatus);
    console.log('Response body:', responseBody);
    
    if (httpStatus === '201') {
      console.log('\n✅ SUCCESS: Job created successfully!');
      
      // Parse the job response
      try {
        const job = JSON.parse(responseBody);
        console.log('\nCreated job details:');
        console.log('- ID:', job.id);
        console.log('- Name:', job.name);
        console.log('- Address:', job.address);
        console.log('- Status:', job.status);
        
        // Verify the job exists in database
        console.log('\nStep 4: Verifying job exists in database...');
        const getResult = await execPromise(
          `curl -b cookies.txt ` +
          `-H "X-CSRF-Token: $(cat csrf.txt)" ` +
          `-X GET http://localhost:5000/api/jobs/${job.id} ` +
          `-s -w "\\nHTTP_STATUS:%{http_code}"`
        );
        
        const getOutput = getResult.stdout;
        const getLines = getOutput.split('\n');
        const getStatusLine = getLines.pop();
        const getResponseBody = getLines.join('\n');
        const getHttpStatus = getStatusLine.replace('HTTP_STATUS:', '');
        
        if (getHttpStatus === '200') {
          const verifiedJob = JSON.parse(getResponseBody);
          console.log('✅ Job verified in database with ID:', verifiedJob.id);
          console.log('\n🎉 FIX VERIFIED: Jobs are being properly persisted to database!');
        } else {
          console.error('❌ Job NOT found in database! Status:', getHttpStatus);
          console.error('Response:', getResponseBody);
        }
      } catch (parseError) {
        console.error('Failed to parse job response:', parseError.message);
      }
    } else if (httpStatus === '500') {
      console.error('\n❌ ERROR: Server returned 500 - Database error');
      console.error('This indicates the fix is working - errors are properly propagated!');
      console.error('Response:', responseBody);
    } else {
      console.error('\n❌ ERROR: Unexpected status code:', httpStatus);
      console.error('Response:', responseBody);
    }
    
  } catch (error) {
    console.error('Failed to create job:', error.message);
  }
  
  // Clean up
  console.log('\nCleaning up temporary files...');
  await execPromise('rm -f cookies.txt csrf.txt').catch(() => {});
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testJobCreation().catch(console.error);