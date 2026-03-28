import { createXai } from '@ai-sdk/xai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { searchEverything, fetchTweetById } from './TwitterService';
import { apiFetch, INTERNAL_TOKEN } from '../utils/apiFetch';

const MODEL_NEWS_FAST = 'grok-4-1-fast-non-reasoning';
const MODEL_REASONING_FAST = 'grok-4-1-fast-reasoning';
const MODEL_WRITER = 'grok-4-1-fast-reasoning';
const MODEL_MULTI_AGENT = 'grok-4-1-fast-reasoning'; // Temporarily downgraded to save costs

const grok = createXai({
  apiKey: 'local-proxy',
  baseURL: '/api/xai/v1',
  headers: {
    'x-internal-token': INTERNAL_TOKEN,
  },
});

const responseCache = new Map();
const CACHE_MAX_ENTRIES = 400;
const TAVILY_CACHE_TTL_MS = 5 * 60 * 1000;
const QUERY_CACHE_TTL_MS = 15 * 60 * 1000;
const SUMMARY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const EXECUTIVE_SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000;
const CONTENT_BRIEF_CACHE_TTL_MS = 30 * 60 * 1000;
const FACT_CACHE_TTL_MS = 30 * 60 * 1000;

const normalizeCacheText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

// Strip characters commonly used for prompt injection from third-party content
// before embedding into AI prompts (tweets, web search results, etc.)
const sanitizeForPrompt = (text = '', maxLen = 500) =>
  String(text || '')
    .replace(/`/g, "'")          // backticks → single quote
    .replace(/\[INST\]/gi, '')   // common injection markers
    .replace(/<<SYS>>/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .trim()
    .slice(0, maxLen);


const hashString = (value = '') => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

const buildCacheKey = (namespace, value) =>
  `${namespace}:${hashString(typeof value === 'string' ? value : JSON.stringify(value))}`;

const pruneCache = (cache) => {
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }

  while (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
};

const getCachedValue = (cache, key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
};

const setCachedValue = (cache, key, value, ttlMs) => {
  pruneCache(cache);
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
};

const dedupeByNormalizedText = (items = [], selector = (item) => item) => {
  const result = [];
  const seen = new Set();

  for (const item of items) {
    const normalized = normalizeCacheText(selector(item));
    const key = normalized || `empty:${result.length}`;

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
};

const SUMMARY_RULES = `
คุณต้องเปลี่ยนโพสต์จากโซเชียลมีเดียให้เป็นสรุปข่าวภาษาไทยแบบสั้น

กฎที่ต้องปฏิบัติตาม:
- รักษาความหมายเดิมให้ครบถ้วน
- เขียนสรุปเป็นภาษาไทย
- คำที่เป็นชื่อเฉพาะ, ชื่อผลิตภัณฑ์ และคำศัพท์ทางเทคนิค ให้คงไว้เป็นภาษาอังกฤษ
- ห้ามระบุชื่อบัญชี (@username) ของบุคคลทั่วไปที่แชร์ข้อมูลโดยไม่มีผลกระทบ แต่ **ยกเว้น** บัญชีที่มีชื่อเสียง, มีผู้ติดตามจำนวนมาก, มียอดไลค์/เอนเกจเม้นท์สูงมาก หรือเป็นต้นทางข้อมูลสำคัญเท่านั้นที่สามารถระบุชื่อได้
- ห้ามเอ่ยชื่อ Twitter หรือ X
- ห้ามใส่ URLs ลงในข้อความ
- เขียนสรุป 1-2 ประโยคต่อเรื่อง
- หลีกเลี่ยงการใช้คำอวดอ้าง, การคาดเดา หรือการเติมแต่งเกินจริง
`.trim();

const cleanMarkdown = (text = '') =>
  text
    .replace(/^#\s*(Introduction|Intro|Overview).*\n?/gim, '')
    .replace(/^#\s*(Conclusion|Summary).*$/gim, '## Summary')
    .trim();

const stripEmojiLikeSymbols = (text = '') =>
  text.replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D]/gu, '');

const cleanGeneratedContent = (text = '', { allowEmoji = false } = {}) =>
  cleanMarkdown(allowEmoji ? text : stripEmojiLikeSymbols(text))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const dedupeSources = (sources = []) => {
  const byUrl = new Map();

  for (const source of sources) {
    if (!source?.url) continue;
    if (!byUrl.has(source.url)) {
      byUrl.set(source.url, {
        title: source.title || source.url,
        url: source.url,
      });
    }
  }

  return Array.from(byUrl.values());
};

const buildTweetUrl = (tweet) => {
  if (!tweet?.id) return null;
  const username = tweet.author?.username || 'i';
  return `https://x.com/${username}/status/${tweet.id}`;
};

export const tavilySearch = async (query, isLatest = false, options = {}) => {
  const normalizedQuery = normalizeCacheText(query);
  if (!normalizedQuery) return { results: [], answer: '' };

  const searchOptions = {
    max_results: options.max_results ?? 5,
    include_answer: options.include_answer ?? true,
    search_depth: options.search_depth ?? 'advanced',
    include_raw_content: options.include_raw_content ?? false,
    topic: options.topic,
  };

  const cacheKey = buildCacheKey('tavily', { normalizedQuery, isLatest, searchOptions });
  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch('/api/tavily/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: normalizedQuery,
        search_depth: searchOptions.search_depth,
        include_answer: searchOptions.include_answer,
        max_results: searchOptions.max_results,
        include_raw_content: searchOptions.include_raw_content,
        topic: searchOptions.topic,
        time_range: isLatest ? 'day' : undefined,
      }),
    });

    if (!response.ok) return { results: [], answer: '' };
    const result = await response.json();
    return setCachedValue(responseCache, cacheKey, result, TAVILY_CACHE_TTL_MS);
  } catch (err) {
    console.warn('[GrokService] Tavily fetch failed:', err);
    return { results: [], answer: '' };
  }
};



const isMajorXAccount = (tweet) => {
  const followers = tweet.author?.followers || tweet.author?.fastFollowersCount || 0;
  const likes = tweet.like_count || tweet.likeCount || 0;
  return followers > 10000 || likes > 500 || tweet.author?.isVerified || tweet.author?.isBlueVerified;
};

const extractSourcesFromTweets = (tweets, limit = 4) => {
  const validSources = (tweets || [])
    .filter(t => isMajorXAccount(t))
    .slice(0, limit)
    .map((tweet) => {
      const url = buildTweetUrl(tweet);
      if (!url) return null;
      return {
        title: `@${tweet.author?.username || 'unknown'} on X`,
        url,
      };
    })
    .filter(Boolean);
    
  return dedupeSources(validSources);
};

const toTweetEvidence = (tweets, limit = 6) =>
  (tweets || [])
    .slice(0, limit)
    .map((tweet, index) => {
      const url = buildTweetUrl(tweet);
      const username = tweet.author?.username || 'unknown';
      const text = (tweet.text || '').replace(/\s+/g, ' ').trim();
      const clipped = text.length > 280 ? `${text.slice(0, 277)}...` : text;
      return `[X${index + 1}] @${username}: ${clipped}${url ? ` (${url})` : ''}`;
    })
    .join('\n');

const normalizeLength = (value) => {
  const raw = String(value || '').trim().toLowerCase();

  if (raw === 'short' || raw.includes('short')) return 'short';
  if (raw === 'long' || raw.includes('long')) return 'long';

  return 'medium';
};

const getLengthInstruction = (value) => {
  switch (normalizeLength(value)) {
    case 'short':
      return 'เขียนให้กระชับ: 1 ย่อหน้าสั้นๆ หรือ 3-4 บรรทัดสั้นๆ ปกติไม่เกิน 150 คำ';
    case 'long':
      return 'เขียนแบบเจาะลึก: บทความยาว ปกติ 700-900+ คำ พร้อมรายละเอียดที่ลึกซึ้งและบทสรุปที่ชัดเจน';
    case 'medium':
    default:
      return 'เขียนแบบความยาวปานกลาง: ปกติ 350-500 คำ พร้อมรายละเอียดที่เพียงพอให้เนื้อหาดูสมบูรณ์';
  }
};

const CONTENT_FORMAT_PROFILES = {
  'โพสต์โซเชียล': {
    label: 'social post',
    allowHeadings: false,
    allowCta: true,
    boldHeadline: true,
    structure: 'เริ่มด้วยบรรทัดแรกที่เป็น headline hook ห่อด้วย **...** แล้วตามด้วย 3-5 ย่อหน้าสั้น แต่ละย่อหน้ามีไอเดียเดียวชัดเจน คั่นด้วย "." บรรทัดเดียว ไม่ใช้ markdown heading ใดๆ',
    goals: 'headline บรรทัดแรก (bold) ต้อง hook ด้วยตัวเลขจริงหรือข้อเท็จจริงที่น่าสนใจที่สุดจาก fact sheet — เปิดทันที ไม่ต้องนำเข้า ลงท้ายด้วยคำถามหรือประเด็นที่เกี่ยวกับ topic จริงๆ วางแฮชแท็ก 2-3 ตัวท้ายสุด',
    skill: 'คนรู้เรื่องเล่าให้คนอื่นฟัง — ไม่ใช่ clickbait ไม่ใช่รายงานข่าว ให้ข้อมูลจริงก่อนแล้วค่อยมีมุมมอง ใช้ ครับ ลงท้ายตามธรรมชาติ',
  },
  'สคริปต์วิดีโอสั้น': {
    label: 'short-form video script',
    allowHeadings: false,
    allowCta: false,
    boldHeadline: true,
    structure: 'เริ่มด้วย **[ชื่อเรื่อง/hook line]** หนึ่งบรรทัด แล้วแบ่งเป็น 3 ส่วน: [HOOK 3-5 วินาที] → [เนื้อหาหลัก] → [ปิดจบ] ประโยคละไม่เกิน 12-15 คำ มีจังหวะหายใจ ไม่ใช้ markdown heading',
    goals: 'เขียนให้ฟังเหมือนคนพูดจริงๆ ไม่ใช่อ่านบทความ ใช้คำลงท้ายพูด (ครับ/นะ/น้า) เพื่อจังหวะธรรมชาติ hook ต้องดึงความสนใจใน 3 วินาทีแรก',
    skill: 'สคริปต์ที่ใช้ได้จริงในวิดีโอ TikTok/Shorts — ฟังแล้วไม่รู้สึกว่ากำลังอ่านอยู่ มีพลังงานและจังหวะที่ดี ประโยคสั้นกว่าการเขียนปกติ',
  },
  'บทความ SEO / บล็อก': {
    label: 'blog article',
    allowHeadings: true,
    allowCta: false,
    boldHeadline: false,
    structure: 'เขียนบทความที่มีโครงสร้างชัดเจน บรรทัดแรกสุดเป็น # Headline (H1) ที่ชัดเจน ใช้ ## subheading เมื่อจำเป็นจริงๆ เท่านั้น แต่ละ section ต้องมีเนื้อหาที่มีน้ำหนัก ไม่ใช่แค่ subheading แล้วสองสามประโยค',
    goals: 'ให้ข้อมูลครบ ลึก น่าเชื่อถือ — อ่านจบแล้วผู้อ่านรู้สึกว่าได้ความรู้จริงๆ เน้น clarity และ information density ไม่มี hype เกินข้อเท็จจริง',
    skill: 'บทความที่ค้นหาแล้วเจอและอ่านแล้วไม่รู้สึกเสียเวลา — ข้อมูลถูกต้อง ลำดับดี ภาษาเป็นทางการแต่ไม่น่าเบื่อ ใช้ ครับ ได้ตามธรรมชาติ',
  },
  'โพสต์ให้ความรู้ (Thread)': {
    label: 'thread',
    allowHeadings: false,
    allowCta: true,
    boldHeadline: true,
    structure: 'เริ่มด้วยบรรทัดแรกที่เป็น headline hook ห่อด้วย **...** แล้วแต่ละ section ต่อเนื่องกันและอ่านได้ด้วยตัวเองในฐานะ standalone point ไม่ใช้ markdown heading',
    goals: 'เรียงข้อมูลจากน่าสนใจที่สุดไปหาน้อยที่สุด (inverted pyramid) แต่ละ section มีไอเดียเดียวชัดเจน จบด้วย insight หรือคำถาม topic จริงๆ วาง hashtag 2-3 ตัวท้ายสุด',
    skill: 'thread ที่อ่านไปก็ได้ความรู้ไป — ไม่ใช่แค่ bullet points เฉยๆ มีเรื่องราวและ flow ที่ดึงดูด คนอ่านครึ่งทางก็ยังอยากอ่านต่อ',
  },
};

