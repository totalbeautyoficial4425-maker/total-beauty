import { initializeApp, getApps, getApp, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Firestore,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

export interface FirebaseCredentials {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEY_FIREBASE = 'total_beauty_firebase_config';

/**
 * Parses a pasted Firebase snippet (e.g. `const firebaseConfig = { apiKey: "...", ... }`)
 * or JSON string and extracts the 6 Firebase credential fields.
 */
export function parseFirebaseSnippet(input: string): Partial<FirebaseCredentials> | null {
  if (!input || !input.trim()) return null;

  const extractField = (field: string): string => {
    const regex = new RegExp(`["']?${field}["']?\\s*:\\s*["']([^"']+)["']`, 'i');
    const match = input.match(regex);
    return match ? match[1].trim() : '';
  };

  const apiKey = extractField('apiKey');
  const authDomain = extractField('authDomain');
  const projectId = extractField('projectId');
  const storageBucket = extractField('storageBucket');
  const messagingSenderId = extractField('messagingSenderId');
  const appId = extractField('appId');

  if (!apiKey && !projectId) {
    return null;
  }

  return {
    apiKey,
    authDomain: authDomain || (projectId ? `${projectId}.firebaseapp.com` : ''),
    projectId,
    storageBucket: storageBucket || (projectId ? `${projectId}.firebasestorage.app` : ''),
    messagingSenderId,
    appId,
  };
}

export function getSavedFirebaseConfig(): FirebaseCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading saved firebase config:', err);
  }

  // Fallback to Vite environment variables if available
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProject = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (envKey && envKey !== 'undefined' && envProject && envProject !== 'undefined') {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProject}.firebaseapp.com`,
      projectId: envProject,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProject}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let currentConfigSignature = '';

export function saveFirebaseConfig(config: FirebaseCredentials | null): void {
  if (!config || (!config.apiKey && !config.projectId)) {
    localStorage.removeItem(STORAGE_KEY_FIREBASE);
    resetFirebaseInstance();
  } else {
    const normalized: FirebaseCredentials = {
      apiKey: config.apiKey.trim(),
      projectId: config.projectId.trim(),
      authDomain: config.authDomain?.trim() || `${config.projectId.trim()}.firebaseapp.com`,
      storageBucket: config.storageBucket?.trim() || `${config.projectId.trim()}.firebasestorage.app`,
      messagingSenderId: config.messagingSenderId?.trim() || '',
      appId: config.appId?.trim() || '',
    };
    localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(normalized));
    resetFirebaseInstance();
  }
}

export function resetFirebaseInstance(): void {
  firebaseApp = null;
  firestoreDb = null;
  currentConfigSignature = '';
}

export function getFirebaseInstance(): {
  app: FirebaseApp | null;
  db: Firestore | null;
  isConnected: boolean;
  projectId?: string;
} {
  const config = getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null, isConnected: false };
  }

  const signature = `${config.apiKey}:${config.projectId}`;

  try {
    if (!firebaseApp || !firestoreDb || currentConfigSignature !== signature) {
      const existingApps = getApps();
      const defaultApp = existingApps.find((a) => a.name === '[DEFAULT]');

      if (!defaultApp) {
        firebaseApp = initializeApp(config);
        try {
          // Initialize Firestore with High-Capacity IndexedDB Persistent Cache & Multi-Tab Sync
          firestoreDb = initializeFirestore(firebaseApp, {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          });
        } catch {
          firestoreDb = getFirestore(firebaseApp);
        }
      } else {
        firebaseApp = getApp();
        firestoreDb = getFirestore(firebaseApp);
      }
      currentConfigSignature = signature;
    }

    return {
      app: firebaseApp,
      db: firestoreDb,
      isConnected: true,
      projectId: config.projectId,
    };
  } catch (err) {
    console.warn('Firebase initialization error:', err);
    return { app: null, db: null, isConnected: false };
  }
}

export async function testFirebaseConnection(
  config: FirebaseCredentials
): Promise<{ success: boolean; message: string }> {
  let tempApp: FirebaseApp | null = null;
  try {
    const cleanConfig: FirebaseCredentials = {
      apiKey: config.apiKey.trim(),
      projectId: config.projectId.trim(),
      authDomain: config.authDomain?.trim() || `${config.projectId.trim()}.firebaseapp.com`,
      storageBucket: config.storageBucket?.trim() || `${config.projectId.trim()}.firebasestorage.app`,
      messagingSenderId: config.messagingSenderId?.trim() || '',
      appId: config.appId?.trim() || '',
    };

    tempApp = initializeApp(cleanConfig, `test-conn-${Date.now()}`);
    const testDb = getFirestore(tempApp);
    const testCol = collection(testDb, 'settings');
    await getDocs(testCol);

    return {
      success: true,
      message: `Conectado com sucesso ao projeto "${cleanConfig.projectId}" no Firebase Cloud Firestore! Armazenamento em nuvem ilimitado ativo.`,
    };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'permission-denied') {
      return {
        success: false,
        message:
          'Conectado ao projeto, porém as Regras do Firestore (Rules) estão bloqueando leitura/escrita. No console do Firebase > Firestore Database > Regras, altere para "allow read, write: if true;" e publique.',
      };
    }
    return {
      success: false,
      message:
        err?.message ||
        'Falha ao conectar no Firebase. Verifique sua API Key e o Project ID informados.',
    };
  } finally {
    if (tempApp) {
      try {
        await deleteApp(tempApp);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * High-speed atomic batch sync of a collection to Firestore (up to 450 docs per batch)
 */
export async function syncCollectionToFirestore<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<boolean> {
  const { db, isConnected } = getFirebaseInstance();
  if (!isConnected || !db) return false;

  try {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        if (!item.id) continue;
        const docRef = doc(db, collectionName, String(item.id));
        // Sanitize undefined fields which Firestore rejects
        const cleanData = JSON.parse(JSON.stringify(item));
        batch.set(docRef, cleanData as DocumentData, { merge: true });
      }
      await batch.commit();
    }
    return true;
  } catch (err) {
    console.error(`Error syncing collection "${collectionName}" to Firestore:`, err);
    return false;
  }
}

/**
 * Delete a single document from Firestore when deleted locally
 */
export async function deleteDocumentFromFirestore(
  collectionName: string,
  docId: string
): Promise<boolean> {
  const { db, isConnected } = getFirebaseInstance();
  if (!isConnected || !db || !docId) return false;

  try {
    const docRef = doc(db, collectionName, String(docId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting doc "${docId}" from "${collectionName}":`, err);
    return false;
  }
}

