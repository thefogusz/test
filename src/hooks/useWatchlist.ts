// @ts-nocheck
import { useMemo } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getUserInfo } from '../services/TwitterService';
import { deserializeWatchlist } from '../utils/appPersistence';
import { usePersistentState } from './usePersistentState';

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
    () => new Set((watchlist || []).map((user) => (user?.username || '').toLowerCase()).filter(Boolean)),
    [watchlist],
  );

  const hasWatchlistRoomFor = (handle) => {
    const normalizedHandle = String(handle || '').trim().replace(/^@/, '').toLowerCase();
    if (!normalizedHandle) return true;
    if (watchlist.some((user) => (user.username || '').toLowerCase() === normalizedHandle)) {
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
    if (!hasWatchlistRoomFor(user?.username)) return;
    setWatchlist(prev => [user, ...prev]);
  };

  const handleAddExpert = async (expert) => {
    if (!hasWatchlistRoomFor(expert?.username)) return;
    const full = await getUserInfo(expert.username);
    if (full) setWatchlist(prev => [full, ...prev]);
  };

  const handleAddSearchAuthorToWatchlist = async (post) => {
    const username = (post?.author?.username || '').trim().replace(/^@/, '').toLowerCase();
    if (!username) return;
    if (!hasWatchlistRoomFor(username)) return;

    const existingUser = watchlist.find((user) => (user.username || '').toLowerCase() === username);
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
        if (prev.some((user) => (user.username || '').toLowerCase() === username)) return prev;
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
        if (prev.some((user) => (user.username || '').toLowerCase() === username)) return prev;
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
