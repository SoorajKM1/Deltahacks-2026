import { NextResponse } from "next/server";

const NAMESPACE = "grandpa_joe_FINAL";

function extractFileId(q: string) {
  const m = q.trim().match(/^#file:(.+)$/i);
  return m ? m[1].trim() : null;
}

async function moorchehSearchSemantic(query: string, apiKey: string) {
  // v1 endpoint you are using now
  const res = await fetch("https://api.moorcheh.ai/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      namespaces: [NAMESPACE],
      top_k: 3,
    }),
  });

  const raw = await res.text();
  return { ok: res.ok, status: res.status, raw };
}

async function moorchehSearchByFileId(fileId: string, apiKey: string) {
  // IMPORTANT:
  // This depends on Moorcheh supporting metadata-only filtering.
  // Your ingest script already uploads metadata.file = filename.
  // Use the v2 endpoint if it supports metadata_filter.
  const res = await fetch("https://api.moorcheh.ai/v2/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      namespace: NAMESPACE,
      query: "file", // harmless small query, still might embed on some backends
      limit: 3,
      metadata_filter: { file: fileId },
    }),
  });

  const raw = await res.text();
  return { ok: res.ok, status: res.status, raw };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = messages?.[messages.length - 1]?.content?.toString() || "";

    const apiKey = process.env.NEXT_PUBLIC_MOORCHEH_API_KEY || "";
    if (!apiKey) return new NextResponse("Missing Moorcheh key", { status: 500 });

    console.log(`🧠 Chat query: "${lastUserMessage}"`);

    const fileId = extractFileId(lastUserMessage);

    // 1) If we have #file:, do metadata lookup (no LLM required)
    if (fileId) {
      console.log("🗂️ File lookup:", fileId);

      const { ok, status, raw } = await moorchehSearchByFileId(fileId, apiKey);
      console.log("Moorcheh(file) status:", status);
      console.log("Moorcheh(file) raw:", raw.slice(0, 800));

      if (!ok) {
        return new NextResponse("Memory lookup failed", { status: 500 });
      }

      // Try parse both possible formats
      const parsed = JSON.parse(raw);

      // v2 might return {documents:[{text,...}]} or {results:[{text,...}]}
      const docs = Array.isArray(parsed?.documents)
        ? parsed.documents
        : Array.isArray(parsed?.results)
          ? parsed.results
          : [];

      const text = docs?.[0]?.text || "";
      if (!text) return new NextResponse("I’m not sure, let’s call Sarah.", { status: 200 });

      // Return plain text memory to the client (client will TTS)
      return new NextResponse(text, { status: 200 });
    }

    // 2) Otherwise: normal semantic search (this is where you were hitting bedrock embedding error)
    const { ok, status, raw } = await moorchehSearchSemantic(lastUserMessage, apiKey);
    console.log("Moorcheh(semantic) status:", status);
    console.log("Moorcheh(semantic) raw:", raw.slice(0, 800));

    if (!ok) return new NextResponse("Moorcheh search failed", { status: 500 });

    const parsed = JSON.parse(raw);
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    const contextText = results.map((r: any) => r.text).filter(Boolean).join("\n\n");

    // If you still want Gemini sometimes, keep it here.
    // For now, return context directly so TTS reads it.
    if (!contextText) return new NextResponse("I’m not sure, let’s call Sarah.", { status: 200 });

    return new NextResponse(contextText, { status: 200 });

  } catch (e) {
    console.error("❌ route.ts error:", e);
    return new NextResponse("I am having trouble thinking right now.", { status: 500 });
  }
}
