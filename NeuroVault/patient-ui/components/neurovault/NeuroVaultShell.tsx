"use client";

import { ReactNode } from "react";

export default function NeuroVaultShell({ 
  children, 
  status 
}: { 
  children: ReactNode; 
  status: "idle" | "listening" | "thinking";
}) {
  return (
    <main className={`
      min-h-screen transition-colors duration-700 ease-in-out flex flex-col
      ${status === "idle" ? "bg-slate-50" : ""}
      ${status === "listening" ? "bg-[#FFF5F5]" : ""}  /* Very faint red tint */
      ${status === "thinking" ? "bg-[#F0F7FF]" : ""}  /* Very faint blue tint */
    `}>
      {/* Top Decorative Bar (Premium Touch) */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-80" />

      {/* Main Content Container */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-8 flex flex-col justify-center">
        {children}
      </div>

      {/* Footer Branding */}
      <footer className="py-6 text-center">
        <p className="text-xs font-bold tracking-widest text-slate-300 uppercase">
          NeuroVault System • v2.0
        </p>
      </footer>
    </main>
  );
}