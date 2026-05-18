// STEP 3 - LLM call to Gemini 2.5 Flash.
//
// Why Flash and not Pro? Flash is free on Google AI Studio (15 req/min,
// 1M req/day). Pro requires billing. For a voice tutor the latency and free
// quota both matter more than benchmark scores.
//
// Why call from the browser? This demo has no backend. The API key is read
// from VITE_GEMINI_API_KEY at build time, baked into the static bundle, and
// served from Vercel's CDN. ANYONE who opens devtools can read the key, so
// always use a key that's quota-limited (Google AI Studio keys are by default
// and you can revoke them in one click).
//
// generationConfig caps the answer length so the TTS doesn't read a wall of
// text. Voice replies should feel like a friend, not a Wikipedia paragraph.

import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a warm, concise voice tutor.
- Reply in 1-3 short sentences (under 60 words).
- Speak plainly. No bullet points, no markdown, no headings.
- If a question is fuzzy, give your best interpretation and answer.
- If you don't know, say so in one sentence.`;

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export async function askGemini(history: ChatTurn[], question: string): Promise<string> {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!key) throw new Error("Missing VITE_GEMINI_API_KEY. Add it to .env.local and restart `npm run dev`.");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 200,
      temperature: 0.7,
    },
  });

  // Gemini's `startChat` takes prior turns as `history` so the model has
  // context. Each turn is { role, parts: [{ text }] }. We map our internal
  // ChatTurn shape into that.
  const chat = model.startChat({
    history: history.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
  });

  const result = await chat.sendMessage(question);
  return result.response.text().trim();
}
