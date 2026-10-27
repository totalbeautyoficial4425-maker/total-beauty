import fs from 'fs';
import { put } from '@vercel/blob';

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/BLOB_READ_WRITE_TOKEN="([^"]+)"/);
const token = match ? match[1] : null;

if (!token) {
  console.error('BLOB_READ_WRITE_TOKEN not found');
  process.exit(1);
}

function hashPassword(password) {
  let hash = 0;
  const salt = 'TB_SECURE_SALT_2025#@!';
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `sha256_${Math.abs(hash).toString(16)}_${str.length}`;
}

const ravennaHash = hashPassword('Ravenna@123');
console.log('Ravenna@123 hash:', ravennaHash);

const res = await fetch(`https://ewrowlrdje7mt5fn.public.blob.vercel-storage.com/total_beauty_db.json?t=${Date.now()}`);
const data = await res.json();

console.log('Current users in blob:', data.users.length);

const now = new Date().toISOString();
data.users = data.users.map(u => {
  if (u.id === 'user_admin_01' || u.role === 'admin' || u.username === 'admin') {
    return {
      ...u,
      passwordHash: ravennaHash,
      passwordUpdatedAt: now,
      updatedAt: now,
      forcePasswordChange: false
    };
  }
  return u;
});
data.updatedAt = now;
data.version = Date.now().toString();

const putResult = await put('total_beauty_db.json', JSON.stringify(data), {
  access: 'public',
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'application/json',
  token
});

console.log('Successfully updated total_beauty_db.json in Vercel Blob:', putResult.url);

// Backup copy
await put('total_beauty_db_backup.json', JSON.stringify(data), {
  access: 'public',
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'application/json',
  token
});

console.log('Successfully updated backup blob as well.');
