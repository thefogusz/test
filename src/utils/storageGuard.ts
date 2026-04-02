import { clearForoIndexedDbStorage } from './indexedDb';

const STORAGE_VERSION_KEY = 'foro_storage_schema_version';
const STORAGE_VERSION = '2026-04-03.1';
const FORO_STORAGE_PREFIX = 'foro_';

const clearForoStorage = () => {
  const keysToRemove = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(FORO_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

export const ensureForoStorageCompatibility = () => {
  try {
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);

    if (currentVersion !== STORAGE_VERSION) {
      clearForoStorage();
      void clearForoIndexedDbStorage().catch((error) => {
        console.warn('[storageGuard] Failed to clear IndexedDB schema cache', error);
      });
      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }
  } catch (error) {
    console.warn('[storageGuard] Failed to validate localStorage schema version', error);
  }
};
