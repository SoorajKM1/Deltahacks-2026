"use client";

import { Sparkles, Copy, Volume2 } from "lucide-react";

// Define the shape of the props so we can pass the Replay function
interface ResponseCardProps {
  answer: string;
  onReplay: (text: string) => void; // <--- NEW PROP
}

export default function ResponseCard({ answer, onReplay }: ResponseCardProps) {
  if (!answer) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">
        
        {/* Decoration */}
        <Sparkles className="absolute -top-6 -right-6 w-32 h-32 text-blue-50 opacity-50 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles size={18} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">NeuroVault</h3>
            <p className="text-xs text-slate-400">Personal Memory Assistant</p>
          </div>
        </div>

        {/* The Answer */}
        <div className="prose prose-lg prose-slate leading-relaxed text-slate-800 font-medium">
          <p>{answer}</p>
        </div>

        {/* Action Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4">
          <button 
            // ⚡ FIX: Call the function passed from the parent (ElevenLabs)
            onClick={() => onReplay(answer)} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-colors"
          >
            <Volume2 size={16} />
            Replay Audio
          </button>
          
          <button 
            onClick={() => navigator.clipboard.writeText(answer)}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors ml-auto"
            title="Copy Text"
          >
            <Copy size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}