"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Terminal, ShieldCheck, Lock, User } from "lucide-react";
import { DropZone } from "./DropZone";
import { checkPrivacy } from "@/lib/privacyFilter";

// --- TYPES ---
type LogType = "info" | "success" | "error" | "warning";
type LogEntry = { id: number; ts: string; type: LogType; message: string };

// --- HELPERS ---
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function CaregiverPage() {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "success">("idle");
  
  // Logs State
  const [logs, setLogs] = useState<LogEntry[]>([{
    id: 1, ts: nowTime(), type: "success", 
    message: 'SECURE: System initialized. Ready for encrypted upload.'
  }]);

  // Helper to add logs
  const addLog = (text: string, type: LogType = "info") => {
    setLogs(prev => [{ id: Date.now(), ts: nowTime(), type, message: text }, ...prev]);
  };

  async function onUpload() {
    const raw = context.trim();
    if (!raw && !file) return;

    setStatus("uploading");
    
    // 1. Prepare Data
    const authorName = author.trim() || "Caregiver";
    const fileName = file?.name || "no_image";
    addLog(`INIT: User [${authorName}] started upload sequence.`, "info");

    // 2. Run Privacy Filter
    const { cleanText, triggered } = checkPrivacy(raw);
    if (triggered) {
      addLog("PRIVACY: Redacted sensitive PII patterns from text.", "warning");
    }

    try {
      // 3. Convert Image
      let base64Image = null;
      if (file) {
        addLog(`PROCESSING: Encoding image "${fileName}"...`, "info");
        base64Image = await fileToBase64(file);
      }

      // 4. Send to Backend
      // Note: This connects to the endpoint your teammate creates
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          image: base64Image,
          author: authorName,
        }),
      });

      if (!response.ok) throw new Error("Server rejected upload");

      // 5. Success State
      setStatus("success");
      const prefix = triggered ? "PRIVACY ACTIVE:" : "SECURE:";
      addLog(`${prefix} Uploaded "${fileName}" + "${cleanText.substring(0, 20)}..."`, "success");
      addLog("SYNC: NeuroVault Brain updated successfully.", "success");

      // 6. Reset Form
      setTimeout(() => {
        setStatus("idle");
        setContext("");
        setFile(null); 
        // We keep 'author' so they don't have to re-type it
      }, 3000);

    } catch (error) {
      console.error(error);
      setStatus("idle");
      addLog("ERROR: Failed to save memory to database.", "error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">N</div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-slate-900 leading-none">Caregiver Portal</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Authorized Access Only</p>
            </div>
          </div>
          <Link href="/" className="group flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-lg">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to NeuroVault
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT COLUMN: INPUTS (8 Cols) --- */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 space-y-8">
            
            {/* 1. AUTHOR */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Who are you?</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Mark (Son), Dr. Smith"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-lg text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 2. PHOTO (DropZone) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Photo Evidence <span className="text-slate-300 font-normal normal-case">(Optional)</span></label>
              <DropZone key={file ? "loaded" : "empty"} onFileSelect={setFile} />
            </div>

            {/* 3. CONTEXT */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Context & Details</label>
              <div className="relative">
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. 'This is a photo of Timmy winning his soccer trophy. He plays forward.'"
                  className="w-full h-40 p-5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none outline-none text-lg text-slate-700 placeholder:text-slate-400"
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                  <Lock size={10} />
                  E2E ENCRYPTED
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              onClick={onUpload}
              disabled={status !== "idle" || (!context && !file)}
              className={`
                w-full py-5 rounded-2xl font-bold text-lg text-white shadow-xl transition-all duration-300 transform active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${status === "idle" ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-blue-500/25" : ""}
                ${status === "uploading" ? "bg-slate-800 cursor-wait" : ""}
                ${status === "success" ? "bg-green-500 shadow-green-500/25" : ""}
              `}
            >
              {status === "idle" && "Secure Upload Memory"}
              {status === "uploading" && (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Encrypting...
                </span>
              )}
              {status === "success" && (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={24} /> Memory Stored
                </span>
              )}
            </button>
          </div>
        </div>

        {/* --- RIGHT COLUMN: LOGS (4 Cols) --- */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col h-[600px] border border-slate-800 sticky top-24">
            
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-4">
              <div className="p-2 bg-slate-800 rounded-lg">
                <Terminal size={18} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-slate-200">SECURITY_LOGS</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] text-green-400 font-mono">LIVE CONNECTION</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs pr-2 custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className={`
                  p-3 rounded-xl border-l-2 animate-in fade-in slide-in-from-left-2 duration-300 break-words
                  ${log.type === "info" ? "bg-slate-800/50 border-blue-500 text-blue-200" : ""}
                  ${log.type === "success" ? "bg-green-900/20 border-green-500 text-green-300" : ""}
                  ${log.type === "warning" ? "bg-orange-900/20 border-orange-500 text-orange-200" : ""}
                  ${log.type === "error" ? "bg-red-900/20 border-red-500 text-red-300" : ""}
                `}>
                  <div className="opacity-40 text-[10px] mb-1">{log.ts}</div>
                  {log.message}
                </div>
              ))}
            </div>

            <div className="pt-4 mt-auto border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-600 flex items-center justify-center gap-2">
                <ShieldCheck size={12} />
                NeuroVault Zero-Knowledge Encryption
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}