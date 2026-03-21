import { createXai } from '@ai-sdk/xai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { getUserInfo, searchEverything } from './TwitterService';

const MODEL_NEWS_FAST = 'grok-4-1-fast-non-reasoning';
const MODEL_REASONING_FAST = 'grok-4-1-fast-reasoning';
const MODEL_WRITER = 'grok-4-1-fast-reasoning';
const MODEL_MULTI_AGENT = 'grok-4.20-multi-agent-0309';

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

const getTweetEngagementScore = (tweet) => {
  const likes = Number(tweet?.like_count || 0);
  const reposts = Number(tweet?.retweet_count || 0);
  const replies = Number(tweet?.reply_count || 0);
  const views = Number(tweet?.view_count || 0);

  return likes + reposts * 2 + replies * 1.5 + views / 1000;
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

const callGrok = async ({
  system,
  prompt,
  modelName = MODEL_NEWS_FAST,
  useResponses = false,
  providerOptions,
  temperature,
}) => {
  try {
    const { text } = await generateText({
      model: useResponses ? grok.responses(modelName) : grok(modelName),
      system,
      prompt,
      providerOptions,
      ...(typeof temperature === 'number' ? { temperature } : {}),
    });

    return text.trim();
  } catch (error) {
    console.error(`[GrokService] Error calling ${modelName}:`, error);
    throw error;
  }
};

const deriveResearchQuery = async (input) => {
  const fallback = (input || '').replace(/\s+/g, ' ').trim().slice(0, 160);

  if (!fallback) return '';

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system:
        'สกัดหนึ่งหัวข้อค้นหาที่กระชับจากคำขอที่ได้รับ โดยรักษาชื่อสำคัญ, ผลิตภัณฑ์, บริษัท และหัวข้อหลักไว้ ส่งผลลัพธ์เป็น JSON เท่านั้น',
      prompt: input,
      schema: z.object({
        searchQuery: z.string().min(3).max(160),
      }),
    });

    return object.searchQuery.trim();
  } catch (error) {
    console.warn('[GrokService] Falling back to raw research query:', error);
    return fallback;
  }
};

const rankExpertCandidates = (tweets, excludeUsernames = []) => {
  const excluded = new Set(
    (excludeUsernames || []).map((username) => String(username || '').toLowerCase()),
  );
  const candidates = new Map();

  for (const tweet of tweets || []) {
    const username = String(tweet.author?.username || '').trim();
    if (!username) continue;

    const key = username.toLowerCase();
    if (excluded.has(key)) continue;

    // --- STRICT QUALITY FILTER ---
    const displayName = String(tweet.author?.name || '').trim();
    // 1. Filter out bot-like or nonsense names (e.g. "° III..IIIIIIII I ." or just emojis)
    const emojiCount = (displayName.match(/\p{Emoji_Presentation}/gu) || []).length;
    const isMostlyEmoji = emojiCount > 0 && emojiCount > displayName.length * 0.3; // Stricter: 30%
    const isGibberish = /^[.\s°|!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?-]+$/.test(displayName) || displayName.length < 2;
    const isGenericUser = /^[0-9]+$/.test(username) || username.length < 3;
    const isLikelyPersonal = /(จ้ะ|นะ|ครับ|ค่ะ|จ้า|อิอิ|555)$/i.test(displayName); // Skip very casual personal accounts
    
    if (isMostlyEmoji || isGibberish || isGenericUser || isLikelyPersonal) continue;
    // ----------------------------

    const entry = candidates.get(key) || {
      name: tweet.author?.name || username,
      username,
      appearances: 0,
      engagementScore: 0,
      latestTimestamp: 0,
      samplePosts: [],
    };

    entry.appearances += 1;
    entry.engagementScore += getTweetEngagementScore(tweet);

    const timestamp = new Date(tweet.created_at || 0).getTime();
    if (Number.isFinite(timestamp)) {
      entry.latestTimestamp = Math.max(entry.latestTimestamp, timestamp);
    }

    if (entry.samplePosts.length < 2 && tweet.text) {
      entry.samplePosts.push(tweet.text.replace(/\s+/g, ' ').trim());
    }

    candidates.set(key, entry);
  }

  return Array.from(candidates.values())
    .sort((a, b) => {
      // PROMOTING GLOBAL EXPERTS:
      // Give a slight penalty to accounts with Thai characters in their name 
      // when we want "Global Experts". This encourages international accounts to rise up.
      const aIsThai = /[\u0E00-\u0E7F]/.test(a.name);
      const bIsThai = /[\u0E00-\u0E7F]/.test(b.name);
      
      let aBonus = 0;
      let bBonus = 0;
      
      // If we find an account that is clearly NOT Thai, give it a ranking boost 
      // since the user wants the "best in the field" (usually global/verified accounts)
      if (!aIsThai) aBonus += 50; 
      if (!bIsThai) bBonus += 50;

      const scoreA = a.engagementScore + a.appearances * 25 + aBonus;
      const scoreB = b.engagementScore + b.appearances * 25 + bBonus;

      const scoreDelta = scoreB - scoreA;
      if (scoreDelta !== 0) return scoreDelta;
      return b.latestTimestamp - a.latestTimestamp;
    })
    .slice(0, 15);
};

