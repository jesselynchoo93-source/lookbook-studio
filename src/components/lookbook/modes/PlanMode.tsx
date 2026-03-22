"use client";

import { useState } from "react";
import type {
  LookbookPlanResult,
  ReferenceAsset,
  ReferenceType,
} from "@/lib/lookbook/types";
import type { WorkflowMode } from "../ModeNavigator";
import ShootDNACard from "../ShootDNACard";
import CoverageSummaryComponent from "../CoverageSummary";
import GenerationOrderPanel from "../GenerationOrderPanel";
import ShotGrid from "../ShotGrid";
import ExportPanel from "../ExportPanel";
import ReferenceStrip from "../ReferenceStrip";

interface PlanModeProps {
  result: LookbookPlanResult;
  references: {
    model: ReferenceAsset[];
    product: ReferenceAsset[];
    styling: ReferenceAsset[];
  };
  onModeChange: (mode: WorkflowMode) => void;
  onReset: () => void;
  onAddReferences: (type: ReferenceType, files: File[]) => void;
  onRemoveReference: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

export default function PlanMode({
  result,
  references,
  onModeChange,
  onReset,
  onAddReferences,
  onRemoveReference,
  onSetPrimary,
}: PlanModeProps) {
  const [showCoverage, setShowCoverage] = useState(false);

  const topPriorityPositions = new Set(
    result.generationOrder.slice(0, 3),
  );

  return (
    <div className="space-y-6">
      {/* Header + secondary actions */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[--text-primary] mb-1">
            Your Lookbook Plan
          </h2>
          <p className="text-[--text-secondary] text-sm">
            {result.shots.length} coordinated shots sharing one Master Shoot
            DNA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPanel exportText={result.exportText} collapsed />
          <button
            onClick={() => onModeChange("setup")}
            className="text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          >
            Edit Campaign
          </button>
        </div>
      </div>

      {/* Reference strip */}
      <ReferenceStrip
        model={references.model}
        product={references.product}
        styling={references.styling}
        onAdd={onAddReferences}
        onRemove={onRemoveReference}
        onSetPrimary={onSetPrimary}
      />

      {/* Master Shoot DNA (compact: campaign direction visible, rows behind toggle) */}
      <ShootDNACard dna={result.dna} compact />

      {/* Shot Grid (compact: title + category + what-it-sells only) */}
      <ShotGrid
        shots={result.shots}
        topPriorityPositions={topPriorityPositions}
        compact
      />

      {/* Coverage analysis (collapsed by default) */}
      <div>
        <button
          onClick={() => setShowCoverage(!showCoverage)}
          className="text-sm text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
        >
          {showCoverage ? "Hide coverage analysis" : "Show coverage analysis"}
        </button>
        {showCoverage && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <CoverageSummaryComponent coverage={result.coverage} />
            <GenerationOrderPanel
              shots={result.shots}
              generationOrder={result.generationOrder}
            />
          </div>
        )}
      </div>

      {/* Primary CTA: Start Generating */}
      <div className="pt-2">
        <button
          onClick={() => onModeChange("generate")}
          className="bg-[--text-primary] text-[--text-inverted] px-6 py-3 rounded-lg text-base font-medium w-full transition-colors hover:opacity-90"
        >
          Start Generating
        </button>
      </div>
    </div>
  );
}
