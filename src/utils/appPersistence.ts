import { RSS_CATALOG } from '../config/rssCatalog';
import { safeParse, sanitizeStoredCollection, sanitizeStoredSingle } from './appUtils';
import {
  normalizeMemberHandle,
  resolvePostListMembers,
  resolveRssSourceId,
} from './rssSourceResolver';

const supportedRssSourceIds = new Set(
  Object.values(RSS_CATALOG)
    .flat()
    .map((source) => String(source?.id || '').trim().toLowerCase())
    .filter(Boolean),
);

const normalizePostListMember = (value = '') => normalizeMemberHandle(value);

export const getInvalidPostListMembers = (members) =>
  resolvePostListMembers(members).invalidMembers;

export const getMigratedPostListMembers = (members) =>
  resolvePostListMembers(members).migratedMembers;

export const sanitizePostListMembers = (members) =>
  resolvePostListMembers(members).members;

export const sanitizePostLists = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((list) => list && typeof list === 'object')
    .map((list) => ({
      ...list,
      members: sanitizePostListMembers(list?.members),
    }));
};

export const deserializeWatchlist = (saved) => {
  const parsed = safeParse(saved, []);
  return Array.isArray(parsed) ? parsed.filter((user) => user && user.username) : [];
};

export const deserializeStoredCollection = (saved) =>
  sanitizeStoredCollection(safeParse(saved, []));

export const deserializeAttachedSource = (saved) =>
  sanitizeStoredSingle(safeParse(saved, null));

export const deserializePostLists = (saved) => sanitizePostLists(safeParse(saved, []));

export { normalizePostListMember, resolveRssSourceId, supportedRssSourceIds };
