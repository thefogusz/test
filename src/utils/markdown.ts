import DOMPurify from 'dompurify';
import { marked } from 'marked';

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
