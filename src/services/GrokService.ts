// @ts-nocheck
import { createXai } from '@ai-sdk/xai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { curateSearchResults, searchEverything, fetchTweetById } from './TwitterService';
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
    .replace(/—/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
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

const SOURCE_TRUST_TIERS = {
  highest: [
    'reuters.com',
    'apnews.com',
    'bloomberg.com',
    'ft.com',
    'wsj.com',
    'nytimes.com',
    'theguardian.com',
    'bbc.com',
    'bbc.co.uk',
    'cnn.com',
    'cnbc.com',
    'forbes.com',
    'businessinsider.com',
    'theverge.com',
    'techcrunch.com',
    'ign.com',
    'gamespot.com',
    'polygon.com',
    'eurogamer.net',
    'gematsu.com',
    'nintendo.com',
    'sony.com',
    'playstation.com',
    'xbox.com',
    'microsoft.com',
    'steampowered.com',
    'ea.com',
    'ubisoft.com',
    'capcom.com',
    'sega.com',
  ],
  medium: ['yahoo.com', 'finance.yahoo.com', 'investing.com', 'usnews.com'],
  low: ['reddit.com', 'youtube.com', 'youtu.be', 'cookpad.com', 'eventbanana.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'x.com', 'twitter.com'],
};

const getHostname = (url = '') => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

const matchesDomainTier = (hostname = '', domains = []) =>
  domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));

const tokenizeTopicText = (value = '', minLength = 4, limit = 12) =>
  Array.from(new Set(normalizeCacheText(value).toLowerCase().match(new RegExp(`[a-z0-9\\u0E00-\\u0E7F]{${minLength},}`, 'g')) || [])).slice(0, limit);

