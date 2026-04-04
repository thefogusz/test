import DOMPurify from 'dompurify';
import { marked } from 'marked';

export const normalizeSummaryMarkdown = (markdown = '') => {
  const source = typeof markdown === 'string' ? markdown : '';

  return source
    .replace(/\[CONFIDENCE_SCORE:\s*([^\]]+)\]/gi, '')
    // Drop standalone citation clusters like "[F1] [F4] [F6]" that add noise.
    .replace(/(?:^|\n)\s*(?:\[(?:F|W)\d{1,2}\]\s*){2,}(?=\n|$)/g, '\n')
    // Drop repeated citation clusters appended to the end of a sentence.
    .replace(/([^\n])(?:\s*\[(?:F|W)\d{1,2}\]){2,}(?=\s*[.,;:!?]?\s*(?:\n|$))/g, '$1')
    // If the model returns one long paragraph, break after citation badges to improve readability.
    .replace(/(\[(?:F|W)\d{1,2}\])\s+(?=[[\p{L}\p{N}"'(])/gu, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

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
  const source = normalizeSummaryMarkdown(markdown);
  const rawHtml = marked.parse(source) as string;

  // Replace AI bracket references like [F1] or [1] with stylized badges
  const withBadge = rawHtml.replace(
    /\[([A-Za-z0-9]{1,3})\]/g,
    '<span class="reference-badge">$1</span>'
  );

  return DOMPurify.sanitize(withBadge);
};
