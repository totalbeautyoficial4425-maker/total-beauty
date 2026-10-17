import { put } from '@vercel/blob';

const BLOB_FILE_NAME = 'total_beauty_db.json';
const BLOB_PUBLIC_URL = 'https://ewrowlrdje7mt5fn.public.blob.vercel-storage.com/total_beauty_db.json';

function mergeArrayById(existingList, incomingList) {
  if (!Array.isArray(existingList) && !Array.isArray(incomingList)) return [];
  if (!Array.isArray(incomingList)) return existingList || [];
  if (!Array.isArray(existingList)) return incomingList || [];

  const map = new Map();
  // Seed with existing items
  existingList.forEach(item => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });

  // Merge incoming items (take newer or add new)
  incomingList.forEach(item => {
    if (item && item.id) {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        const oldTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const newTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (newTime >= oldTime) {
          map.set(item.id, item);
        }
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

      const data = await response.json();
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

      // Fetch existing data from blob to perform safe server-side merge
      let existingData = {};
      try {
        const existingRes = await fetch(`${BLOB_PUBLIC_URL}?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        if (existingRes.ok) {
          existingData = await existingRes.json();
        }
      } catch (err) {
        console.warn('Failed to fetch existing data for merge:', err);
      }

      const now = new Date().toISOString();
      const version = Date.now().toString();

      const mergedPayload = {
        version,
        updatedAt: now,
        exportedAt: now,
        clients: mergeArrayById(existingData.clients, body.clients),
        services: mergeArrayById(existingData.services, body.services),
        professionals: mergeArrayById(existingData.professionals, body.professionals),
        appointments: mergeArrayById(existingData.appointments, body.appointments),
        attendances: mergeArrayById(existingData.attendances, body.attendances),
        comandas: mergeArrayById(existingData.comandas, body.comandas),
        payments: mergeArrayById(existingData.payments, body.payments),
        expenses: mergeArrayById(existingData.expenses, body.expenses),
        inventory: mergeArrayById(existingData.inventory, body.inventory),
        consumptions: mergeArrayById(existingData.consumptions, body.consumptions),
        clientPackages: mergeArrayById(existingData.clientPackages, body.clientPackages),
        scheduleBlocks: mergeArrayById(existingData.scheduleBlocks, body.scheduleBlocks),
        users: mergeArrayById(existingData.users, body.users),
        settings: { ...(existingData.settings || {}), ...(body.settings || {}) },
      };

      const result = await put(BLOB_FILE_NAME, JSON.stringify(mergedPayload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

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
