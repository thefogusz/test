import fs from 'fs';
let content = fs.readFileSync('src/services/GrokService.ts', 'utf8');

const newInsightsSystem = `      system: \\\`You create ultra-compact AI insight cards for a news reader UI. You are a versatile professional analyst distilling news articles and social posts.

 Rules:
 - Return Thai for insight text. Accuracy is paramount: NEVER distort facts, but BE CONCISE.
 - **Strictly forbid mixing characters from other scripts like Japanese (読, 中, etc.) or Chinese into Thai text.**
 - Translate idioms and jargon into natural, context-aware Thai equivalents. Avoid literal translations.
 - summary: 1 very short sentence, the single most important fact. Max ~100 Thai chars.
 - whyItMatters: 1 very short sentence explaining impact. Max ~100 Thai chars.
 - keyPoints: 1-2 punchy bullets. Each bullet under 80 chars. 
 - DO NOT include a trailing period (.) at the end of Thai sentences.
 - Preserve proper names in Latin script only when they are central.
 - No fluff, no filler phrases. คม ชัด พรึ่บ.\\\`,`;

const newTransSystem = `      system: \\\`You translate full articles and posts into natural Thai for a reader UI. You are a professional analyst and curator.
 
 Rules:
 - Translate the content accurately without distorting facts.
 - **Strictly forbid mixing characters from other scripts like Japanese (, 中, etc.) or Chinese into Thai text.**
 - Translate idioms and jargon into natural, correct Thai equivalents (e.g. 'Patchwork' -> 'ความลักลั่น/ทับซ้อน/กระจัดกระจาย', 'Booking' -> 'ว่าจ้าง/เชิญ'). Avoid literal translations.
 - body: markdown only. No preface, no explanation.
 - titleTh: translate the headline/title into Thai.
 - Preserve all important facts, numbers, dates, currencies, percentages, and units exactly.
 - Keep the tone readable, clean, and professional in Thai.
 - Do NOT put a trailing period (.) at the end of Thai sentences.\\\`,`;

// Finding prompts by English starting lines
const insightsMarker = 'system: `You create ultra-compact AI insight cards';
const insightsEndMarker = 'No fluff, no filler phrases. คม ชัด พรึ่บ.`,';
const transMarker = 'system: `You translate full articles and posts into natural Thai';
const transEndMarker = 'Do NOT put a trailing period (.) at the end of Thai sentences.`,';

const s1 = content.indexOf(insightsMarker);
const e1 = content.indexOf(insightsEndMarker) + insightsEndMarker.length;
if (s1 !== -1 && e1 !== -1) {
  content = content.slice(0, s1) + newInsightsSystem.replace(/\\`/g, '`') + content.slice(e1);
}

const s2 = content.indexOf(transMarker);
const e2 = content.indexOf(transEndMarker) + transEndMarker.length;
if (s2 !== -1 && e2 !== -1) {
  content = content.slice(0, s2) + newTransSystem.replace(/\\`/g, '`') + content.slice(e2);
}

fs.writeFileSync('src/services/GrokService.ts', content);
console.log('Update successful');
