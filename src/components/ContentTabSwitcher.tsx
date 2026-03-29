import { Search, Sparkles } from 'lucide-react';
import type { ContentTab } from '../types/domain';

type ContentTabSwitcherProps = {
  contentTab: ContentTab;
  setContentTab: (tab: ContentTab) => void;
  className?: string;
  hidden?: boolean;
};

const ContentTabSwitcher = ({
  contentTab,
  setContentTab,
  className = '',
  hidden = false,
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
        className={`btn-pill content-view-tab-btn ${contentTab === 'create' ? 'primary' : ''}`}
        onClick={() => setContentTab('create')}
      >
        <Sparkles size={16} /> สร้างคอนเทนต์
      </button>
    </div>
  );
};

export default ContentTabSwitcher;
