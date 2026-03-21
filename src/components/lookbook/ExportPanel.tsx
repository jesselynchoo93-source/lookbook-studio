"use client";

import { useState } from "react";

interface ExportPanelProps {
  exportText: string;
}

export default function ExportPanel({ exportText }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-medium text-white mb-1">Export</h3>
      <p className="text-xs text-gray-500 mb-4">
        Copy the full lookbook plan, including Master Shoot DNA and all 6 delta
        briefs, ready for your Higgsfield workflow.
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {copied ? "Copied to clipboard" : "Export Full Plan"}
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-gray-400 hover:text-gray-300 text-sm px-4 py-2 rounded-lg border border-gray-700 transition-colors"
        >
          {showPreview ? "Hide Preview" : "Preview Export"}
        </button>
      </div>

      {showPreview && (
        <pre className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-gray-400 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
          {exportText}
        </pre>
      )}
    </div>
  );
}