const TONE_GUIDES = {
  'ให้ข้อมูล/ปกติ': 'Calm, informed, editorial. Use professional but accessible Thai. Use particles like ครับ/ค่ะ appropriately. Avoid robotic transitions.',
  'กระตือรือร้น/ไวรัล': 'เขียนแบบ Energetic และดึงดูด — ใช้ insight ที่แหลมคมเป็น hook บรรทัดแรกต้องดึงคนหยุดอ่านทันที ใช้คำลงท้าย นะ/น้า/สิ/ซะ/เลย ได้ตามธรรมชาติ ประโยคสั้น กระชับ มีจังหวะ ใช้ตัวเลขหรือข้อเท็จจริงที่น่าตกใจเป็น anchor เขียนให้ดึงดูดและมีชีวิตชีวา แต่ภาษาต้องเป็นภาษาไทยจริงๆ ที่คนใช้ในชีวิตประจำวัน — ห้ามประดิษฐ์สำนวนหรือใช้คำแสลงที่ฟังดูแปลกหรือไม่มีอยู่จริง ถ้าร่างยังฟังเหมือนรายงานข่าวหรือเรียงข้อมูลแข็งเกินไป ให้เรียบเรียงใหม่ให้กระชับและตรงประเด็นขึ้น ห้ามขึ้นต้นด้วย "สาย... ห้ามพลาด" หรือ "อัปเดตด่วน" — ให้ hook ด้วยสาระแทน',
  'ทางการ/วิชาการ': 'Precise, objective, and well-structured. No slang. Use ครับ/ค่ะ for standard politeness.',
  'เป็นกันเอง/เพื่อนเล่าให้ฟัง': 'Warm, conversational, dropping formal pronouns where implied. Flow like a natural speech. Use particles like เถอะ/หน่อย, นะ/น้า for closeness.',
  'ตลก/มีอารมณ์ขัน': 'Lightly playful, witty observations. No forced jokes.',
  'ดุดัน/วิจารณ์เชิงลึก': 'Direct, analytical, pulling no punches. Evidence-driven.',
  'ฮาร์ดเซลล์/ขายของ': 'Persuasive, value-oriented, clear CTA.',
};

const HYPE_PHRASES = [
  'สะเทือนโลก',
  'เปลี่ยนเกม',
  'ครองโลก',
  'ครองครึ่งโลกการเงิน',
  'มหาศาล',
  'massive',
  'enormous',
  'สุดยิ่งใหญ่',
  'เดือดพล่าน',
  'สัญญาณไฟเขียว',
  'โลกจะไม่เหมือนเดิมอีกต่อไป',
  'ไอคอนิก',
  'ข้ามไปมา',
  'หัวหอก',
  'กระหาย',
  'ปฏิวัติวงการ',
  'พลิกโฉม',
  'จับตามองให้ดี',
];

const buildFormatProfile = (format) =>
  CONTENT_FORMAT_PROFILES[format] || CONTENT_FORMAT_PROFILES['โพสต์โซเชียล'];

const shouldPreferConversationalViralFlow = (tone = '', format = '') =>
  tone === 'กระตือรือร้น/ไวรัล' && ['โพสต์โซเชียล', 'โพสต์ให้ความรู้ (Thread)'].includes(format);

const normalizeThaiSpacing = (text = '') =>
  text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // NLP Post-Processing: Remove zero-width spaces
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([!?])\1{2,}/g, '$1$1') // Reduce !!! to !! at most
    .replace(/[ ]{2,}/g, ' ')
    .trim();

