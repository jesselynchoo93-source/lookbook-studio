"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label: string;
  copiedLabel: string;
  primary?: boolean;
}

export default function CopyButton({
  text,
  label,
  copiedLabel,
  primary,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={
        primary
          ? "bg-[--text-primary] text-[--text-inverted] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          : "text-[--text-secondary] hover:text-[--text-primary] text-sm px-4 py-2 rounded-lg border border-[--border-default] transition-colors"
      }
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
