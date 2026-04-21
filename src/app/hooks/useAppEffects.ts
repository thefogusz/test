import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { sanitizeCollectionState, sanitizeStoredSingle } from '../../utils/appUtils';
import { clearForoIndexedDbStorage } from '../../utils/indexedDb';
import {
  FORO_STORAGE_KEY_PREFIX,
  STORAGE_RESET_QUERY_PARAM,
} from '../constants';

type StatusAutoClearArgs = {
  activeView: string;
  contentTab: string;
  isSearching: boolean;
  searchResultsCount: number;
  searchSummary: string;
  setStatus: Dispatch<SetStateAction<string>>;
  status: string;
};

type SanitizeStoredStateArgs<TCollection, TSingle> = {
  setBookmarks: Dispatch<SetStateAction<TCollection[]>>;
  setCreateContentSource: Dispatch<SetStateAction<TSingle>>;
  setOriginalFeed: Dispatch<SetStateAction<TCollection[]>>;
  setPendingFeed: Dispatch<SetStateAction<TCollection[]>>;
  setReadArchive: Dispatch<SetStateAction<TCollection[]>>;
};

type StorageResetArgs = {
  setStatus: Dispatch<SetStateAction<string>>;
};

export const useStatusAutoClear = ({
  activeView,
  contentTab,
  isSearching,
  searchResultsCount,
  searchSummary,
  setStatus,
  status,
}: StatusAutoClearArgs) => {
  useEffect(() => {
    if (!status) return undefined;

    const shouldKeepStatusVisible =
      isSearching ||
      (activeView === 'content' &&
        contentTab === 'search' &&
        searchResultsCount > 0 &&
        !searchSummary);

    if (shouldKeepStatusVisible) return undefined;

    const timer = window.setTimeout(() => setStatus(''), 3000);
    return () => window.clearTimeout(timer);
  }, [activeView, contentTab, isSearching, searchResultsCount, searchSummary, setStatus, status]);
};

export const useSanitizeStoredState = <TCollection, TSingle>({
  setBookmarks,
  setCreateContentSource,
  setOriginalFeed,
  setPendingFeed,
  setReadArchive,
}: SanitizeStoredStateArgs<TCollection, TSingle>) => {
  useEffect(() => {
    setOriginalFeed((prev) => sanitizeCollectionState(prev) as TCollection[]);
    setPendingFeed((prev) => sanitizeCollectionState(prev) as TCollection[]);
    setReadArchive((prev) => sanitizeCollectionState(prev) as TCollection[]);
    setBookmarks((prev) => sanitizeCollectionState(prev) as TCollection[]);
    setCreateContentSource((prev) => sanitizeStoredSingle(prev) as TSingle);
  }, [
    setBookmarks,
    setCreateContentSource,
    setOriginalFeed,
    setPendingFeed,
    setReadArchive,
  ]);
};

export const useStorageReset = ({ setStatus }: StorageResetArgs) => {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get(STORAGE_RESET_QUERY_PARAM) !== '1') {
      return undefined;
    }

    let cancelled = false;

    const resetBrowserState = async () => {
      setStatus('กำลังล้างข้อมูลแอปในเบราว์เซอร์...');

      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(FORO_STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('[App] Failed to clear localStorage during reset', error);
      }

      try {
        await clearForoIndexedDbStorage();
      } catch (error) {
        console.warn('[App] Failed to clear IndexedDB during reset', error);
      }

      if (cancelled) return;

      currentUrl.searchParams.delete(STORAGE_RESET_QUERY_PARAM);
      window.history.replaceState({}, '', currentUrl.toString());
      window.location.reload();
    };

    void resetBrowserState();

    return () => {
      cancelled = true;
    };
  }, [setStatus]);
};
