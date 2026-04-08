const fs = require('fs');
const filePath = 'vite.config.js';
let content = fs.readFileSync(filePath, 'utf8');

const startTag = '// Fall back to a mock article so translation can be tested in dev';
const endTag = 'const article = extractArticleFromHtml({ html, url: articleUrl })';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = `if (!html) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Original source not reachable' }));
    return;
  }\n\n              `;
  
  content = content.slice(0, startIndex) + newContent + content.slice(endIndex);
  fs.writeFileSync(filePath, content);
  console.log('Successfully modified vite.config.js');
} else {
  console.error('Could not find markers', { startIndex, endIndex });
}
