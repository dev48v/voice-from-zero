# Voice From Zero

A voice tutor in your browser. You talk, an LLM answers, your speakers reply. Three free APIs, zero backend.

> Pipeline: **Web Speech API (STT) → Gemini 2.5 Flash (LLM) → speechSynthesis (TTS)**

## Quick start

```bash
git clone https://github.com/dev48v/voice-from-zero.git
cd voice-from-zero
npm install
cp .env.example .env.local            # paste your free Gemini key
npm run dev
```

Open http://localhost:5173 in **Chrome, Edge, or Safari** (Firefox doesn't ship the Web Speech API yet). Click the mic. Talk.

Get a free Gemini key at https://aistudio.google.com/apikey.

## What this teaches

Every "AI voice assistant" you've ever used is the same three steps glued together:

1. **Speech-to-Text** — turn microphone audio into a string.
2. **LLM call** — send the string to a model, get a reply string back.
3. **Text-to-Speech** — turn the reply string into audio.

Each step is a swappable Lego brick. Whisper for STT, OpenAI for LLM, ElevenLabs for TTS — same shape, different prices. This repo uses the free in-browser bricks so you can see the pattern without burning a dollar.

## Step-by-step (read the commits in order)

| Step | Commit | What lands |
|------|--------|-----------|
| 1 | Scaffold | Vite + React 19 + TS shell, dark canvas |
| 2 | STT wrapper | `src/lib/stt.ts` — Web Speech API, partials + finals |
| 3 | Gemini client | `src/lib/gemini.ts` — chat history, system prompt, 60-word cap |
| 4 | TTS wrapper | `src/lib/tts.ts` — speechSynthesis, async voice loading |
| 5 | Wire the loop | `src/App.tsx` — idle → listening → thinking → speaking |
| 6 | Lime theme | pulsing mic, bubble transcript, back-link footer |

Each commit is one concept. Each file has comments explaining **why**, not just what.

## Architecture

```
[ 🎤 microphone ]
        │
        ▼
  Web Speech API   ── partial transcripts ──┐
        │                                   │
        │ final transcript                  ▼
        ▼                                "you're saying..."
  Gemini 2.5 Flash  ◄── chat history (last N turns)
        │
        │ reply text (≤ 60 words)
        ▼
  speechSynthesis
        │
        ▼
   [ 🔊 speakers ]
```

## Browser support

| Browser | STT | TTS |
|---------|-----|-----|
| Chrome / Edge / Brave | ✅ | ✅ |
| Safari (14+) | ✅ | ✅ |
| Firefox | ❌ | ✅ |

Firefox added `SpeechRecognition` behind a flag but it's not enabled by default. The UI shows a warning in unsupported browsers.

## Deploy

```bash
npm run build
npx vercel --prod
```

The bundle is fully static. Vercel rewrites all routes to `/` so the SPA serves on any path. Add `VITE_GEMINI_API_KEY` as a build env var in Vercel before deploying.

## Live demo

https://voice-from-zero.vercel.app

## Tech

- **Vite 6** for the dev server + build (esbuild + Rollup, near-instant HMR).
- **React 19** for UI (just `useState` + `useRef` + `useCallback`, no extra state lib).
- **TypeScript 5.6** in strict mode.
- **@google/generative-ai** Google's official SDK; tiny, browser-callable.
- **Web Speech API** + **speechSynthesis** — both built into the browser, no install.

## License

MIT.
