import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { searchEverything } from './TwitterService';

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;

// 🟢 [NEWS FLOW TEAM] - Powered by Grok 4.1 (Fast & Specialized for News)
const MODEL_NEWS_FAST = 'grok-4.1-fast-non-reasoning';

// 🔵 [CONTENT FLOW TEAM] - Powered by Grok 4.20 (The Multi-Agent Elite)
// Note: 4.20 has NO fast version. Research & Editor use 4.1 for speed.
const MODEL_AGENT_RESEARCH = 'grok-4.1-fast-non-reasoning'; // Fast fact-checker
const MODEL_AGENT_WRITER = 'grok-4.20-0309-reasoning';      // Deep writer
const MODEL_AGENT_ORCHESTRATOR = 'grok-4.20-multi-agent-0309'; // Orchestrator

// Create Vercel AI SDK Provider for X.AI
const grok = createOpenAI({
  apiKey: XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const SUMMARIZATION_RULES = `
You are an AI that converts social media posts into short, clear Thai news-style summaries.
Your goal is to ALWAYS translate the content into Thai, while preserving English for technical terms and proper nouns.

CONTENT RULES:
- Preserve the original meaning of the post.
- Do not add interpretations or assumptions.

TRANSLATION & LANGUAGE RULES:
- NEVER return the original raw English text as the final summary.
- ALWAYS construct the sentences in Thai for readability.
- HOWEVER, keep all proper nouns (people, companies, tech, projects) in English.
- Avoid exaggeration or absolute claims.

STYLE RULES:
- Write in simple Thai news-style language.
- Maximum 1–2 sentences.

PROPER NOUN RULES:
- Keep all proper nouns in English (names of people, accounts, companies, products, technologies, and projects).
- Do NOT translate or transliterate proper nouns into Thai.

SOCIAL MEDIA RULES:
- Do NOT mention Twitter or X.
- Do NOT include any URL or link.
`;

const callGrok = async (systemPrompt, userPrompt, modelName) => {
  try {
    const { text } = await generateText({
      model: grok(modelName),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });
    return text;
  } catch (error) {
    console.error(`[GrokService] Error calling ${modelName}:`, error);
    throw error;
  }
};

// --- [NEWS FLOW FUNCTIONS] ---

export const generateGrokSummary = async (fullStoryText) => {
  const systemPrompt = `You are an AI summary agent. ${SUMMARIZATION_RULES}`;
  return await callGrok(systemPrompt, fullStoryText, MODEL_NEWS_FAST);
};

export const generateGrokBatch = async (stories) => {
  if (!stories || stories.length === 0) return [];
  const systemPrompt = `You are a Batch Processing AI. Summarize each post following these strict rules:\n${SUMMARIZATION_RULES}`;
  const userPrompt = `Posts to process (${stories.length}):\n${stories.map((s, i) => `[ID:${i}] ${s}`).join('\n---\n')}`;

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        summaries: z.array(z.string())
      }),
      temperature: 0.3,
    });
    return object.summaries || stories.map(() => "(Summarization Error)");
  } catch (e) {
    console.error('[GrokService] Batch Summarization Error:', e);
    return stories.map(() => "(Grok API Error)");
  }
};

export const agentFilterFeed = async (tweetsData, userPrompt) => {
  const systemPrompt = `[MODE: GROK 4.1 INSPECTOR]
  Filter noise for user intent: "${userPrompt}". 
  Exclude spam, scams, or irrelevant junk. Output only the IDs of passing tweets.`;

  const compressedInput = tweetsData.map(t => ({ id: t.id, text: t.text }));
  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: systemPrompt,
      prompt: JSON.stringify(compressedInput),
      schema: z.object({
        validIds: z.array(z.string())
      }),
    });
    return object.validIds;
  } catch (e) {
    console.error('[GrokService] Filter Error:', e);
    return tweetsData.map(t => t.id);
  }
};

