import React, { useEffect, useState } from 'react';

const StatusToast = ({ status, message, hidden }) => {
  const [isVisible, setIsVisible] = useState(() => Boolean(status) && !hidden);

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

  if (!status || hidden) return null;

  return (
    <div
      className={`status-toast ${isVisible ? 'visible' : ''}`}
      style={{
        transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        background: 'rgba(23, 23, 23, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        zIndex: 100000,
        minHeight: '44px',
      }}
    >
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#60A5FA',
        boxShadow: '0 0 10px #60A5FA'
      }} />
      {message || status}
    </div>
  );
};

export default StatusToast;
