"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Clock, Users, Pill, X, Camera } from "lucide-react";
import NeuroVaultShell from "../components/neurovault/NeuroVaultShell";
import BigActionButton from "../components/neurovault/BigAction";
import ResponseCard from "../components/neurovault/ResponseCard";
import CaregiverFab from "@/components/neurovault/CaregiverFab";
import CameraCapture, { VisionIdentifyResult } from "@/components/neurovault/CameraCapture";

export default function Page() {
  const [status, setStatus] = useState<"idle" | "listening" | "thinking">("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [lastVision, setLastVision] = useState<VisionIdentifyResult | null>(null);

  // --- AUDIO REFS ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // ⚡ Cache the last audio URL so Replay is instant & identical
  const lastAudioCache = useRef<{ text: string; url: string } | null>(null);

  useEffect(() => {
    if (answer) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [answer]);

  // --- SMART VOICE FUNCTION ---
  async function playVoice(text: string) {
    if (!audioRef.current) return;

    try {
      // 1. CHECK CACHE: Did we already generate this exact sentence?
      if (lastAudioCache.current && lastAudioCache.current.text === text) {
        console.log("Reusing cached audio for instant replay");
        audioRef.current.src = lastAudioCache.current.url;
        audioRef.current.playbackRate = 0.80; // 
        audioRef.current.play().catch(e => console.error("Playback error", e));
        return; 
      }

      // 2. IF NOT IN CACHE: Generate New Audio
      console.log("🎤 Generating new audio for:", text);
      const response = await fetch("/api/speak", {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Voice generation failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // 3. Save to Cache
      lastAudioCache.current = { text: text, url: audioUrl };

      // 4. Play
      audioRef.current.src = audioUrl;
      audioRef.current.load(); 
      audioRef.current.playbackRate = 0.80; // Slow & Clear
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("❌ Browser blocked audio:", error);
        });
      }
    } catch (err) {
      console.error("Audio error:", err);
    }
  }

  async function onAsk(query: string, displayText?: string) {
    const q = query.trim();
    if (!q || status === "thinking") return;

    setStatus("thinking");
    setTranscript(displayText?.trim() ? displayText.trim() : q);

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
      
      // Speak the new answer (Generates new file)
      playVoice(a);

    } catch (e) {
      console.error(e);
      const fallback = "I'm having trouble connecting to my memory right now.";
      setAnswer(fallback);
      playVoice(fallback);
    } finally {
      setStatus("idle");
    }
  }

  // ✅ NEW: auto-send "Who is this person?" immediately after capture
  function handleIdentify(r: VisionIdentifyResult) {
    setLastVision(r);

    // close camera (immediately or after a short delay)
    setTimeout(() => setShowCamera(false), 600);

    // Send #file to backend if known, but show friendly transcript
    if (r.memory_id && r.memory_id !== "unknown") {
      onAsk(`#file:${r.memory_id}`, "Who/What is this?");
    } else {
      onAsk("Who/What is this?");
    }
  }

  return (
    <NeuroVaultShell status={status}>
      
      {/* --- HIDDEN PLAYER WITH SPEED ENFORCER --- */}
      <audio 
        ref={audioRef} 
        className="hidden"
        onPlay={(e) => {
          // ⚡ THE FIX: Force speed to 0.95 every time playback starts.
          // This overrides the browser's default 1.0 speed on fast networks (Vercel).
          e.currentTarget.playbackRate = 0.80; 
        }}
      />

      <div
        className={`
          flex items-center justify-center gap-8 w-fit mx-auto transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-[85vh]
          ${showCamera ? "-translate-x-88" : "translate-x-0"} 
        `}
      >
        {/* --- MAIN CARD --- */}
        <div className="w-180 h-full shrink-0 bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-500 z-20 relative">
          <header className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">NeuroVault</h1>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Personal Assistant</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-2">
              {status === "idle" && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              )}
              {status === "listening" && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
              {status === "thinking" && <Sparkles size={14} className="text-blue-500 animate-spin" />}
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {status === "idle" ? "Online" : status === "listening" ? "Listening..." : "Processing..."}
              </span>
            </div>
          </header>

          <div className="flex-1 bg-slate-50/30 p-6 flex flex-col items-center justify-center relative overflow-y-auto min-h-0">
            {/* Optional feedback card */}
            {lastVision && !answer && transcript && transcript === "Who/What is this?" && (
              <div className="animate-in zoom-in-95 duration-300 w-full max-w-lg mb-4">
                <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <Camera size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Photo Analyzed</h3>
                      <p className="text-slate-400 font-medium">Checking memory bank…</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {!answer && !transcript && (
              <div className="text-center space-y-6 animate-in fade-in duration-700 w-full max-w-lg">
                <p className="text-slate-400 text-base font-medium">Try asking...</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <button
                    onClick={() => onAsk("Who is in my family?")}
                    className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group"
                  >
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Users size={18} />
                    </div>
                    <span className="text-slate-700 font-semibold text-sm">My Family</span>
                  </button>

                  <button
                    onClick={() => onAsk("What medication do I take?")}
                    className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group"
                  >
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Pill size={18} />
                    </div>
                    <span className="text-slate-700 font-semibold text-sm">Medication</span>
                  </button>

                  <button
                    onClick={() => onAsk("What is my routine today?")}
                    className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group"
                  >
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Clock size={18} />
                    </div>
                    <span className="text-slate-700 font-semibold text-sm">Daily Routine</span>
                  </button>
                </div>
              </div>
            )}

            {/* CHAT ACTIVE */}
            <div className="w-full space-y-4">
              {transcript && (
                <div className="flex justify-end animate-in slide-in-from-bottom-2 fade-in">
                  <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm text-lg shadow-md max-w-[90%] leading-relaxed">
                    "{transcript}"
                  </div>
                </div>
              )}
              
              {/* Pass the function to ResponseCard, which now intelligently uses the cache */}
              {answer && <ResponseCard answer={answer} onReplay={playVoice} />}
            </div>
          </div>

          <div className="bg-white py-3 px-8 border-t border-slate-100 flex flex-col items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20 shrink-0">
            <BigActionButton
              status={status}
              onResult={(q: string) => onAsk(q)}
              onStatusChange={setStatus}
              onToggleCamera={() => {
                setTranscript("");
                setAnswer("");
                setLastVision(null);
                setShowCamera(!showCamera);
              }}
            />
          </div>
        </div>

        {/* --- CAMERA CARD --- */}
        <div
          className={`
           absolute left-[47rem] top-0 bottom-0 h-full
           w-[45rem] bg-slate-900 rounded-[3rem] shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col 
           transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left
           ${
             showCamera
               ? "opacity-100 scale-100 translate-x-0 rotate-0"
               : "opacity-0 scale-90 -translate-x-10 rotate-[-5deg] pointer-events-none"
           }
        `}
        >
          <div className="flex items-center justify-between p-6 bg-slate-900 text-white z-10 shrink-0">
            <div>
              <h2 className="font-bold text-xl tracking-wide">Visual Scanner</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-1">Camera Active</p>
            </div>
            <button
              onClick={() => setShowCamera(false)}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 bg-black relative rounded-t-[2.5rem] overflow-hidden mx-3 mb-3 border border-slate-800">
            {showCamera && <CameraCapture onIdentify={handleIdentify} />}

            <div className="absolute inset-0 pointer-events-none border-[6px] border-white/5 rounded-[2.5rem]" />
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
              <span className="bg-black/60 text-white px-5 py-2.5 rounded-full text-sm font-mono backdrop-blur-md border border-white/10 shadow-lg animate-pulse">
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