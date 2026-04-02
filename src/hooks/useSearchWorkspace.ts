import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  agentFilterFeed,
  buildSearchPlan,
  expandSearchQuery,
  generateExecutiveSummary,
  generateGrokBatch,
  tavilySearch,
} from '../services/GrokService';
import {
  analyzeSearchQueryIntent,
  clusterBySimilarity,
  curateSearchResults,
  searchEverything,
  searchEverythingDeep,
} from '../services/TwitterService';
import { useIndexedDbState } from './useIndexedDbState';
import { usePersistentState } from './usePersistentState';
import {
  COMMON_KEYWORDS,
  buildDynamicSearchTags,
  deserializeSearchHistory,
  deserializeSearchPresets,
  extractInterestTopics,
  getBroadFallbackQueries,
  getBroadQueryBlueprint,
  MAX_SEARCH_PRESETS,
  normalizeSearchLabel,
} from '../utils/searchHelpers';
import {
  hasUsefulThaiSummary,
  mergePlanLabelsIntoQuery,
  mergeUniquePostsById,
  normalizeSearchText,
  sanitizeStoredPost,
} from '../utils/appUtils';
import { deserializeStoredCollection } from '../utils/appPersistence';

type UseSearchWorkspaceParams = {
  activeView: string;
  contentTab: string;
  originalFeed: any[];
  readArchive: any[];
  setStatus: (value: string) => void;
  status: string;
};

type SearchCacheSnapshot = {
  lastSubmittedSearchQuery: string;
  searchCursor: string | null;
  searchOverflowResults: any[];
  searchResults: any[];
  searchSummary: string;
  searchWebSources: any[];
};

const onlyNews = true;

const getSearchCacheKey = (query: string, mode: string) => [
  'foro-search',
  normalizeSearchLabel(query).toLowerCase(),
  mode.toLowerCase(),
];

const readNextCursor = (meta: { next_cursor?: string | null } | null | undefined) =>
  meta?.next_cursor || null;

