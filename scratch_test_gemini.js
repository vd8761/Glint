import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const apiKey = (process.env.GEMINI_API_KEY || '').replace(/\r?\n|\r/g, "").trim();

async function run() {
  const ai = new GoogleGenAI({ apiKey });
  
  for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']) {
    console.log(`Testing model: ${model}...`);
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: 'Say hello!',
      });
      console.log(`Success with ${model}! Response:`, response.text);
      break;
    } catch (error) {
      console.error(`Error with ${model}:`, error.message);
    }
  }
}

run();
