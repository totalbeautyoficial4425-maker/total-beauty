const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Load DATABASE_URL from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
    break;
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(dbUrl);

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

async function seed() {
  console.log('Criando tabela total_beauty_cloud_sync no banco Neon (São Paulo)...');
  await sql`
    CREATE TABLE IF NOT EXISTS total_beauty_cloud_sync (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      version TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const dataPath = path.join(__dirname, '../src/data/total_beauty_db_backup_pre_reset_20261022.json');
  const backup = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Ensure all users have correct passwordHash
  const usersWithPasswords = (backup.users || []).map(u => {
    const pwd = u.role === 'admin' ? 'Ravenna@123' : `${u.username}123`;
    return {
      ...u,
      passwordHash: hashPassword(pwd),
      passwordUpdatedAt: new Date().toISOString()
    };
  });

  const payload = {
    ...backup,
    users: usersWithPasswords,
    version: `seed_${Date.now()}`,
    updatedAt: new Date().toISOString()
  };

  console.log(`Gravando dados: ${payload.clients?.length} clientes, ${payload.services?.length} serviços, ${payload.professionals?.length} profissionais, ${payload.users?.length} usuários...`);

  await sql`
    INSERT INTO total_beauty_cloud_sync (id, data, version, updated_at)
    VALUES ('main', ${payload}, ${payload.version}, NOW())
    ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data,
        version = EXCLUDED.version,
        updated_at = NOW();
  `;

  console.log('SUCESSO! Banco de dados na nuvem Neon inicializado e semeado com sucesso!');
}

seed().catch(err => {
  console.error('Erro ao semear banco Neon:', err);
  process.exit(1);
});
