// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RSS_CATALOG } from '../config/rssCatalog';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getUserInfo } from '../services/TwitterService';
import {
  deserializePostLists,
  getInvalidPostListMembers,
  getMigratedPostListMembers,
  resolveRssSourceId,
  sanitizePostListMembers,
} from '../utils/appPersistence';
import {
  decodeShareListPayload,
  encodeShareListPayload,
  DEFAULT_POST_LIST_COLOR,
} from '../features/post-lists/shareListCodec';
import { canonicalizePostListMember } from '../utils/rssSourceResolver';
import { usePersistentState } from './usePersistentState';

type UsePostListsParams = {
  watchlist: any[];
  setWatchlist: (fn: any) => void;
  subscribedSources: any[];
  setSubscribedSources: (fn: any) => void;
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
  subscribedSources,
  setSubscribedSources,
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
  const [postListWarnings, setPostListWarnings] = useState({});

  const normalizeMemberHandle = useCallback(
    (value = '') => String(value || '').trim().replace(/^@/, '').toLowerCase(),
    [],
  );

  const isRssMemberHandle = useCallback(
    (value = '') => normalizeMemberHandle(value).startsWith('rss:'),
    [normalizeMemberHandle],
  );

  const buildPlaceholderWatchlistUser = useCallback(
    (handle) => ({
      id: handle,
      username: handle,
      name: handle,
      profile_image_url: `https://unavatar.io/twitter/${encodeURIComponent(handle)}`,
      isPlaceholder: true,
    }),
    [],
  );

  const clearPostListWarning = useCallback((listId) => {
    if (!listId) return;
    setPostListWarnings((prev) => {
      if (!prev?.[listId]) return prev;
      const next = { ...(prev || {}) };
      delete next[listId];
      return next;
    });
  }, []);

  const rssSourceLookup = useMemo(() => {
    const byId = new Map();

    [...Object.values(RSS_CATALOG).flat(), ...(Array.isArray(subscribedSources) ? subscribedSources : [])].forEach((source) => {
      const sourceId = String(source?.id || '').trim().toLowerCase();
      if (!sourceId || byId.has(sourceId)) return;
      byId.set(sourceId, source);
    });

    return byId;
  }, [subscribedSources]);

  useEffect(() => {
    let nextWarningsFromCleanup = null;
    let invalidCountFromCleanup = 0;
    let migratedCountFromCleanup = 0;
    let resolvedRssMembersFromCleanup = [];

    setPostLists((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;

      let changed = false;
      const warningsForLists = {};
      const next = prev.map((list) => {
        const invalidMembers = getInvalidPostListMembers(list?.members);
        const migratedMembers = getMigratedPostListMembers(list?.members);
        const sanitizedMembers = sanitizePostListMembers(list?.members);
        const originalMembers = Array.isArray(list?.members) ? list.members : [];
        const normalizedOriginalMembers = originalMembers
          .map((member) => normalizeMemberHandle(member))
          .filter(Boolean);

        if (invalidMembers.length > 0 && list?.id) {
          warningsForLists[list.id] = {
            invalidRssMembers: invalidMembers,
          };
          invalidCountFromCleanup += invalidMembers.length;
        }

        if (migratedMembers.length > 0) {
          migratedCountFromCleanup += migratedMembers.length;
        }

        sanitizedMembers
          .filter((member) => member.startsWith('rss:'))
          .forEach((member) => {
            resolvedRssMembersFromCleanup.push(member);
          });

        if (
          sanitizedMembers.length === normalizedOriginalMembers.length &&
          sanitizedMembers.every((member, index) => member === normalizedOriginalMembers[index])
        ) {
          return list;
        }

        changed = true;
        return {
          ...list,
          members: sanitizedMembers,
        };
      });

      nextWarningsFromCleanup = warningsForLists;

      return changed ? next : prev;
    });

    if (nextWarningsFromCleanup) {
      setPostListWarnings((current) => {
        const validWarnings = Object.fromEntries(
          Object.entries(current || {}).filter(([listId]) => nextWarningsFromCleanup[listId]),
        );
        const nextWarnings = {
          ...validWarnings,
          ...nextWarningsFromCleanup,
        };
        const currentSerialized = JSON.stringify(current || {});
        const nextSerialized = JSON.stringify(nextWarnings);
        return currentSerialized === nextSerialized ? current : nextWarnings;
      });
    }

    if (resolvedRssMembersFromCleanup.length > 0) {
      const resolvedSourceIds = Array.from(
        new Set(
          resolvedRssMembersFromCleanup
            .map((member) => resolveRssSourceId(member.slice(4)))
            .filter(Boolean),
        ),
      );

      if (resolvedSourceIds.length > 0) {
        setSubscribedSources((prev) => {
          const next = Array.isArray(prev) ? [...prev] : [];
          const seenIds = new Set(
            next.map((source) => String(source?.id || '').trim().toLowerCase()).filter(Boolean),
          );
          let didChange = false;

          resolvedSourceIds.forEach((sourceId) => {
            const source = rssSourceLookup.get(sourceId);
            if (!source || seenIds.has(sourceId)) return;
            next.push(source);
            seenIds.add(sourceId);
            didChange = true;
          });

          return didChange ? next : prev;
        });
      }
    }

    if (invalidCountFromCleanup > 0) {
      const statusParts = [];
      if (migratedCountFromCleanup > 0) {
        statusParts.push(`แก้ RSS source ให้ตรงกับ source จริง ${migratedCountFromCleanup} รายการ`);
      }
      statusParts.push(`ล้าง RSS source ที่ไม่รองรับออกจาก Post List ${invalidCountFromCleanup} รายการ`);
      setStatus(statusParts.join(' • '));
      return;
    }

    if (migratedCountFromCleanup > 0) {
      setStatus(`แก้ RSS source ให้ตรงกับ source จริง ${migratedCountFromCleanup} รายการ`);
    }
  }, [rssSourceLookup, setPostLists, setStatus, setSubscribedSources]);

  useEffect(() => {
    const validListIds = new Set(
      (Array.isArray(postLists) ? postLists : [])
        .map((list) => String(list?.id || '').trim())
        .filter(Boolean),
    );

    setPostListWarnings((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev || {}).filter(([listId]) => validListIds.has(String(listId || ''))),
      );
      const prevSerialized = JSON.stringify(prev || {});
      const nextSerialized = JSON.stringify(next);
      return prevSerialized === nextSerialized ? prev : next;
    });
  }, [postLists]);

  useEffect(() => {
    const resolvedSourceIds = Array.from(
      new Set(
        (Array.isArray(postLists) ? postLists : [])
          .flatMap((list) => sanitizePostListMembers(list?.members))
          .filter((member) => member.startsWith('rss:'))
          .map((member) => resolveRssSourceId(member.slice(4)))
          .filter(Boolean),
      ),
    );

    if (resolvedSourceIds.length === 0) return;

    setSubscribedSources((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const seenIds = new Set(
        next.map((source) => String(source?.id || '').trim().toLowerCase()).filter(Boolean),
      );
      let didChange = false;

      resolvedSourceIds.forEach((sourceId) => {
        const source = rssSourceLookup.get(sourceId);
        if (!source || seenIds.has(sourceId)) return;
        next.push(source);
        seenIds.add(sourceId);
        didChange = true;
      });

      return didChange ? next : prev;
    });
  }, [postLists, rssSourceLookup, setSubscribedSources]);

  const ensureSubscribedRssSources = useCallback((handles: string[]) => {
    const normalizedHandles = Array.from(
      new Set(
        (Array.isArray(handles) ? handles : [])
          .map((handle) => canonicalizePostListMember(handle))
          .filter((handle) => handle.startsWith('rss:')),
      ),
    );

    const existingSourceIds = new Set(
      (Array.isArray(subscribedSources) ? subscribedSources : [])
        .map((source) => String(source?.id || '').trim().toLowerCase())
        .filter(Boolean),
    );

    const sourcesToAdd = normalizedHandles
      .map((handle) => handle.slice(4))
      .filter(Boolean)
      .filter((sourceId) => !existingSourceIds.has(sourceId))
      .map((sourceId) => rssSourceLookup.get(sourceId))
      .filter(Boolean);

    if (sourcesToAdd.length > 0) {
      setSubscribedSources((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const seenIds = new Set(
          next.map((source) => String(source?.id || '').trim().toLowerCase()).filter(Boolean),
        );

        sourcesToAdd.forEach((source) => {
          const sourceId = String(source?.id || '').trim().toLowerCase();
          if (!sourceId || seenIds.has(sourceId)) return;
          seenIds.add(sourceId);
          next.push(source);
        });

        return next;
      });
    }

    return {
      addedCount: sourcesToAdd.length,
      missingCount: normalizedHandles.length - sourcesToAdd.length,
    };
  }, [normalizeMemberHandle, rssSourceLookup, setSubscribedSources, subscribedSources]);

  const syncImportedTwitterMembersToWatchlist = useCallback((handles: string[]) => {
    const normalizedHandles = Array.from(
      new Set(
        (Array.isArray(handles) ? handles : [])
          .map((handle) => normalizeMemberHandle(handle))
          .filter((handle) => handle && !handle.startsWith('rss:')),
      ),
    );

    const existingHandles = new Set(
      (Array.isArray(watchlist) ? watchlist : [])
        .map((user) => normalizeMemberHandle(user?.username))
        .filter(Boolean),
    );

    const missingHandles = normalizedHandles.filter((handle) => !existingHandles.has(handle));
    const capacity = Number.isFinite(currentPlan.objects.watchlist)
      ? Math.max(0, currentPlan.objects.watchlist - existingHandles.size)
      : missingHandles.length;
    const allowedHandles = missingHandles.slice(0, capacity);
    const skippedCount = missingHandles.length - allowedHandles.length;
    const placeholdersToAdd = allowedHandles.map((handle) => buildPlaceholderWatchlistUser(handle));

    if (placeholdersToAdd.length > 0) {
      setWatchlist((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const seenHandles = new Set(
          next.map((user) => normalizeMemberHandle(user?.username)).filter(Boolean),
        );

        placeholdersToAdd.forEach((user) => {
          const handle = normalizeMemberHandle(user?.username);
          if (!handle || seenHandles.has(handle)) return;
          seenHandles.add(handle);
          next.push(user);
        });

        return next;
      });
      void resolvePlaceholders(placeholdersToAdd);
    }

    return {
      addedCount: placeholdersToAdd.length,
      skippedCount,
    };
  }, [
    buildPlaceholderWatchlistUser,
    currentPlan.objects.watchlist,
    normalizeMemberHandle,
    resolvePlaceholders,
    setWatchlist,
    watchlist,
  ]);

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
        const newMembers = Array.from(
          new Set(
            (Array.isArray(decoded?.members) ? decoded.members : [])
              .map((member) => normalizeMemberHandle(member))
              .filter(Boolean),
          ),
        );
        const sanitizedMembers = sanitizePostListMembers(newMembers);
        const invalidImportedRssCount =
          newMembers.filter((member) => member.startsWith('rss:')).length -
          sanitizedMembers.filter((member) => member.startsWith('rss:')).length;
        const newList = {
          ...decoded,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          members: sanitizedMembers,
        };

        const rssSyncResult = ensureSubscribedRssSources(sanitizedMembers);
        const twitterSyncResult = syncImportedTwitterMembersToWatchlist(sanitizedMembers);

        setPostLists([...postLists, newList]);
        setActiveListId(newList.id);
        if (invalidImportedRssCount > 0) {
          setPostListWarnings((prev) => ({
            ...(prev || {}),
            [newList.id]: {
              invalidRssMembers: getInvalidPostListMembers(newMembers),
            },
          }));
        }
        const statusParts = [`นำเข้า Post List "${newList.name}" สำเร็จ (${newMembers.length} สมาชิก)`];
        if (rssSyncResult.addedCount > 0) {
          statusParts.push(`เพิ่ม RSS เข้าวอตช์ลิสต์ ${rssSyncResult.addedCount} แหล่ง`);
        }
        if (twitterSyncResult.addedCount > 0) {
          statusParts.push(`ซิงก์บัญชี X ${twitterSyncResult.addedCount} บัญชี`);
        }
        if (twitterSyncResult.skippedCount > 0) {
          statusParts.push(`มี ${twitterSyncResult.skippedCount} บัญชีที่อยู่เฉพาะใน Post List เพราะ Watchlist เต็ม`);
        }
        setStatus(statusParts.join(' • '));
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
    clearPostListWarning(id);
    setPostLists(prev => prev.filter(l => l.id !== id));
    if (activeListId === id) setActiveListId(null);
  };

  const handleUpdateList = (id, updates) => {
    clearPostListWarning(id);
    return setPostLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleAddMember = (listId, handle) => {
    const cleanHandle = canonicalizePostListMember(handle);
    if (!cleanHandle) return;

    if (isRssMemberHandle(cleanHandle)) {
      const rssSourceId = resolveRssSourceId(cleanHandle.slice(4));
      if (!rssSourceLookup.get(rssSourceId)) {
        setStatus('ไม่พบ RSS source นี้ในระบบ');
        return;
      }
      clearPostListWarning(listId);
      ensureSubscribedRssSources([cleanHandle]);
      setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: [...new Set([...l.members, cleanHandle])] } : l));
      return;
    }

    if (!hasWatchlistRoomFor(cleanHandle)) return;
    clearPostListWarning(listId);
    setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: [...new Set([...l.members, cleanHandle])] } : l));
    if (!watchlist.find(u => normalizeMemberHandle(u?.username) === cleanHandle)) {
      const newUser = buildPlaceholderWatchlistUser(cleanHandle);
      setWatchlist(prev => [...prev, newUser]);
      void resolvePlaceholders([newUser]);
    }
  };

  const handleRemoveMember = (handle, listId) => {
    clearPostListWarning(listId);
    setPostLists(prev => prev.map(l => l.id === listId ? { ...l, members: l.members.filter(m => m.toLowerCase() !== handle.toLowerCase()) } : l));
  };

  const handleShareList = async (list) => {
    if (!canUseExportShare()) return;
    const code = await encodeShareListPayload(list);
    navigator.clipboard.writeText(code).then(() => setStatus('คัดลอกรหัสแชร์แล้ว'));
  };

  const handleToggleMemberInList = async (listId, contributor) => {
    const handle = typeof contributor === 'string' ? contributor : (contributor?.username || '');
    const cleanHandle = canonicalizePostListMember(handle);
    if (!cleanHandle) return;
    const targetList = (Array.isArray(postLists) ? postLists : []).find((list) => list.id === listId);
    const currentMembers = Array.isArray(targetList?.members) ? targetList.members : [];
    const alreadyIn = currentMembers.some((member) => normalizeMemberHandle(member) === cleanHandle);
    const isRssMember = isRssMemberHandle(cleanHandle);

    if (!alreadyIn && !isRssMember && !hasWatchlistRoomFor(cleanHandle)) return;

    if (!alreadyIn && isRssMember) {
      const rssSourceId = resolveRssSourceId(cleanHandle.slice(4));
      if (!rssSourceLookup.get(rssSourceId)) {
        setStatus('ไม่พบ RSS source นี้ในระบบ');
        return;
      }
      clearPostListWarning(listId);
      ensureSubscribedRssSources([cleanHandle]);
    }

    if (!alreadyIn && !isRssMember && !watchlist.find(u => normalizeMemberHandle(u?.username) === cleanHandle)) {
      try {
        let full = typeof contributor === 'object' && contributor.name ? contributor : null;
        if (!full) full = await getUserInfo(cleanHandle);

        const newUser = full || buildPlaceholderWatchlistUser(cleanHandle);
        setWatchlist(prev => [newUser, ...prev]);
        if (!full) void resolvePlaceholders([newUser]);
      } catch (err) {
        console.error(err);
      }
    }

    clearPostListWarning(listId);
    setPostLists(prev => (prev || []).map(l => {
      if (l.id !== listId) return l;
      const members = Array.isArray(l.members) ? l.members : [];
      const memberExists = members.some(m => normalizeMemberHandle(m) === cleanHandle);
      if (memberExists) {
        return { ...l, members: members.filter(m => normalizeMemberHandle(m) !== cleanHandle) };
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
    postListWarnings,
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
