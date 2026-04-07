// @ts-nocheck
import { useState } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getUserInfo } from '../services/TwitterService';
import { discoverTopExpertsStrict } from '../services/GrokService';
import { usePersistentState } from './usePersistentState';

type UseAudienceSearchParams = {
  watchlist: any[];
  hasWatchlistRoomFor: (handle: string) => boolean;
  handleAddUser: (user: any) => void;
};

export const useAudienceSearch = ({
  watchlist,
  hasWatchlistRoomFor,
  handleAddUser: addUserToWatchlist,
}: UseAudienceSearchParams) => {
  const [audienceTab, setAudienceTab] = usePersistentState(STORAGE_KEYS.audienceTab, 'ai');
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [manualQuery, setManualQuery] = useState('');
  const [manualPreview, setManualPreview] = useState(null);

  const handleAiSearchAudience = async (q, isMore = false) => {
    const query = q || aiQuery;
    setAiSearchLoading(true);
    try {
      const excludes = [
        ...watchlist.map(u => u.username),
        ...(isMore ? aiSearchResults.map(u => u.username) : [])
      ];
      const experts = await discoverTopExpertsStrict(query, excludes);
      setAiSearchResults(prev => isMore ? [...prev, ...experts] : experts);
    } catch (err) {
      console.error(err);
    } finally {
      setAiSearchLoading(false);
    }
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    const data = await getUserInfo(manualQuery);
    setManualPreview(data);
  };

  const handleAddUser = (user) => {
    if (!hasWatchlistRoomFor(user?.username)) return;
    addUserToWatchlist(user);
    setManualPreview(null);
    setManualQuery('');
  };

  return {
    audienceTab,
    setAudienceTab,
    aiQuery,
    setAiQuery,
    aiSearchLoading,
    aiSearchResults,
    setAiSearchResults,
    manualQuery,
    setManualQuery,
    manualPreview,
    handleAiSearchAudience,
    handleManualSearch,
    handleAddUser,
  };
};
