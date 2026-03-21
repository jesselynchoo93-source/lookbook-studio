"use client";

import { useState } from "react";
import type { LookbookInput, LookbookPlanResult } from "@/lib/lookbook/types";
import { generateLookbookPlan } from "@/lib/lookbook/recommendShots";
import StepHeader from "./StepHeader";
import CampaignForm from "./CampaignForm";
import ShootDNACard from "./ShootDNACard";
import CoverageSummaryComponent from "./CoverageSummary";
import GenerationOrderPanel from "./GenerationOrderPanel";
import ShotGrid from "./ShotGrid";
import ExportPanel from "./ExportPanel";

export default function StudioShell() {
  const [result, setResult] = useState<LookbookPlanResult | null>(null);

  const currentStep = result ? 3 : 1;

  const handleSubmit = (input: LookbookInput) => {
    const plan = generateLookbookPlan(input);
    setResult(plan);
  };

  // Top 3 priority positions
  const topPriorityPositions = new Set(
    result ? result.generationOrder.slice(0, 3) : []
  );

  return (
    <div>
      <StepHeader currentStep={currentStep} />

      {!result ? (
        /* Step 1: Campaign inputs */
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Plan Your Lookbook
            </h2>
            <p className="text-gray-400 text-sm">
              Define your campaign, product, and creative direction. Lookbook
              Studio will build a coherent 6-shot plan with a shared visual
              identity.
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <CampaignForm onSubmit={handleSubmit} />
          </div>
        </div>
      ) : (
        /* Steps 2-4: Results */
        <div className="space-y-8">
          {/* Header + Reset */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                Your Lookbook Plan
              </h2>
              <p className="text-gray-400 text-sm">
                {result.shots.length} coordinated shots sharing one Master Shoot
                DNA. Generate the amber-marked shots first for the safest
                results.
              </p>
            </div>
            <button
              onClick={() => setResult(null)}
              className="text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              New Plan
            </button>
          </div>

          {/* Step 2: Master Shoot DNA */}
          <ShootDNACard dna={result.dna} />

          {/* Coverage + Generation Order */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CoverageSummaryComponent coverage={result.coverage} />
            <GenerationOrderPanel
              shots={result.shots}
              generationOrder={result.generationOrder}
            />
          </div>

          {/* Step 3: Shot Grid */}
          <ShotGrid
            shots={result.shots}
            topPriorityPositions={topPriorityPositions}
          />

          {/* Step 4: Export */}
          <ExportPanel exportText={result.exportText} />

          {/* Future: Generation Grid Placeholder */}
          <div className="bg-gray-800/30 border border-dashed border-gray-700 rounded-xl p-8 text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Generation Grid
            </h3>
            <p className="text-xs text-gray-600">
              Direct Higgsfield generation will be available in a future version.
              For now, copy the delta briefs and use them in your manual
              workflow.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
