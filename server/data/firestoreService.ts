import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let firestoreConnected = true;
let lastFirestoreSyncAt: string | null = new Date().toISOString();
let lastFirestoreError: string | null = null;

function withTimeout<T>(promise: Promise<T>, ms = 3500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Firestore operation timeout')), ms);
    promise
      .then(val => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function handleFirestoreError(error: unknown, operationType: OperationType, docPath: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  lastFirestoreError = errMsg;
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: 'server-backend',
      email: 'jeffervr@gmail.com',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path: docPath
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  databaseId: string;
  projectId: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}> {
  try {
    await withTimeout(getDocFromServer(doc(firestoreDb, 'test', 'connection')), 3000);
    await withTimeout(
      setDoc(doc(firestoreDb, 'test', 'connection'), {
        status: 'CONNECTED',
        checkedAt: new Date().toISOString()
      }),
      3000
    );
    firestoreConnected = true;
    lastFirestoreError = null;
    lastFirestoreSyncAt = new Date().toISOString();
  } catch (error) {
    lastFirestoreError = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
  return {
    connected: firestoreConnected,
    databaseId: firebaseConfig.firestoreDatabaseId,
    projectId: firebaseConfig.projectId,
    lastSyncedAt: lastFirestoreSyncAt,
    lastError: lastFirestoreError
  };
}

export function getFirestoreConnectionState() {
  return {
    connected: firestoreConnected,
    databaseId: firebaseConfig.firestoreDatabaseId,
    projectId: firebaseConfig.projectId,
    lastSyncedAt: lastFirestoreSyncAt,
    lastError: lastFirestoreError
  };
}

export const getFirestoreStatus = getFirestoreConnectionState;

export const PORTAL_CHUNK_KEYS = [
  'products',
  'promotions',
  'company',
  'users',
  'orders',
  'catalogs',
  'auditLogs',
  'appConfig',
  'technicalServices',
  'appointments',
  'warranties',
  'inventoryMovements',
  'whatsappConversations',
  'whatsappConfig',
  'backups',
  'trash',
  'syncQueue',
  'connectionLogs'
] as const;

export type PortalChunkKey = (typeof PORTAL_CHUNK_KEYS)[number];

export async function saveChunkToFirestore(
  chunkKey: PortalChunkKey,
  data: any,
  actorEmail = 'jeffervr@gmail.com'
): Promise<boolean> {
  const docId = `chunk_${chunkKey}`;
  try {
    const payloadStr = JSON.stringify(data ?? []);
    const safePayload =
      payloadStr.length <= 890000
        ? payloadStr
        : JSON.stringify(Array.isArray(data) ? data.slice(0, 150) : data);

    await withTimeout(
      setDoc(doc(firestoreDb, 'portal_state', docId), {
        id: docId,
        collectionName: chunkKey,
        updatedAt: new Date().toISOString().substring(0, 40),
        updatedBy: String(actorEmail || 'Sistema').substring(0, 120),
        payloadJson: safePayload
      }),
      3500
    );
    firestoreConnected = true;
    lastFirestoreSyncAt = new Date().toISOString();
    lastFirestoreError = null;
    return true;
  } catch {
    return false;
  }
}

export async function saveAllChunksToFirestore(
  schema: Record<string, any>,
  actorEmail = 'jeffervr@gmail.com'
): Promise<boolean> {
  const results = await Promise.all(
    PORTAL_CHUNK_KEYS.filter(key => schema[key] !== undefined).map(key =>
      saveChunkToFirestore(key, schema[key], actorEmail)
    )
  );
  return results.every(Boolean);
}

export async function loadAllChunksFromFirestore(): Promise<{
  hasRemoteData: boolean;
  chunks: Partial<Record<PortalChunkKey, any>>;
  latestUpdatedAt: string | null;
}> {
  const chunks: Partial<Record<PortalChunkKey, any>> = {};
  let hasRemoteData = false;
  let latestUpdatedAt: string | null = null;

  await Promise.all(
    PORTAL_CHUNK_KEYS.map(async key => {
      const docId = `chunk_${key}`;
      try {
        const snap = await withTimeout(getDoc(doc(firestoreDb, 'portal_state', docId)), 3000);
        if (snap.exists()) {
          const raw = snap.data();
          if (raw && typeof raw.payloadJson === 'string') {
            chunks[key] = JSON.parse(raw.payloadJson);
            hasRemoteData = true;
            if (raw.updatedAt && (!latestUpdatedAt || raw.updatedAt > latestUpdatedAt)) {
              latestUpdatedAt = raw.updatedAt;
            }
          }
        }
        firestoreConnected = true;
      } catch {
        // fallback to local db.json
      }
    })
  );

  if (hasRemoteData) {
    lastFirestoreSyncAt = new Date().toISOString();
  }

  return { hasRemoteData, chunks, latestUpdatedAt };
}
