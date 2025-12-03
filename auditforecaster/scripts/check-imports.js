
try {
    require('./src/lib/security');
    console.log('Successfully required security.ts');
} catch (e) {
    console.error('Failed to require security.ts:', e);
}

try {
    require('./src/lib/security-client');
    console.log('Successfully required security-client.ts');
} catch (e) {
    console.error('Failed to require security-client.ts:', e);
}
