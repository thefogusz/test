import { createXai } from '@ai-sdk/xai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { searchEverything } from './TwitterService';

const MODEL_NEWS_FAST = 'grok-4-1-fast-non-reasoning';
const MODEL_REASONING_FAST = 'grok-4-1-fast-reasoning';
const MODEL_WRITER = 'grok-4-1-fast-reasoning';
const MODEL_MULTI_AGENT = 'grok-4-1-fast-reasoning'; // Temporarily downgraded to save costs

const grok = createXai({
  apiKey: 'local-proxy',
  baseURL: '/api/xai/v1',
});

const factCache = new Map();

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



const extractSourcesFromTweets = (tweets, limit = 4) =>
  dedupeSources(
    (tweets || [])
      .slice(0, limit)
      .map((tweet) => {
        const url = buildTweetUrl(tweet);
        if (!url) return null;

        return {
          title: `@${tweet.author?.username || 'unknown'} on X`,
          url,
        };
      })
      .filter(Boolean),
  );

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
    structure: 'Write 2-4 short paragraphs with natural flow. No markdown headings.',
    goals: 'Lead with the core point quickly, keep the tone human and sharp. Include 2-3 relevant hashtags at the very bottom.',
  },
  'สคริปต์วิดีโอสั้น': {
    label: 'short-form video script',
    allowHeadings: false,
    allowCta: false,
    structure: 'Write as a spoken script with a hook, body, and closing beat. No markdown headings.',
    goals: 'Use spoken Thai, short sentences, and strong pacing for voice delivery.',
  },
  'บทความ SEO / บล็อก': {
    label: 'blog article',
    allowHeadings: true,
    allowCta: false,
    structure: 'Write as a polished article. Use headings only when they genuinely improve readability.',
    goals: 'Prioritize clarity, information density, and credibility over hype.',
  },
  'โพสต์ให้ความรู้ (Thread)': {
    label: 'thread',
    allowHeadings: false,
    allowCta: true,
    structure: 'Write as a thread-style piece with a strong opener and sequential points. No markdown headings.',
    goals: 'Each paragraph should move the story forward clearly. Include 2-3 relevant hashtags at the very bottom.',
  },
};

