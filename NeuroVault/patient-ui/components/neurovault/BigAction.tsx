"use client";

import { useRef, useState } from "react";

type Status = "idle" | "listening" | "thinking";

export default function BigActionButton({
    status,
    onResult,
    onStatusChange,
    }: {
    status: Status;
    onResult: (text: string) => void;
    onStatusChange: (s: Status) => void;
    }) {
    const [textFallback, setTextFallback] = useState(false);
    const [typed, setTyped] = useState("");
    const recRef = useRef<any | null>(null);

    function getRecognition() {
        if (typeof window === "undefined") return null;
        const w = window as any;
        return w.SpeechRecognition || w.webkitSpeechRecognition || null;
    }

    function startListening() {
        const Recognition = getRecognition();
        if (!Recognition) {
        setTextFallback(true);
        return;
        }

        const rec = new Recognition();
        rec.lang = "en-US";
        rec.continuous = false;
        rec.interimResults = false;

        rec.onresult = (e: any) => {
        const t = e.results?.[0]?.[0]?.transcript ?? "";
        onStatusChange("thinking");
        onResult(t);
        };

        rec.onerror = () => onStatusChange("idle");
        rec.onend = () => {
        // If we were listening, move to thinking instead of instantly going idle
            onStatusChange("thinking");
            };


        recRef.current = rec;
        onStatusChange("listening");
        rec.start();
    }

    function submitTyped() {
        if (!typed.trim()) return;
        onStatusChange("thinking");
        onResult(typed);
        setTyped("");
    }

    const disabled = status === "thinking";

    return (
        <div className="space-y-4">
        <button
            onClick={startListening}
            disabled={disabled}
            className="w-full rounded-2xl bg-black py-10 text-4xl font-semibold text-white shadow-sm disabled:opacity-50"
        >
            {status === "listening" ? "Listening…" : "Ask for Help"}
        </button>

        <div className="flex items-center gap-3">
            <button
            className="rounded-xl border border-black/15 px-5 py-3 text-lg text-black/80 hover:bg-black/[0.03] disabled:opacity-50"
            onClick={() => setTextFallback((v) => !v)}
            disabled={disabled}
            >
            {textFallback ? "Use microphone" : "Type instead"}
            </button>

            {textFallback && (
            <button
                className="ml-auto rounded-xl bg-black px-6 py-3 text-lg text-white disabled:opacity-50"
                onClick={submitTyped}
                disabled={disabled || !typed.trim()}
            >
                Ask
            </button>
            )}
        </div>

        {textFallback && (
            <input
            className="w-full rounded-2xl border border-black/15 p-5 text-2xl outline-none focus:border-black/30"
            placeholder="Type your question…"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            />
        )}
        </div>
    );
}