export const generateExecutiveSummary = async (validTweets, userQuery) => {
  if (!validTweets || validTweets.length === 0) return null;
  const contentToAnalyze = validTweets.map(t => t.text).join('\n---\n');
  const systemPrompt = `Analyze these findings for: "${userQuery}". Write a professional 2-3 sentence Thai summary. Use **bold** for key insights. NO headers.`;
  return await callGrok(systemPrompt, contentToAnalyze, MODEL_NEWS_FAST);
};

export const expandSearchQuery = async (originalQuery, isLatest = false) => {
  if (!originalQuery) return originalQuery;
  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = `Translate user intent into Twitter Advanced Search syntax. Use OR logic for expanded keywords.
  Mode: ${isLatest ? 'LATEST (since:'+today+')' : 'TOP (min_faves:500)'}. 
  ALWAYS include '-filter:replies'. Return JSON with key 'finalXQuery'.`;

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: systemPrompt,
      prompt: `Target topic: "${originalQuery}"`,
      schema: z.object({
        finalXQuery: z.string()
      })
    });
    return object.finalXQuery;
  } catch (error) {
    console.error("[GrokService] Query Optimizer Error:", error);
    return `${originalQuery} -filter:replies`;
  }
};

export const discoverTopExperts = async (categoryQuery, excludeUsernames = []) => {
  const systemPrompt = `Identify TOP 6 GLOBAL EXPERTS on X for: "${categoryQuery}". 
  Exclude: [${excludeUsernames.join(', ')}]. Active accounts only.`;
  
  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: systemPrompt,
      prompt: `Category: ${categoryQuery}`,
      schema: z.object({
        experts: z.array(z.object({
          name: z.string(),
          username: z.string(),
          reasoning: z.string()
        }))
      }),
      temperature: 0.5,
    });
    return object.experts;
  } catch (error) {
    console.error('[GrokService] Expert Discovery Error:', error);
    return [];
  }
};

export const researchContext = async (query, interactionData = '') => {
  const systemPrompt = `Research historical context and sentiments for: ${query}. Use search data: ${interactionData}. Write a deep Thai Dossier.`;
  return await callGrok(systemPrompt, `Topic: ${query}`, MODEL_NEWS_FAST);
};

// --- [CONTENT FLOW FUNCTIONS - MULTI-AGENT] ---

const factCache = new Map();

export const researchAndPreventHallucination = async (input) => {
  if (factCache.has(input)) return factCache.get(input);

  let generalContext = "";
  let extractedSources = [];
  try {
    const [webRes, xRes] = await Promise.all([
      fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: import.meta.env.VITE_TAVILY_API_KEY,
          query: input,
          search_depth: "basic",
          include_answer: true,
          max_results: 3
        })
      }),
      searchEverything(input, '', false, 'Top').catch(e => ({ data: [] }))
    ]);

    if (webRes.ok) {
        const data = await webRes.json();
        generalContext = `[WEB Context]: ${data.answer || ''}\n${data.results.map(r => `- ${r.title} (${r.url})`).join('\n')}`;
        extractedSources.push(...data.results.map(r => ({ title: r.title, url: r.url })));
    }
    if (xRes?.data) {
        generalContext += `\n[X Context]: ${xRes.data.slice(0,3).map(t => t.text).join('\n')}`;
    }
  } catch(e) { console.error("[GrokService] Search Error:", e); }

  const systemPrompt = `[MODE: GROK 4.20 HARPER RESEARCH]
  Analyze inputs/search results to create a Deep Thai Fact & Sentiment Sheet.
  MUST include real URLs for sources. NO article writing. Only facts and sentiment insights.`;

  const factSheet = await callGrok(systemPrompt, `Research Input: ${input}\nContext: ${generalContext}`, MODEL_AGENT_RESEARCH);
  const resultPayload = { factSheet, sources: extractedSources };
  factCache.set(input, resultPayload);
  return resultPayload;
};

