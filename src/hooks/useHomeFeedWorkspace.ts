import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  agentFilterFeed,
  generateExecutiveSummary,
  generateGrokBatch,
  generateGrokSummary,
} from '../services/GrokService';
import { RSS_CATALOG } from '../config/rssCatalog';
import { fetchWatchlistFeed } from '../services/TwitterService';
import { fetchAllSubscribedFeeds, type RssSourceInfo } from '../services/RssService';
import { fetchReadableArticle } from '../services/ArticleService';
import {
  deriveVisibleFeed,
  getPostSummarySourceText,
  hasSubstantialThaiContent,
  hasUsefulThaiSummary,
  sanitizeStoredPost,
} from '../utils/appUtils';

type SetState<T> = Dispatch<SetStateAction<T>>;

const buildFeedSyncQueryKey = ({
  activeListId,
  twitterHandles,
  rssSourceIds,
}: {
  activeListId: string | null;
  twitterHandles: string[];
  rssSourceIds: string[];
}) => [
  'home-feed-sync',
  'v1',
  activeListId || 'all',
  [...twitterHandles].map((handle) => String(handle || '').trim().toLowerCase()).filter(Boolean).sort(),
  [...rssSourceIds].map((id) => String(id || '').trim().toLowerCase()).filter(Boolean).sort(),
];

type UseHomeFeedWorkspaceParams = {
  activeListId: string | null;
  activeView: string;
  originalFeed: any[];
  pendingFeed: any[];
  postLists: any[];
  watchlist: any[];
  setOriginalFeed: SetState<any[]>;
  setPendingFeed: SetState<any[]>;
  setReadArchive: SetState<any[]>;
  setStatus: (value: string) => void;
  subscribedSources?: RssSourceInfo[];
};

