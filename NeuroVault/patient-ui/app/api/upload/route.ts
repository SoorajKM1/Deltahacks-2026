import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, image, author } = body; 

    // Generate a clean ID (e.g., "17049281")
    const timestampId = Date.now().toString();

    // --- DEFINE PATHS ---
    // We step out of 'frontend/app/api/upload' to find 'data'
    const baseDataDir = path.join(process.cwd(), '../data');
    const imagesDir = path.join(baseDataDir, 'images');
    const dbPath = path.join(baseDataDir, 'memories.json');

    // Ensure folders exist
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    let savedImageFilename = null;

    // --- 1. SAVE IMAGE (If uploaded) ---
    if (image && image.startsWith('data:image')) {
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
        const extension = matches[1]; // png, jpg, etc.
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Filename format: "keys_17049281.png" (cleaner than just numbers)
        // We use a safe simplified version of the text for the filename
        const safeName = text.substring(0, 10).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        savedImageFilename = `${safeName}_${timestampId}.${extension}`;
        
        const imagePath = path.join(imagesDir, savedImageFilename);
        fs.writeFileSync(imagePath, buffer);
        console.log(`📸 Saved Image: ${savedImageFilename}`);
      }
    }

    // --- 2. APPEND TO MEMORIES.JSON ---
    let currentMemories = [];

    // Read existing file if it exists
    if (fs.existsSync(dbPath)) {
      try {
        const fileData = fs.readFileSync(dbPath, 'utf-8');
        currentMemories = JSON.parse(fileData);
        if (!Array.isArray(currentMemories)) currentMemories = [];
      } catch (e) {
        // If file is corrupt or empty, start fresh
        currentMemories = [];
      }
    }

    // Create the new entry matching your EXACT requested schema
    const newMemory = {
      id: timestampId,
      text: text,
      image: savedImageFilename, // e.g. "keys_17049281.png" or null
      author: author || "Caregiver",
      timestamp: new Date().toISOString()
    };

    // Add to top of list (newest first) or bottom? Usually bottom for databases.
    currentMemories.push(newMemory);

    // Write back to file
    fs.writeFileSync(dbPath, JSON.stringify(currentMemories, null, 2));
    console.log(`✅ Database Updated: ${timestampId}`);

    return NextResponse.json({ success: true, id: timestampId });

  } catch (error) {
    console.error("❌ Upload Error:", error);
    return NextResponse.json({ success: false, error: "Failed to save data" }, { status: 500 });
  }
}