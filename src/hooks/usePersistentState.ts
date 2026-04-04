import { useEffect, useRef, useState } from 'react';
import {
  deletePersistedState,
  hasLegacyLocalStorageValue,
  readLegacyLocalStorage,
  readPersistedState,
  writePersistedState,
} from '../lib/persistence/client';

type PersistentStateOptions<T> = {
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

export const usePersistentState = <T,>(
  storageKey: string,
  initialValue: T | (() => T),
  options: PersistentStateOptions<T> = {},
) => {
  const { deserialize, serialize, shouldRemove, legacyStorageKey } = options;
  const effectiveLegacyStorageKey = legacyStorageKey || storageKey;
  const fallbackValueRef = useRef<T | undefined>(undefined);
  if (fallbackValueRef.current === undefined) {
    fallbackValueRef.current = resolveInitialValue(initialValue);
  }
  const fallbackValue = fallbackValueRef.current;
  const fallbackSerializedRef = useRef<string | undefined>(undefined);
  if (fallbackSerializedRef.current === undefined) {
    fallbackSerializedRef.current = serializeForComparison(fallbackValue, serialize);
  }

  const [state, setState] = useState(() => {
    return readLegacyLocalStorage(effectiveLegacyStorageKey, fallbackValue, deserialize);
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const deferDefaultPersistenceRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const persistedState = await readPersistedState({
          key: storageKey,
          scope: 'local',
          fallbackValue,
          deserialize,
        });

        if (persistedState.exists) {
          if (isMounted) {
            setState(persistedState.value as T);
          }
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
          scope: 'local',
          value: legacyValue,
          serialize,
        });
      } catch (error) {
        console.warn(`[usePersistentState] Failed to hydrate "${storageKey}"`, error);
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
            scope: 'local',
          });
          return;
        }

        await writePersistedState({
          key: storageKey,
          scope: 'local',
          value: state,
          serialize,
        });
      } catch (error) {
        console.warn(`[usePersistentState] Failed to persist "${storageKey}"`, error);
      }
    };

    void persist();
  }, [isHydrated, serialize, shouldRemove, state, storageKey]);

  return [state, setState] as const;
};
