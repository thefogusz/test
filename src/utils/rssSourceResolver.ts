import { RSS_CATALOG } from '../config/rssCatalog';

const normalizeMemberHandle = (value = '') =>
  String(value || '').trim().replace(/^@/, '').toLowerCase();

const normalizeAliasToken = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^rss:/, '')
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getHostnameAliases = (siteUrl = '') => {
  const aliases = new Set<string>();

  try {
    const hostname = new URL(String(siteUrl || '').trim()).hostname.toLowerCase().replace(/^www\./, '');
    if (!hostname) return aliases;

    aliases.add(hostname.replace(/\./g, '-'));

    const labels = hostname.split('.').filter(Boolean);
    if (labels.length > 0) {
      aliases.add(labels[0]);
    }

    if (labels.length > 1) {
      aliases.add(labels.slice(0, -1).join('-'));
    }
  } catch {
    return aliases;
  }

  return aliases;
};

const stripCommonAliasSuffixes = (value = '') => {
  const normalized = normalizeAliasToken(value);
  if (!normalized) return [];

  const variants = new Set([normalized]);
  ['-blog', '-news', '-rss', '-feed'].forEach((suffix) => {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length) {
      variants.add(normalized.slice(0, -suffix.length));
    }
  });

  if (normalized.startsWith('the-') && normalized.length > 4) {
    variants.add(normalized.slice(4));
  }

  return Array.from(variants).filter(Boolean);
};

const allCatalogSources = Object.values(RSS_CATALOG).flat();

const buildRssAliasLookup = (sources = allCatalogSources) => {
  const byId = new Map<string, string>();
  const byAlias = new Map<string, string>();
  const ambiguousAliases = new Set<string>();

  (Array.isArray(sources) ? sources : []).forEach((source) => {
    const sourceId = normalizeAliasToken(source?.id || '');
    if (!sourceId) return;

    byId.set(sourceId, sourceId);

    const candidateAliases = new Set<string>([
      ...stripCommonAliasSuffixes(sourceId),
      ...stripCommonAliasSuffixes(source?.name || ''),
    ]);

    getHostnameAliases(source?.siteUrl || '').forEach((alias) => {
      stripCommonAliasSuffixes(alias).forEach((value) => candidateAliases.add(value));
    });

    candidateAliases.forEach((alias) => {
      if (!alias) return;
      const existing = byAlias.get(alias);
      if (!existing) {
        if (!ambiguousAliases.has(alias)) {
          byAlias.set(alias, sourceId);
        }
        return;
      }

      if (existing !== sourceId) {
        byAlias.delete(alias);
        ambiguousAliases.add(alias);
      }
    });
  });

  return { byId, byAlias };
};

const { byId: rssSourceIdLookup, byAlias: rssSourceAliasLookup } = buildRssAliasLookup();

export const resolveRssSourceId = (value = '') => {
  const normalized = normalizeAliasToken(value);
  if (!normalized) return '';

  return rssSourceIdLookup.get(normalized) || rssSourceAliasLookup.get(normalized) || '';
};

export const canonicalizePostListMember = (value = '') => {
  const normalized = normalizeMemberHandle(value);
  if (!normalized) return '';

  if (!normalized.startsWith('rss:')) {
    return normalized;
  }

  const resolvedSourceId = resolveRssSourceId(normalized.slice(4));
  return resolvedSourceId ? `rss:${resolvedSourceId}` : normalized;
};

export const resolvePostListMembers = (members) => {
  const nextMembers = [];
  const invalidMembers = [];
  const migratedMembers = [];

  (Array.isArray(members) ? members : [])
    .map((member) => normalizeMemberHandle(member))
    .filter(Boolean)
    .forEach((member) => {
      if (!member.startsWith('rss:')) {
        nextMembers.push(member);
        return;
      }

      const normalizedSourceId = normalizeAliasToken(member.slice(4));
      const resolvedSourceId = resolveRssSourceId(normalizedSourceId);

      if (!resolvedSourceId) {
        invalidMembers.push(member);
        return;
      }

      const canonicalMember = `rss:${resolvedSourceId}`;
      if (canonicalMember !== member) {
        migratedMembers.push({
          from: member,
          to: canonicalMember,
        });
      }
      nextMembers.push(canonicalMember);
    });

  return {
    members: Array.from(new Set(nextMembers)),
    invalidMembers: Array.from(new Set(invalidMembers)),
    migratedMembers: Array.from(
      new Map(
        migratedMembers.map((entry) => [`${entry.from}->${entry.to}`, entry]),
      ).values(),
    ),
  };
};

export {
  normalizeMemberHandle,
  normalizeAliasToken as normalizeRssSourceToken,
};
