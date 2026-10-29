const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    if (k && !process.env[k]) {
      process.env[k] = v;
    }
  }
}

async function test() {
  const handler = (await import('../api/sync.js')).default;

  // Test 1: Full Pull (new device like collaborator's phone)
  let resObj1 = {};
  await handler({ method: 'GET', headers: {}, query: {} }, {
    setHeader: () => {},
    status: (s) => ({ json: (d) => { resObj1.status = s; resObj1.data = d; }, end: () => {} })
  });
  console.log('1. Full pull status:', resObj1.status);
  console.log('   Clients received:', resObj1.data?.data?.clients?.length);
  console.log('   Version:', resObj1.data?.version);

  const ver = resObj1.data?.version;

  // Test 2: Polling with identical version (should return notModified in 5ms without data!)
  let resObj2 = {};
  await handler({ method: 'GET', headers: { 'x-sync-version': ver }, query: { current_version: ver } }, {
    setHeader: () => {},
    status: (s) => ({ json: (d) => { resObj2.status = s; resObj2.data = d; }, end: () => {} })
  });
  console.log('2. Fast heartbeat poll status:', resObj2.status);
  console.log('   notModified flag:', resObj2.data?.notModified);
  console.log('   Data sent over wire:', resObj2.data?.data ? 'YES (heavy)' : 'NO (ultra-lightweight)');
}

test().catch(console.error);
