import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import type { WorkspaceRouterProps } from '../app/workspaceRouterProps';
import HomeWorkspace from '../features/home/HomeWorkspace';

const AudienceWorkspace = lazy(() => import('./AudienceWorkspace'));
const BookmarksWorkspace = lazy(() => import('./BookmarksWorkspace'));
const ContentWorkspace = lazy(() => import('./ContentWorkspace'));
const PricingView = lazy(() => import('./PricingWorkspace'));
const ReadWorkspace = lazy(() => import('./ReadWorkspace'));

type AppWorkspaceRouterProps = {
  activeView: string;
} & WorkspaceRouterProps;

const AppWorkspaceRouter = ({
  activeView,
  audience,
  bookmarks,
  content,
  home,
  pricing,
  profileNavigation,
  read,
}: AppWorkspaceRouterProps) => {
  const workspaceLoadingFallback = (
    <div
      className="animate-fade-in"
      style={{ padding: '56px 0', display: 'flex', justifyContent: 'center' }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--text-dim)',
          fontSize: '13px',
          fontWeight: '700',
        }}
      >
        <Loader2 size={16} className="animate-spin" />
        <span>Loading workspace...</span>
      </div>
    </div>
  );

  const showMobileProfileSwitcher = activeView === 'pricing' || activeView === 'audience';

  return (
    <>
      {activeView === 'home' && <HomeWorkspace isVisible {...home} />}

      {activeView === 'content' && (
        <Suspense fallback={workspaceLoadingFallback}>
          <ContentWorkspace isVisible {...content} />
        </Suspense>
      )}

      {showMobileProfileSwitcher && (
        <div
          className="mobile-context-switcher mobile-context-switcher-profile mobile-only-flex"
          aria-label="Profile sections"
        >
          <div className="mobile-context-nav-group">
            <button
              type="button"
              className={`mobile-context-btn ${activeView === 'pricing' ? 'active' : ''}`.trim()}
              onClick={profileNavigation.onOpenMobileProfileDetails}
              aria-pressed={activeView === 'pricing'}
            >
              <span>โปรไฟล์</span>
            </button>
            <button
              type="button"
              className={`mobile-context-btn ${activeView === 'audience' ? 'active' : ''}`.trim()}
              onClick={profileNavigation.onOpenMobileAudience}
              aria-pressed={activeView === 'audience'}
            >
              <span>การติดตาม</span>
            </button>
          </div>
        </div>
      )}

      {activeView === 'pricing' && (
        <Suspense fallback={workspaceLoadingFallback}>
          <PricingView isVisible {...pricing} />
        </Suspense>
      )}

      {activeView === 'read' && (
        <Suspense fallback={workspaceLoadingFallback}>
          <ReadWorkspace isVisible {...read} />
        </Suspense>
      )}

      {activeView === 'audience' && (
        <Suspense fallback={workspaceLoadingFallback}>
          <AudienceWorkspace isVisible {...audience} />
        </Suspense>
      )}

      {activeView === 'bookmarks' && (
        <Suspense fallback={workspaceLoadingFallback}>
          <BookmarksWorkspace isVisible {...bookmarks} />
        </Suspense>
      )}
    </>
  );
};

export default AppWorkspaceRouter;
