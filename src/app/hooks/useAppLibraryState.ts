import { useDeferredValue, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useIndexedDbState } from '../../hooks/useIndexedDbState';
import { usePersistentState } from '../../hooks/usePersistentState';
import {
  deserializeAttachedSource,
  deserializeStoredCollection,
} from '../../utils/appPersistence';
import { READ_ARCHIVE_INITIAL_RENDER } from '../constants';

type StoredItem = {
  id?: string;
  [key: string]: unknown;
};

type AttachedSourceMeta = {
  attachedSource?: StoredItem | null;
  sources?: StoredItem[];
};

const shouldRemoveWhenFalsy = (value: unknown) => !value;

export const useAppLibraryState = () => {
  const [originalFeed, setOriginalFeed] = useIndexedDbState<StoredItem[]>(
    STORAGE_KEYS.homeFeed,
    [],
    {
      deserialize: deserializeStoredCollection,
    },
  );
  const [pendingFeed, setPendingFeed] = useIndexedDbState<StoredItem[]>(
    STORAGE_KEYS.pendingFeed,
    [],
    {
      deserialize: deserializeStoredCollection,
    },
  );
  const [bookmarks, setBookmarks] = useIndexedDbState<StoredItem[]>(
    STORAGE_KEYS.bookmarks,
    [],
    {
      deserialize: deserializeStoredCollection,
    },
  );
  const [bookmarkTab, setBookmarkTab] = useState('news');
  const [selectedArticle, setSelectedArticle] = useState<StoredItem | null>(null);
  const bookmarkIdSet = useMemo(
    () => new Set(bookmarks.map((item) => item?.id).filter(Boolean)),
    [bookmarks],
  );
  const [readArchive, setReadArchive] = useIndexedDbState<StoredItem[]>(
    STORAGE_KEYS.readArchive,
    [],
    {
      deserialize: deserializeStoredCollection,
    },
  );
  const [readSearchQuery, setReadSearchQuery] = usePersistentState(
    STORAGE_KEYS.readSearchQuery,
    '',
  );
  const deferredReadSearchQuery = useDeferredValue(readSearchQuery);
  const [visibleReadCount, setVisibleReadCount] = useState(READ_ARCHIVE_INITIAL_RENDER);
  const [createContentSource, setCreateContentSource] = usePersistentState<StoredItem | null>(
    STORAGE_KEYS.attachedSource,
    null,
    {
      deserialize: deserializeAttachedSource,
      shouldRemove: shouldRemoveWhenFalsy,
    },
  );
  const [filterModal, setFilterModal] = useState({ show: false, prompt: '' });
  const [readFilters, setReadFilters] = useState({ view: false, engagement: false });
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [genPhase, setGenPhase] = useState('idle');

  const handleBookmark = (item: StoredItem, isSaving: boolean) => {
    if (isSaving) {
      setBookmarks((prev) => {
        if (prev.find((existingItem) => existingItem.id === item.id)) return prev;
        return [item, ...prev];
      });
      return;
    }

    setBookmarks((prev) => prev.filter((existingItem) => existingItem.id !== item.id));
  };

  const handleSaveGeneratedArticle = (
    title: string,
    content: string,
    meta?: AttachedSourceMeta,
  ) => {
    const newArticle: StoredItem = {
      id: Date.now().toString(),
      type: 'article',
      title: title || 'บทความ AI',
      summary: content,
      created_at: new Date().toISOString(),
      attachedSource: meta?.attachedSource || null,
      sources: meta?.sources || [],
    };

    setBookmarks((prev) => [newArticle, ...prev]);
  };

  return {
    originalFeed,
    setOriginalFeed,
    pendingFeed,
    setPendingFeed,
    bookmarks,
    setBookmarks,
    bookmarkTab,
    setBookmarkTab,
    selectedArticle,
    setSelectedArticle,
    bookmarkIdSet,
    readArchive,
    setReadArchive,
    readSearchQuery,
    setReadSearchQuery,
    deferredReadSearchQuery,
    visibleReadCount,
    setVisibleReadCount,
    createContentSource,
    setCreateContentSource,
    filterModal,
    setFilterModal,
    readFilters,
    setReadFilters,
    isGeneratingContent,
    setIsGeneratingContent,
    genPhase,
    setGenPhase,
    handleBookmark,
    handleSaveGeneratedArticle,
  };
};
