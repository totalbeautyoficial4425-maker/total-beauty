import { storageService, STORAGE_KEYS, registerDataChangeListener } from './storage';
import { idbStorage } from './idbStorage';
import {
  Client,
  Service,
  Professional,
  Appointment,
  Attendance,
  PaymentTransaction,
  Expense,
  InventoryItem,
  ProductConsumption,
  Comanda,
  ClientPackage,
  ScheduleBlock,
  User,
  CompanySettings
} from '../types';

const SYNC_API_ENDPOINT = '/api/sync';
const CDN_FALLBACK_URL = 'https://ewrowlrdje7mt5fn.public.blob.vercel-storage.com/total_beauty_db.json';
const LAST_CLOUD_VERSION_KEY = 'tb_last_cloud_version';

let lastKnownVersion = '';
let isPushing = false;
let isPulling = false;
let pendingPushTimeout: any = null;

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`LocalStorage quota exceeded for ${key}`);
  }
}

/**
 * Merge two arrays of entities by their unique 'id'.
 * If an item exists in both, takes the one with latest updatedAt/createdAt or local.
 */
function mergeById<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  localList: T[],
  remoteList: T[]
): T[] {
  const map = new Map<string, T>();

  // Add all local items first
  localList.forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });

  // Merge remote items
  remoteList.forEach(remoteItem => {
    if (!remoteItem || !remoteItem.id) return;
    const localItem = map.get(remoteItem.id);
    if (!localItem) {
      map.set(remoteItem.id, remoteItem);
    } else {
      // If remote has a newer timestamp, take remote
      const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
      const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();
      if (remoteTime >= localTime) {
        map.set(remoteItem.id, remoteItem);
      }
    }
  });

  return Array.from(map.values());
}

