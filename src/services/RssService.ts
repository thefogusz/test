// @ts-nocheck
import type { Post } from '../types/domain';
import { apiFetch } from '../utils/apiFetch';

const RSS_PROXY_URL = '/api/rss';
const RSS_LATEST_LOOKBACK_HOURS = 24;
const RSS_LATEST_LOOKBACK_MS = RSS_LATEST_LOOKBACK_HOURS * 60 * 60 * 1000;

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
  author?: string;
}

const parseItemTimestamp = (value: string) => {
  const timestamp = new Date(String(value || '').trim()).getTime();
  return Number.isFinite(timestamp) ? timestamp : NaN;
};

const buildStableRssId = (value: string) => {
  let hash = 0;
  const input = String(value || '');

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
};

const extractImageFromContent = (content: string): string | null => {
  if (!content) return null;
  // Look for any <img> tag and grab the src. Be flexible with attributes and quotes.
  // We prefer larger images (ignoring small icons/trackers if possible)
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const url = match[1];
    // Skip common tracking pixels or tiny icons
    if (url.includes('pixel') || url.includes('tracker') || url.includes('feedburner')) continue;
    return url;
  }
  return null;
};

const extractImageFromEnclosure = (item: Element): string | null => {
  const enclosure = item.querySelector('enclosure');
  if (enclosure) {
    const type = enclosure.getAttribute('type') || '';
    if (type.startsWith('image/')) {
      return enclosure.getAttribute('url');
    }
  }
  return null;
};

const extractMediaThumbnail = (item: Element, rawXml = ''): string | null => {
  const itemXml = rawXml || new XMLSerializer().serializeToString(item);

  // 1. Try media:content (very common for TechCrunch, etc.)
  // Look for url="..." regardless of position of other attributes
  const mediaContentRegex = /<media:content[^>]+url=["']([^"']+)["']/i;
  const mediaContentMatch = itemXml.match(mediaContentRegex);
  if (mediaContentMatch?.[1]) return mediaContentMatch[1];

  // 2. Try media:thumbnail
  const mediaThumbRegex = /<media:thumbnail[^>]+url=["']([^"']+)["']/i;
  const mediaThumbMatch = itemXml.match(mediaThumbRegex);
  if (mediaThumbMatch?.[1]) return mediaThumbMatch[1];

  // 3. Try Atom-style links (rel="enclosure" or rel="image")
  const atomLinkRegex = /<link[^>]+rel=["'](?:enclosure|image)["'][^>]+href=["']([^"']+)["']/i;
  const atomLinkMatch = itemXml.match(atomLinkRegex);
  if (atomLinkMatch?.[1]) return atomLinkMatch[1];

  return null;
};

const stripHtml = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
};

const parseRssXml = (xml: string): RssItem[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // Handle RSS 2.0
  const rssItems = doc.querySelectorAll('item');
  if (rssItems.length > 0) {
    return Array.from(rssItems).map((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      // namespace-prefixed tags: serialize item to string so regex can reach them
      const itemRaw = new XMLSerializer().serializeToString(item);
      const contentEncoded = itemRaw.match(/<content:encoded[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/i)?.[1]
        || itemRaw.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1]
        || '';
      const dcCreator = itemRaw.match(/<dc:creator[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/i)?.[1]
        || itemRaw.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1]
        || '';
      const author = item.querySelector('author')?.textContent || dcCreator || '';

      const imageUrl =
        extractMediaThumbnail(item, itemRaw) ||
        extractImageFromEnclosure(item) ||
        extractImageFromContent(contentEncoded) ||
        extractImageFromContent(description) ||
        null;

      return { title, link, description: stripHtml(description), pubDate, imageUrl, author };
    });
  }

  // Handle Atom feeds
  const atomEntries = doc.querySelectorAll('entry');
  if (atomEntries.length > 0) {
    return Array.from(atomEntries).map((entry) => {
      const title = entry.querySelector('title')?.textContent || '';
      const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
      const link = linkEl?.getAttribute('href') || '';
      const summary = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
      const published = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';
      const authorName = entry.querySelector('author name')?.textContent || '';
      const entryRaw = new XMLSerializer().serializeToString(entry);
      const contentEl = entry.querySelector('content')?.textContent || '';
      const imageUrl =
        extractMediaThumbnail(entry, entryRaw) ||
        extractImageFromContent(contentEl) ||
        extractImageFromContent(summary) ||
        null;

      return { title, link, description: stripHtml(summary), pubDate: published, imageUrl, author: authorName };
    });
  }

  return [];
};

export interface RssSourceInfo {
  id: string;
  name: string;
  url: string;
  siteUrl: string;
  lang: 'en' | 'th';
  topic: string;
}

const rssItemToPost = (item: RssItem, source: RssSourceInfo): Post => {
  const itemTimestamp = parseItemTimestamp(item.pubDate);
  const createdAt = Number.isFinite(itemTimestamp)
    ? new Date(itemTimestamp).toISOString()
    : new Date().toISOString();
  const postId = `rss-${source.id}-${buildStableRssId(`${item.link || item.title}|${createdAt}`)}`;
  const normalizedDescription = String(item.description || '').trim();
  const normalizedTitle = String(item.title || '').trim();
  const fullText = [normalizedTitle, normalizedDescription]
    .filter(Boolean)
    .join('\n\n')
    .trim();
  const imageUrls = item.imageUrl ? [item.imageUrl] : [];

  return {
    id: postId,
    sourceType: 'rss',
    lang: source.lang,
    text: normalizedDescription || normalizedTitle,
    full_text: fullText || normalizedTitle,
    title: item.title,
    url: item.link,
    created_at: createdAt,
    primaryImageUrl: item.imageUrl || undefined,
    imageUrls,
    author: {
      id: `rss-${source.id}`,
      username: `rss:${source.id}`,
      name: source.name,
      profile_image_url: `https://www.google.com/s2/favicons?domain=${new URL(source.siteUrl).hostname}&sz=128`,
    },
    like_count: 0,
    view_count: 0,
    retweet_count: 0,
    reply_count: 0,
  };
};

export const fetchRssFeed = async (source: RssSourceInfo, maxItems = 999): Promise<Post[]> => {
  try {
    const response = await apiFetch(`${RSS_PROXY_URL}?url=${encodeURIComponent(source.url)}`, {
      timeout: 15000,
    });

    if (!response.ok) {
      console.warn(`[RSS] Failed to fetch ${source.name}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items = parseRssXml(xml);
    const now = Date.now();
    const cutoffTimestamp = now - RSS_LATEST_LOOKBACK_MS;

    const filteredItems = items
      .map((item) => ({
        item,
        timestamp: parseItemTimestamp(item.pubDate),
      }))
      .filter(({ timestamp }) => {
        // Only keep items from the last 24 hours relative to NOW
        return Number.isFinite(timestamp) && timestamp >= cutoffTimestamp && timestamp <= now;
      })
      .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0));

    return filteredItems
      .slice(0, maxItems)
      .map(({ item }) => rssItemToPost(item, source));
  } catch (error) {
    console.warn(`[RSS] Error fetching ${source.name}:`, error);
    return [];
  }
};

export const fetchAllSubscribedFeeds = async (
  sources: RssSourceInfo[],
  maxPerSource = 999,
): Promise<Post[]> => {
  if (!sources.length) return [];

  const results = await Promise.allSettled(
    sources.map((source) => fetchRssFeed(source, maxPerSource)),
  );

  const allPosts: Post[] = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allPosts.push(...result.value);
    }
  });

  // Sort by date descending
  allPosts.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

  return allPosts;
};
