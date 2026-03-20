import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { searchEverything } from './TwitterService';

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const MODEL_SYNC = 'grok-2-1212'; // Grok Fast for Sync
const MODEL_NON_REASONING = 'grok-2-1212'; // Normal Fast
const MODEL_REASONING = 'grok-2-1212'; // Expert Reasoning

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
- HOWEVER, keep all proper nouns (people, companies, tech, projects) in English as per the PROPER NOUN RULES below.
- Avoid exaggeration or absolute claims unless clearly stated.
- If the post compares ideas, keep both sides in the summary.
- If the post contains reasoning (cause → result), preserve that logic.

- If the post is already short (about 25 words or fewer), do NOT summarize.
- Rewrite it clearly in Thai instead. Do not expand the content.

STYLE RULES:
- Write in simple Thai news-style language.
- Maximum 1–2 sentences. Each sentence should be concise and easy to read.

PROPER NOUN RULES:
- Keep all proper nouns in their original English form (names of people, accounts, companies, organizations, products, technologies, and projects).
- Do NOT translate or transliterate proper nouns into Thai.

SOCIAL MEDIA RULES:
- Do NOT mention Twitter or X.
- Do NOT include any URL or link.
- Do NOT write phrases such as "โพสต์บน X", "via X", or similar. 
- Do not describe the tweet itself.

SPECIAL CASE RULES:
- If the post contains sarcasm, humor, or opinion, keep the intent but do not present it as literal fact.
- If the post is already concise, rewrite it slightly instead of copying it directly.

OUTPUT:
- Return only the final Thai summary text. No explanations.
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
    console.error('Grok Error:', error);
    throw error;
  }
};

export const generateGrokSummary = async (fullStoryText) => {
  const systemPrompt = `You are an AI that converts social media posts into short, clear Thai news-style summaries. ${SUMMARIZATION_RULES}`;
  return await callGrok(systemPrompt, fullStoryText, MODEL_NON_REASONING);
};

export const generateGrokBatch = async (stories) => {
  if (!stories || stories.length === 0) return [];
  
  const systemPrompt = `You are a Batch Processing AI. Summarize each post following these strict rules:
  ${SUMMARIZATION_RULES}`;

  const userPrompt = `Posts to process (${stories.length}):\n${stories.map((s, i) => `[ID:${i}] ${s}`).join('\n---\n')}`;

  try {
    // 🛡️ Bulletproof JSON with Zod & generateObject
    const { object } = await generateObject({
      model: grok(MODEL_SYNC),
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        summaries: z.array(z.string()).describe("An array of summarized Thai strings corresponding to the input posts.")
      }),
      temperature: 0.3,
    });
    
    return object.summaries || stories.map(() => "(Grok Error)");
  } catch (e) {
    console.error('Grok Batch Parse Error (Zod Validation Failed):', e);
    return stories.map(() => "(Grok Parse Error)");
  }
};

export const agentFilterFeed = async (tweetsData, userPrompt) => {
  const systemPrompt = `[MODE: GROK 4.20 INSPECTOR]
You are Agent 2 in a 3-Tier Multi-Agent system. Your job is to filter noise.
Given an array of raw tweets and the user's search intent: "${userPrompt}", you must scrutinize each tweet.
RULES:
1. Exclude spam, explicit content, highly irrelevant clickbait, or crypto scams.
2. If the tweet is highly relevant and high quality, INCLUDE its 'id'.
3. OUTPUT ONLY the 'id's of the passing tweets as a JSON array of strings.`;

  const compressedInput = tweetsData.map(t => ({ id: t.id, text: t.text }));
  const userMsg = `Tweets to inspect:\n${JSON.stringify(compressedInput)}`;
  
  try {
    const { object } = await generateObject({
      model: grok(MODEL_NON_REASONING),
      system: systemPrompt,
      prompt: userMsg,
      schema: z.object({
        validIds: z.array(z.string()).describe("Array of valid tweet IDs that pass the quality filter.")
      }),
    });
    return object.validIds;
  } catch (e) {
    console.error('Agent Filter Parse Error (Zod Validation Failed):', e);
    return tweetsData.map(t => t.id); // fallback to showing everything
  }
};

