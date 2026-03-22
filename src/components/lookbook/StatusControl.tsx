"use client";

import { useState, useRef, useEffect } from "react";
import type { GenerationStatus, RetryReason, ShotStatus } from "@/lib/lookbook/types";

interface StatusControlProps {
  shotStatus: ShotStatus;
  onStatusChange: (status: GenerationStatus, retryReason?: RetryReason) => void;
}

const STATUS_OPTIONS: { value: GenerationStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-[--surface-inset] text-[--text-tertiary]" },
  { value: "generating", label: "Generating", color: "bg-[--status-info-bg] text-[--status-info-text]" },
  { value: "needs_retry", label: "Needs retry", color: "bg-[--status-error-bg] text-[--status-error-text]" },
  { value: "accepted", label: "Accepted", color: "bg-[--status-success-bg] text-[--status-success-text]" },
  { value: "enhancing", label: "Enhancing", color: "bg-cyan-50 text-cyan-700" },
  { value: "done", label: "Done", color: "bg-[--status-success-bg] text-[--status-success-text]" },
];

const RETRY_REASONS: { value: RetryReason; label: string }[] = [
  { value: "pose", label: "Pose" },
  { value: "product_structure", label: "Product structure" },
  { value: "face", label: "Face" },
  { value: "hands", label: "Hands" },
  { value: "lighting", label: "Lighting" },
  { value: "branding_text", label: "Branding / text" },
  { value: "composition", label: "Composition" },
  { value: "consistency", label: "Consistency" },
  { value: "other", label: "Other" },
];

function getStatusOption(status: GenerationStatus) {
  return STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
}

export default function StatusControl({ shotStatus, onStatusChange }: StatusControlProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [retryPickerOpen, setRetryPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setRetryPickerOpen(false);
      }
    }
    if (menuOpen || retryPickerOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen, retryPickerOpen]);

  const current = getStatusOption(shotStatus.status);

  const handleSelect = (status: GenerationStatus) => {
    if (status === "needs_retry") {
      // Show retry reason picker instead of immediately setting
      setMenuOpen(false);
      setRetryPickerOpen(true);
      return;
    }
    onStatusChange(status);
    setMenuOpen(false);
  };

  const handleRetryReason = (reason: RetryReason) => {
    onStatusChange("needs_retry", reason);
    setRetryPickerOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Status pill */}
      <button
        onClick={() => { setMenuOpen(!menuOpen); setRetryPickerOpen(false); }}
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors hover:opacity-80 ${current.color}`}
      >
        <span>{current.label}</span>
        {shotStatus.retryCount > 0 && shotStatus.status === "needs_retry" && (
          <span className="text-[10px] opacity-70">x{shotStatus.retryCount}</span>
        )}
        <span className="text-[10px] opacity-50">{"\u25BC"}</span>
      </button>

      {/* Retry reason badge (shown below pill only when needs_retry) */}
      {shotStatus.status === "needs_retry" && shotStatus.retryReasons.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {shotStatus.retryReasons.slice(-2).map((r, i) => (
            <span
              key={`${r}-${i}`}
              className="text-[10px] text-[--status-error-text] bg-[--status-error-bg] px-1.5 py-0.5 rounded"
            >
              {RETRY_REASONS.find((rr) => rr.value === r)?.label || r}
            </span>
          ))}
        </div>
      )}

      {/* Status dropdown */}
      {menuOpen && (
        <div
          className="absolute z-20 mt-1 left-0 bg-[--surface-elevated] border border-[--border-default] rounded-lg py-1 min-w-[140px]"
          style={{ boxShadow: "var(--shadow-card-active)" }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left text-xs px-3 py-1.5 transition-colors ${
                opt.value === shotStatus.status
                  ? "bg-[--surface-inset] text-[--text-primary]"
                  : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-inset]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Retry reason picker */}
      {retryPickerOpen && (
        <div
          className="absolute z-20 mt-1 left-0 bg-[--surface-elevated] border border-[--border-default] rounded-lg py-1 min-w-[160px]"
          style={{ boxShadow: "var(--shadow-card-active)" }}
        >
          <div className="px-3 py-1.5 text-[10px] text-[--text-tertiary] uppercase tracking-wider">
            What went wrong?
          </div>
          {RETRY_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => handleRetryReason(r.value)}
              className="w-full text-left text-xs px-3 py-1.5 text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-inset] transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
