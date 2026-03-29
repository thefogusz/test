import DOMPurify from 'dompurify';
import { marked } from 'marked';

export const renderMarkdownToHtml = (markdown = '') => {
  const source = typeof markdown === 'string' ? markdown : '';
  const rawHtml = marked.parse(source) as string;

  return DOMPurify.sanitize(rawHtml);
};
