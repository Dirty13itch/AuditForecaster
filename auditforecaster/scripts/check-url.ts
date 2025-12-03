import { fetch } from 'undici';

async function main() {
    const url = 'http://localhost:3000/inspections/e2e-test-inspection/run';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('Body length:', text.length);
    if (res.status === 404) {
        console.log('Body preview:', text.substring(0, 500));
    }
}

main().catch(console.error);
