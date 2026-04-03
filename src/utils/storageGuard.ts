const STORAGE_VERSION_KEY = 'foro_storage_schema_version';
const STORAGE_VERSION = '2026-04-03.1';

export const ensureForoStorageCompatibility = () => {
  try {
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);

    if (currentVersion !== STORAGE_VERSION) {
      // Keep user data intact across routine schema version bumps.
      // If we ever need to invalidate a specific cache, do it with a targeted migration.
      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }
  } catch (error) {
    console.warn('[storageGuard] Failed to validate localStorage schema version', error);
  }
};
