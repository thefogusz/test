import { safeParse, sanitizeStoredCollection, sanitizeStoredSingle } from './appUtils';

export const deserializeWatchlist = (saved) => {
  const parsed = safeParse(saved, []);
  return Array.isArray(parsed) ? parsed.filter((user) => user && user.username) : [];
};

export const deserializeStoredCollection = (saved) =>
  sanitizeStoredCollection(safeParse(saved, []));

export const deserializeAttachedSource = (saved) =>
  sanitizeStoredSingle(safeParse(saved, null));

export const deserializePostLists = (saved) => safeParse(saved, []);
