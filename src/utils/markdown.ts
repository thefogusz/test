import DOMPurify from 'dompurify';
import { marked } from 'marked';

export const cleanMarkdownForClipboard = (markdown = '') => {
  const source = typeof markdown === 'string' ? markdown : '';

  return source
    .replace(/\[CONFIDENCE_SCORE:\s*[^\]]+\]/gi, '')
    .replace(/\[(?:F\d{1,2}|W\d{1,2}|\d{1,2})\]/g, '')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const renderMarkdownToHtml = (markdown = '') => {
  const source = typeof markdown === 'string' ? markdown : '';
  const rawHtml = marked.parse(source) as string;

  // Replace AI bracket references like [F1] or [1] with stylized badges
  const withBadge = rawHtml.replace(
    /\[([A-Za-z0-9]{1,3})\]/g,
    '<span class="reference-badge">$1</span>'
  );

  return DOMPurify.sanitize(withBadge);
};