const stripDisallowedHeadings = (text = '') =>
  text.replace(/^\s{0,3}#{1,6}\s+.+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

const stripEngagementBait = (text = '') =>
  text
    .replace(/(^|\n)(คุณคิดยังไง.*)$/gim, '')
    .replace(/(^|\n)(แชร์ความเห็น.*)$/gim, '')
    .replace(/(^|\n)(รีโพสต์.*)$/gim, '')
    .replace(/(^|\n)(comment\s*มา.*)$/gim, '')
    .replace(/(^|\n)(คอมเมนต์.*(หน่อย|กัน|สิ|นะ).*)$/gim, '')
    .replace(/(^|\n)(.*คิดว่ายังไง.*comment.*)$/gim, '')
    .replace(/(^|\n)(.*อยู่มั้ย.*คุยกัน.*)$/gim, '')
    .replace(/(^|\n)(.*follow.*ไว้.*)$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const softenHypeLanguage = (text = '') => {
  let nextText = text;

  for (const phrase of HYPE_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nextText = nextText.replace(
      new RegExp(escaped, 'gi'),
      phrase === 'massive' || phrase === 'enormous' ? 'มีนัยสำคัญ' : 'สำคัญ',
    );
  }

  return nextText
    .replace(/ว้าว!?/gi, '')
    .replace(/!\?/g, '?')
    .replace(/!!+/g, '!')
    .trim();
};

const shouldAllowHighEnergyLanguage = (customInstructions = '', tone = '') =>
  /ไวรัล|viral|energetic|high energy/i.test(`${tone} ${customInstructions}`);

const polishThaiContent = (text = '', { format, customInstructions = '', allowEmoji = false, tone = '' } = {}) => {
  const profile = buildFormatProfile(format);
  const hasCustomInstructions = customInstructions.trim().length > 20;
  const allowExplicitCta = hasCustomInstructions || /cta|call to action|ชวนคอมเมนต์|ชวนแชร์|ชวนรีโพสต์/i.test(
    customInstructions,
  );

  // When user specifies custom instructions, trust them — skip hype softening so we don't undo what they asked for
  const allowHighEnergyLanguage = hasCustomInstructions || shouldAllowHighEnergyLanguage(customInstructions, tone);
  let nextText = cleanGeneratedContent(text, { allowEmoji });

  if (!profile.allowHeadings) {
    nextText = stripDisallowedHeadings(nextText);
  }

  if (!profile.allowCta && !allowExplicitCta) {
    nextText = stripEngagementBait(nextText);
  }

  if (!allowHighEnergyLanguage) {
    nextText = softenHypeLanguage(nextText);
  } else {
    // For Viral/Enthusiastic tones, allow more impact while still avoiding non-fact-based global scales
    nextText = nextText.replace(/ครองโลก/gi, 'มีบทบาทสำคัญระดับโลก');
    nextText = nextText.replace(/!!+/g, '!');
    // Don't over-soften everything. Keep the hook-driven energy.
  }
  return normalizeThaiSpacing(nextText);
};

const CONTENT_BRIEF_SCHEMA = z.object({
  mainAngle: z.string().min(10).max(240),
  audience: z.string().min(3).max(120),
  voiceNotes: z.array(z.string()).min(2).max(5),
  mustIncludeFacts: z.array(z.string()).min(2).max(6),
  caveats: z.array(z.string()).min(1).max(4),
  structure: z.array(z.string()).min(2).max(6),
  titleIdea: z.string().min(4).max(140),
  ctaMode: z.enum(['none', 'soft', 'direct']),
});

const SHORT_FORMAT_SET = new Set(['โพสต์โซเชียล', 'สคริปต์วิดีโอสั้น']);

const compressFactSheetForFormat = (factSheetText = '', format = '') => {
  if (!SHORT_FORMAT_SET.has(format)) return factSheetText;
  const verifiedMatch = factSheetText.match(/\[VERIFIED FACTS\]\n([\s\S]*?)(?:\n\n\[|$)/);
  const openMatch = factSheetText.match(/\[OPEN QUESTIONS\]\n([\s\S]*?)(?:\n\n\[|$)/);
  const communityMatch = factSheetText.match(/\[COMMUNITY SIGNAL\]\n([\s\S]*?)(?:\n\n\[|$)/);
  const mustNotMatch = factSheetText.match(/\[MUST NOT CLAIM\]\n([\s\S]*?)(?:\n\n\[|$)/);
  const entitiesMatch = factSheetText.match(/\[KEY ENTITIES\]\n([\s\S]*?)(?:\n\n\[|$)/);
  const verifiedFacts = verifiedMatch
    ? verifiedMatch[1].split('\n').filter(l => l.startsWith('- ')).slice(0, 4).join('\n')
    : '';
  // Keep top-2 open questions as a lite caution signal
  const openQuestions = openMatch
    ? openMatch[1].split('\n').filter(l => l.startsWith('- ')).slice(0, 2).join('\n')
    : '';
  const communitySignal = communityMatch ? communityMatch[1].trim() : '';
  // Always keep full must-not-claim to prevent hallucination
  const mustNotClaim = mustNotMatch ? mustNotMatch[1].trim() : '';
  const keyEntities = entitiesMatch ? entitiesMatch[1].trim() : '';
  return [
    verifiedFacts ? `[VERIFIED FACTS]\n${verifiedFacts}` : '',
    openQuestions ? `[OPEN QUESTIONS]\n${openQuestions}` : '',
    communitySignal ? `[COMMUNITY SIGNAL]\n${communitySignal}` : '',
    mustNotClaim ? `[MUST NOT CLAIM]\n${mustNotClaim}` : '',
    keyEntities ? `[KEY ENTITIES]\n${keyEntities}` : '',
  ].filter(Boolean).join('\n\n');
};

const buildContentBriefPrompt = ({ factSheet, length, tone, format, customInstructions = '' }) => {
  const profile = buildFormatProfile(format);
  const toneGuide = TONE_GUIDES[tone] || tone;
  const prefersConversationalViralFlow = shouldPreferConversationalViralFlow(tone, format);

  return `
[TASK]
Create a concise structured brief for a Thai content writer.

[FORMAT]
${format} (${profile.label})

[LENGTH]
${normalizeLength(length)}

[TONE]
${toneGuide}

[FORMAT RULES]
${profile.structure}
${profile.goals}

[STYLE RULES & NATIVE THAI FLOW]
- You are a Senior Thai Content Creator. Your writing must feel 100% human, rhythmic, and culturally native.
- PERSPECTIVE RULE: Write as the ORIGINAL CREATOR. Do not write like a news aggregator saying "According to account X...". Internalize the facts and tell the story directly from your own authoritative perspective. You can credit sources casually if it builds immense credibility, but do not make them the subject of the sentence unnecessarily.
${prefersConversationalViralFlow ? '- For this format and tone, prioritize natural Thai flow, emotional momentum, and a human-sounding voice over a report-like cadence. If the draft feels like a news recap, rewrite it to sound more like a real person telling the story.' : ''}
- STRICT LANGUAGE RULE: ONLY THAI and ENGLISH are allowed. STRICTLY DO NOT output Chinese, Japanese, Korean, Russian/Cyrillic or any other languages under any circumstances.
- ANTI-ROBOT RULE 1: NO PASSIVE VOICE translated from English. Do not use "ถูก..." unless describing a negative/punishing action.
- ANTI-ROBOT RULE 2: DROP UNNECESSARY PRONOUNS. Native Thai drops "มัน" (it) and "พวกเขา" (they) when context is clear.
- ANTI-ROBOT RULE 3: SEMANTIC SPACING. Use spacebars to separate independent clauses and ideas instead of rigid punctuation or massive text blocks.
- ANTI-ROBOT RULE 4: NO LITERAL IDIOMS. Never translate "at the end of the day" or "game changer" literally. Find the Thai cultural equivalent.
- Keep verified facts separate from interpretation.
- Avoid repetitive sentence structures (e.g., stopping starting 3 sentences in a row with the same word).
- Choose either a natural Thai term or a professional English term (for technical names) - NEVER use dictionary-style pairs like "Artificial Intelligence (ปัญญาประดิษฐ์)".
- When low-impact people react, summarize them collectively instead of naming each one.
- Mention a specific account (@handle) if they are a globally recognized figure, an official organization, or the primary original source. ALSO mention accounts that, while not the primary source, have significant reach (high followers) or created major impact through high engagement (massive likes/reposts). NEVER mention random low-impact accounts.

[CUSTOM INSTRUCTIONS]
${customInstructions || 'None'}

[FACT SHEET]
${factSheet}
`.trim();
};

const buildContentBrief = async ({ factSheet, length, tone, format, customInstructions = '' }) => {
  const cacheKey = buildCacheKey('content-brief', {
    factSheet,
    length,
    tone,
    format,
    customInstructions,
  });
  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;
  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: 'Return a concise Thai content brief as JSON only. Stay grounded in the fact sheet.',
      prompt: buildContentBriefPrompt({ factSheet, length, tone, format, customInstructions }),
      schema: CONTENT_BRIEF_SCHEMA,
    });

    return setCachedValue(responseCache, cacheKey, object, CONTENT_BRIEF_CACHE_TTL_MS);
  } catch (error) {
    console.warn('[GrokService] Brief generation fallback:', error);
    return setCachedValue(responseCache, cacheKey, {
      mainAngle: 'สรุปประเด็นสำคัญจากข้อมูลที่มีอย่างชัดเจนและน่าเชื่อถือ',
      audience: 'ผู้อ่านทั่วไปที่ต้องการความเข้าใจเร็ว',
      voiceNotes: tone === 'กระตือรือร้น/ไวรัล'
        ? ['กระชับ', 'น่าเชื่อถือ', 'มีพลังงาน', 'ดึงดูดตั้งแต่บรรทัดแรก']
        : tone === 'เป็นกันเอง/เพื่อนเล่าให้ฟัง'
          ? ['กระชับ', 'น่าเชื่อถือ', 'ใกล้ชิด', 'เป็นธรรมชาติ']
          : ['กระชับ', 'น่าเชื่อถือ', 'ไม่โอเวอร์'],
      mustIncludeFacts: ['ยึดตาม fact sheet', 'แยกข้อเท็จจริงออกจากความเห็น'],
      caveats: ['ระบุข้อจำกัดของข้อมูลเมื่อยังไม่ชัดเจน'],
      structure: ['เปิดด้วยประเด็นหลัก', 'ขยายบริบทสำคัญ', 'ปิดด้วยข้อสรุปที่พอดี'],
      titleIdea: 'สรุปประเด็นสำคัญล่าสุด',
      ctaMode: 'none',
    }, CONTENT_BRIEF_CACHE_TTL_MS);
  }
};

const callGrok = async ({
  system,
  prompt,
  modelName = MODEL_NEWS_FAST,
  providerOptions,
  temperature = 0.7,
  topP = 0.85,
  frequencyPenalty = 0.35,
  presencePenalty = 0.1,
  allowEmoji = false,
}) => {
  try {
    const { text } = await generateText({
      model: grok(modelName),
      system,
      prompt,
      providerOptions,
      temperature,
      topP,
      frequencyPenalty,
      presencePenalty,
    });

    return cleanGeneratedContent(text, { allowEmoji });
  } catch (error) {
    console.error(`[GrokService] Error calling ${modelName}:`, error);
    if (error.status === 400) {
      console.warn('[GrokService] Bad Request. Check parameters/reasoningEffort for model:', modelName);
    }
    throw error;
  }
};

const deriveResearchQuery = async (input, context = '') => {
  const baseInput = (input || '').replace(/\s+/g, ' ').trim().slice(0, 160) || 'latest news';
  const combinedInput = context ? `${context}\n\n[USER INPUT]: ${baseInput}` : baseInput;
  
  // 1. Heuristic-first bypass for simple/raw queries
  const hasUrl = /https?:\/\//i.test(baseInput);
  const wordCount = baseInput.split(/\s+/).length;
  
  // If it's just a URL and WE HAVE NO CONTEXT, we are forced to use the URL/fallback
  // But if we have CONTEXT, we should use the LLM to get the BEST keywords
  if (!context && (hasUrl || (wordCount < 12 && baseInput.length < 100))) {
    return baseInput.replace(/https?:\/\/\S+/g, '').trim() || baseInput;
  }

  const cacheKey = buildCacheKey('research-query', combinedInput);
  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;

  console.log('[GrokService] Deriving research query for:', baseInput.slice(0, 50) + '...');

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system:
        'สกัดหนึ่งหัวข้อค้นหาที่กระชับจากคำขอและบริบทพยายามรักษาชื่อสำคัญ, ผลิตภัณฑ์, บริษัท และหัวข้อหลักไว้ หากบริบทมีเนื้อหาเยอะ ให้เลือกจุดที่สำคัญที่สุดเพื่อใช้ค้นหาข่าวที่เกี่ยวข้อง ห้ามใช้ URL เป็นคำค้นหา ส่งผลลัพธ์เป็น JSON เท่านั้น',
      prompt: combinedInput.slice(0, 1500),
      schema: z.object({
        searchQuery: z.string().min(1).max(160),
      }),
    });

    const result = (object.searchQuery || baseInput).trim();
    console.log('[GrokService] Derived research query:', result);
    return setCachedValue(
      responseCache,
      cacheKey,
      result,
      QUERY_CACHE_TTL_MS,
    );
  } catch (error) {
    console.warn('[GrokService] Falling back in deriveResearchQuery:', error.message);
    return setCachedValue(responseCache, cacheKey, baseInput, QUERY_CACHE_TTL_MS);
  }
};



// --- [NEWS FLOW FUNCTIONS] ---

export const generateGrokSummary = async (fullStoryText) => {
  const results = await generateGrokBatch([fullStoryText]);
  return results[0] || fullStoryText;
};

export const generateGrokBatch = async (stories) => {
  if (!stories || stories.length === 0) return [];

  // 1. Identify unique stories and map them to their original positions
  const uniqueStories = [];
  const storyToUniqueIndex = [];
  const seenStories = new Map();

  for (const story of stories) {
    const normalized = normalizeCacheText(story);
    const cacheKey = buildCacheKey('story-summary-v3', normalized);
    
    if (seenStories.has(cacheKey)) {
      storyToUniqueIndex.push(seenStories.get(cacheKey));
    } else {
      const index = uniqueStories.length;
      seenStories.set(cacheKey, index);
      uniqueStories.push({ text: story, key: cacheKey, index });
      storyToUniqueIndex.push(index);
    }
  }

  // 2. Check cache for unique stories
  const results = new Array(uniqueStories.length);
  const uncached = [];

  uniqueStories.forEach((item) => {
    const cached = getCachedValue(responseCache, item.key);
    if (cached) {
      results[item.index] = cached;
    } else {
      uncached.push(item);
    }
  });

  if (uncached.length === 0) {
    return storyToUniqueIndex.map(i => results[i]);
  }

  // 3. Process uncached in batch with STRICT mapping
  try {
    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `คุณคือบรรณาธิการข่าวผู้เชี่ยวชาญ หน้าที่คือสรุปข่าวภาษาไทยสั้นๆ 1-2 ประโยคต่อเรื่อง
กฎเหล็ก:
- ห้ามระบุชื่อ X หรือ Twitter
- ห้ามใส่ลิงก์
- ห้ามมโนข้อมูลที่ไม่มีในต้นฉบับ
- รักษาความแม่นยำ 100% และคงคำศัพท์เทคนิคภาษาอังกฤษไว้
- คืนค่าผลลัพธ์เป็น JSON Object ที่ Map ระหว่าง "index" และ "summary" ให้ตรงตามลำดับต้นฉบับเป๊ะๆ`,
      prompt: `สรุปข่าวเหล่านี้เป็นภาษาไทย (Translate & Summarize):\n${JSON.stringify(
        uncached.map(u => ({ index: u.index, original: u.text })),
        null,
        2
      )}`,
      schema: z.object({
        mapped_summaries: z.array(z.object({
          index: z.number(),
          summary: z.string()
        })).length(uncached.length)
      }),
      temperature: 0.1,
    });

    // 4. Update results and cache
    object.mapped_summaries.forEach((item) => {
      const cleanSum = cleanGeneratedContent(item.summary);
      results[item.index] = cleanSum;
      const key = uniqueStories[item.index].key;
      setCachedValue(responseCache, key, cleanSum, SUMMARY_CACHE_TTL_MS);
    });

    // Final mapping back to original input order
    return storyToUniqueIndex.map(i => results[i] || stories[i]);
  } catch (error) {
    console.error('[GrokService] Batch summarization error (V3):', error);
    return stories.map((s, i) => results[storyToUniqueIndex[i]] || s);
  }
};

