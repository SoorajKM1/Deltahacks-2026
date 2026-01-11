"use client";

import { useState, useEffect } from "react";
import { Sparkles, Clock, Users, Pill, X } from "lucide-react";
import NeuroVaultShell from "@/components/neurovault/NeuroVaultShell";
import BigActionButton from "@/components/neurovault/BigAction";
import ResponseCard from "@/components/neurovault/ResponseCard";
import CaregiverFab from "@/components/neurovault/CaregiverFab";
import CameraCapture, { VisionIdentifyResult } from "@/components/neurovault/CameraCapture";

function titleCase(s: string) {
  if (!s) return s;
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferNameFromMemoryId(memoryId: string) {
  // mem_family_saahil.txt -> saahil
  // mem_family_tim.txt -> tim
  const base = memoryId.replace(/\.txt$/i, "");
  const parts = base.split("_");
  const maybeName = parts[parts.length - 1] || "";
  return titleCase(maybeName);
}

function inferRelationshipFromText(t: string) {
  const s = t.toLowerCase();
  if (s.includes("grandson")) return "your grandson";
  if (s.includes("granddaughter")) return "your granddaughter";
  if (s.includes("son")) return "your son";
  if (s.includes("daughter")) return "your daughter";
  if (s.includes("wife")) return "your wife";
  if (s.includes("husband")) return "your husband";
  if (s.includes("friend")) return "your friend";
  return "";
}

function memoryToSpoken(memoryText: string, memoryId: string) {
  const clean = (memoryText || "").trim();
  if (!clean) return "I’m not sure, let’s call Sarah.";

  const name = inferNameFromMemoryId(memoryId);
  const rel = inferRelationshipFromText(clean);

  // If we can confidently say relationship, do the short TTS line you want
  if (name && rel) return `${name}, ${rel}.`;

  // Fallback: read first sentence only
  const firstSentence = clean.split(".")[0]?.trim();
  if (firstSentence) return `${firstSentence}.`;

  return "I’m not sure, let’s call Sarah.";
}

export default function Page() {
  const [status, setStatus] = useState<"idle" | "listening" | "thinking">("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (answer) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [answer]);

  async function onAsk(
    text: string,
    opts?: { hideTranscript?: boolean; closeCamera?: boolean }
  ) {
    const q = text.trim();
    if (!q || status === "thinking") return;

    setStatus("thinking");

    if (!opts?.hideTranscript) {
      setTranscript(q);
    }

    if (opts?.closeCamera !== false) {
      setShowCamera(false);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Brain connection failed: ${response.status} ${errText}`);
      }

      const a = await response.text();
      setAnswer(a);
      speak(a);
    } catch (e) {
      console.error(e);
      const fallback = "I'm having trouble connecting to my memory right now.";
      setAnswer(fallback);
      speak(fallback);
    } finally {
      setStatus("idle");
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  }

  async function handleIdentify(r: VisionIdentifyResult) {
    // Close camera, but do not put "#file:..." into the visible transcript
    setShowCamera(false);

    if (!r.memory_id || r.memory_id === "unknown") {
      const fallback = "I’m not sure who this is, let’s call Sarah.";
      setTranscript("");
      setAnswer(fallback);
      speak(fallback);
      return;
    }

    try {
      // Ask backend for the exact memory text for this file
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `#file:${r.memory_id}` }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Memory lookup failed: ${response.status} ${errText}`);
      }

      const memoryText = await response.text();

      // Convert to short spoken line like: "Saahil, your grandson."
      const spoken = memoryToSpoken(memoryText, r.memory_id);

      setTranscript(""); // prevents showing "#file:..." in the bubble
      setAnswer(spoken);
      speak(spoken);
    } catch (e) {
      console.error(e);
      const fallback = "I’m having trouble accessing memory right now.";
      setTranscript("");
      setAnswer(fallback);
      speak(fallback);
    }
  }

  return (
    <NeuroVaultShell status={status}>
      <div
        className={`
          flex items-center justify-center gap-8 w-fit mx-auto transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-[85vh]
          ${showCamera ? "-translate-x-[22rem]" : "translate-x-0"}
        `}
      >
        {/* MAIN CARD */}
        <div className="w-[45rem] h-full shrink-0 bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-500 z-20 relative">
          {/* Header */}
          <header className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">NeuroVault</h1>
              <p className="text-slate-400 text-sm font-medium">Personal Assistant</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-2">
              {status === "idle" && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
              {status === "listening" && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              {status === "thinking" && <Sparkles size={14} className="text-blue-500 animate-spin" />}
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                {status === "idle" ? "Online" : status === "listening" ? "Listening..." : "Processing..."}
              </span>
            </div>
          </header>

          {/* Display Area */}
          <div className="flex-1 bg-slate-50/30 p-6 flex flex-col items-center justify-center relative overflow-y-auto min-h-0">
            {!answer && !transcript && (
              <div className="text-center space-y-6 animate-in fade-in duration-700">
                <p className="text-slate-400 text-lg font-medium">Try asking...</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <button
                    onClick={() => onAsk("Who is in my family?")}
                    className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group"
                  >
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Users size={20} />
                    </div>
                    <span className="text-slate-700 font-semibold">Who is in my family?</span>
                  </button>

                  <button
                    onClick={() => onAsk("What medication do I take?")}
                    className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group"
                  >
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Pill size={20} />
                    </div>
                    <span className="text-slate-700 font-semibold">My medication?</span>
                  </button>

                  <button
                    onClick={() => onAsk("What is my routine today?")}
                    className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group"
                  >
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Clock size={20} />
                    </div>
                    <span className="text-slate-700 font-semibold">My daily routine?</span>
                  </button>
                </div>
              </div>
            )}

            <div className="w-full space-y-6">
              {transcript && (
                <div className="flex justify-end animate-in slide-in-from-bottom-2 fade-in">
                  <div className="bg-blue-600 text-white px-6 py-4 rounded-3xl rounded-tr-sm text-xl shadow-lg max-w-[85%]">
                    "{transcript}"
                  </div>
                </div>
              )}
              {answer && <ResponseCard answer={answer} />}
            </div>
          </div>

          {/* Control Dock */}
          <div className="bg-white py-4 px-8 border-t border-slate-100 flex flex-col items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20 shrink-0">
            <BigActionButton
              status={status}
              onResult={onAsk}
              onStatusChange={setStatus}
              onToggleCamera={() => setShowCamera((v) => !v)}
            />
          </div>
        </div>

        {/* CAMERA CARD */}
        <div
          className={`
           absolute left-188 top-0 bottom-0 h-full
           w-180 bg-slate-900 rounded-[3rem] shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col
           transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left
           ${showCamera ? "opacity-100 scale-100 translate-x-0 rotate-0" : "opacity-0 scale-90 -translate-x-10 rotate-[-5deg] pointer-events-none"}
        `}
        >
          <div className="flex items-center justify-between p-8 bg-slate-900 text-white z-10 shrink-0">
            <div>
              <h2 className="font-bold text-2xl tracking-wide">Visual Scanner</h2>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mt-1">Camera Active</p>
            </div>
            <button
              onClick={() => setShowCamera(false)}
              className="p-4 rounded-full bg-white/10 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 bg-black relative rounded-t-[2.5rem] overflow-hidden mx-3 mb-3 border border-slate-800">
            {showCamera && <CameraCapture onIdentify={handleIdentify} />}

            <div className="absolute inset-0 pointer-events-none border-8 border-white/5 rounded-[2.5rem]" />
            <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
              <span className="bg-black/60 text-white px-6 py-3 rounded-full text-base font-mono backdrop-blur-md border border-white/10 shadow-lg animate-pulse">
                Scanning Environment...
              </span>
            </div>
          </div>
        </div>
      </div>

      <CaregiverFab />
    </NeuroVaultShell>
  );
}
