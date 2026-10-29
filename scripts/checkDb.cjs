const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
    break;
  }
}

const { neon } = require('@neondatabase/serverless');
const sql = neon(dbUrl);

async function check() {
  const rows = await sql`
    SELECT 
      id, 
      version, 
      updated_at, 
      jsonb_array_length(data->'clients') as client_count,
      jsonb_array_length(data->'appointments') as apt_count,
      jsonb_array_length(data->'attendances') as atd_count,
      jsonb_array_length(data->'inventory') as inv_count,
      jsonb_array_length(data->'users') as user_count
    FROM total_beauty_cloud_sync;
  `;
  console.log('Database rows:', rows);
}

check().catch(console.error);
