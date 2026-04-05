// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getUserInfo } from '../services/TwitterService';
import { deserializePostLists } from '../utils/appPersistence';
import {
  decodeShareListPayload,
  encodeShareListPayload,
  DEFAULT_POST_LIST_COLOR,
} from '../features/post-lists/shareListCodec';
import { usePersistentState } from './usePersistentState';

type UsePostListsParams = {
  watchlist: any[];
  setWatchlist: (fn: any) => void;
  hasWatchlistRoomFor: (handle: string) => boolean;
  resolvePlaceholders: (nodes: any[]) => Promise<void>;
  currentPlan: any;
  openPricingWithStatus: (message: string) => void;
  openPricingView: () => void;
  canUseExportShare: () => boolean;
  setStatus: (value: string) => void;
};

export const usePostLists = ({
  watchlist,
  setWatchlist,
  hasWatchlistRoomFor,
  resolvePlaceholders,
  currentPlan,
  openPricingWithStatus,
  openPricingView,
  canUseExportShare,
  setStatus,
}: UsePostListsParams) => {
  const [postLists, setPostLists] = usePersistentState(STORAGE_KEYS.postLists, [], {
    deserialize: deserializePostLists,
  });
  const [activeListId, setActiveListId] = usePersistentState(STORAGE_KEYS.activeListId, null);
  const [listModal, setListModal] = useState({ show: false, mode: 'create', value: '' });
  const [isMobilePostListOpen, setIsMobilePostListOpen] = useState(false);
  const [reopenMobilePostListAfterModal, setReopenMobilePostListAfterModal] = useState(false);

  // Lock body scroll when mobile bottom sheet is open
  useEffect(() => {
    document.body.style.overflow = isMobilePostListOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobilePostListOpen]);

  const currentActiveList = useMemo(
    () => (activeListId ? postLists.find((list) => list.id === activeListId) ?? null : null),
    [activeListId, postLists],
  );

  const openPricingFromPostList = useCallback(() => {
    setIsMobilePostListOpen(false);
    window.setTimeout(() => {
      openPricingView();
    }, 0);
  }, [openPricingView]);

  const hasPostListRoom = () => {
    if (postLists.length >= currentPlan.objects.postLists) {
      openPricingWithStatus(
        `แพ็ก ${currentPlan.name} สร้าง Post Lists ได้สูงสุด ${currentPlan.objects.postLists} รายการ`,
      );
      return false;
    }
    return true;
  };

  const openListModal = (mode) => {
    if (isMobilePostListOpen) {
      setReopenMobilePostListAfterModal(true);
      setIsMobilePostListOpen(false);
    }
    setListModal({ show: true, mode, value: '' });
  };

  const closeListModal = () => {
    setListModal((prev) => ({ ...prev, show: false }));
    if (reopenMobilePostListAfterModal) {
      setIsMobilePostListOpen(true);
      setReopenMobilePostListAfterModal(false);
    }
  };

  const handleCreateListRequest = () => {
    if (!hasPostListRoom()) return;
    openListModal('create');
  };

  const handleImportListRequest = () => {
    if (!hasPostListRoom()) return;
    openListModal('import');
  };

  const finalizeListAction = async () => {
    if (!listModal.value) return;
    if (!hasPostListRoom()) return;
    let shouldReopenMobileSheet = reopenMobilePostListAfterModal;
    if (listModal.mode === 'create') {
      const newList = { id: Date.now().toString(), name: listModal.value, color: DEFAULT_POST_LIST_COLOR, members: [], createdAt: new Date().toISOString() };
      setPostLists([...postLists, newList]);
      setActiveListId(newList.id);
    } else {
      try {
        const decoded = await decodeShareListPayload(listModal.value);
        const newList = { ...decoded, id: Date.now().toString(), createdAt: new Date().toISOString() };

        const newMembers = (newList.members || []).map(m => m.trim().replace(/^@/, '').toLowerCase());
        const existingHandles = new Set(watchlist.map(u => (u.username || '').toLowerCase()));

        const placeholdersToAdd = [];
        newMembers.forEach(handle => {
          if (!existingHandles.has(handle)) {
            const newUser = { id: handle, username: handle, name: handle, profile_image_url: '', isPlaceholder: true };
            placeholdersToAdd.push(newUser);
          }
        });

        if (placeholdersToAdd.length > 0) {
          setWatchlist(prev => [...prev, ...placeholdersToAdd]);
          resolvePlaceholders(placeholdersToAdd);
        }

        setPostLists([...postLists, newList]);
        setActiveListId(newList.id);
        setStatus(`นำเข้า Post List "${newList.name}" สำเร็จ (${newMembers.length} บัญชี)`);
      } catch (err) {
        console.error(err);
        setStatus('นำเข้าล้มเหลว: รหัสไม่ถูกต้อง');
        shouldReopenMobileSheet = false;
      }
    }
    setListModal({ show: false, mode: 'create', value: '' });
    if (shouldReopenMobileSheet) {
      setIsMobilePostListOpen(true);
    }
    setReopenMobilePostListAfterModal(false);
  };

  const handleRemoveList = (id) => {
    setPostLists(prev => prev.filter(l => l.id !== id));
    if (activeListId === id) setActiveListId(null);
  };

  const handleUpdateList = (id, updates) =>
    setPostLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

  const handleAddMember = (listId, handle) => {
    const cleanHandle = handle.trim().replace(/^@/, '');
    if (!hasWatchlistRoomFor(cleanHandle)) return;
    setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: [...new Set([...l.members, cleanHandle.toLowerCase()])] } : l));
    if (!watchlist.find(u => u.username.toLowerCase() === cleanHandle.toLowerCase())) {
      const newUser = { id: cleanHandle, username: cleanHandle, name: cleanHandle, profile_image_url: '', isPlaceholder: true };
      setWatchlist(prev => [...prev, newUser]);
      resolvePlaceholders([newUser]);
    }
  };

  const handleRemoveMember = (handle, listId) =>
    setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: l.members.filter(m => m.toLowerCase() !== handle.toLowerCase()) } : l));

  const handleShareList = async (list) => {
    if (!canUseExportShare()) return;
    const code = await encodeShareListPayload(list);
    navigator.clipboard.writeText(code).then(() => setStatus('คัดลอกรหัสแชร์แล้ว'));
  };

  const handleToggleMemberInList = async (listId, contributor) => {
    const handle = typeof contributor === 'string' ? contributor : (contributor?.username || '');
    const cleanHandle = handle.trim().replace(/^@/, '').toLowerCase();
    if (!cleanHandle) return;
    if (!hasWatchlistRoomFor(cleanHandle)) return;

    if (!watchlist.find(u => (u.username || '').toLowerCase() === cleanHandle)) {
      try {
        let full = typeof contributor === 'object' && contributor.name ? contributor : null;
        if (!full) full = await getUserInfo(cleanHandle);

        const newUser = full || { id: cleanHandle, username: cleanHandle, name: cleanHandle, profile_image_url: '', isPlaceholder: true };
        setWatchlist(prev => [newUser, ...prev]);
        if (!full) resolvePlaceholders([newUser]);
      } catch (err) {
        console.error(err);
      }
    }

    setPostLists(prev => (prev || []).map(l => {
      if (l.id !== listId) return l;
      const members = Array.isArray(l.members) ? l.members : [];
      const alreadyIn = members.some(m => m.toLowerCase() === cleanHandle);
      if (alreadyIn) {
        return { ...l, members: members.filter(m => m.toLowerCase() !== cleanHandle) };
      } else {
        return { ...l, members: [...members, cleanHandle] };
      }
    }));
  };

  const handleRemoveAccountFromLists = (id) => {
    const target = watchlist.find(u => u.id === id);
    if (!target) return;
    setPostLists(prev => prev.map(l => ({ ...l, members: l.members.filter(m => m.toLowerCase() !== target.username.toLowerCase()) })));
  };

  return {
    postLists,
    setPostLists,
    activeListId,
    setActiveListId,
    currentActiveList,
    listModal,
    setListModal,
    isMobilePostListOpen,
    setIsMobilePostListOpen,
    openPricingFromPostList,
    hasPostListRoom,
    finalizeListAction,
    handleRemoveList,
    handleUpdateList,
    handleAddMember,
    handleRemoveMember,
    handleShareList,
    handleToggleMemberInList,
    handleRemoveAccountFromLists,
    handleCreateListRequest,
    handleImportListRequest,
    closeListModal,
  };
};
