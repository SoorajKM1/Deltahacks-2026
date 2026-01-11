import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Memory from '@/models/Memory';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, image, author } = body; 

    // 1. Connect to the Cloud Database
    await dbConnect();

    // 2. Create the Memory
    // MongoDB will automatically create an "_id" for us.
    const newMemory = await Memory.create({
      text,
      image, // This saves the raw Base64 image string directly to DB
      author: author || "Caregiver",
      timestamp: new Date()
    });

    console.log(`✅ MongoDB Saved Memory ID: ${newMemory._id}`);

    return NextResponse.json({ success: true, id: newMemory._id });

  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ success: false, error: "Failed to save to MongoDB" }, { status: 500 });
  }
}