import { put } from '@vercel/blob';

const BLOB_FILE_NAME = 'total_beauty_db.json';
const BLOB_PUBLIC_URL = 'https://ewrowlrdje7mt5fn.public.blob.vercel-storage.com/total_beauty_db.json';

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
    if (req.method === 'GET') {
      const ts = Date.now();
      const response = await fetch(`${BLOB_PUBLIC_URL}?t=${ts}`, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });

      if (!response.ok) {
        return res.status(200).json({ success: true, empty: true, data: null });
      }

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        return res.status(200).json({ success: true, empty: true, data: null });
      }

      return res.status(200).json({
        success: true,
        version: data?.version || data?.exportedAt || null,
        data,
      });
    }

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

      // Fetch existing data from blob with retry to perform safe server-side merge
      let existingData = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const existingRes = await fetch(`${BLOB_PUBLIC_URL}?t=${Date.now()}`, {
            headers: { 'Cache-Control': 'no-cache, no-store' }
          });
          if (existingRes.ok) {
            existingData = await existingRes.json();
            break;
          }
        } catch (err) {
          console.warn(`Attempt ${attempt} to fetch existing data failed:`, err);
        }
      }

      // If existing data cannot be loaded, do NOT overwrite with incoming data to prevent catastrophic loss!
      if (!existingData) {
        return res.status(503).json({ success: false, error: 'Cannot verify cloud state. Aborting push to prevent data loss.' });
      }

      const now = new Date().toISOString();
      const version = Date.now().toString();

      // FAST ATOMIC ACTION: Change or Reset Password directly in Cloud Blob
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

        await put(BLOB_FILE_NAME, JSON.stringify(existingData), {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

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

        await put(BLOB_FILE_NAME, JSON.stringify(existingData), {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

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

      const result = await put(BLOB_FILE_NAME, JSON.stringify(mergedPayload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      // Keep redundant backup file on blob storage
      try {
        await put('total_beauty_db_backup.json', JSON.stringify(mergedPayload), {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (backupErr) {
        console.warn('Backup put failed (non-fatal):', backupErr);
      }

      return res.status(200).json({
        success: true,
        version,
        url: result.url,
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
