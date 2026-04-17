const PUBLISHER_REPORTING_PATTERNS = [
  /\b([A-Za-z][A-Za-z0-9.&/-]{2,})\b(?=[^\n]{0,24}(?:รายงาน|อ้าง|อ้างอิง|ระบุ|ชี้|เผย|โพสต์|เขียน))/g,
  /(?:รายงาน|อ้าง|อ้างอิง|ระบุ|ชี้|เผย|โพสต์|เขียน|ตามข้อมูลจาก|อิงจาก)\s+([A-Za-z][A-Za-z0-9.&/-]{2,})\b/g,
];

const normalizeText = (value = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

export const extractRepeatedPublisherAttributions = (text = '') => {
  const normalized = String(text || '');
  if (!normalized) return [];

  const counts = new Map();

  PUBLISHER_REPORTING_PATTERNS.forEach((pattern) => {
    for (const match of normalized.matchAll(pattern)) {
      const token = (match[1] || '').trim().toLowerCase();
      if (!token || token.length < 3) continue;
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([token]) => token);
};

export const hasPublisherAttributionOveruse = (text = '') =>
  extractRepeatedPublisherAttributions(text).length > 0;

export const hasSourceLedNarrative = (text = '') => {
  const paragraphs = String(text || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) return false;

  const sourceLedParagraphs = paragraphs.filter((paragraph) => {
    const repeatedPublishers = extractRepeatedPublisherAttributions(paragraph);
    if (repeatedPublishers.length > 0) return true;
    return /\b(?:Dexerto|IGN|GamesRadar|Polygon|Kotaku|Eurogamer|SteamDB|Steam Charts)\b/i.test(paragraph)
      && /(?:รายงาน|อ้าง|อ้างอิง|ระบุ|ชี้|เผย|โพสต์|เขียน|ตามข้อมูลจาก|อิงจาก)/i.test(paragraph);
  });

  return sourceLedParagraphs.length >= 2;
};

export const hasWeakDataDumpOpening = (text = '', { format = '', tone = '' } = {}) => {
  const normalized = String(text || '').trim();
  if (!normalized) return false;

  const firstBlock = normalized.split(/\n\s*\n/)[0]?.trim() || '';
  if (!firstBlock) return false;

  const shortForm = ['โพสต์โซเชียล', 'สคริปต์วิดีโอสั้น', 'โพสต์ให้ความรู้ (Thread)'].includes(format);
  const energetic = /ไวรัล|viral/i.test(tone);
  if (!shortForm && !energetic) return false;

  const numberMatches = firstBlock.match(/\d[\d,.-]*/g) || [];
  const isLongBlock = firstBlock.length >= 120;
  const startsWithEntity = /^[A-Z][A-Za-z0-9\s-]{2,}/.test(firstBlock) || /^[A-Z]{2,}\b/.test(firstBlock);
  const hasReportingVerb = /รายงาน|อ้าง|อ้างอิง|ระบุ|ชี้|เผย|โพสต์|เขียน/i.test(firstBlock);
  const sentenceCount = firstBlock
    .split(/[.!?。]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;

  return isLongBlock && numberMatches.length >= 2 && startsWithEntity && !hasReportingVerb && sentenceCount <= 2;
};

export const buildAdaptiveWritingDirectives = ({
  format = '',
  tone = '',
  length = '',
  customInstructions = '',
  rawUserInput = '',
} = {}) => {
  const normalizedInstructions = normalizeText(customInstructions).toLowerCase();
  const normalizedInput = normalizeText(rawUserInput).toLowerCase();
  const wantsHook =
    /hook|ฮุก|เปิดแรง|เปิดให้น่าสนใจ|viral|ไวรัล|หยุดเลื่อน|stop scroll/i.test(
      `${normalizedInstructions} ${normalizedInput} ${tone} ${format}`,
    );
  const isSocial = format === 'โพสต์โซเชียล';
  const isThread = format === 'โพสต์ให้ความรู้ (Thread)';
  const isShortVideo = format === 'สคริปต์วิดีโอสั้น';
  const isViral = tone === 'กระตือรือร้น/ไวรัล';
  const isFriendly = tone === 'เป็นกันเอง/เพื่อนเล่าให้ฟัง';
  const isFormal = tone === 'ทางการ/วิชาการ';
  const isHumorous = tone === 'ตลก/มีอารมณ์ขัน';

  const directives = [
    'Adapt the writing to the selected format and tone without forcing a fixed template when the material does not support it.',
    'Let the facts determine how sharp or calm the piece feels.',
    "If the user gave explicit style instructions, treat them as higher priority than house preferences unless they conflict with the fact sheet.",
  ];

  if (isSocial || isThread || isShortVideo) {
    directives.push(
      'For short formats, prefer compression, clarity, and momentum over completeness. Leave out anything that does not strengthen the core point.',
    );
  }

  if (isViral) {
    directives.push(
      'For viral tone, choose the most natural opener for this material: a sharp fact, a real contrast, a clear consequence, or a direct thesis. Do not force a question hook or theatrical teaser.',
    );
    directives.push(
      'If the material is not dramatic by itself, create energy through pacing and specificity instead of clickbait wording.',
    );
  } else if (wantsHook) {
    directives.push(
      'If you use a hook, make it feel earned by the evidence. A plain opening is better than a fake hook.',
    );
  } else {
    directives.push(
      'Do not manufacture a hook when the user did not ask for one or when a straightforward opening serves the piece better.',
    );
  }

  if (isSocial) {
    directives.push(
      'For social posts, write like a real person posting with intent, not like a script skeleton. One paragraph is fine; two short paragraphs are fine; choose what reads best.',
    );
  }

  if (isThread) {
    directives.push(
      'For threads, each segment should carry its own value. Do not split into many posts unless each break genuinely improves readability or sequencing.',
    );
  }

  if (isShortVideo) {
    directives.push(
      'For short-form video scripts, write for the ear first. Use line breaks only where a speaker would naturally pause, not because of a rigid 3-part template.',
    );
  }

  if (isFriendly) {
    directives.push(
      'For friendly tone, keep the language warm and close, but use conversational particles sparingly so the voice stays natural rather than performative.',
    );
  }

  if (isFormal) {
    directives.push(
      'For formal tone, stay precise and composed, but do not flatten the prose into bureaucratic language.',
    );
  }

  if (isHumorous) {
    directives.push(
      'For humorous tone, let the humor come from the situation, contrast, or phrasing. Do not bolt jokes onto information that should stay straight.',
    );
  }

  if (String(length || '').toLowerCase().includes('short') || length === 'short') {
    directives.push('Because the target length is short, prioritize one strong idea and cut secondary context aggressively.');
  }

  return directives.join('\n- ');
};
