/**
 * High-Capacity IndexedDB Storage Engine for Total Beauty
 * Expands browser storage from 5MB (localStorage) to Gigabytes (IndexedDB)
 * and acts as a fast local mirror alongside Firebase Cloud Firestore.
 */

const DB_NAME = 'total_beauty_high_capacity_db';
const DB_VERSION = 1;
const STORE_NAME = 'tb_collections';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.warn('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export const idbStorage = {
  /**
   * Save a collection or value into high-capacity IndexedDB
   */
  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({
          key,
          value,
          updatedAt: new Date().toISOString(),
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`Failed to write key "${key}" to IndexedDB:`, err);
      return false;
    }
  },

  /**
   * Read a collection or value from high-capacity IndexedDB
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.value !== undefined) {
            resolve(req.result.value as T);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`Failed to read key "${key}" from IndexedDB:`, err);
      return null;
    }
  },

  /**
   * Request persistent high-capacity storage from the browser and estimate quota
   */
  async getStorageStats(): Promise<{
    usageBytes: number;
    quotaBytes: number;
    usageMB: string;
    quotaGB: string;
    percentUsed: number;
    isPersistent: boolean;
  }> {
    let usageBytes = 0;
    let quotaBytes = 10 * 1024 * 1024 * 1024; // Default 10 GB fallback display
    let isPersistent = false;

    try {
      if (navigator.storage) {
        if (navigator.storage.persisted) {
          isPersistent = await navigator.storage.persisted();
          if (!isPersistent && navigator.storage.persist) {
            isPersistent = await navigator.storage.persist();
          }
        }
        if (navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage !== undefined) usageBytes = estimate.usage;
          if (estimate.quota !== undefined && estimate.quota > 0) quotaBytes = estimate.quota;
        }
      }
    } catch (e) {
      // Fallback calculation from localStorage size
      let totalChars = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          totalChars += (localStorage.getItem(k) || '').length;
        }
      }
      usageBytes = totalChars * 2;
    }

    const usageMB = (usageBytes / (1024 * 1024)).toFixed(2);
    const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(1);
    const percentUsed = quotaBytes > 0 ? Math.min(100, (usageBytes / quotaBytes) * 100) : 0;

    return {
      usageBytes,
      quotaBytes,
      usageMB,
      quotaGB,
      percentUsed,
      isPersistent,
    };
  },
};
