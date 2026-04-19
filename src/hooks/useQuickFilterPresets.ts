import { useEffect, useMemo } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { usePersistentState } from './usePersistentState';

const DEFAULT_QUICK_PRESETS = ['สรุป', 'หาโพสต์เด่น', 'โพสต์ไหนน่าทำคอนเทนต์'];

export const useQuickFilterPresets = () => {
  const [quickFilterPresets, setQuickFilterPresets] = usePersistentState(
    STORAGE_KEYS.quickFilterPresets,
    DEFAULT_QUICK_PRESETS,
  );
  const [quickFilterVisiblePresets, setQuickFilterVisiblePresets] = usePersistentState(
    STORAGE_KEYS.quickFilterVisiblePresets,
    DEFAULT_QUICK_PRESETS.slice(0, 3),
  );

  const removeQuickPreset = (preset: string) => {
    setQuickFilterPresets((prev: string[]) => prev.filter((item) => item !== preset));
    setQuickFilterVisiblePresets((prev: string[]) => prev.filter((item) => item !== preset));
  };

  const addQuickPreset = (preset: string) => {
    const trimmed = String(preset || '').trim();
    if (!trimmed) return;

    setQuickFilterPresets((prev: string[]) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  };

  const toggleQuickPresetVisibility = (preset: string) => {
    const trimmed = String(preset || '').trim();
    if (!trimmed) return;

    setQuickFilterVisiblePresets((prev: string[]) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      if (next.includes(trimmed)) {
        return next.filter((item) => item !== trimmed);
      }
      if (next.length >= 3) return next;
      return [...next, trimmed];
    });
  };

  useEffect(() => {
    setQuickFilterVisiblePresets((prev: string[]) => {
      const current = Array.isArray(prev) ? prev : [];
      const availablePresets = new Set(quickFilterPresets);
      const normalized = current.filter((preset) => availablePresets.has(preset)).slice(0, 3);
      const fallback = quickFilterPresets.slice(0, 3);

      if (normalized.length > 0) {
        if (
          normalized.length === current.length &&
          normalized.every((preset, index) => preset === current[index])
        ) {
          return prev;
        }
        return normalized;
      }

      if (
        fallback.length === current.length &&
        fallback.every((preset, index) => preset === current[index])
      ) {
        return prev;
      }

      return fallback;
    });
  }, [quickFilterPresets, setQuickFilterVisiblePresets]);

  const visibleQuickPresets = useMemo(() => {
    const visibleSet = new Set(quickFilterVisiblePresets);
    return quickFilterPresets.filter((preset) => visibleSet.has(preset)).slice(0, 3);
  }, [quickFilterPresets, quickFilterVisiblePresets]);

  return {
    quickFilterPresets,
    quickFilterVisiblePresets,
    visibleQuickPresets,
    addQuickPreset,
    removeQuickPreset,
    toggleQuickPresetVisibility,
  };
};