export const generateExecutiveSummary = async (validTweets, userQuery) => {
  if (!validTweets || validTweets.length === 0) return null;
  const contentToAnalyze = validTweets.map(t => t.text).join('\n---\n');
  const systemPrompt = `[MODE: GROK BETA SYNTHESIZER]
You are Agent 3 in a Multi-Agent system. Your job is to read the top filtered tweets and write a brilliant Executive Summary.
User Intent: "${userQuery}"

RULES:
1. Read the provided tweets and identify the main consensus or breaking news.
2. Write a single, highly professional 2-3 sentence summary.
3. Use Thai language. Use **bold text** for key emphasis.
4. DO NOT use # headers or any intro phrases. Just deliver the insights directly.`;

  return await callGrok(systemPrompt, contentToAnalyze, MODEL_REASONING);
};

export const generateFinalContent = async (enrichedData, targetFormat, customPrompt = '') => {
  let promptGoal = '';
  
  switch (targetFormat) {
    case 'long-form':
      promptGoal = 'เขียนคอนเทนต์ยาวเชิงลึก (Long-form Content) ที่มีความเป็นมืออาชีพ มีโครงสร้างที่ชัดเจน (หัวข้อ, เนื้อหาหลัก, บทสรุป)';
      break;
    case 'social':
      promptGoal = 'เขียนคอนเทนต์สำหรับ Social Media (Facebook, LinkedIn) ที่เน้นความกระชับ มี Hook ที่น่าสนใจ และใส่ Hashtag ที่เกี่ยวข้อง';
      break;
    case 'analytical':
      promptGoal = 'เขียนคอนเทนต์เชิงวิเคราะห์ (Analytical Content) ที่เน้นข้อมูลสถิติ ความเชื่อมโยง และการคาดการณ์ในอนาคต';
      break;
    case 'custom':
      promptGoal = `เขียนคอนเทนต์ตามคำสั่งพิเศษของผู้ใช้: "${customPrompt}"`;
      break;
    default:
      promptGoal = 'เขียนคอนเทนต์สรุปประเด็นสำคัญ';
  }

  const systemPrompt = `คุณคือผู้เชี่ยวชาญด้านการสร้างคอนเทนต์ (Content Strategist)
  หน้าที่ของคุณคือ: ${promptGoal}
  
  ข้อมูลสนับสนุนสำหรับการเขียน (Research Data):
  ${enrichedData}

  กฎการเขียน:
  1. ภาษาไทยที่เป็นมืออาชีพและน่าดึงดูด
  2. รักษาชื่อเฉพาะ (Proper Nouns) เป็นภาษาอังกฤษตามเดิม
  3. ห้ามเติมข้อมูลเท็จที่ไม่อยู่ใน Research Data 
  4. หากเป็นแนววิเคราะห์ ให้เน้นความเป็นเหตุเป็นผล`;

  const userMsg = `สร้างคอนเทนต์จากข้อมูลรีเสิร์ชที่ให้มา โดยให้ผลลัพธ์ที่ยอดเยี่ยมที่สุด`;
  
  return await callGrok(systemPrompt, userMsg, MODEL_REASONING);
};

export const expandSearchQuery = async (originalQuery, isLatest = false) => {
  if (!originalQuery) return originalQuery;
  
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `[MODE: GROK 4.20 SEARCH OPTIMIZER]
You are a Twitter/X Advanced Search Query Expert for FORO Intelligence.
Your job is to translate user natural language intent into raw Twitter API Advanced Search syntax.

RULES:
1. Extract core topics/keywords. Expand them into 5-7 HIGHLY MODERN, CURRENTLY RELEVANT examples. Combine using OR logic.
2. Default to GLOBAL search (don't use lang:th unless requested).
3. ALWAYS append '-filter:replies'.
4. THE USER SELECTED MODE: ${isLatest ? 'LATEST (FRESH & ELITE QUALITY)' : 'TOP (MAXIMUM ELITE QUALITY)'}.
   - IF LATEST: Focus on the LAST 48 HOURS but ONLY high-traction news.
     * Use 'since:${today}'.
     * Use 'min_faves:50' OR 'min_retweets:10' (Hard filter for elite content).
   - IF TOP (ELITE): Focus on THE ABSOLUTE BEST OF ALL TIME.
     * Mainstream topics: 'min_faves:1500' to '5000'.
     * Professional/Niche: 'min_faves:200' to '500'.
     * DO NOT use 'since:' date filters.
5. OUTPUT ONLY A VALID JSON OBJECT with key 'finalXQuery'. THE USER DEMANDS ELITE QUALITY.`;

  try {
    const { object } = await generateObject({
      model: grok(MODEL_REASONING),
      system: systemPrompt,
      prompt: `User Query: "${originalQuery}"\nGenerate the optimal X Advanced Search query string.`,
      schema: z.object({
        finalXQuery: z.string().describe("The raw Twitter Advanced Search string.")
      })
    });
    return object.finalXQuery;
  } catch (error) {
    console.error("Query Optimizer Error:", error);
    const defaultAppendix = isLatest ? 'filter:news -filter:replies' : 'min_faves:500 -filter:replies';
    return `(${originalQuery}) lang:th ${defaultAppendix}`;
  }
};

