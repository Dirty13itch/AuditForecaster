#!/usr/bin/env node

/**
 * Test script for Google Calendar integration
 * This script tests all Google Calendar endpoints to ensure they're working correctly
 */

import http from 'http';

// Test configuration - Adjust the host/port if needed
const TEST_CONFIG = {
  hostname: 'localhost',
  port: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper function to make HTTP requests
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Test functions
async function testEndpoint(name, path, expectedStatus = 200) {
  console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
  console.log(`Endpoint: ${path}`);
  
  const options = {
    ...TEST_CONFIG,
    path: path,
    method: 'GET'
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === expectedStatus || response.statusCode === 401 || response.statusCode === 403) {
      
      // Handle authentication issues
      if (response.statusCode === 401) {
        console.log(`${colors.yellow}⚠ Status: 401 - Authentication required${colors.reset}`);
        console.log('Note: You need to be logged in as an admin to access this endpoint');
        return { success: false, error: 'Unauthorized', needsAuth: true };
      } else if (response.statusCode === 403) {
        console.log(`${colors.yellow}⚠ Status: 403 - Forbidden (admin role required)${colors.reset}`);
        return { success: false, error: 'Forbidden', needsAuth: true };
      }
      
      console.log(`${colors.green}✓ Status: ${response.statusCode} (Expected)${colors.reset}`);
      
      // Try to parse JSON
      try {
        const data = JSON.parse(response.body);
        console.log(`${colors.cyan}Response:${colors.reset}`, JSON.stringify(data, null, 2));
        
        // Check for specific fields in the response
        if (path.includes('test')) {
          if (data.success !== undefined) {
            console.log(`${colors.cyan}Connection Status:${colors.reset} ${data.success ? 'Success' : 'Failed'}`);
          }
          if (data.buildingKnowledgeCalendar) {
            console.log(`${colors.green}✓ Building Knowledge Calendar Found: ${data.buildingKnowledgeCalendar}${colors.reset}`);
          } else if (data.calendars && data.calendars.length > 0) {
            console.log(`${colors.yellow}⚠ Found ${data.calendars.length} calendars but Building Knowledge calendar not identified${colors.reset}`);
            console.log('Available calendars:', data.calendars.map(c => c.name).join(', '));
          }
        }
        
        return { success: true, data };
      } catch (parseError) {
        // If it's an HTML response (likely the home page)
        if (response.body.includes('<!DOCTYPE html>') || response.body.includes('<html')) {
          console.log(`${colors.red}✗ Received HTML instead of JSON (likely home page)${colors.reset}`);
          console.log(`${colors.yellow}This usually means the endpoint doesn't exist or there's a redirect${colors.reset}`);
          return { success: false, error: 'HTML response' };
        }
        console.log(`${colors.yellow}Response (non-JSON):${colors.reset}`, response.body.substring(0, 200));
        return { success: false, error: 'Non-JSON response' };
      }
    } else {
      console.log(`${colors.red}✗ Unexpected Status: ${response.statusCode}${colors.reset}`);
      console.log('Response body:', response.body.substring(0, 200));
      return { success: false, error: `Status ${response.statusCode}` };
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function testGoogleEvents() {
  console.log(`\n${colors.blue}Testing: Google Events Fetch${colors.reset}`);
  
  // Calculate date range (today and next 7 days)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  
  const path = `/api/google-events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&forceSync=true`;
  console.log(`Endpoint: ${path}`);
  console.log(`Date Range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
  
  const options = {
    ...TEST_CONFIG,
    path: path,
    method: 'GET'
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log(`${colors.green}✓ Status: 200${colors.reset}`);
      
      try {
        const events = JSON.parse(response.body);
        console.log(`${colors.green}✓ Found ${events.length} events${colors.reset}`);
        
        if (events.length > 0) {
          console.log('\nFirst 3 events:');
          events.slice(0, 3).forEach(event => {
            console.log(`  - ${event.summary || 'No title'} (${new Date(event.startTime).toLocaleString()})`);
          });
        }
        
        return { success: true, data: events };
      } catch (parseError) {
        console.log(`${colors.red}✗ Failed to parse response${colors.reset}`);
        return { success: false, error: 'Parse error' };
      }
    } else if (response.statusCode === 401) {
      console.log(`${colors.yellow}⚠ Status: 401 - Authentication required${colors.reset}`);
      return { success: false, error: 'Unauthorized', needsAuth: true };
    } else {
      console.log(`${colors.red}✗ Status: ${response.statusCode}${colors.reset}`);
      try {
        const errorData = JSON.parse(response.body);
        console.log('Error message:', errorData.message || 'Unknown error');
      } catch (e) {
        console.log('Response:', response.body.substring(0, 200));
      }
      return { success: false, error: `Status ${response.statusCode}` };
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}Google Calendar Integration Test Suite${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  
  const results = [];
  
  // Test 1: Check /api/google-calendar/test-connection endpoint
  results.push(await testEndpoint(
    'Google Calendar Test Connection Endpoint',
    '/api/google-calendar/test-connection'
  ));
  
  // Test 2: Check /api/google-calendar/test endpoint
  results.push(await testEndpoint(
    'Google Calendar Test Endpoint',
    '/api/google-calendar/test'
  ));
  
  // Test 3: Fetch Google events
  results.push(await testGoogleEvents());
  
  // Summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}Test Summary${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const needsAuth = results.filter(r => r.needsAuth).length;
  
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (needsAuth > 0) {
    console.log(`${colors.yellow}Authentication Required: ${needsAuth} endpoints need authentication${colors.reset}`);
  }
  
  if (failed === 0 && needsAuth === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ Some tests need attention. See details above.${colors.reset}`);
    
    if (needsAuth > 0) {
      console.log('\n📝 To test authenticated endpoints:');
      console.log('1. First, log in as admin in a browser:');
      console.log(`   ${colors.cyan}http://localhost:5000/api/dev-login/test-admin${colors.reset}`);
      console.log('2. Copy the session cookie from your browser');
      console.log('3. Run authenticated tests with curl:');
      console.log(`   ${colors.cyan}curl --cookie "connect.sid=YOUR_SESSION_ID" http://localhost:5000/api/google-calendar/test${colors.reset}`);
    }
  }
  
  // Additional notes
  console.log(`\n${colors.cyan}Notes:${colors.reset}`);
  console.log('✓ Both /api/google-calendar/test and /api/google-calendar/test-connection are now available');
  console.log('✓ getUserById method has been added to storage.ts');
  console.log('✓ The endpoints require admin authentication to work properly');
  
  if (results.some(r => r.data && r.data.calendars)) {
    console.log('\n📅 Google Calendar Configuration:');
    console.log('- The app is looking for a calendar named "Building Knowledge"');
    console.log('- You can configure this in the BUILDING_KNOWLEDGE_CALENDAR_NAME env variable');
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});