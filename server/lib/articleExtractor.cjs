const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');

const ARTICLE_WORDS_PER_MINUTE = 220;
const TRAILING_BOILERPLATE_PATTERNS = [
  /^this (story|article|report) was originally (featured|published|posted) on\b/i,
  /^read the original (story|article|report) on\b/i,
  /^originally published on\b/i,
  /สมัครรับดีลสินค้า/i,
  /ติดตามหัวข้อและผู้เขียน/i,
];
const TRAILING_CTA_PATTERNS = [
  /^visit website\b/i,
  /^read more\b/i,
  /^continue reading\b/i,
  /^read the full (story|article|report)\b/i,
  /^open original\b/i,
  /^view original\b/i,
  /^visit (the )?(source|site)\b/i,
  /^email \(required\)/i,
  /verge shopping/i,
];

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

const getMetaContent = (document, selectors = []) => {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const value = node?.getAttribute('content') || node?.textContent || '';
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }

  return '';
};

const absolutizeArticleLinks = (document, baseUrl) => {
  if (!document) return;

  document.querySelectorAll('a[href]').forEach((anchor) => {
    try {
      anchor.setAttribute('href', new URL(anchor.getAttribute('href'), baseUrl).toString());
    } catch {
      anchor.removeAttribute('href');
    }
  });

  document.querySelectorAll('img[src]').forEach((image) => {
    try {
      image.setAttribute('src', new URL(image.getAttribute('src'), baseUrl).toString());
    } catch {
      image.remove();
    }
  });
};

const collapseWhitespace = (value = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const matchesAnyPattern = (value, patterns) =>
  patterns.some((pattern) => pattern.test(value));

const isShortActionElement = (element, text) => {
  if (!text || text.length > 80) return false;

  const linkOrButton =
    element.matches('a, button') ||
    (element.children.length === 1 && element.firstElementChild?.matches('a, button'));

  return linkOrButton && matchesAnyPattern(text, TRAILING_CTA_PATTERNS);
};

const isTrailingBoilerplateElement = (element) => {
  const text = collapseWhitespace(element.textContent || '');
  if (!text) return true;

  if (matchesAnyPattern(text, TRAILING_BOILERPLATE_PATTERNS)) {
    return true;
  }

  if (isShortActionElement(element, text)) {
    return true;
  }

  if (text.length <= 40 && matchesAnyPattern(text, TRAILING_CTA_PATTERNS)) {
    return true;
  }

  return false;
};

const pruneTrailingBoilerplate = (container) => {
  let current = container?.lastElementChild || null;

  while (current) {
    if (current.children.length > 0) {
      pruneTrailingBoilerplate(current);

      if (!collapseWhitespace(current.textContent || '')) {
        const previous = current.previousElementSibling;
        current.remove();
        current = previous;
        continue;
      }
    }

    if (!isTrailingBoilerplateElement(current)) {
      break;
    }

    const previous = current.previousElementSibling;
    current.remove();
    current = previous;
  }
};

const stripTrailingBoilerplate = (document) => {
  const container = document.querySelector('article') || document.body;
  if (!container) return;

  pruneTrailingBoilerplate(container);
};

const extractFallbackHtml = (document) => {
  const articleLikeNode =
    document.querySelector('article') ||
    document.querySelector('main article') ||
    document.querySelector('main') ||
    document.querySelector('[role="main"]');

  if (!articleLikeNode) return '';

  return articleLikeNode.innerHTML || '';
};

const normalizePublishedAt = (document) =>
  getMetaContent(document, [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[property="og:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publish-date"]',
    'meta[name="parsely-pub-date"]',
    'time[datetime]',
  ]);

const extractArticleFromHtml = ({ html, url }) => {
  const dom = new JSDOM(html, { url });
  const { document } = dom.window;
  const readable = new Readability(document).parse();
  const articleHeading = collapseWhitespace(
    document.querySelector('article h1, main h1, h1')?.textContent || '',
  );
  const documentTitle = collapseWhitespace(document.title || '');
  const readableTitle = collapseWhitespace(readable?.title || '');

  const fallbackHtml = extractFallbackHtml(document);
  const rawContentHtml = readable?.content || fallbackHtml;

  if (!rawContentHtml) {
    const error = new Error('Unable to extract article body');
    error.statusCode = 422;
    throw error;
  }

  const articleDom = new JSDOM(`<article>${rawContentHtml}</article>`, { url });
  const articleDocument = articleDom.window.document;
  absolutizeArticleLinks(articleDocument, url);
  stripTrailingBoilerplate(articleDocument);

  const contentHtml = articleDocument.body.innerHTML.trim();
  const textContent = collapseWhitespace(articleDocument.body.textContent || '');
  const wordCount = textContent ? textContent.split(/\s+/).filter(Boolean).length : 0;

  return {
    title:
      (readableTitle && readableTitle !== documentTitle ? readableTitle : '') ||
      articleHeading ||
      readableTitle ||
      getMetaContent(document, ['meta[property="og:title"]']) ||
      documentTitle ||
      '',
    byline: readable?.byline || getMetaContent(document, ['meta[name="author"]', 'meta[property="article:author"]']) || '',
    excerpt:
      readable?.excerpt ||
      getMetaContent(document, ['meta[property="og:description"]', 'meta[name="description"]']) ||
      '',
    siteName:
      readable?.siteName ||
      getMetaContent(document, ['meta[property="og:site_name"]']) ||
      new URL(url).hostname.replace(/^www\./, ''),
    publishedAt: normalizePublishedAt(document),
    lang: collapseWhitespace(document.documentElement?.lang || ''),
    leadImageUrl:
      getMetaContent(document, ['meta[property="og:image"]', 'meta[name="twitter:image"]']) || '',
    contentHtml,
    textContent,
    contentMarkdown: turndown.turndown(contentHtml),
    wordCount,
    readingTimeMinutes: Math.max(1, Math.round(wordCount / ARTICLE_WORDS_PER_MINUTE)),
  };
};

module.exports = {
  extractArticleFromHtml,
};