const extractUrlSlugTokens = (url = '', limit = 12) => {
  try {
    const pathname = new URL(url).pathname
      .replace(/[-_/]+/g, ' ')
      .replace(/\b\d{4}\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return tokenizeTopicText(pathname, 4, limit);
  } catch {
    return [];
  }
};

const getPrimaryLeadTokens = ({ primaryLeadUrl = '', primaryLeadTitle = '' } = {}) => {
  const titleTokens = tokenizeTopicText(primaryLeadTitle, 4, 12);
  const slugTokens = extractUrlSlugTokens(primaryLeadUrl, 12);
  return Array.from(new Set([...titleTokens, ...slugTokens])).slice(0, 12);
};

const buildStrictPrimarySourceContext = (label, response, sourceUrl, primaryLeadTitle = '') => {
  if (!response) return '';

  const primaryTokens = getPrimaryLeadTokens({ primaryLeadUrl: sourceUrl, primaryLeadTitle });
  const primaryHostname = getHostname(sourceUrl);
  const strictResults = (Array.isArray(response.results) ? response.results : [])
    .filter((result) => {
      const hostname = getHostname(result?.url || '');
      const normalizedTitle = normalizeCacheText(result?.title || '').toLowerCase();
      const sharedTitleTokens = primaryTokens.filter((token) => normalizedTitle.includes(token)).length;
      const isExactLead = result?.url === sourceUrl;
      const isLeadDomain = hostname === primaryHostname;
      const isTrusted = matchesDomainTier(hostname, SOURCE_TRUST_TIERS.highest);
      return isExactLead || isLeadDomain || (isTrusted && sharedTitleTokens >= 3);
    })
    .slice(0, 3);

  return [
    `[${label} SOURCE URL]\n${sourceUrl}`,
    strictResults.length
      ? `[${label} VERIFIED SNIPPETS]\n${strictResults
          .map((result, index) => {
            const snippet = sanitizeForPrompt(result.raw_content || result.content || '', 500);
            return `${index + 1}. ${result.title || result.url} - ${snippet} (${result.url})`;
          })
          .join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};

const scoreSourceQuality = (source = {}, { primaryLeadUrl = '', researchQuery = '', input = '' } = {}) => {
  const hostname = getHostname(source?.url || '');
  const title = normalizeCacheText(source?.title || '').toLowerCase();
  const combinedText = `${title} ${hostname}`;
  const primaryHostname = getHostname(primaryLeadUrl);
  const queryTokens = tokenizeTopicText(`${researchQuery} ${input}`, 3, 12);

  let score = 0;

  if (!hostname) score -= 20;
  if (primaryHostname && hostname === primaryHostname) score += 80;

  if (matchesDomainTier(hostname, SOURCE_TRUST_TIERS.highest)) score += 40;
  else if (matchesDomainTier(hostname, SOURCE_TRUST_TIERS.medium)) score += 18;
  else if (matchesDomainTier(hostname, SOURCE_TRUST_TIERS.low)) score -= 25;

  const tokenHits = queryTokens.filter((token) => combinedText.includes(token)).length;
  score += tokenHits * 4;

  if (/official|press release|statement|reuters/i.test(combinedText)) score += 10;
  if (/recipe|ice break|icebreak|event|walkthrough|guide/i.test(combinedText)) score -= 25;

  return score;
};

const rankAndFilterSources = (sources = [], options = {}) => {
  const scored = dedupeSources(sources)
    .map((source) => ({
      ...source,
      _score: scoreSourceQuality(source, options),
      _hostname: getHostname(source.url),
    }))
    .filter((source) => source._score >= 8);

  const hasHighTrustLead = scored.some((source) => matchesDomainTier(source._hostname, SOURCE_TRUST_TIERS.highest));
  const filtered = hasHighTrustLead
    ? scored.filter((source) => matchesDomainTier(source._hostname, SOURCE_TRUST_TIERS.highest) || source._score >= 40)
    : scored;

  return filtered
    .sort((a, b) => b._score - a._score)
    .map(({ _score, _hostname, ...source }) => source)
    .slice(0, 6);
};

const getPrimaryLeadAwareSources = (sources = [], { primaryLeadUrl = '', primaryLeadTitle = '' } = {}) => {
  if (!primaryLeadUrl) return rankAndFilterSources(sources, {});

  const primaryHostname = getHostname(primaryLeadUrl);
  const normalizedPrimaryTitle = normalizeCacheText(primaryLeadTitle).toLowerCase();
  const primaryTokens = getPrimaryLeadTokens({ primaryLeadUrl, primaryLeadTitle });

  const filtered = dedupeSources(sources)
    .map((source) => {
      const hostname = getHostname(source.url);
      const normalizedTitle = normalizeCacheText(source.title || '').toLowerCase();
      const sharedTitleTokens = primaryTokens.filter((token) => normalizedTitle.includes(token)).length;
      const isExactLead = source.url === primaryLeadUrl;
      const isLeadDomain = hostname === primaryHostname;
      const isTrustedSyndication = matchesDomainTier(hostname, SOURCE_TRUST_TIERS.highest);
      const keep = isExactLead || isLeadDomain || (isTrustedSyndication && sharedTitleTokens >= 3);

      return {
        source,
        keep,
        score: scoreSourceQuality(source, { primaryLeadUrl, researchQuery: normalizedPrimaryTitle, input: normalizedPrimaryTitle }) + sharedTitleTokens * 8,
      };
    })
    .filter((entry) => entry.keep)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.source);

  return filtered.slice(0, 6);
};

const strengthenPrimaryLeadFactSheet = (factSheet = {}, primaryLeadUrl = '') => {
  const safeFallback = {
    verified_facts: [],
    reported_claims: [],
    open_questions: [],
    community_signal: '',
    must_not_claim: [],
    named_entities: [],
  };
  const next = {
    ...safeFallback,
    ...factSheet,
  };

  const riskyInferencePattern = /(ผลกระทบต่อผู้บริโภค|ความปลอดภัยผู้บริโภค|การส่งมอบ|การจัดส่ง|ขาดแคลน|ของปลอม|ตรวจรหัส|เช็กรหัส|batch code|แรงจูงใจ|เจตนา|ป้องกันการโจมตีซ้ำ|ไม่มีร่องรอย|ติดตามได้ทั้งหมด|บน x|ใน x|ผู้ใช้บน x|ชาวเน็ต|โซเชียลสงสัย|เป็นแคมเปญ)/i;
  next.verified_facts = dedupeByNormalizedText(next.verified_facts.filter((fact) => !riskyInferencePattern.test(fact)));
  next.reported_claims = dedupeByNormalizedText(next.reported_claims.filter((claim) => !riskyInferencePattern.test(claim))).slice(0, 4);
  next.community_signal = '';
  next.must_not_claim = dedupeByNormalizedText([
    ...next.must_not_claim,
    'ห้ามสรุปผลกระทบต่อผู้บริโภคหรือการส่งมอบ ถ้าต้นทางไม่ได้ระบุชัด',
    'ห้ามเดาแรงจูงใจ มาตรการภายใน หรือรายละเอียดแวดล้อมที่ต้นทางไม่ได้ยืนยัน',
    primaryLeadUrl ? `ห้ามเขียนเกินกว่าสิ่งที่ยืนยันได้จาก ${primaryLeadUrl}` : 'ห้ามเขียนเกินกว่าสิ่งที่ยืนยันได้จากต้นทาง',
  ]);
  next.open_questions = dedupeByNormalizedText(next.open_questions).slice(0, 5);
  next.named_entities = dedupeByNormalizedText(next.named_entities).slice(0, 8);

  return next;
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
    allowCta: false,
    boldHeadline: false,
    structure: 'ความยาวยืดหยุ่นตามเนื้อหา — ย่อหน้าเดียว, 2-3 ย่อหน้า, หรือเปิดด้วยบรรทัดนำก็ได้ ถ้าเรื่องสั้นมากไม่ต้องฝืนแตก ห้ามขึ้นต้นด้วย "ในยุคที่...", "ปฏิเสธไม่ได้ว่า...", "เชื่อหรือไม่...", หรือประโยค context-setting ที่ไม่จำเป็น ประโยคแรกต้องเป็นประเด็นหลักทันที',
    goals: 'เขียนเหมือนคนไทยที่เข้าใจเรื่องกำลังเล่าให้ฟัง ไม่ใช่ AI กำลัง summarize ข่าว เปิดตรงประเด็น เนื้อหาเดินหน้าด้วยข้อมูลที่เฉพาะเจาะจง ไม่ใช่ adjective ทั่วๆ ไป หลีกเลี่ยงโครงสร้างประโยคซ้ำๆ และประโยคปิดที่ฝืนให้ดูคม',
    skill: 'ทดสอบด้วยคำถาม: "คนที่ scroll ผ่านจะหยุดอ่านไหม?" — ถ้าประโยคแรกไม่ตอบ yes ให้เขียนใหม่ ตัวเลขและชื่อเฉพาะ เป็น hook ที่ดีกว่าคำโฆษณา ความ specific เสมอดีกว่าความ general',
  },
  'สคริปต์วิดีโอสั้น': {
    label: 'short-form video script',
    allowHeadings: false,
    allowCta: false,
    boldHeadline: true,
    structure: 'เริ่มด้วย **[Hook Line]** หนึ่งบรรทัด จากนั้นแบ่งเป็น 3 ส่วนชัดเจน:\n[HOOK — 3-5 วิ]: ประโยคเดียวที่ทำให้คนไม่เลื่อนผ่าน\n[เนื้อหาหลัก]: เล่าเป็นก้อนๆ ประโยคละ 8-12 คำ มีจังหวะหายใจ\n[ปิดจบ]: ข้อสรุปหรือ insight สั้นๆ ที่จำได้\nไม่ใช้ markdown heading ระหว่างส่วน',
    goals: 'อ่านออกเสียงแล้วต้องฟังเป็นธรรมชาติ ไม่ใช่อ่านบทความ ใช้คำลงท้ายพูด (ครับ/นะ/น้า) สร้างจังหวะ hook 3 วินาทีแรกต้องดึงให้หยุดได้จริง ทดสอบโดยอ่านออกเสียง — ถ้าสะดุด แสดงว่าต้องแก้',
    skill: 'เขียนเพื่อหู ไม่ใช่ตา — ประโยคที่ดูดีบนกระดาษแต่พูดแล้วงุ่มง่ามต้องตัดออก ความเงียบ (line break) คือ pause ที่ช่วยเน้น ใช้มันเป็นเครื่องมือ',
  },
  'บทความ SEO / บล็อก': {
    label: 'blog article',
    allowHeadings: true,
    allowCta: false,
    boldHeadline: false,
    structure: 'บรรทัดแรกเป็น # H1 ที่บอกว่าบทความนี้เกี่ยวกับอะไรและผู้อ่านได้อะไร ย่อหน้านำ (lede) สรุปประเด็นสำคัญก่อนขยายความ (inverted pyramid) ใช้ ## subheading เฉพาะเมื่อเนื้อหาต่างจุดประสงค์กันชัดเจน แต่ละ section ต้องมีน้ำหนักพอที่จะยืนเองได้ ไม่ใช่ subheading + 2 ประโยค',
    goals: 'ผู้อ่านอ่านจบแล้วรู้สึกว่าได้ความรู้จริงๆ และไม่เสียเวลา — information density สูง ไม่มี padding ข้อมูลแม่นยำและอ้างอิงได้ ภาษาเป็นทางการแต่ไม่แข็ง อธิบายสิ่งที่ซับซ้อนให้เข้าใจง่ายโดยไม่ลดความถูกต้อง',
    skill: 'H1 ที่ดีต้องมี keyword และ benefit ในประโยคเดียว lede ที่ดีทำให้คนอยากอ่านต่อ ย่อหน้าที่ดีมี topic sentence ชัดเจน ไม่เกิน 5-6 บรรทัด ปิดด้วย takeaway ที่จำได้ ไม่ใช่ "สรุปดังกล่าว"',
  },
  'โพสต์ให้ความรู้ (Thread)': {
    label: 'thread',
    allowHeadings: false,
    allowCta: false,
    boldHeadline: false,
    structure: 'เปิดด้วย hook ที่บอกว่าจะเรียนรู้อะไร หรือเข้าประเด็นทันทีก็ได้ถ้าข้อมูลแข็งแรงพอ แบ่งเป็นช่วงความคิดที่แต่ละช่วงสมบูรณ์ในตัวเอง แต่ต่อเนื่องกัน ใช้ตัวเลขนำหน้าแต่ละช่วง (1/, 2/ หรือ •) ได้ถ้าช่วยให้ติดตามง่ายขึ้น ไม่บังคับ',
    goals: 'แต่ละช่วงต้องให้ข้อมูลหรือ insight ที่มีคุณค่าในตัวเอง ไม่ใช่แค่ teaser ให้อ่านต่อ ผู้อ่านค่อยๆ เข้าใจประเด็นที่ซับซ้อนผ่านข้อมูลจริง ไม่ใช่ผ่าน assertion หลีกเลี่ยงน้ำเสียงสอน หรือ "lesson #X คือ..." ที่ฟังดู template',
    skill: 'Thread ที่ดีอ่านแล้วรู้สึกว่าคนเขียนเข้าใจเรื่องจริงๆ ไม่ใช่แค่รวบรวมข้อมูล ทดสอบด้วยการอ่านแต่ละช่วงแยก: ถ้าแต่ละช่วงยังมีคุณค่าในตัวเอง thread นั้น work',
  },
};

const TONE_GUIDES = {
  'ให้ข้อมูล/ปกติ': `น้ำเสียงบรรณาธิการ — เขียนเหมือนนักข่าวที่เข้าใจเรื่องกำลังสรุปให้ฟัง ไม่ใช่ AI ที่กำลังรวบรวมข้อมูล
เทคนิคหลัก:
- เปิดด้วยข้อเท็จจริงที่สำคัญที่สุดทันที ไม่มีอารัมภบทหรือ context-setting ที่ไม่จำเป็น
- ใช้ประโยคกระชับ เรียงข้อมูลจากสำคัญมากไปน้อย (inverted pyramid)
- ตัวเลขและชื่อเฉพาะทำให้น่าเชื่อถือกว่าคำคุณศัพท์ เช่น "3.2 ล้านบาท" ดีกว่า "จำนวนมาก"
- ใช้ "ครับ" ได้ตามธรรมชาติ แต่ไม่จำเป็นต้องใช้ทุกย่อหน้า
- คำเชื่อมที่ดีมาจากเนื้อหา ไม่ใช่สูตร เช่น ห้าม "นั่นหมายความว่า..." "ซึ่งทำให้เราเห็นว่า..."
- ปิดด้วยบริบทหรือผลที่ตามมาที่ผู้อ่านอยากรู้ ไม่ใช่ summary ซ้ำๆ หรือ CTA`,

  'กระตือรือร้น/ไวรัล': `น้ำเสียงมีพลัง ดึงดูด — ความเร่งด่วนต้องมาจากข้อเท็จจริง ไม่ใช่คำโฆษณา
เทคนิคหลัก:
- ประโยคเปิดต้องทำให้คนหยุดเลื่อน feed ได้จริง: ใช้ตัวเลขที่น่าตกใจ, contrast ที่ชัดเจน, หรือคำถามที่คนสงสัยอยู่แล้ว
- สลับประโยคสั้น-ยาวเพื่อสร้างจังหวะ — ประโยคสั้นตามหลังข้อมูลสำคัญให้น้ำหนัก
- เลือกคำ "active voice" มากกว่า "passive" — "ทำลายสถิติ" ดีกว่า "สถิติถูกทำลาย"
- ความเร่งด่วนจริงๆ มาจากข้อเท็จจริงในเรื่อง ไม่ใช่คำเช่น "ต้องรู้!", "ด่วน!", "แชร์ทันที!"
- ห้ามเด็ดขาด: "นี่คือเหตุผลว่าทำไม...", "สิ่งที่คุณต้องรู้คือ...", "ไม่น่าเชื่อว่า...", "จับตาดูให้ดี"
- ปิดด้วยประโยคที่ทิ้งค้างได้จริง — ข้อเท็จจริงที่น่าคิดต่อ ไม่ใช่ "คิดยังไงคอมเมนต์มาได้เลย"`,

  'ทางการ/วิชาการ': `น้ำเสียงเป็นทางการ วิเคราะห์ อ้างอิงได้ — เหมาะกับผู้อ่านที่ต้องการความแม่นยำ
เทคนิคหลัก:
- สร้างข้อโต้แย้งเป็นลำดับ: premise → evidence → conclusion ในแต่ละย่อหน้า
- ใช้ hedging ที่ถูกต้อง: "ข้อมูลชี้ให้เห็นว่า...", "จากหลักฐานที่มี..." เมื่อยังไม่ยืนยัน 100%
- ระบุที่มาและบริบทของข้อมูล อย่าให้ตัวเลขลอยอยู่โดดๆ
- หลีกเลี่ยงคำแสลง, คำย่อ, และการเขียนแบบพูด
- อธิบายศัพท์เฉพาะทางเมื่อใช้ครั้งแรก อย่าสมมติว่าผู้อ่านรู้ทุกคำ
- ย่อหน้าแต่ละย่อต้องมี topic sentence ที่ชัดเจน
- งดแสดงความเห็นส่วนตัวที่ไม่มีหลักฐานรองรับ`,

  'เป็นกันเอง/เพื่อนเล่าให้ฟัง': `น้ำเสียงอบอุ่น ใกล้ชิด — เหมือนเพื่อนที่เชี่ยวชาญกำลังเล่าให้ฟังในคาเฟ่ ไม่ใช่อ่านรายงาน
เทคนิคหลัก:
- เขียนเหมือนคุยกับคนรู้จัก ใช้ "เรา" หรือ "เราๆ" ได้ตามความเหมาะสม
- ใช้ particle ตามธรรมชาติ: "นะ", "น้า", "อะ", "เนอะ" — เลือกตามบุคลิก อย่าใส่ทุกประโยค
- เล่าเรื่องด้วย personal framing — "ที่น่าสนใจคือ..." แทน "ข้อมูลระบุว่า..."
- ตั้งคำถามกับตัวเองแล้วตอบ ในแบบที่คนพูดจริงๆ ทำ
- ถ้าต้องใช้ศัพท์วิชาการ อธิบายด้วยภาษาง่ายทันทีหลังจากนั้น
- จบแบบธรรมชาติได้ — ไม่จำเป็นต้องมีข้อสรุปสวยงามหรือ moral of the story`,

  'ตลก/มีอารมณ์ขัน': `น้ำเสียงเบาสมอง มีมุก — แต่ข้อมูลต้องถูกต้อง และตลกต้องมาจากความจริง ไม่ใช่การพยายามตลก
เทคนิคหลัก:
- Comedy timing ในงานเขียนมาจาก setup → unexpected punchline — สร้างความคาดหวังแล้วหักมุมด้วยข้อเท็จจริง
- เรื่องจริงมักตลกกว่าเรื่องแต่ง: ตัวเลขที่ไม่น่าเชื่อ, contradiction ที่เกิดขึ้นจริง, irony ในข่าว
- Deadpan delivery: เล่าเรื่องน่าขำด้วยน้ำเสียงจริงจัง ได้ผลมากกว่าพยายามตลกออกนอกหน้า
- Self-aware humor ทำงานได้ดี เช่น "ใช่ครับ เรื่องจริง" หรือ "ไม่ได้ล้อเล่น"
- ห้ามมุกที่ต้องอธิบาย ถ้าต้องบอก "แค่ล้อเล่นนะ" แสดงว่ามุกไม่ work
- เล่นกับ contrast ระหว่างภาษาทางการกับภาษาพูดได้ผลดีในภาษาไทย`,

  'ดุดัน/วิจารณ์เชิงลึก': `น้ำเสียงตรงไปตรงมา วิเคราะห์เชิงลึก ไม่มีน้ำตาล — แต่ต้องมีหลักฐานรองรับทุกจุด
เทคนิคหลัก:
- เปิดด้วย thesis ที่ชัดเจน: กำลังวิจารณ์อะไร เพราะอะไร
- ใช้หลักฐานจาก fact sheet ขับเคลื่อนทุกข้อโต้แย้ง — ความดุดันที่ไม่มีข้อมูลคือแค่อารมณ์
- ระบุ contradiction, conflict of interest, หรือ pattern ที่น่าสังเกต
- ไม่ใช้ hedging ที่ไม่จำเป็น เช่น "อาจจะ..." เมื่อข้อมูลชัดเจนแล้ว
- ภาษาควรคมและตรง ไม่ใช่ aggressive เพื่อดูดุ
- ปิดด้วย implication ที่ชัดเจน: เรื่องนี้บอกอะไรกับเรา บทเรียนคืออะไร
- ห้าม: วิจารณ์โดยไม่มีหลักฐาน, hyperbole เกินข้อเท็จจริง`,

  'ฮาร์ดเซลล์/ขายของ': `น้ำเสียงโน้มน้าว มุ่งสู่ action — ทุกประโยคต้องทำงานเพื่อสร้าง desire หรือ remove objection
เทคนิคหลัก:
- เปิดด้วย pain point หรือ desire ที่ผู้อ่าน relate ได้จริง ไม่ใช่ "สินค้าของเราดีมาก"
- Benefit-driven: บอกว่า "ได้อะไร" และ "ชีวิตเปลี่ยนยังไง" ไม่ใช่แค่ "มีอะไร"
- ใช้ proof จาก fact sheet: ตัวเลขผลลัพธ์, การรับรอง, ข้อมูลจริง — เพิ่ม credibility ทันที
- Scarcity และ urgency ใส่ได้เฉพาะเมื่อมีจริงในข้อมูล ห้ามสร้างขึ้นเอง
- CTA ต้องชัดเจนและบอก next step เป็นรูปธรรม ไม่ใช่แค่ "สนใจติดต่อได้เลย"
- ลำดับที่ proven: Hook → Problem → Solution → Proof → CTA
- ห้าม superlatives ที่ไม่สามารถ back up ได้: "ดีที่สุด", "ไม่มีใครเทียบ"`,
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

const normalizeDisallowedHeadings = (text = '') =>
  text.replace(/^\s{0,3}#{1,6}\s+(.+)$/gm, '**$1**').replace(/\n{3,}/g, '\n\n').trim();

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

const ARTIFICIAL_THAI_PATTERNS = [
  // Original patterns
  /นี่แหละที่ทำให้/i,
  /เรียกว่าแทบ/i,
  /สุดยอดจริง/i,
  /แบบไม่ต้องกังวล/i,
  /บอกเลยว่า/i,
  /งานนี้มี/i,
  // Generic AI openers
  /^ในยุคที่/im,
  /^ปฏิเสธไม่ได้ว่า/im,
  /^เชื่อหรือไม่/im,
  /^ไม่ว่าจะ.*ก็ตาม/im,
  // Filler transitions
  /นั่นหมายความว่า/i,
  /ซึ่งทำให้เราเห็นว่า/i,
  /จะเห็นได้ว่า/i,
  /ที่สำคัญกว่านั้น/i,
  /ทั้งนี้ทั้งนั้น/i,
  /คงต้องบอกว่า/i,
  /นับว่าเป็น/i,
  // Weak intensifiers
  /น่าจับตามอง/i,
  /แบบจัดเต็ม/i,
  /เรียกได้ว่า/i,
  /มาดูกัน(?:ว่า|เลย|ดีกว่า)/i,
  // Hollow summary phrases
  /โดยรวมแล้ว.*ถือว่า/i,
  /สรุปได้ว่า.*ไม่ธรรมดา/i,
  /เรื่องนี้.*น่าสนใจ(?:มาก)?$/im,
  // Fake curiosity hooks
  /สิ่งที่หลายคนอาจไม่รู้/i,
  /ความจริงที่น่าตกใจ/i,
  /ทำไมถึงเป็นแบบนี้/i,
];

const countContentParagraphs = (text = '') =>
  String(text || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean).length;

const countShortParagraphs = (text = '') =>
  String(text || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && block.length <= 120).length;

const shouldForceNaturalRewrite = (text = '', { format = '', tone = '' } = {}) => {
  const normalized = normalizeCacheText(text);
  if (!normalized) return false;

  const hasArtificialPhrase = ARTIFICIAL_THAI_PATTERNS.some((pattern) => pattern.test(normalized));
  const paragraphCount = countContentParagraphs(text);
  const shortParagraphCount = countShortParagraphs(text);
  const looksOverSegmentedSocial =
    (format === 'โพสต์โซเชียล' || format === 'โพสต์ให้ความรู้ (Thread)') &&
    paragraphCount >= 4 &&
    shortParagraphCount >= 3;
  const suspiciousBoldHeadline = /^\s*\*\*[^*]+\*\*\s*\n\s*\n/.test(String(text || ''));
  const tooManyExclamations = (normalized.match(/!/g) || []).length >= 2;
  const shouldBeCalmer = tone === 'ให้ข้อมูล/ปกติ' || tone === 'ทางการ/วิชาการ';

  return hasArtificialPhrase || looksOverSegmentedSocial || suspiciousBoldHeadline || (shouldBeCalmer && tooManyExclamations);
};

const polishThaiContent = (text = '', { format, allowEmoji = false } = {}) => {
  const profile = buildFormatProfile(format);
  let nextText = cleanGeneratedContent(text, { allowEmoji });

  if (!profile.allowHeadings) {
    nextText = normalizeDisallowedHeadings(nextText);
  }

  nextText = nextText
    .replace(/!\?/g, '?')
    .replace(/!!+/g, '!!');

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

const CONTENT_INTENT_SCHEMA = z.object({
  primaryTopic: z.string().min(1).max(200),
  researchHint: z.string().min(1).max(200),
  framingAngle: z.string().min(1).max(240),
  rewrittenInstructions: z.string().min(1).max(500),
  explicitCtaAllowed: z.boolean(),
  forbidInteractiveDetours: z.boolean(),
  thaiPriority: z.boolean(),
});

const CONTENT_REVIEW_SCHEMA = z.object({
  passed: z.boolean(),
  groundingPassed: z.boolean(),
  thaiNaturalnessPassed: z.boolean(),
  sourceDisciplinePassed: z.boolean(),
  reason: z.string().optional(),
});

const SHORT_FORMAT_SET = new Set(['โพสต์โซเชียล', 'สคริปต์วิดีโอสั้น']);

const fallbackNormalizeContentIntent = ({ input = '', customInstructions = '' }) => {
  const baseInput = normalizeCacheText(input);
  const baseInstructions = normalizeCacheText(customInstructions);
  const combinedInstructions = `${baseInput} ${baseInstructions}`.trim();
  const explicitCtaAllowed = /cta|call to action|ชวนคอมเมนต์|ชวนแชร์|ชวนรีโพสต์|ฝากกด|ฝากติดตาม/i.test(combinedInstructions);
  const explicitInteractiveRequest = /(quiz|challenge|poll|game|กิจกรรม|เกม|โพล)/i.test(combinedInstructions);

  return {
    primaryTopic: baseInput || 'User topic',
    researchHint: baseInput || 'User topic',
    framingAngle: baseInstructions || 'Follow the user request without inventing extra framing',
    rewrittenInstructions: baseInstructions || 'Preserve the user request as written',
    explicitCtaAllowed,
    forbidInteractiveDetours: !explicitInteractiveRequest,
    thaiPriority: true,
  };
};

const isSimpleContentIntent = ({ input = '', customInstructions = '', sourceContext = '' } = {}) => {
  const normalizedInput = normalizeCacheText(input);
  const normalizedInstructions = normalizeCacheText(customInstructions);
  const normalizedSource = normalizeCacheText(sourceContext);
  const combined = `${normalizedInput} ${normalizedInstructions} ${normalizedSource}`;
  const hasUrl = /https?:\/\//i.test(combined);
  const hasComplexOperators = /(compare|vs\.?|versus|angle|framework|strategy|เชื่อมโยง|โยงกับ|เล่าแบบ|โทน|สไตล์|เหมือน|เทียบกับ)/i.test(combined);
  const hasInteractiveAsk = /(quiz|challenge|poll|game|กิจกรรม|เกม|โพล|ชวน)/i.test(normalizedInstructions);
  const totalLength = combined.length;

  return Boolean(normalizedInput) && totalLength <= 220 && !hasUrl && !hasComplexOperators && !hasInteractiveAsk;
};

const shouldSkipReviewPass = ({ format = '', tone = '', intentProfile = null, customInstructions = '', factSheet = '' } = {}) => {
  const normalizedInstructions = normalizeCacheText(customInstructions);
  const hasOpenQuestions = /\[OPEN QUESTIONS\]\n- /i.test(factSheet);
  const hasReportedClaims = /\[REPORTED CLAIMS\]\n- /i.test(factSheet);
  const isShortFormat = SHORT_FORMAT_SET.has(format);
  const isNonViralTone = tone !== 'กระตือรือร้น/ไวรัล';
  const hasLowRiskInstructions = normalizedInstructions.length <= 40;
  const noInteractiveRisk = intentProfile?.forbidInteractiveDetours !== false;

  return isShortFormat && isNonViralTone && hasLowRiskInstructions && noInteractiveRisk && !hasOpenQuestions && !hasReportedClaims;
};

export const normalizeContentIntent = async ({ input = '', customInstructions = '', sourceContext = '' } = {}) => {
  const cacheKey = buildCacheKey('content-intent', {
    input: normalizeCacheText(input),
    customInstructions: normalizeCacheText(customInstructions),
    sourceContext: normalizeCacheText(sourceContext).slice(0, 240),
  });
  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;

  if (isSimpleContentIntent({ input, customInstructions, sourceContext })) {
    return setCachedValue(responseCache, cacheKey, fallbackNormalizeContentIntent({ input, customInstructions }), CONTENT_BRIEF_CACHE_TTL_MS);
  }

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: `You normalize user intent for a Thai content-generation workflow.
Return JSON only.
Rules:
- Identify the real topic and the intended framing angle.
- Treat examples and casual wording as examples, not special triggers.
- Requests like "เชื่อมโยงกับ..." mean framing/comparison angle only unless the user explicitly asks for a game, quiz, challenge, poll, or activity.
- Default to Thai-first writing quality.
- CTA is allowed only when explicitly requested.
- Preserve user intent, but remove ambiguous instructions that could cause off-topic detours.`,
      prompt: `[USER INPUT]\n${input || 'None'}\n\n[CUSTOM INSTRUCTIONS]\n${customInstructions || 'None'}\n\n[SOURCE CONTEXT]\n${sourceContext || 'None'}`,
      schema: CONTENT_INTENT_SCHEMA,
      temperature: 0,
    });

    return setCachedValue(responseCache, cacheKey, object, CONTENT_BRIEF_CACHE_TTL_MS);
  } catch (error) {
    console.warn('[GrokService] Intent normalization fallback:', error);
    return setCachedValue(responseCache, cacheKey, fallbackNormalizeContentIntent({ input, customInstructions }), CONTENT_BRIEF_CACHE_TTL_MS);
  }
};

const compressFactSheetForFormat = (factSheetText = '', format = '') => {
  if (!SHORT_FORMAT_SET.has(format)) return factSheetText;
  const verifiedMatch = factSheetText.match(/\[VERIFIED FACTS\]\n([\s\S]*?)(?:\n\n\[|$)/);
  const reportedMatch = factSheetText.match(/\[REPORTED CLAIMS\]\n([\s\S]*?)(?:\n\n\[|$)/);
  const openMatch = factSheetText.match(/\[OPEN QUESTIONS\]\n([\s\S]*?)(?:\n\n\[|$)/);
  const verifiedFacts = verifiedMatch
    ? verifiedMatch[1].split('\n').filter(l => l.startsWith('- ')).slice(0, 4).join('\n')
    : '';
  const reportedClaims = reportedMatch
    ? reportedMatch[1].split('\n').filter(l => l.startsWith('- ')).slice(0, 2).join('\n')
    : '';
  // Keep top-2 open questions as a lite caution signal
  const openQuestions = openMatch
    ? openMatch[1].split('\n').filter(l => l.startsWith('- ')).slice(0, 2).join('\n')
    : '';
  const focusSummary = [
    verifiedFacts ? `[VERIFIED FACTS]\n${verifiedFacts}` : '',
    reportedClaims ? `[REPORTED CLAIMS]\n${reportedClaims}` : '',
    openQuestions ? `[OPEN QUESTIONS]\n${openQuestions}` : '',
  ].filter(Boolean).join('\n\n');

  if (!focusSummary) return factSheetText;

  return [
    '[FOCUSED SNAPSHOT FOR SHORT FORMAT]',
    focusSummary,
    '[FULL FACT SHEET]',
    factSheetText,
  ].join('\n\n');
};

const buildContentBriefPrompt = ({ factSheet, length, tone, format, customInstructions = '', intentProfile = null }) => {
  const profile = buildFormatProfile(format);
  const toneGuide = TONE_GUIDES[tone] || tone;
  const rawInstructions = normalizeCacheText(customInstructions) || 'None';

  return `
[TASK]
Create a concise writing brief for the final Thai writer.

[FORMAT]
${format} (${profile.label})

[LENGTH]
${normalizeLength(length)}

[TONE]
${toneGuide}

[FORMAT RULES]
${profile.structure}
${profile.goals}

[RAW USER INSTRUCTIONS]
${rawInstructions}

[NORMALIZED INTENT]
${intentProfile ? JSON.stringify(intentProfile, null, 2) : 'None'}

[FACT SHEET]
${factSheet}

[OUTPUT REQUIREMENTS]
- Return JSON only.
- Treat the fact sheet as the source of truth.
- Preserve the user's explicit request. Use normalized intent only as guidance when it resolves ambiguity.
- Separate strong facts from softer claims and unresolved questions.
- If the fact sheet contains uncertainty, preserve it in caveats instead of forcing certainty.
- Do not invent games, quizzes, activities, hashtags, or CTA unless the user explicitly asks.
- Choose a structure that fits the requested format instead of forcing a fixed house style.
- Prefer natural Thai over dramatic packaging. Avoid fake hooks, fake punchlines, or lines that sound like generic social-copy filler.
- If the content works best as one compact paragraph, choose that. Do not force multiple short paragraphs unless they genuinely improve readability.
`.trim();
};

const buildContentBrief = async ({ factSheet, length, tone, format, customInstructions = '', intentProfile = null }) => {
  const cacheKey = buildCacheKey('content-brief', {
    factSheet,
    length,
    tone,
    format,
    customInstructions,
    intentProfile,
  });
  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;
  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: 'Return a concise Thai content brief as JSON only. Stay grounded in the fact sheet.',
      prompt: buildContentBriefPrompt({ factSheet, length, tone, format, customInstructions, intentProfile }),
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
    id: String(tweet.id),
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
- Assign a 'temporalTag': "Breaking" (very new/urgent), "Trending" (currently popular), or "Related" (relevant but not especially fresh or viral).
- **Reasoning Language:** เขียน 'reasoning' เป็นภาษาไทยเท่านั้น โดยสรุปสั้นๆ (1 ประโยค) ว่าทำไมโพสต์นี้ถึงสำคัญหรือตรงกับความต้องการ สื่อสารให้เข้าใจง่ายเหมือนเพื่อนเล่าให้ฟัง`,
      prompt: JSON.stringify(compressedInput),
      schema: z.object({
        picks: z.array(z.object({
          id: z.string(),
          reasoning: z.string().describe('เหตุผลที่เลือกโพสต์นี้เป็นภาษาไทย'),
          temporalTag: z.enum(['Breaking', 'Trending', 'Related']).describe('The temporal context of the post'),
        })),
      }),
      temperature: 0,
    });

    const validIdSet = new Set(compressedInput.map((tweet) => String(tweet.id)));
    const finalPicks = object.picks.filter((pick) => validIdSet.has(String(pick.id)));
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

const URL_LIKE_KEY_PATTERN = /(url|urls|expanded|expanded_url|expandedurl|unwound|unwound_url|link|links|card|canonical)/i;

const extractUrlsFromObject = (value, depth = 0, seen = new Set()) => {
  if (!value || depth > 4) return [];
  if (typeof value === 'string') return extractUrlsFromText(value);
  if (typeof value !== 'object') return [];
  if (seen.has(value)) return [];

  seen.add(value);

  const collected = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      collected.push(...extractUrlsFromObject(item, depth + 1, seen));
    }
    return collected;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (typeof nestedValue === 'string') {
      if (URL_LIKE_KEY_PATTERN.test(key) || /^https?:\/\//i.test(nestedValue) || /\b(?:t\.co|x\.com|twitter\.com)\//i.test(nestedValue)) {
        collected.push(...extractUrlsFromText(nestedValue));
      }
      continue;
    }

    if (nestedValue && typeof nestedValue === 'object') {
      collected.push(...extractUrlsFromObject(nestedValue, depth + 1, seen));
    }
  }

  return collected;
};

