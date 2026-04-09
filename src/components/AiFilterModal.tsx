import { Eye, EyeOff, Filter as FilterIcon, Plus, RefreshCw, Sparkles, X } from 'lucide-react';

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
            <FilterIcon size={17} />
          </div>
          <div className="ai-filter-modal-heading">
            <div className="ai-filter-modal-eyebrow">Analysis Mode</div>
            <div className="modal-title">FORO Filter</div>
            <div className="ai-filter-modal-hint">บอก FORO ว่าอยากเห็นสัญญาณแบบไหนในฟีดนี้</div>
          </div>
        </div>

        {quickFilterPresets.length > 0 && (
          <div className="ai-filter-section">
            <div className="ai-filter-section-header">
              <div>
                <div className="ai-filter-section-title">Modes</div>
                <div className="ai-filter-section-copy">
                  แตะเพื่อใส่ prompt ทันที แล้วเลือกอันที่อยากโชว์บนหน้า Today
                </div>
              </div>
              <div className="ai-filter-visibility-counter">
                <Sparkles size={12} />
                <span>{visibleQuickPresets.length}/3 visible</span>
              </div>
            </div>

            <div className="ai-filter-presets">
              {quickFilterPresets.map((preset) => {
                const isSelected = filterModal.prompt === preset;
                const isVisible = quickFilterVisiblePresets.includes(preset);

                return (
                  <div key={preset} className={`ai-filter-modal-preset-chip ${isSelected ? 'is-selected' : ''}`}>
                    <button
                      type="button"
                      className={`ai-filter-preset-btn ${isSelected ? 'active' : ''}`}
                      disabled={filterModal.isFiltering}
                      onClick={() => onSelectPreset(preset)}
                    >
                      {preset}
                    </button>

                    <div className="ai-filter-preset-tools">
                      <button
                        type="button"
                        className={`ai-filter-preset-visibility-btn ${isVisible ? 'active' : ''}`}
                        disabled={
                          filterModal.isFiltering ||
                          (!isVisible && visibleQuickPresets.length >= 3)
                        }
                        onClick={() => onToggleVisiblePreset(preset)}
                        title={isVisible ? 'ซ่อนจากหน้าข่าววันนี้' : 'แสดงบนหน้าข่าววันนี้'}
                      >
                        {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="ai-filter-section ai-filter-compose-section">
          <div className="ai-filter-section-header ai-filter-section-header-tight">
            <div>
              <div className="ai-filter-section-title">Prompt</div>
              <div className="ai-filter-section-copy">เขียนสิ่งที่อยากให้ FORO หาให้ชัดเจนที่สุด</div>
            </div>
          </div>

          <textarea
            className="modal-input ai-filter-input"
            autoFocus
            disabled={filterModal.isFiltering}
            placeholder="เช่น AI ที่มี engagement สูง"
            value={filterModal.prompt}
            onChange={(event) => onPromptChange(event.target.value)}
          />

          <div className="ai-filter-compose-footer">
            <div className="ai-filter-visible-hint">เลือก preset ไปโชว์บนหน้าข่าววันนี้ได้สูงสุด 3 อัน</div>
            {canSavePreset && (
              <button type="button" className="ai-filter-save-preset-btn" onClick={() => onAddPreset(trimmedPrompt)}>
                <Plus size={12} /> บันทึกเป็น Preset
              </button>
            )}
          </div>
        </div>

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
