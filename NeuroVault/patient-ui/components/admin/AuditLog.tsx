import React from 'react';

interface LogProps {
  logs: string[];
}

export default function AuditLog({ logs }: LogProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Live Security Logs</h2>
      <div className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-gray-400 italic">Waiting for uploads...</p>
        ) : (
          logs.map((log, i) => (
            <div 
              key={i} 
              className={`p-3 rounded border font-mono text-sm ${
                log.includes("⚠️") 
                  ? "bg-red-50 border-red-200 text-red-800" 
                  : "bg-green-50 border-green-200 text-green-800"
              }`}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}