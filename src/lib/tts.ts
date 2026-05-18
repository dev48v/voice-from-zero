// STEP 4 - Text-to-Speech via the browser's speechSynthesis API.
//
// Why not ElevenLabs? Their voices are nicer, but they need an API key and
// stream audio over HTTP. The browser TTS is built in, free, no key, no quota.
// For "this is how the loop works" pedagogy the quality is plenty.
//
// The annoying part: voices load asynchronously. The first time you call
// getVoices() the list is empty; Chrome fires `voiceschanged` once they're
// ready. We wrap that in a one-shot promise so callers don't have to care.

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise(resolve => {
    const ready = speechSynthesis.getVoices();
    if (ready.length) return resolve(ready);
    // voiceschanged can fire more than once; we only want the first.
    speechSynthesis.addEventListener(
      "voiceschanged",
      () => resolve(speechSynthesis.getVoices()),
      { once: true },
    );
  });
  return voicesReady;
}

async function pickVoice(lang: string): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await loadVoices();
  // Prefer a Google voice in the right language (cleaner on Chrome), fall back
  // to the first matching-language voice, then to the default.
  return (
    voices.find(v => v.lang.startsWith(lang) && /google/i.test(v.name)) ??
    voices.find(v => v.lang.startsWith(lang)) ??
    voices[0]
  );
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  // Cancel anything already speaking so we don't pile up utterances.
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? "en-US";
  u.rate = opts.rate ?? 1.0;
  u.voice = (await pickVoice(u.lang)) ?? null;
  u.onstart = () => opts.onStart?.();
  u.onend = () => opts.onEnd?.();
  u.onerror = (e) => opts.onError?.(e.error ?? "speech synthesis error");

  speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}
