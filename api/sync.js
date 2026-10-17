import { put } from '@vercel/blob';

const BLOB_FILE_NAME = 'total_beauty_db.json';
const BLOB_PUBLIC_URL = 'https://ewrowlrdje7mt5fn.public.blob.vercel-storage.com/total_beauty_db.json';

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

      const now = new Date().toISOString();
      const version = Date.now().toString();

      const payload = {
        ...body,
        version,
        updatedAt: now,
      };

      const result = await put(BLOB_FILE_NAME, JSON.stringify(payload), {
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
