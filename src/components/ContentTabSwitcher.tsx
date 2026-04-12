import { startTransition } from 'react';
import { Search, SquarePen } from 'lucide-react';
import type { ContentTab } from '../types/domain';

type ContentTabSwitcherProps = {
  contentTab: ContentTab;
  setContentTab: (tab: ContentTab) => void;
  className?: string;
  hidden?: boolean;
  disableCreate?: boolean;
  onLockedCreateClick?: () => void;
};

const ContentTabSwitcher = ({
  contentTab,
  setContentTab,
  className = '',
  hidden = false,
  disableCreate = false,
  onLockedCreateClick,
}: ContentTabSwitcherProps) => {
  const handleTabChange = (tab: ContentTab) => {
    if (contentTab === tab) return;
    startTransition(() => {
      setContentTab(tab);
    });
  };

  return (
    <div
      className={`content-view-tabs content-view-tabs-hero ${className}`.trim()}
      style={hidden ? { display: 'none' } : undefined}
    >
      <button
        type="button"
        className={`btn-pill content-view-tab-btn ${contentTab === 'search' ? 'primary' : ''}`}
        onClick={() => handleTabChange('search')}
        aria-pressed={contentTab === 'search'}
      >
        <Search size={16} /> {'\u0e04\u0e49\u0e19\u0e2b\u0e32'}
      </button>
      <button
        type="button"
        className={`btn-pill content-view-tab-btn ${contentTab === 'create' ? 'primary' : ''} ${disableCreate ? 'is-locked' : ''}`}
        onClick={() => {
          if (disableCreate) {
            onLockedCreateClick?.();
            return;
          }
          handleTabChange('create');
        }}
        title={disableCreate ? 'Generate Studio \u0e40\u0e1b\u0e47\u0e19\u0e1f\u0e35\u0e40\u0e08\u0e2d\u0e23\u0e4c\u0e02\u0e2d\u0e07\u0e41\u0e1e\u0e47\u0e01 Plus' : undefined}
        aria-pressed={contentTab === 'create'}
      >
        <SquarePen size={16} /> {'\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e04\u0e2d\u0e19\u0e40\u0e17\u0e19\u0e15\u0e4c'}
      </button>
    </div>
  );
};

export default ContentTabSwitcher;
