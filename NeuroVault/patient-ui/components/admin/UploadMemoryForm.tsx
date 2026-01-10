"use client";
import React, { useState } from 'react';
import { checkPrivacy } from '@/lib/privacyFilter'; 

interface UploadProps {
  onUploadComplete: (logMessage: string) => void;
}

export default function UploadMemoryForm({ onUploadComplete }: UploadProps) {
  const [memoryText, setMemoryText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = () => {
    if (!memoryText) return;

    // 1. Run Privacy Logic
    const { cleanText, triggered } = checkPrivacy(memoryText);
    const imageName = selectedFile ? selectedFile.name : "no_image.png";

    // 2. Simulate Upload
    console.log(`UPLOADING: { "${imageName}": "${cleanText}" }`);

    // 3. Send result to logs
    const statusIcon = triggered ? "PRIVACY FILTER ACTIVE" : "SECURE";
    const logMessage = `${statusIcon}: Uploaded "${imageName}" + "${cleanText}"`;
    
    onUploadComplete(logMessage);
    setMemoryText("");
    setSelectedFile(null);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-6 border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Add New Memory</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 text-gray-600">1. Select Photo</label>
        <input 
          type="file" 
          accept="image/*"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 text-gray-600">2. Context</label>
        <textarea 
          className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
          rows={3}
          placeholder="e.g. 'The password is secret123'"
          value={memoryText}
          onChange={(e) => setMemoryText(e.target.value)}
        />
      </div>

      <button 
        onClick={handleUpload}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg"
      >
        Secure Upload
      </button>
    </div>
  );
}