export const discoverTopExperts = async (categoryQuery, excludeUsernames = []) => {
  const systemPrompt = `You are a World-Class Industry Analyst and Search Expert.
  Your task is to identify the TOP 6 most influential, credible, and famous expert accounts on X (Twitter) for a specific category.
  
  CORE OBJECTIVE:
  - Prioritize WORLD-CLASS GLOBAL LEADERS and famous international experts.
  - USE YOUR REAL-TIME SEARCH (Websearch/X-Search) to check the LATEST POST DATE for each account.
  - CRITICAL: Only recommend accounts with QUALITY content within the LAST 7-14 DAYS.
  - If an expert changed usernames, provide the NEW correct handle.
  - OBSOLETE, DORMANT, or INACTIVE accounts MUST be excluded regardless of fame.
  - For specific Thai queries, include top-tier Thai experts.
  
  RULES:
  1. Identify exactly 6 accounts.
  2. EXCLUDE these usernames if provided: [${excludeUsernames.join(', ')}]. Provide DIFFERENT experts if you see this list.`;

  const userMsg = `Category: ${categoryQuery}`;
  
  try {
    // 🛡️ Bulletproof JSON for Experts Discovery
    const { object } = await generateObject({
      model: grok(MODEL_REASONING),
      system: systemPrompt,
      prompt: userMsg,
      schema: z.object({
        experts: z.array(z.object({
          name: z.string().describe("Full name or Display name."),
          username: z.string().describe("The exact X handle (without @)."),
          reasoning: z.string().describe("Friendly Thai description (plain text, NO markdown headers).")
        })).min(1)
      }),
      temperature: 0.5,
    });
    
    return object.experts;
  } catch (error) {
    console.error('Expert Discovery Zod Validation Error:', error);
    return [];
  }
};

export const researchContext = async (query, interactionData = '') => {
  const systemPrompt = `You are an Intelligence Research Agent powered by Grok 4.1.
  YOUR GOAL:
  1. Research historical context and related facts about the given topic.
  2. Analyze the 'vibe' and 'sentiments' from social engagement data.
  3. Provide a structured 'Research Dossier' Focus on DEPTH and ACCURACY in Thai language. Return only the findings without conversational filler.`;

  const userPrompt = `INPUT TOPIC: ${query}\SOCIAL ENGAGEMENT DATA: ${interactionData}`;
  
  try {
    return await callGrok(systemPrompt, userPrompt, MODEL_NON_REASONING);
  } catch (error) {
    console.error('Grok Research Error:', error);
    return "Intelligence elevation unavailable at the moment.";
  }
};

const factCache = new Map();

