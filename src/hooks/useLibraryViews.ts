import { useEffect, useMemo } from 'react';
import { getEngagementTotal, normalizeSearchText, scoreFuzzyTextMatch, toNumber } from '../utils/appUtils';

type UseLibraryViewsParams = {
  activeListId: string | null;
  postLists: Array<{ id: string; members?: string[] }>;
  bookmarkTab: string;
  bookmarks: any[];
  deferredReadSearchQuery: string;
  readArchive: any[];
  readFilters: { view: boolean; engagement: boolean };
  visibleReadCount: number;
  setVisibleReadCount: (value: number) => void;
  readArchiveInitialRender: number;
  activeView: string;
};

const useLibraryViews = ({
  activeListId,
  postLists,
  bookmarkTab,
  bookmarks,
  deferredReadSearchQuery,
  readArchive,
  readFilters,
  visibleReadCount,
  setVisibleReadCount,
  readArchiveInitialRender,
  activeView,
}: UseLibraryViewsParams) => {
  const activeReadListMemberSet = useMemo(() => {
    if (!activeListId) return null;
    const activeList = postLists.find((list) => list.id === activeListId);
    if (!activeList) return null;

    return new Set(
      (Array.isArray(activeList.members) ? activeList.members : [])
        .map((member) => member?.toLowerCase())
        .filter(Boolean),
    );
  }, [activeListId, postLists]);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((item) => {
      const isArticle = item?.type === 'article';
      const matchesTab = bookmarkTab === 'news' ? !isArticle : isArticle;
      if (!matchesTab) return false;
      if (!activeReadListMemberSet) return true;

      if (!isArticle) {
        return item?.author?.username && activeReadListMemberSet.has(item.author.username.toLowerCase());
      }

      const attachedAuthor = item?.attachedSource?.author?.username;
      if (attachedAuthor && activeReadListMemberSet.has(attachedAuthor.toLowerCase())) {
        return true;
      }

      return (Array.isArray(item?.sources) ? item.sources : []).some((source) => {
        const sourceAuthor = source?.author?.username;
        return sourceAuthor && activeReadListMemberSet.has(sourceAuthor.toLowerCase());
      });
    });
  }, [activeReadListMemberSet, bookmarkTab, bookmarks]);

  const bookmarkIds = useMemo(
    () => new Set(bookmarks.map((item) => item?.id).filter(Boolean)),
    [bookmarks],
  );

  const normalizedReadSearchQuery = useMemo(
    () => normalizeSearchText(deferredReadSearchQuery),
    [deferredReadSearchQuery],
  );

  const { readSearchSuggestions, filteredReadArchive } = useMemo(() => {
    const suggestions = Array.from(
      new Set(
        readArchive
          .flatMap((item) => [
            item?.author?.name,
            item?.author?.username ? `@${item.author.username}` : '',
            item?.summary,
            item?.text,
          ])
          .filter(Boolean)
          .flatMap((value) =>
            String(value)
              .split(/[\n,]/)
              .map((part) => part.trim()),
          )
          .filter((value) => {
            const normalizedValue = normalizeSearchText(value);
            return (
              normalizedReadSearchQuery &&
              normalizedValue &&
              normalizedValue !== normalizedReadSearchQuery &&
              normalizedValue.includes(normalizedReadSearchQuery)
            );
          }),
      ),
    ).slice(0, 4);

    const filtered = readArchive
      .filter((item) => {
        if (!activeReadListMemberSet) return true;
        return item?.author?.username && activeReadListMemberSet.has(item.author.username.toLowerCase());
      })
      .map((item) => ({
        item,
        searchScore: normalizedReadSearchQuery
          ? scoreFuzzyTextMatch(
              normalizedReadSearchQuery,
              item?.author?.name,
              item?.author?.username,
              item?.summary,
              item?.text,
            )
          : 1,
      }))
      .filter(({ searchScore }) => searchScore > 0)
      .sort((left, right) => {
        if (normalizedReadSearchQuery && right.searchScore !== left.searchScore) {
          return right.searchScore - left.searchScore;
        }

        if (!readFilters.view && !readFilters.engagement) {
          return new Date(right.item.created_at || 0).getTime() - new Date(left.item.created_at || 0).getTime();
        }

        const scoreA =
          (readFilters.view ? toNumber(left.item.view_count) : 0) +
          (readFilters.engagement ? getEngagementTotal(left.item) : 0);
        const scoreB =
          (readFilters.view ? toNumber(right.item.view_count) : 0) +
          (readFilters.engagement ? getEngagementTotal(right.item) : 0);

        return scoreB - scoreA;
      })
      .map(({ item }) => item);

    return {
      readSearchSuggestions: suggestions,
      filteredReadArchive: filtered,
    };
  }, [activeReadListMemberSet, normalizedReadSearchQuery, readArchive, readFilters]);

  const visibleReadArchive = useMemo(
    () => filteredReadArchive.slice(0, visibleReadCount),
    [filteredReadArchive, visibleReadCount],
  );

  useEffect(() => {
    setVisibleReadCount(readArchiveInitialRender);
  }, [
    activeView,
    activeListId,
    normalizedReadSearchQuery,
    readFilters.view,
    readFilters.engagement,
    readArchive.length,
    readArchiveInitialRender,
    setVisibleReadCount,
  ]);

  return {
    activeReadListMemberSet,
    filteredBookmarks,
    bookmarkIds,
    normalizedReadSearchQuery,
    readSearchSuggestions,
    filteredReadArchive,
    visibleReadArchive,
  };
};

export default useLibraryViews;
