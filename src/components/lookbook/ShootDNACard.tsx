"use client";

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
}

function DNARow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-700/50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-300 text-right">{value}</span>
    </div>
  );
}

export default function ShootDNACard({ dna }: ShootDNACardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">
        Master Shoot DNA
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Every shot in this set inherits these shared settings. This keeps your
        lookbook feeling like one photoshoot, not six separate images.
      </p>

      <div className="bg-gray-900/50 rounded-lg px-3 py-2 mb-4">
        <p className="text-sm text-gray-300 leading-relaxed">
          {dna.campaignDirection}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
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
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
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
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Realism Profile
        </span>
        <p className="text-xs text-gray-400 mt-1">{dna.realismProfile}</p>
      </div>

      <div className="mt-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Branding Rules
        </span>
        <p className="text-xs text-gray-400 mt-1">
          {dna.brandingVisibilityRules}
        </p>
      </div>
    </div>
  );
}
