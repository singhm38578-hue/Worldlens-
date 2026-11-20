import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  AppLanguage,
  LocalScanHistoryItem,
  LocalTranslationRecord,
  ScanImageSource,
  VisualRecognitionReport,
} from '../domain/models';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  buildScanRecordPayload,
  buildTranslationRecordPayload,
  buildUserProfileCreatePayload,
  buildUserProfileUpdatePayload,
  mapFirestoreScanDoc,
  mapFirestoreTranslationDoc,
  sanitizeFirestoreDocId,
} from './firestorePayloadBuilder';

export interface CloudUserProfile {
  ownerId: string;
  displayName: string;
  preferredLanguage: AppLanguage;
}

const MAX_BATCH_DELETES = 400;

/**
 * Ensures the parent /users/{uid} document exists (required by Master Gate security rules
 * before creating any records in /users/{uid}/scans or /users/{uid}/translations).
 */
export async function ensureUserProfile(
  user: User,
  preferredLanguage: AppLanguage
): Promise<CloudUserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const resolvedLanguage: AppLanguage = data.preferredLanguage === 'hi' ? 'hi' : 'en';
      return {
        ownerId: user.uid,
        displayName: typeof data.displayName === 'string' ? data.displayName : user.displayName ?? '',
        preferredLanguage: resolvedLanguage,
      };
    }

    const payload = buildUserProfileCreatePayload({
      ownerId: user.uid,
      displayName: user.displayName ?? '',
      preferredLanguage,
      timestamp: serverTimestamp(),
    });
    await setDoc(ref, payload);
    return {
      ownerId: user.uid,
      displayName: payload.displayName,
      preferredLanguage: payload.preferredLanguage,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserLanguagePreference(
  user: User,
  preferredLanguage: AppLanguage
): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await ensureUserProfile(user, preferredLanguage);
      return;
    }
    const payload = buildUserProfileUpdatePayload({
      preferredLanguage,
      timestamp: serverTimestamp(),
    });
    await updateDoc(ref, { ...payload });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onProfile: (profile: CloudUserProfile | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onProfile(null);
        return;
      }
      const data = snap.data();
      onProfile({
        ownerId: uid,
        displayName: typeof data.displayName === 'string' ? data.displayName : '',
        preferredLanguage: data.preferredLanguage === 'hi' ? 'hi' : 'en',
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

/**
 * Subscribes to /users/{uid}/scans with an explicit ownerId filter matching
 * the hardened `allow list` rule without requiring a custom composite index.
 */
export function subscribeToUserScans(
  uid: string,
  onScans: (items: LocalScanHistoryItem[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `users/${uid}/scans`;
  const q = query(collection(db, 'users', uid, 'scans'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => mapFirestoreScanDoc(docSnap.id, docSnap.data()))
        .sort((a, b) => b.timestamp - a.timestamp);
      onScans(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

/**
 * Subscribes to /users/{uid}/translations with an explicit ownerId filter matching
 * the hardened `allow list` rule without requiring a custom composite index.
 */
export function subscribeToUserTranslations(
  uid: string,
  onTranslations: (items: LocalTranslationRecord[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `users/${uid}/translations`;
  const q = query(collection(db, 'users', uid, 'translations'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => mapFirestoreTranslationDoc(docSnap.id, docSnap.data()))
        .sort((a, b) => b.timestamp - a.timestamp);
      onTranslations(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

/**
 * Saves a structured text-only scan report to Firestore (never uploads photo bytes).
 */
export async function saveCloudScan(
  user: User,
  input: {
    id?: string;
    report: VisualRecognitionReport;
    language: AppLanguage;
    modelName: string;
    sourceLabel: ScanImageSource;
  }
): Promise<string> {
  const scanId = sanitizeFirestoreDocId(
    input.id ?? `scan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    'scan'
  );
  const path = `users/${user.uid}/scans/${scanId}`;
  try {
    await ensureUserProfile(user, input.language);
    const payload = buildScanRecordPayload({
      ownerId: user.uid,
      report: input.report,
      language: input.language,
      modelName: input.modelName,
      sourceLabel: input.sourceLabel,
      timestamp: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', user.uid, 'scans', scanId), payload);
    return scanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCloudScan(uid: string, scanId: string): Promise<void> {
  const safeId = sanitizeFirestoreDocId(scanId, 'scan');
  const path = `users/${uid}/scans/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'scans', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllCloudScans(uid: string, scanIds: string[]): Promise<void> {
  const path = `users/${uid}/scans`;
  try {
    for (let i = 0; i < scanIds.length; i += MAX_BATCH_DELETES) {
      const batch = writeBatch(db);
      const slice = scanIds.slice(i, i + MAX_BATCH_DELETES);
      for (const id of slice) {
        const safeId = sanitizeFirestoreDocId(id, 'scan');
        batch.delete(doc(db, 'users', uid, 'scans', safeId));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCloudTranslation(
  user: User,
  record: Omit<LocalTranslationRecord, 'id' | 'timestamp'>,
  preferredLanguage: AppLanguage
): Promise<string> {
  const translationId = sanitizeFirestoreDocId(
    `tr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    'tr'
  );
  const path = `users/${user.uid}/translations/${translationId}`;
  try {
    await ensureUserProfile(user, preferredLanguage);
    const payload = buildTranslationRecordPayload({
      ownerId: user.uid,
      record,
      timestamp: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', user.uid, 'translations', translationId), payload);
    return translationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCloudTranslation(uid: string, translationId: string): Promise<void> {
  const safeId = sanitizeFirestoreDocId(translationId, 'tr');
  const path = `users/${uid}/translations/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'translations', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllCloudTranslations(
  uid: string,
  translationIds: string[]
): Promise<void> {
  const path = `users/${uid}/translations`;
  try {
    for (let i = 0; i < translationIds.length; i += MAX_BATCH_DELETES) {
      const batch = writeBatch(db);
      const slice = translationIds.slice(i, i + MAX_BATCH_DELETES);
      for (const id of slice) {
        const safeId = sanitizeFirestoreDocId(id, 'tr');
        batch.delete(doc(db, 'users', uid, 'translations', safeId));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
