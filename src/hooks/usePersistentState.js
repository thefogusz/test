import { useEffect, useState } from 'react';

const resolveInitialValue = (value) =>
  typeof value === 'function' ? value() : value;

export const usePersistentState = (storageKey, initialValue, options = {}) => {
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

  return [state, setState];
};
