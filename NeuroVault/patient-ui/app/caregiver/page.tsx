"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { checkPrivacy } from "@/lib/privacyFilter";

type LogEntry = {
  ts: string;
  level: "SECURE" | "REDACTED";
  message: string;
};

function nowTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Helper: Convert File to Base64 for the API
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function CaregiverPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  // 1. NEW: Author State
  const [author, setAuthor] = useState(""); 
  const [busy, setBusy] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      ts: nowTime(),
      level: "SECURE",
      message:
        'SECURE: Uploaded "grandson_tim.png" + "This is your grandson Timmy. He loves soccer."',
    },
  ]);

  const fileName = useMemo(() => file?.name || "No file selected", [file]);

  async function onUpload() {
    const raw = context.trim();
    if (!raw) return;

    setBusy(true);

    // 1. Run Privacy Check
    const { cleanText, triggered } = checkPrivacy(raw);
    const level: LogEntry["level"] = triggered ? "REDACTED" : "SECURE";
    const name = file?.name || "no_file";
    const authorName = author.trim() || "Caregiver"; // Default if empty

    try {
      // 2. Prepare Image Data (if exists)
      let base64Image = null;
      if (file) {
        base64Image = await fileToBase64(file);
      }

      // 3. REAL BACKEND CALL
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          image: base64Image, // Sends the actual image data
          author: authorName,
        }),
      });

      if (!response.ok) throw new Error("Upload failed");

      // 4. Update Logs on Success
      const prefix = triggered ? "PRIVACY FILTER ACTIVE:" : "SECURE:";
      const logMessage = `${prefix} [${authorName}] Uploaded "${name}" + "${cleanText}"`;
      
      setLogs((prev) => [{ ts: nowTime(), level, message: logMessage }, ...prev]);

      // Reset Form
      setContext("");
      setFile(null);
      // setAuthor(""); // Optional: keep author name filled for next upload?
      
    } catch (error) {
      console.error(error);
      setLogs((prev) => [{ 
        ts: nowTime(), 
        level: "REDACTED", // Use REDACTED color for errors to grab attention
        message: "❌ ERROR: Failed to save memory to database." 
      }, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black/[0.03] px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-semibold text-blue-700">Caregiver Portal</h1>

          <button
            className="rounded-xl border border-black/15 bg-white px-5 py-3 text-lg text-black/70 hover:bg-black/[0.03]"
            onClick={() => router.push("/")}
          >
            Back to NeuroVault
          </button>
        </div>

        <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold">Add New Memory</h2>

          <div className="mt-6 space-y-6">
            
            {/* --- NEW: AUTHOR INPUT --- */}
            <div className="space-y-2">
              <div className="text-lg font-semibold">1. Who are you?</div>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Mark, Martha, Dr. Smith"
                className="w-full rounded-2xl border border-black/15 p-4 text-lg outline-none focus:border-black/30 bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <div className="text-lg font-semibold">2. Select Photo (optional)</div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Hidden real input */}
                <input
                  id="memory-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {/* Grey button */}
                <label
                  htmlFor="memory-photo"
                  className="cursor-pointer rounded-xl bg-black/10 px-6 py-3 text-lg font-semibold text-black/80 hover:bg-black/15"
                >
                  Choose file
                </label>

                {/* Filename pill */}
                <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-lg text-black/60">
                  {fileName}
                </div>

                {/* Remove button */}
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="rounded-xl border border-black/15 bg-white px-4 py-3 text-lg text-black/70 hover:bg-black/[0.03]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-lg font-semibold">3. Context</div>

              <p className="text-sm text-black/60">
                Avoid passwords, banking details, or private codes. NeuroVault will redact common sensitive patterns.
              </p>

              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
                placeholder="Example: Keys are in the bowl by the front door."
                className="w-full rounded-2xl border border-black/15 p-5 text-xl outline-none focus:border-black/30"
              />
            </div>

            <button
              onClick={onUpload}
              disabled={busy || !context.trim()}
              className={`w-full rounded-2xl py-5 text-2xl font-semibold text-white disabled:opacity-50 transition ${
                 busy ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {busy ? "Uploading…" : "Secure Upload"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold">Live Security Logs</h2>

          <div className="mt-6 space-y-4">
            {logs.map((l, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border p-5 font-mono text-base leading-relaxed ${
                    l.level === "REDACTED" 
                    ? "border-red-200 bg-red-50 text-red-900" 
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                <div className="mb-2 font-sans text-sm text-black/60">
                  {l.ts} • {l.level}
                </div>
                {l.message}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}