const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3.1-flash-lite-preview';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

export const summarizeAndTranslate = async (tweets) => {
  if (!tweets || tweets.length === 0) return "ไม่พบข่าวสารใหม่ในรอบ 24 ชั่วโมงที่ผ่านมา";

  const tweetTexts = tweets.map((t, i) => `${i + 1}. [${t.author.username}]: ${t.text}`).join('\n\n');

  const prompt = `
    You are an expert AI news curator. Below is a list of recent tweets from top AI researchers and leaders.
    
    TASKS:
    1. Group the tweets by account.
    2. For EACH account that has tweets, provide a concise summary (1-2 sentences) of what they have been sharing or discussing in the last 24 hours.
    3. Be specific about titles, new model names, or technical announcements.
    4. Translate the summary into professional THAI.
    5. Ensure the "displayName" and "username" are accurate to the source.
    4. Return the data as a JSON ARRAY of objects with the following schema:
       [
         {
           "username": "@handle",
           "displayName": "Name",
           "summary": "สรุปเนื้อหาเป็นภาษาไทย...",
           "tweetCount": 3,
           "topEngagement": { "likes": 120, "retweets": 45 }
         }
       ]
    5. ONLY return the JSON array, no other text.
    
    TWEETS DATA:
    ${tweetTexts}
  `;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
            responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Gemini API error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error(data.error?.message || 'AI Safety Buffer: No summary generated');
    }
    const textResponse = data.candidates[0]?.content?.parts[0]?.text;
    if (!textResponse) {
      throw new Error('AI Response empty or malformed');
    }
    return JSON.parse(textResponse);
  } catch (error) {
    console.error('Error with Gemini summarization:', error);
    throw error;
  }
};

/**
 * FEATURE 3: Detailed AI Summary (3-4 lines in Thai)
 */
export const generateForoSummary = async (fullStoryText) => {
  const prompt = `
    คุณคือ FORO AI ผู้เชี่ยวชาญด้านข่าวสารเทคโนโลยีและคริปโต
    งานของคุณ: สรุปทวีต/ข่าวที่ให้มาเป็นภาษาไทยให้อ่านง่ายและเป็นมืออาชีพ
    เงื่อนไข:
    1. ใช้หัวข้อข่าวที่น่าสนใจ
    2. สรุปเป็นหัวข้อ (bullet points) 3-4 ประเด็นหลัก
    3. ใช้สำนวนภาษาไทยที่สละสลวยและทันสมัย
    4. หากมีเนื้อหาเชิงเทคนิค ให้เลือกประเด็นสำคัญที่สุดมาเล่า
    
    เนื้อหาที่ต้องสรุป:
    ${fullStoryText}
  `;
  
  return await callGemini(prompt);
};

/**
 * REDUCE PHASE: Generate Global Dashboard Summary
 */
export const generateGlobalSummary = async (allSummaries) => {
  if (!allSummaries || allSummaries.length === 0) return null;
  
  const prompt = `
    คุณคือ FORO Intelligence Chief Editor
    นี่คือสรุปข่าวสารทั้งหมดจาก Watchlist วันนี้:
    ${JSON.stringify(allSummaries)}
    
    งานของคุณ: กรองเอา "3 ประเด็นที่สำคัญที่สุด (Top 3 Insights)" จากข่าวทั้งหมดนี้
    สรุปเป็นภาไทยแบบเข้มข้น (Executive Summary) เพื่อแสดงบน Dashboard
    เน้นความเชื่อมโยงของข่าวสาร หรือแนวโน้ม (Trends) ที่น่าจับตามอง
    
    รูปแบบ:
    🔥 [Insight 1]
    🚀 [Insight 2]
    💡 [Insight 3]
  `;
  
  return await callGemini(prompt);
};

/**
 * BATCH PHASE: Summarize multiple stories in one call for speed
 */
export const generateGeminiBatch = async (stories) => {
  if (!stories || stories.length === 0) return [];
  
  const prompt = `
    คุณคือ FORO AI Batch Processor. ปริมาณข่าว: ${stories.length} ชิ้น.
    งานของคุณ: สรุปแต่ละข่าวเป็นภาษาไทย 3-4 ประเด็น (bullet points).
    สำคัญมาก: คุณต้องส่งผลลัพธ์กลับมาเป็น JSON Array ของ String เท่านั้น ห้ามใส่คำอธิบายอื่น
    รูปแบบที่ต้องการ: ["สรุปข่าวที่ 1...", "สรุปข่าวที่ 2...", ...]
    
    เนื้อหาข่าว:
    ${stories.map((s, i) => `[ID:${i}] ${s}`).join('\n---\n')}
  `;
  
  const result = await callGemini(prompt);
  try {
    // Attempt to parse JSON from the markdown block or raw string
    const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Batch Parse Error:', e);
    // Fallback: split by some logic or return raw
    return stories.map(() => "(Batch Summarization Error)");
  }
};
export const agentFilterFeed = async (summaries, userPrompt) => {
  const prompt = `
    คุณคือ AI Agent ของ FORO หน้าที่ของคุณคือกรองข่าวสารตามความต้องการของผู้ใช้
    ผู้ใช้สั่งว่า: "${userPrompt}"
    
    รายการสรุปข่าวปัจจุบัน (JSON): ${JSON.stringify(summaries)}
    
    งานของคุณ: กรองรายการสรุปข่าวให้เหลือเฉพาะที่ตรงกับความต้องการ สั่งได้ทั้งการจัดหมวดหมู่ หรือเอาเฉพาะเรื่อง
    คืนค่าเป็น JSON array รูปแบบเดิมเท่านั้น ห้ามตอบเป็นอย่างอื่น
  `;
  
  const result = await callGemini(prompt, true);
  return JSON.parse(result);
};

/**
 * CONTENT FEATURE: Generate Content Article
 */
export const generateContentArticle = async (newsItem) => {
  const prompt = `
    นำข่าวนี้ไปเขียนบทความสร้างคอนเทนต์สำหรับลง Social Media (เช่น Facebook หรือ LinkedIn) 
    ที่มีความยาวพอประมาณ ใส่หัวข้อที่น่าสนใจ, เนื้อหาหลัก, และประเด็นชวนคุย 
    ข่าว: ${newsItem.summary}
    ผู้ใช้: ${newsItem.displayName} (@${newsItem.username})
  `;
  
  return await callGemini(prompt);
};

async function callGemini(prompt, isJson = false) {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: isJson ? { responseMimeType: "application/json" } : {}
      })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Gemini API error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error(data.error?.message || 'AI Safety Buffer: No summary generated');
    }

    const text = data.candidates[0]?.content?.parts[0]?.text;
    if (!text) throw new Error('AI Response empty');
    
    return text.trim();
  } catch (error) {
    console.error('Gemini error:', error);
    throw error;
  }
}