export const researchAndPreventHallucination = async (input) => {
  if (factCache.has(input)) {
    console.log("⚡ [CACHE HIT] Loaded Fact Sheet from memory. 0 Tokens Used.");
    return factCache.get(input);
  }

  // 🚀 FAST & DETERMINISTIC SEARCH BINDING (Tavily)
  let generalContext = "";
  let xContext = "";
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
      searchEverything(input, '', false, 'Top').catch(e => { console.error('TwitterAPI error:', e); return { data: [] }; })
    ]);

    if (webRes.ok) {
        const data = await webRes.json();
        generalContext = `[GENERAL WEB SEARCH RESULTS]\nAnswer: ${data.answer || ''}\nSources: ${data.results.map(r => `- ${r.title} (${r.url}): ${r.content}`).join('\n')}`;
        extractedSources.push(...data.results.map(r => ({ title: r.title, url: r.url })));
    }
    if (xRes && xRes.data && xRes.data.length > 0) {
        const topTweets = xRes.data.slice(0, 3);
        xContext = `[X/TWITTER SPECIFIC CONTEXT]\nSources: ${topTweets.map(t => `- @${t.author?.username || 'user'} on X: ${t.text}`).join('\n')}`;
        extractedSources.push(...topTweets.map(t => ({ 
            title: `${t.author?.name || 'X User'} on X`, 
            url: `https://x.com/${t.author?.username || 'user'}/status/${t.id}` 
        })));
    }
  } catch(e) { console.error("Tavily Parallel Search Error:", e); }

  let tavilyContext = `${generalContext}\n\n${xContext}`;

  const systemPrompt = `[MODE: GROK 4.20 MULTI-AGENT ORCHESTRATION]
  You are Harper Research, the elite fact-checking agent for FORO.
  Your task is to analyze the user's input and the provided Real-Time Search Results.
  
  RULES:
  1. Act as the bridge between user intent and truth.
  2. **CRITICAL FOR [ATTACHED INTEL]**: Verify if it is a verified fact, a rumor, or heavily disputed using the Search Results.
  3. Synthesize a comprehensive "Fact & Sentiment Sheet" covering:
     - The verified reality of the topic based strictly on the search context.
     - X/Twitter Sentiment & Popularity.
  4. ALWAYS list actionable sources WITH THEIR ACTUAL URL LINKS (https://...) extracted from the Search Results. NEVER provide generic homepage links.
  5. The output MUST be in Thai and highly structured with bullet points.
  6. DO NOT write the final article. ONLY provide the Fact & Sentiment Sheet.`;

  const userMsg = `Input data to research: ${input}\n\n${tavilyContext}\n\nGenerate a Deep Cross-Referenced Fact & Sentiment Sheet based ON THE SEARCH CONTEXT.`;

  const factSheet = await callGrok(systemPrompt, userMsg, MODEL_NON_REASONING);
  const resultPayload = { factSheet, sources: extractedSources };
  factCache.set(input, resultPayload); // Save to cache
  return resultPayload;
};

