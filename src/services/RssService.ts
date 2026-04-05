// @ts-nocheck
import type { Post } from '../types/domain';
import { apiFetch } from '../utils/apiFetch';

const RSS_PROXY_URL = '/api/rss';
const RSS_LATEST_LOOKBACK_HOURS = 48;
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
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch?.[1] || null;
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

const extractMediaThumbnail = (item: Element): string | null => {
  // media:thumbnail or media:content
  const mediaThumbnail = item.getElementsByTagName('media:thumbnail')[0];
  if (mediaThumbnail) return mediaThumbnail.getAttribute('url');

  const mediaContent = item.getElementsByTagName('media:content')[0];
  if (mediaContent) {
    const type = mediaContent.getAttribute('medium') || mediaContent.getAttribute('type') || '';
    if (type === 'image' || type.startsWith('image/')) {
      return mediaContent.getAttribute('url');
    }
  }
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
      const contentEncoded = item.getElementsByTagName('content:encoded')[0]?.textContent || '';
      const dcCreator = item.getElementsByTagName('dc:creator')[0]?.textContent || '';
      const author = item.querySelector('author')?.textContent || dcCreator || '';

      const imageUrl =
        extractMediaThumbnail(item) ||
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

      const contentEl = entry.querySelector('content')?.textContent || '';
      const imageUrl =
        extractMediaThumbnail(entry) ||
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

export const fetchRssFeed = async (source: RssSourceInfo, maxItems = 10): Promise<Post[]> => {
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
    const itemsWithTimestamps = items
      .map((item) => ({
        item,
        timestamp: parseItemTimestamp(item.pubDate),
      }))
      .sort((left, right) => {
        const leftTimestamp = Number.isFinite(left.timestamp) ? left.timestamp : -Infinity;
        const rightTimestamp = Number.isFinite(right.timestamp) ? right.timestamp : -Infinity;
        return rightTimestamp - leftTimestamp;
      });

    const validTimestamps = itemsWithTimestamps
      .map((entry) => entry.timestamp)
      .filter((timestamp) => Number.isFinite(timestamp));

    if (validTimestamps.length === 0) {
      return itemsWithTimestamps
        .slice(0, maxItems)
        .map(({ item }) => rssItemToPost(item, source));
    }

    const latestTimestamp = Math.max(...validTimestamps);
    const cutoffTimestamp = latestTimestamp - RSS_LATEST_LOOKBACK_MS;

    return itemsWithTimestamps
      .filter(({ timestamp }) => {
        return Number.isFinite(timestamp) && timestamp >= cutoffTimestamp && timestamp <= latestTimestamp;
      })
      .map(({ item }) => rssItemToPost(item, source))
      .slice(0, maxItems);
  } catch (error) {
    console.warn(`[RSS] Error fetching ${source.name}:`, error);
    return [];
  }
};

export const fetchAllSubscribedFeeds = async (
  sources: RssSourceInfo[],
  maxPerSource = 5,
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