const mergeExternalSourceUrls = (...collections) =>
  Array.from(
    new Set(
      collections
        .flat()
        .filter(Boolean)
        .flatMap((item) => (Array.isArray(item) ? item : [item]))
        .filter((url) => !isSocialPlatformUrl(url)),
    ),
  ).slice(0, 3);

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
        const seenUsernames = new Map();
        
        for (const t of searchData.data) {
          if (t.author && t.author.username) {
            const uname = t.author.username.toLowerCase();
            const engagement = (Number(t.likeCount || t.like_count || 0) * 1) + 
                               (Number(t.retweetCount || t.retweet_count || 0) * 2) + 
                               (Number(t.replyCount || t.reply_count || 0) * 1.5);
                               
            if (!seenUsernames.has(uname)) {
              seenUsernames.set(uname, {
                ...t.author,
                _engagementSignal: engagement
              });
            } else {
              const existing = seenUsernames.get(uname);
              existing._engagementSignal += engagement;
            }
          }
        }
        
        // Filter out small accounts and prioritize by real-time engagement impact!
        const qualifiedAuthors = Array.from(seenUsernames.values())
          .filter(a => (a.followers || a.fastFollowersCount || 0) > 1000)
          .sort((a, b) => b._engagementSignal - a._engagementSignal)
          .slice(0, 15);
          
        if (qualifiedAuthors.length > 0) {
          activeContext = `\n[อัปเดตแบบ Real-time (Weighted Impact Signal)]: นี่คือรายชื่อบัญชีเทียร์สูงที่มีอิทธิพลต่อหัวข้อนี้ในช่วง 24 ชั่วโมงที่ผ่านมา จัดเรียงตาม Real-time Engagement Score:\n${
            qualifiedAuthors.map(a => `- @${a.username} (${a.name}) | ผู้ติดตาม: ${a.followers || a.fastFollowersCount} | พลังการพูดคุยล่าสุด: สูงมาก (Score: ${a._engagementSignal})`).join('\n')
          }\n`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch active context for experts:', e);
    }

    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `คุณคือ "นักล่าดาวรุ่งและปรมาจารย์ระดับโลก" (Global Headhunter AI)
ภารกิจ: แนะนำบัญชี Twitter (X) สุดยอดผู้เชี่ยวชาญในหัวข้อ "${categoryQuery}" จำนวนสูงสุด 6 บัญชี
${activeContext ? activeContext : '\n[คำเตือน: ไม่มีข้อมูลอัปเดตแบบ Real-time ในหัวข้อนี้ กรุณาอิงเฉพาะบัญชีระดับโลกของแท้เท่านั้น]\n'}

[กฎการคัดเลือกขั้นเด็ดขาด (STRICT RULES)]:
1. **The Core Ground Truth (ความจริงสูงสุด):** 
   - หากมี [อัปเดตแบบ Real-time] ด้านบน คุณ **ต้อง** คัดเลือกบัญชีจากรายชื่อนั้นมาเป็นแกนหลักก่อนเสมอ! เพราะพวกเขาได้รับการพิสูจน์แล้วว่าแอคทีฟและมีค่า Engagement สูงสุดใน 24 ชั่วโมงที่ผ่านมา (ซึ่งมักจะรวมถึงอินฟลูเอนเซอร์ระดับกลางที่กำลังสร้างเทรนด์อยู่ด้วย)
2. **Quality Mid-Tier & Legends Zone (พื้นที่สำหรับคนเก่งจริง):** 
   - หากคุณจำเป็นต้องแนะนำบัญชีที่ *ไม่ได้อยู่ในลิสต์ Real-time* บัญชีนั้นต้องเป็น **"สำนักข่าวระดับโลก, บุคคลสำคัญระดับตำนาน, หรือ อินฟลูเอนเซอร์ระดับกลาง (Mid-tier/Niche Experts) ที่เก่งและทรงอิทธิพลเฉพาะทางจริงๆ"** (มีผู้ติดตามตั้งแต่หลักหมื่นไปจนถึงหลายล้าน)
   - ห้ามแต่งชื่อบัญชีแบบสุ่มขึ้นมาเองเด็ดขาด (No random hallucinations) คุณต้องมั่นใจ 100% ว่าบัญชีนี้มีตัวตนจริง, ไม่ร้าง, และเป็นที่ยอมรับในสายนั้นจริงๆ เท่านั้น
3. **Red Flag Penalty:** ข้ามบัญชีที่เป็นบอทก๊อปข่าว แฟนคลับ หรือบัญชีที่ดูเหมือนสแปมเด็ดขาด
4. **ความหลากหลาย (Diversity):** ผสมผสานระหว่าง สำนักข่าว, บุคคลในวงการ (Insider/Dev/Niche Experts), และนักวิเคราะห์ ไม่ให้ซ้ำซากเกินไป
5. **บัญชีที่ห้ามเลือก:** [${excludeUsernames.join(', ')}]
6. **Reasoning:** เขียนภาษาไทยสั้นๆ 1 ประโยค รีวิวความสามารถว่าทำไมเขาถึงควรค่าแก่การติดตาม (ถ้าเป็นคนเก่งเฉพาะทาง ให้ระบุจุดเด่นชัดๆ)`,
      prompt: `ค้นหาบัญชีที่ดีที่สุด 6 อันดับในสาย "${categoryQuery}" อิงตามโครงสร้าง Real-time ด้านบนเป็นหลัก ห้ามแต่งบัญชีโนเนมหรือบัญชีร้างขึ้นมาเองเด็ดขาด! (username ห้ามมี @ นำหน้า)`,
      schema: z.object({
        experts: z.array(
          z.object({
            username: z.string().describe('ชื่อบัญชี x ไม่ต้องมี @'),
            name: z.string().describe('ชื่อแสดงผล หรือชื่อองค์กร'),
            reasoning: z.string().describe('เหตุผลที่ควรติดตาม ภาษาไทย 1 ประโยค')
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

// Query expansion map: same single API call, broader initial results — zero extra cost
const CATEGORY_QUERY_EXPANSION: Record<string, string> = {
  'AI': 'AI OR "artificial intelligence" OR LLM OR ChatGPT OR "machine learning"',
  'เทคโนโลยี': 'เทคโนโลยี OR technology OR tech OR software',
  'ธุรกิจ': 'ธุรกิจ OR startup OR business OR entrepreneur',
  'การตลาด': 'การตลาด OR marketing OR "digital marketing" OR branding',
  'การเงิน': 'การเงิน OR finance OR "personal finance" OR fintech',
  'การลงทุน': 'การลงทุน OR investing OR investment OR stocks OR equity',
  'คริปโต': 'คริปโต OR crypto OR bitcoin OR ethereum OR DeFi OR web3',
  'สุขภาพ': 'สุขภาพ OR health OR wellness OR fitness OR nutrition',
  'ไลฟ์สไตล์': 'ไลฟ์สไตล์ OR lifestyle OR productivity OR mindset',
  'เศรษฐกิจ': 'เศรษฐกิจ OR economy OR economics OR macro',
  'การเมือง': 'การเมือง OR politics OR policy OR geopolitics',
  'การพัฒนาตัวเอง': 'การพัฒนาตัวเอง OR "self improvement" OR productivity OR habits',
};

export const discoverTopExpertsStrict = async (categoryQuery, excludeUsernames = []) => {
  try {
    let activeContext = '';

    try {
      // Use expanded query for better signal breadth — still a single API call
      const expandedQuery = CATEGORY_QUERY_EXPANSION[categoryQuery] || categoryQuery;
      const searchData = await searchEverything(expandedQuery, '', false, 'Top', false);
      const curatedTweets = curateSearchResults(searchData?.data || [], categoryQuery, {
        latestMode: false,
        preferCredibleSources: true,
      });

      if (curatedTweets.length > 0) {
        const authorsByUsername = new Map();
        const queryLower = String(categoryQuery || '').toLowerCase();
        const nowMs = Date.now();

        for (const tweet of curatedTweets) {
          const username = (tweet?.author?.username || '').toLowerCase();
          if (!username) continue;

          const tweetAgeMs = tweet.created_at ? nowMs - new Date(tweet.created_at).getTime() : Infinity;
          const tweetAgeDays = tweetAgeMs / 86_400_000;

          // Recency multiplier: tweets from last 7 days worth more, >90 days worth less
          const recencyMult = tweetAgeDays <= 7 ? 1.8 : tweetAgeDays <= 30 ? 1.2 : tweetAgeDays <= 90 ? 0.8 : 0.4;

          const rawEngagement =
            Number(tweet.likeCount || tweet.like_count || 0) +
            Number(tweet.retweetCount || tweet.retweet_count || 0) * 2 +
            Number(tweet.replyCount || tweet.reply_count || 0) * 1.5;
          const engagementSignal = rawEngagement * recencyMult;

          const topicSignal =
            (Number(tweet.broad_semantic_score || 0) +
            Number(tweet.search_score || 0) +
            (String(tweet.text || '').toLowerCase().includes(queryLower) ? 1.25 : 0)) * recencyMult;

          if (!authorsByUsername.has(username)) {
            authorsByUsername.set(username, {
              ...tweet.author,
              _engagementSignal: engagementSignal,
              _topicSignal: topicSignal,
              _topicTweetCount: 1,
              _latestTweetAgeDays: tweetAgeDays,
            });
            continue;
          }

          const existing = authorsByUsername.get(username);
          existing._engagementSignal += engagementSignal;
          existing._topicSignal += topicSignal;
          existing._topicTweetCount += 1;
          if (tweetAgeDays < existing._latestTweetAgeDays) {
            existing._latestTweetAgeDays = tweetAgeDays;
          }
        }

        // Compute composite score per author using data already in hand — zero extra calls
        const scoredAuthors = Array.from(authorsByUsername.values()).map((author) => {
          const followers = Number(author.followers || author.fastFollowersCount || 0);

          // Engagement rate: normalize raw engagement against follower size
          // Caps at 5% rate so micro-accounts don't dominate unfairly
          const engRate = followers > 0 ? (author._engagementSignal / followers) * 100 : 0;
          const normalizedEngRate = Math.min(1, engRate / 5) * 50; // scale to 0-50 pts

          // Followers score: log-scaled so 10K and 1M aren't wildly apart
          const followersScore = followers > 0 ? Math.min(30, Math.log10(followers + 1) * 7) : 0;

          // Authority: verified badge + bio presence + account age
          const hasBio = (author.description || '').length > 20;
          const accountAgeDays = author.createdAt
            ? (nowMs - new Date(author.createdAt).getTime()) / 86_400_000
            : 365;
          const verifiedBonus = author.isVerified ? 15 : author.isBlueVerified ? 6 : 0;
          const authorityScore = verifiedBonus + (hasBio ? 4 : 0) + Math.min(8, accountAgeDays / 180);

          // Activity signal: most recent tweet age — heavily penalise inactive accounts
          const activityScore =
            author._latestTweetAgeDays <= 7 ? 20 :
            author._latestTweetAgeDays <= 30 ? 12 :
            author._latestTweetAgeDays <= 90 ? 4 : 0;

          // Topic concentration: how many of this author's tweets in results are about the topic
          const topicConcentrationBonus = Math.min(15, author._topicTweetCount * 3);

          const compositeScore =
            author._topicSignal * 2.5 +   // relevance is king
            normalizedEngRate +            // engagement per follower
            followersScore +               // raw reach
            authorityScore +               // credibility signals
            activityScore +                // recency of activity
            topicConcentrationBonus;       // topic focus depth

          return { ...author, _compositeScore: compositeScore, _engRate: engRate, _activityDays: author._latestTweetAgeDays };
        });

        const qualifiedAuthors = scoredAuthors
          .filter((author) => (author.followers || author.fastFollowersCount || 0) >= 500)
          .filter((author) => author._topicSignal >= 2)         // relevance gate
          .filter((author) => author._latestTweetAgeDays <= 90) // activity gate: must have tweeted in 90 days
          .sort((a, b) => b._compositeScore - a._compositeScore)
          .slice(0, 18); // wider shortlist so LLM has better candidates to pick from

        if (qualifiedAuthors.length > 0) {
          activeContext = [
            '',
            '[REAL-TIME SCORED SHORTLIST]',
            `Live results for "${categoryQuery}" — pre-scored by topic relevance, engagement rate, recency, and authority.`,
            'Prioritise accounts with high engRate% (engaged per follower), low activityDays (recently active), and high topicTweets.',
            'Reject any account that only mentions the topic in passing. Reject accounts with 0 recency signal.',
            ...qualifiedAuthors.map((author) => {
              const followers = author.followers || author.fastFollowersCount || 0;
              const engRateLabel = author._engRate >= 3 ? '🔥 high' : author._engRate >= 1 ? 'mid' : 'low';
              const activityLabel = author._activityDays <= 7 ? 'active this week' : author._activityDays <= 30 ? 'active this month' : `${Math.round(author._activityDays)}d ago`;
              return `- @${author.username} (${author.name}) | followers: ${followers.toLocaleString()} | engRate: ${author._engRate.toFixed(2)}% (${engRateLabel}) | lastSeen: ${activityLabel} | topicTweets: ${author._topicTweetCount} | composite: ${Math.round(author._compositeScore)}`;
            }),
            '',
          ].join('\n');
        }
      }
    } catch (e) {
      console.warn('Could not fetch active context for strict expert discovery:', e);
    }

    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `You are a strict Twitter/X account recommender for the topic "${categoryQuery}".

Your job is to recommend up to 6 accounts that are genuinely worth following for this topic.
${activeContext || '\n[No real-time shortlist available. Only recommend accounts you are 100% confident are real, active, and topic-focused.]\n'}

Selection criteria (in order of importance):
1. TOPIC FIT — account's identity and content must genuinely center on "${categoryQuery}". Casual mentions do not qualify.
2. ACTIVITY — prefer accounts with "active this week" or "active this month". Penalise accounts last seen >60 days ago.
3. ENGAGEMENT QUALITY — high engRate% (engagement per follower) signals real audience connection. An account with 10K followers and 🔥 high engRate beats a 500K account with low engRate.
4. CREDIBILITY — verified accounts, long-standing accounts, accounts with clear bios.
5. REACH — follower count matters, but it's the last tiebreaker, not the primary signal.

Hard rules:
- Never recommend an account only because of high follower count.
- Reject fan accounts, news aggregators, meme accounts, and multi-topic viral accounts.
- Exclude list (do not recommend any of these): [${excludeUsernames.join(', ')}]
- No hallucinations. Only accounts you are confident exist and are active.
- Write "reasoning" in Thai, one concise sentence explaining WHY this account is the best for this topic.`,
      prompt: `Select the best 6 Twitter/X accounts for someone who wants to learn from the top voices in "${categoryQuery}". Use the shortlist above as primary signal. Username must not start with @.`,
      schema: z.object({
        experts: z.array(
          z.object({
            username: z.string().describe('Twitter/X username without @'),
            name: z.string().describe('Display name'),
            reasoning: z.string().describe('Short Thai reason — 1 sentence on WHY this account is top for this topic'),
          }),
        ).max(6),
      }),
    });

    return (object.experts || [])
      .map((expert) => ({
        ...expert,
        username: (expert.username || '').replace(/^@/, '').trim(),
      }))
      .filter((expert) => {
        const username = (expert.username || '').toLowerCase();
        return username && !excludeUsernames.some((item) => String(item || '').toLowerCase() === username);
      });
  } catch (error) {
    console.error('[GrokService] Strict expert discovery LLM error:', error);
    if (error.status === 400) {
      console.warn('[GrokService] 400 Bad Request in strict discovery. Check parameters/reasoningEffort for model.');
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
  const rawInput = options.originalInput || input;
  const cacheKey = buildCacheKey('fact-sheet-v2', normalizeCacheText(rawInput) + '||' + normalizeCacheText(input) + '||' + normalizeCacheText((interactionData || '').slice(0, 300)));
  const cached = getCachedValue(responseCache, cacheKey);
  if (cached) return cached;

  let attachedExternalUrls = mergeExternalSourceUrls(
    options.primarySourceUrls || [],
    extractExternalSourceUrls(rawInput, input, interactionData),
  );

  // Detect and fetch tweet when input contains a tweet URL
  const tweetRef = extractTweetIdFromInput(input);
  if (tweetRef) {
    try {
      const tweet = await fetchTweetById(tweetRef.tweetId);
      if (tweet?.text) {
        const tweetText = tweet.text.replace(/https?:\/\/\S+/g, '').trim();
        const author = tweet.author?.name || tweet.author?.username || tweetRef.username;
        const fetchedTweetIntel = `[ORIGINAL TWEET SOURCE]\nAuthor: @${tweet.author?.username || tweetRef.username} (${author})\nContent: ${tweetText}\nLikes: ${tweet.like_count || 0} | Retweets: ${tweet.retweet_count || 0}`;
        interactionData = [interactionData, fetchedTweetIntel].filter(Boolean).join('\n\n');
        attachedExternalUrls = mergeExternalSourceUrls(
          attachedExternalUrls,
          extractExternalSourceUrls(rawInput, input, interactionData, tweet.text),
          extractUrlsFromObject(tweet),
        );
      }
    } catch {
      // silently continue without tweet data
    }
  }

  let researchQuery = '';
  const intentProfile = options.intentProfile || null;
  try {
    const normalizedInputSeed = intentProfile?.researchHint || input;
    const queryInput = tweetRef ? `${tweetRef.username} ${normalizedInputSeed.replace(TWEET_URL_PATTERN, '').trim()}`.trim() : normalizedInputSeed;
    researchQuery = await deriveResearchQuery(queryInput, interactionData);
  } catch (err) {
    console.warn('[GrokService] Query derivation failed, using raw input:', err.message);
    researchQuery = input.slice(0, 100);
  }
  let webContext = '';
  let xContext = '';
  let extractedSources = [];
  let attachedSourceContext = '';
  let primaryLeadTitle = '';
  const hasPrimaryLead = attachedExternalUrls.length > 0;

  try {
    console.log('[GrokService] Starting research with query:', researchQuery);
    if (options.onProgress) options.onProgress('fetching');

    // Query Gating: Only fetch X Latest if query seems time-sensitive
    const isLatestNeeded = /ล่าสุด|วันนี้|breaking|เปิดตัว|ประกาศ|ด่วน|now|today|update/i.test(rawInput) || /ล่าสุด|วันนี้|breaking|เปิดตัว|ประกาศ|ด่วน|now|today|update/i.test(interactionData);
    
    const [data, xTopResponse, xLatestResponse, attachedUrlResponses] = await Promise.all([
      tavilySearch(researchQuery, false, hasPrimaryLead
        ? {
            max_results: 4,
            include_answer: true,
            search_depth: 'advanced',
          }
        : {}),
      searchEverything(researchQuery, '', false, 'Top').catch(() => ({ data: [] })),
      !isLatestNeeded ? Promise.resolve({ data: [] }) : searchEverything(researchQuery, '', false, 'Latest').catch(() => ({ data: [] })),
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
        data.answer && !hasPrimaryLead ? `[WEB ANSWER]\n${data.answer}` : '',
        webResults.length
          ? `[WEB SOURCES${hasPrimaryLead ? ' - SECONDARY CONTEXT ONLY' : ''}]\n${webResults
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
            if (!primaryLeadTitle) primaryLeadTitle = matchedPrimarySource.title || sourceUrl;
            extractedSources.push({
              title: matchedPrimarySource.title || sourceUrl,
              url: matchedPrimarySource.url || sourceUrl,
            });
          } else {
            if (!primaryLeadTitle) primaryLeadTitle = sourceUrl;
            extractedSources.push({
              title: sourceUrl,
              url: sourceUrl,
            });
          }

          return buildStrictPrimarySourceContext(`PRIMARY SOURCE WEB ${index + 1}`, response, sourceUrl, primaryLeadTitle || sourceUrl);
        })
        .filter(Boolean);

      attachedSourceContext = attachedBlocks.join('\n\n');
    }

    const xTweets = dedupeByNormalizedText(
      [...(xTopResponse?.data || []).slice(0, 4), ...(xLatestResponse?.data || []).slice(0, 4)],
      (tweet) => tweet?.id || tweet?.text,
    );
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
- หากมีต้นทางเป็น URL ข่าวโดยตรง ห้ามเดาเส้นทางขนส่ง ผลกระทบต่อผู้บริโภค เจตนาคนร้าย มาตรการบริษัท หรือรายละเอียดแวดล้อมอื่นใด เว้นแต่มีระบุชัดในต้นทางหรือแหล่งข่าวหลักที่สอดคล้องกัน
- ถ้าข้อมูลใดยังเป็นการอนุมานหรือขยายความจากบริบท ห้ามใส่ใน verified_facts ให้ย้ายไป open_questions หรือไม่ต้องใส่เลย

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
        reported_claims: z.array(z.string()).describe("ข้อกล่าวอ้างหรือสิ่งที่แหล่งข่าวรายงาน แต่ยังไม่ควรบิดให้เป็นข้อเท็จจริงแข็ง"),
        open_questions: z.array(z.string()).describe("ประเด็นที่ยังไม่แน่ชัด ขัดแย้งกัน หรือรอการยืนยัน"),
        community_signal: z.string().describe("กระแสตอบรับหรือมุมมองจากชุมชนชาว X สั้นๆ"),
        must_not_claim: z.array(z.string()).describe("สิ่งที่ห้ามเคลมหรือห้ามเขียนเด็ดขาดเนื่องจากไม่มีข้อมูลยืนยัน"),
        named_entities: z.array(z.string()).describe("ชื่อบุคคล/องค์กร/สถานที่ ที่เกี่ยวข้องตัองพิมพ์ให้ถูกต้อง")
      }),
    });

    const factSheet = hasPrimaryLead
      ? strengthenPrimaryLeadFactSheet(JSON.parse(JSON.stringify(factSheetObj)), attachedExternalUrls[0] || '')
      : JSON.parse(JSON.stringify(factSheetObj));
    const factSheetText = `[VERIFIED FACTS]\n${factSheet.verified_facts.map(f => `- ${f}`).join('\n')}\n\n[REPORTED CLAIMS]\n${factSheet.reported_claims.map(f => `- ${f}`).join('\n')}\n\n[OPEN QUESTIONS]\n${factSheet.open_questions.map(f => `- ${f}`).join('\n')}\n\n[COMMUNITY SIGNAL]\n${factSheet.community_signal}\n\n[MUST NOT CLAIM]\n${factSheet.must_not_claim.map(f => `- ${f}`).join('\n')}\n\n[KEY ENTITIES]\n${factSheet.named_entities.join(', ')}`;

    const primaryLeadUrl = attachedExternalUrls[0] || '';
    const finalSources = hasPrimaryLead
      ? getPrimaryLeadAwareSources(extractedSources, { primaryLeadUrl, primaryLeadTitle })
      : rankAndFilterSources(extractedSources, {
          primaryLeadUrl,
          researchQuery,
          input: rawInput,
        });

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
  const { allowEmoji = false, customInstructions = '', intentProfile = null, rawUserInput = '' } = options;
  // Temperature matrix: format sets the base creative range, tone fine-tunes within it
  const FORMAT_BASE_TEMP: Record<string, number> = {
    'โพสต์โซเชียล': 0.82,
    'สคริปต์วิดีโอสั้น': 0.85,
    'บทความ SEO / บล็อก': 0.68,
    'โพสต์ให้ความรู้ (Thread)': 0.75,
  };
  const TONE_TEMP_DELTA: Record<string, number> = {
    'ให้ข้อมูล/ปกติ': 0,
    'กระตือรือร้น/ไวรัล': 0.07,
    'ทางการ/วิชาการ': -0.09,
    'เป็นกันเอง/เพื่อนเล่าให้ฟัง': 0.04,
    'ตลก/มีอารมณ์ขัน': 0.1,
    'ดุดัน/วิจารณ์เชิงลึก': 0.03,
    'ฮาร์ดเซลล์/ขายของ': -0.03,
  };
  const writerTemperature = Math.min(0.95, Math.max(0.56, (FORMAT_BASE_TEMP[format] ?? 0.76) + (TONE_TEMP_DELTA[tone] ?? 0)));
  const isViralTone = tone === 'กระตือรือร้น/ไวรัล';
  // Lower frequency penalty: Thai writing naturally repeats key terms for clarity;
  // over-penalising causes unnatural vocabulary substitutions that break flow
  const writerFrequencyPenalty = isViralTone ? 0.12 : 0.18;
  const lengthInstruction = getLengthInstruction(length);
  const profile = buildFormatProfile(format);
  const brief = await buildContentBrief({ factSheet, length, tone, format, customInstructions, intentProfile });
  const activeFactSheet = compressFactSheetForFormat(factSheet, format);
  const skipReviewPass = shouldSkipReviewPass({ format, tone, intentProfile, customInstructions, factSheet: activeFactSheet });

  const draftSystemPrompt = `You are a senior Thai writer — not an AI assistant, not a content template engine. You write the way skilled Thai journalists and editors write: specific, grounded, with a distinct voice shaped by the requested tone and format.

Core craft principles:
- Specificity beats vagueness: "1.2 แสนตัน" is better than "ปริมาณมหาศาล", "แพทย์ 3 คน" is better than "ผู้เชี่ยวชาญหลายราย"
- Show through facts, not adjectives: let the data and events carry the emotional weight
- Rhythm is meaning: vary sentence length deliberately — a short sentence after a long one creates emphasis
- The best opening line earns attention with a specific fact, a contradiction, or a number — never with "ในยุคที่...", "ปฏิเสธไม่ได้ว่า...", or a rhetorical question that the reader doesn't care about yet
- The best closing line leaves the reader with something to think about, not a summary of what they just read

Priority order (strict):
1. Fact sheet verified facts and must-not-claim rules — these are absolute
2. The user's raw request and raw instructions — follow these over everything else
3. Normalized intent and structured brief — treat as creative guidance only

Hard rules:
- Do not state unsupported details as facts. Treat reported claims and open questions as softer context.
- If uncertainty exists, acknowledge it naturally — do not force certainty or hedge with useless filler phrases.
- Mention people and accounts only when they materially matter to the story.
- Follow the requested format and tone faithfully; do not substitute a "safer" house style.
- Write natural Thai. Never literal translation. Never corporate jargon.
- Never use the em dash character (â€” or —) anywhere in the final output.
- Forbidden phrases: "นั่นหมายความว่า...", "จะเห็นได้ว่า...", "ที่สำคัญกว่านั้น...", "ซึ่งทำให้เราเห็นว่า...", "นับว่าเป็น...", "เรียกได้ว่า...", "สิ่งที่น่าสนใจคือ..." — these are filler that adds no information.
- No forced bold headline, hook line, or paragraph splits unless the content genuinely needs them.
- No CTA or audience interaction unless the user explicitly asked for it.
- For formats that do not use headings: never invent markdown headings as scaffolding.`;

  const draftUserPrompt = [
    `<format_rules>\nFormat: ${format} (${profile.label})\nLength: ${lengthInstruction}\nStructure: ${profile.structure}\nGoals: ${profile.goals}\nWriting skill for this format: ${profile.skill || ''}\n</format_rules>`,
    `<raw_user_request>\n${rawUserInput || 'None'}\n</raw_user_request>`,
    `<raw_user_instructions>\n${customInstructions || 'None'}\n</raw_user_instructions>`,
    `<normalized_intent_guidance>\n${intentProfile ? JSON.stringify(intentProfile, null, 2) : 'None'}\n</normalized_intent_guidance>`,
    `<structured_brief_guidance>\n${JSON.stringify(brief, null, 2)}\n</structured_brief_guidance>`,
    `<fact_sheet>\n${activeFactSheet}\n</fact_sheet>`,
    'If raw user instructions and normalized guidance differ, follow the raw user instructions unless they conflict with the fact sheet.',
    'Prefer the simplest structure that reads naturally. If one or two paragraphs are enough, do not pad the piece.',
    'Avoid phrases that sound like filler or AI-generated social copy.',
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
      let nextPolishTime = Date.now() + 800; // Throttle heavy NLP regex down to ~1.2 FPS
      
      for await (const textPart of textStream) {
        fullContent += textPart;
        
        if (Date.now() >= nextPolishTime) {
          onStreamChunk(polishThaiContent(fullContent, { format, customInstructions, allowEmoji, tone }));
          nextPolishTime = Date.now() + 800;
        } else {
          onStreamChunk(fullContent); // Just push unpolished raw text to UI to keep it smooth without O(N^2) CPU burn
        }
      }

      const finalPolished = polishThaiContent(fullContent, { format, customInstructions, allowEmoji, tone });
      onStreamChunk(finalPolished);
      return { content: finalPolished, titleIdea: brief.titleIdea };
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

  if (skipReviewPass && !shouldForceNaturalRewrite(contentDraft, { format, tone })) {
    return { content: polishThaiContent(contentDraft, { format, customInstructions, allowEmoji, tone }), titleIdea: brief.titleIdea };
  }

  try {
    const { object: evalResult } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: `Evaluate whether the Thai draft is safe to ship.
Set passed=true only if:
- it stays faithful to the fact sheet
- it does not turn reported claims or open questions into hard facts
- it follows the user's explicit request closely enough
- it is natural Thai and broadly fits the requested format
- it does not use forced hooks, filler transitions, or unnecessary paragraph splits that make the draft feel templated

Do not fail a draft just because it chose a different but valid narrative stance.`,
      prompt: `[RAW USER REQUEST]\n${rawUserInput || 'None'}\n\n[RAW USER INSTRUCTIONS]\n${customInstructions || 'None'}\n\n[FORMAT]\n${format}\n\n[TONE]\n${tone}\n\n[NORMALIZED INTENT]\n${intentProfile ? JSON.stringify(intentProfile, null, 2) : 'None'}\n\n[FACT SHEET]\n${activeFactSheet}\n\n[BRIEF]\n${JSON.stringify(brief, null, 2)}\n\n[DRAFT]\n${contentDraft}`,
      schema: CONTENT_REVIEW_SCHEMA,
    });

    const needsGroundingRewrite = !evalResult.groundingPassed || !evalResult.sourceDisciplinePassed;
    const needsNaturalnessRewrite = !evalResult.thaiNaturalnessPassed || shouldForceNaturalRewrite(contentDraft, { format, tone });

    if ((!evalResult.passed && (needsGroundingRewrite || needsNaturalnessRewrite)) || needsNaturalnessRewrite) {
      const evalFeedback = evalResult.reason ||
        'Revise the draft so it stays grounded in the fact sheet and reads like natural Thai written by a real person.';
      const revisedDraft = await callGrok({
        modelName: MODEL_WRITER,
        system: draftSystemPrompt,
        prompt: `[RAW USER REQUEST]\n${rawUserInput || 'None'}\n\n[RAW USER INSTRUCTIONS]\n${customInstructions || 'None'}\n\n[FACT SHEET]\n${activeFactSheet}\n\n[BRIEF]\n${JSON.stringify(brief, null, 2)}\n\n[CURRENT DRAFT]\n${contentDraft}\n\n[EDITOR FEEDBACK]\n${evalFeedback}\n\nRewrite only where needed.\n- Keep the facts intact.\n- Remove AI-sounding phrasing, forced hooks, and filler conclusions.\n- Merge paragraphs if the draft feels over-segmented.\n- Keep the wording plain, natural, and specific.`,
        temperature: 0.62,
        allowEmoji,
      });

      return { content: polishThaiContent(revisedDraft, { format, customInstructions, allowEmoji, tone }), titleIdea: brief.titleIdea };
    }
  } catch (error) {
    console.warn('[GrokService] Editor pass skipped (v2):', error);
  }

  return { content: polishThaiContent(contentDraft, { format, customInstructions, allowEmoji, tone }), titleIdea: brief.titleIdea };
};



