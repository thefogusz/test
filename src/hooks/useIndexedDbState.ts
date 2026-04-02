import { useEffect, useRef, useState } from 'react';
import {
  deleteIndexedDbValue,
  getIndexedDbValue,
  setIndexedDbValue,
} from '../utils/indexedDb';

type IndexedDbStateOptions<T> = {
  deserialize?: (storedValue: string, fallbackValue: T) => T;
  serialize?: (value: T) => string;
  shouldRemove?: (value: T) => boolean;
  legacyStorageKey?: string;
};

const resolveInitialValue = <T,>(value: T | (() => T)): T =>
  typeof value === 'function' ? (value as () => T)() : value;

const readLegacyLocalStorage = <T,>(
  storageKey: string,
  fallbackValue: T,
  deserialize?: (storedValue: string, fallbackValue: T) => T,
) => {
  try {
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null) return fallbackValue;

    if (deserialize) {
      return deserialize(storedValue, fallbackValue);
    }

    return JSON.parse(storedValue) as T;
  } catch {
    return fallbackValue;
  }
};

const resolveIndexedDbValue = <T,>(
  storedValue: unknown,
  fallbackValue: T,
  deserialize?: (storedValue: string, fallbackValue: T) => T,
) => {
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

export const useIndexedDbState = <T,>(
  storageKey: string,
  initialValue: T | (() => T),
  options: IndexedDbStateOptions<T> = {},
) => {
  const { deserialize, serialize, shouldRemove, legacyStorageKey } = options;
  const fallbackValueRef = useRef<T | undefined>(undefined);
  if (fallbackValueRef.current === undefined) {
    fallbackValueRef.current = resolveInitialValue(initialValue);
  }
  const fallbackValue = fallbackValueRef.current;
  const effectiveLegacyStorageKey = legacyStorageKey || storageKey;

  const [state, setState] = useState<T>(() =>
    readLegacyLocalStorage(effectiveLegacyStorageKey, fallbackValue, deserialize),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const persistedValue = await getIndexedDbValue<unknown>(storageKey);

        if (persistedValue !== undefined) {
          if (!isMounted) return;
          setState(resolveIndexedDbValue(persistedValue, fallbackValue, deserialize));
          return;
        }

        const legacyValue = readLegacyLocalStorage(
          effectiveLegacyStorageKey,
          fallbackValue,
          deserialize,
        );

        await setIndexedDbValue(storageKey, serialize ? serialize(legacyValue) : legacyValue);

        try {
          localStorage.removeItem(effectiveLegacyStorageKey);
        } catch {
          // Ignore cleanup failures and keep the migrated state in IndexedDB.
        }
      } catch (error) {
        console.warn(`[useIndexedDbState] Failed to hydrate "${storageKey}"`, error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, [deserialize, effectiveLegacyStorageKey, fallbackValue, serialize, storageKey]);

  useEffect(() => {
    if (!isHydrated) return;

    const persist = async () => {
      try {
        if (shouldRemove?.(state)) {
          await deleteIndexedDbValue(storageKey);
          return;
        }

        await setIndexedDbValue(storageKey, serialize ? serialize(state) : state);
      } catch (error) {
        console.warn(`[useIndexedDbState] Failed to persist "${storageKey}"`, error);
      }
    };

    void persist();
  }, [isHydrated, serialize, shouldRemove, state, storageKey]);

  return [state, setState, isHydrated] as const;
};
