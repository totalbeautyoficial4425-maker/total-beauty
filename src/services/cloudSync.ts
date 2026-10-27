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
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('tb_realtime_sync');
  }
} catch {
  broadcastChannel = null;
}

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
  remoteList: T[],
  deletedIdsSet: Set<string> = new Set()
): T[] {
  const map = new Map<string, T>();

  // Add all local items first (excluding deleted)
  localList.forEach(item => {
    if (item && item.id && !deletedIdsSet.has(item.id)) map.set(item.id, item);
  });

  // Merge remote items (excluding deleted)
  remoteList.forEach(remoteItem => {
    if (!remoteItem || !remoteItem.id || deletedIdsSet.has(remoteItem.id)) return;
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

const mergeCollections = mergeById;

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

      // Check if local storage is missing any critical collections that remote has
      const localAtds = storageService.getAttendances();
      const localCmds = storageService.getComandas();
      const localPays = storageService.getPayments();
      const localApts = storageService.getAppointments();

      const isLocalMissingData = 
        (localAtds.length === 0 && (cloudData.attendances?.length || 0) > 0) ||
        (localCmds.length === 0 && (cloudData.comandas?.length || 0) > 0) ||
        (localPays.length === 0 && (cloudData.payments?.length || 0) > 0) ||
        (localApts.length === 0 && (cloudData.appointments?.length || 0) > 0);

      // If version is identical and local has data, skip re-parse
      if (!isLocalMissingData && cloudVersion && cloudVersion === storedVersion && storedVersion !== '') {
        return { success: true, hasChanges: false };
      }

      if (Array.isArray(cloudData.deletedIds)) {
        cloudData.deletedIds.forEach((id: string) => storageService.recordDeletedId(id));
      }
      const deletedIdsSet = new Set(storageService.getDeletedIds());

      let hasAnyChange = false;

      // 1. Appointments
      if (Array.isArray(cloudData.appointments)) {
        const merged = mergeCollections(localApts, cloudData.appointments, deletedIdsSet);
        if (merged.length !== localApts.length || JSON.stringify(merged) !== JSON.stringify(localApts)) {
          safeSetItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.APPOINTMENTS, merged);
          hasAnyChange = true;
        }
      }

      // 2. Attendances
      if (Array.isArray(cloudData.attendances)) {
        const merged = mergeCollections(localAtds, cloudData.attendances, deletedIdsSet);
        if (merged.length !== localAtds.length || JSON.stringify(merged) !== JSON.stringify(localAtds)) {
          safeSetItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.ATTENDANCES, merged);
          hasAnyChange = true;
        }
      }

      // 3. Comandas
      if (Array.isArray(cloudData.comandas)) {
        const merged = mergeCollections(localCmds, cloudData.comandas, deletedIdsSet);
        if (merged.length !== localCmds.length || JSON.stringify(merged) !== JSON.stringify(localCmds)) {
          safeSetItem(STORAGE_KEYS.COMANDAS, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.COMANDAS, merged);
          hasAnyChange = true;
        }
      }

      // 4. Payments
      if (Array.isArray(cloudData.payments)) {
        const merged = mergeCollections(localPays, cloudData.payments, deletedIdsSet);
        if (merged.length !== localPays.length || JSON.stringify(merged) !== JSON.stringify(localPays)) {
          safeSetItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.PAYMENTS, merged);
          hasAnyChange = true;
        }
      }

      // 5. Expenses
      if (Array.isArray(cloudData.expenses)) {
        const local = storageService.getExpenses();
        const merged = mergeCollections(local, cloudData.expenses, deletedIdsSet);
        if (merged.length !== local.length || JSON.stringify(merged) !== JSON.stringify(local)) {
          safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.EXPENSES, merged);
          hasAnyChange = true;
        }
      }

      // 6. Inventory
      if (Array.isArray(cloudData.inventory) && cloudData.inventory.length > 0) {
        const local = storageService.getInventory();
        const merged = mergeCollections(local, cloudData.inventory);
        if (merged.length !== local.length || JSON.stringify(merged) !== JSON.stringify(local)) {
          safeSetItem(STORAGE_KEYS.INVENTORY, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.INVENTORY, merged);
          hasAnyChange = true;
        }
      }

      // 7. Consumptions
      if (Array.isArray(cloudData.consumptions)) {
        const local = storageService.getConsumptions();
        const merged = mergeCollections(local, cloudData.consumptions, deletedIdsSet);
        if (merged.length !== local.length || JSON.stringify(merged) !== JSON.stringify(local)) {
          safeSetItem(STORAGE_KEYS.CONSUMPTIONS, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.CONSUMPTIONS, merged);
          hasAnyChange = true;
        }
      }

      // 8. Client Packages
      if (Array.isArray(cloudData.clientPackages)) {
        const local = storageService.getClientPackages();
        const merged = mergeCollections(local, cloudData.clientPackages);
        if (merged.length !== local.length || JSON.stringify(merged) !== JSON.stringify(local)) {
          safeSetItem(STORAGE_KEYS.CLIENT_PACKAGES, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.CLIENT_PACKAGES, merged);
          hasAnyChange = true;
        }
      }

      // 9. Schedule Blocks
      if (Array.isArray(cloudData.scheduleBlocks)) {
        const local = storageService.getScheduleBlocks();
        const merged = mergeCollections(local, cloudData.scheduleBlocks, deletedIdsSet);
        if (merged.length !== local.length || JSON.stringify(merged) !== JSON.stringify(local)) {
          safeSetItem(STORAGE_KEYS.SCHEDULE_BLOCKS, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.SCHEDULE_BLOCKS, merged);
          hasAnyChange = true;
        }
      }

      // 10. Clients
      if (Array.isArray(cloudData.clients) && cloudData.clients.length > 0) {
        const local = storageService.getClients();
        const merged = mergeCollections(local, cloudData.clients);
        if (merged.length !== local.length) {
          safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.CLIENTS, merged);
          hasAnyChange = true;
        }
      }

      // 11. Services
      if (Array.isArray(cloudData.services) && cloudData.services.length > 0) {
        const local = storageService.getServices();
        const merged = mergeCollections(local, cloudData.services);
        if (merged.length !== local.length) {
          safeSetItem(STORAGE_KEYS.SERVICES, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.SERVICES, merged);
          hasAnyChange = true;
        }
      }

      // 12. Professionals
      if (Array.isArray(cloudData.professionals) && cloudData.professionals.length > 0) {
        const local = storageService.getProfessionals();
        const merged = mergeCollections(local, cloudData.professionals);
        if (merged.length !== local.length) {
          safeSetItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(merged));
          idbStorage.setItem(STORAGE_KEYS.PROFESSIONALS, merged);
          hasAnyChange = true;
        }
      }

      // 13. Users
      if (Array.isArray(cloudData.users) && cloudData.users.length > 0) {
        const local = storageService.getUsers();
        let usersModified = false;
        
        const mergedUsers = cloudData.users.map((remoteUser: User) => {
          const localUser = local.find(l => l.id === remoteUser.id);
          // If remote user has a passwordHash, immediately sync to tb_pwd_
          if (remoteUser.passwordHash) {
            safeSetItem('tb_pwd_' + remoteUser.id, remoteUser.passwordHash);
            idbStorage.setItem('tb_pwd_' + remoteUser.id, remoteUser.passwordHash);
          }

          if (!localUser) {
            usersModified = true;
            return remoteUser;
          }

          const localTime = new Date(localUser.passwordUpdatedAt || localUser.updatedAt || localUser.createdAt || 0).getTime();
          const remoteTime = new Date(remoteUser.passwordUpdatedAt || remoteUser.updatedAt || remoteUser.createdAt || 0).getTime();

          if (remoteTime >= localTime || (!localUser.passwordHash && remoteUser.passwordHash)) {
            if (JSON.stringify(localUser) !== JSON.stringify(remoteUser)) {
              usersModified = true;
            }
            return {
              ...localUser,
              ...remoteUser,
              passwordHash: remoteUser.passwordHash || localUser.passwordHash,
              passwordUpdatedAt: remoteUser.passwordUpdatedAt || localUser.passwordUpdatedAt
            };
          } else {
            // Local is newer
            return {
              ...remoteUser,
              ...localUser,
              passwordHash: localUser.passwordHash || remoteUser.passwordHash,
              passwordUpdatedAt: localUser.passwordUpdatedAt || remoteUser.passwordUpdatedAt
            };
          }
        });

        // Add any local users not in remote
        local.forEach(l => {
          if (!mergedUsers.some((m: User) => m.id === l.id)) {
            mergedUsers.push(l);
            usersModified = true;
          }
        });

        if (usersModified || mergedUsers.length !== local.length || JSON.stringify(local) !== JSON.stringify(mergedUsers)) {
          safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(mergedUsers));
          idbStorage.setItem(STORAGE_KEYS.USERS, mergedUsers);
          hasAnyChange = true;
        }
      }

      if (cloudData.settings && typeof cloudData.settings === 'object') {
        safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cloudData.settings));
        idbStorage.setItem(STORAGE_KEYS.SETTINGS, cloudData.settings);
      }

      if (cloudVersion) {
        lastKnownVersion = cloudVersion;
        safeSetItem(LAST_CLOUD_VERSION_KEY, cloudVersion);
      }

      return { success: true, hasChanges: hasAnyChange };
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

    // SAFETY GUARD: Never push if local database is not yet hydrated!
    const localClients = storageService.getClients();
    const localProfs = storageService.getProfessionals();
    if (localClients.length === 0 || localProfs.length === 0) {
      console.warn('Skipping pushToCloud: local database is not yet hydrated.');
      return { success: false, error: 'Database not hydrated' };
    }

    isPushing = true;

    try {
      const usersToPush = storageService.getUsers().map(u => {
        const pwdHash = storageService.getUserPasswordHash(u.id) || u.passwordHash;
        return {
          ...u,
          passwordHash: pwdHash || undefined,
          passwordUpdatedAt: u.passwordUpdatedAt || (pwdHash ? new Date().toISOString() : undefined),
          updatedAt: u.updatedAt || new Date().toISOString(),
        };
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        deletedIds: storageService.getDeletedIds(),
        clients: localClients,
        services: storageService.getServices(),
        professionals: localProfs,
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
        users: usersToPush,
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
        try {
          broadcastChannel?.postMessage({ type: 'sync_update', version: resJson.version });
        } catch {
          // ignore
        }
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
   * Fast, atomic cloud synchronization for user password change
   */
  async syncUserPasswordToCloud(userId: string, passwordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(SYNC_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'change_password',
          userId,
          passwordHash,
          passwordUpdatedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: errText };
      }

      const resJson = await res.json();
      if (resJson.version) {
        lastKnownVersion = resJson.version;
        safeSetItem(LAST_CLOUD_VERSION_KEY, resJson.version);
        try {
          broadcastChannel?.postMessage({ type: 'sync_update', version: resJson.version });
        } catch {}
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Direct password cloud sync failed:', err);
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  /**
   * Fast, atomic admin password reset with salon identity verification
   */
  async resetAdminPasswordInCloud(verification: string, newPasswordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(SYNC_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset_admin_password',
          verification,
          newPasswordHash,
        }),
      });

      if (!res.ok) {
        let errJson: any = null;
        try {
          errJson = await res.json();
        } catch {}
        return { success: false, error: errJson?.error || 'Erro ao redefinir senha no servidor.' };
      }

      const resJson = await res.json();
      if (resJson.version) {
        lastKnownVersion = resJson.version;
        safeSetItem(LAST_CLOUD_VERSION_KEY, resJson.version);
        try {
          broadcastChannel?.postMessage({ type: 'sync_update', version: resJson.version });
        } catch {}
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão com o servidor.' };
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

    // 2. Periodic sync heartbeat every 4 seconds (fast cross-device sync)
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Pause while app is in background to save battery
      }
      const res = await this.pullFromCloud();
      if (res.hasChanges) {
        onRemoteUpdate();
      }
    }, 4000);

    // 3. Immediate sync on BroadcastChannel message (instant multi-tab sync on same device)
    const handleBroadcast = (ev: MessageEvent) => {
      if (ev.data?.type === 'sync_update') {
        this.pullFromCloud().then(res => {
          if (res.hasChanges) {
            onRemoteUpdate();
          }
        });
      }
    };
    broadcastChannel?.addEventListener('message', handleBroadcast);

    // 4. Immediate pull on focus (user switches back to tab or unlocks phone)
    const handleFocus = async () => {
      const res = await this.pullFromCloud();
      if (res.hasChanges) {
        onRemoteUpdate();
      }
    };

    // 5. Immediate pull on visibilitychange (e.g. iPhone / Android home screen resume)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const res = await this.pullFromCloud();
        if (res.hasChanges) {
          onRemoteUpdate();
        }
      }
    };

    // 6. Online event
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
      broadcastChannel?.removeEventListener('message', handleBroadcast);
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
