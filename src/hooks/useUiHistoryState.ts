import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { ActiveView, ContentTab, Post } from '../types/domain';

const UI_HISTORY_STATE_KEY = 'foroUiState';
const UI_HISTORY_CONTROLLED_KEY = 'foroUiControlled';

type MobileProfileSection = 'details' | 'pricing' | 'audience';

type FilterModalState = {
  show: boolean;
  prompt: string;
};

type UseUiHistoryStateArgs = {
  activeView: ActiveView;
  setActiveView: Dispatch<SetStateAction<ActiveView>>;
  setMobileProfileSection: Dispatch<SetStateAction<MobileProfileSection>>;
  contentTab: ContentTab;
  setContentTab: Dispatch<SetStateAction<ContentTab>>;
  isMobilePostListOpen: boolean;
  setIsMobilePostListOpen: Dispatch<SetStateAction<boolean>>;
  filterModal: FilterModalState;
  setFilterModal: Dispatch<SetStateAction<FilterModalState>>;
  selectedArticle: Post | null;
  setSelectedArticle: Dispatch<SetStateAction<Post | null>>;
};

const buildUiHistorySignature = ({
  activeView,
  contentTab,
  isMobilePostListOpen,
  isFilterModalOpen,
  filterPrompt,
  selectedArticleId,
}: {
  activeView: string;
  contentTab: string;
  isMobilePostListOpen: boolean;
  isFilterModalOpen: boolean;
  filterPrompt: string;
  selectedArticleId: string | null;
}) =>
  JSON.stringify({
    activeView,
    contentTab,
    isMobilePostListOpen,
    isFilterModalOpen,
    filterPrompt,
    selectedArticleId,
  });

export const useUiHistoryState = ({
  activeView,
  setActiveView,
  setMobileProfileSection,
  contentTab,
  setContentTab,
  isMobilePostListOpen,
  setIsMobilePostListOpen,
  filterModal,
  setFilterModal,
  selectedArticle,
  setSelectedArticle,
}: UseUiHistoryStateArgs) => {
  const hasInitializedUiHistoryRef = useRef(false);
  const isApplyingUiHistoryRef = useRef(false);

  const uiHistorySnapshot = useMemo(
    () => ({
      activeView,
      contentTab,
      isMobilePostListOpen,
      filterModal,
      selectedArticle,
    }),
    [activeView, contentTab, filterModal, isMobilePostListOpen, selectedArticle],
  );
  const initialUiHistorySnapshotRef = useRef(uiHistorySnapshot);

  const uiHistorySignature = useMemo(
    () =>
      buildUiHistorySignature({
        activeView,
        contentTab,
        isMobilePostListOpen,
        isFilterModalOpen: Boolean(filterModal?.show),
        filterPrompt: String(filterModal?.prompt || ''),
        selectedArticleId: selectedArticle?.id ? String(selectedArticle.id) : null,
      }),
    [activeView, contentTab, filterModal, isMobilePostListOpen, selectedArticle],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const applyUiHistorySnapshot = (snapshot: {
      activeView?: ActiveView;
      contentTab?: ContentTab;
      isMobilePostListOpen?: boolean;
      filterModal?: FilterModalState;
      selectedArticle?: Post | null;
    }) => {
      if (!snapshot || typeof snapshot !== 'object') return;

      startTransition(() => {
        if (snapshot.activeView) {
          setActiveView(snapshot.activeView);
          if (snapshot.activeView === 'pricing') {
            setMobileProfileSection('details');
          }
        }

        if (snapshot.contentTab) {
          setContentTab(snapshot.contentTab);
        }

        setIsMobilePostListOpen(Boolean(snapshot.isMobilePostListOpen));
        setFilterModal(
          snapshot.filterModal && typeof snapshot.filterModal === 'object'
            ? snapshot.filterModal
            : { show: false, prompt: '' },
        );
        setSelectedArticle(snapshot.selectedArticle ?? null);
      });
    };

    const currentState = window.history.state || {};
    const existingSnapshot = currentState?.[UI_HISTORY_STATE_KEY];

    if (existingSnapshot) {
      isApplyingUiHistoryRef.current = true;
      applyUiHistorySnapshot(existingSnapshot);
    }

    window.history.replaceState(
      {
        ...currentState,
        [UI_HISTORY_CONTROLLED_KEY]: true,
        [UI_HISTORY_STATE_KEY]: existingSnapshot || initialUiHistorySnapshotRef.current,
      },
      '',
      window.location.href,
    );
    hasInitializedUiHistoryRef.current = true;

    const handlePopState = (event: PopStateEvent) => {
      const nextSnapshot = event.state?.[UI_HISTORY_STATE_KEY];
      if (!nextSnapshot) return;

      isApplyingUiHistoryRef.current = true;
      applyUiHistorySnapshot(nextSnapshot);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    setActiveView,
    setContentTab,
    setFilterModal,
    setIsMobilePostListOpen,
    setMobileProfileSection,
    setSelectedArticle,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasInitializedUiHistoryRef.current) return;

    const currentState = window.history.state || {};
    const currentSnapshot = currentState?.[UI_HISTORY_STATE_KEY];
    const currentSignature = buildUiHistorySignature({
      activeView: currentSnapshot?.activeView || 'home',
      contentTab: currentSnapshot?.contentTab || 'search',
      isMobilePostListOpen: Boolean(currentSnapshot?.isMobilePostListOpen),
      isFilterModalOpen: Boolean(currentSnapshot?.filterModal?.show),
      filterPrompt: String(currentSnapshot?.filterModal?.prompt || ''),
      selectedArticleId: currentSnapshot?.selectedArticle?.id
        ? String(currentSnapshot.selectedArticle.id)
        : null,
    });

    const nextState = {
      ...currentState,
      [UI_HISTORY_CONTROLLED_KEY]: true,
      [UI_HISTORY_STATE_KEY]: uiHistorySnapshot,
    };

    if (isApplyingUiHistoryRef.current) {
      isApplyingUiHistoryRef.current = false;
      window.history.replaceState(nextState, '', window.location.href);
      return;
    }

    if (currentSignature === uiHistorySignature) {
      window.history.replaceState(nextState, '', window.location.href);
      return;
    }

    window.history.pushState(nextState, '', window.location.href);
  }, [uiHistorySignature, uiHistorySnapshot]);
};
