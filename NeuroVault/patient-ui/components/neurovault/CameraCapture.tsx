"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

export type VisionIdentifyResult = {
  memory_id: string; // "mem_family_tim.txt" or "unknown"
  confidence: number;
  distance?: number;
  match_filename?: string;
};

type Status = "idle" | "starting" | "ready" | "capturing" | "error";

export default function CameraCapture({
  onCapture,
  onIdentify,
}: {
  backendUrl?: string;
  onCapture?: (imageDataUrl: string) => void;
  onIdentify?: (result: VisionIdentifyResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultRef = useRef<HTMLDivElement>(null); // For Auto-Scroll

  const [status, setStatus] = useState<Status>("starting");
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [lastResult, setLastResult] = useState<VisionIdentifyResult | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<string>("");

  const canSnap = status === "ready" && !busy;

  // 1. START CAMERA
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function start() {
      setErr("");
      setStatus("starting");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const v = videoRef.current;
        if (!v) throw new Error("Video element not ready");
        v.srcObject = stream;
        await v.play();
        setStatus("ready");
      } catch (e: any) {
        console.error("Camera error:", e);
        setErr(e?.message || "Unable to access camera");
        setStatus("error");
      }
    }
    start();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 2. AUTO-SCROLL TO DETAILS (User Request)
  useEffect(() => {
    if (lastResult || err) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [lastResult, err]);

  async function captureFrame(): Promise<string | null> {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return null;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.9);
  }

  async function snapAndIdentify() {
    if (!canSnap) return;
    setBusy(true);
    setStatus("capturing");
    setErr("");

    try {
      const img = await captureFrame();
      if (!img) throw new Error("Failed to capture frame");
      setLastSnapshot(img);
      onCapture?.(img);

      const res = await fetch("/api/vision/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: img }),
      });

      const raw = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(raw); } catch { parsed = { nonJson: true, raw }; }

      if (!res.ok) throw new Error("Vision identify failed");
      
      const result = parsed as VisionIdentifyResult;
      setLastResult(result);
      onIdentify?.(result); // Pass to parent
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Something went wrong");
      setLastResult(null);
    } finally {
      setBusy(false);
      setStatus("ready");
    }
  }

  function resetPreview() {
    setLastSnapshot("");
    setLastResult(null);
    setErr("");
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full relative">
      
      {/* --- CAMERA VIEWPORT --- */}
      <div className="relative w-full aspect-[4/3] bg-black rounded-[2rem] overflow-hidden shadow-inner border border-slate-800 group shrink-0">
        
        {/* VIDEO / SNAPSHOT */}
        {!lastSnapshot ? (
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        ) : (
          <img src={lastSnapshot} alt="Captured" className="w-full h-full object-cover opacity-60" />
        )}

        {/* OVERLAYS */}
        {busy && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-30">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
            <p className="font-bold text-lg animate-pulse">Analyzing...</p>
          </div>
        )}

        {err && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in">
            <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
            <p className="text-red-200 font-medium mb-4">{err}</p>
            <button onClick={resetPreview} className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm">Try Again</button>
          </div>
        )}

        {/* BIG SHUTTER BUTTON (Only when ready) */}
        {!lastSnapshot && !busy && (
          <div className="absolute inset-x-0 bottom-6 flex flex-col items-center justify-center gap-3 z-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <button
              onClick={snapAndIdentify}
              disabled={!canSnap}
              className="relative w-20 h-20 rounded-full border-4 border-white bg-transparent flex items-center justify-center transition-transform active:scale-95 hover:bg-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            >
              <div className="w-16 h-16 bg-white rounded-full border-2 border-slate-300 shadow-sm" />
            </button>
            <span className="text-white/80 text-xs font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              Tap to Capture
            </span>
          </div>
        )}
      </div>

      {/* --- RESULTS SECTION (Scroll Target) --- */}
      <div ref={resultRef} className="scroll-mt-4 pb-4">
        {lastResult && (
          <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 animate-in slide-in-from-bottom-4 fade-in duration-500 shadow-xl">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Analysis Complete</h3>
                <p className="text-slate-400 text-xs">Confidence: {lastResult.confidence?.toFixed(2)}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl mb-4 border ${lastResult.memory_id !== "unknown" ? "bg-blue-500/10 border-blue-500/50" : "bg-amber-500/10 border-amber-500/50"}`}>
              <div className="text-xs uppercase tracking-wider font-bold opacity-60 mb-1 text-white">
                {lastResult.memory_id !== "unknown" ? "Match Found" : "No Match"}
              </div>
              <div className="text-xl font-bold text-white break-all">
                {lastResult.memory_id === "unknown" ? "Unknown" : lastResult.memory_id}
              </div>
            </div>

            <div className="flex gap-3">
               {/* Note: The parent Page.tsx handles the actual logic, this is just visual feedback */}
              <button onClick={resetPreview} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors">
                Scan Again
              </button>
            </div>
            <p className="text-center text-slate-500 text-xs mt-4">Check the main screen for details.</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}