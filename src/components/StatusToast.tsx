const StatusToast = ({ status, message, hidden }) => {
  if (!status || hidden) return null;

  return (
    <div
      className="status-toast"
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#fff',
        color: '#000',
        padding: '12px 24px',
        borderRadius: '100px',
        fontSize: '12px',
        fontWeight: '900',
        letterSpacing: '0.02em',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        zIndex: 9999,
        maxWidth: 'min(720px, calc(100vw - 24px))',
        lineHeight: '1.4',
        textAlign: 'center',
      }}
    >
      {message || status}
    </div>
  );
};

export default StatusToast;
