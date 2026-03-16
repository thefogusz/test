const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const MODEL_NON_REASONING = 'grok-4-1-fast-non-reasoning'; // Grok 4.1 Fast (Non-Reasoning)
const MODEL_REASONING = 'grok-4-1-fast-reasoning';         // Grok 4.1 Fast (Reasoning)
const BASE_URL = 'https://api.x.ai/v1/chat/completions';

const SUMMARIZATION_RULES = `
RULES FOR SUMMARIZATION (THAI INTELLIGENCE):
1. CONTENT: สรุปใจความสำคัญ ห้ามตีความเอง ห้ามใส่ความคิดเห็นส่วนตัว รักษาความลอจิกเดิม
2. SHORT POST: หากโพสต์สั้นมาก (ไม่เกิน 25 คำ) ให้แปลเป็นภาษาไทยที่อ่านง่ายโดยไม่ต้องย่อ
3. STYLE: ภาษาข่าวไทยที่ทันสมัย กระชับ (สรุปจบใน 1-2 ประโยค)
4. PROPER NOUNS: รักษาชื่อเฉพาะ (ชื่อข่าว, บริษัท, โปรเจกต์, เทคโนโลยี) เป็นภาษาอังกฤษตามเดิม
5. SOCIAL MEDIA: ห้ามอ้างอิงถึง X หรือ Twitter และห้ามมี URL
6. OUTPUT: ส่งกลับมาเฉพาะข้อความภาษาไทยเท่านั้น ห้ามมีคำอธิบายอื่น
`;

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

export const generateContentArticle = generateFinalContent;
export const generateArticle = generateFinalContent;