export const generateStructuredContent = async (factSheet, length, tone, format, onStreamChunk) => {
  let lengthInstruction = length;
  if (length === 'short') lengthInstruction = 'แบบสั้นกระชับ (Short) - ให้จบภายใน 1 ย่อหน้าสั้นๆ หรือ 3-4 บรรทัด (ไม่เกิน 150 คำ). เน้นเนื้อหาสำคัญและบทสรุปทันที';
  if (length === 'medium') lengthInstruction = 'แบบปานกลาง (Medium) - ความยาวขั้นต่ำ 400 คำ (MINIMUM 400 WORDS). ต้องมีรายละเอียดเชิงลึกและบทสรุปที่ชัดเจน';
  if (length === 'long') lengthInstruction = 'แบบเจาะลึก (Long) - ความยาวขั้นต่ำ 800 คำ (MINIMUM 800 WORDS) ลงรายละเอียดแบบจัดเต็มแบบ Long-form พร้อมบทวิเคราะห์และสรุปส่งท้าย';

  const draftSystemPrompt = `[MODE: GROK 4.20 MULTI-AGENT ORCHESTRATION]
  You are an elite Thai copywriter and professional journalist.
  
  Target Length: ${lengthInstruction}
  Target Tone: ${tone}
  Target Format: ${format}
  
  CRITICAL RULES:
  1. STRICT ZERO HALLUCINATION: All substantive claims MUST strictly originate from the provided Fact Sheet. DO NOT invent facts or dates.
  2. TONE ENFORCEMENT & SLANG BAN: You MUST write like a professional, smart, and modern Thai columnist. ABSOLUTELY DO NOT use cringey internet slang like "เฮ้ยเพื่อนๆ", "ไงวัยรุ่น", "สวัสดีครับทุกคน". 
  3. STRUCTURE RULES (ADAPTIVE):
     IF length is 'short':
     - DO NOT use # headers. Use bold text (**Title**) or Emojis for structure.
     - Focus on a strong HOOK at the start.
     - Maximum 1-2 short paragraphs.
     ELSE (medium/long):
     - START directly with # [CATCHY TITLE/HEADING].
     - DO NOT INCLUDE A "บทนำ" (INTRODUCTION) SECTION.
     - Jump immediately into the core # [DETAILS/CONTENT] paragraphs.
     - END with a dedicated ## [บทสรุป] section.
  4. NO CITATION BLOCK: DO NOT output any links, URLs, or a "แหล่งที่มาอ้างอิง" section at the bottom.
  5. NATIVE THAI LANGUAGE: Write in natural, engaging Thai.
  6. ENGLISH LOANWORDS ALLOWED: Use original English words for brands, names, and tech terms.
  7. FORMAT: Markdown for all structures.
  8. STRICT LENGTH ENFORCEMENT: Output MUST match the Target Length. Break down into multiple sub-headers for Medium and Long formats only.`;

  const draftUserMsg = `[FACT SHEET เริ่มต้น]\n${factSheet}\n[FACT SHEET สิ้นสุด]\n\nโปรดสร้างคอนเทนต์ตามรูปแบบและข้อมูลที่ให้มา`;

  // ⚡ Streaming Mode (Real-Time UX)
  if (onStreamChunk) {
    try {
      const { textStream } = await streamText({
        model: grok(MODEL_REASONING),
        system: draftSystemPrompt,
        prompt: draftUserMsg,
        temperature: 0.7,
      });

      const postProcess = (text) => {
        const lines = text.split('\n');
        const filtered = lines.filter(line => {
          const lower = line.toLowerCase();
          const isHeader = line.trim().startsWith('#');
          const containsIntro = lower.includes('บทนำ') || lower.includes('คำนำ') || lower.includes('introduction') || lower.includes('intro') || lower.includes('overview');
          return !(isHeader && containsIntro);
        });
        
        return filtered.map(line => {
          const lower = line.toLowerCase();
          const isHeader = line.trim().startsWith('#');
          const isConclusion = lower.includes('conclusion') || lower.includes('summary') || lower.includes('บทส่งท้าย');
          return (isHeader && isConclusion) ? '## บทสรุป' : line;
        }).join('\n');
      };

      let fullContent = '';
      for await (const textPart of textStream) {
        fullContent += textPart;
        onStreamChunk(postProcess(fullContent)); // Stream processed content to UI
      }
      return postProcess(fullContent);
    } catch (streamErr) {
      console.error('[GrokService] Stream error caught:', streamErr);
      throw streamErr; // Re-throw so component's catch block handles it gracefully
    }
  }
  
  // Phase 1: Standard Draft Generation (Non-Streaming)
  let contentDraft = await callGrok(draftSystemPrompt, draftUserMsg, MODEL_REASONING);

  // Phase 2: High-Speed Editor Validation Loop (Limited to 1 retry for Performance)
  // SPEED OPTIMIZATION: We use the faster MODEL_NON_REASONING for the editor check.
  const editorPrompt = `You are the FORO Editor-in-Chief. Check the [DRAFT CONTENT] against the [FACT SHEET] for hallucinations, factual errors, or missing Deep-Links in Citations.
  If perfectly accurate, 'passed' is true. If hallucinated or links are missing/fake, 'passed' is false and explain why in 'reason'.`;

  const editorMsg = `[FACT SHEET]: \n${factSheet}\n\n[DRAFT CONTENT]: \n${contentDraft}`;

  try {
    const { object: evaluation } = await generateObject({
      model: grok(MODEL_NON_REASONING), // Use fast model to keep latency low
      system: editorPrompt,
      prompt: editorMsg,
      schema: z.object({
        passed: z.boolean(),
        reason: z.string().optional()
      })
    });

    if (evaluation.passed) {
      console.log("✅ Editor Loop: Content Passed Validation (Zero Hallucination Confirmed)");
    } else {
      console.warn(`⚠️ Editor Loop: Content Failed Validation. Reason: ${evaluation.reason}`);
      
      // Fast Correction
      const correctionFeedback = `The Editor rejected the previous draft: "${evaluation.reason}". Correct the draft adhering STRICTLY to the Fact Sheet.`;
      
      contentDraft = await callGrok(draftSystemPrompt, `[FACT SHEET]\n${factSheet}\n\n[EDITOR FEEDBACK]\n${correctionFeedback}\n\nRewrite the content fixing the errors.`, MODEL_REASONING);
    }
  } catch (e) {
    console.error("Editor Loop Validation Error:", e);
    // If validator fails, we gracefully degrade and return the draft.
  }

  const finalPostProcess = (text) => {
    const lines = text.split('\n');
    const filtered = lines.filter(line => {
      const lower = line.toLowerCase();
      const isHeader = line.trim().startsWith('#');
      const containsIntro = lower.includes('บทนำ') || lower.includes('คำนำ') || lower.includes('introduction') || lower.includes('intro') || lower.includes('overview');
      return !(isHeader && containsIntro);
    });
    
    return filtered.map(line => {
      const lower = line.toLowerCase();
      const isHeader = line.trim().startsWith('#');
      const isConclusion = lower.includes('conclusion') || lower.includes('summary') || lower.includes('บทส่งท้าย');
      return (isHeader && isConclusion) ? '## บทสรุป' : line;
    }).join('\n');
  };

  return finalPostProcess(contentDraft);
};

export const generateContentArticle = generateFinalContent;
export const generateArticle = generateFinalContent;