const TONE_GUIDES = {
  'ให้ข้อมูล/ปกติ': 'Calm, informed, editorial. Use professional but accessible Thai. Use particles like ครับ/ค่ะ appropriately. Avoid robotic transitions.',
  'กระตือรือร้น/ไวรัล': 'Energetic, sharp, and trend-focused. Use genuine insight as the hook. Use particles like นะ/น้า or สิ/ซะ to drive engagement without being overly formal. NEVER use clichéd openings like "สาย... ห้ามพลาด".',
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
  const allowExplicitCta = /cta|call to action|ชวนคอมเมนต์|ชวนแชร์|ชวนรีโพสต์/i.test(
    customInstructions,
  );

  const allowHighEnergyLanguage = shouldAllowHighEnergyLanguage(customInstructions, tone);
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
    nextText = nextText.replace(/ครองครึ่งโลกการเงิน/gi, 'มีบทบาทใหญ่มากในระบบการเงิน');
    nextText = nextText.replace(/โลกจะไม่เหมือนเดิมอีกต่อไป/gi, 'อาจเปลี่ยนภาพการแข่งขันในตลาดได้มาก');
    nextText = nextText.replace(/!!+/g, '!');
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

const buildContentBriefPrompt = ({ factSheet, length, tone, format, customInstructions = '' }) => {
  const profile = buildFormatProfile(format);
  const toneGuide = TONE_GUIDES[tone] || tone;

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
  try {
    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: 'Return a concise Thai content brief as JSON only. Stay grounded in the fact sheet.',
      prompt: buildContentBriefPrompt({ factSheet, length, tone, format, customInstructions }),
      schema: CONTENT_BRIEF_SCHEMA,
    });

    return object;
  } catch (error) {
    console.warn('[GrokService] Brief generation fallback:', error);
    return {
      mainAngle: 'สรุปประเด็นสำคัญจากข้อมูลที่มีอย่างชัดเจนและน่าเชื่อถือ',
      audience: 'ผู้อ่านทั่วไปที่ต้องการความเข้าใจเร็ว',
      voiceNotes: ['กระชับ', 'น่าเชื่อถือ', 'ไม่โอเวอร์'],
      mustIncludeFacts: ['ยึดตาม fact sheet', 'แยกข้อเท็จจริงออกจากความเห็น'],
      caveats: ['ระบุข้อจำกัดของข้อมูลเมื่อยังไม่ชัดเจน'],
      structure: ['เปิดด้วยประเด็นหลัก', 'ขยายบริบทสำคัญ', 'ปิดด้วยข้อสรุปที่พอดี'],
      titleIdea: 'สรุปประเด็นสำคัญล่าสุด',
      ctaMode: 'none',
    };
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

const deriveResearchQuery = async (input) => {
  const fallback = (input || '').replace(/\s+/g, ' ').trim().slice(0, 160) || 'latest news';

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system:
        'สกัดหนึ่งหัวข้อค้นหาที่กระชับจากคำขอที่ได้รับ โดยรักษาชื่อสำคัญ, ผลิตภัณฑ์, บริษัท และหัวข้อหลักไว้ ส่งผลลัพธ์เป็น JSON เท่านั้น',
      prompt: input,
      schema: z.object({
        searchQuery: z.string().min(1).max(160),
      }),
    });

    return (object.searchQuery || fallback).trim();
  } catch (error) {
    if (error.status === 400) {
      console.warn('[GrokService] 400 Bad Request in deriveResearchQuery. Check parameters/model.');
    }
    console.warn('[GrokService] Falling back to raw research query:', error.message);
    return fallback;
  }
};



// --- [NEWS FLOW FUNCTIONS] ---

export const generateGrokSummary = async (fullStoryText) => {
  const results = await generateGrokBatch([fullStoryText]);
  return results[0] || fullStoryText;
};

export const generateGrokBatch = async (stories) => {
  if (!stories || stories.length === 0) return [];

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: SUMMARY_RULES,
      prompt: JSON.stringify({
        count: stories.length,
        stories,
        outputRule: 'แปลงเนื้อหาบทความ (stories) ทั้งหมดเป็นบทสรุปภาษาไทย (Translate and summarize to Thai) ให้คืนค่ากลับมา 1 บทสรุปภาษาไทย ต่อ 1 ต้นฉบับ ในลำดับเดิมอย่างเคร่งครัด',
      }),
      schema: z.object({
        summaries: z.array(z.string()).length(stories.length),
      }),
      temperature: 0.2,
    });

      return object.summaries.map((summary) => cleanGeneratedContent(summary));
  } catch (error) {
    console.error('[GrokService] Batch summarization error:', error);
    return stories.map(() => '(Grok API Error)');
  }
};

export const agentFilterFeed = async (tweetsData, userPrompt, options = {}) => {
  if (!tweetsData?.length) return [];
  const { preferCredibleSources = false } = options;

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
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: `Select only the posts that match this user intent: "${userPrompt}".
Return IDs only.
Rules:
- Keep only posts that clearly help answer the brief.
- Remove spam, scams, engagement bait, duplicates, and off-topic posts.
- Remove copycat headline posts from weak accounts when a stronger source says the same thing.
- Be selective. Fewer high-signal posts are better than many weak posts.
${preferCredibleSources ? '- Prioritize topic fit first, then prefer official accounts, reporters, researchers, founders, institutions, or accounts with clear credibility/real reach.' : ''}
${preferCredibleSources ? '- Down-rank low-value aggregator accounts that only restate the headline without adding original reporting, analysis, or meaningful context.' : ''}`,
      prompt: JSON.stringify(compressedInput),
      schema: z.object({
        validIds: z.array(z.string()),
      }),
      temperature: 0,
    });

    const validIdSet = new Set(compressedInput.map((tweet) => tweet.id));
    return object.validIds.filter((id) => validIdSet.has(id));
  } catch (error) {
    if (error.status === 400) {
      console.warn('[GrokService] 400 Bad Request in agentFilterFeed. Check parameters/model.');
    }
    console.error('[GrokService] Filter error:', error);
    return tweetsData.map((tweet) => tweet.id);
  }
};

