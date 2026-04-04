import { apiFetch } from '../../utils/apiFetch';
import {
  deleteIndexedDbValue,
  getIndexedDbValue,
  setIndexedDbValue,
} from '../../utils/indexedDb';

export type PersistenceScope = 'local' | 'durable';

type Deserialize<T> = (storedValue: string, fallbackValue: T) => T;
type Serialize<T> = (value: T) => string;

type ResolvePersistedValueOptions<T> = {
  storedValue: unknown;
  fallbackValue: T;
  deserialize?: Deserialize<T>;
};

type PersistenceReadOptions<T> = {
  key: string;
  scope: PersistenceScope;
  fallbackValue: T;
  deserialize?: Deserialize<T>;
};

type PersistenceReadResult<T> = {
  exists: boolean;
  value: T | undefined;
};

type PersistenceWriteOptions<T> = {
  key: string;
  scope: PersistenceScope;
  value: T;
  serialize?: Serialize<T>;
};

const DEFAULT_NAMESPACE = 'default';
const BACKEND_STATE_ENDPOINT = '/api/state';

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const normalizePersistenceDriver = (value: string | undefined) =>
  value === 'backend' ? 'backend' : 'browser';

export const getPersistenceDriver = () =>
  normalizePersistenceDriver(import.meta.env.VITE_APP_PERSISTENCE_DRIVER);

export const isBackendPersistenceEnabled = () =>
  getPersistenceDriver() === 'backend';

const getPersistenceNamespace = () =>
  String(import.meta.env.VITE_APP_STATE_NAMESPACE || DEFAULT_NAMESPACE).trim() ||
  DEFAULT_NAMESPACE;

const buildBackendStateEndpoint = (key: string) =>
  `${BACKEND_STATE_ENDPOINT}/${encodeURIComponent(getPersistenceNamespace())}/${encodeURIComponent(
    key,
  )}`;

export const resolvePersistedValue = <T,>({
  storedValue,
  fallbackValue,
  deserialize,
}: ResolvePersistedValueOptions<T>): T => {
  if (storedValue === undefined) return fallbackValue;

  if (typeof storedValue === 'string') {
    if (deserialize) {
      return deserialize(storedValue, fallbackValue);
    }

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      return storedValue as T;
    }
  }

  return storedValue as T;
};

export const readLegacyLocalStorage = <T,>(
  storageKey: string,
  fallbackValue: T,
  deserialize?: Deserialize<T>,
) => {
  if (!canUseLocalStorage()) return fallbackValue;

  try {
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null) return fallbackValue;

    return resolvePersistedValue({
      storedValue,
      fallbackValue,
      deserialize,
    });
  } catch {
    return fallbackValue;
  }
};

export const hasLegacyLocalStorageValue = (storageKey: string) => {
  if (!canUseLocalStorage()) return false;

  try {
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
};

const readBackendState = async (key: string) => {
  const response = await apiFetch(buildBackendStateEndpoint(key), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`[persistence] Failed to read backend state "${key}" (${response.status})`);
  }

  const payload = await response.json();
  return {
    exists: Boolean(payload?.exists),
    value: payload?.value,
  };
};

const writeBackendState = async <T,>({
  key,
  scope,
  value,
  serialize,
}: PersistenceWriteOptions<T>) => {
  const payloadValue = serialize ? serialize(value) : value;
  const response = await apiFetch(buildBackendStateEndpoint(key), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scope,
      value: payloadValue,
    }),
  });

  if (!response.ok) {
    throw new Error(`[persistence] Failed to write backend state "${key}" (${response.status})`);
  }
};

const deleteBackendState = async (key: string) => {
  const response = await apiFetch(buildBackendStateEndpoint(key), {
    method: 'DELETE',
  });

  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(`[persistence] Failed to delete backend state "${key}" (${response.status})`);
  }
};

export const readPersistedState = async <T,>({
  key,
  scope,
  fallbackValue,
  deserialize,
}: PersistenceReadOptions<T>): Promise<PersistenceReadResult<T>> => {
  if (isBackendPersistenceEnabled()) {
    const backendState = await readBackendState(key);
    if (!backendState.exists) {
      return { exists: false, value: undefined };
    }

    return {
      exists: true,
      value: resolvePersistedValue({
        storedValue: backendState.value,
        fallbackValue,
        deserialize,
      }),
    };
  }

  if (scope === 'local') {
    if (!canUseLocalStorage()) return { exists: false, value: undefined };
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) return { exists: false, value: undefined };

    return {
      exists: true,
      value: resolvePersistedValue({
        storedValue,
        fallbackValue,
        deserialize,
      }),
    };
  }

  const storedValue = await getIndexedDbValue<unknown>(key);
  if (storedValue === undefined) {
    return { exists: false, value: undefined };
  }

  return {
    exists: true,
    value: resolvePersistedValue({
      storedValue,
      fallbackValue,
      deserialize,
    }),
  };
};

export const writePersistedState = async <T,>({
  key,
  scope,
  value,
  serialize,
}: PersistenceWriteOptions<T>) => {
  if (isBackendPersistenceEnabled()) {
    await writeBackendState({
      key,
      scope,
      value,
      serialize,
    });
    return;
  }

  if (scope === 'local') {
    if (!canUseLocalStorage()) return;
    const serializedValue = serialize ? serialize(value) : JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return;
  }

  await setIndexedDbValue(key, serialize ? serialize(value) : value);
};

export const deletePersistedState = async ({
  key,
  scope,
}: {
  key: string;
  scope: PersistenceScope;
}) => {
  if (isBackendPersistenceEnabled()) {
    await deleteBackendState(key);
    return;
  }

  if (scope === 'local') {
    if (!canUseLocalStorage()) return;
    localStorage.removeItem(key);
    return;
  }

  await deleteIndexedDbValue(key);
};
