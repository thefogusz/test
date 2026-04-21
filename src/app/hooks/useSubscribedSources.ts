import { useEffect, useMemo } from 'react';
import { RSS_CATALOG, type RssSource } from '../../config/rssCatalog';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { usePersistentState } from '../../hooks/usePersistentState';

type SubscribedSource = RssSource & Record<string, unknown>;

export const useSubscribedSources = () => {
  const [subscribedSources, setSubscribedSources] = usePersistentState<SubscribedSource[]>(
    STORAGE_KEYS.subscribedSources,
    [],
  );
  const supportedRssSourcesById = useMemo(
    () =>
      new Map(
        (Object.values(RSS_CATALOG).flat() as unknown as SubscribedSource[]).map(
          (source) => [String(source.id), source],
        ),
      ),
    [],
  );

  useEffect(() => {
    setSubscribedSources((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;

      let changed = false;
      const next = prev.map((source) => {
        const catalogMatch = supportedRssSourcesById.get(String(source?.id || ''));
        if (catalogMatch && catalogMatch.url !== source.url) {
          changed = true;
          return { ...source, ...catalogMatch };
        }
        return source;
      });

      return changed ? next : prev;
    });
  }, [setSubscribedSources, supportedRssSourcesById]);

  const handleToggleSource = (source: SubscribedSource) => {
    setSubscribedSources((prev) => {
      const exists = prev.some((currentSource) => currentSource.id === source.id);
      return exists
        ? prev.filter((currentSource) => currentSource.id !== source.id)
        : [...prev, source];
    });
  };

  return {
    subscribedSources,
    setSubscribedSources,
    handleToggleSource,
  };
};