export const agentFilterFeed = async (tweetsData, userPrompt, options = {}) => {
  if (!tweetsData?.length) return [];
  const { preferCredibleSources = false, webContext = '' } = options;

  const compressedInput = tweetsData.map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at || tweet.createdAt || null,
    username: tweet.author?.username || null,
    authorName: tweet.author?.name || null,
    authorBio: tweet.author?.description || tweet.author?.profile_bio?.description || null,
    followers: tweet.author?.followers || tweet.author?.fastFollowersCount || 0,
    isVerified: Boolean(tweet.author?.isVerified),
    isBlueVerified: Boolean(tweet.author?.isBlueVerified),
    isAutomated: Boolean(tweet.author?.isAutomated),
    likeCount: tweet.like_count || tweet.likeCount || 0,
    retweetCount: tweet.retweet_count || tweet.retweetCount || 0,
    replyCount: tweet.reply_count || tweet.replyCount || 0,
    quoteCount: tweet.quote_count || tweet.quoteCount || 0,
    viewCount: tweet.view_count || tweet.viewCount || 0,
  }));

  try {
    const safePrompt = sanitizeForPrompt(userPrompt, 300);
    const safeWebCtx = webContext ? sanitizeForPrompt(webContext, 2000) : '';
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: `You are filtering a private watchlist feed for the user's intent: "${safePrompt}".
${safeWebCtx ? `Use this WEB CONTEXT as a source of truth to prioritize tweets that discuss confirmed events or high-quality topics:\n${safeWebCtx}\n` : ''}
Rules:
- The job is INTENT MATCHING first, not virality ranking.
- Select every post that genuinely matches what the user asked for, up to 12 posts.
- If the user asks for mood/style-based content such as funny posts, memes, sarcasm, reactions, drama, helpful threads, bullish takes, or niche opinions, prioritize semantic fit over engagement.
- REJECT posts that do not clearly match the user intent, even if they are viral or from large accounts.
- Do not default to "important news" unless the prompt explicitly asks for that.
- For recreational topics: prefer posts that are actually funny, entertaining, interesting, or stylistically relevant to the request.
${preferCredibleSources ? '- Prioritize topic fit first, then strictly prefer credible/authority sources.' : ''}
- Assign a 'temporalTag': "Breaking" (very new/urgent), "Trending" (currently popular), or "Background" (evergreen/context).
- **Reasoning Language:** เขียน 'reasoning' เป็นภาษาไทยเท่านั้น โดยสรุปสั้นๆ (1 ประโยค) ว่าทำไมโพสต์นี้ถึงสำคัญหรือตรงกับความต้องการ สื่อสารให้เข้าใจง่ายเหมือนเพื่อนเล่าให้ฟัง`,
      prompt: JSON.stringify(compressedInput),
      schema: z.object({
        picks: z.array(z.object({
          id: z.string(),
          reasoning: z.string().describe('เหตุผลที่เลือกโพสต์นี้เป็นภาษาไทย'),
          temporalTag: z.enum(['Breaking', 'Trending', 'Background']).describe('The temporal context of the post'),
        })),
      }),
      temperature: 0,
    });

    const validIdSet = new Set(compressedInput.map((tweet) => tweet.id));
    const finalPicks = object.picks.filter((pick) => validIdSet.has(pick.id));
    return finalPicks.map((pick, i) => ({ ...pick, citation_id: `[T${i + 1}]` }));
  } catch (error) {
    if (error.status === 400) {
      console.warn('[GrokService] 400 Bad Request in agentFilterFeed. Check parameters/model.');
    }
    console.error('[GrokService] Filter error:', error);
    return [];
  }
};

const URL_PATTERN = /https?:\/\/[^\s)\]]+/gi;

const extractUrlsFromText = (text = '') =>
  Array.from(
    new Set(
      String(text || '')
        .match(URL_PATTERN)
        ?.map((url) => url.replace(/[),.;!?]+$/g, '').trim())
        .filter(Boolean) || [],
    ),
  );

const isSocialPlatformUrl = (url = '') => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return ['x.com', 'twitter.com', 't.co'].includes(hostname);
  } catch {
    return false;
  }
};

const extractExternalSourceUrls = (...chunks) =>
  Array.from(
    new Set(
      chunks
        .flatMap((chunk) => extractUrlsFromText(chunk))
        .filter((url) => !isSocialPlatformUrl(url)),
    ),
  ).slice(0, 2);