export const useHomeFeedWorkspace = ({
  activeListId,
  activeView,
  originalFeed,
  pendingFeed,
  postLists,
  watchlist,
  setOriginalFeed,
  setPendingFeed,
  setReadArchive,
  setStatus,
  subscribedSources = [],
}: UseHomeFeedWorkspaceParams) => {
  const queryClient = useQueryClient();
  const [feed, setFeed] = useState<any[]>([]);
  const deletedFeedRef = useRef<any[]>([]);
  const [deletedFeedCount, setDeletedFeedCount] = useState(0);
  const [activeFilters, setActiveFilters] = useState({ view: false, engagement: false });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);
  const [aiFilterSummary, setAiFilterSummary] = useState('');
  const [freshFeedIds, setFreshFeedIds] = useState<string[]>([]);

  const isSummarizingRef = useRef(false);
  const isBackfillingThaiRef = useRef(false);
  const isEnrichingImagesRef = useRef(false);
  const failedThaiSummaryIdsRef = useRef(new Set<string>());
  const enrichedImageIdsRef = useRef(new Set<string>());

  const getNormalizedPostId = (post: any) => String(post?.id || '').trim();

  const mergeIncomingPosts = (incomingPosts: any[] = []) => {
    if (!incomingPosts.length) return;

    setOriginalFeed((prev) => {
      const postMap = new Map(prev.map((post) => [post.id, sanitizeStoredPost(post)]));
      let didChange = false;

      incomingPosts.forEach((incomingPost) => {
        const postId = getNormalizedPostId(incomingPost);
        if (!postId) return;

        const normalizedIncomingPost = sanitizeStoredPost(incomingPost);
        const existingPost = postMap.get(postId);

        if (!existingPost) {
          postMap.set(postId, normalizedIncomingPost);
          didChange = true;
          return;
        }

        const mergedPost = sanitizeStoredPost({
          ...existingPost,
          ...normalizedIncomingPost,
          summary: existingPost.summary || normalizedIncomingPost.summary,
          primaryImageUrl: existingPost.primaryImageUrl || normalizedIncomingPost.primaryImageUrl,
          imageUrls:
            Array.isArray(existingPost.imageUrls) && existingPost.imageUrls.length > 0
              ? existingPost.imageUrls
              : normalizedIncomingPost.imageUrls,
          ai_reasoning: existingPost.ai_reasoning || normalizedIncomingPost.ai_reasoning,
          citation_id: existingPost.citation_id || normalizedIncomingPost.citation_id,
          temporalTag: existingPost.temporalTag || normalizedIncomingPost.temporalTag,
        });

        if (JSON.stringify(existingPost) !== JSON.stringify(mergedPost)) {
          postMap.set(postId, mergedPost);
          didChange = true;
        }
      });

      if (!didChange) return prev;

      return Array.from(postMap.values()).sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );
    });
  };

  const activeListMembers = useMemo(() => {
    if (!activeListId) {
      return {
        twitterHandles: watchlist
          .map((user) => (typeof user === 'string' ? user : user?.username))
          .filter(Boolean)
          .map((handle) => String(handle).trim().toLowerCase()),
        rssSourceIds: [],
      };
    }

    const activeList = postLists.find((list) => list.id === activeListId);
    const members = Array.isArray(activeList?.members) ? activeList.members : [];

    return members.reduce(
      (acc, member) => {
        const normalizedMember = String(member || '').trim().toLowerCase();
        if (!normalizedMember) return acc;

        if (normalizedMember.startsWith('rss:')) {
          acc.rssSourceIds.push(normalizedMember.slice(4));
        } else {
          acc.twitterHandles.push(normalizedMember);
        }

        return acc;
      },
      { twitterHandles: [], rssSourceIds: [] } as { twitterHandles: string[]; rssSourceIds: string[] },
    );
  }, [activeListId, postLists, watchlist]);

  const rssSourcesById = useMemo(() => {
    const allSources = [...Object.values(RSS_CATALOG).flat(), ...subscribedSources];

    return new Map(
      allSources.map((source) => [
        String(source?.id || '').trim().toLowerCase(),
        source,
      ]),
    );
  }, [subscribedSources]);

  const effectiveRssSources = useMemo(() => {
    if (!activeListId) return subscribedSources;

    const seenSourceIds = new Set<string>();

    return activeListMembers.rssSourceIds
      .map((sourceId) => rssSourcesById.get(sourceId))
      .filter((source): source is RssSourceInfo => Boolean(source))
      .filter((source) => {
        const normalizedId = String(source.id || '').trim().toLowerCase();
        if (!normalizedId || seenSourceIds.has(normalizedId)) return false;
        seenSourceIds.add(normalizedId);
        return true;
      });
  }, [activeListId, activeListMembers.rssSourceIds, rssSourcesById, subscribedSources]);

  useEffect(() => {
    setNextCursor(null);
    setPendingFeed([]);
  }, [activeListId, activeView, setPendingFeed]);

  const isThaiNativeRssPost = (post: any) => {
    if (String(post?.sourceType || '').trim().toLowerCase() !== 'rss') return false;

    const normalizedLang = String(post?.lang || '').trim().toLowerCase();
    if (normalizedLang.startsWith('th')) return true;

    return hasSubstantialThaiContent(getPostSummarySourceText(post), {
      minThaiChars: 18,
      minThaiRatio: 0.22,
      minLetterCount: 36,
    });
  };

  useEffect(() => {
    if (activeView === 'search' || isFiltered) return;

    setFeed(
      deriveVisibleFeed({
        activeFilters,
        activeListId,
        activeView,
        originalFeed,
        postLists,
        subscribedSources: effectiveRssSources,
      }),
    );
  }, [activeFilters, activeListId, activeView, effectiveRssSources, isFiltered, originalFeed, postLists]);

  const translatePostsToThai = async (
    posts: any[] = [],
    options: { retrySingles?: boolean; maxRetryCount?: number } = {},
  ) => {
    if (!posts.length) return [];

    const { retrySingles = false, maxRetryCount = 0 } = options;
    const sourceTexts = posts.map((post) => getPostSummarySourceText(post));
    const batchSummaries = await generateGrokBatch(sourceTexts);

    return Promise.all(
      posts.map(async (post, index) => {
        const sourceText = sourceTexts[index] || getPostSummarySourceText(post);
        const batchSummary = batchSummaries[index] || '';
        if (hasUsefulThaiSummary(batchSummary, sourceText)) {
          failedThaiSummaryIdsRef.current.delete(post.id);
          return { ...post, summary: batchSummary };
        }

        if (!retrySingles || index >= maxRetryCount) {
          failedThaiSummaryIdsRef.current.add(post.id);
          return post;
        }

        try {
          const retrySummary = await generateGrokSummary(sourceText);
          if (hasUsefulThaiSummary(retrySummary, sourceText)) {
            failedThaiSummaryIdsRef.current.delete(post.id);
            return { ...post, summary: retrySummary };
          }
        } catch (retryError) {
          console.warn('[Thai Summary Retry Failed]', retryError);
        }

        failedThaiSummaryIdsRef.current.add(post.id);
        return post;
      }),
    );
  };

  useEffect(() => {
    const candidates = originalFeed
      .filter(
        (post) =>
          post?.id &&
          !isThaiNativeRssPost(post) &&
          !hasUsefulThaiSummary(post.summary, getPostSummarySourceText(post)) &&
          !failedThaiSummaryIdsRef.current.has(post.id),
      )
      .slice(0, 6);

    if (!candidates.length || isSummarizingRef.current || isBackfillingThaiRef.current) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      isBackfillingThaiRef.current = true;

      try {
        const translatedPosts = await translatePostsToThai(candidates, {
          retrySingles: false,
        });
        const translatedSummaryMap = new Map(
          translatedPosts
            .filter((post) => hasUsefulThaiSummary(post.summary, getPostSummarySourceText(post)))
            .map((post) => [post.id, post.summary]),
        );

        if (!translatedSummaryMap.size) return;

        setOriginalFeed((prev) =>
          prev.map((post) =>
            translatedSummaryMap.has(post.id)
              ? { ...post, summary: translatedSummaryMap.get(post.id) }
              : post,
          ),
        );
        setReadArchive((prev) =>
          prev.map((post) =>
            translatedSummaryMap.has(post.id)
              ? { ...post, summary: translatedSummaryMap.get(post.id) }
              : post,
          ),
        );
      } finally {
        isBackfillingThaiRef.current = false;
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [originalFeed, setOriginalFeed, setReadArchive]);

  // Background Image Enrichment for RSS (especially Product Hunt)
  useEffect(() => {
    const candidates = originalFeed
      .filter(
        (post) =>
          post?.sourceType === 'rss' &&
          !post.primaryImageUrl &&
          post.url &&
          !enrichedImageIdsRef.current.has(post.id),
      )
      .slice(0, 8);

    if (!candidates.length || isEnrichingImagesRef.current) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      isEnrichingImagesRef.current = true;
      const idsToUpdate = new Set(candidates.map((c) => c.id));
      idsToUpdate.forEach((id) => enrichedImageIdsRef.current.add(id));

      try {
        const enrichedBatch = await Promise.allSettled(
          candidates.map(async (post) => {
            try {
              const article = await fetchReadableArticle(post.url);
              if (article.ok && article.leadImageUrl) {
                return { id: post.id, imageUrl: article.leadImageUrl };
              }
            } catch {
              // Ignore individual failures
            }
            return null;
          }),
        );

        const imageUpdates = new Map<string, string>();
        enrichedBatch.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            imageUpdates.set(result.value.id, result.value.imageUrl);
          }
        });

        if (imageUpdates.size > 0) {
          setOriginalFeed((prev) =>
            prev.map((post) =>
              imageUpdates.has(post.id)
                ? { ...post, primaryImageUrl: imageUpdates.get(post.id) }
                : post,
            ),
          );
        }
      } finally {
        isEnrichingImagesRef.current = false;
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [originalFeed, setOriginalFeed]);


  const processAndSummarizeFeed = async (newBatch: any[], statusPrefix = 'พบ') => {
    if (newBatch.length === 0 || isSummarizingRef.current) return;
    isSummarizingRef.current = true;

    const CHUNK_SIZE = 10;
    const totalChunks = Math.ceil(newBatch.length / CHUNK_SIZE);
    let runningFeed = [...originalFeed];

    try {
      for (let index = 0; index < newBatch.length; index += CHUNK_SIZE) {
        const chunkIndex = Math.floor(index / CHUNK_SIZE) + 1;
        setStatus(`${statusPrefix} ${newBatch.length} โพสต์ — กำลังสรุป ${chunkIndex}/${totalChunks}...`);

        const chunk = newBatch.slice(index, index + CHUNK_SIZE);
        const toSummarize = chunk.filter((tweet) => {
          const existing = runningFeed.find((post) => post.id === tweet.id);
          if (isThaiNativeRssPost(existing || tweet)) return false;
          return !hasUsefulThaiSummary(
            existing?.summary || tweet.summary,
            getPostSummarySourceText(existing || tweet),
          );
        });

        if (toSummarize.length > 0) {
          const translatedPosts = await translatePostsToThai(toSummarize, {
            retrySingles: chunkIndex === 1,
            maxRetryCount: 2,
          });
          const translatedSummaryMap = new Map(
            translatedPosts
              .filter((post) => hasUsefulThaiSummary(post.summary, getPostSummarySourceText(post)))
              .map((post) => [post.id, post.summary]),
          );

          toSummarize.forEach((post) => {
            if (translatedSummaryMap.has(post.id)) {
              post.summary = translatedSummaryMap.get(post.id);
            }
          });
        }

        setOriginalFeed((prev) => {
          const postMap = new Map(prev.map((post) => [post.id, post]));

          chunk.forEach((newPost) => {
            const normalizedNewPost = sanitizeStoredPost(newPost);

            if (postMap.has(newPost.id)) {
              postMap.set(newPost.id, {
                ...sanitizeStoredPost(postMap.get(newPost.id)),
                ...normalizedNewPost,
              });
            } else {
              postMap.set(newPost.id, normalizedNewPost);
            }
          });

          const nextList = Array.from(postMap.values()).sort(
            (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
          );
          runningFeed = nextList;
          return nextList;
        });

        setReadArchive((prev) => {
          const existingIds = new Set(prev.map((post) => post.id));
          const newItems = chunk.filter((post) => !existingIds.has(post.id));
          if (newItems.length > 0) return [...newItems, ...prev];
          return prev;
        });
      }
    } finally {
      isSummarizingRef.current = false;
    }
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const existingIds = new Set(
        originalFeed
          .map((post) => String(post?.id || '').trim())
          .filter(Boolean),
      );
      const hasWatchlist = activeListMembers.twitterHandles.length > 0;
      const hasRss = effectiveRssSources.length > 0;

      if (!hasWatchlist && !hasRss) {
        setStatus('กรุณาเพิ่มบัญชีหรือแหล่งข่าวที่ต้องการติดตามก่อนซิงค์ข้อมูล');
        return;
      }

      setStatus('กำลังเชื่อมต่อฐานข้อมูล... ดึงฟีดข่าวล่าสุด');

      const feedSyncCacheKey = buildFeedSyncQueryKey({
        activeListId,
        twitterHandles: activeListMembers.twitterHandles,
        rssSourceIds: effectiveRssSources.map((source) => source.id),
      });
      const cachedFeedSync = queryClient.getQueryData<[any, any[]]>(feedSyncCacheKey);

      // Fetch Twitter + RSS in parallel
      const twitterPromise = cachedFeedSync ? Promise.resolve(cachedFeedSync[0]) : (async () => {
        if (!hasWatchlist) return { data: [], meta: { next_cursor: null } };

        const targetAccounts = activeListMembers.twitterHandles;

        if (targetAccounts.length === 0) return { data: [], meta: { next_cursor: null } };

        return fetchWatchlistFeed(targetAccounts, '', 'Latest');
      })();

      const rssPromise = cachedFeedSync ? Promise.resolve(cachedFeedSync[1]) : (async () => {
        return fetchAllSubscribedFeeds(effectiveRssSources);
      })();

      const [twitterResult, rssPosts] = cachedFeedSync || await queryClient.fetchQuery({
        queryKey: feedSyncCacheKey,
        queryFn: () => Promise.all([twitterPromise, rssPromise]),
        staleTime: 2 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        retry: 1,
      });
      console.log(`[Sync] Twitter: ${twitterResult?.data?.length || 0}, RSS: ${rssPosts?.length || 0}`);

      const { data: twitterData, meta } = twitterResult;
      setNextCursor(meta.next_cursor);

      // Combine Twitter + RSS, sort by date
      const MAX_TWITTER_SYNC = 20;
      const twitterDisplay = twitterData.slice(0, MAX_TWITTER_SYNC);
      const twitterRemaining = twitterData.slice(MAX_TWITTER_SYNC);

      // RSS is unlimited, Twitter is capped at 20 per sync
      const displayData = [...twitterDisplay, ...rssPosts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const nextFreshFeedIds = displayData
        .map((post) => getNormalizedPostId(post))
        .filter((id) => id && !existingIds.has(id));
      const newDisplayData = displayData.filter((post) => {
        const postId = getNormalizedPostId(post);
        return postId && !existingIds.has(postId);
      });
      const existingDisplayData = displayData.filter((post) => {
        const postId = getNormalizedPostId(post);
        return postId && existingIds.has(postId);
      });

      setPendingFeed(twitterRemaining);

      const rssCount = rssPosts.length;
      const twitterCount = twitterData.length;
      const statusParts = [];
      if (twitterCount > 0) statusParts.push(`${twitterCount} โพสต์จาก X`);
      if (rssCount > 0) statusParts.push(`${rssCount} ข่าวจาก RSS`);

      if (existingDisplayData.length > 0) {
        mergeIncomingPosts(existingDisplayData);
      }

      if (newDisplayData.length > 0) {
        await processAndSummarizeFeed(
          newDisplayData,
          `ดึงข้อมูลสำเร็จ! ได้มา ${statusParts.join(' + ')} กำลังแปลและแสดงผล`,
        );
      }

      if (displayData.length === 0) {
        setStatus('ไม่มีข้อมูลใหม่');
      } else if (newDisplayData.length === 0) {
        setStatus('อัปเดตข้อมูลเรียบร้อย - ไม่มีโพสต์ใหม่ให้ประมวลผล');
      } else {
        setStatus('อัปเดตข้อมูลเรียบร้อย');
      }
      setFreshFeedIds(nextFreshFeedIds);
    },
    onError: (error: any) => {
      console.error(error);
      if (error?.message?.includes('401')) {
        setStatus('❌ ผิดพลาด (401): กุญแจ API ไม่ถูกต้อง กรุณาเช็ค Railway Environment Variables');
        return;
      }
      setStatus('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
    },
  });

  const loadMoreMutation = useMutation({
    mutationFn: async () => {
      if ((!nextCursor && pendingFeed.length === 0) || syncMutation.isPending || loadMoreMutation.isPending) {
        return;
      }

      const existingIds = new Set(
        originalFeed
          .map((post) => String(post?.id || '').trim())
          .filter(Boolean),
      );
      let nextBatch: any[] = [];
      let newNextBatch: any[] = [];
      let existingNextBatch: any[] = [];
      const MAX_SYNC = 20;
      const MAX_DUPLICATE_PASSES = 3;
      let workingPendingFeed = pendingFeed;
      let workingCursor = nextCursor;
      let attempts = 0;

      setFreshFeedIds([]);

      while (attempts < MAX_DUPLICATE_PASSES) {
        attempts += 1;

        if (workingPendingFeed.length > 0) {
          nextBatch = workingPendingFeed.slice(0, MAX_SYNC);
          workingPendingFeed = workingPendingFeed.slice(MAX_SYNC);
        } else if (workingCursor) {
          const targetAccounts = activeListMembers.twitterHandles;
          const { data, meta } = await fetchWatchlistFeed(targetAccounts, workingCursor, 'Latest');
          workingCursor = meta?.next_cursor || null;
          nextBatch = data.slice(0, MAX_SYNC);
          workingPendingFeed = data.slice(MAX_SYNC);
        } else {
          nextBatch = [];
          break;
        }

        newNextBatch = nextBatch.filter((post) => {
          const postId = getNormalizedPostId(post);
          return postId && !existingIds.has(postId);
        });
        existingNextBatch = nextBatch.filter((post) => {
          const postId = getNormalizedPostId(post);
          return postId && existingIds.has(postId);
        });

        if (existingNextBatch.length > 0) {
          mergeIncomingPosts(existingNextBatch);
        }

        if (newNextBatch.length > 0) break;
      }

      setPendingFeed(workingPendingFeed);
      setNextCursor(workingCursor);

      if (nextBatch.length > 0) {
        const nextFreshFeedIds = nextBatch
          .map((post) => getNormalizedPostId(post))
          .filter((id) => id && !existingIds.has(id));

        if (newNextBatch.length > 0) {
          await processAndSummarizeFeed(newNextBatch, 'กำลังดึงข้อมูลเพิ่มอีก');
          setStatus('อัปเดตข้อมูลเพิ่มเติมเรียบร้อย');
        } else if (workingPendingFeed.length > 0 || workingCursor) {
          setStatus('ยังไม่พบโพสต์ใหม่ในชุดนี้ ลองโหลดเพิ่มเติมอีกครั้ง');
        } else {
          setStatus('อัปเดตข้อมูลเพิ่มเติมเรียบร้อย - ไม่มีโพสต์ใหม่ให้ประมวลผล');
        }
        setFreshFeedIds(nextFreshFeedIds);
      } else {
        setFreshFeedIds([]);
        setStatus('ไม่มีข้อมูลเพิ่มเติม');
      }
    },
    onError: (error: any) => {
      console.error(error);
      if (error?.message?.includes('401')) {
        setStatus('❌ ผิดพลาด (401): กุญแจ API ไม่ถูกต้อง กรุณาเช็ค Railway Environment Variables');
        return;
      }
      setStatus('เกิดข้อผิดพลาดในการโหลดข้อมูลเพิ่มเติม');
    },
  });

  const aiFilterMutation = useMutation({
    mutationFn: async (prompt: string) => {
      if (!prompt) return;

      setStatus('AI กำลังวิเคราะห์และคัดกรองเนื้อหา...');
      const sourceFeed = deriveVisibleFeed({
        activeFilters,
        activeListId,
        activeView: 'home',
        originalFeed,
        postLists,
        subscribedSources: effectiveRssSources,
      });

      if (sourceFeed.length === 0) {
        setStatus('ยังไม่มีโพสต์ใน Watchlist Feed ให้ AI กรอง');
        return;
      }

      const validPicks = await agentFilterFeed(sourceFeed, prompt);
      const filteredResult = sourceFeed
        .filter((tweet) => validPicks.some((pick) => String(pick.id) === String(tweet.id)))
        .map((tweet) => {
          const matchingPick = validPicks.find((pick) => String(pick.id) === String(tweet.id));
          return {
            ...tweet,
            ai_reasoning: matchingPick?.reasoning,
            temporalTag: matchingPick?.temporalTag,
            citation_id: matchingPick?.citation_id,
          };
        });

      setFeed(filteredResult);
      setIsFiltered(true);

      if (filteredResult.length > 0) {
        setStatus('กำลังวิเคราะห์บทสรุปสำหรับคุณ...');
        const summary = await generateExecutiveSummary(filteredResult.slice(0, 8), prompt, undefined);
        setAiFilterSummary(summary);
        setStatus(`กรองสำเร็จ! พบ ${filteredResult.length} โพสต์ที่ตรงตามเจตนาของคุณ`);
      } else {
        setAiFilterSummary('');
        setStatus('ไม่พบโพสต์ที่ตรงตามเงื่อนไข ลองปรับคำสั่งกรองใหม่');
      }
    },
    onError: (error) => {
      console.error(error);
      setStatus('การกรองข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง');
    },
  });

  const handleDeleteAll = () => {
    if (originalFeed.length === 0) return;

    deletedFeedRef.current = originalFeed;
    setDeletedFeedCount(originalFeed.length);
    setPendingFeed([]);
    setNextCursor(null);
    setIsFiltered(false);
    setAiFilterSummary('');
    setFreshFeedIds([]);
    setOriginalFeed([]);
    setFeed([]);
    void queryClient.removeQueries({ queryKey: ['home-feed-sync'] });
  };

  const handleUndo = () => {
    if (deletedFeedRef.current.length > 0) {
      setOriginalFeed(deletedFeedRef.current);
      deletedFeedRef.current = [];
      setDeletedFeedCount(0);
      setFreshFeedIds([]);
    }
  };

  const handleSort = (type: 'view' | 'engagement') => {
    setActiveFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const clearAiFilter = () => {
    setIsFiltered(false);
    setAiFilterSummary('');
    setOriginalFeed((prev) => [...prev]);
    setStatus('ล้างตัวกรองแล้ว');
  };

  return {
    activeFilters,
    aiFilterSummary,
    applyAiFilter: aiFilterMutation.mutateAsync,
    clearAiFilter,
    deletedFeedCount,
    feed,
    freshFeedIds,
    handleDeleteAll,
    handleLoadMore: loadMoreMutation.mutateAsync,
    handleSort,
    handleSync: syncMutation.mutateAsync,
    handleUndo,
    isFiltered,
    isFiltering: aiFilterMutation.isPending,
    isLoadingMore: loadMoreMutation.isPending,
    isSyncing: syncMutation.isPending,
    loading: syncMutation.isPending || loadMoreMutation.isPending,
    nextCursor,
  };
};
