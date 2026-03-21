import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import dotenv from 'dotenv';
dotenv.config();

const grok = createOpenAI({
  apiKey: process.env.VITE_XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

async function test() {
  const models = ['grok-4.1-fast-non-reasoning', 'grok-beta', 'grok-2-1212', 'grok-2-latest'];
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}...`);
      const { text } = await generateText({
        model: grok(m),
        prompt: 'Hi',
      });
      console.log(`✅ Success with ${m}: ${text.substring(0, 20)}`);
    } catch (e) {
      console.log(`❌ Failed with ${m}: ${e.message}`);
    }
  }
}

test();