export const generateExecutiveSummary = async (validTweets, userQuery, onStreamChunk) => {
  if (!validTweets?.length) return null;

  const contentToAnalyze = validTweets
    .slice(0, 10)
    .map((tweet, index) => {
      const authorLabel = tweet.author?.username ? `@${tweet.author.username}` : tweet.author?.name || 'unknown';
      return `[${index + 1}] (${authorLabel}) ${tweet.text}`;
    })
    .join('\n---\n');

  const summarySystem = `คุณคือนักวิเคราะห์ที่กำลังเขียนสรุปสั้นสำหรับผู้บริหารในหัวข้อ "${userQuery}" เป็นภาษาไทย
กฎ:
- เขียน 2-3 ประโยคภาษาไทยแบบกระชับ
- สรุปเฉพาะสิ่งที่มีอยู่ในโพสต์ที่ให้มาเท่านั้น ห้ามเดา ห้ามเติมบริบทเอง
- ถ้าข้อมูลส่วนใหญ่พูดถึงเพียงบางมุมของคำถาม ให้บอกตามตรงว่ายังเห็นสัญญาณเด่นแค่ส่วนนั้น
- ถ้ามีหลายเกมหรือหลายหัวข้อ ให้พูดแยกอย่างระมัดระวัง และห้ามเหมารวมว่าครบทุกหัวข้อหากหลักฐานยังไม่พอ
- ใช้ markdown bold ได้เฉพาะวลีสำคัญที่มีหลักฐานรองรับชัด
- ห้ามมีหัวข้อหรือ bullet
- ห้ามระบุชื่อบัญชี (@handle) ของผู้ใช้ทั่วไปที่ไม่มีอิมแพค ยกเว้นบัญชีที่มีชื่อเสียง, มีผู้ติดตามสูง, มียอดเอนเกจเม้นท์สูง หรือมีความน่าเชื่อถือชัดเจน ให้เน้นสรุปภาพรวมของสัญญาณจากชุมชน`;

  if (onStreamChunk) {
    try {
      const { textStream } = await streamText({
        model: grok(MODEL_NEWS_FAST),
        system: summarySystem,
        prompt: contentToAnalyze,
      });

      let fullText = '';
      for await (const textPart of textStream) {
        fullText += textPart;
        onStreamChunk(textPart, fullText);
      }
      return cleanGeneratedContent(fullText);
    } catch (error) {
      console.error('[GrokService] Stream summary error:', error);
      // Fallback to normal if stream fails
    }
  }

  return callGrok({
    modelName: MODEL_NEWS_FAST,
    system: summarySystem,
    prompt: contentToAnalyze,
  });
};

export const expandSearchQuery = async (originalQuery, isLatest = false) => {
  if (!originalQuery) return originalQuery;

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
    return finalQuery.includes('-filter:replies')
      ? finalQuery
      : `${finalQuery} -filter:replies`;
  } catch (error) {
    if (error.status === 400) {
      console.warn('[GrokService] 400 Bad Request in expandSearchQuery. Check parameters/model.');
    }
    console.error('[GrokService] Query optimizer error:', error);
    return `${originalQuery} -filter:replies`;
  }
};

