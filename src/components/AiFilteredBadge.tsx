import { Filter, X } from 'lucide-react';

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
      <Filter size={12} className="text-accent" />
      <span>FORO FILTER</span>
      <button onClick={onClear} className="ai-filtered-clear-btn" title={clearTitle}>
        <X size={12} />
      </button>
    </div>
  );
};

export default AiFilteredBadge;
