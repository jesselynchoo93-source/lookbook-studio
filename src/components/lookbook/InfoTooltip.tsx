"use client";

import { useState } from "react";

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(!show); }}
        className="text-[--text-tertiary] hover:text-[--text-secondary] transition-colors ml-1 text-xs"
        aria-label="More info"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1" />
          <path d="M8 7V11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" />
        </svg>
      </button>
      {show && (
        <span
          className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[--text-primary] text-[--text-inverted] text-xs rounded-lg max-w-[240px] text-center whitespace-normal"
          style={{ boxShadow: "var(--shadow-card-active)" }}
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[--text-primary]" />
        </span>
      )}
    </span>
  );
}
