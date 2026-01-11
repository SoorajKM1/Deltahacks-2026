"use client";

import { useState, useEffect } from "react";
import { Camera, Sparkles } from "lucide-react"; // npm install lucide-react
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

  // Auto-scroll to answer
  useEffect(() => {
    if (answer) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, [answer]);

  async function onAsk(text: string) {
    const q = text.trim();
    if (!q) return;
    if (status === "thinking") return;

    setStatus("thinking");
    setTranscript(q);
    setShowCamera(false);

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

  function handleIdentify(r: VisionIdentifyResult) {
    if (r.memory_id && r.memory_id !== "unknown") {
      onAsk(`#file:${r.memory_id}`);
    } else {
      onAsk("Who is this person?");
    }
  }

  return (
    <NeuroVaultShell status={status}>
      <div className="w-full max-w-xl mx-auto space-y-8 pb-24">
        
        {/* HEADER */}
        <header className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 text-sm font-bold tracking-wide uppercase">
            {/* STATUS DOT LOGIC */}
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
            
            <span>
              {status === "idle" && "System Online"}
              {status === "listening" && "Listening..."}
              {status === "thinking" && "Processing..."}
            </span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            NeuroVault
          </h1>
          <p className="text-lg text-slate-500 font-medium">
            "I am here to help. Just ask."
          </p>
        </header>

        {/* MAIN ACTION AREA */}
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center">
            <BigActionButton
              status={status}
              onResult={onAsk}
              onStatusChange={setStatus}
            />
          </div>

          {/* User Transcript */}
          <div className={`transition-all duration-500 ease-out transform ${transcript ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
             {transcript && (
               <div className="flex justify-end mb-2">
                 <div className="bg-blue-600 text-white px-6 py-4 rounded-3xl rounded-tr-sm text-xl font-medium shadow-lg max-w-[90%] leading-relaxed">
                   "{transcript}"
                 </div>
               </div>
             )}
          </div>

          {/* Response Card */}
          <div className={`transition-all duration-700 delay-100 ${answer ? "opacity-100" : "opacity-0"}`}>
            {answer && <ResponseCard answer={answer} />}
          </div>
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-50 px-4 text-sm text-slate-400 font-semibold uppercase tracking-wider">Or use visual tools</span>
          </div>
        </div>

        {/* Visual Scanner */}
        <div className={`
          overflow-hidden rounded-3xl border transition-all duration-300
          ${showCamera ? "bg-slate-900 border-slate-800 shadow-2xl" : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer"}
        `}>
          <div 
            onClick={() => setShowCamera(!showCamera)}
            className={`p-6 flex items-center justify-between ${showCamera ? "text-white border-b border-slate-700" : "text-slate-800"}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${showCamera ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"}`}>
                <Camera size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Visual Identification</h3>
                <p className={`text-sm ${showCamera ? "text-slate-400" : "text-slate-500"}`}>
                  Identify family & objects
                </p>
              </div>
            </div>
            <div className={`text-sm font-semibold px-3 py-1 rounded-full ${showCamera ? "bg-red-500/20 text-red-300" : "bg-slate-100 text-slate-500"}`}>
              {showCamera ? "Close Camera" : "Tap to Open"}
            </div>
          </div>

          {showCamera && (
            <div className="p-4 bg-black">
               <div className="rounded-2xl overflow-hidden border-2 border-slate-700 relative">
                 <CameraCapture onIdentify={handleIdentify} />
                 <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                   <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-mono backdrop-blur-md border border-white/10">
                     AI VISION ACTIVE
                   </span>
                 </div>
               </div>
               <p className="text-center text-slate-500 text-xs mt-4 mb-2">
                 Point camera at a face or object to recall memories.
               </p>
            </div>
          )}
        </div>
      </div>
      <CaregiverFab />
    </NeuroVaultShell>
  );
}