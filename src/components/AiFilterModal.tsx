import { Filter as FilterIcon, Plus, RefreshCw, X } from 'lucide-react';

const AiFilterModal = ({
  filterModal,
  quickFilterPresets,
  onClose,
  onPromptChange,
  onSelectPreset,
  onRemovePreset,
  onAddPreset,
  onSubmit,
}) => {
  if (!filterModal.show) return null;

  const trimmedPrompt = filterModal.prompt.trim();
  const canSavePreset = trimmedPrompt && !quickFilterPresets.includes(trimmedPrompt);
  const selectedPreset = quickFilterPresets.find((preset) => filterModal.prompt === preset) || '';

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
            <div className="ai-filter-modal-hint">บอก FORO ว่าอยากให้ช่วยมองประเด็นนี้แบบไหน</div>
          </div>
        </div>

        {quickFilterPresets.length > 0 && (
          <div className="ai-filter-section">
            <div className="ai-filter-section-header">
              <div>
                <div className="ai-filter-section-title">เลือกโหมดเร็ว</div>
                <div className="ai-filter-section-copy">
                  แตะหนึ่งอันเพื่อใส่ prompt ทันที
                </div>
              </div>
            </div>

            <div className="ai-filter-presets">
              {quickFilterPresets.map((preset) => {
                const isSelected = filterModal.prompt === preset;

                return (
                  <button
                    key={preset}
                    type="button"
                    className={`ai-filter-modal-preset-chip ${isSelected ? 'is-selected' : ''}`}
                    disabled={filterModal.isFiltering}
                    onClick={() => onSelectPreset(preset)}
                  >
                    <span className="ai-filter-preset-label">{preset}</span>
                    {isSelected && <span className="ai-filter-preset-selected-mark">กำลังใช้</span>}
                  </button>
                );
              })}
            </div>

            <div className="ai-filter-preset-actions">
              {selectedPreset ? (
                <button
                  type="button"
                  className="ai-filter-preset-manage-btn"
                  disabled={filterModal.isFiltering}
                  onClick={() => onRemovePreset(selectedPreset)}
                >
                  <X size={12} /> ลบ preset นี้
                </button>
              ) : (
                <div className="ai-filter-preset-helper">ยังไม่ได้เลือก preset</div>
              )}
            </div>
          </div>
        )}

        <div className="ai-filter-section ai-filter-compose-section">
          <div className="ai-filter-section-header ai-filter-section-header-tight">
            <div>
              <div className="ai-filter-section-title">Prompt</div>
              <div className="ai-filter-section-copy">จะให้สรุป ขอความเห็น จัดอันดับ หา angle หรือคิดต่อจากข่าวที่คัดมาก็ได้</div>
            </div>
          </div>

          <textarea
            className="modal-input ai-filter-input"
            autoFocus
            disabled={filterModal.isFiltering}
            placeholder="เช่น ช่วยดูว่ากระแส AI ตอนนี้ไปทางไหน หรือคัดประเด็นที่น่าทำวิดีโอ"
            value={filterModal.prompt}
            onChange={(event) => onPromptChange(event.target.value)}
          />

          <div className="ai-filter-compose-footer">
            <div className="ai-filter-visible-hint">preset ด้านบนจะแสดงบนหน้า home อัตโนมัติ 3 อันแรก</div>
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
