import { useEffect, useState } from 'react';

type PersistentStateOptions<T> = {
  deserialize?: (storedValue: string, fallbackValue: T) => T;
  serialize?: (value: T) => string;
  shouldRemove?: (value: T) => boolean;
};

const resolveInitialValue = <T,>(value: T | (() => T)): T =>
  typeof value === 'function' ? (value as () => T)() : value;

export const usePersistentState = <T,>(
  storageKey: string,
  initialValue: T | (() => T),
  options: PersistentStateOptions<T> = {},
) => {
  const { deserialize, serialize, shouldRemove } = options;

  const [state, setState] = useState(() => {
    const fallbackValue = resolveInitialValue(initialValue);

    try {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue === null) return fallbackValue;

      if (deserialize) {
        return deserialize(storedValue, fallbackValue);
      }

      return JSON.parse(storedValue);
    } catch {
      return fallbackValue;
    }
  });

  useEffect(() => {
    try {
      if (shouldRemove?.(state)) {
        localStorage.removeItem(storageKey);
        return;
      }

      const serializedValue = serialize ? serialize(state) : JSON.stringify(state);
      localStorage.setItem(storageKey, serializedValue);
    } catch (error) {
      console.warn(`[usePersistentState] Failed to persist "${storageKey}"`, error);
    }
  }, [serialize, shouldRemove, storageKey, state]);

  return [state, setState] as const;
};
