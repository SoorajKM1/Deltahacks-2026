import mongoose, { Schema } from "mongoose";

const MemorySchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: String, default: "Caregiver" },

    // Prefer this over base64. Store a URL or a file key.
    imageUrl: { type: String, default: null },

    // If you still want to temporarily store base64, keep this optional.
    // Strongly consider removing later.
    image: { type: String, default: null },

    // Ingestion pipeline status
    moorchehStatus: {
      type: String,
      enum: ["pending", "indexed", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    indexedAt: { type: Date, default: null },

    // Useful for multi-user / multi-patient later
    patientId: { type: String, default: "default", index: true },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

export default mongoose.models.Memory || mongoose.model("Memory", MemorySchema);
