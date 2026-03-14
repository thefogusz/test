const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const MODEL_NAME = 'grok-4-1-fast-non-reasoning';
const BASE_URL = 'https://api.x.ai/v1/chat/completions';

const callGrok = async (systemPrompt, userPrompt) => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
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
  const systemPrompt = `คุณคือ FORO Intelligence Agent ที่ขับเคลื่อนด้วย Grok 4.1 Fast. 
  งานของคุณคือสรุปข่าวสารแนว Tech/Crypto ในรูปแบบที่ "เฉียบคม" และ "ทันเหตุการณ์" ในสไตล์ X-Native. 
  ใช้สำนวนภาษาไทยที่ทันสมัยและเป็นกันเองมากกว่า Gemini แต่ยังคงความถูกต้องแม่นยำ.
  จัดรูปแบบเป็นหัวข้อย่อย (bullet points) 3-4 ข้อ.`;

  return await callGrok(systemPrompt, fullStoryText);
};

export const generateGrokGlobalPulse = async (allSummaries) => {
  const systemPrompt = `คุณคือ Grok Intelligence Chief. 
  นี่คือสรุปข่าวจากวันนี้. งานของคุณคือมองหา "The Vibe of the Day" และจับประเด็นที่คนบน X กำลังให้ความสนใจที่สุด 3 เรื่อง.
  ใช้สไตล์การสรุปแบบ Grok ที่มีความตรงไปตรงมาและน่าตื่นเต้น.`;

  return await callGrok(systemPrompt, JSON.stringify(allSummaries));
};

/**
 * BATCH PHASE: Summarize multiple stories in one call for speed
 */
export const generateGrokBatch = async (stories) => {
  if (!stories || stories.length === 0) return [];
  
  const systemPrompt = `คุณคือ Grok Batch Processor. 
  งานของคุณ: สรุปแต่ละข่าวเป็นภาษาไทยในสไตล์ Grok (X-Native, punchy, emojis).
  กฎเหล็ก: ส่งกลับเป็น JSON Array ของ String เท่านั้น ห้ามมีข้อความอื่นปน
  รูปแบบ: ["สรุป 1", "สรุป 2", ...]`;

  const userPrompt = `ข่าวที่ต้องสรุป (${stories.length} ชิ้น):
  ${stories.map((s, i) => `[MSG:${i}] ${s}`).join('\n---\n')}`;

  const result = await callGrok(systemPrompt, userPrompt);
  try {
    const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Grok Batch Parse Error:', e);
    return stories.map(() => "(Grok Batch Error)");
  }
};
