import { useEffect, useRef, useState } from 'react';
import {
  deletePersistedState,
  hasLegacyLocalStorageValue,
  isBackendPersistenceEnabled,
  readLegacyLocalStorage,
  readPersistedState,
  writePersistedState,
} from '../lib/persistence/client';

type IndexedDbStateOptions<T> = {
  deserialize?: (storedValue: string, fallbackValue: T) => T;
  serialize?: (value: T) => string;
  shouldRemove?: (value: T) => boolean;
  legacyStorageKey?: string;
};

const resolveInitialValue = <T,>(value: T | (() => T)): T =>
  typeof value === 'function' ? (value as () => T)() : value;

const serializeForComparison = <T,>(value: T, serialize?: (value: T) => string) => {
  try {
    return serialize ? serialize(value) : JSON.stringify(value);
  } catch {
    return String(value);
  }
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
  const fallbackSerializedRef = useRef<string | undefined>(undefined);
  if (fallbackSerializedRef.current === undefined) {
    fallbackSerializedRef.current = serializeForComparison(fallbackValue, serialize);
  }
  const effectiveLegacyStorageKey = legacyStorageKey || storageKey;

  const [state, setState] = useState<T>(() =>
    readLegacyLocalStorage(effectiveLegacyStorageKey, fallbackValue, deserialize),
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const deferDefaultPersistenceRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const persistedState = await readPersistedState({
          key: storageKey,
          scope: 'durable',
          fallbackValue,
          deserialize,
        });

        if (persistedState.exists) {
          if (!isMounted) return;
          setState(persistedState.value as T);
          return;
        }

        const hasLegacyValue = hasLegacyLocalStorageValue(effectiveLegacyStorageKey);
        if (!hasLegacyValue) {
          deferDefaultPersistenceRef.current = true;
          return;
        }

        const legacyValue = readLegacyLocalStorage(
          effectiveLegacyStorageKey,
          fallbackValue,
          deserialize,
        );

        await writePersistedState({
          key: storageKey,
          scope: 'durable',
          value: legacyValue,
          serialize,
        });

        if (!isBackendPersistenceEnabled()) {
          localStorage.removeItem(effectiveLegacyStorageKey);
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

    const serializedState = serializeForComparison(state, serialize);
    if (
      deferDefaultPersistenceRef.current &&
      serializedState === fallbackSerializedRef.current
    ) {
      return;
    }
    deferDefaultPersistenceRef.current = false;

    const persist = async () => {
      try {
        if (shouldRemove?.(state)) {
          await deletePersistedState({
            key: storageKey,
            scope: 'durable',
          });
          return;
        }

        await writePersistedState({
          key: storageKey,
          scope: 'durable',
          value: state,
          serialize,
        });
      } catch (error) {
        console.warn(`[useIndexedDbState] Failed to persist "${storageKey}"`, error);
      }
    };

    void persist();
  }, [isHydrated, serialize, shouldRemove, state, storageKey]);

  return [state, setState, isHydrated] as const;
};
