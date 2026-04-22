import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

const PROCESSING_PATTERN =
  /(กำลัง|เชื่อมต่อ|โหลด|ค้นหา|วิเคราะห์|คัด|อัปเดต|สรุป|loading|processing|searching|preparing|analyzing|analysing|filtering|syncing)/i;

const WARNING_PATTERN =
  /(warning|invalid|not found|à¹„à¸¡à¹ˆà¸žà¸š|à¹„à¸¡à¹ˆà¸£à¸­à¸‡à¸£à¸±à¸š|rss issue|rss source)/i;

const StatusToast = ({ status, message, hidden }) => {
  const [isVisible, setIsVisible] = useState(() => Boolean(status) && !hidden);
  const displayMessage = message || status;
  const isProcessing = PROCESSING_PATTERN.test(String(displayMessage || ''));
  const isWarning = !isProcessing && WARNING_PATTERN.test(String(displayMessage || ''));

  useEffect(() => {
    if (!status || hidden) {
      const hideTimer = setTimeout(() => setIsVisible(false), 0);
      return () => clearTimeout(hideTimer);
    }

    const showTimer = setTimeout(() => setIsVisible(true), 0);
    const hideTimer = setTimeout(() => setIsVisible(false), 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [status, hidden]);

  if (!status || hidden || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`status-toast ${isVisible ? 'visible' : ''} ${isProcessing ? 'is-processing' : isWarning ? 'is-warning' : 'is-complete'}`}
      role="status"
      aria-live="polite"
      aria-busy={isProcessing}
    >
      <div className="status-toast__ambient" aria-hidden="true" />
      <div className={`status-toast__media ${isProcessing ? 'is-processing' : isWarning ? 'is-warning' : 'is-complete'}`} aria-hidden="true">
        <span className="status-toast__icon-glow" />
        <div className={`status-toast__icon ${isProcessing ? 'is-processing' : isWarning ? 'is-warning' : 'is-complete'}`}>
          <span className="status-toast__icon-core">
            {isProcessing ? (
              <RefreshCw size={16} strokeWidth={2.35} />
            ) : isWarning ? (
              <AlertTriangle size={16} strokeWidth={2.3} />
            ) : (
              <CheckCircle2 size={16} strokeWidth={2.3} />
            )}
          </span>
        </div>
      </div>
      <div className="status-toast__content">
        <div className="status-toast__label">FORO</div>
        <div className="status-toast__message">{displayMessage}</div>
      </div>
      {isProcessing && <div className="status-toast__rail" aria-hidden="true" />}
    </div>,
    document.body,
  );
};

export default StatusToast;