export const useSearchWorkspace = ({
  activeView,
  contentTab,
  originalFeed,
  readArchive,
  setStatus,
  status,
}: UseSearchWorkspaceParams) => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = usePersistentState(STORAGE_KEYS.searchQuery, '');
  const [searchResults, setSearchResults] = useIndexedDbState(STORAGE_KEYS.searchResults, [], {
    deserialize: deserializeStoredCollection,
  });
  const [searchSummary, setSearchSummary] = useIndexedDbState(STORAGE_KEYS.searchSummary, '');
  const [searchPresets, setSearchPresets] = usePersistentState(STORAGE_KEYS.searchPresets, [], {
    deserialize: deserializeSearchPresets,
  });
  const [searchHistory, setSearchHistory] = usePersistentState(STORAGE_KEYS.searchHistory, [], {
    deserialize: deserializeSearchHistory,
  });
  const [searchWebSources, setSearchWebSources] = useIndexedDbState(STORAGE_KEYS.searchWebSources, [], {
    deserialize: deserializeStoredCollection,
  });
  const [lastSubmittedSearchQuery, setLastSubmittedSearchQuery] = useState('');
  const [searchOverflowResults, setSearchOverflowResults] = useState<any[]>([]);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [searchCursor, setSearchCursor] = useState<string | null>(null);
  const [activeSearchPlan, setActiveSearchPlan] = useState<any>(null);
  const [isLatestMode, setIsLatestMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  const recordSearchInterest = (rawQuery: string) => {
    const normalizedQuery = normalizeSearchLabel(rawQuery);
    if (!normalizedQuery) return;

    setSearchHistory((prev: any[]) => {
      const now = new Date().toISOString();
      const next = Array.isArray(prev) ? [...prev] : [];
      const existingIndex = next.findIndex(
        (item) => item.query.toLowerCase() === normalizedQuery.toLowerCase(),
      );

      if (existingIndex >= 0) {
        const existing = next[existingIndex];
        next[existingIndex] = {
          ...existing,
          query: existing.query,
          count: (existing.count || 0) + 1,
          lastUsedAt: now,
        };
      } else {
        next.unshift({ query: normalizedQuery, count: 1, lastUsedAt: now });
      }

      return next
        .sort((left, right) => {
          if ((right.count || 0) !== (left.count || 0)) return (right.count || 0) - (left.count || 0);
          return new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime();
        })
        .slice(0, 12);
    });
  };

  const addSearchPreset = (rawQuery: string) => {
    const normalizedQuery = normalizeSearchLabel(rawQuery);
    if (!normalizedQuery) return;

    setSearchPresets((prev: string[]) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      if (next.some((item) => item.toLowerCase() === normalizedQuery.toLowerCase())) return next;
      return [normalizedQuery, ...next].slice(0, MAX_SEARCH_PRESETS);
    });
  };

  const removeSearchPreset = (labelToRemove: string) => {
    setSearchPresets((prev: string[]) =>
      (Array.isArray(prev) ? prev : []).filter(
        (item) => item.toLowerCase() !== labelToRemove.toLowerCase(),
      ),
    );
  };

  const searchMutation = useMutation({
    mutationFn: async ({
      isMore = false,
      overrideQuery = '',
    }: {
      isMore?: boolean;
      overrideQuery?: string;
    }) => {
      const requestedQuery = overrideQuery || searchQuery;
      const normalizedRequestedQueryLabel = normalizeSearchLabel(requestedQuery);

      if (!requestedQuery && !isMore) return;

      if (isMore && searchOverflowResults.length > 0) {
        const nextChunk = searchOverflowResults.slice(0, 10);
        setSearchResults((prev) => [...prev, ...nextChunk].map(sanitizeStoredPost));
        setSearchOverflowResults((prev) => prev.slice(10));
        return;
      }

      if (!isMore) {
        recordSearchInterest(requestedQuery);
        setLastSubmittedSearchQuery(normalizedRequestedQueryLabel);
        setIsLiveSearching(true);
      }

      const isComplexQuery = !/ฮา|ตลก|ขำ|funny|meme|lol|haha/i.test(requestedQuery);
      const normalizedRequestedQuery = normalizeSearchText(requestedQuery);
      const queryTokenCount = normalizedRequestedQuery ? normalizedRequestedQuery.split(' ').length : 0;
      const legacyBroadDiscoveryQuery =
        queryTokenCount > 0 &&
        queryTokenCount <= 3 &&
        !/ล่าสุด|วันนี้|breaking|เปิดตัว|ประกาศ|ด่วน|now|today|update|news|ข่าว|รีวิว|เทียบ|vs|หลุด/i.test(requestedQuery) &&
        !/from:|since:|until:|@|"/i.test(requestedQuery);
      const queryIntent = analyzeSearchQueryIntent(requestedQuery);
      const effectiveBroadDiscoveryQuery = queryIntent.broadDiscoveryIntent || legacyBroadDiscoveryQuery;
      const searchQueryType = isLatestMode || queryIntent.forceLatestMode ? 'Latest' : 'Top';
      const cacheKey = getSearchCacheKey(requestedQuery, searchQueryType);

      if (!isMore) {
        const cached = queryClient.getQueryData<SearchCacheSnapshot>(cacheKey);
        if (cached) {
          setSearchResults(cached.searchResults.map(sanitizeStoredPost));
          setSearchOverflowResults(cached.searchOverflowResults.map(sanitizeStoredPost));
          setSearchSummary(cached.searchSummary);
          setSearchWebSources(cached.searchWebSources);
          setSearchCursor(cached.searchCursor);
          setLastSubmittedSearchQuery(cached.lastSubmittedSearchQuery);
          setIsLiveSearching(false);
          setStatus(`โหลดผลลัพธ์ที่แคชไว้สำหรับ "${requestedQuery}"`);
          return;
        }
      }

      if (!isMore) {
        setSearchSummary('');
      }
      setStatus(`AI กำลังค้นหาข้อมูลสำหรับ "${requestedQuery}"...`);

      try {
        let webContext = '';
        let searchPlan = activeSearchPlan;
        let resolvedSearchWebSources: any[] = [];
        const broadBlueprint = effectiveBroadDiscoveryQuery
          ? getBroadQueryBlueprint(requestedQuery)
          : null;
        const broadFallbackQueries = effectiveBroadDiscoveryQuery
          ? getBroadFallbackQueries(requestedQuery)
          : [];
        const shouldUseAdaptivePlan = isComplexQuery && !effectiveBroadDiscoveryQuery;
        const rawDataChunks: any[][] = [];
        let finalCursor: string | null = null;

        const getScopedQuery = (query: string, lane = 'default') => {
          let scopedQuery = query;

          if (isLatestMode) {
            if (!query.includes('since:')) {
              const date = new Date();
              date.setHours(date.getHours() - 24);
              scopedQuery = `${query} since:${date.toISOString().split('T')[0]}`;
            }

            if (!query.includes('min_faves:')) {
              const latestMinFaves = effectiveBroadDiscoveryQuery
                ? lane === 'exact'
                  ? 10
                  : lane === 'broad'
                    ? 25
                    : 40
                : isComplexQuery
                  ? 5
                  : 2;
              scopedQuery = `${scopedQuery} min_faves:${latestMinFaves}`;
            }
          } else if (!query.includes('min_faves:')) {
            const topMinFaves = effectiveBroadDiscoveryQuery
              ? lane === 'exact'
                ? 15
                : lane === 'broad'
                  ? 40
                  : 75
              : isComplexQuery
                ? 10
                : 3;
            scopedQuery = `${scopedQuery} min_faves:${topMinFaves}`;
          }

          return scopedQuery;
        };

        if (!isMore) {
          setStatus('[Phase 2] Async Parallel Fetch: Tavily + Broad X Search...');

          const tavilyPromise =
            shouldUseAdaptivePlan || effectiveBroadDiscoveryQuery
              ? tavilySearch(requestedQuery, isLatestMode)
              : Promise.resolve({ results: [], answer: '' });
          const expandedBroadQueryPromise = expandSearchQuery(requestedQuery, isLatestMode).catch(
            (error) => {
              console.warn(`[Search] Failed to expand query: ${requestedQuery}`, error);
              return requestedQuery;
            },
          );
          const exactSearchPromise = effectiveBroadDiscoveryQuery
            ? searchEverythingDeep(
                getScopedQuery(requestedQuery, 'exact'),
                null,
                onlyNews,
                searchQueryType,
                2,
              ).catch((error) => {
                console.warn(`[Search] Failed exact query: ${requestedQuery}`, error);
                return { data: [], meta: {} };
              })
            : Promise.resolve({ data: [], meta: {} });
          const broadSearchPromise = expandedBroadQueryPromise.then((expandedBroadQuery) => {
            const broadQuery = getScopedQuery(expandedBroadQuery || requestedQuery, 'broad');
            return searchEverythingDeep(
              broadQuery,
              null,
              onlyNews,
              searchQueryType,
              4,
            ).catch((error) => {
              console.warn(`[Search] Failed broad query: ${broadQuery}`, error);
              return { data: [], meta: {} };
            });
          });
          const entitySearchPromise =
            effectiveBroadDiscoveryQuery && broadBlueprint?.entityQuery
              ? searchEverythingDeep(
                  getScopedQuery(broadBlueprint.entityQuery, 'entity'),
                  null,
                  onlyNews,
                  searchQueryType,
                  3,
                ).catch((error) => {
                  console.warn(`[Search] Failed entity query: ${broadBlueprint.entityQuery}`, error);
                  return { data: [], meta: {} };
                })
              : Promise.resolve({ data: [], meta: {} });
          const viralSearchPromise =
            effectiveBroadDiscoveryQuery && broadBlueprint?.viralQuery
              ? searchEverythingDeep(
                  getScopedQuery(broadBlueprint.viralQuery, 'viral'),
                  null,
                  onlyNews,
                  searchQueryType,
                  3,
                ).catch((error) => {
                  console.warn(`[Search] Failed viral query: ${broadBlueprint.viralQuery}`, error);
                  return { data: [], meta: {} };
                })
              : Promise.resolve({ data: [], meta: {} });

          const [webData, exactResult, broadResult, entityResult, viralResult] = await Promise.all([
            tavilyPromise,
            exactSearchPromise,
            broadSearchPromise,
            entitySearchPromise,
            viralSearchPromise,
          ]);

          if (exactResult.data?.length) rawDataChunks.push(exactResult.data);
          if (broadResult.data?.length) rawDataChunks.push(broadResult.data);
          if (entityResult.data?.length) rawDataChunks.push(entityResult.data);
          if (viralResult.data?.length) rawDataChunks.push(viralResult.data);
          if (!finalCursor && readNextCursor(broadResult.meta)) finalCursor = readNextCursor(broadResult.meta);
          if (!finalCursor && readNextCursor(exactResult.meta)) finalCursor = readNextCursor(exactResult.meta);
          if (!finalCursor && readNextCursor(entityResult.meta)) finalCursor = readNextCursor(entityResult.meta);
          if (!finalCursor && readNextCursor(viralResult.meta)) finalCursor = readNextCursor(viralResult.meta);

          const initialMergedBroadData = mergeUniquePostsById(...rawDataChunks);
          if (effectiveBroadDiscoveryQuery && initialMergedBroadData.length < 8 && broadFallbackQueries.length > 0) {
            setStatus('[Fallback] ลองขยายคำค้นหาอัตโนมัติด้วยคำที่ใกล้เคียง...');
            const fallbackResults = await Promise.all(
              broadFallbackQueries.map((fallbackQuery, index) =>
                searchEverythingDeep(
                  getScopedQuery(fallbackQuery, index === 0 ? 'exact' : 'broad'),
                  null,
                  onlyNews,
                  searchQueryType,
                  index === 0 ? 2 : 3,
                ).catch((error) => {
                  console.warn(`[Search] Failed fallback broad query: ${fallbackQuery}`, error);
                  return { data: [], meta: {} };
                }),
              ),
            );

            fallbackResults.forEach((result) => {
              if (result.data?.length) rawDataChunks.push(result.data);
              if (!finalCursor && readNextCursor(result.meta)) finalCursor = readNextCursor(result.meta);
            });
          }

          if (webData && (webData.results?.length || webData.answer)) {
            const webResultsWithCitations = (webData.results || []).map((result: any, index: number) => ({
              ...result,
              citation_id: `[W${index + 1}]`,
            }));

            webContext = [
              webData.answer ? `[WEB NEWS ANSWER]\n${webData.answer}` : '',
              webResultsWithCitations
                .map(
                  (result: any) =>
                    `${result.citation_id} ${result.title}: ${result.content?.slice(0, 200)}... (${result.url})`,
                )
                .join('\n'),
            ]
              .filter(Boolean)
              .join('\n\n');
            resolvedSearchWebSources = webResultsWithCitations;
            setSearchWebSources(webResultsWithCitations);
          } else {
            resolvedSearchWebSources = [];
            setSearchWebSources([]);
          }

          if (shouldUseAdaptivePlan) {
            setStatus('[API] ออกแบบกลยุทธ์แสกนเชิงลึก (Precision Snipe) จาก Context...');
            searchPlan = await buildSearchPlan(requestedQuery, isLatestMode, webContext, isComplexQuery);
            setActiveSearchPlan(searchPlan);

            const snipeQueryRaw = searchPlan?.queries?.find(
              (query: string) => query !== requestedQuery && query !== `${requestedQuery} -filter:replies`,
            );

            if (snipeQueryRaw) {
              setStatus('[Phase 2] Async Parallel Fetch: X Search Precision Snipe...');
              const snipeQuery = getScopedQuery(snipeQueryRaw);

              try {
                const snipeResult = await searchEverything(
                  snipeQuery,
                  null,
                  onlyNews,
                  searchQueryType,
                  true,
                );
                if (snipeResult.data?.length) rawDataChunks.push(snipeResult.data);
                if (!finalCursor && readNextCursor(snipeResult.meta)) finalCursor = readNextCursor(snipeResult.meta);
              } catch (error) {
                console.warn(`[Search] Failed snipe query: ${snipeQuery}`, error);
              }
            }
          } else {
            setActiveSearchPlan(null);
          }
        } else {
          setStatus('[API] ดึงข้อมูล X Search เพิ่มเติม...');
          const planQueries =
            searchPlan?.queries?.length > 0 ? searchPlan.queries : [requestedQuery];

          for (const query of planQueries) {
            const scopedQuery = getScopedQuery(query);
            try {
              const searchResponse = effectiveBroadDiscoveryQuery
                ? await searchEverythingDeep(scopedQuery, searchCursor, onlyNews, searchQueryType, 2)
                : await searchEverything(scopedQuery, searchCursor, onlyNews, searchQueryType, false);
              const { data: chunk, meta } = searchResponse;
              if (chunk.length > 0) rawDataChunks.push(chunk);
              if (!finalCursor) finalCursor = meta.next_cursor;
            } catch (error) {
              console.warn(`[Search] Pagination failed: ${scopedQuery}`, error);
            }
          }
        }

        const rankingQuery = shouldUseAdaptivePlan
          ? mergePlanLabelsIntoQuery(requestedQuery, searchPlan?.topicLabels || [])
          : requestedQuery;
        const data = mergeUniquePostsById(...rawDataChunks);

        if (data.length > 0) {
          setStatus('[Quality Gate] คัดกรองและประเมิน Engagement...');
          const curated = curateSearchResults(data, rankingQuery, {
            latestMode: isLatestMode,
            preferCredibleSources: isComplexQuery && !effectiveBroadDiscoveryQuery,
          });

          setStatus('[Agent 2/3] กำลังกรองสแปมและคัดเลือกโพสต์ระดับคุณภาพจากฐานข้อมูล...');
          let cleanData: any[] = [];
          let nextOverflowResults: any[] = [];

          if (effectiveBroadDiscoveryQuery) {
            const broadCandidatePool =
              curated.length > 0 ? curated : data.slice(0, Math.min(data.length, 20));
            const rankedBroadResults = broadCandidatePool
              .slice(0, Math.min(broadCandidatePool.length, 30))
              .map((tweet, index) => ({
                ...tweet,
                ai_reasoning:
                  tweet.ai_reasoning ||
                  (curated.length > 0
                    ? 'Kept from the global-first ranked result set for this broad query.'
                    : 'Kept from the fallback broad-topic result set after the strict quality gate returned empty.'),
                temporalTag: tweet.temporalTag || (isLatestMode ? 'Breaking' : 'Related'),
                citation_id: tweet.citation_id || `[F${index + 1}]`,
              }));

            if (isMore) {
              const mergedBroadResults = mergeUniquePostsById(
                searchResults,
                searchOverflowResults,
                rankedBroadResults,
              );
              cleanData = mergedBroadResults.slice(
                0,
                Math.min(mergedBroadResults.length, searchResults.length + 10),
              );
              nextOverflowResults = mergedBroadResults.slice(cleanData.length);
            } else {
              cleanData = rankedBroadResults.slice(0, Math.min(rankedBroadResults.length, 10));
              nextOverflowResults = rankedBroadResults.slice(cleanData.length);
            }
          } else {
            setStatus('[Agent 2/3] Selecting the highest-quality posts from the search pool...');
            const dedupedCurated = clusterBySimilarity(curated, 0.55);
            const validPicks = await agentFilterFeed(dedupedCurated, rankingQuery, {
              preferCredibleSources: isComplexQuery,
              webContext,
              isComplexQuery,
            });
            const pickedData = dedupedCurated
              .filter((tweet) => validPicks.some((pick) => String(pick.id) === String(tweet.id)))
              .map((tweet) => {
                const pick = validPicks.find((item) => String(item.id) === String(tweet.id));
                return {
                  ...tweet,
                  ai_reasoning: pick?.reasoning,
                  temporalTag: pick?.temporalTag,
                  citation_id: pick?.citation_id,
                };
              });
            const shouldFallbackToCurated = pickedData.length === 0;
            cleanData =
              !shouldFallbackToCurated && pickedData.length > 0
                ? pickedData
                : dedupedCurated.slice(0, Math.min(dedupedCurated.length, 12)).map((tweet, index) => ({
                    ...tweet,
                    ai_reasoning:
                      tweet.ai_reasoning ||
                      'Kept as a fallback result after passing the local quality checks.',
                    temporalTag: tweet.temporalTag || (isLatestMode ? 'Breaking' : 'Related'),
                    citation_id: tweet.citation_id || `[F${index + 1}]`,
                  }));
          }

          const normalizedResults = cleanData.map((post) => sanitizeStoredPost(post));
          const xResults = effectiveBroadDiscoveryQuery
            ? normalizedResults
            : isMore
              ? mergeUniquePostsById(searchResults, normalizedResults).map(sanitizeStoredPost)
              : normalizedResults;

          setSearchResults(xResults);
          setSearchOverflowResults(effectiveBroadDiscoveryQuery ? nextOverflowResults : []);
          setSearchCursor(finalCursor);

          if (cleanData.length === 0) {
            setStatus(`ไม่พบเนื้อหาที่มีประโยชน์ หรือถูก AI ปฏิเสธทั้งหมด (จาก ${data.length} โพสต์ที่อ้างอิง)`);
          } else {
            setStatus(`ค้นพบ ${cleanData.length} รายการ (กลั่นกรองโดย AI จากทั้งหมด ${data.length} โพสต์)`);
          }

          const snapshot: SearchCacheSnapshot = {
            lastSubmittedSearchQuery: normalizedRequestedQueryLabel,
            searchCursor: finalCursor,
            searchOverflowResults: effectiveBroadDiscoveryQuery ? nextOverflowResults : [],
            searchResults: xResults,
            searchSummary: '',
            searchWebSources: resolvedSearchWebSources,
          };
          queryClient.setQueryData(cacheKey, snapshot);

          if (!isMore) {
            setStatus('[Agent 3/3] กำลังสังเคราะห์ข้อมูลและเขียน Executive Summary...');
            setSearchSummary('');

            generateExecutiveSummary(
              cleanData.slice(0, 10),
              requestedQuery,
              (_, fullText) => {
                setSearchSummary(fullText);
              },
              webContext,
            )
              .then((summaryText) => {
                if (summaryText) {
                  setSearchSummary(summaryText);
                  queryClient.setQueryData<SearchCacheSnapshot>(cacheKey, (prev) =>
                    prev
                      ? {
                          ...prev,
                          searchSummary: summaryText,
                          searchWebSources: resolvedSearchWebSources,
                        }
                      : prev,
                  );
                }
              })
              .catch((summaryError) => {
                console.warn('[Search] Executive summary failed:', summaryError);
              });
          }

          const CHUNK_SIZE = 5;
          void (async () => {
            try {
              for (let index = 0; index < cleanData.length; index += CHUNK_SIZE) {
                const chunk = cleanData.slice(index, index + CHUNK_SIZE);
                const batchTexts = chunk.map((tweet) => tweet.text);
                const summaries = await generateGrokBatch(batchTexts);

                setSearchResults((prev) =>
                  prev.map((post) => {
                    const chunkIndex = chunk.findIndex((item) => item.id === post.id);
                    if (chunkIndex === -1) return post;

                    const nextSummary = summaries[chunkIndex] || post.text;
                    return hasUsefulThaiSummary(nextSummary, post.text)
                      ? { ...post, summary: nextSummary }
                      : post;
                  }),
                );
              }
            } catch (batchError) {
              console.warn('[Search] Progressive translation failed:', batchError);
            }
          })();
        } else {
          setStatus('ไม่พบข้อมูลสำหรับคำค้นหานี้');
        }
      } catch (error) {
        console.error(error);
        setStatus('เกิดข้อผิดพลาดในการค้นหา');
      } finally {
        setIsLiveSearching(false);
      }
    },
  });

  const searchHistoryLabels = useMemo(
    () => searchHistory.map((item: any) => item.query).filter(Boolean),
    [searchHistory],
  );
  const interestSeedLabels = useMemo(() => {
    const feedInterestLabels = extractInterestTopics([
      ...originalFeed.slice(0, 12),
      ...readArchive.slice(0, 12),
    ]);
    return [...feedInterestLabels].filter(Boolean);
  }, [originalFeed, readArchive]);

  const dynamicSearchTags = useMemo(
    () =>
      buildDynamicSearchTags({
        searchPresets,
        searchHistoryLabels,
        interestSeedLabels,
        commonKeywords: COMMON_KEYWORDS,
        limit: MAX_SEARCH_PRESETS,
      }),
    [interestSeedLabels, searchHistoryLabels, searchPresets],
  );

  const canSaveCurrentSearchAsPreset =
    !!normalizeSearchLabel(searchQuery) &&
    !searchPresets.some(
      (item: string) => item.toLowerCase() === normalizeSearchLabel(searchQuery).toLowerCase(),
    ) &&
    searchPresets.length < MAX_SEARCH_PRESETS;

  const searchStatusMessage = status.replace(/\[.*?\]\s*/g, '').trim();
  const isSearchSummaryPending =
    activeView === 'content' &&
    contentTab === 'search' &&
    !searchMutation.isPending &&
    searchResults.length > 0 &&
    !searchSummary;
  const shouldInlineSearchStatus =
    activeView === 'content' &&
    contentTab === 'search' &&
    (searchMutation.isPending || isSearchSummaryPending) &&
    !!searchStatusMessage;

  return {
    activeSuggestionIndex,
    addSearchPreset,
    canSaveCurrentSearchAsPreset,
    dynamicSearchTags,
    handleSearch: (event?: FormEvent, isMore = false, overrideQuery = '') => {
      if (event) event.preventDefault();
      return searchMutation.mutateAsync({ isMore, overrideQuery });
    },
    interestSeedLabels,
    isLatestMode,
    isLiveSearching,
    isSearching: searchMutation.isPending,
    isSourcesExpanded,
    lastSubmittedSearchQuery,
    maxSearchPresets: MAX_SEARCH_PRESETS,
    removeSearchPreset,
    searchCursor,
    searchHistory,
    searchHistoryLabels,
    searchOverflowResults,
    searchPresets,
    searchQuery,
    searchResults,
    searchStatusMessage,
    searchSummary,
    searchWebSources,
    setActiveSuggestionIndex,
    setIsLatestMode,
    setIsSourcesExpanded,
    setSearchCursor,
    setSearchOverflowResults,
    setSearchQuery,
    setSearchResults,
    setSearchSummary,
    setSearchWebSources,
    setShowSuggestions,
    shouldInlineSearchStatus,
    showSuggestions,
  };
};
