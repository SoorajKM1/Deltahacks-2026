import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import Memory from "@/models/Memory";

// If you want server-side privacy filtering too (recommended)
// import { checkPrivacy } from "@/lib/privacyFilter";

function parseDataUrl(dataUrl: string) {
  // Expected: "data:image/jpeg;base64,...."
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body?.text ?? "").toString().trim();
    const author = (body?.author ?? "Caregiver").toString().trim() || "Caregiver";
    const image = body?.image ? String(body.image) : null;

    if (!text && !image) {
      return NextResponse.json({ error: "Nothing to upload" }, { status: 400 });
    }

    // Optional: server-side privacy filter
    // const { cleanText } = checkPrivacy(text);

    await dbConnect();

    // 1) Save image to disk (if provided)
    let imageUrl: string | null = null;

    if (image) {
      const parsed = parseDataUrl(image);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const ext = extFromMime(parsed.mime);
      const filename = `${id}.${ext}`;

      // Save into: NeuroVault/data/images
      const imagesDir = path.join(process.cwd(), "data", "images");
      await fs.mkdir(imagesDir, { recursive: true });

      const filePath = path.join(imagesDir, filename);
      const buffer = Buffer.from(parsed.base64, "base64");
      await fs.writeFile(filePath, buffer);

      // Store a URL path you can serve later (you can add a /api/images route or static serving)
      imageUrl = `/data/images/${filename}`;
    }

    // 2) Insert Mongo record (source of truth)
    const doc = await Memory.create({
      text, // or cleanText
      author,
      imageUrl,
      // image: null, // strongly prefer not storing base64
      moorchehStatus: "pending",
      attempts: 0,
      indexedAt: null,
      patientId: "default",
    });

    return NextResponse.json(
      { ok: true, memoryId: String(doc._id), moorchehStatus: doc.moorchehStatus },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
