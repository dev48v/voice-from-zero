Day 35 - Today I learned how ChatGPT voice actually works (it's three Lego bricks)


🚀TechFromZero Series - VoiceFromZero


🌐 Try it live: https://voice-from-zero.vercel.app


This isn't a Hello World. It's a real browser voice agent:
📐 🎤 Mic → Web Speech (STT) → Gemini 2.5 Flash → speechSynthesis (TTS) → 🔊 Speakers


🔗 The full code (with step-by-step commits you can follow):
https://github.com/dev48v/voice-from-zero


🧱 What I built (step by step):

1️⃣ Scaffold Vite + React 19 + TypeScript shell

2️⃣ Web Speech API wrapper — partials stream live while user talks

3️⃣ Gemini 2.5 Flash client with chat history + 60-word system prompt

4️⃣ Browser speechSynthesis wrapper (handles async voice loading)

5️⃣ Wire the loop: idle → listening → thinking → speaking state machine

6️⃣ Lime theme — pulsing mic, transcript bubbles, back-link footer

7️⃣ README walkthrough + Vercel SPA deploy


💡 Every file has detailed comments explaining WHY, not just what. Written for any beginner who wants to learn voice AI by reading real code — with full clarity on each step.


👉 If you're new to AI, this is THE concept to understand before tool use, agents, or RAG: every "AI voice assistant" you've ever used is the same three Lego bricks — speech-to-text, an LLM, text-to-speech. Once you can wire them, you can build any of them.


🔥 This is Day 35 of a 50-day series. A new technology every day. Follow along!


🌐 See all days: https://dev48v.infy.uk/techfromzero.php


#TechFromZero #Day35 #VoiceAI #LearnByDoing #OpenSource #BeginnerGuide #100DaysOfCode #CodingFromScratch