const hydrateExperts = async (candidates) => {
  const hydrated = await Promise.all(
    (candidates || []).map(async (candidate) => {
      try {
        const user = await getUserInfo(candidate.username);
        return {
          ...candidate,
          name: user?.name || candidate.name,
          username: user?.username || candidate.username,
          description: user?.description || '',
        };
      } catch {
        return {
          ...candidate,
          description: '',
        };
      }
    }),
  );

  return hydrated;
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
        outputRule: 'Return one Thai summary for each input in the same order.',
      }),
      schema: z.object({
        summaries: z.array(z.string()).length(stories.length),
      }),
      temperature: 0.2,
    });

    return object.summaries.map((summary) => summary.trim());
  } catch (error) {
    console.error('[GrokService] Batch summarization error:', error);
    return stories.map(() => '(Grok API Error)');
  }
};

export const agentFilterFeed = async (tweetsData, userPrompt) => {
  if (!tweetsData?.length) return [];

  const compressedInput = tweetsData.map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    username: tweet.author?.username || null,
  }));

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: `Select only the posts that match this user intent: "${userPrompt}".
Return IDs only. Remove spam, scams, engagement bait, duplicates, and off-topic posts.`,
      prompt: JSON.stringify(compressedInput),
      schema: z.object({
        validIds: z.array(z.string()),
      }),
      temperature: 0,
    });

    const validIdSet = new Set(compressedInput.map((tweet) => tweet.id));
    return object.validIds.filter((id) => validIdSet.has(id));
  } catch (error) {
    console.error('[GrokService] Filter error:', error);
    return tweetsData.map((tweet) => tweet.id);
  }
};

export const generateExecutiveSummary = async (validTweets, userQuery) => {
  if (!validTweets?.length) return null;

  const contentToAnalyze = validTweets
    .slice(0, 10)
    .map((tweet, index) => `[${index + 1}] ${tweet.text}`)
    .join('\n---\n');

  return callGrok({
    modelName: MODEL_REASONING_FAST,
    system: `คุณคือนักวิเคราะห์ที่กำลังเขียนสรุปสำหรับผู้บริหารแบบกระชับในหัวข้อ "${userQuery}" เป็นภาษาไทย
เขียน 2-3 ประโยคในภาษาไทย เน้นเฉพาะประเด็นสำคัญที่น่าเชื่อถือที่สุด
ใช้ตัวหนา (markdown bold) สำหรับวลีที่สำคัญที่สุดถ้าจำเป็น ห้ามมีหัวข้อหลักด้านบน`,
    prompt: contentToAnalyze,
    providerOptions: {
      xai: {
        reasoningEffort: 'medium',
      },
    },
  });
};

