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
  return (
    <div
      className={`content-view-tabs content-view-tabs-hero ${className}`.trim()}
      style={hidden ? { display: 'none' } : undefined}
    >
      <button
        className={`btn-pill content-view-tab-btn ${contentTab === 'search' ? 'primary' : ''}`}
        onClick={() => setContentTab('search')}
      >
        <Search size={16} /> ค้นหา
      </button>
      <button
        className={`btn-pill content-view-tab-btn ${contentTab === 'create' ? 'primary' : ''} ${disableCreate ? 'is-locked' : ''}`}
        onClick={() => {
          if (disableCreate) {
            onLockedCreateClick?.();
            return;
          }
          setContentTab('create');
        }}
        title={disableCreate ? 'Generate Studio เป็นฟีเจอร์ของแพ็ก Plus' : undefined}
      >
        {disableCreate ? <Crown size={16} /> : <SquarePen size={16} />} สร้างคอนเทนต์
      </button>
    </div>
  );
};

export default ContentTabSwitcher;
