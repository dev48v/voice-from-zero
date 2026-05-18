// STEP 5 - The voice loop: mic -> transcript -> Gemini -> spoken reply.
//
// State machine, top to bottom:
//   idle         user is doing nothing, mic button shows "Start"
//   listening    Web Speech is open, partials stream into `partial`
//   thinking     STT delivered a final transcript, Gemini call in flight
//   speaking     reply text is playing through speechSynthesis
//
// The state machine matters because each state needs a different mic-button
// label, and we don't want to fire a new STT session while one is already
// open or while the assistant is mid-reply.

import { useCallback, useEffect, useRef, useState } from "react";
import { STT } from "./lib/stt";
import { askGemini, type ChatTurn } from "./lib/gemini";
import { speak, stopSpeaking } from "./lib/tts";

type Phase = "idle" | "listening" | "thinking" | "speaking";

interface Message {
  role: "user" | "model";
  text: string;
}

const STARTERS = [
  "Explain photosynthesis like I'm ten.",
  "What's the difference between TCP and UDP?",
  "Give me a one-minute history of jazz.",
  "Tell me a useful Python tip.",
];

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [partial, setPartial] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  // STT instance lives across renders; we never want to recreate it because
  // that would lose any in-flight recognition.
  const sttRef = useRef<STT | null>(null);
  if (!sttRef.current) sttRef.current = new STT();

  const supported = STT.isSupported();

  // Sending a question is the same code path whether the user clicked a
  // starter or finished speaking. Pull it out so both call sites share it.
  const ask = useCallback(async (question: string, history: Message[]) => {
    setPhase("thinking");
    setError(null);
    try {
      const turns: ChatTurn[] = history.map(m => ({ role: m.role, text: m.text }));
      const reply = await askGemini(turns, question);
      setMessages(curr => [...curr, { role: "model", text: reply }]);
      setPhase("speaking");
      speak(reply, {
        onEnd: () => setPhase("idle"),
        onError: (msg) => { setError(msg); setPhase("idle"); },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }, []);

  const startListening = useCallback(() => {
    if (!sttRef.current || phase !== "idle") return;
    setError(null);
    setPartial("");
    setPhase("listening");
    sttRef.current.start({
      onPartial: (t) => setPartial(t),
      onFinal: (text) => {
        // Got a real sentence from the user. Stop the mic, append to history,
        // hand off to Gemini.
        sttRef.current?.stop();
        setPartial("");
        setMessages(curr => {
          const next = [...curr, { role: "user" as const, text }];
          ask(text, curr);
          return next;
        });
      },
      onError: (msg) => {
        setError(msg);
        setPhase("idle");
      },
      onEnd: () => {
        // If the recognizer ended without delivering a final (e.g., silence
        // timeout), drop us back to idle so the user can try again.
        setPartial("");
        setPhase(p => (p === "listening" ? "idle" : p));
      },
    });
  }, [phase, ask]);

  const stop = useCallback(() => {
    sttRef.current?.stop();
    stopSpeaking();
    setPhase("idle");
    setPartial("");
  }, []);

  const sendStarter = useCallback((q: string) => {
    if (phase !== "idle") return;
    setMessages(curr => {
      const next = [...curr, { role: "user" as const, text: q }];
      ask(q, curr);
      return next;
    });
  }, [phase, ask]);

  // If the component unmounts (HMR, route change) make sure we don't leave
  // the mic open or a TTS utterance playing.
  useEffect(() => () => {
    sttRef.current?.stop();
    stopSpeaking();
  }, []);

  return (
    <div className="shell">
      <header className="hero">
        <span className="badge">Day 35 · TechFromZero</span>
        <h1>Voice From Zero</h1>
        <p className="tagline">
          Talk. The browser listens. Gemini answers. Your speakers reply.
          Three APIs, zero backend.
        </p>
      </header>

      {!supported && (
        <div className="warn">
          Your browser doesn't expose the Web Speech API. Try Chrome, Edge, or Safari.
        </div>
      )}

      <main className="stage">
        <div className="mic-area">
          <button
            type="button"
            className={`mic mic-${phase}`}
            onClick={phase === "idle" ? startListening : stop}
            disabled={!supported}
            aria-label={phase === "idle" ? "Start listening" : "Stop"}
          >
            <span className="mic-icon" aria-hidden>🎙️</span>
            <span className="mic-label">
              {phase === "idle" && "Tap to speak"}
              {phase === "listening" && "Listening… tap to stop"}
              {phase === "thinking" && "Thinking…"}
              {phase === "speaking" && "Speaking… tap to stop"}
            </span>
          </button>
          {partial && <p className="partial">"{partial}…"</p>}
        </div>

        {messages.length === 0 && phase === "idle" && (
          <div className="starters">
            <p className="starters-label">Or try one:</p>
            <div className="starter-grid">
              {STARTERS.map(s => (
                <button key={s} className="starter" onClick={() => sendStarter(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="error">⚠ {error}</div>}

        {messages.length > 0 && (
          <ol className="transcript">
            {messages.map((m, i) => (
              <li key={i} className={`bubble bubble-${m.role}`}>
                <span className="who">{m.role === "user" ? "You" : "Gemini"}</span>
                <span className="text">{m.text}</span>
              </li>
            ))}
          </ol>
        )}
      </main>

      <footer className="foot">
        <a href="https://dev48v.infy.uk" className="backlink">← Back to dev48v.infy.uk</a>
      </footer>
    </div>
  );
}
