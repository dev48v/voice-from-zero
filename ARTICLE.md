---
title: "I Built a Voice AI Tutor in 200 Lines of Code (and Zero Backend)"
published: false
description: "Day 35 of TechFromZero. Every voice assistant you've ever used is the same three Lego bricks. Let's snap them together in a single afternoon — using only free, browser-native APIs."
tags: ai, javascript, react, beginners
canonical_url:
cover_image:
series: TechFromZero
---

Open Siri. Ask it a question. Listen to the reply.

That whole experience — the magic that powers Alexa, ChatGPT voice mode, every car assistant, every drive-through screen — is **three steps glued together**.

1. Turn microphone audio into text.
2. Send the text to a brain.
3. Turn the brain's reply back into audio.

That's it. The whole industry of voice AI is variations on those three boxes. Different brains, different microphones, different voices, but the shape is identical.

Today I'm going to build the whole thing in your browser. No server. No install. No API key except a single free one. Open the tab, click the mic, talk to an AI. Total code: about 200 lines.

The pattern is the actual lesson. Once you see it, you can replace any box with a fancier one — Whisper for transcription, ElevenLabs for voices, your own fine-tuned model in the middle — and the architecture doesn't change.

## The three Lego bricks

Let me name them with the boring acronyms so you can search for them later:

**STT — Speech-to-Text.** Microphone audio → string of words. The expensive option is OpenAI Whisper (best accuracy, costs about a third of a cent per minute). The free option, which I'm using here, is the **Web Speech API**, which has shipped in Chrome since 2013. You give it a microphone permission and it gives you back text. Zero key, zero upload — Chrome talks to Google's recognizer behind the scenes for you. It's slightly less accurate than Whisper, especially on accents, but for a learning demo the difference doesn't matter.

**LLM — the brain.** This is the part everyone gets excited about. You hand a string to a Large Language Model and it hands a string back. ChatGPT, Claude, Gemini — they all expose the same shape: send a list of messages, get a message back. I'm using **Gemini 2.5 Flash** because Google gives it away free at 15 requests per minute. Beginners shouldn't have to wave a credit card to learn how this works.

**TTS — Text-to-Speech.** String → audio you can play. The fancy option is ElevenLabs, whose voices are so good they sound uncanny. The free, zero-key option is `window.speechSynthesis`, which has shipped in every major browser since 2014. It sounds robotic, but it's instant and it costs nothing.

Notice the pattern: every brick has an expensive flavor and a free flavor. The interfaces are identical. You can swap one for the other without changing the architecture. **That's why this is worth learning.**

## Wiring the loop

Here's the entire pipeline in pseudocode:

```
state = "idle"

while user wants to talk:
    state = "listening"
    text = await STT.listen()        # mic open until silence
    state = "thinking"
    reply = await LLM.ask(text)      # 1-2 seconds typically
    state = "speaking"
    await TTS.say(reply)             # plays through speakers
    state = "idle"
```

The state machine matters more than you'd think. If the user clicks the mic while the assistant is still talking, you need to cancel the playback. If they click while the LLM is still thinking, you need to keep them out. UIs get confusing fast when you have four states and one button. I'll show you the React version in a minute.

## The STT brick

The browser ships a class called `SpeechRecognition` (with a `webkit` prefix on Safari). The API is event-based, not promise-based, which is a little annoying — but the pattern is straightforward:

```ts
const rec = new SpeechRecognition();
rec.lang = "en-US";
rec.continuous = true;       // keep mic open across pauses
rec.interimResults = true;   // stream partials while user talks

rec.onresult = (e) => {
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const r = e.results[i];
    if (r.isFinal) onFinal(r[0].transcript);
    else onPartial(r[0].transcript);
  }
};

rec.start();
```

Two things to notice. First, **`interimResults`** is a gift. It streams text while the user is still talking, so you can show "you're saying..." in real time. It feels alive instead of laggy. Second, **`resultIndex`** lets you only walk new results since the last fire — the browser keeps the whole session's results in the `results` array, but you usually only care about what's new.

## The LLM brick

Google's SDK makes this almost embarrassingly short:

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(API_KEY);
const model = ai.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: "Reply in 1-3 short sentences. No markdown.",
  generationConfig: { maxOutputTokens: 200 },
});

