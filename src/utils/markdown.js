import DOMPurify from 'dompurify';
import { marked } from 'marked';

export const renderMarkdownToHtml = (markdown = '') => {
  const source = typeof markdown === 'string' ? markdown : '';
  const rawHtml = marked.parse(source);

  return DOMPurify.sanitize(rawHtml);
};
