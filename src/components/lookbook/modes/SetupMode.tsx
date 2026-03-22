"use client";

import type { LookbookInput, ReferenceAsset, ReferenceType } from "@/lib/lookbook/types";
import CampaignForm from "../CampaignForm";
import ReferencePanel from "../ReferencePanel";
import ReferenceTrustCopy from "../ReferenceTrustCopy";

interface SetupModeProps {
  initialInput: LookbookInput;
  references: {
    model: ReferenceAsset[];
    product: ReferenceAsset[];
    styling: ReferenceAsset[];
  };
  onSubmit: (input: LookbookInput) => void;
  onAddReferences: (type: ReferenceType, files: File[]) => void;
  onRemoveReference: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

const FORM_ID = "lookbook-campaign-form";

export default function SetupMode({
  initialInput,
  references,
  onSubmit,
  onAddReferences,
  onRemoveReference,
  onSetPrimary,
}: SetupModeProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Section A: Creative Direction */}
      <div
        className="bg-[--surface-card] rounded-xl p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-lg font-semibold text-[--text-primary] mb-4">
          Creative Direction
        </h2>
        <CampaignForm
          onSubmit={onSubmit}
          initialInput={initialInput}
          formId={FORM_ID}
        />
      </div>

      {/* Section B: Product & References */}
      <div
        className="bg-[--surface-card] rounded-xl p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-lg font-semibold text-[--text-primary] mb-4">
          Reference Images
        </h2>
        <div className="space-y-4">
          <ReferencePanel
            model={references.model}
            product={references.product}
            styling={references.styling}
            onAdd={onAddReferences}
            onRemove={onRemoveReference}
            onSetPrimary={onSetPrimary}
          />
          <ReferenceTrustCopy />
        </div>
      </div>

      {/* CTA */}
      <button
        type="submit"
        form={FORM_ID}
        className="w-full bg-[--text-primary] text-[--text-inverted] font-medium py-3 rounded-lg text-base hover:opacity-90 transition-opacity"
      >
        Build Lookbook Plan
      </button>
    </div>
  );
}
