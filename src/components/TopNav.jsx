import React from 'react';
import { Search } from 'lucide-react';

const TopNav = ({ activeView, searchQuery, setSearchQuery, handleSearch }) => {
  return null; // Search has been moved to a Hero component in the main view

  return (
    <div className="top-nav">
      <form onSubmit={(e) => handleSearch(e)} className="top-nav-search" style={{ maxWidth: '560px', margin: '0 auto', flex: 1 }}>
        <div className="search-bar-inner">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="ค้นหาคอนเทนต์ที่คุณสนใจ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <svg role="img" height="16" width="16" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.47 2.47a.75.75 0 0 1 1.06 0L8 6.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L9.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06L8 9.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L6.94 8 2.47 3.53a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TopNav;
