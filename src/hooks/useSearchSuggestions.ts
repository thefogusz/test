import { useMemo } from 'react';
import { getSearchSuggestions } from '../utils/searchHelpers';

const useSearchSuggestions = ({
  activeView,
  audienceTab,
  manualQuery,
  searchQuery,
  searchPresets,
  searchHistoryLabels,
  interestSeedLabels,
}) =>
  useMemo(() => {
    const isAudienceManual = activeView === 'audience' && audienceTab === 'manual';
    const query = isAudienceManual ? manualQuery : searchQuery;

    return getSearchSuggestions({
      query,
      searchPresets,
      searchHistoryLabels,
      interestSeedLabels,
    });
  }, [
    activeView,
    audienceTab,
    interestSeedLabels,
    manualQuery,
    searchHistoryLabels,
    searchPresets,
    searchQuery,
  ]);

export default useSearchSuggestions;
