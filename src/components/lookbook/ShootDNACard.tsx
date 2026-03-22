"use client";

import { useState } from "react";
import type { MasterShootDNA } from "@/lib/lookbook/types";
import {
  PRODUCT_FAMILY_LABELS,
  STYLE_LABELS,
  GOAL_LABELS,
  GENDER_LABELS,
  LOGO_LABELS,
  CREATIVITY_LABELS,
} from "@/lib/lookbook/types";

interface ShootDNACardProps {
  dna: MasterShootDNA;
  compact?: boolean;
}

function DNARow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[--border-subtle] last:border-0">
      <span className="text-xs text-[--text-tertiary] shrink-0">{label}</span>
      <span className="text-xs text-[--text-primary] text-right">{value}</span>
    </div>
  );
}

export default function ShootDNACard({ dna, compact }: ShootDNACardProps) {
  const [showRows, setShowRows] = useState(false);

  return (
    <div
      className="bg-[--surface-card] rounded-xl p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-base font-semibold text-[--text-primary] mb-1">
        Master Shoot DNA
      </h3>
      {!compact && (
        <p className="text-xs text-[--text-secondary] mb-4">
          Every shot in this set inherits these shared settings. This keeps your
          lookbook feeling like one photoshoot, not six separate images.
        </p>
      )}

      <div className="bg-[--surface-inset] rounded-lg px-3 py-2 mb-4">
        <p className="text-sm text-[--text-primary] leading-relaxed">
          {dna.campaignDirection}
        </p>
      </div>

      {/* In compact mode, DNA rows are behind a toggle */}
      {compact ? (
        <div>
          <button
            onClick={() => setShowRows(!showRows)}
            className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors flex items-center gap-1"
          >
            <span>{showRows ? "Hide" : "Show"} DNA details</span>
            <span className="text-[10px]">{showRows ? "\u25B2" : "\u25BC"}</span>
          </button>
          {showRows && <DNARows dna={dna} />}
        </div>
      ) : (
        <DNARows dna={dna} />
      )}
    </div>
  );
}

function DNARows({ dna }: { dna: MasterShootDNA }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div>
          <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
            Identity
          </span>
          <DNARow
            label="Product"
            value={
              dna.specificItem
                ? `${dna.specificItem} (${PRODUCT_FAMILY_LABELS[dna.productFamily]})`
                : PRODUCT_FAMILY_LABELS[dna.productFamily]
            }
          />
          <DNARow label="Gender" value={GENDER_LABELS[dna.genderPresentation]} />
          <DNARow label="Style" value={STYLE_LABELS[dna.targetStyle]} />
          <DNARow label="Goal" value={GOAL_LABELS[dna.campaignGoal]} />
          <DNARow label="Logo Priority" value={LOGO_LABELS[dna.logoVisibilityPriority]} />
          <DNARow label="Creativity" value={CREATIVITY_LABELS[dna.creativityLevel]} />
        </div>
        <div>
          <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
            Visual Family
          </span>
          <DNARow label="Environment" value={dna.environmentFamily} />
          <DNARow label="Lighting" value={dna.lightingFamily} />
          <DNARow label="Lens" value={dna.lensFamily} />
          <DNARow label="Framing" value={dna.framingFamily} />
          <DNARow label="Motion" value={dna.motionAllowance} />
          <DNARow label="Finish" value={dna.finishFamily} />
        </div>
      </div>

      <div className="mt-4">
        <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
          Realism Profile
        </span>
        <p className="text-xs text-[--text-secondary] mt-1">{dna.realismProfile}</p>
      </div>

      <div className="mt-3">
        <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
          Branding Rules
        </span>
        <p className="text-xs text-[--text-secondary] mt-1">
          {dna.brandingVisibilityRules}
        </p>
      </div>
    </>
  );
}
