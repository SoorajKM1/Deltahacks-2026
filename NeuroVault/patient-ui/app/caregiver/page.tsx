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

export default function CaregiverPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [context, setContext] = useState("");
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

        const { cleanText, triggered } = checkPrivacy(raw);
        const level: LogEntry["level"] = triggered ? "REDACTED" : "SECURE";

        const name = file?.name || "no_file";
        const prefix = triggered ? "PRIVACY FILTER ACTIVE:" : "SECURE:";
        const logMessage = `${prefix} Uploaded "${name}" + "${cleanText}"`;

        setLogs((prev) => [{ ts: nowTime(), level, message: logMessage }, ...prev]);

        try {
        // Later: replace with backend call that ingests to Moorcheh
        // const formData = new FormData();
        // if (file) formData.append("file", file);
        // formData.append("text", cleanText);
        // await fetch("/api/caregiver/upload", { method: "POST", body: formData });

        await new Promise((r) => setTimeout(r, 700)); // demo delay

        setContext("");
        setFile(null);
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
                <div className="space-y-2">
                <div className="text-lg font-semibold">1. Select Photo (optional)</div>

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
                <div className="text-lg font-semibold">2. Context</div>

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
                className="w-full rounded-2xl bg-blue-600 py-5 text-2xl font-semibold text-white disabled:opacity-50"
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
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 font-mono text-base leading-relaxed text-emerald-900"
                >
                    <div className="mb-2 font-sans text-sm text-black/60">
                    {l.ts} • {l.level === "REDACTED" ? "REDACTED" : "SECURE"}
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
