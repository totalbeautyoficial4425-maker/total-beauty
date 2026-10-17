import { put } from '@vercel/blob';
import { 
  INITIAL_CLIENTS, 
  INITIAL_SERVICES, 
  INITIAL_PROFESSIONALS, 
  INITIAL_INVENTORY, 
  DEFAULT_USERS, 
  INITIAL_SETTINGS 
} from '../src/services/storage.ts';

const BLOB_FILE_NAME = 'total_beauty_db.json';
const token = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_EwROWlRDJE7mT5FN_QOiXK9qL62e3foYXdp1T4LVS4UF7zT';

async function seed() {
  console.log('Seeding cloud blob...');
  const now = new Date().toISOString();
  const version = Date.now().toString();

  const payload = {
    version,
    updatedAt: now,
    exportedAt: now,
    clients: INITIAL_CLIENTS,
    services: INITIAL_SERVICES,
    professionals: INITIAL_PROFESSIONALS,
    inventory: INITIAL_INVENTORY,
    users: DEFAULT_USERS,
    settings: INITIAL_SETTINGS,
    appointments: [],
    attendances: [],
    comandas: [],
    payments: [],
    expenses: [],
    consumptions: [],
    clientPackages: [],
    scheduleBlocks: [],
  };

  console.log(`Payload prepared:
- Clients: ${payload.clients.length}
- Services: ${payload.services.length}
- Professionals: ${payload.professionals.length}
- Inventory items: ${payload.inventory.length}
- Users: ${payload.users.length}`);

  const result = await put(BLOB_FILE_NAME, JSON.stringify(payload), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token,
  });

  console.log('Upload successful! Blob URL:', result.url);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
