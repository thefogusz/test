import React from 'react';

type ContentErrorBoundaryProps = {
  children: React.ReactNode;
};

type ContentErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ContentErrorBoundary extends React.Component<ContentErrorBoundaryProps, ContentErrorBoundaryState> {
  constructor(props: ContentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ContentErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ContentErrorBoundary] Caught crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>มีบางอย่างผิดพลาดระหวางแสดงผล</h3>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>เนื้อหาอาจถูกสร้างเรียบร้อยแล้ว เพียงแต่ Markdown Renderer ขัดข้อง</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            style={{ padding: '10px 24px', borderRadius: '999px', background: '#2997ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
          >
            ลองอีกครั้ง
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ContentErrorBoundary;
