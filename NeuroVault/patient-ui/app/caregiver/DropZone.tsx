"use client";

import { useState, useCallback } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react"; // npm install lucide-react

export function DropZone({ onFileSelect }: { onFileSelect: (f: File | null) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    onFileSelect(file);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onFileSelect(null);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center w-full h-56 
        border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out cursor-pointer group
        ${isDragging 
          ? "border-blue-500 bg-blue-50 scale-[1.01]" 
          : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
        }
      `}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        accept="image/*"
        disabled={!!preview} // Disable click if preview exists (use clear button)
      />

      {preview ? (
        <div className="relative w-full h-full p-3 z-20">
          <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-lg shadow-sm" />
          <button 
            onClick={clearFile}
            className="absolute top-4 right-4 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-slate-600 hover:text-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <div className="text-center p-6 space-y-3 pointer-events-none">
          <div className={`p-4 rounded-full shadow-sm inline-block transition-colors ${isDragging ? "bg-blue-100" : "bg-white"}`}>
            <UploadCloud className={`w-8 h-8 ${isDragging ? "text-blue-600" : "text-slate-400"}`} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">
              {isDragging ? "Drop to Attach" : "Click to Upload Photo"}
            </p>
            <p className="text-sm text-slate-500 mt-1">or drag and drop</p>
          </div>
          <p className="text-xs text-slate-400 font-medium">PNG, JPG, WEBP (Max 5MB)</p>
        </div>
      )}
    </div>
  );
}   