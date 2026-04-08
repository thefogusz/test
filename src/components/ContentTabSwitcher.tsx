import { startTransition } from 'react';
import { Crown, Search, SquarePen } from 'lucide-react';
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
        <Search size={16} /> ค้นหา
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
        title={disableCreate ? 'Generate Studio เป็นฟีเจอร์ของแพ็ก Plus' : undefined}
        aria-pressed={contentTab === 'create'}
      >
        {disableCreate ? <Crown size={16} /> : <SquarePen size={16} />} สร้างคอนเทนต์
      </button>
    </div>
  );
};

export default ContentTabSwitcher;
