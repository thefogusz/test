import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, LoaderCircle } from 'lucide-react';

const StatusToast = ({ status, message, hidden }) => {
  const [isVisible, setIsVisible] = useState(() => Boolean(status) && !hidden);
  const displayMessage = message || status;
  const isProcessing = /(กำลัง|loading|processing|searching|preparing|analyzing|analysing|filtering|syncing)/i.test(String(displayMessage || ''));

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
    <div className={`status-toast ${isVisible ? 'visible' : ''} ${isProcessing ? 'is-processing' : 'is-complete'}`} role="status" aria-live="polite">
      <div className={`status-toast__icon ${isProcessing ? 'is-processing' : 'is-complete'}`} aria-hidden="true">
        {isProcessing ? (
          <LoaderCircle size={16} strokeWidth={2.2} />
        ) : (
          <CheckCircle2 size={16} strokeWidth={2.3} />
        )}
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
