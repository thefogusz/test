import { Sparkles, X } from 'lucide-react';

type AiFilteredBadgeProps = {
  onClear: () => void;
  clearTitle?: string;
};

const AiFilteredBadge = ({
  onClear,
  clearTitle = 'ล้างตัวกรอง',
}: AiFilteredBadgeProps) => {
  return (
    <div className="ai-filtered-badge">
      <Sparkles size={12} className="text-accent" />
      <span>AI FILTERED</span>
      <button onClick={onClear} className="ai-filtered-clear-btn" title={clearTitle}>
        <X size={12} />
      </button>
    </div>
  );
};

export default AiFilteredBadge;