const buildTavilyContextBlock = (label, data) => {
  if (!data || (!data.answer && !data.results?.length)) return '';

  const results = Array.isArray(data.results) ? data.results : [];
  return [
    data.answer ? `[${label} ANSWER]\n${data.answer}` : '',
    results.length
      ? `[${label} SOURCES]\n${results
          .map((result, index) => {
            const snippet = (result.content || result.raw_content || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 320);
            return `${index + 1}. ${result.title || result.url} - ${snippet} (${result.url})`;
          })
          .join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};

export const generateExecutiveSummary = async (validTweets, userQuery, onStreamChunk, webContext = '') => {
  if (!validTweets?.length) return null;

  const tweetsForSummary = dedupeByNormalizedText(validTweets, (tweet) => tweet?.text).slice(0, 10);
  if (!tweetsForSummary.length) return null;

  const cacheKey = buildCacheKey('executive-summary', {
    userQuery,
    webContext,
    tweets: tweetsForSummary.map((tweet) => ({
      id: tweet.id,
      text: normalizeCacheText(tweet.text),
      createdAt: tweet.created_at || tweet.createdAt || null,
    })),
  });
  const cached = getCachedValue(responseCache, cacheKey);

  if (cached) {
    if (onStreamChunk) {
      onStreamChunk(cached, cached);
    }
    return cached;
  }

  const safeQuery = sanitizeForPrompt(userQuery, 300);
  const safeWebCtx = webContext ? sanitizeForPrompt(webContext, 2000) : '';

  const contentToAnalyze = tweetsForSummary
    .map((tweet) => {
      const authorLabel = tweet.author?.username ? `@${tweet.author.username}` : tweet.author?.name || 'unknown';
      return `${tweet.citation_id || '[T?]'} (${authorLabel}) ${sanitizeForPrompt(tweet.text, 400)}`;
    })
    .join('\n---\n');

  const summarySystem = `คุณคือระบบสรุปข้อมูลอัจฉริยะที่เน้นความถูกต้องเป็นหลัก (Zero-Hallucination Summarizer)
สรุปจากทวีตหัวกะทิ ในหัวข้อ "${safeQuery}" เป็นภาษาไทย
${safeWebCtx ? `ใช้ Web Context ด้านล่างนี้เพื่อตรวจสอบความขัดแย้ง (Fact-Check) ห้ามเดาหรือเพิ่มตัวละครที่ไม่มีในเนื้อหา:\n${safeWebCtx}\n` : ''}

กฎเหล็ก:
- ห้ามเพิ่มข้อมูลภายนอก (ห้ามเดาชื่อดารา, ห้ามเดาชื่อเกมถ้าไม่มีในข้อความ)
- สรุปเฉพาะ "ความจริง" ที่เกิดขึ้นใน X (Twitter) และ Web Context เท่านั้น
- **การอ้างอิงแหล่งที่มา (Citation Enforcement):** ทุกประโยคหรือข้ออ้างอิง (Claim) สำคัญในบทสรุป **ต้องบังคับ** ห้อยท้ายด้วย Source ID ของโพสต์นั้นเสมอ เช่น [T1], [T2], [T1][T3] 
- หากเจอข้ออ้างอิงที่หาแหล่งที่มาจาก T1-T10 ไม่ได้ ห้ามอ้างอิงแหล่งที่มาแบบมั่วๆ เด็ดขาด
- รูปแบบ: 1 ประโยคเปิดที่เป็นภาพรวม + 3 Bullet Points สั้นๆ ที่สรุปประเด็นหลัก 
- สไตล์: กระชับ จริงจัง ไม่เน้นคำโปรย (No Fluff)
- หากข้อมูลใน X และ Web ขัดกัน ให้ระบุสิ่งที่คนใน X กำลังพูดถึงเป็นหลัก
- ใช้ markdown bold สำหรับคำสำคัญที่สอดคล้องกับหัวข้อค้นหา
- บรรทัดสุดท้ายสุด ให้ประเมินระดับความน่าเชื่อถือโดยอิงจากการยืนยันข้อความกับ Web Context แล้วเขียนแท็กดังนี้ (ตัวอย่าง):
[CONFIDENCE_SCORE: 85%]`;

  if (onStreamChunk) {
    try {
      const { textStream } = await streamText({
        model: grok(MODEL_REASONING_FAST),
        system: summarySystem,
        prompt: contentToAnalyze,
        maxTokens: 600,
      });

      let fullText = '';
      for await (const textPart of textStream) {
        fullText += textPart;
        onStreamChunk(textPart, fullText);
      }
      return setCachedValue(
        responseCache,
        cacheKey,
        cleanGeneratedContent(fullText),
        EXECUTIVE_SUMMARY_CACHE_TTL_MS,
      );
    } catch (error) {
      console.error('[GrokService] Stream summary error:', error);
      // Fallback to normal if stream fails
    }
  }

  return setCachedValue(responseCache, cacheKey, await callGrok({
    modelName: MODEL_NEWS_FAST,
    system: summarySystem,
    prompt: contentToAnalyze,
  }), EXECUTIVE_SUMMARY_CACHE_TTL_MS);
};

export const expandSearchQuery = async (originalQuery, isLatest = false) => {
  if (!originalQuery) return originalQuery;
  const cacheKey = buildCacheKey('expand-search-query', { originalQuery, isLatest });
  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;

  try {
    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `เปลี่ยนหัวข้อของผู้ใช้ให้เป็นคำค้นหาขั้นสูง (Advanced Search) บน X เพื่อหาข้อมูลระดับสากล
กฎ:
- รักษาเจตนาเดิมของหัวข้อที่ต้องการค้นหา
- ขยายคำค้นหาโดยใช้ทั้งภาษาไทยและ "ภาษาอังกฤษ" (English keywords) เพื่อให้ครอบคลุมข้อมูลระดับโลก
- ใช้ OR เชื่อมระหว่างคำค้นหาไทยและอังกฤษ เช่น (คริปโต OR crypto)
- ต้องใส่ -filter:replies เสมอ 1 ครั้ง
- ${isLatest ? 'โหมดสายฟ้าจะถูกคัดในแอปให้เหลือเฉพาะ 24 ชั่วโมงล่าสุดอยู่แล้ว ดังนั้นห้ามบังคับ since:today หรือคำค้นที่แคบเกินไป ให้โฟกัส recent developments แบบยังได้โพสต์คุณภาพ' : 'เน้นโพสต์ที่มีสัญญาณสำคัญสูง เหมาะสำหรับผลลัพธ์แบบยอดนิยม (Top)'}
- ส่งคืนผลลัพธ์เป็น JSON เท่านั้น`,
      prompt: `Topic: ${originalQuery}`,
      schema: z.object({
        finalXQuery: z.string().min(3),
      }),
    });

    const finalQuery = object.finalXQuery.replace(/\s+/g, ' ').trim();
    return setCachedValue(
      responseCache,
      cacheKey,
      finalQuery.includes('-filter:replies') ? finalQuery : `${finalQuery} -filter:replies`,
      QUERY_CACHE_TTL_MS,
    );
  } catch (error) {
    if (error.status === 400) {
      console.warn('[GrokService] 400 Bad Request in expandSearchQuery. Check parameters/model.');
    }
    console.error('[GrokService] Query optimizer error:', error);
    return setCachedValue(responseCache, cacheKey, `${originalQuery} -filter:replies`, QUERY_CACHE_TTL_MS);
  }
};

export const buildSearchPlan = async (originalQuery, isLatest = false, webContext = '', isComplexQuery = true) => {
  const fallbackQuery = `${originalQuery} -filter:replies`.trim();
  const cacheKey = buildCacheKey('search-plan-v2', { originalQuery, isLatest, webContextLength: webContext.length, isComplexQuery });

  if (!originalQuery) {
    return {
      queries: [],
      primaryQuery: '',
      topicLabels: [],
    };
  }

  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;

  try {
    const { object } = await generateObject({
      model: grok(isComplexQuery ? MODEL_REASONING_FAST : MODEL_NEWS_FAST),
      system: `คุณคือสถาปนิกการค้นหาระดับพระกาฬ (Elite Search Architect)
ภารกิจ: เฟ้นหาคอนเทนต์ที่เป็น "ที่สุด" (Masterpieces) โดยใช้เทคนิค "Keyword Explosion" ยัดคีย์เวิร์ดให้แน่นที่สุด
ตอนนี้คุณกำลังทำ Adaptive RAG (News-Anchored Search)
คุณมีโควต้าการค้นหาบนแพลตฟอร์ม X เพียง 2 ครั้งเท่านั้น:
1. "primaryQuery": Broad Viral Net -> ยัดคำพ้องความหมาย (Synonyms) ไทย/อังกฤษ ให้ครอบคลุมความหมายกว้างๆ (ใช้ OR เยอะๆ)
2. "relatedQuery": Precision Snipe -> ใช้ข้อมูลจากข่าวด้านล่าง (Web Context) มาดึงชื่อคน ชื่อบริษัท ชื่องาน หรือคีย์เวิร์ดที่กำลังเป็นกระแสเป๊ะๆ

กฎเหล็กของคุณภาพ (Strict Quality Bar):
- ความยาวสูงสุดต่อ Query คือ 512 ตัวอักษร (ยัดให้คุ้มค่าที่สุด)
- ทุก Query ต้องจบด้วย -filter:replies 
- ${isLatest ? 'โหมดสายฟ้า (Latest): ใช้ min_faves:1-5 เพื่อให้ได้ข่าวใหม่ที่เริ่มมีพลัง' : 'โหมดปกติ (Top): ใช้ min_faves:10-50 สำหรับหัวข้อทั่วไป แต่หัวข้อเฉพาะทางหรือภาษาไทยให้ใช้ min_faves:2-5 เพื่อป้องกันผลลัพธ์ว่างแดปล่า'}
- ปรับแต่งคีย์เวิร์ดให้ครอบคลุมทั้งไทยและอังกฤษ (เช่น เกม OR gaming)
- เน้นคอนเทนต์คุณภาพสูงที่มีสาระ ไม่เอาสแปมหรือบทสนทนาไร้สาระ
- ตอบเป็น JSON เท่านั้น`,
      prompt: `Topic: ${originalQuery}\n\nWeb Context (Ground Truth from Tavily):\n${webContext.slice(0, 1500) || 'No web news available.'}`,
      schema: z.object({
        primaryQuery: z.string().min(3).max(512),
        relatedQuery: z.string().min(3).max(512),
        topicLabels: z.array(z.string().min(2)).max(5),
      }),
    });

    const normalizeQuery = (query) => {
      const finalQuery = String(query || '').replace(/\s+/g, ' ').trim();
      if (!finalQuery) return '';
      return finalQuery.includes('-filter:replies') ? finalQuery : `${finalQuery} -filter:replies`;
    };

    const queries = Array.from(
      new Set([object.primaryQuery, object.relatedQuery].map(normalizeQuery).filter(Boolean)),
    ).slice(0, 2); // Exactly 2 queries max

    return setCachedValue(responseCache, cacheKey, {
      queries: queries.length ? queries : [fallbackQuery],
      primaryQuery: queries[0] || fallbackQuery,
      topicLabels: Array.from(
        new Set((object.topicLabels || []).map((label) => String(label || '').trim()).filter(Boolean)),
      ),
    }, QUERY_CACHE_TTL_MS);
  } catch (error) {
    console.error('[GrokService] Search plan optimizer error:', error);
    return setCachedValue(responseCache, cacheKey, {
      queries: [fallbackQuery],
      primaryQuery: fallbackQuery,
      topicLabels: [originalQuery],
    }, QUERY_CACHE_TTL_MS);
  }
};

export const discoverTopExperts = async (categoryQuery, excludeUsernames = []) => {
  try {
    // 1. Pre-fetch real active accounts right now using the query
    let activeContext = '';
    try {
      const searchData = await searchEverything(categoryQuery, '', false, 'Top', false);
      if (searchData?.data?.length > 0) {
        const uniqueAuthors = [];
        const seenUsernames = new Set();
        for (const t of searchData.data) {
          if (t.author && t.author.username && !seenUsernames.has(t.author.username.toLowerCase())) {
            seenUsernames.add(t.author.username.toLowerCase());
            uniqueAuthors.push(t.author);
          }
        }
        
        // Filter out small accounts
        const qualifiedAuthors = uniqueAuthors
          .filter(a => (a.followers || a.fastFollowersCount || 0) > 1000)
          .slice(0, 15);
          
        if (qualifiedAuthors.length > 0) {
          activeContext = `\n[อัปเดตแบบ Real-time]: นี่คือรายชื่อบัญชีเทียร์สูงที่มีความเคลื่อนไหว (Active) และกำลังพูดถึงหัวข้อนี้ในช่วง 24 ชั่วโมงที่ผ่านมา จงพิจารณาบัญชีเหล่านี้เป็นพิเศษ:\n${
            qualifiedAuthors.map(a => `- @${a.username} (${a.name}) | ผู้ติดตาม: ${a.followers || a.fastFollowersCount}`).join('\n')
          }\n`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch active context for experts:', e);
    }

    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `คุณคือ "นักล่าดาวรุ่งและปรมาจารย์ระดับโลก" (Global Headhunter AI)
ภารกิจ: จงค้นหาและแนะนำสุดยอดบัญชี Twitter (X) จำนวน 6 บัญชี ที่เป็นผู้เชี่ยวชาญหรือเป็นแหล่งข้อมูลที่สำคัญที่สุดในหัวข้อ "${categoryQuery}" 
${activeContext}
คุณต้องใช้ "ความสามารถในการพิจารณาบริบทปัจจุบัน" ของคุณ เพื่อดึงตัวตนที่มีอิทธิพลในระดับโลกจริงๆ

[กฎการคัดเลือก - สำคัญมาก]:
1. **Global Multi-Language Focus (เน้นระดับโลก):** ผู้ใช้ต้องการ "มุมมองระดับโลก" (Global Perspective) เป็นอันดับแรก 
   - ให้ความสำคัญกับบัญชีภาษาอังกฤษ (English/International accounts) ที่เป็นต้นน้ำของข้อมูล
   - บัญชีภาษาไทยอนุญาตให้มีได้ไม่เกิน 1-2 บัญชี และต้องเป็นตัวท็อปที่มีคุณภาพเท่านั้น
   - หากผู้ใช้พิมพ์ค้นหาเป็นภาษาไทย (เช่น "วงการเกม") ให้คุณมองหา "Global Counterparts" (เช่น IGN, GameSpot, หรือนักพัฒนาเกมระดับโลก) มานำเสนอด้วยเสมอ
2. **Diversity Enforcement (ความหลากหลาย):** ใน 6 บัญชีนี้ ห้ามมีบทบาทซ้ำกันเกิน 2 คน (เช่น ต้องมีทั้งนักวิจารณ์, สำนักข่าว, คนในวงการ, และผู้เล่นระดับโปร)
3. **The Red Flag Filter (ไร้ขยะ):** ตัดบัญชีที่เป็น Bot, สแปม, ข่าวลือมั่ว, หรือบัญชีที่เอาแต่รีทวีต
4. **Active & Public Only (บัญชีที่ยังหายใจ):** อาการ "ทวิตล้าง/ร้าง" คือปัญหาใหญ่ที่สุด ผู้ใช้เกลียดบัญชีที่ไม่แอคทีฟ จงพิจารณาผู้ใช้จาก [อัปเดตแบบ Real-time] ที่ให้ไปก่อนเป็นอันดับแรก หากจำเป็นต้องแนะนำคนนอกลิสต์ ต้องเป็นตัวท็อปในยุทธจักรที่โพสต์เป็นประจำทุกวันห้ามแนะนำบอทหรือคนที่เลิกเล่น X แล้วเด็ดขาด
5. จัดลำดับความสำคัญให้ "บัญชีของคน/องค์กรระดับโลกที่มีผู้ติดตามจริงมหาศาล" เป็นกลุ่มแรก ๆ
6. ตัดบัญชีที่มีชื่อผู้ใช้เหล่านี้ทิ้ง: [${excludeUsernames.join(', ')}]
7. สำหรับ "reasoning": เขียนรีวิวภาษาไทยความยาว 1 ประโยคสั้นๆ เน้นความว้าวว่าทำไมต้องตามคนนี้ เขาเจ๋งแค่ไหนในสายนี้`,
      prompt: `ค้นหายอดฝีมือ 6 คนที่เป็น The Best of the Best ในสาย "${categoryQuery}" อย่างเคร่งครัดตามกฎ ห้ามเอาบัญชีร้างมาเด็ดขาด (username ต้องไม่มี @ นำหน้า และ reasoning ต้องยาวแค่ 1 ประโยคในภาษาไทยเท่านั้น)`,
      schema: z.object({
        experts: z.array(
          z.object({
            username: z.string(),
            name: z.string(),
            reasoning: z.string()
          })
        ).max(6),
      }),
    });

    return (object.experts || []).map(expert => ({
      ...expert,
      username: (expert.username || '').replace(/^@/, '').trim(),
      // No profile_image_url yet, UI will handle lazy hydration and rendering
    }));
  } catch (error) {
    console.error('[GrokService] Expert discovery LLM error:', error);
    if (error.status === 400) {
      console.warn('[GrokService] 400 Bad Request in discovery. Check parameters/reasoningEffort for model.');
    }
    return [];
  }
};

export const researchContext = async (query, interactionData = '') => {
  const { factSheet } = await researchAndPreventHallucination(query, interactionData);
  return factSheet;
};

// --- [CONTENT FLOW FUNCTIONS] ---

const TWEET_URL_PATTERN = /(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i;

const extractTweetIdFromInput = (input = '') => {
  const match = input.match(TWEET_URL_PATTERN);
  if (!match) return null;
  return { username: match[1], tweetId: match[2] };
};

export const researchAndPreventHallucination = async (input, interactionData = '', options = {}) => {
  const cacheKey = buildCacheKey('fact-sheet-v1', normalizeCacheText(input) + '||' + normalizeCacheText((interactionData || '').slice(0, 300)));
  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;

  let attachedExternalUrls = extractExternalSourceUrls(input, interactionData);

  // Detect and fetch tweet when input contains a tweet URL
  const tweetRef = extractTweetIdFromInput(input);
  if (tweetRef && !interactionData) {
    try {
      const tweet = await fetchTweetById(tweetRef.tweetId);
      if (tweet?.text) {
        const tweetText = tweet.text.replace(/https?:\/\/\S+/g, '').trim();
        const author = tweet.author?.name || tweet.author?.username || tweetRef.username;
        interactionData = `[ORIGINAL TWEET SOURCE]\nAuthor: @${tweet.author?.username || tweetRef.username} (${author})\nContent: ${tweetText}\nLikes: ${tweet.like_count || 0} | Retweets: ${tweet.retweet_count || 0}`;
        attachedExternalUrls = extractExternalSourceUrls(input, interactionData, tweet.text);
      }
    } catch {
      // silently continue without tweet data
    }
  }

  let researchQuery = '';
  try {
    const queryInput = tweetRef ? `${tweetRef.username} ${input.replace(TWEET_URL_PATTERN, '').trim()}`.trim() : input;
    researchQuery = await deriveResearchQuery(queryInput, interactionData);
  } catch (err) {
    console.warn('[GrokService] Query derivation failed, using raw input:', err.message);
    researchQuery = input.slice(0, 100);
  }
  let webContext = '';
  let xContext = '';
  let extractedSources = [];
  let attachedSourceContext = '';

  try {
    console.log('[GrokService] Starting research with query:', researchQuery);
    if (options.onProgress) options.onProgress('fetching');

    // Query Gating: Only fetch X Latest if query seems time-sensitive
    const isLatestNeeded = /ล่าสุด|วันนี้|breaking|เปิดตัว|ประกาศ|ด่วน|now|today|update/i.test(input) || /ล่าสุด|วันนี้|breaking|เปิดตัว|ประกาศ|ด่วน|now|today|update/i.test(interactionData);
    
    const [data, xTopResponse, xLatestResponse, attachedUrlResponses] = await Promise.all([
      tavilySearch(researchQuery, false), // Force false here as research flow is general
      searchEverything(researchQuery, '', false, 'Top').catch(() => ({ data: [] })),
      isLatestNeeded ? searchEverything(researchQuery, '', false, 'Latest').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      attachedExternalUrls.length
        ? Promise.all(
            attachedExternalUrls.map((url) =>
              tavilySearch(url, false, {
                max_results: 3,
                include_answer: true,
                include_raw_content: true,
                search_depth: 'advanced',
                topic: 'general',
              }).catch(() => ({ results: [], answer: '' })),
            ),
          )
        : Promise.resolve([]),
    ]);

    if (data && (data.results?.length || data.answer)) {
      const webResults = Array.isArray(data.results) ? data.results : [];

      extractedSources.push(
        ...webResults.map((result) => ({
          title: result.title || result.url,
          url: result.url,
        })),
      );

      webContext = [
        data.answer ? `[WEB ANSWER]\n${data.answer}` : '',
        webResults.length
          ? `[WEB SOURCES]\n${webResults
              .map((result, index) => {
                const snippet = (result.content || result.raw_content || '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 320);
                return `${index + 1}. ${result.title} - ${snippet} (${result.url})`;
              })
              .join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');
    }

    if (attachedExternalUrls.length && attachedUrlResponses.length) {
      const attachedBlocks = attachedUrlResponses
        .map((response, index) => {
          const sourceUrl = attachedExternalUrls[index];
          if (!response || (!response.results?.length && !response.answer)) return '';

          extractedSources.push(
            ...((response.results || []).map((result) => ({
              title: result.title || result.url || sourceUrl,
              url: result.url || sourceUrl,
            }))),
          );

          const matchedPrimarySource = (response.results || []).find((result) => result?.url === sourceUrl);
          if (matchedPrimarySource) {
            extractedSources.push({
              title: matchedPrimarySource.title || sourceUrl,
              url: matchedPrimarySource.url || sourceUrl,
            });
          } else {
            extractedSources.push({
              title: sourceUrl,
              url: sourceUrl,
            });
          }

          return buildTavilyContextBlock(`PRIMARY SOURCE WEB ${index + 1}`, response);
        })
        .filter(Boolean);

      attachedSourceContext = attachedBlocks.join('\n\n');
    }

    const xTweets = dedupeByNormalizedText(
      [...(xTopResponse?.data || []).slice(0, 4), ...(xLatestResponse?.data || []).slice(0, 4)],
      (tweet) => tweet?.id || tweet?.text,
    );
    extractedSources.push(...extractSourcesFromTweets(xTweets, 6));

    if (xTweets.length) {
      xContext = `[X EVIDENCE]\n${toTweetEvidence(xTweets, 6)}`;
    }
    console.log('[GrokService] Evidence gathering complete:', { web: !!webContext, x: xTweets.length });
    if (options.onProgress) options.onProgress('context-built');
  } catch (error) {
    console.error('[GrokService] Search aggregation error:', error);
  }

  try {
    if (options.onProgress) options.onProgress('compiling');
    const todayDate = new Date().toISOString().split('T')[0];
    const { object: factSheetObj } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: `คุณคือหัวหน้าทีมนักวิจัย (Lead Investigator) ที่รับผิดชอบความถูกต้องของข้อมูล (Fact-Check) 100%
เป้าหมาย: สร้าง Fact Sheet ฉบับสมบูรณ์ที่แม่นยำที่สุด โดยห้ามมี Hallucination เด็ดขาด ส่งออกเป็น JSON ตามโครงสร้างที่กำหนดเท่านั้น
[TODAY'S DATE: ${todayDate}]

[การใช้แหล่งข้อมูล]
- หากมี [PRIMARY LEAD / ORIGINAL SOURCE] ให้ถือว่านี่คือแกนกลางของเรื่องที่ต้องตรวจสอบและยืนยันเป็นอันดับแรก
- ให้ลำดับความสำคัญอ้างอิงกับ [WEB SOURCES] (แหล่งข่าวทางการ) เป็นหลัก
- ใช้ [X EVIDENCE] เพื่อสรุป "ความเคลื่อนไหว" หรือมิติทางสังคม

[CITATIONS RULE]
- ห้ามระบุชื่อบัญชี (@handle) ของผู้ใช้ทั่วไปที่ไม่มีอิมแพค ให้ใช้คำว่า "กลุ่มผู้ใช้" แทน
- หากข้อมูลใน [PRIMARY LEAD] ขัดแย้งกับ [WEB SOURCES] อย่างรุนแรง (เช่น อันหนึ่งบอกปิด อีกอันบอกเปิด) **ห้ามตัดสินทิ้งข้อมูลอันใดอันหนึ่งแล้วมโนเรื่องใหม่ขึ้นมาเอง** ให้สรุปข้อคัดแย้งนั้นลงใน [OPEN QUESTIONS] อย่างชัดเจน
- หากแหล่งที่มาดูไม่น่าเชื่อถือ ให้คัดออกจากการเป็นข้อเท็จจริงยืนยัน (Verified Facts) แต่ต้องระบุไว้ใน [COMMUNITY SIGNAL] ว่ามีกระแสข่าวนี้อยู่
`,
      prompt: [
        interactionData ? `[PRIMARY LEAD / ORIGINAL SOURCE]\n${interactionData}` : '',
        `[ORIGINAL REQUEST]\n${input}`,
        `[SEARCH QUERY]\n${researchQuery}`,
        webContext || '[No web context available]',
        attachedSourceContext,
        xContext || '[No X evidence available]',
      ]
        .filter(Boolean)
        .join('\n\n'),
      schema: z.object({
        verified_facts: z.array(z.string()).describe("ข้อเท็จจริงที่ได้รับการยืนยันจากแหล่งข้อมูล ถ่ายทอดเป็นประโยคชัดเจน"),
        open_questions: z.array(z.string()).describe("ประเด็นที่ยังไม่แน่ชัด ขัดแย้งกัน หรือรอการยืนยัน"),
        community_signal: z.string().describe("กระแสตอบรับหรือมุมมองจากชุมชนชาว X สั้นๆ"),
        must_not_claim: z.array(z.string()).describe("สิ่งที่ห้ามเคลมหรือห้ามเขียนเด็ดขาดเนื่องจากไม่มีข้อมูลยืนยัน"),
        named_entities: z.array(z.string()).describe("ชื่อบุคคล/องค์กร/สถานที่ ที่เกี่ยวข้องตัองพิมพ์ให้ถูกต้อง")
      }),
    });

    const factSheet = JSON.parse(JSON.stringify(factSheetObj));
    const factSheetText = `[VERIFIED FACTS]\n${factSheet.verified_facts.map(f => `- ${f}`).join('\n')}\n\n[OPEN QUESTIONS]\n${factSheet.open_questions.map(f => `- ${f}`).join('\n')}\n\n[COMMUNITY SIGNAL]\n${factSheet.community_signal}\n\n[MUST NOT CLAIM]\n${factSheet.must_not_claim.map(f => `- ${f}`).join('\n')}\n\n[KEY ENTITIES]\n${factSheet.named_entities.join(', ')}`;

    const finalSources = dedupeSources([...extractedSources]).slice(0, 8);

    const resultPayload = {
      factSheet: factSheetText,
      sources: finalSources,
    };

    return setCachedValue(responseCache, cacheKey, resultPayload, FACT_CACHE_TTL_MS);
  } catch (error) {
    console.error('[GrokService] FactSheet generation error:', error);
    throw error;
  }
};

