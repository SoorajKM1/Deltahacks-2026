"use client";

import { useState } from "react";
import { askNeuroVault } from "../lib/neurovault-client";
import NeuroVaultShell from "../components/neurovault/NeuroVaultShell";
import BigActionButton from "../components/neurovault/BigAction";
import ResponseCard from "../components/neurovault/ResponseCard";

export default function Page() {
  const [status, setStatus] = useState<"idle" | "listening" | "thinking">("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");

  async function onAsk(text: string) {
    const q = text.trim();
    if (!q) return;

    setStatus("thinking");
    setTranscript(q);

    try {
      // Real call (from lib/neurovault-client.ts)
      const a = await askNeuroVault(q, [
        { role: "user", content: q }
      ]);

      setAnswer(a);
      speak(a);
    } catch (e) {
      const fallback = "Sorry, something went wrong.";
      setAnswer(fallback);
      speak(fallback);
    } finally {
      setStatus("idle");
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  return (
    <NeuroVaultShell status={status}>
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <h1 className="text-5xl font-semibold">NeuroVault</h1>
          <p className="mt-3 text-xl text-black/60">I help only when you ask.</p>
        </header>

        <BigActionButton
          status={status}
          onResult={(q) => onAsk(q)}
          onStatusChange={(s) => setStatus(s)}
        />

        <div className="rounded-2xl border border-black/10 bg-white p-7">
          <div className="text-sm uppercase tracking-wide text-black/60">You said</div>
          <div className="mt-3 min-h-14 text-3xl font-semibold">
            {status === "listening" ? "Listening…" : transcript || "Press Ask for Help and speak."}
          </div>
        </div>

        <ResponseCard answer={answer} />
      </div>
    </NeuroVaultShell>
  );
}
