"use client";
import React, { useState } from 'react';
import UploadMemoryForm from '@/components/admin/UploadMemoryForm';
import AuditLog from '@/components/admin/AuditLog';

export default function CaregiverPortal() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prevLogs) => [message, ...prevLogs]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-800">Caregiver Portal</h1>
        
        {/* Component 1: The Input Form */}
        <UploadMemoryForm onUploadComplete={addLog} />
        
        {/* Component 2: The Audit Log Display */}
        <AuditLog logs={logs} />
      </div>
    </div>
  );
}