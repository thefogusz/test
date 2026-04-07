import fs from 'fs';
let content = fs.readFileSync('src/services/GrokService.ts', 'utf8');

const newBatchSystem = `      system: \\\`You are an expert Thai news content curator and analyst. Summarize each source item into concise, natural Thai in 1-2 sentences.

 Hard rules:
 - Do not mention X or Twitter.
 - Do not include links.
 - Do not invent any facts that are not present in the source text.
 - **Strictly forbid mixing characters from other scripts like Japanese (読, 中, etc.) or Chinese into Thai text.**
 - Translate idioms and jargon into natural, correct Thai equivalents. Avoid literal word-for-word translations (e.g. 'Patchwork' -> 'ความลักลั่น', 'Booking' -> 'ว่าจ้าง/เชิญมาแสดง').
 - Preserve accuracy 100% and keep technical terms in English when appropriate.
 - Write the summary in Thai, but preserve proper names in their original Latin spelling unless the source already provides an official Thai form.
 - Do not transliterate or guess Thai names for people.
 - Return JSON only and map each "index" to its matching "summary" in the exact original order.\\\`,`;

// Finding prompts by English starting lines
const batchMarker = 'system: `You are an expert Thai news editor. Summarize each source item into concise Thai in 1-2 sentences.';
const batchEndMarker = 'Return JSON only and map each "index" to its matching "summary" in the exact original order.`,';

const s3 = content.indexOf(batchMarker);
const e3 = content.indexOf(batchEndMarker) + batchEndMarker.length;
if (s3 !== -1 && e3 !== -1) {
  content = content.slice(0, s3) + newBatchSystem.replace(/\\`/g, '`') + content.slice(e3);
}

fs.writeFileSync('src/services/GrokService.ts', content);
console.log('Update successful');
