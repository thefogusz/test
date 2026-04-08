// @ts-nocheck
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getUserInfo } from '../services/TwitterService';
import { discoverTopExpertsStrict } from '../services/GrokService';
import { usePersistentState } from './usePersistentState';

const normalizeAudienceQuery = (value = '') => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const normalizeHandle = (value = '') => String(value || '').replace(/^@/, '').trim().toLowerCase();

const buildAudienceExpertsQueryKey = (query, excludes = []) => [
  'audience-experts',
  'v5',
  normalizeAudienceQuery(query),
  Array.from(new Set((excludes || []).map(normalizeHandle).filter(Boolean))).sort(),
];

const buildAudienceUserQueryKey = (username) => [
  'audience-user',
  normalizeHandle(username),
];

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
  const queryClient = useQueryClient();
  const [audienceTab, setAudienceTab] = usePersistentState(STORAGE_KEYS.audienceTab, 'ai');
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [hasSearchedAudience, setHasSearchedAudience] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualPreview, setManualPreview] = useState(null);

  const aiSearchMutation = useMutation({
    mutationFn: async ({ query, excludes }) => {
      const normalizedQuery = normalizeAudienceQuery(query);
      if (!normalizedQuery) return [];

      return queryClient.fetchQuery({
        queryKey: buildAudienceExpertsQueryKey(normalizedQuery, excludes),
        queryFn: () => discoverTopExpertsStrict(query, excludes),
        staleTime: 6 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 0,
      });
    },
  });

  const manualSearchMutation = useMutation({
    mutationFn: async (username) => {
      const normalizedUsername = normalizeHandle(username);
      if (!normalizedUsername) return null;

      return queryClient.fetchQuery({
        queryKey: buildAudienceUserQueryKey(normalizedUsername),
        queryFn: () => getUserInfo(normalizedUsername),
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 3 * 24 * 60 * 60 * 1000,
        retry: 1,
      });
    },
    onSuccess: (data) => {
      if (data) setManualPreview(data);
    },
  });

  const handleAiSearchAudience = async (q, isMore = false) => {
    const query = String(q || aiQuery || '').trim();
    if (!query || aiSearchMutation.isPending) return;

    try {
      const excludes = [
        ...watchlist.map(u => u.username),
        ...(isMore ? aiSearchResults.map(u => u.username) : [])
      ];
      const experts = await aiSearchMutation.mutateAsync({ query, excludes });
      setAiSearchResults(prev => isMore ? [...prev, ...experts] : experts);
      if (!isMore) setHasSearchedAudience(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    try {
      await manualSearchMutation.mutateAsync(manualQuery);
    } catch (err) {
      console.error(err);
    }
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
    aiSearchLoading: aiSearchMutation.isPending,
    aiSearchResults,
    setAiSearchResults,
    hasSearchedAudience,
    manualQuery,
    setManualQuery,
    manualPreview,
    handleAiSearchAudience,
    handleManualSearch,
    handleAddUser,
  };
};
