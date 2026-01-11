"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, Keyboard, Send } from "lucide-react";

// --- TYPE DEFINITIONS FOR SPEECH API ---
// This tells TypeScript that the browser has a built-in Speech Recognition tool
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

type Props = {
  status: "idle" | "listening" | "thinking";
  onResult: (text: string) => void;
  onStatusChange: (s: "idle" | "listening" | "thinking") => void;
};

export default function BigActionButton({ status, onResult, onStatusChange }: Props) {
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [inputText, setInputText] = useState("");
  const recognitionRef = useRef<any>(null);

  // --- 1. VOICE LOGIC ---
  const handleVoicePress = () => {
    if (status !== "idle") return;

    // Check if browser supports speech
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechChoice = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechChoice) {
      alert("Voice control is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechChoice();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // EVENT: Started Listening
    recognition.onstart = () => {
      onStatusChange("listening");
    };

    // EVENT: Got Result
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        onResult(transcript); // Send real text to parent
      }
    };

    // EVENT: Ended (or Error)
    recognition.onend = () => {
      setTimeout(() => {
      }, 500);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Error:", event.error);
      onStatusChange("idle"); // Reset on error
    };

    recognition.start();
  };

  // --- 2. TYPING LOGIC ---
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onResult(inputText);
      setInputText("");
      setIsTypingMode(false);
    }
  };

  // --- RENDER: TYPING MODE ---
  if (isTypingMode) {
    return (
      <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
        <form onSubmit={handleTextSubmit} className="relative bg-white p-2 rounded-3xl shadow-2xl border-2 border-blue-500 ring-4 ring-blue-100">
          <textarea
            autoFocus
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type here..."
            className="w-full h-48 p-4 text-2xl font-semibold text-slate-800 placeholder:text-slate-300 resize-none outline-none rounded-2xl"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => setIsTypingMode(false)}
              className="px-6 py-4 rounded-xl bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex-1 px-6 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
              Send
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- RENDER: VOICE MODE ---
  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <button
        onClick={handleVoicePress}
        disabled={status === "thinking"}
        className={`
          relative group w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-500 ease-out shadow-2xl
          ${status === "idle" ? "bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-blue-500/30" : ""}
          ${status === "listening" ? "bg-rose-500 scale-110 shadow-rose-500/40" : ""}
          ${status === "thinking" ? "bg-amber-400 scale-95 shadow-amber-500/20 cursor-wait" : ""}
        `}
      >
        {status === "listening" && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-rose-200 animate-ping opacity-75" />
            <div className="absolute -inset-4 rounded-full border border-rose-100 opacity-50 animate-pulse" />
          </>
        )}

        <div className="relative z-10 flex flex-col items-center gap-3 text-white">
          {status === "idle" && <Mic size={48} className="drop-shadow-md" />}
          {status === "listening" && <MicOff size={48} className="animate-pulse" />}
          {status === "thinking" && <Loader2 size={48} className="animate-spin text-white/90" />}
          
          <span className="text-xl font-bold tracking-wide">
            {status === "idle" && "Tap to Speak"}
            {status === "listening" && "Listening..."}
            {status === "thinking" && "Thinking..."}
          </span>
        </div>
      </button>

      {status === "idle" && (
        <button 
          onClick={() => setIsTypingMode(true)}
          className="flex items-center gap-2 px-8 py-4 rounded-full bg-white border-2 border-slate-100 text-slate-500 font-bold text-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
        >
          <Keyboard size={24} />
          <span>Type Instead</span>
        </button>
      )}
    </div>
  );
}