export const generateStructuredContent = async (
  factSheet,
  length,
  tone,
  format,
  onStreamChunk,
  options = {},
) => {
  const { allowEmoji = false } = options;
  const lengthInstruction = getLengthInstruction(length);

  const draftSystemPrompt = `คุณคือนักเขียนภาษาไทยมืออาชีพ
เขียนโดยอ้างอิงจากข้อมูลข้อเท็จจริง (Fact Sheet) ที่ให้มาเท่านั้น

รูปแบบที่ต้องการ: ${format}
โทนสีของเนื้อหา: ${tone}
ความยาว: ${lengthInstruction}

กฎ:
1. ห้ามสร้างข้อเท็จจริง, ตัวเลข, ชื่อ, ช่วงเวลา หรือคำพูดขึ้นมาเอง
2. คงชื่อเฉพาะภาษาอังกฤษไว้เป็นภาษาอังกฤษ
3. ห้ามใส่ URL ของแหล่งข้อมูลลงในเนื้อหาหลัก
4. หากข้อมูลหลักฐานขัดแจ้งกัน ให้ใช้การเลือกใช้คำที่ระมัดระวัง
5. สำหรับเนื้อหาสั้น ไม่ต้องใส่หัวข้อหลัก
6. สำหรับเนื้อหาปานกลางและยาว ให้ใช้ Markdown หัวข้อ (Headings) และจบด้วย "## บทสรุป"
7. กฎการระบุชื่อ (@handle): สามารถระบุชื่อบัญชีที่มีชื่อเสียง, มีผู้ติดตามสูง, มียอดเอนเกจเม้นท์สูงมาก หรือเป็นต้นทางข้อมูลเท่านั้น ส่วนบัญชีทั่วไปที่แชร์ต่อโดยไม่มีอิมแพค ให้สรุปเป็นภาพรวมว่าเป็นกระแสจากชุมชนแทนการระบุชื่อรายคน`;

  const draftUserPrompt = `[FACT SHEET]\n${factSheet}\n\nWrite the final Thai content now.`;

  if (onStreamChunk) {
    try {
      const { textStream } = await streamText({
        model: grok(MODEL_WRITER),
        system: draftSystemPrompt,
        prompt: draftUserPrompt,
        temperature: 0.7,
        topP: 0.85,
        frequencyPenalty: 0.35,
        presencePenalty: 0.1,
      });

      let fullContent = '';
      for await (const textPart of textStream) {
        fullContent += textPart;
        onStreamChunk(cleanGeneratedContent(fullContent, { allowEmoji }));
      }

      return cleanGeneratedContent(fullContent, { allowEmoji });
    } catch (error) {
      console.error('[GrokService] Streaming error:', error);
      throw error;
    }
  }

  const contentDraft = await callGrok({
    modelName: MODEL_WRITER,
    system: draftSystemPrompt,
    prompt: draftUserPrompt,
    temperature: 0.7,
    topP: 0.85,
    frequencyPenalty: 0.35,
    presencePenalty: 0.1,
    allowEmoji,
  });

  try {
    const { object: evalResult } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `ตรวจสอบว่าร่างเนื้อหานี้ยังคงรักษาความถูกต้องตามข้อมูลข้อเท็จจริง (Fact Sheet) หรือไม่
ส่งค่า passed=true เฉพาะเมื่อร่างเนื้อหานี้อ้างอิงจากข้อเท็จจริงและมีโทนที่ถูกต้องเท่านั้น
ถ้าไม่ผ่าน ให้ระบุเหตุผลสั้นๆ`,
      prompt: `[FACT SHEET]\n${factSheet}\n\n[DRAFT]\n${contentDraft}`,
      schema: z.object({
        passed: z.boolean(),
        reason: z.string().optional(),
      }),
    });

    if (!evalResult.passed) {
      return cleanMarkdown(
        await callGrok({
          modelName: MODEL_WRITER,
          system: draftSystemPrompt,
          prompt: `[ข้อมูลข้อเท็จจริง]\n${factSheet}\n\n[ร่างเนื้อหาปัจจุบัน]\n${contentDraft}\n\n[ข้อเสนอแนะจากบรรณาธิการ]\n${
            evalResult.reason || 'กรุณาปรับปรุงความถูกต้องและโทนของเนื้อหา'
          }\n\nกรุณาเขียนเนื้อหาใหม่เพื่อให้สอดคล้องกับข้อเท็จจริงทั้งหมด`,
          temperature: 0.4,
          allowEmoji,
        }),
      );
    }
  } catch (error) {
    console.warn('[GrokService] Editor pass skipped:', error);
  }

  return cleanGeneratedContent(contentDraft, { allowEmoji });
};

