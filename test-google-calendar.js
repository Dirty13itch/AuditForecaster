// Test Google Calendar connection
const fetch = require('node');

async function testGoogleCalendar() {
  try {
    // First test the connection test endpoint
    console.log('Testing Google Calendar connection...');
    
    // Import the service
    const { googleCalendarService } = await import('./server/googleCalendarService.ts');
    
    // Test basic connection
    const testResult = await googleCalendarService.testConnection();
    console.log('Connection test result:', JSON.stringify(testResult, null, 2));
    
    // Try to fetch events
    console.log('\nFetching events from Google Calendar...');
    const startDate = new Date('2024-10-01');
    const endDate = new Date('2024-11-30');
    
    const events = await googleCalendarService.fetchEvents(startDate, endDate);
    console.log(`Found ${events.length} events`);
    
    if (events.length > 0) {
      console.log('\nFirst 3 events:');
      events.slice(0, 3).forEach((event, i) => {
        console.log(`${i + 1}. ${event.summary || 'Untitled'} - ${new Date(event.startTime).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing Google Calendar:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testGoogleCalendar();