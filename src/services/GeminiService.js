const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent';

/**
 * FEATURE: Intelligence Elevation & Research
 * Model: GEMINI 3 (Flagship Research)
 */
export const researchContext = async (query, interactionData = '') => {
  try {
    const prompt = `You are an Intelligence Research Agent.
    INPUT QUERY/TOPIC: ${query}
    SOCIAL ENGAGEMENT DATA: ${interactionData}

    YOUR GOAL:
    1. Research historical context and related facts about this topic.
    2. Analyze the 'vibe' and 'sentiments' from the social engagement data.
    3. Provide a structured 'Research Dossier' that includes:
       - Core Facts & History
       - Why it matters now
       - What people are saying (Sentiment Analysis)
       - Related entities (Companies, People, Technologies)

    Format your response as a clean JSON-ready string that can be used to enrich another AI's writing.
    Focus on DEPTH and ACCURACY. Avoid repeating what is already in the query.`;

    const response = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) throw new Error('Gemini Research failed');
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini Research Error:', error);
    return "Intelligence elevation unavailable at the moment.";
  }
};

/**
 * For direct Search Enhancement
 */
export const deepSearchEnrichment = async (query) => {
  try {
    const prompt = `Perform a deep intelligence search on: "${query}".
    Provide 3-5 high-value insights that are NOT just recent news. 
    Focus on context, technical details, or broader market implications.
    Return only the insights in Thai news-style.`;

    const response = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error(err);
    return "";
  }
};