export const expandSearchQuery = async (originalQuery, isLatest = false) => {
  if (!originalQuery) return originalQuery;

  const today = new Date().toISOString().split('T')[0];

  try {
    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `เปลี่ยนหัวข้อของผู้ใช้ให้เป็นคำค้นหาขั้นสูง (Advanced Search) บน X เพื่อหาข้อมูลระดับสากล
กฎ:
- รักษาเจตนาเดิมของหัวข้อที่ต้องการค้นหา
- ขยายคำค้นหาโดยใช้ทั้งภาษาไทยและ "ภาษาอังกฤษ" (English keywords) เพื่อให้ครอบคลุมข้อมูลระดับโลก
- ใช้ OR เชื่อมระหว่างคำค้นหาไทยและอังกฤษ เช่น (คริปโต OR crypto)
- ต้องใส่ -filter:replies เสมอ 1 ครั้ง
- ${isLatest ? `เพิ่ม since:${today} เพื่อเน้นความใหม่ล่าสุด` : 'เน้นโพสต์ที่มีสัญญาณสำคัญสูง เหมาะสำหรับผลลัพธ์แบบยอดนิยม (Top)'}
- ส่งคืนผลลัพธ์เป็น JSON เท่านั้น`,
      prompt: `Topic: ${originalQuery}`,
      schema: z.object({
        finalXQuery: z.string().min(3),
      }),
      providerOptions: {
        xai: {
          reasoningEffort: 'medium',
        },
      },
    });

    const finalQuery = object.finalXQuery.replace(/\s+/g, ' ').trim();
    return finalQuery.includes('-filter:replies')
      ? finalQuery
      : `${finalQuery} -filter:replies`;
  } catch (error) {
    console.error('[GrokService] Query optimizer error:', error);
    return `${originalQuery} -filter:replies`;
  }
};

