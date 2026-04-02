const LIST_MODAL_COPY = {
  create: {
    title: 'สร้าง Post List ใหม่',
    subtitle: 'ตั้งชื่อให้ลิสต์ของคุณเพื่อเริ่มจัดกลุ่มแหล่งข้อมูล และรับการสรุปข่าวจากกลุ่มเป้าหมายที่เลือกไว้โดยเฉพาะ',
    placeholder: 'เช่น DeFi Experts, Crypto News...',
  },
  edit: {
    title: 'แก้ไข Post List',
    subtitle: 'ปรับปรุงชื่อหรือการตั้งค่าสำหรับลิสต์นี้',
    placeholder: 'เช่น DeFi Experts, Crypto News...',
  },
  import: {
    title: 'นำเข้า Post List',
    subtitle: 'วางรหัสแชร์เพื่อนำเข้า Post List พร้อมรายชื่อสมาชิกทั้งหมด',
    placeholder: 'https://...',
  },
};

const ListModal = ({ listModal, onChange, onClose, onConfirm }) => {
  if (!listModal.show) return null;

  const copy = LIST_MODAL_COPY[listModal.mode] || LIST_MODAL_COPY.create;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-title">{copy.title}</div>
        <div className="modal-subtitle">{copy.subtitle}</div>
        <input
          className="modal-input"
          autoFocus
          placeholder={copy.placeholder}
          value={listModal.value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onConfirm()}
        />
        <div className="modal-actions">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="modal-btn modal-btn-primary" onClick={onConfirm}>
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListModal;
