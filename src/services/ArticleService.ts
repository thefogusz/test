import { apiFetch } from '../utils/apiFetch';

export type ReadableArticle = {
  ok: boolean;
  url: string;
  title: string;
  byline?: string;
  excerpt?: string;
  siteName?: string;
  publishedAt?: string;
  lang?: string;
  leadImageUrl?: string;
  contentHtml: string;
  contentMarkdown: string;
  textContent: string;
  wordCount: number;
  readingTimeMinutes: number;
};

export const fetchReadableArticle = async (
  url: string,
  signal?: AbortSignal,
): Promise<ReadableArticle> => {
  const response = await apiFetch(`/api/article?url=${encodeURIComponent(url)}`, {
    method: 'GET',
    signal,
    timeout: 45000,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || `Failed to read article (${response.status})`);
  }

  return payload as ReadableArticle;
};