export const cloudSyncService = {
  /**
   * Pull the complete database from Vercel Cloud and merge into local storage.
   */
  async pullFromCloud(): Promise<{ success: boolean; hasChanges: boolean }> {
    if (isPulling) return { success: false, hasChanges: false };
    isPulling = true;

    try {
      // 1. Try serverless endpoint first, fallback to direct CDN url
      let response: Response;
      try {
        response = await fetch(`${SYNC_API_ENDPOINT}?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!response.ok && response.status === 404) {
          throw new Error('API route not ready, using CDN fallback');
        }
      } catch {
        response = await fetch(`${CDN_FALLBACK_URL}?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
      }

      if (!response.ok) {
        return { success: false, hasChanges: false };
      }

      const resJson = await response.json();
      const cloudData = resJson.data || resJson;

      if (!cloudData || typeof cloudData !== 'object' || resJson.empty) {
        // If cloud database is empty, seed it immediately from local database
        await this.pushToCloud();
        return { success: true, hasChanges: false };
      }

      const cloudVersion = cloudData.version || cloudData.updatedAt || resJson.version;
      const storedVersion = localStorage.getItem(LAST_CLOUD_VERSION_KEY) || lastKnownVersion;

      // If version is identical, no need to re-parse and overwrite
      if (cloudVersion && cloudVersion === storedVersion && storedVersion !== '') {
        return { success: true, hasChanges: false };
      }

      // Merge each collection
      if (Array.isArray(cloudData.appointments)) {
        const localApts = storageService.getAppointments();
        const mergedApts = mergeById(localApts, cloudData.appointments);
        safeSetItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(mergedApts));
        idbStorage.setItem(STORAGE_KEYS.APPOINTMENTS, mergedApts);
      }

      if (Array.isArray(cloudData.attendances)) {
        const localAtds = storageService.getAttendances();
        const mergedAtds = mergeById(localAtds, cloudData.attendances);
        safeSetItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(mergedAtds));
        idbStorage.setItem(STORAGE_KEYS.ATTENDANCES, mergedAtds);
      }

      if (Array.isArray(cloudData.comandas)) {
        const localComs = storageService.getComandas();
        const mergedComs = mergeById(localComs, cloudData.comandas);
        safeSetItem(STORAGE_KEYS.COMANDAS, JSON.stringify(mergedComs));
        idbStorage.setItem(STORAGE_KEYS.COMANDAS, mergedComs);
      }

      if (Array.isArray(cloudData.payments)) {
        const localPays = storageService.getPayments();
        const mergedPays = mergeById(localPays, cloudData.payments);
        safeSetItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(mergedPays));
        idbStorage.setItem(STORAGE_KEYS.PAYMENTS, mergedPays);
      }

      if (Array.isArray(cloudData.expenses)) {
        const localExps = storageService.getExpenses();
        const mergedExps = mergeById(localExps, cloudData.expenses);
        safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(mergedExps));
        idbStorage.setItem(STORAGE_KEYS.EXPENSES, mergedExps);
      }

      if (Array.isArray(cloudData.inventory)) {
        const localInv = storageService.getInventory();
        const mergedInv = mergeById(localInv, cloudData.inventory);
        safeSetItem(STORAGE_KEYS.INVENTORY, JSON.stringify(mergedInv));
        idbStorage.setItem(STORAGE_KEYS.INVENTORY, mergedInv);
      }

      if (Array.isArray(cloudData.consumptions)) {
        const localCons = storageService.getConsumptions();
        const mergedCons = mergeById(localCons, cloudData.consumptions);
        safeSetItem(STORAGE_KEYS.CONSUMPTIONS, JSON.stringify(mergedCons));
        idbStorage.setItem(STORAGE_KEYS.CONSUMPTIONS, mergedCons);
      }

      if (Array.isArray(cloudData.clientPackages)) {
        const localPkgs = storageService.getClientPackages();
        const mergedPkgs = mergeById(localPkgs, cloudData.clientPackages);
        safeSetItem(STORAGE_KEYS.CLIENT_PACKAGES, JSON.stringify(mergedPkgs));
        idbStorage.setItem(STORAGE_KEYS.CLIENT_PACKAGES, mergedPkgs);
      }

      if (Array.isArray(cloudData.scheduleBlocks)) {
        const localBlocks = storageService.getScheduleBlocks();
        const mergedBlocks = mergeById(localBlocks, cloudData.scheduleBlocks);
        safeSetItem(STORAGE_KEYS.SCHEDULE_BLOCKS, JSON.stringify(mergedBlocks));
        idbStorage.setItem(STORAGE_KEYS.SCHEDULE_BLOCKS, mergedBlocks);
      }

      if (Array.isArray(cloudData.clients) && cloudData.clients.length > 0) {
        const localClients = storageService.getClients();
        if (cloudData.clients.length >= localClients.length) {
          const mergedClients = mergeById(localClients, cloudData.clients);
          safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(mergedClients));
          idbStorage.setItem(STORAGE_KEYS.CLIENTS, mergedClients);
        }
      }

      if (Array.isArray(cloudData.services) && cloudData.services.length > 0) {
        safeSetItem(STORAGE_KEYS.SERVICES, JSON.stringify(cloudData.services));
        idbStorage.setItem(STORAGE_KEYS.SERVICES, cloudData.services);
      }

      if (Array.isArray(cloudData.professionals) && cloudData.professionals.length > 0) {
        safeSetItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(cloudData.professionals));
        idbStorage.setItem(STORAGE_KEYS.PROFESSIONALS, cloudData.professionals);
      }

      if (cloudVersion) {
        lastKnownVersion = cloudVersion;
        safeSetItem(LAST_CLOUD_VERSION_KEY, cloudVersion);
      }

      return { success: true, hasChanges: true };
    } catch (err) {
      console.warn('Cloud sync pull error:', err);
      return { success: false, hasChanges: false };
    } finally {
      isPulling = false;
    }
  },

  /**
   * Push the entire current local database to Vercel Cloud storage.
   */
  async pushToCloud(): Promise<{ success: boolean; error?: string }> {
    if (isPushing) return { success: false, error: 'Push in progress' };
    isPushing = true;

    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        clients: storageService.getClients(),
        services: storageService.getServices(),
        professionals: storageService.getProfessionals(),
        appointments: storageService.getAppointments(),
        attendances: storageService.getAttendances(),
        comandas: storageService.getComandas(),
        payments: storageService.getPayments(),
        expenses: storageService.getExpenses(),
        inventory: storageService.getInventory(),
        consumptions: storageService.getConsumptions(),
        clientPackages: storageService.getClientPackages(),
        scheduleBlocks: storageService.getScheduleBlocks(),
        settings: storageService.getSettings(),
        users: storageService.getUsers(),
      };

      const res = await fetch(SYNC_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn('Cloud sync push response not ok:', errorText);
        return { success: false, error: errorText };
      }

      const resJson = await res.json();
      if (resJson.version) {
        lastKnownVersion = resJson.version;
        safeSetItem(LAST_CLOUD_VERSION_KEY, resJson.version);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Cloud sync push failed:', err);
      return { success: false, error: err?.message || 'Network error' };
    } finally {
      isPushing = false;
    }
  },

  /**
   * Trigger a debounced push to cloud whenever a change is made locally.
   */
  scheduleDebouncedPush(): void {
    if (pendingPushTimeout) {
      clearTimeout(pendingPushTimeout);
    }
    pendingPushTimeout = setTimeout(() => {
      this.pushToCloud();
    }, 400);
  },

  /**
   * Starts real-time heartbeat synchronization across all devices.
   */
  startAutoSync(onRemoteUpdate: () => void): () => void {
    // 1. Initial pull on startup
    this.pullFromCloud().then(res => {
      if (res.hasChanges) {
        onRemoteUpdate();
      }
    });

    // 2. Periodic sync heartbeat every 8 seconds
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Pause while app is in background to save battery
      }
      const res = await this.pullFromCloud();
      if (res.hasChanges) {
        onRemoteUpdate();
      }
    }, 8000);

    // 3. Immediate pull on focus (user switches back to tab or unlocks phone)
    const handleFocus = async () => {
      const res = await this.pullFromCloud();
      if (res.hasChanges) {
        onRemoteUpdate();
      }
    };

    // 4. Immediate pull on visibilitychange (e.g. iPhone / Android home screen resume)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const res = await this.pullFromCloud();
        if (res.hasChanges) {
          onRemoteUpdate();
        }
      }
    };

    // 5. Online event
    const handleOnline = async () => {
      await this.pushToCloud();
      const res = await this.pullFromCloud();
      if (res.hasChanges) {
        onRemoteUpdate();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }
};

// Automatically schedule push to Vercel Cloud whenever local storage changes
registerDataChangeListener(() => {
  cloudSyncService.scheduleDebouncedPush();
});
