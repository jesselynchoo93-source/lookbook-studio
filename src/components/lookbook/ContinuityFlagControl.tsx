"use client";

import { useState, useRef, useEffect } from "react";
import type { ContinuityVerdict, ContinuityConcern } from "@/lib/lookbook/types";

interface ContinuityFlagControlProps {
  verdict: ContinuityVerdict;
  concerns: ContinuityConcern[];
  onUpdate: (verdict: ContinuityVerdict, concerns?: ContinuityConcern[]) => void;
}

const CONCERN_OPTIONS: { value: ContinuityConcern; label: string }[] = [
  { value: "face_drift", label: "Face drift" },
  { value: "lighting_drift", label: "Lighting drift" },
  { value: "product_scale_drift", label: "Product scale drift" },
  { value: "background_drift", label: "Background drift" },
  { value: "finish_drift", label: "Finish drift" },
  { value: "mood_drift", label: "Mood drift" },
  { value: "other", label: "Other" },
];

export default function ContinuityFlagControl({
  verdict,
  concerns,
  onUpdate,
}: ContinuityFlagControlProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [concernPickerOpen, setConcernPickerOpen] = useState(false);
  const [selectedConcerns, setSelectedConcerns] = useState<ContinuityConcern[]>(concerns);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync selected concerns when props change
  useEffect(() => {
    setSelectedConcerns(concerns);
  }, [concerns]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConcernPickerOpen(false);
      }
    }
    if (menuOpen || concernPickerOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen, concernPickerOpen]);

  const handleOk = () => {
    onUpdate("ok");
    setMenuOpen(false);
    setConcernPickerOpen(false);
  };

  const handleConcernSelected = () => {
    setMenuOpen(false);
    setConcernPickerOpen(true);
    setSelectedConcerns(concerns);
  };

  const toggleConcern = (c: ContinuityConcern) => {
    setSelectedConcerns((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const confirmConcerns = () => {
    onUpdate("concern", selectedConcerns.length > 0 ? selectedConcerns : ["other"]);
    setConcernPickerOpen(false);
  };

  const handleClear = () => {
    onUpdate("unreviewed");
    setMenuOpen(false);
    setConcernPickerOpen(false);
  };

  // Visual state
  const pillStyle =
    verdict === "ok"
      ? "text-[--status-success-text] bg-[--status-success-bg]"
      : verdict === "concern"
        ? "text-[--status-warning-text] bg-[--status-warning-bg]"
        : "text-[--text-tertiary] bg-transparent border border-[--border-default]";

  const pillLabel =
    verdict === "ok"
      ? "Continuity ok"
      : verdict === "concern"
        ? "Concern"
        : "Review continuity";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setMenuOpen(!menuOpen); setConcernPickerOpen(false); }}
        className={`text-[10px] px-2 py-0.5 rounded-full transition-colors hover:opacity-80 ${pillStyle}`}
      >
        {pillLabel}
      </button>

      {/* Concern tags (shown below pill only when verdict = concern) */}
      {verdict === "concern" && concerns.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {concerns.map((c) => (
            <span
              key={c}
              className="text-[10px] text-[--status-warning-text] bg-[--status-warning-bg] px-1.5 py-0.5 rounded"
            >
              {CONCERN_OPTIONS.find((o) => o.value === c)?.label || c}
            </span>
          ))}
        </div>
      )}

      {/* Verdict dropdown */}
      {menuOpen && (
        <div
          className="absolute z-20 mt-1 left-0 bg-[--surface-elevated] border border-[--border-default] rounded-lg py-1 min-w-[150px]"
          style={{ boxShadow: "var(--shadow-card-active)" }}
        >
          <button
            onClick={handleOk}
            className={`w-full text-left text-xs px-3 py-1.5 transition-colors ${
              verdict === "ok"
                ? "bg-[--surface-inset] text-[--text-primary]"
                : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-inset]"
            }`}
          >
            Continuity ok
          </button>
          <button
            onClick={handleConcernSelected}
            className={`w-full text-left text-xs px-3 py-1.5 transition-colors ${
              verdict === "concern"
                ? "bg-[--surface-inset] text-[--text-primary]"
                : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-inset]"
            }`}
          >
            Continuity concern
          </button>
          {verdict !== "unreviewed" && (
            <button
              onClick={handleClear}
              className="w-full text-left text-xs px-3 py-1.5 text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[--surface-inset] transition-colors border-t border-[--border-subtle] mt-1 pt-1.5"
            >
              Clear review
            </button>
          )}
        </div>
      )}

      {/* Concern tag picker (multi-select) */}
      {concernPickerOpen && (
        <div
          className="absolute z-20 mt-1 left-0 bg-[--surface-elevated] border border-[--border-default] rounded-lg py-1 min-w-[170px]"
          style={{ boxShadow: "var(--shadow-card-active)" }}
        >
          <div className="px-3 py-1.5 text-[10px] text-[--text-tertiary] uppercase tracking-wider">
            What drifted?
          </div>
          {CONCERN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleConcern(opt.value)}
              className={`w-full text-left text-xs px-3 py-1.5 transition-colors flex items-center gap-2 ${
                selectedConcerns.includes(opt.value)
                  ? "text-[--status-warning-text]"
                  : "text-[--text-secondary] hover:text-[--text-primary]"
              } hover:bg-[--surface-inset]`}
            >
              <span className="w-3 text-center">
                {selectedConcerns.includes(opt.value) ? "\u2713" : ""}
              </span>
              {opt.label}
            </button>
          ))}
          <div className="px-3 pt-2 pb-1.5 border-t border-[--border-subtle] mt-1">
            <button
              onClick={confirmConcerns}
              className="text-xs text-[--text-inverted] bg-[--text-primary] hover:opacity-90 px-3 py-1 rounded transition-opacity w-full"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