export const buildSearchPlan = async (originalQuery, isLatest = false) => {
  const fallbackQuery = `${originalQuery} -filter:replies`.trim();

  if (!originalQuery) {
    return {
      queries: [],
      primaryQuery: '',
      topicLabels: [],
    };
  }

  try {
    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `คุณกำลังออกแบบ search plan สำหรับค้นหาคอนเทนต์บน X
เป้าหมาย:
- อย่าค้นแบบยิงคำตรงอย่างเดียว
- ต้องตีความ intent ของหัวข้อ แล้วแตกเป็นคำค้นที่ช่วยกวาดโพสต์คุณภาพสูงที่เกี่ยวข้องจริง
- สำหรับหัวข้อกว้าง ให้แตกเป็นหลายมุมที่คนติดตามเรื่องนั้นใช้จริง

กฎ:
- ส่ง query หลัก 1 อัน และ query ย่อยที่เกี่ยวข้องอีก 2-3 อัน
- แต่ละ query ต้องค้นหาคนละมุมของ topic เช่น scene, league, tournament, roster move, patch, ecosystem, company, product, regulation
- ใช้ทั้งไทยและอังกฤษได้เมื่อช่วยให้ครอบคลุมขึ้น
- ห้ามยิงแค่คำหลักเดี่ยว ๆ ถ้ายังแตกมุมได้
- ห้ามบังคับแคบเกินไปจนผลลัพธ์หาย
- Every query MUST have -filter:replies.
- For high-impact results, you can strategically add min_faves:10 or min_retweets:3 as needed for broader topics unless it's too restrictive.
- ${isLatest ? 'โหมดสายฟ้าถูกจำกัดเวลาในแอปอยู่แล้ว ให้เน้น recent developments ที่ยังกวาดได้หลายมุม โดยลดเกณฑ์ min_faves ลงหรือมุ่งประเด็นใหม่ล่าสุด' : 'เน้น query ที่ดึงโพสต์คุณภาพสูงจากหลายมุมของหัวข้อ โดยใส่เกณฑ์ความนิยมขั้นต่ำ (min_faves:15-20) หากหัวข้อกว้างมาก'}
- topicLabels เป็นคำสั้น ๆ 3-6 คำที่สรุป intent หรือ subtopics
- ตอบเป็น JSON เท่านั้น`,
      prompt: `Topic: ${originalQuery}`,
      schema: z.object({
        primaryQuery: z.string().min(3),
        relatedQueries: z.array(z.string().min(3)).max(3),
        topicLabels: z.array(z.string().min(2)).max(6),
      }),
    });

    const normalizeQuery = (query) => {
      const finalQuery = String(query || '').replace(/\s+/g, ' ').trim();
      if (!finalQuery) return '';
      return finalQuery.includes('-filter:replies') ? finalQuery : `${finalQuery} -filter:replies`;
    };

    const queries = Array.from(
      new Set([object.primaryQuery, ...(object.relatedQueries || [])].map(normalizeQuery).filter(Boolean)),
    ).slice(0, 4);

    return {
      queries: queries.length ? queries : [fallbackQuery],
      primaryQuery: queries[0] || fallbackQuery,
      topicLabels: Array.from(
        new Set((object.topicLabels || []).map((label) => String(label || '').trim()).filter(Boolean)),
      ),
    };
  } catch (error) {
    console.error('[GrokService] Search plan optimizer error:', error);
    return {
      queries: [fallbackQuery],
      primaryQuery: fallbackQuery,
      topicLabels: [originalQuery],
    };
  }
};

