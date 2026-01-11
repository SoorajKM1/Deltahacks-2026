"use client";

import { useState, useEffect } from "react";
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
  
  // NEW: Store vision result here
  const [lastVision, setLastVision] = useState<VisionIdentifyResult | null>(null);

  useEffect(() => {
    if (answer) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, [answer]);

  async function onAsk(text: string) {
    const q = text.trim();
    if (!q || status === "thinking") return;

    setStatus("thinking");
    setTranscript(q);
    setShowCamera(false); 
    setLastVision(null); // Clear vision result when asking a new question

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
      });

      if (!response.ok) throw new Error("Brain connection failed");
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
    u.rate = 0.95; u.pitch = 1.05; 
    window.speechSynthesis.speak(u);
  }

  // LOGIC: Receive result from CameraCapture, close camera, show result on Main Card
  function handleIdentify(r: VisionIdentifyResult) {
    setLastVision(r);
    // Optional: delay closing slightly so they see the success on the camera card first
    setTimeout(() => {
        setShowCamera(false);
    }, 1200);
  }

  return (
    <NeuroVaultShell status={status}>
      
      {/* LAYOUT CONTAINER */}
      <div 
        className={`
          flex items-center justify-center gap-8 w-fit mx-auto transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-[85vh]
          ${showCamera ? "-translate-x-[22rem]" : "translate-x-0"} 
        `}
      >

        {/* --- MAIN CARD --- */}
        <div className="w-[45rem] h-full shrink-0 bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-500 z-20 relative">
          
          {/* Header */}
          <header className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">NeuroVault</h1>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Personal Assistant</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-2">
               {status === "idle" && <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span>}
               {status === "listening" && <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>}
               {status === "thinking" && <Sparkles size={14} className="text-blue-500 animate-spin" />}
               <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                 {status === "idle" ? "Online" : status === "listening" ? "Listening..." : "Processing..."}
               </span>
            </div>
          </header>

          {/* Display Area */}
          <div className="flex-1 bg-slate-50/30 p-6 flex flex-col items-center justify-center relative overflow-y-auto min-h-0">
            
            {/* 1. STATE: MATCH FOUND (Shows after camera closes) */}
            {lastVision && !answer && !transcript && (
                 <div className="animate-in zoom-in-95 duration-500 w-full max-w-lg">
                    <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                <Camera size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Photo Analyzed</h3>
                                <p className="text-slate-400 font-medium">I found a match in your memory bank.</p>
                            </div>
                        </div>

                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Result</div>
                            <div className="text-2xl font-bold text-slate-900">
                                {lastVision.memory_id === "unknown" ? "Unknown Person" : lastVision.memory_id}
                            </div>
                            {lastVision.confidence && (
                                <div className="text-xs text-slate-400 mt-2">
                                    Confidence: {(lastVision.confidence * 100).toFixed(0)}%
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setLastVision(null)}
                                className="py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                                Dismiss
                            </button>
                            <button 
                                onClick={() => {
                                    if(lastVision.memory_id !== "unknown") onAsk(`#file:${lastVision.memory_id}`);
                                    else onAsk("Who is this person?");
                                }}
                                className="py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                            >
                                Ask About This
                            </button>
                        </div>
                    </div>
                 </div>
            )}

            {/* 2. STATE: EMPTY (Show Suggestions) */}
            {!answer && !transcript && !lastVision && (
              <div className="text-center space-y-6 animate-in fade-in duration-700 w-full max-w-lg">
                <p className="text-slate-400 text-base font-medium">Try asking...</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <button onClick={() => onAsk("Who is in my family?")} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><Users size={18}/></div>
                    <span className="text-slate-700 font-semibold text-sm">My Family</span>
                  </button>
                  <button onClick={() => onAsk("What medication do I take?")} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Pill size={18}/></div>
                    <span className="text-slate-700 font-semibold text-sm">Medication</span>
                  </button>
                  <button onClick={() => onAsk("What is my routine today?")} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 group">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors"><Clock size={18}/></div>
                    <span className="text-slate-700 font-semibold text-sm">Daily Routine</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* 3. STATE: CHAT ACTIVE */}
            <div className="w-full space-y-4">
              {transcript && (
                <div className="flex justify-end animate-in slide-in-from-bottom-2 fade-in">
                  <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm text-lg shadow-md max-w-[90%] leading-relaxed">
                    "{transcript}"
                  </div>
                </div>
              )}
              {answer && <ResponseCard answer={answer} />}
            </div>
          </div>

          {/* Control Dock */}
          <div className="bg-white py-3 px-8 border-t border-slate-100 flex flex-col items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20 shrink-0">
             <BigActionButton
               status={status}
               onResult={onAsk}
               onStatusChange={setStatus}
               onToggleCamera={() => setShowCamera(!showCamera)} 
             />
          </div>
        </div>

        {/* --- CAMERA CARD --- */}
        <div className={`
           absolute left-[47rem] top-0 bottom-0 h-full
           w-[45rem] bg-slate-900 rounded-[3rem] shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col 
           transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-left
           ${showCamera 
             ? "opacity-100 scale-100 translate-x-0 rotate-0" 
             : "opacity-0 scale-90 -translate-x-10 rotate-[-5deg] pointer-events-none"}
        `}>
            <div className="flex items-center justify-between p-6 bg-slate-900 text-white z-10 shrink-0">
              <div>
                <h2 className="font-bold text-xl tracking-wide">Visual Scanner</h2>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-1">Camera Active</p>
              </div>
              <button onClick={() => setShowCamera(false)} className="p-3 rounded-full bg-white/10 hover:bg-white/20 hover:text-white transition-colors">
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