import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  agentFilterFeed,
  generateExecutiveSummary,
  generateGrokBatch,
  generateGrokSummary,
} from '../services/GrokService';
import { fetchWatchlistFeed } from '../services/TwitterService';
import {
  deriveVisibleFeed,
  hasUsefulThaiSummary,
  sanitizeStoredPost,
} from '../utils/appUtils';

type SetState<T> = Dispatch<SetStateAction<T>>;

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
}: UseHomeFeedWorkspaceParams) => {
  const [feed, setFeed] = useState<any[]>([]);
  const [deletedFeed, setDeletedFeed] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState({ view: false, engagement: false });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);
  const [aiFilterSummary, setAiFilterSummary] = useState('');

  const isSummarizingRef = useRef(false);
  const isBackfillingThaiRef = useRef(false);
  const failedThaiSummaryIdsRef = useRef(new Set<string>());

  useEffect(() => {
    setNextCursor(null);
    setPendingFeed([]);
  }, [activeListId, activeView, setPendingFeed]);

  useEffect(() => {
    if (activeView === 'search' || isFiltered) return;

    setFeed(
      deriveVisibleFeed({
        activeFilters,
        activeListId,
        activeView,
        originalFeed,
        postLists,
        watchlist,
      }),
    );
  }, [activeFilters, activeListId, activeView, isFiltered, originalFeed, postLists, watchlist]);

  const translatePostsToThai = async (posts: any[] = []) => {
    if (!posts.length) return [];

    const batchSummaries = await generateGrokBatch(posts.map((post) => post.text));

    return Promise.all(
      posts.map(async (post, index) => {
        const batchSummary = batchSummaries[index] || '';
        if (hasUsefulThaiSummary(batchSummary, post.text)) {
          failedThaiSummaryIdsRef.current.delete(post.id);
          return { ...post, summary: batchSummary };
        }

        try {
          const retrySummary = await generateGrokSummary(post.text);
          if (hasUsefulThaiSummary(retrySummary, post.text)) {
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
          !hasUsefulThaiSummary(post.summary, post.text) &&
          !failedThaiSummaryIdsRef.current.has(post.id),
      )
      .slice(0, 6);

    if (!candidates.length || isSummarizingRef.current || isBackfillingThaiRef.current) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      isBackfillingThaiRef.current = true;

      try {
        const translatedPosts = await translatePostsToThai(candidates);
        const translatedSummaryMap = new Map(
          translatedPosts
            .filter((post) => hasUsefulThaiSummary(post.summary, post.text))
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
          return !hasUsefulThaiSummary(existing?.summary || tweet.summary, existing?.text || tweet.text);
        });

        if (toSummarize.length > 0) {
          const translatedPosts = await translatePostsToThai(toSummarize);
          const translatedSummaryMap = new Map(
            translatedPosts
              .filter((post) => hasUsefulThaiSummary(post.summary, post.text))
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
      if (watchlist.length === 0) {
        setStatus('กรุณาเพิ่มบัญชีที่ต้องการติดตามก่อนซิงค์ข้อมูล');
        return;
      }

      setStatus('กำลังเชื่อมต่อฐานข้อมูล... ดึงฟีดข่าวล่าสุด');

      const activeList = activeListId ? postLists.find((list) => list.id === activeListId) : null;
      const rawAccounts = activeList ? activeList.members : watchlist;
      const targetAccounts = Array.isArray(rawAccounts)
        ? rawAccounts.map((user) => (typeof user === 'string' ? user : user.username)).filter(Boolean)
        : [];

      if (targetAccounts.length === 0) {
        setStatus(
          activeList
            ? 'Post List นี้ยังไม่มีสมาชิกให้ซิงค์'
            : 'กรุณาเพิ่มบัญชีที่ต้องการติดตามก่อนซิงค์ข้อมูล',
        );
        return;
      }

      const { data, meta } = await fetchWatchlistFeed(targetAccounts, '', 'Latest');
      setNextCursor(meta.next_cursor);

      const MAX_SYNC = 20;
      const displayData = data.slice(0, MAX_SYNC);
      const remainingData = data.slice(MAX_SYNC);

      setPendingFeed(remainingData);

      if (displayData.length > 0) {
        await processAndSummarizeFeed(
          displayData,
          `ดึงข้อมูลสำเร็จ! ได้มา ${data.length} โพสต์ กำลังแปลและแสดงผล`,
        );
      }

      setStatus('อัปเดตข้อมูลเรียบร้อย');
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

      let nextBatch: any[] = [];
      const MAX_SYNC = 20;

      if (pendingFeed.length > 0) {
        nextBatch = pendingFeed.slice(0, MAX_SYNC);
        setPendingFeed(pendingFeed.slice(MAX_SYNC));
      } else {
        const activeList = activeListId ? postLists.find((list) => list.id === activeListId) : null;
        const targetAccounts = activeList ? activeList.members : watchlist;
        const { data, meta } = await fetchWatchlistFeed(targetAccounts, nextCursor, 'Latest');
        setNextCursor(meta.next_cursor);

        nextBatch = data.slice(0, MAX_SYNC);
        setPendingFeed(data.slice(MAX_SYNC));
      }

      if (nextBatch.length > 0) {
        await processAndSummarizeFeed(nextBatch, 'กำลังดึงข้อมูลเพิ่มอีก');
        setStatus('อัปเดตข้อมูลเพิ่มเติมเรียบร้อย');
      } else {
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
        watchlist,
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
    setDeletedFeed([...originalFeed]);
    setOriginalFeed([]);
    setFeed([]);
  };

  const handleUndo = () => {
    if (deletedFeed.length > 0) {
      setOriginalFeed([...deletedFeed]);
      setDeletedFeed([]);
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
    deletedFeed,
    feed,
    handleDeleteAll,
    handleLoadMore: loadMoreMutation.mutateAsync,
    handleSort,
    handleSync: syncMutation.mutateAsync,
    handleUndo,
    isFiltered,
    isFiltering: aiFilterMutation.isPending,
    loading: syncMutation.isPending || loadMoreMutation.isPending,
    nextCursor,
  };
};