export const discoverTopExperts = async (categoryQuery, excludeUsernames = []) => {
  try {
    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `คุณคือ "นักล่าดาวรุ่งและปรมาจารย์ระดับโลก" (Global Headhunter AI)
ภารกิจ: จงค้นหาและแนะนำสุดยอดบัญชี Twitter (X) จำนวน 6 บัญชี ที่เป็นผู้เชี่ยวชาญหรือเป็นแหล่งข้อมูลที่สำคัญที่สุดในหัวข้อ "${categoryQuery}" แบบ Real-time

คุณต้องใช้ "ความสามารถในการค้นหาข้อมูลที่สดใหม่บน X" ของคุณ เพื่อดึงตัวตนที่มีอิทธิพลในระดับโลกจริงๆ (วิเคราะห์ข้ามไปมาเพื่อเลือกคนที่เป็นตัวจริงที่สุด)

[กฎการคัดเลือก - สำคัญมาก]:
1. **Diversity Enforcement (ความหลากหลาย):** ใน 6 บัญชีนี้ ห้ามมีบทบาทซ้ำกันเกิน 2 คน (เช่น ต้องมีทั้งนักเตือนภัย, ผู้สื่อข่าว, ผู้รวบรวมข้อมูล, และผู้ก่อตั้งโปรเจกต์)
2. **The Red Flag Filter (ไร้ขยะ):** ตัดบัญชีที่เป็น Bot, บัญชีที่เอาแต่สอนกด Airdrop, บัญชีปั่น/สแปม, หรือบัญชีที่มีแต่ยอด Follow ทิพย์ หรือบัญชีเน้นขายหน้าตา (OnlyFans/Model)
3. **Active & Public Only (ตัวจริงที่ยังอยู่):** จงเลือกเฉพาะบัญชีที่คุณรู้จักและแน่ใจ 100% ว่ามันเป็นบัญชีสาธารณะ (Public) และมีการเคลื่อนไหว (Active) ในช่วง 30 วันที่ผ่านมา ห้ามแนะนำบัญชีที่ระงับการใช้งาน (Suspended), บัญชีส่วนตัว (Private/Protected), หรือบัญชีที่ดูเหมือนเลิกเล่นแล้วเด็ดขาด ห้าม Hallucinate ชื่อบัญชี
4. จัดลำดับความสำคัญให้ "บัญชีของคน/องค์กรระดับโลกที่มีผู้ติดตามจริงมหาศาล" เป็นกลุ่มแรก ๆ
5. ตัดบัญชีที่มีชื่อผู้ใช้เหล่านี้ทิ้ง: [${excludeUsernames.join(', ')}]
6. สำหรับ "reasoning": เขียนรีวิวภาษาไทยความยาว 1 ประโยคสั้นๆ เน้นความว้าวว่าทำไมต้องตามคนนี้ เขาเจ๋งแค่ไหนในสายนี้`,
      prompt: `ค้นหายอดฝีมือ 6 คนที่เป็น The Best of the Best ในสาย "${categoryQuery}" อย่างเคร่งครัดตามกฎ อย่าลืมคัดให้หลากหลาย (username ต้องไม่มี @ นำหน้า และ reasoning ต้องยาวแค่ 1 ประโยคในภาษาไทยเท่านั้น)`,
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
  const { factSheet } = await researchAndPreventHallucination(
    [query, interactionData].filter(Boolean).join('\n\n'),
  );
  return factSheet;
};

// --- [CONTENT FLOW FUNCTIONS] ---

export const researchAndPreventHallucination = async (input) => {
  if (factCache.has(input)) return factCache.get(input);

  const researchQuery = await deriveResearchQuery(input);
  let webContext = '';
  let xContext = '';
  let extractedSources = [];

  try {
    console.log('[GrokService] Starting research with query:', researchQuery);
    const [webResponse, xTopResponse, xLatestResponse] = await Promise.all([
      fetch('/api/tavily/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: researchQuery,
          search_depth: 'advanced',
          include_answer: true,
          max_results: 5,
        }),
      }).catch(err => { console.warn('[GrokService] Tavily fetch failed:', err); return { ok: false }; }),
      searchEverything(researchQuery, '', false, 'Top').catch(() => ({ data: [] })),
      searchEverything(researchQuery, '', false, 'Latest').catch(() => ({ data: [] })),
    ]);

    if (webResponse && webResponse.ok) {
      const data = await webResponse.json();
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

    const xTweets = [...(xTopResponse?.data || []).slice(0, 4), ...(xLatestResponse?.data || []).slice(0, 4)];
    extractedSources.push(...extractSourcesFromTweets(xTweets, 6));

    if (xTweets.length) {
      xContext = `[X EVIDENCE]\n${toTweetEvidence(xTweets, 6)}`;
    }
  } catch (error) {
    console.error('[GrokService] Search aggregation error:', error);
  }

  try {
    const factSheet = await callGrok({
      modelName: MODEL_REASONING_FAST,
      system: `คุณคือทีมนักวิจัยไทยที่กำลังเตรียมข้อมูลข้อเท็จจริง (Fact Sheet) ที่มีความน่าเชื่อถือ
ใช้เฉพาะข้อมูลหลักฐานที่ให้มาเท่านั้น
หากข้อมูลใดไม่ได้รับการสนับสนุนอย่างชัดเจน ให้ระบุว่ายังไม่แน่นอน
เขียนเป็นภาษาไทย แต่คงชื่อเฉพาะและชื่อผลิตภัณฑ์เป็นภาษาอังกฤษ

รูปแบบการเขียน:
## ข้อเท็จจริงที่ตรวจสอบแล้ว
- ...
## สัญญาณจากตลาด / ชุมชน
- ...
## ข้อควรระวัง / ข้อมูลที่ยังไม่ทราบ
- ...
## มุมมองที่แนะนำ
- ...

กฎการระบุชื่อ:
- ห้ามระบุชื่อบัญชี (@handle) ของผู้ใช้ทั่วไปที่เพียงแค่ทำการรีโพสต์โดยไม่มีอิมแพค
- สามารถระบุชื่อบุคคล/องค์กรที่มีชื่อเสียง, มีความน่าเชื่อถือสูง, มีผู้ติดตามจำนวนมาก หรือบัญชีที่สร้างเอนเกจเม้นท์ (Likes/Reposts) สูงมากจนมีผลกระทบวงกว้างได้
- ระบุชื่อที่เป็นต้นทางข้อมูล (Source of truth) ได้เสมอ
`,
      prompt: [
        `[ORIGINAL REQUEST]\n${input}`,
        `[SEARCH QUERY]\n${researchQuery}`,
        webContext || '[No web context available]',
        xContext || '[No X evidence available]',
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

    const resultPayload = {
      factSheet,
      sources: dedupeSources(extractedSources).slice(0, 8),
    };

    factCache.set(input, resultPayload);
    return resultPayload;
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
  const lengthInstruction = getLengthInstruction(length);
  const profile = buildFormatProfile(format);
  const brief = await buildContentBrief({ factSheet, length, tone, format, customInstructions });

  const draftSystemPrompt = `<global_system_instruction>
คุณคือ Copywriter ตัวท็อปของไทยที่เชี่ยวชาญการเขียนคอนเทนต์และโพสต์ Social Media หน้าที่ของคุณคือการดึงดูดคนอ่านตั้งแต่บรรทัดแรก โดยต้องใช้หลักการ Bento-Box Prompting ในการรับคำสั่ง
</global_system_instruction>

<tone_of_voice>
- ${TONE_GUIDES[tone] || tone}
- เป็นมืออาชีพแต่ไม่ก้าวร้าว มั่นใจแต่ไม่โอ้อวด (Professional but not aggressive, confident but not boastful).
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
  : '6. คำลงท้าย (Sentence Particles): งานเขียนเพจทั่วไปให้หลีกเลี่ยงคำลงท้าย (เช่น ครับ/ค่ะ, นะ) เพื่อความเป็นมืออาชีพและกระชับ ยกเว้นโทนเพื่อนเล่าให้ฟัง'}
7. NO DICTIONARY PAIRS. Choose either English or Thai for a term. Never write "Artificial Intelligence (ปัญญาประดิษฐ์)".
8. STRICT LANGUAGE RULE: ระวังการหลอนภาษาต่างประเทศ (Hallucination) ให้ใช้เฉพาะภาษา "ไทย" (Thai) และตัวอักษร "ภาษาอังกฤษ" (English) สำหรับคำทับศัพท์เท่านั้น ห้ามพิมพ์ภาษาจีน, ญี่ปุ่น, เกาหลี หรือ รัสเซีย เด็ดขาด (หากเจอใน Fact Sheet ให้สกัดเอาเฉพาะความหมายมาเขียนเป็นภาษาไทย)
9. PERSPECTIVE RULE: คุณคือ "ผู้สร้างคอนเทนต์ต้นทาง" (Original Creator) ห้ามเขียนในเชิงรายงานข่าวว่า "โพสต์ของ X บอกว่า..." หรือ "X รายงานว่า..." ให้นำข้อมูลมาเล่าด้วยมุมมองที่มั่นใจ รู้จริง และเล่าเรื่องโดยตรงไปที่ผู้อ่านแทน
</rules_and_constraints>

<tasks>
1. Think and outline the logical structure and core message internally first (Chain of Thought).
2. Separate verified facts from interpretation or community reaction.
3. If uncertainty exists, state it plainly and briefly.
4. Name people or accounts (@handle) only if they are highly influential (high followers/engagement), famous, or materially matter to the story. Never list random low-impact reposters.
5. Write the final output in beautiful, natural Thai.
</tasks>

<few_shot_examples>
Example of BAD AI Thai:
"มันถูกรายงานว่าบริษัท Apple (แอปเปิ้ล) ได้ทำการเปิดตัวสินค้าใหม่ ซึ่งนี่คือเกมเชนเจอร์ของตลาด"
Example of GOOD Native Thai:
"มีรายงานว่า Apple เปิดตัวสินค้าใหม่ที่อาจพลิกโฉมตลาดไปชั่วข้ามคืน"
</few_shot_examples>`;

  const draftUserPrompt = [
    `<format_rules>\nFormat: ${format} (${profile.label})\nLength: ${lengthInstruction}\n${profile.structure}\n${profile.goals}\n</format_rules>`,
    `<structured_brief>\n${JSON.stringify(brief, null, 2)}\n</structured_brief>`,
    `<fact_sheet>\n${factSheet}\n</fact_sheet>`,
    `<extra_instructions>\n${customInstructions || 'None'}\n</extra_instructions>`,
    'Write the final Thai content now.',
  ].join('\n\n');

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
        onStreamChunk(polishThaiContent(fullContent, { format, customInstructions, allowEmoji, tone }));
      }

      return polishThaiContent(fullContent, { format, customInstructions, allowEmoji, tone });
    } catch (error) {
      console.error('[GrokService] Streaming error (v2):', error);
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
      system: `Evaluate whether the Thai draft is grounded, natural, and appropriate for the requested format.
Set passed=true only if:
- it stays faithful to the fact sheet
- it matches the requested tone without overclaiming
- it does not read like generic AI copy
- it respects heading and CTA expectations for the format
- it names people only when their identity or influence materially matters`,
      prompt: `[FORMAT]\n${format}\n\n[TONE]\n${tone}\n\n[FACT SHEET]\n${factSheet}\n\n[BRIEF]\n${JSON.stringify(brief, null, 2)}\n\n[DRAFT]\n${contentDraft}`,
      schema: z.object({
        passed: z.boolean(),
        reason: z.string().optional(),
      }),
    });

    if (!evalResult.passed) {
      const revisedDraft = await callGrok({
        modelName: MODEL_WRITER,
        system: draftSystemPrompt,
        prompt: `[FACT SHEET]\n${factSheet}\n\n[BRIEF]\n${JSON.stringify(brief, null, 2)}\n\n[CURRENT DRAFT]\n${contentDraft}\n\n[EDITOR FEEDBACK]\n${
          evalResult.reason || 'Improve accuracy, tone, and natural Thai flow.'
        }\n\nRewrite the content now.`,
        temperature: 0.4,
        allowEmoji,
      });

      return polishThaiContent(revisedDraft, { format, customInstructions, allowEmoji, tone });
    }
  } catch (error) {
    console.warn('[GrokService] Editor pass skipped (v2):', error);
  }

  return polishThaiContent(contentDraft, { format, customInstructions, allowEmoji, tone });
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
