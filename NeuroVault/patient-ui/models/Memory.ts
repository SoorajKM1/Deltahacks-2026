import mongoose, { Schema } from 'mongoose';

const MemorySchema = new Schema({
  text: { type: String, required: true },
  author: { type: String, default: "Caregiver" },
  // We save the image as a huge text string (Base64) - easiest for Hackathons!
  image: { type: String }, 
  timestamp: { type: Date, default: Date.now },
});

// This prevents "Model already exists" errors during hot-reloads
export default mongoose.models.Memory || mongoose.model('Memory', MemorySchema);