/**
 * Upsert a single document to Firestore
 */
export async function upsertDocumentToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<boolean> {
  const { db, isConnected } = getFirebaseInstance();
  if (!isConnected || !db || !item?.id) return false;

  try {
    const docRef = doc(db, collectionName, String(item.id));
    const cleanData = JSON.parse(JSON.stringify(item));
    await setDoc(docRef, cleanData as DocumentData, { merge: true });
    return true;
  } catch (err) {
    console.error(`Error upserting doc "${item.id}" to "${collectionName}":`, err);
    return false;
  }
}

export async function fetchCollectionFromFirestore<T>(
  collectionName: string
): Promise<T[] | null> {
  const { db, isConnected } = getFirebaseInstance();
  if (!isConnected || !db) return null;

  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const list: T[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as T);
    });
    return list;
  } catch (err) {
    console.error(`Error fetching "${collectionName}" from Firestore:`, err);
    return null;
  }
}

/**
 * Subscribe to real-time updates on a Firestore collection
 */
export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (items: T[]) => void
): Unsubscribe | null {
  const { db, isConnected } = getFirebaseInstance();
  if (!isConnected || !db) return null;

  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as T);
        });
        onUpdate(items);
      },
      (error) => {
        console.warn(`Real-time listener warning for "${collectionName}":`, error);
      }
    );
  } catch (err) {
    console.warn(`Failed to subscribe to "${collectionName}":`, err);
    return null;
  }
}
