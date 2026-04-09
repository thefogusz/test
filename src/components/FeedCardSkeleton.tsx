const DEFAULT_SKELETON_COUNT = 3;

const FeedCardSkeleton = ({
  count = DEFAULT_SKELETON_COUNT,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <article
        key={`feed-skeleton-${index}`}
        className={`feed-card feed-card-skeleton animate-fade-in${compact ? ' is-compact' : ''}`}
        aria-hidden="true"
      >
        <div className="feed-card-skeleton-grid">
          <div className="feed-card-skeleton-row">
            <div className="feed-card-skeleton-avatar feed-card-skeleton-shimmer" />
            <div className="feed-card-skeleton-author">
              <div className="feed-card-skeleton-line feed-card-skeleton-shimmer feed-card-skeleton-line-author" />
              <div className="feed-card-skeleton-line feed-card-skeleton-shimmer feed-card-skeleton-line-handle" />
            </div>
            <div className="feed-card-skeleton-meta">
              <div className="feed-card-skeleton-pill feed-card-skeleton-shimmer" />
              <div className="feed-card-skeleton-pill feed-card-skeleton-shimmer" />
            </div>
          </div>

          <div className="feed-card-skeleton-body">
            <div className="feed-card-skeleton-media feed-card-skeleton-shimmer" />
            <div className="feed-card-skeleton-copy">
              <div className="feed-card-skeleton-line feed-card-skeleton-shimmer feed-card-skeleton-line-title" />
              <div className="feed-card-skeleton-line feed-card-skeleton-shimmer" />
              <div className="feed-card-skeleton-line feed-card-skeleton-shimmer feed-card-skeleton-line-medium" />
              <div className="feed-card-skeleton-line feed-card-skeleton-shimmer feed-card-skeleton-line-short" />
            </div>
          </div>

          <div className="feed-card-skeleton-footer">
            <div className="feed-card-skeleton-stats">
              <div className="feed-card-skeleton-stat feed-card-skeleton-shimmer" />
              <div className="feed-card-skeleton-stat feed-card-skeleton-shimmer" />
              <div className="feed-card-skeleton-stat feed-card-skeleton-shimmer" />
            </div>
            <div className="feed-card-skeleton-action feed-card-skeleton-shimmer" />
          </div>
        </div>
      </article>
    ))}
  </>
);

export default FeedCardSkeleton;