const chat = model.startChat({ history });
const result = await chat.sendMessage(userText);
const reply = result.response.text();
```

Two design choices worth calling out.

**System prompt.** I tell the model to keep answers under 60 words. Why? Because the TTS will read every word. If Gemini writes a Wikipedia paragraph, your user is going to sit through 90 seconds of robot voice waiting for the next chance to talk. Voice AIs need to be terser than text AIs. This is a real lesson — half of building voice products is wrestling the model down to a sentence or two.

**maxOutputTokens.** A hard ceiling. Even if the model decides to ignore the system prompt and ramble, this cuts it off. Belt and suspenders.

## The TTS brick

```ts
const u = new SpeechSynthesisUtterance(text);
u.lang = "en-US";
u.rate = 1.0;
u.voice = bestVoiceFor("en-US");
speechSynthesis.cancel();   // kill anything currently playing
speechSynthesis.speak(u);
```

The one gotcha: `speechSynthesis.getVoices()` returns an empty array the first time you call it. Voices load asynchronously and Chrome fires a `voiceschanged` event when they're ready. So I wrap voice-loading in a one-shot promise that callers can await. Otherwise your first reply plays in the browser's default voice instead of the nice Google one.

## Wiring it in React

The whole React component is a state machine over `phase: "idle" | "listening" | "thinking" | "speaking"` and a list of messages.

```tsx
const [phase, setPhase] = useState<Phase>("idle");
const [messages, setMessages] = useState<Message[]>([]);

const startListening = () => {
  setPhase("listening");
  stt.start({
    onFinal: async (text) => {
      stt.stop();
      const userMsg = { role: "user", text };
      setMessages(curr => [...curr, userMsg]);
      setPhase("thinking");
      const reply = await askGemini([...messages, userMsg], text);
      setMessages(curr => [...curr, { role: "model", text: reply }]);
      setPhase("speaking");
      speak(reply, { onEnd: () => setPhase("idle") });
    },
  });
};
```

The mic button changes label based on phase. Click it during `idle` to start listening, click it during `listening`/`speaking` to stop. The transcript renders as a list of bubbles. That's the whole UI.

## What I learned actually building this

A few real takeaways from spending an afternoon on this:

**1. Browser TTS quality is better than you remember.** The Google voices on Chrome are genuinely fine. They were embarrassing in 2015. They're not embarrassing now. For a learning demo, ElevenLabs is overkill.

**2. The pipeline is the lesson, not the tools.** When a recruiter says "build a voice agent," they don't mean "use these three specific libraries." They mean "wire mic, brain, and speaker together with a state machine that doesn't get confused." Once you can do that, you can swap parts.

**3. Voice changes how you prompt.** A system prompt that's great for ChatGPT (gives bulleted lists, uses headings) is terrible for voice. The TTS reads "asterisk asterisk" out loud. Tell the model "no markdown, no lists, one paragraph" or live with the consequences.

**4. State machines beat booleans.** I started with `isListening` + `isThinking` + `isSpeaking` booleans. Within five minutes I had bugs where two were true at once. A single `phase` enum makes the impossible states actually impossible. Reach for this earlier than you think.

**5. Free tiers are enough to learn on.** Gemini's free tier covers ~14,000 requests per day. You will not run out while learning. Don't let "what API should I pay for" stop you from starting.

## Why this matters

Every "AI agent" startup right now is some variation of these three boxes plus a loop. Voice tutors, customer service bots, drive-throughs, in-car assistants, accessibility tools. Once you can wire the three bricks, you can build any of them. The hard part is taste — which brain, which voice, which prompt, which moment to interrupt. That's the next ten years of product work, and it's all built on top of the architecture you can spin up in a single afternoon.

So go spin it up. Open the repo. Read the commits one at a time. The first commit is an empty React shell. The seventh commit is the entire app. Each commit is one concept. You'll get more out of reading the seven small steps than reading one huge final file.

## Try it / fork it

🌐 Live: https://voice-from-zero.vercel.app
🐙 Code: https://github.com/dev48v/voice-from-zero

This is Day 35 of TechFromZero — a 50-day series where I build one tech from scratch every day with step-by-step commits you can read like a textbook. Yesterday was Stable Diffusion. Tomorrow is 3D in the browser with Three.js.

If you're learning AI and want a low-stakes way to actually ship something — clone the repo, change the model, change the voice, change the system prompt, and you'll have an entirely different demo by lunch. Make it a French tutor. Make it a Dungeon Master. Make it a meditation guide. The Legos snap together however you want.

🌐 See all days: https://dev48v.infy.uk/techfromzero.php

Talk to you tomorrow.
