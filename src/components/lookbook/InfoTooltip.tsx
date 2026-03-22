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
        ?
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
