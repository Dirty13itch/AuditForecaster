#!/usr/bin/env node

// Test script for the force-admin endpoint
import http from 'http';

// Test data
const testData = {
  email: 'shaun.ulrich@ulrichenergyauditing.com'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/dev/force-admin',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing force-admin endpoint...');
console.log('Request:', testData);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    try {
      const response = JSON.parse(data);
      console.log('Response:', JSON.stringify(response, null, 2));
      
      if (response.user && response.user.role === 'admin') {
        console.log('✅ SUCCESS: User role set to admin');
      } else {
        console.log('❌ FAILED: User role not set to admin');
      }
    } catch (e) {
      console.log('Raw Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();