export const generateStructuredContentV2 = async (
  factSheet,
  length,
  tone,
  format,
  onStreamChunk,
  options = {},
) => {
  const { allowEmoji = false, customInstructions = '' } = options;
  const isViralTone = tone === 'กระตือรือร้น/ไวรัล';
  const prefersConversationalViralFlow = shouldPreferConversationalViralFlow(tone, format);
  const writerTemperature = isViralTone ? 0.85 : 0.7;
  const writerFrequencyPenalty = isViralTone ? 0.15 : 0.35;
  const lengthInstruction = getLengthInstruction(length);
  const profile = buildFormatProfile(format);
  const brief = await buildContentBrief({ factSheet, length, tone, format, customInstructions });
  const activeFactSheet = compressFactSheetForFormat(factSheet, format);

  const draftSystemPrompt = `<global_system_instruction>
คุณคือ Copywriter ตัวท็อปของไทยที่เชี่ยวชาญการเขียนคอนเทนต์และโพสต์ Social Media หน้าที่ของคุณคือการดึงดูดคนอ่านตั้งแต่บรรทัดแรก โดยต้องใช้หลักการ Bento-Box Prompting ในการรับคำสั่ง
</global_system_instruction>

<tone_of_voice>
- ${TONE_GUIDES[tone] || tone}
${tone === 'กระตือรือร้น/ไวรัล'
  ? `- โทนนี้อนุญาตให้มีพลังงานสูง สร้าง FOMO และความตื่นเต้นได้ ตราบใดที่มีข้อเท็จจริงรองรับ ไม่จำเป็นต้อง "สุภาพ" หรือ "ระมัดระวัง" มากเกินไป${prefersConversationalViralFlow ? ' และควรให้น้ำหนักกับความเป็นธรรมชาติ จังหวะภาษา และอารมณ์ของโพสต์มากกว่าน้ำเสียงแบบรายงาน' : ''}`
  : '- เป็นมืออาชีพแต่ไม่ก้าวร้าว มั่นใจแต่ไม่โอ้อวด (Professional but not aggressive, confident but not boastful).'}
- ห้ามใช้คำศัพท์ที่เป็นทางการเกินไป (Corporate jargon) หรือสำนวนที่แปลตรงตัวจากภาษาอังกฤษ
</tone_of_voice>

<rules_and_constraints>
1. ห้ามใช้โครงสร้างประโยคแบบแปลกๆ (Thai-glish): เช่น "มันเป็นสิ่งสำคัญที่..." ให้เปลี่ยนเป็น "สิ่งสำคัญคือ..."
2. การเว้นวรรค: ภาษาไทยไม่เว้นวรรคระหว่างคำ แต่เว้นวรรคเมื่อจบประโยค หรือต้องการแยกไอเดีย
3. ความกระชับ: ตัดคำฟุ่มเฟือยทิ้งให้หมด สื่อสารตรงประเด็น
4. การใช้ Emoji: ใช้ประกอบพองาม (ไม่เกิน 3-4 ตัวต่อโพสต์)
5. การสลับรหัสภาษา (Code-Switching): คงคำศัพท์ทางเทคนิคไว้ (เช่น แคมเปญ, ฟีเจอร์) แต่ใช้ไวยากรณ์และโครงสร้างประโยคแบบภาษาไทยธรรมชาติ
${format === 'สคริปต์วิดีโอสั้น'
  ? '6. คำลงท้าย (Sentence Particles): วิดีโอสคริปต์ต้องใช้คำลงท้ายพูด (เช่น ครับ/ค่ะ, นะ/น้า, สิ/ซะ) เพื่อให้เหมือนคนพูดจริงๆ และมีจังหวะหายใจ'
  : tone === 'กระตือรือร้น/ไวรัล' || tone === 'เป็นกันเอง/เพื่อนเล่าให้ฟัง'
    ? '6. คำลงท้าย (Sentence Particles): โทนนี้ให้ใช้คำลงท้ายได้ตามธรรมชาติ (เช่น นะ/น้า/สิ/ซะ/เลย) เพื่อสร้าง energy และความใกล้ชิดกับผู้อ่าน'
    : '6. คำลงท้าย (Sentence Particles): งานเขียนเพจทั่วไปให้หลีกเลี่ยงคำลงท้าย (เช่น ครับ/ค่ะ, นะ) เพื่อความเป็นมืออาชีพและกระชับ'}
7. NO DICTIONARY PAIRS. Choose either English or Thai for a term. Never write "Artificial Intelligence (ปัญญาประดิษฐ์)".
8. STRICT LANGUAGE RULE: ระวังการหลอนภาษาต่างประเทศ (Hallucination) ให้ใช้เฉพาะภาษา "ไทย" (Thai) และตัวอักษร "ภาษาอังกฤษ" (English) สำหรับคำทับศัพท์เท่านั้น ห้ามพิมพ์ภาษาจีน, ญี่ปุ่น, เกาหลี หรือ รัสเซีย เด็ดขาด (หากเจอใน Fact Sheet ให้สกัดเอาเฉพาะความหมายมาเขียนเป็นภาษาไทย)
9. PERSPECTIVE RULE: คุณคือ "ผู้สร้างคอนเทนต์ต้นทาง" (Original Creator) ห้ามเขียนในเชิงรายงานข่าวว่า "โพสต์ของ X บอกว่า..." หรือ "X รายงานว่า..." ให้นำข้อมูลมาเล่าด้วยมุมมองที่มั่นใจ รู้จริง และเล่าเรื่องโดยตรงไปที่ผู้อ่านแทน
10. NO FAKE THAI IDIOMS: ห้ามประดิษฐ์สำนวนภาษาไทยที่ไม่แน่ใจว่ามีจริง — ถ้าไม่มั่นใจ 100% ว่าสำนวนนั้นคนไทยใช้จริงในชีวิตประจำวัน ให้เขียนตรงๆ ด้วยภาษาธรรมดาแทน ดีกว่าใช้สำนวนปลอมที่ฟังดูแปลก
11. NATURAL CODE-SWITCHING ONLY: คำภาษาอังกฤษที่ผสมได้ต้องเป็นคำที่คนไทยใช้ในชีวิตจริง เช่น "เซ็ต", "เทรนด์", "ฟีเจอร์" — ห้ามแปะคำอังกฤษกลางประโยคแบบสุ่ม เช่น "มันเป็น killer เลยนะ" หรือ "เจอ reality check ซะแล้ว" ถ้าฟังไม่เป็นธรรมชาติ ให้แทนด้วยภาษาไทยล้วน
${prefersConversationalViralFlow ? '12. TONE REWRITE RULE: ถ้าผู้ใช้เลือกโทนกระตือรือร้นหรือไวรัลในรูปแบบโพสต์ แต่ร่างยังฟังเหมือนรายงานข่าวเกินไป ให้เรียบเรียงใหม่ให้เหมือนคนเล่าจริงโดยคงประเด็นสำคัญไว้' : ''}
</rules_and_constraints>

<tasks>
1. Think and outline the logical structure and core message internally first (Chain of Thought).
2. Separate verified facts from interpretation or community reaction.
3. If uncertainty exists, state it plainly and briefly.
4. Name people or accounts (@handle) only if they are highly influential (high followers/engagement), famous, or materially matter to the story. Never list random low-impact reposters.
5. Write the final output in beautiful, natural Thai.
</tasks>

<few_shot_examples>
❌ BAD — unnatural idioms, forced slang, awkward English mid-sentence:
"Nintendo ตัดผลิตไปเลย 33%! ขายดีเป็นเทน้าเท่า แต่กลับเจอ reality check แบบนี้ซะได้ มันเป็น killer ของปีนี้แท้ๆ สั่นสะเทือนวงการขัดๆ นะ"

✅ GOOD — plain Thai, English only for proper nouns/tech, measured tone, uses ครับ:
"Nintendo ตัดกำลังผลิต Switch 2 ลง 33% จาก 6 ล้านเครื่องเหลือ 4 ล้าน เหตุเพราะยอดขายในตลาด US อ่อนแอกว่าที่คาด โดยเฉพาะช่วง holiday sales ที่ไม่ได้ตามเป้า Bloomberg กับ IGN รายงานข่าวนี้ แต่ Nintendo ยังไม่ยืนยันอย่างเป็นทางการครับ"

✅ GOOD — informative, factual, ends with specific topic question (not generic CTA):
"Capcom ยืนยันชัดเจนครับว่าจะไม่เอา asset ที่ generative AI สร้างไปใส่ในตัวเกมจริง แต่จะใช้ AI ช่วยงาน backend อย่างการ brainstorm และ prototype design documents แทน ท่าทีนี้ต่างจาก studio หลายเจ้าที่กำลังทดลองใช้ AI ในงาน visual โดยตรงครับ"
</few_shot_examples>`;

  const draftUserPrompt = [
    `<format_rules>\nFormat: ${format} (${profile.label})\nLength: ${lengthInstruction}\nStructure: ${profile.structure}\nGoals: ${profile.goals}\nWriting skill for this format: ${profile.skill || ''}\n</format_rules>`,
    `<structured_brief>\n${JSON.stringify(brief, null, 2)}\n</structured_brief>`,
    `<fact_sheet>\n${activeFactSheet}\n</fact_sheet>`,
    `<extra_instructions>\n${customInstructions || 'None'}\n</extra_instructions>`,
    'Write the final Thai content now.',
  ].join('\n\n');

  if (onStreamChunk) {
    try {
      const { textStream } = await streamText({
        model: grok(MODEL_WRITER),
        system: draftSystemPrompt,
        prompt: draftUserPrompt,
        temperature: writerTemperature,
        topP: 0.85,
        frequencyPenalty: writerFrequencyPenalty,
        presencePenalty: 0.1,
        abortSignal: options.signal,
      });

      let fullContent = '';
      for await (const textPart of textStream) {
        fullContent += textPart;
        onStreamChunk(polishThaiContent(fullContent, { format, customInstructions, allowEmoji, tone }));
      }

      return { content: polishThaiContent(fullContent, { format, customInstructions, allowEmoji, tone }), titleIdea: brief.titleIdea };
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('[GrokService] Streaming error (v2), falling back to non-streaming:', error);
      const fallbackDraft = await callGrok({
        modelName: MODEL_WRITER,
        system: draftSystemPrompt,
        prompt: draftUserPrompt,
        temperature: writerTemperature,
        topP: 0.85,
        frequencyPenalty: writerFrequencyPenalty,
        presencePenalty: 0.1,
        allowEmoji,
      });
      const fallbackResult = polishThaiContent(fallbackDraft, { format, customInstructions, allowEmoji, tone });
      onStreamChunk(fallbackResult);
      return { content: fallbackResult, titleIdea: brief.titleIdea };
    }
  }

  const contentDraft = await callGrok({
    modelName: MODEL_WRITER,
    system: draftSystemPrompt,
    prompt: draftUserPrompt,
    temperature: writerTemperature,
    topP: 0.85,
    frequencyPenalty: writerFrequencyPenalty,
    presencePenalty: 0.1,
    allowEmoji,
  });

  try {
    const { object: evalResult } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: `Evaluate whether the Thai draft is grounded, natural, and appropriate for the requested format.
Set passed=true only if:
- it stays faithful to the fact sheet
- it matches the requested tone${tone === 'กระตือรือร้น/ไวรัล' ? ` (high energy and impactful language is EXPECTED and correct for this tone — do NOT penalize for strong language if facts support it${prefersConversationalViralFlow ? ', but fail the draft if it still reads like a stiff news recap instead of a natural human post' : ''})` : ' without overclaiming'}
- it does not read like generic AI copy
- it respects heading and CTA expectations for the format
- it names people only when their identity or influence materially matters`,
      prompt: `[FORMAT]\n${format}\n\n[TONE]\n${tone}\n\n[FACT SHEET]\n${activeFactSheet}\n\n[BRIEF]\n${JSON.stringify(brief, null, 2)}\n\n[DRAFT]\n${contentDraft}`,
      schema: z.object({
        passed: z.boolean(),
        reason: z.string().optional(),
      }),
    });

    if (!evalResult.passed) {
      const revisedDraft = await callGrok({
        modelName: MODEL_WRITER,
        system: draftSystemPrompt,
        prompt: `[FACT SHEET]\n${activeFactSheet}\n\n[BRIEF]\n${JSON.stringify(brief, null, 2)}\n\n[CURRENT DRAFT]\n${contentDraft}\n\n[EDITOR FEEDBACK]\n${
          evalResult.reason || 'Improve accuracy, tone, and natural Thai flow.'
        }\n\nRewrite the content now.${prefersConversationalViralFlow ? '\nFor this tone and format, keep the energy but make the writing feel more human and less like a news report.' : ''}`,
        temperature: 0.4,
        allowEmoji,
      });

      return { content: polishThaiContent(revisedDraft, { format, customInstructions, allowEmoji, tone }), titleIdea: brief.titleIdea };
    }
  } catch (error) {
    console.warn('[GrokService] Editor pass skipped (v2):', error);
  }

  return { content: polishThaiContent(contentDraft, { format, customInstructions, allowEmoji, tone }), titleIdea: brief.titleIdea };
};

