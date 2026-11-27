import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

const BLOB_FILE_NAME = 'total_beauty_db.json';
const BLOB_PUBLIC_URL = 'https://ewrowlrdje7mt5fn.public.blob.vercel-storage.com/total_beauty_db.json';
const BLOB_VERSION_FILE_NAME = 'total_beauty_version.json';
const BLOB_VERSION_PUBLIC_URL = 'https://ewrowlrdje7mt5fn.public.blob.vercel-storage.com/total_beauty_version.json';

// In-memory cache across serverless invocations for ultra-fast response (< 20ms)
let neonBlockedUntil = 0;
let inMemoryVersion = null;
let inMemoryUpdatedAt = null;
let inMemoryData = null;
let inMemoryDataExpires = 0;

function checkAndHandleNeonError(err) {
  const msg = String(err?.message || err || '');
  if (msg.includes('402') || msg.includes('quota') || msg.includes('exceeded the quota')) {
    // Block Neon queries for 1 hour so serverless functions respond instantly without waiting for Neon errors
    neonBlockedUntil = Date.now() + 60 * 60 * 1000;
    console.warn('Neon database quota reached (402). Seamlessly switching to ultra-fast Vercel Blob primary storage.');
  }
}

function getSql() {
  if (Date.now() < neonBlockedUntil) return null;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return null;
  try {
    return neon(dbUrl);
  } catch (e) {
    checkAndHandleNeonError(e);
    return null;
  }
}

async function ensureTable(sql) {
  if (!sql || Date.now() < neonBlockedUntil) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS total_beauty_cloud_sync (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        version TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  } catch (e) {
    checkAndHandleNeonError(e);
  }
}

/**
 * Load cloud database with dual-storage resilience:
 * 1. Checks memory cache first.
 * 2. Tries Vercel Blob (Ultra-reliable primary).
 * 3. Tries Neon Postgres in background if available and unblocked.
 */
