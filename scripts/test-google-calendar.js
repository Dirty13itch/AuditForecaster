#!/usr/bin/env node

/**
 * Test script for Google Calendar integration
 * This script tests all Google Calendar endpoints to ensure they're working correctly
 */

const http = require('http');

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
    
    if (response.statusCode === expectedStatus) {
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
          return { success: false, error: 'HTML response' };
        }
        console.log(`${colors.yellow}Response (non-JSON):${colors.reset}`, response.body.substring(0, 200));
        return { success: false, error: 'Non-JSON response' };
      }
    } else if (response.statusCode === 401) {
      console.log(`${colors.yellow}⚠ Status: 401 - Authentication required${colors.reset}`);
      console.log('Note: You need to be logged in as an admin to access this endpoint');
      return { success: false, error: 'Unauthorized' };
    } else if (response.statusCode === 403) {
      console.log(`${colors.yellow}⚠ Status: 403 - Forbidden (admin role required)${colors.reset}`);
      return { success: false, error: 'Forbidden' };
    } else {
      console.log(`${colors.red}✗ Status: ${response.statusCode}${colors.reset}`);
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
      return { success: false, error: 'Unauthorized' };
    } else {
      console.log(`${colors.red}✗ Status: ${response.statusCode}${colors.reset}`);
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
  
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ Some tests failed. Please check the output above.${colors.reset}`);
    console.log('\nCommon issues:');
    console.log('1. Not logged in - Use dev login to authenticate as admin');
    console.log('2. Google Calendar API not configured properly');
    console.log('3. Building Knowledge calendar not found');
  }
  
  // Instructions for manual testing
  console.log(`\n${colors.cyan}Manual Testing Instructions:${colors.reset}`);
  console.log('1. First, log in as admin using: curl http://localhost:5000/api/dev-login/[admin-user-id]');
  console.log('2. Save the session cookie from the response');
  console.log('3. Use the cookie in subsequent requests to test authenticated endpoints');
  console.log('\nExample with curl:');
  console.log('  curl --cookie "connect.sid=YOUR_SESSION_ID" http://localhost:5000/api/google-calendar/test');
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});