import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  Firestore,
  type DocumentData
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

export function getSavedFirebaseConfig(): FirebaseCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading saved firebase config:', err);
  }

  // Fallback to Vite environment variables if available
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey && envKey !== 'undefined') {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseCredentials | null): void {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY_FIREBASE);
  } else {
    localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(config));
  }
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirebaseInstance(): { app: FirebaseApp | null; db: Firestore | null; isConnected: boolean } {
  const config = getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null, isConnected: false };
  }

  try {
    if (!firebaseApp) {
      if (getApps().length === 0) {
        firebaseApp = initializeApp(config);
      } else {
        firebaseApp = getApp();
      }
      firestoreDb = getFirestore(firebaseApp);
    }
    return { app: firebaseApp, db: firestoreDb, isConnected: true };
  } catch (err) {
    console.warn('Firebase initialization error:', err);
    return { app: null, db: null, isConnected: false };
  }
}

export async function testFirebaseConnection(config: FirebaseCredentials): Promise<{ success: boolean; message: string }> {
  try {
    const testApp = initializeApp(config, `test-${Date.now()}`);
    const testDb = getFirestore(testApp);
    // Attempt a light read on settings
    const testCol = collection(testDb, '_test_ping');
    await getDocs(testCol);
    return { success: true, message: 'Conexão com o Firebase Firestore estabelecida com sucesso!' };
  } catch (err: any) {
    return { 
      success: false, 
      message: err?.message || 'Falha ao autenticar no Firebase. Verifique sua chave de API e ID do Projeto.' 
    };
  }
}

// Helpers for syncing collection data
export async function syncCollectionToFirestore<T extends { id: string }>(
  collectionName: string, 
  items: T[]
): Promise<boolean> {
  const { db, isConnected } = getFirebaseInstance();
  if (!isConnected || !db) return false;

  try {
    for (const item of items) {
      const docRef = doc(db, collectionName, item.id);
      await setDoc(docRef, item as DocumentData, { merge: true });
    }
    return true;
  } catch (err) {
    console.error(`Error syncing ${collectionName} to Firestore:`, err);
    return false;
  }
}

export async function fetchCollectionFromFirestore<T>(collectionName: string): Promise<T[] | null> {
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
    console.error(`Error fetching ${collectionName} from Firestore:`, err);
    return null;
  }
}
