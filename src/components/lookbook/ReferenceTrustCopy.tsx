"use client";

export default function ReferenceTrustCopy() {
  return (
    <div className="bg-[--surface-inset] rounded-lg px-4 py-3">
      <h4 className="text-xs font-medium text-[--text-primary] mb-2">
        How references work
      </h4>
      <div className="text-xs text-[--text-secondary] leading-relaxed space-y-2">
        <p>
          Your references help you compare and review your outputs.
          They do not currently change the six-shot plan.
          They are used as visual reference during generation and review.
        </p>
        <p>
          <span className="font-medium text-[--text-primary]">Product references</span> are
          your source of truth for product accuracy. Use them to check shape,
          material, hardware, and construction.
        </p>
        <p>
          <span className="font-medium text-[--text-primary]">Model references</span> help
          you keep the same face and body identity across the set.
        </p>
        <p>
          <span className="font-medium text-[--text-primary]">Styling references</span> are
          inspiration only. Use them for mood, composition, and creative
          direction, not product truth.
        </p>
      </div>
    </div>
  );
}
