export const buildAlreadyInWatchlistMessage = (username = '') =>
  `@${String(username || '').trim().replace(/^@/, '')} อยู่ใน Watchlist แล้ว`;
