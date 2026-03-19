const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const MODEL_NON_REASONING = 'grok-4.20-0309-non-reasoning'; // Grok 4.20 Fast
const MODEL_REASONING = 'grok-4.20-0309-reasoning'; // Grok 4.20 Expert
const BASE_URL = 'https://api.x.ai/v1/chat/completions';

const SUMMARIZATION_RULES = `
You are an AI that converts social media posts into short, clear Thai news-style summaries. 
Your goal is to preserve the original meaning while making the text easier to read.

CONTENT RULES:
- Preserve the original meaning of the post.
- Do not add interpretations or assumptions.
- Avoid exaggeration or absolute claims unless clearly stated.
- If the post compares ideas, keep both sides in the summary.
- If the post contains reasoning (cause → result), preserve that logic.

SHORT POST RULE:
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
- Do NOT write phrases such as “โพสต์บน X”, “via X”, or similar. 
- Do not describe the tweet itself.

SPECIAL CASE RULES:
- If the post contains sarcasm, humor, or opinion, keep the intent but do not present it as literal fact.
- If the post is already concise, rewrite it slightly instead of copying it directly.

OUTPUT:
- Return only the final Thai summary text. No explanations.
`;
const safeJsonParse = (str, fallback = []) => {
  try {
    if (typeof str === 'object' && str !== null) return str;
    return JSON.parse(str);
  } catch (e) {
    console.warn('Initial JSON parse failed, attempting healing...', e);
    try {
      let healed = str.trim();
      if (!healed.endsWith(']}')) {
        if (healed.includes('"experts"')) {
           if (!healed.endsWith(']')) healed += ']';
           if (!healed.endsWith('}')) healed += '}';
           return JSON.parse(healed);
        }
      }
    } catch (e2) {
      console.error('JSON Healing failed:', e2);
    }
    return fallback;
  }
};

