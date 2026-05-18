// STEP 2 - Speech-to-Text via the browser's Web Speech API.
//
// Why Web Speech and not Whisper? Whisper needs an API key + a server hop, and
// the browser already ships a recognizer in Chrome/Edge/Safari. Zero key, zero
// upload, zero latency. The tradeoff: it's Chromium-only on desktop and accent
// accuracy is weaker than Whisper. For a learning demo, that's a fine deal.
//
// The API is event-based, not promise-based, so we wrap it in a small class
// with onResult / onError callbacks. The caller starts/stops listening; we
// emit partial transcripts while the user speaks and a final transcript when
// they stop.

// vendor-prefixed name on most browsers
type SR = typeof window extends { SpeechRecognition: infer T }
  ? T
  : typeof window extends { webkitSpeechRecognition: infer T }
    ? T
    : unknown;

interface SREvent {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      isFinal: boolean;
      [j: number]: { transcript: string };
    };
  };
}

export interface STTHandlers {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
}

export class STT {
  // The recognizer object is browser-provided; typed loosely on purpose so we
  // don't have to ship lib.dom types that aren't ubiquitous yet.
  private rec: any | null = null;
  private active = false;

  static isSupported(): boolean {
    return typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  start(handlers: STTHandlers, lang = "en-US"): void {
    const Ctor: SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      handlers.onError?.("Web Speech API not available in this browser");
      return;
    }
    // continuous=true keeps the mic open across pauses; interimResults=true
    // streams partials so we can show "you're saying..." as the user talks.
    const rec = new (Ctor as any)();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: SREvent) => {
      let interim = "";
      let final = "";
      // Walk only the *new* results since the last fire (resultIndex points at
      // the first untouched index). Anything older has already been delivered.
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) handlers.onPartial?.(interim.trim());
      if (final) handlers.onFinal(final.trim());
    };

    rec.onerror = (e: any) => handlers.onError?.(e.error ?? "speech recognition error");
    rec.onend = () => {
      this.active = false;
      handlers.onEnd?.();
    };

    this.rec = rec;
    this.active = true;
    rec.start();
  }

  stop(): void {
    if (this.rec && this.active) {
      try { this.rec.stop(); } catch { /* already stopped */ }
    }
  }

  isActive(): boolean {
    return this.active;
  }
}
