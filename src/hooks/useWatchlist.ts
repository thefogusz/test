// @ts-nocheck
import { useMemo } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getUserInfo } from '../services/TwitterService';
import { deserializeWatchlist } from '../utils/appPersistence';
import { usePersistentState } from './usePersistentState';

const normalizeHandle = (value = '') => String(value || '').trim().replace(/^@/, '').toLowerCase();

type UseWatchlistParams = {
  currentPlan: any;
  openPricingWithStatus: (message: string) => void;
  setStatus: (value: string) => void;
};

export const useWatchlist = ({ currentPlan, openPricingWithStatus, setStatus }: UseWatchlistParams) => {
  const [watchlist, setWatchlist] = usePersistentState(STORAGE_KEYS.watchlist, [], {
    deserialize: deserializeWatchlist,
  });

  const watchlistHandleSet = useMemo(
    () => new Set((watchlist || []).map((user) => normalizeHandle(user?.username)).filter(Boolean)),
    [watchlist],
  );

  const hasWatchlistRoomFor = (handle) => {
    const normalizedHandle = normalizeHandle(handle);
    if (!normalizedHandle) return true;
    if (watchlistHandleSet.has(normalizedHandle)) {
      return true;
    }

    if (watchlist.length >= currentPlan.objects.watchlist) {
      openPricingWithStatus(
        `แพ็ก ${currentPlan.name} เพิ่ม Watchlist ได้สูงสุด ${currentPlan.objects.watchlist} บัญชี`,
      );
      return false;
    }

    return true;
  };

  const resolvePlaceholders = async (nodes) => {
    for (const placeholder of nodes) {
      if (!placeholder.username) continue;
      try {
        const realData = await getUserInfo(placeholder.username);
        if (realData) {
          setWatchlist(current => current.map(u =>
            (u.username || '').toLowerCase() === (placeholder.username || '').toLowerCase() ? { ...realData, isPlaceholder: false } : u
          ));
        }
      } catch (err) { console.error(err); }
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const handleRemoveAccountGlobal = (id) => {
    setWatchlist(prev => prev.filter(w => w.id !== id));
  };

  const handleAddUser = (user) => {
    const username = normalizeHandle(user?.username);
    if (!hasWatchlistRoomFor(username)) return;

    setWatchlist((prev) => {
      if (username && prev.some((existingUser) => normalizeHandle(existingUser?.username) === username)) return prev;
      return [user, ...prev];
    });
  };

  const handleAddExpert = async (expert) => {
    const username = normalizeHandle(expert?.username);
    if (!username) return;
    if (!hasWatchlistRoomFor(username)) return;
    if (watchlistHandleSet.has(username)) {
      setStatus(`@${username} à¸­à¸¢à¸¹à¹ˆà¹ƒà¸™ Watchlist à¹à¸¥à¹‰à¸§`);
      return;
    }

    const full = await getUserInfo(username);
    if (!full) return;

    setWatchlist((prev) => {
      if (prev.some((existingUser) => normalizeHandle(existingUser?.username) === username)) return prev;
      return [full, ...prev];
    });
  };

  const handleAddSearchAuthorToWatchlist = async (post) => {
    const username = normalizeHandle(post?.author?.username);
    if (!username) return;
    if (!hasWatchlistRoomFor(username)) return;

    const existingUser = watchlist.find((user) => normalizeHandle(user?.username) === username);
    if (existingUser) {
      setStatus(`@${username} อยู่ใน Watchlist แล้ว`);
      return;
    }

    try {
      const fullUser = await getUserInfo(username);
      const fallbackUser = {
        id: post?.author?.id || username,
        username,
        name: post?.author?.name || username,
        profile_image_url: post?.author?.profile_image_url || '',
        isPlaceholder: !fullUser,
      };
      const nextUser = fullUser || fallbackUser;

      setWatchlist((prev) => {
        if (prev.some((user) => normalizeHandle(user?.username) === username)) return prev;
        return [nextUser, ...prev];
      });

      if (!fullUser) resolvePlaceholders([fallbackUser]);
      setStatus(`เพิ่ม @${username} เข้า Watchlist แล้ว`);
    } catch (error) {
      console.error(error);
      const fallbackUser = {
        id: post?.author?.id || username,
        username,
        name: post?.author?.name || username,
        profile_image_url: post?.author?.profile_image_url || '',
        isPlaceholder: true,
      };
      setWatchlist((prev) => {
        if (prev.some((user) => normalizeHandle(user?.username) === username)) return prev;
        return [fallbackUser, ...prev];
      });
      resolvePlaceholders([fallbackUser]);
      setStatus(`เพิ่ม @${username} เข้า Watchlist แล้ว`);
    }
  };

  return {
    watchlist,
    setWatchlist,
    watchlistHandleSet,
    hasWatchlistRoomFor,
    resolvePlaceholders,
    handleRemoveAccountGlobal,
    handleAddUser,
    handleAddExpert,
    handleAddSearchAuthorToWatchlist,
  };
};