const callGrok = async (systemPrompt, userPrompt, modelName, isJson = false) => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        ...(isJson ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Grok API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
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
  ${SUMMARIZATION_RULES}
  
  Format: You must return a JSON object with a "summaries" key containing an array of strings.
  Example: {"summaries": ["สรุป 1", "สรุป 2", ...]}`;

  const userPrompt = `Posts to process (${stories.length}):
  ${stories.map((s, i) => `[ID:${i}] ${s}`).join('\n---\n')}`;

  const result = await callGrok(systemPrompt, userPrompt, MODEL_NON_REASONING, true);
  try {
    const data = JSON.parse(result);
    return data.summaries || stories.map(() => "(Grok Error)");
  } catch (e) {
    console.error('Grok Batch Parse Error:', e);
    return stories.map(() => "(Grok Parse Error)");
  }
};

export const agentFilterFeed = async (summaries, userPrompt) => {
  const systemPrompt = `คุณคือ AI Agent ของ FORO หน้าที่ของคุณคือกรองข่าวสารตามความต้องการของผู้ใช้
  คืนค่าเป็น JSON array รูปแบบเดิมเท่านั้น ห้ามตอบเป็นอย่างอื่น
  รูปแบบ: [{...}, {...}]`;
  
  const userMsg = `ผู้ใช้สั่งว่า: "${userPrompt}"\nรายการสรุปข่าวปัจจุบัน (JSON): ${JSON.stringify(summaries)}`;
  
  const result = await callGrok(systemPrompt, userMsg, MODEL_NON_REASONING, true);
  try {
    return JSON.parse(result);
  } catch (e) {
    console.error('Agent Filter Parse Error:', e);
    return summaries;
  }
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

export const expandSearchQuery = async (originalQuery) => {
  if (!originalQuery) return originalQuery;
  
  // Checking if it's already mostly English, if so, just return it
  if (/^[A-Za-z0-9\s.,!?-]+$/.test(originalQuery)) return originalQuery;

  const systemPrompt = `You are a Search Specialist for FORO Intelligence. 
  Your task is to transform a Thai search query into a high-performance bilingual search query for X (Twitter) Advanced Search.
  
  RULES:
  1. Extract core keywords.
  2. Translate core keywords to professional English.
  3. Combine Thai and English using 'OR' logic where appropriate, or just a powerful English phrase.
  4. Aim for maximum global reach.
  5. Return ONLY the final search string (no explanations).
  
  Example Input: "5 เทรนด์ AI 2026"
  Example Output: "AI Trends 2026 OR 5 เทรนด์ AI 2026"`;

  const result = await callGrok(systemPrompt, originalQuery, MODEL_NON_REASONING);
  return result.replace(/"/g, '').trim(); // Clean up potential quotes
};

export const discoverTopExperts = async (categoryQuery, excludeUsernames = []) => {
  const systemPrompt = `You are a World-Class Industry Analyst and Search Expert.
  Your task is to identify the TOP 6 most influential, credible, and famous expert accounts on X (Twitter) for a specific category.
  
  CORE OBJECTIVE:
  - If the category is general or high-level (e.g., 'Business', 'Tech', 'AI', 'Economy'), prioritize WORLD-CLASS GLOBAL LEADERS and famous international experts.
  - USE YOUR REAL-TIME SEARCH (Websearch/X-Search) to check the LATEST POST DATE for each account.
  - CRITICAL: Only recommend accounts that have posted QUALITY content within the LAST 7-14 DAYS.
  - If an expert has recently changed their username, you MUST provide the NEW correct handle.
  - OBSOLETE, DORMANT, or INACTIVE accounts (e.g., @sheevergaming who is inactive) MUST be excluded regardless of fame.
  - For specific Thai queries, you can include top-tier Thai experts.
  
  RULES:
  1. Identify exactly 6 accounts.
  2. For each account, provide:
     - name: Full name or Display name.
     - username: The exact X handle (without @).
     - reasoning: A friendly, natural, and conversational description in Thai explaining why this expert is a "must-follow" global or industry leader. 
       CRITICAL: DO NOT use technical jargon, metrics, or labels like 'Trend Signal', 'Credibility Score', 'Content Profile', or emojis like 🟢/🔴. 
       Talk like a friend recommending a world-famous specialist.
  3. CRITICAL: Execute a freshness check via real-time search. Only return accounts with RECENT activity (last 1-2 weeks). Discard dormant accounts immediately.
  4. EXCLUDE these usernames if provided: [${excludeUsernames.join(', ')}]. Provide DIFFERENT experts if you see this list.
  5. Format the output as a strict JSON object with an "experts" key containing the array.
  
  Example Response:
  {
    "experts": [
      {
        "name": "Elon Musk",
        "username": "elonmusk",
        "reasoning": "ถ้าอยากตามเรื่องนวัตกรรมและอนาคต ต้องคนนี้เลยครับ เขาคือผู้นำระดับโลกที่เปลี่ยนวงการหลายอย่าง..."
      }
    ]
  }`;

  const userMsg = `Category: ${categoryQuery}`;
  
  const result = await callGrok(systemPrompt, userMsg, MODEL_REASONING, true);
  const data = safeJsonParse(result, { experts: [] });
  const experts = data.experts || [];
  // Ultimate Stability: Sanitize results before returning to UI
  return experts.filter(e => e && typeof e === 'object' && e.username && e.name);
};

export const researchContext = async (query, interactionData = '') => {
  const systemPrompt = `You are an Intelligence Research Agent powered by Grok 4.1.
  YOUR GOAL:
  1. Research historical context and related facts about the given topic.
  2. Analyze the 'vibe' and 'sentiments' from social engagement data.
  3. Provide a structured 'Research Dossier' including:
     - Core Facts & History
     - Why it matters now
     - What people are saying (Sentiment Analysis)
     - Related entities
  Focus on DEPTH and ACCURACY in Thai language. Return only the findings without conversational filler.`;

  const userPrompt = `INPUT TOPIC: ${query}\nSOCIAL ENGAGEMENT DATA: ${interactionData}`;
  
  try {
    return await callGrok(systemPrompt, userPrompt, MODEL_NON_REASONING);
  } catch (error) {
    console.error('Grok Research Error:', error);
    return "Intelligence elevation unavailable at the moment.";
  }
};

export const researchAndPreventHallucination = async (input) => {
  const systemPrompt = `[MODE: GROK 4.20 MULTI-AGENT ORCHESTRATION]
  You are Harper Research, the elite fact-checking agent for FORO.
  Your task is to analyze the user's input (which could be a short phrase, long text, or a URL).
  
  CRITICAL NATIVE TOOLS MISSION:
  1. YOU MUST USE YOUR NATIVE 'web_search' to find the most up-to-date, real-time facts globally.
  2. YOU MUST USE YOUR NATIVE 'x_search' to scan Twitter/X for the current public sentiment, trending opinions, and related posts.
  
  RULES:
  RULES:
  1. Act as the bridge between user intent and truth. Synthesize the most up-to-date information utilizing your massive internal knowledge base (up to 2026).
  2. **CRITICAL FOR [ATTACHED INTEL]**: If the user provides [ATTACHED INTEL], you MUST NOT accept it blindly. You must heavily cross-reference its claims against global X (Twitter) sentiment, popularity, and credibility. Verify if it is a verified fact, a rumor, or heavily disputed. Search for alternative viewpoints and related discussions.
  3. Synthesize a comprehensive "Fact & Sentiment Sheet" covering:
     - The verified reality of the topic.
     - X/Twitter Sentiment & Popularity (Are people supporting it? What are the counter-arguments?).
  4. ALWAYS list actionable sources WITH THEIR ACTUAL URL LINKS. YOU MUST PROVIDE EXACT DEEP-LINKS (e.g., https://.../article-name-here) OR SPECIFIC SEARCH LINKS (e.g., https://www.google.com/search?q=XYZ or https://twitter.com/search?q=XYZ). 
  NEVER provide generic homepage links (like https://twitter.com or https://coinmarketcap.com). If you don't know the exact article URL, you MUST generate a specific Google Search URL that links directly to the topic to prove zero-hallucination.
  5. The output MUST be in Thai and highly structured with bullet points.
  6. DO NOT write the final article. ONLY provide the Fact & Sentiment Sheet.`;

  const userMsg = `Input data to research:\n${input}\n\nGenerate a Deep Cross-Referenced Fact & Sentiment Sheet.`;

  return await callGrok(systemPrompt, userMsg, MODEL_NON_REASONING, false);
};

export const generateStructuredContent = async (factSheet, length, tone, format) => {
  const systemPrompt = `[MODE: GROK 4.20 MULTI-AGENT ORCHESTRATION]
  You are Captain Grok, coordinating a native 4-Agent expert panel to generate the ultimate content.
  You must synthesize the work of your 3 sub-agents to produce a final, flawless Thai response.
  
  --- THE EXPERT PANEL ---
  1. Harper Research: Verify all facts against the provided Fact Sheet. Ensure zero hallucinations.
  2. Lucas Creative: Craft an engaging, platform-perfect Hook and narrative flow matching the Tone.
  3. Benjamin Logic: Ensure the structure is perfectly sound and the reasoning flows naturally.
  
  --- ORCHESTRATION INSTRUCTIONS ---
  Goal: Generate the ultimate content strictly utilizing the provided Fact Sheet.
  Target Length: ${length}
  Target Tone: ${tone}
  Target Format: ${format}
  
  Format-Specific Directives (For Lucas & Benjamin):
  - If Video/Reels: Provide a 3-second visual hook, B-Roll suggestions in brackets, and natural spoken dialogue.
  - If SEO/Blog: Use bold keywords, clear H1/H2 hierarchy, and build up reading momentum.
  - All other formats: Maximize professional formatting for that specific medium.
  
  CRITICAL MISSION RULES (For Harper & Captain Grok):
  1. ZERO HALLUCINATION: All substantive claims MUST strictly originate from the provided Fact Sheet.
  2. MANDATORY CITATION: You absolutely must include a "แหล่งที่มาอ้างอิง" (Sources) section at the very end, extracting sources from the Fact Sheet. YOU MUST INCLUDE ACTUAL CLICKABLE DEEP-LINKS (https://...) for every source. NEVER USE GENERIC HOMEPAGES. If you do not have the exact article link, generate a precise Google Search link (https://www.google.com/search?q=...) or Twitter Search link. Format them as Markdown links if possible.
  3. OUTPUT: Output only the final synthesized Thai Markdown content. Do not output the internal debate.`;

  const userMsg = `[FACT SHEET เริ่มต้น]\n${factSheet}\n[FACT SHEET สิ้นสุด]\n\nโปรดสร้างคอนเทนต์ตามข้อกำหนดด้านบนด้วยภาษาไทยที่สละสลวย เป็นมืออาชีพ พร้อมใช้งานทันที.`;
  
  return await callGrok(systemPrompt, userMsg, MODEL_REASONING);
};

export const generateContentArticle = generateFinalContent;
export const generateArticle = generateFinalContent;

