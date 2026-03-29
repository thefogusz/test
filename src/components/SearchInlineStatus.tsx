type SearchInlineStatusProps = {
  badge: string;
  message: string;
  hint: string;
  loading?: boolean;
};

const SearchInlineStatus = ({
  badge,
  message,
  hint,
  loading = false,
}: SearchInlineStatusProps) => {
  return (
    <div className={`search-inline-status ${loading ? 'is-loading' : 'is-background'}`}>
      <div className="search-inline-status-badge">{badge}</div>
      <div className="search-inline-status-copy">{message}</div>
      <div className="search-inline-status-hint">{hint}</div>
    </div>
  );
};

export default SearchInlineStatus;