export const discoverTopExperts = async (categoryQuery, excludeUsernames = []) => {
  const fallbackReasoning = (candidate) =>
    `บัญชีคุณภาพในหัวข้อ ${categoryQuery} ที่มีการอัปเดตข้อมูลที่น่าสนใจอย่างสม่ำเสมอ`;

  try {
    const [topQuery, latestQuery] = await Promise.all([
      expandSearchQuery(categoryQuery, false).catch(() => `${categoryQuery} -filter:replies`),
      expandSearchQuery(categoryQuery, true).catch(() => `${categoryQuery} -filter:replies`),
    ]);

    const [topResults, latestResults] = await Promise.all([
      searchEverything(topQuery, '', true, 'Top').catch(() => ({ data: [] })),
      searchEverything(latestQuery, '', true, 'Latest').catch(() => ({ data: [] })),
    ]);

    const mergedTweets = [...(topResults.data || []), ...(latestResults.data || [])];
    const rankedCandidates = rankExpertCandidates(mergedTweets, excludeUsernames);

    if (!rankedCandidates.length) return [];

    const hydratedCandidates = await hydrateExperts(rankedCandidates);
    const candidateLookup = new Map(
      hydratedCandidates.map((candidate) => [candidate.username.toLowerCase(), candidate]),
    );

    try {
      const { object } = await generateObject({
        model: grok(MODEL_REASONING_FAST),
        system: `คุณคือตัวแทนในการคัดเลือก "สุดยอดผู้เชี่ยวชาญระดับโลก" (Global Authority Selection)
ภารกิจ: จากรายชื่อที่ให้มา จงเลือกเฉพาะบัญชีที่เป็น "Global Best-in-class" ในหัวข้อ "${categoryQuery}" เท่านั้น
เป้าหมาย: เราต้องการบัญชีที่ "เก่งที่สุดในโลก" ไม่ใช่บัญชีส่วนตัวหรือบัญชีท้องถิ่นทั่วไป

กฎเหล็ก:
1. ห้ามเลือกบัญชีที่มีลักษณะเป็น "Personal Account" หรือบัญชีแนวบ่นเพ้อทั่วไป
2. ให้ความสำคัญสูงสุดกับบัญชีที่เป็น ภาษาอังกฤษ หรือบัญชีสากลที่เป็นที่ยอมรับ
3. หากในรายการไม่มีบัญชีที่ "เก่งจริง" หรือ "ตรงประเด็น" ให้ส่งค่าว่างกลับมา (ห้ามเลือกแบบขอไปที)
4. สำหรับฟิลด์ reasoning: เขียนเป็นภาษาไทย 1 ประโยคสั้นๆ เน้นความว้าวว่าทำไมเขาถึงเป็น "ที่สุดในสายนี้"`,
        prompt: JSON.stringify({
          topic: categoryQuery,
          candidates: hydratedCandidates.map((candidate) => ({
            name: candidate.name,
            username: candidate.username,
            description: candidate.description,
            appearances: candidate.appearances,
            engagementScore: Math.round(candidate.engagementScore),
            samplePosts: candidate.samplePosts,
          })),
        }),
        schema: z.object({
          experts: z.array(
            z.object({
              username: z.string(),
              reasoning: z.string().min(10).max(220),
            }),
          ).max(6),
        }),
        providerOptions: {
          xai: {
            reasoningEffort: 'medium',
          },
        },
      });

      const finalExperts = [];

      for (const expert of object.experts) {
        const candidate = candidateLookup.get(expert.username.toLowerCase());
        if (!candidate) continue;
        if (finalExperts.some((item) => item.username.toLowerCase() === candidate.username.toLowerCase())) {
          continue;
        }

        finalExperts.push({
          name: candidate.name,
          username: candidate.username,
          reasoning: expert.reasoning.trim(),
        });
      }

      if (finalExperts.length > 0) {
        return finalExperts.slice(0, 6);
      }
    } catch (error) {
      console.warn('[GrokService] Expert ranking fell back to heuristics:', error);
    }

    return hydratedCandidates.slice(0, 6).map((candidate) => ({
      name: candidate.name,
      username: candidate.username,
      reasoning: fallbackReasoning(candidate),
    }));
  } catch (error) {
    console.error('[GrokService] Expert discovery error:', error);
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
      }),
      searchEverything(researchQuery, '', false, 'Top').catch(() => ({ data: [] })),
      searchEverything(researchQuery, '', false, 'Latest').catch(() => ({ data: [] })),
    ]);

    if (webResponse.ok) {
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

    const xTweets = [...(xTopResponse.data || []).slice(0, 4), ...(xLatestResponse.data || []).slice(0, 4)];
    extractedSources.push(...extractSourcesFromTweets(xTweets, 6));

    if (xTweets.length) {
      xContext = `[X EVIDENCE]\n${toTweetEvidence(xTweets, 6)}`;
    }
  } catch (error) {
    console.error('[GrokService] Search aggregation error:', error);
  }

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
`,
    prompt: [
      `[ORIGINAL REQUEST]\n${input}`,
      `[SEARCH QUERY]\n${researchQuery}`,
      webContext,
      xContext,
    ]
      .filter(Boolean)
      .join('\n\n'),
    providerOptions: {
      xai: {
        reasoningEffort: 'high',
      },
    },
  });

  const resultPayload = {
    factSheet,
    sources: dedupeSources(extractedSources).slice(0, 8),
  };

  factCache.set(input, resultPayload);
  return resultPayload;
};

export const generateStructuredContent = async (
  factSheet,
  length,
  tone,
  format,
  onStreamChunk,
) => {
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
6. สำหรับเนื้อหาปานกลางและยาว ให้ใช้ Markdown หัวข้อ (Headings) และจบด้วย "## บทสรุป"`;

  const draftUserPrompt = `[FACT SHEET]\n${factSheet}\n\nWrite the final Thai content now.`;

  if (onStreamChunk) {
    try {
      const { textStream } = await streamText({
        model: grok(MODEL_WRITER),
        system: draftSystemPrompt,
        prompt: draftUserPrompt,
        temperature: 0.7,
      });

      let fullContent = '';
      for await (const textPart of textStream) {
        fullContent += textPart;
        onStreamChunk(cleanMarkdown(fullContent));
      }

      return cleanMarkdown(fullContent);
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
      providerOptions: {
        xai: {
          reasoningEffort: 'medium',
        },
      },
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
        }),
      );
    }
  } catch (error) {
    console.warn('[GrokService] Editor pass skipped:', error);
  }

  return cleanMarkdown(contentDraft);
};

export const generateFinalContent = async (enrichedData, targetFormat, customPrompt = '') => {
  try {
    return await callGrok({
      modelName: MODEL_MULTI_AGENT,
      useResponses: true,
      system: `สร้างผลงานเนื้อหาภาษาไทยที่ขัดเกลาแล้วในรูปแบบของ "${targetFormat}"
อ้างอิงจากข้อมูลวิจัยที่ให้มาเท่านั้น`,
      prompt: `[RESEARCH]\n${enrichedData}\n\n[EXTRA INSTRUCTIONS]\n${customPrompt || 'None'}`,
      providerOptions: {
        xai: {
          reasoningEffort: 'medium',
        },
      },
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
