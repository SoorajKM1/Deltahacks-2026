import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const NAMESPACE = "grandpa_joe_FINAL";

// Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function extractFileId(q: string) {
  const m = q.trim().match(/^#file:(.+)$/i);
  return m ? m[1].trim() : null;
}

async function moorchehSearchV1(queryText: string, apiKey: string) {
  const res = await fetch("https://api.moorcheh.ai/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query: queryText,            // ✅ use real query
      namespaces: [NAMESPACE],     // ✅ required by v1
      top_k: 3,
    }),
  });

  const raw = await res.text();
  return { ok: res.ok, status: res.status, raw };
}

/**
 * For #file: requests, we do NOT rely on metadata_filter (your v1 is rejecting it).
 * Instead, we search with the filename as the query. Your documents include the filename as `id`,
 * so Moorcheh usually returns that doc highly.
 *
 * If you want this to be perfect later, move to a “get document by id” endpoint if Moorcheh has one.
 */
async function moorchehLookupByFileId(fileId: string, apiKey: string) {
  // Make the query very “filename-like”
  const q = fileId.trim();
  return moorchehSearchV1(q, apiKey);
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage =
      messages?.[messages.length - 1]?.content?.toString() || "";

    const moorchehKey = process.env.MOORCHEH_API_KEY || "";
    if (!moorchehKey) {
      console.log("❌ Missing MOORCHEH_API_KEY in server env");
      return new NextResponse("Server missing Moorcheh key", { status: 500 });
    }

    if (!process.env.GOOGLE_API_KEY) {
      console.log("❌ Missing GOOGLE_API_KEY in server env");
      return new NextResponse("Server missing Gemini key", { status: 500 });
    }

    console.log(`🧠 Chat query: "${lastUserMessage}"`);

    const fileId = extractFileId(lastUserMessage);

    // --- STEP A: Retrieve memory context ---
    let contextText = "";

    if (fileId) {
      console.log("🗂️ File lookup:", fileId);

      const { ok, status, raw } = await moorchehLookupByFileId(fileId, moorchehKey);
      console.log("Moorcheh(file) status:", status);
      console.log("Moorcheh(file) raw:", raw.slice(0, 800));

      if (!ok) {
        return new NextResponse("Memory lookup failed", { status: 500 });
      }

      const parsed = JSON.parse(raw);
      const results = Array.isArray(parsed?.results) ? parsed.results : [];

      // Try to pick the exact id match if present
      const exact =
        results.find((r: any) => (r?.id || "").toLowerCase() === fileId.toLowerCase()) ||
        results[0];

      contextText = exact?.text ? String(exact.text) : "";
    } else {
      // Semantic search
      const cleaned = lastUserMessage.replace(/[?!.]+$/g, "").trim();

      const { ok, status, raw } = await moorchehSearchV1(cleaned, moorchehKey);
      console.log("Moorcheh(semantic) status:", status);
      console.log("Moorcheh(semantic) raw:", raw.slice(0, 800));

      if (!ok) {
        return new NextResponse("Moorcheh search failed", { status: 500 });
      }

      const parsed = JSON.parse(raw);
      const results = Array.isArray(parsed?.results) ? parsed.results : [];

      contextText = results
        .map((r: any) => r?.text)
        .filter(Boolean)
        .join("\n\n");
    }

    console.log("Context length:", contextText.length);
    console.log("Context preview:", contextText.slice(0, 200));

    // If nothing found, reply with fallback (Gemini not needed)
    if (!contextText) {
      return new NextResponse("I’m not sure, let’s call Sarah.", { status: 200 });
    }

    // --- STEP B: Gemini answer generation (like your old working route) ---
    const systemPrompt = `
    ROLE: You are "NeuroVault," a compassionate dementia care assistant.

    RETRIEVED MEMORY:
    ${contextText}

    USER QUESTION:
    ${lastUserMessage}

    INSTRUCTIONS:
    1. Answer using ONLY the retrieved memory.
    2. If the question asks about "today" but the memory only contains usual habits, answer with the usual routine from memory.
    3. If the memory contains partial relevant info, answer with what you know. Do NOT call Sarah for partial answers.
    4. Only say "I'm not sure, this is not in my memory." if the memory has no relevant info at all.
    5. Keep the answer under 20 words.
    6. Speak slowly and clearly.
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    return new NextResponse(responseText, { status: 200 });
  } catch (e) {
    console.error("❌ route.ts error:", e);
    return new NextResponse("I am having trouble thinking right now.", {
      status: 500,
    });
  }
}