export const generateFinalContent = async (enrichedData, targetFormat, customPrompt = '') => {
  try {
    return await callGrok({
      modelName: MODEL_MULTI_AGENT,
      system: `สร้างผลงานเนื้อหาภาษาไทยที่ขัดเกลาแล้วในรูปแบบของ "${targetFormat}"
อ้างอิงจากข้อมูลวิจัยที่ให้มาเท่านั้น โดยระบุชื่อบัญชี (@handle) เฉพาะคนที่มีชื่อเสียง, มีเอนเกจเม้นท์สูง, มีผู้ติดตามมาก หรือเป็นต้นทางข้อมูลสำคัญเท่านั้น บัญชีที่แค่รีโพสต์ต่อกันโดยไม่มีอิมแพคไม่ต้องระบุชื่อแต่ให้สรุปเป็นภาพรวมแทน
`,
      prompt: `[RESEARCH]\n${enrichedData}\n\n[EXTRA INSTRUCTIONS]\n${customPrompt || 'None'}`,
    });
  } catch (error) {
    console.warn('[GrokService] Multi-agent fallback triggered:', error);
    return callGrok({
      modelName: MODEL_WRITER,
      system: `Create a polished Thai piece in the format "${targetFormat}".
Stay grounded in the provided material only.`,
      prompt: `[RESEARCH]\n${enrichedData}\n\n[EXTRA INSTRUCTIONS]\n${customPrompt || 'None'}`,
    });
  }
};

export const generateContentArticle = generateFinalContent;
export const generateArticle = generateFinalContent;