export const generateStructuredContent = async (factSheet, length, tone, format, onStreamChunk) => {
  let lengthInstruction = length;
  if (length === 'short') lengthInstruction = 'แบบสั้นกระชับ (Short) - ให้จบภายใน 1 ย่อหน้าสั้นๆ หรือ 3-4 บรรทัด (ไม่เกิน 150 คำ). เน้นเนื้อหาสำคัญและบทสรุปทันที';
  if (length === 'medium') lengthInstruction = 'แบบปานกลาง (Medium) - ความยาวขั้นต่ำ 400 คำ. ต้องมีรายละเอียดเชิงลึกและบทสรุปที่ชัดเจน';
  if (length === 'long') lengthInstruction = 'แบบเจาะลึก (Long) - ความยาวขั้นต่ำ 800 คำ. ลงรายละเอียดแบบจัดเต็มแบบ Long-form พร้อมบทวิเคราะห์และสรุปส่งท้าย';

  const draftSystemPrompt = `[MODE: GROK 4.20 ELITE WRITER]
  Target Length: ${lengthInstruction} | Tone: ${tone} | Format: ${format}
  STRICT RULES:
  1. NO Hallucinations. Fact Sheet ONLY.
  2. Professional Thai Journalist style. NO cringe slang.
  3. ADAPTIVE STRUCTURE:
     - SHORT: No # headers. Use bold text or emojis. Strong Hook.
     - MEDIUM/LONG: Start with # [TITLE]. Use # [SUBHEADERS]. End with ## [บทสรุป].
  4. NO Source links in text. Natural, fluid Thai with English proper nouns.`;

  const draftUserMsg = `[FACT SHEET]: \n${factSheet}\n\nDeliver the professional Thai content.`;

  if (onStreamChunk) {
    try {
      const { textStream } = await streamText({
        model: grok(MODEL_AGENT_WRITER),
        system: draftSystemPrompt,
        prompt: draftUserMsg,
        temperature: 0.7,
      });

      const postProcess = (text) => text.replace(/^#\s(บทนำ|คำนำ|Introduction|Intro|Overview).*\n?/gim, '').replace(/^#\s+(Conclusion|Summary|บทส่งท้าย).*/gim, '## บทสรุป');
      
      let fullContent = '';
      for await (const textPart of textStream) {
        fullContent += textPart;
        onStreamChunk(postProcess(fullContent));
      }
      return postProcess(fullContent);
    } catch (e) {
      console.error("[GrokService] Streaming Error:", e);
      throw e;
    }
  }
  
  // Standard Path
  const contentDraft = await callGrok(draftSystemPrompt, draftUserMsg, MODEL_AGENT_WRITER);

  // Editor Review (4.20 Team)
  const editorPrompt = `Check [DRAFT] against [FACT SHEET] for accuracy and tone. If perfect, reply {"passed": true}. If not, reply {"passed": false, "reason": "why"}.`;
  try {
    const { object: evalResult } = await generateObject({
      model: grok(MODEL_AGENT_RESEARCH), // Use 4.20 Fast for editing
      system: editorPrompt,
      prompt: `[FACT SHEET]: ${factSheet}\n[DRAFT]: ${contentDraft}`,
      schema: z.object({ passed: z.boolean(), reason: z.string().optional() })
    });
    if (!evalResult.passed) {
       console.warn("⚠️ Editor requested correction:", evalResult.reason);
       return await callGrok(draftSystemPrompt, `[DRAFT]: ${contentDraft}\n[FEEDBACK]: ${evalResult.reason}\nRewrite keeping Fact Sheet accuracy.`, MODEL_AGENT_WRITER);
    }
  } catch (e) { console.error("Editor ignored due to validation error:", e); }

  return contentDraft.replace(/^#\s(บทนำ|คำนำ|Introduction|Intro|Overview).*\n?/gim, '').replace(/^#\s+(Conclusion|Summary|บทส่งท้าย).*/gim, '## บทสรุป');
};

export const generateFinalContent = async (enrichedData, targetFormat, customPrompt = '') => {
  const systemPrompt = `[MODE: GROK 4.20 ORCHESTRATOR] 
  Create an elite Thai piece (Format: ${targetFormat}) using this research data: ${enrichedData}. Custom Request: ${customPrompt}`;
  return await callGrok(systemPrompt, `Create the masterpiece.`, MODEL_AGENT_ORCHESTRATOR);
};

export const generateContentArticle = generateFinalContent;
export const generateArticle = generateFinalContent;
