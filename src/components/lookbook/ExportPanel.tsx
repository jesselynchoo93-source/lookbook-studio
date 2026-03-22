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
    <div
      className="bg-[--surface-card] rounded-xl p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-sm font-medium text-[--text-primary] mb-1">Export</h3>
      <p className="text-xs text-[--text-tertiary] mb-4">
        Copy the full lookbook plan, including Master Shoot DNA and all 6 delta
        briefs, ready for your Higgsfield workflow.
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="bg-[--text-primary] text-[--text-inverted] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          {copied ? "Copied to clipboard" : "Export Full Plan"}
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-[--text-secondary] hover:text-[--text-primary] text-sm px-4 py-2 rounded-lg border border-[--border-default] transition-colors"
        >
          {showPreview ? "Hide Preview" : "Preview Export"}
        </button>
      </div>

      {showPreview && (
        <pre className="mt-4 bg-[--surface-inset] border border-[--border-subtle] rounded-lg p-4 text-xs text-[--text-secondary] overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
          {exportText}
        </pre>
      )}
    </div>
  );
}
