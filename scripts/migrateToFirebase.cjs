const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  writeBatch 
} = require('firebase/firestore');

// Helper to parse Firebase credentials from env, argument or JSON
function getCredentials() {
  // 1. Passed as CLI JSON or arg
  if (process.argv[2]) {
    try {
      const raw = process.argv[2];
      if (raw.startsWith('{')) {
        return JSON.parse(raw);
      }
    } catch {}
  }

  // 2. Read from .env.local
  if (fs.existsSync('.env.local')) {
    const content = fs.readFileSync('.env.local', 'utf8');
    const getVal = (k) => {
      const match = content.match(new RegExp(`^${k}=["']?([^"'\r\n]+)["']?`, 'm'));
      return match ? match[1].trim() : '';
    };

    const apiKey = getVal('VITE_FIREBASE_API_KEY');
    const projectId = getVal('VITE_FIREBASE_PROJECT_ID');
    if (apiKey && projectId) {
      return {
        apiKey,
        projectId,
        authDomain: getVal('VITE_FIREBASE_AUTH_DOMAIN') || `${projectId}.firebaseapp.com`,
        storageBucket: getVal('VITE_FIREBASE_STORAGE_BUCKET') || `${projectId}.firebasestorage.app`,
        messagingSenderId: getVal('VITE_FIREBASE_MESSAGING_SENDER_ID') || '',
        appId: getVal('VITE_FIREBASE_APP_ID') || '',
      };
    }
  }

  return null;
}

async function run() {
  const creds = getCredentials();
  if (!creds || !creds.apiKey || !creds.projectId) {
    console.error('ERRO: Credenciais do Firebase não encontradas!');
    console.error('Uso: node scripts/migrateToFirebase.cjs \'{"apiKey":"...","projectId":"...",...}\'');
    process.exit(1);
  }

  console.log(`Conectando ao Firebase Firestore (Projeto: ${creds.projectId})...`);
  const app = initializeApp(creds);
  const db = getFirestore(app);

  // Load backup data
  let dataPath = path.join(__dirname, '../data/backups/total_beauty_db_backup_pre_reset_20261022.json');
  if (!fs.existsSync(dataPath)) {
    dataPath = path.join(__dirname, '../src/data/total_beauty_db_backup_pre_reset_20261022.json');
  }
  if (!fs.existsSync(dataPath)) {
    console.error('Arquivo de dados não encontrado:', dataPath);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const collections = [
    { name: 'clients', items: rawData.clients || [] },
    { name: 'services', items: rawData.services || [] },
    { name: 'professionals', items: rawData.professionals || [] },
    { name: 'appointments', items: rawData.appointments || [] },
    { name: 'attendances', items: rawData.attendances || [] },
    { name: 'comandas', items: rawData.comandas || [] },
    { name: 'payments', items: rawData.payments || [] },
    { name: 'inventory', items: rawData.inventory || [] },
    { name: 'consumptions', items: rawData.consumptions || [] },
    { name: 'users', items: rawData.users || [] },
    { name: 'scheduleBlocks', items: rawData.scheduleBlocks || [] },
    { name: 'clientPackages', items: rawData.clientPackages || [] },
    { name: 'settings', items: rawData.settings ? [{ id: 'general', ...rawData.settings }] : [] },
  ];

  let totalMigrated = 0;

  for (const col of collections) {
    const items = col.items;
    if (!items || items.length === 0) continue;

    console.log(`Transferindo ${items.length} registros da coleção "${col.name}"...`);
    const CHUNK_SIZE = 450;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        if (!item || !item.id) continue;
        const docRef = doc(db, col.name, String(item.id));
        const cleanData = JSON.parse(JSON.stringify(item));
        batch.set(docRef, cleanData, { merge: true });
      }

      await batch.commit();
      totalMigrated += chunk.length;
      process.stdout.write(`  ✓ ${Math.min(i + CHUNK_SIZE, items.length)}/${items.length}\r`);
    }
    console.log(`\n  Coleção "${col.name}" finalizada com sucesso!`);
  }

  console.log(`\n=============================================`);
  console.log(`SUCESSO TOTAL! ${totalMigrated} registros transferidos para o Firebase Firestore!`);
  console.log(`=============================================\n`);
}

run().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
