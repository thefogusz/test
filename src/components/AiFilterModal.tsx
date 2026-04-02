import { Filter as FilterIcon, Plus, RefreshCw, X } from 'lucide-react';

const AiFilterModal = ({
  filterModal,
  quickFilterPresets,
  quickFilterVisiblePresets,
  visibleQuickPresets,
  onClose,
  onPromptChange,
  onSelectPreset,
  onRemovePreset,
  onToggleVisiblePreset,
  onAddPreset,
  onSubmit,
}) => {
  if (!filterModal.show) return null;

  const trimmedPrompt = filterModal.prompt.trim();
  const canSavePreset = trimmedPrompt && !quickFilterPresets.includes(trimmedPrompt);

  return (
    <div className="modal-overlay" onClick={() => !filterModal.isFiltering && onClose()}>
      <div className="modal-content ai-filter-modal animate-fade-in" onClick={(event) => event.stopPropagation()}>
        <div className="ai-filter-modal-header">
          <div className="ai-filter-modal-icon">
            <FilterIcon size={16} />
          </div>
          <div>
            <div className="modal-title">FORO Filter</div>
            <div className="ai-filter-modal-hint">บอก FORO ว่าอยากหาอะไรในฟีดนี้</div>
          </div>
        </div>

        {quickFilterPresets.length > 0 && (
          <div className="ai-filter-presets">
            {quickFilterPresets.map((preset) => (
              <div key={preset} className="ai-filter-modal-preset-chip">
                <button
                  type="button"
                  className={`ai-filter-preset-btn ${filterModal.prompt === preset ? 'active' : ''}`}
                  disabled={filterModal.isFiltering}
                  onClick={() => onSelectPreset(preset)}
                >
                  {preset}
                </button>
                <button
                  type="button"
                  className="ai-filter-preset-remove-btn"
                  disabled={filterModal.isFiltering}
                  onClick={() => onRemovePreset(preset)}
                  title="ลบ preset"
                >
                  <X size={12} />
                </button>
                <button
                  type="button"
                  className={`ai-filter-preset-visibility-btn ${quickFilterVisiblePresets.includes(preset) ? 'active' : ''}`}
                  disabled={
                    filterModal.isFiltering ||
                    (!quickFilterVisiblePresets.includes(preset) && visibleQuickPresets.length >= 3)
                  }
                  onClick={() => onToggleVisiblePreset(preset)}
                  title={quickFilterVisiblePresets.includes(preset) ? 'ซ่อนจากหน้าข่าววันนี้' : 'แสดงบนหน้าข่าววันนี้'}
                >
                  {quickFilterVisiblePresets.includes(preset) ? 'ซ่อน' : 'โชว์'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="ai-filter-visible-hint">เลือก preset ไปโชว์บนหน้าข่าววันนี้ได้สูงสุด 3 อัน</div>

        <textarea
          className="modal-input ai-filter-input"
          autoFocus
          disabled={filterModal.isFiltering}
          placeholder="เช่น AI ที่มี engagement สูง"
          value={filterModal.prompt}
          onChange={(event) => onPromptChange(event.target.value)}
        />

        {canSavePreset && (
          <button type="button" className="ai-filter-save-preset-btn" onClick={() => onAddPreset(trimmedPrompt)}>
            <Plus size={12} /> บันทึกเป็น Preset
          </button>
        )}

        <div className="modal-actions">
          <button
            className="modal-btn modal-btn-secondary"
            disabled={filterModal.isFiltering}
            onClick={onClose}
          >
            ยกเลิก
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={onSubmit}
            disabled={filterModal.isFiltering || !trimmedPrompt}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            {filterModal.isFiltering ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>กำลังวิเคราะห์...</span>
              </>
            ) : (
              <>กรองฟีด</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiFilterModal;