async function loadDataFromCloud(sql) {
  // 1. Fast in-memory cache if fresh (under 2 seconds)
  if (inMemoryData && Date.now() < inMemoryDataExpires) {
    return inMemoryData;
  }

  // 2. Load from Vercel Blob (Indestructible primary storage)
  try {
    const ts = Date.now();
    const res = await fetch(`${BLOB_PUBLIC_URL}?t=${ts}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
    if (res.ok) {
      const blobData = await res.json();
      const ver = blobData?.version || blobData?.updatedAt || null;
      const upAt = blobData?.updatedAt || null;
      
      inMemoryVersion = ver;
      inMemoryUpdatedAt = upAt;
      inMemoryData = {
        source: 'blob',
        data: blobData,
        version: ver,
        updatedAt: upAt,
      };
      inMemoryDataExpires = Date.now() + 2000;
      return inMemoryData;
    }
  } catch (blobErr) {
    console.warn('Blob load fallback error:', blobErr?.message);
  }

  // 3. Optional fallback to Neon if Blob had network blip and Neon is not blocked
  if (sql && Date.now() >= neonBlockedUntil) {
    try {
      const rows = await sql`SELECT data, version, updated_at FROM total_beauty_cloud_sync WHERE id = 'main' LIMIT 1;`;
      if (rows.length > 0 && rows[0].data) {
        const row = rows[0];
        inMemoryVersion = row.version || row.data?.version || null;
        inMemoryUpdatedAt = row.updated_at;
        inMemoryData = {
          source: 'neon',
          data: row.data,
          version: inMemoryVersion,
          updatedAt: inMemoryUpdatedAt,
        };
        inMemoryDataExpires = Date.now() + 2000;
        return inMemoryData;
      }
    } catch (neonErr) {
      checkAndHandleNeonError(neonErr);
    }
  }

  return { source: 'empty', data: null, version: null, updatedAt: null };
}

/**
 * Save cloud database:
 * Always writes to Vercel Blob (guaranteed reliable), and attempts Neon in the background if unblocked.
 */
async function saveDataToCloud(sql, payload, version) {
  const nowIso = payload?.updatedAt || new Date().toISOString();
  
  // Update in-memory cache immediately
  inMemoryVersion = version;
  inMemoryUpdatedAt = nowIso;
  inMemoryData = {
    source: 'blob',
    data: payload,
    version,
    updatedAt: nowIso,
  };
  inMemoryDataExpires = Date.now() + 5000;

  // 1. Write to Vercel Blob as the primary reliable store
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      // Main DB file
      await put(BLOB_FILE_NAME, JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: blobToken,
      });

      // Lightweight version file for ultra-fast polling (< 50 bytes)
      put(BLOB_VERSION_FILE_NAME, JSON.stringify({ version, updatedAt: nowIso }), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: blobToken,
      }).catch(err => console.warn('Version blob put failed (non-fatal):', err?.message));

      // Backup DB file
      put('total_beauty_db_backup.json', JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: blobToken,
      }).catch(err => console.warn('Backup blob put failed (non-fatal):', err?.message));
    } catch (blobErr) {
      console.warn('Vercel Blob save failed:', blobErr?.message);
    }
  }

  // 2. Also save to Neon Postgres in background if unblocked
  if (sql && Date.now() >= neonBlockedUntil) {
    try {
      await sql`
        INSERT INTO total_beauty_cloud_sync (id, data, version, updated_at)
        VALUES ('main', ${JSON.stringify(payload)}, ${version}, NOW())
        ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data,
            version = EXCLUDED.version,
            updated_at = NOW();
      `;
    } catch (neonErr) {
      checkAndHandleNeonError(neonErr);
    }
  }
}

function mergeArrayById(existingList, incomingList, deletedIds = new Set()) {
  if (!Array.isArray(existingList) && !Array.isArray(incomingList)) return [];
  if (!Array.isArray(incomingList)) return (existingList || []).filter(item => item?.id && !deletedIds.has(item.id));
  if (!Array.isArray(existingList)) return (incomingList || []).filter(item => item?.id && !deletedIds.has(item.id));

  const map = new Map();
  // Seed with existing items (excluding deleted)
  existingList.forEach(item => {
    if (item && item.id && !deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  });

  // Merge incoming items (take newer or add new, excluding deleted)
  incomingList.forEach(item => {
    if (item && item.id && !deletedIds.has(item.id)) {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        const oldTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const newTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (newTime > oldTime) {
          map.set(item.id, item);
        } else if (newTime === oldTime) {
          // Preserve paid or finished state
          const incomingIsPaid = item.paymentStatus === 'pago' || item.status === 'pago' || !!item.finishedAt;
          const existingIsPaid = existing.paymentStatus === 'pago' || existing.status === 'pago' || !!existing.finishedAt;
          if (incomingIsPaid && !existingIsPaid) {
            map.set(item.id, item);
          }
        }
      }
    }
  });

  return Array.from(map.values());
}

function mergeUsers(existingList, incomingList) {
  if (!Array.isArray(existingList) && !Array.isArray(incomingList)) return [];
  if (!Array.isArray(incomingList)) return existingList || [];
  if (!Array.isArray(existingList)) return incomingList || [];

  const map = new Map();
  existingList.forEach(u => {
    if (u && u.id) map.set(u.id, u);
  });

  incomingList.forEach(u => {
    if (!u || !u.id) return;
    const existing = map.get(u.id);
    if (!existing) {
      map.set(u.id, u);
    } else {
      const existingTime = new Date(existing.passwordUpdatedAt || existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(u.passwordUpdatedAt || u.updatedAt || u.createdAt || 0).getTime();

      // If incoming has passwordHash and is newer or equal, or if existing has no passwordHash
      if (incomingTime >= existingTime || (u.passwordHash && !existing.passwordHash)) {
        map.set(u.id, {
          ...existing,
          ...u,
          passwordHash: u.passwordHash || existing.passwordHash,
          passwordUpdatedAt: u.passwordUpdatedAt || existing.passwordUpdatedAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString()
        });
      } else {
        // existing has a newer passwordUpdatedAt, preserve existing passwordHash
        map.set(u.id, {
          ...u,
          ...existing,
          passwordHash: existing.passwordHash || u.passwordHash,
        });
      }
    }
  });

  return Array.from(map.values());
}

export default async function handler(req, res) {
  // CORS configuration to allow cross-origin requests from any client / phone
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Sync-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = getSql();
    await ensureTable(sql);

    // =========================================================================
    // GET: PULL DATA OR CHECK VERSION
    // =========================================================================
    if (req.method === 'GET') {
      const clientVersion = req.headers['x-sync-version'] || req.query?.current_version;
      const isVersionOnly = req.query?.version_only === 'true';

      // ULTRA-FAST PATH 1: Instant in-memory check without touching Blob or DB (< 1ms)
      if (clientVersion && inMemoryVersion && clientVersion === inMemoryVersion) {
        return res.status(200).json({
          success: true,
          notModified: true,
          version: inMemoryVersion,
          updatedAt: inMemoryUpdatedAt
        });
      }

      // ULTRA-FAST PATH 2: Lightweight 50-byte version-only check for mobile phones
      if (isVersionOnly) {
        if (inMemoryVersion) {
          return res.status(200).json({
            success: true,
            version: inMemoryVersion,
            updatedAt: inMemoryUpdatedAt
          });
        }

        try {
          const vRes = await fetch(`${BLOB_VERSION_PUBLIC_URL}?t=${Date.now()}`, {
            headers: { 'Cache-Control': 'no-cache, no-store' }
          });
          if (vRes.ok) {
            const vJson = await vRes.json();
            if (vJson?.version) {
              inMemoryVersion = vJson.version;
              inMemoryUpdatedAt = vJson.updatedAt;
              if (clientVersion && clientVersion === vJson.version) {
                return res.status(200).json({
                  success: true,
                  notModified: true,
                  version: vJson.version,
                  updatedAt: vJson.updatedAt
                });
              }
              return res.status(200).json({
                success: true,
                version: vJson.version,
                updatedAt: vJson.updatedAt
              });
            }
          }
        } catch (vErr) {
          // Fall through to loading full cloud state
        }
      }

      const cloudState = await loadDataFromCloud(sql);

      if (!cloudState.data) {
        return res.status(200).json({ success: true, empty: true, version: null });
      }

      const currentVer = cloudState.version || cloudState.data?.version || null;

      // Fast path: version check
      if (clientVersion && currentVer && clientVersion === currentVer) {
        return res.status(200).json({
          success: true,
          notModified: true,
          version: currentVer,
          updatedAt: cloudState.updatedAt
        });
      }

      if (isVersionOnly) {
        return res.status(200).json({
          success: true,
          version: currentVer,
          updatedAt: cloudState.updatedAt
        });
      }

      return res.status(200).json({
        success: true,
        version: currentVer,
        data: cloudState.data,
      });
    }

    // =========================================================================
    // POST: PUSH DATA OR ATOMIC ACTIONS
    // =========================================================================
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return res.status(400).json({ success: false, error: 'Invalid JSON body' });
        }
      }

      if (!body) {
        return res.status(400).json({ success: false, error: 'Empty body' });
      }

      const cloudState = await loadDataFromCloud(sql);
      let existingData = cloudState.data;

      const now = new Date().toISOString();
      const version = Date.now().toString();

      // If existing data cannot be loaded yet, initialize with body safely
      if (!existingData) {
        existingData = body;
      }

      // FAST ATOMIC ACTION: Change or Reset Password directly in Cloud Database
      if (body.action === 'change_password') {
        const { userId, passwordHash, passwordUpdatedAt } = body;
        if (!userId || !passwordHash) {
          return res.status(400).json({ success: false, error: 'Missing userId or passwordHash' });
        }
        
        let usersList = Array.isArray(existingData.users) ? existingData.users : [];
        let found = false;
        usersList = usersList.map(u => {
          if (u.id === userId) {
            found = true;
            return {
              ...u,
              passwordHash,
              passwordUpdatedAt: passwordUpdatedAt || now,
              updatedAt: now,
              forcePasswordChange: false
            };
          }
          return u;
        });

        if (!found) {
          usersList.push({
            id: userId,
            username: userId === 'user_admin_01' ? 'admin' : userId,
            role: userId === 'user_admin_01' ? 'admin' : 'profissional',
            passwordHash,
            passwordUpdatedAt: passwordUpdatedAt || now,
            updatedAt: now,
            forcePasswordChange: false,
            createdAt: now,
          });
        }

        existingData.users = usersList;
        existingData.updatedAt = now;
        existingData.version = version;

        await saveDataToCloud(sql, existingData, version);

        return res.status(200).json({ success: true, message: 'Senha atualizada na nuvem com sucesso.', version });
      }

      // FAST ATOMIC ACTION: Reset Admin Password with Salon Identity Verification
      if (body.action === 'reset_admin_password') {
        const { verification, newPasswordHash } = body;
        if (!verification || !newPasswordHash) {
          return res.status(400).json({ success: false, error: 'Código ou dado de verificação e nova senha são obrigatórios.' });
        }

        const cleanVerif = String(verification).replace(/\D/g, ''); // digits only
        const cleanEmail = String(verification).trim().toLowerCase();
        
        const salonPhone = String(existingData.settings?.whatsapp || '34998876017').replace(/\D/g, '');
        const salonEmail = String(existingData.settings?.email || 'totalbeautyoficial4425@gmail.com').trim().toLowerCase();
        const adminEmail = 'gestao@totalbeautyoficial.com.br';

        const isPhoneMatch = (cleanVerif.length >= 4 && salonPhone.endsWith(cleanVerif)) || (cleanVerif === salonPhone);
        const isEmailMatch = cleanEmail === salonEmail || cleanEmail === adminEmail;

        if (!isPhoneMatch && !isEmailMatch) {
          return res.status(401).json({ 
            success: false, 
            error: 'Verificação incorreta. Digite o WhatsApp oficial do salão (ex: final 6017 ou completo) ou o e-mail cadastrado.' 
          });
        }

        let usersList = Array.isArray(existingData.users) ? existingData.users : [];
        let found = false;
        usersList = usersList.map(u => {
          if (u.id === 'user_admin_01' || u.role === 'admin' || u.username === 'admin') {
            found = true;
            return {
              ...u,
              passwordHash: newPasswordHash,
              passwordUpdatedAt: now,
              updatedAt: now,
              forcePasswordChange: false
            };
          }
          return u;
        });

        if (!found) {
          usersList.push({
            id: 'user_admin_01',
            username: 'admin',
            role: 'admin',
            name: 'Administradora Total Beauty',
            email: 'gestao@totalbeautyoficial.com.br',
            passwordHash: newPasswordHash,
            passwordUpdatedAt: now,
            updatedAt: now,
            forcePasswordChange: false,
            createdAt: now,
          });
        }

        existingData.users = usersList;
        existingData.updatedAt = now;
        existingData.version = version;

        await saveDataToCloud(sql, existingData, version);

        return res.status(200).json({ success: true, message: 'Senha do administrador redefinida com sucesso na nuvem.', version });
      }

      const allDeletedIds = new Set([
        ...(Array.isArray(existingData.deletedIds) ? existingData.deletedIds : []),
        ...(Array.isArray(body.deletedIds) ? body.deletedIds : [])
      ]);

      const mergedClients = mergeArrayById(existingData.clients, body.clients, allDeletedIds);
      const mergedServices = mergeArrayById(existingData.services, body.services, allDeletedIds);
      const mergedProfessionals = mergeArrayById(existingData.professionals, body.professionals, allDeletedIds);
      const mergedAppointments = mergeArrayById(existingData.appointments, body.appointments, allDeletedIds);
      const mergedAttendances = mergeArrayById(existingData.attendances, body.attendances, allDeletedIds);
      const mergedComandas = mergeArrayById(existingData.comandas, body.comandas, allDeletedIds);
      const mergedPayments = mergeArrayById(existingData.payments, body.payments, allDeletedIds);
      const mergedExpenses = mergeArrayById(existingData.expenses, body.expenses, allDeletedIds);
      const mergedInventory = mergeArrayById(existingData.inventory, body.inventory, allDeletedIds);
      const mergedConsumptions = mergeArrayById(existingData.consumptions, body.consumptions, allDeletedIds);
      const mergedClientPackages = mergeArrayById(existingData.clientPackages, body.clientPackages, allDeletedIds);
      const mergedScheduleBlocks = mergeArrayById(existingData.scheduleBlocks, body.scheduleBlocks, allDeletedIds);
      const mergedUsers = mergeUsers(existingData.users, body.users);

      // CATASTROPHIC WIPE PREVENTION GUARD:
      // Prevent unhydrated or corrupted client from wiping out established database tables
      if (existingData.clients?.length > 50 && (!body.clients || body.clients.length === 0)) {
        return res.status(400).json({ success: false, error: 'Integrity check failed: clients payload empty.' });
      }
      if (existingData.services?.length > 10 && (!body.services || body.services.length === 0)) {
        return res.status(400).json({ success: false, error: 'Integrity check failed: services payload empty.' });
      }
      if (existingData.professionals?.length > 2 && (!body.professionals || body.professionals.length === 0)) {
        return res.status(400).json({ success: false, error: 'Integrity check failed: professionals payload empty.' });
      }
      if (existingData.appointments?.length > 10 && (!body.appointments || body.appointments.length === 0)) {
        return res.status(400).json({ success: false, error: 'Integrity check failed: appointments payload empty.' });
      }

      const mergedPayload = {
        version,
        updatedAt: now,
        exportedAt: now,
        deletedIds: Array.from(allDeletedIds),
        clients: mergedClients,
        services: mergedServices,
        professionals: mergedProfessionals,
        appointments: mergedAppointments,
        attendances: mergedAttendances,
        comandas: mergedComandas,
        payments: mergedPayments,
        expenses: mergedExpenses,
        inventory: mergedInventory,
        consumptions: mergedConsumptions,
        clientPackages: mergedClientPackages,
        scheduleBlocks: mergedScheduleBlocks,
        users: mergedUsers,
        settings: { ...(existingData.settings || {}), ...(body.settings || {}) },
      };

      await saveDataToCloud(sql, mergedPayload, version);

      return res.status(200).json({
        success: true,
        version,
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Sync API Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
