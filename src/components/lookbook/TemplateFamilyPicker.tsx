"use client";

import { useState, useMemo, useCallback } from "react";
import type { ProductFamily, GenderPresentation, ProductFingerprint } from "@/lib/lookbook/types";
import type {
  TemplateFamilyDefinition,
  CommerceShotRole,
  CoverageQuality,
  CommerceSwapMode,
} from "@/lib/commerce/referenceLibrary.types";
import {
  selectTemplateFamilies,
  countStrongCandidates,
  type SelectionCriteria,
} from "@/lib/commerce/templateSelector";
import {
  computeFamilyCompatibility,
  type CompatibilityStatus,
  type FamilyCompatibility,
} from "@/lib/commerce/compatibilityCheck";

// ── Presentation Maps (UI Vocabulary Rule) ──

const SHOT_ROLE_SHORT: Record<CommerceShotRole, string> = {
  front_seller: "Front",
  three_quarter_seller: "3/4 View",
  side_fit_proof: "Side",
  back_fit_proof: "Back",
  detail_construction: "Detail",
  detail_material: "Texture",
  motion_drape_proof: "Movement",
  seated_drape_proof: "Seated",
};

const COVERAGE_LABELS: Record<CoverageQuality, string> = {
  complete: "Complete coverage",
  strong: "Strong coverage",
  partial: "Partial coverage",
};

const STABILITY_LABELS: Record<string, string> = {
  very_stable: "Very stable",
  flexible: "Flexible",
  motion_friendly: "Motion-friendly",
};

const SWAP_MODE_SHORT: Record<CommerceSwapMode, string> = {
  face_only: "Face swap",
  identity_and_garment: "Full swap",
  garment_only: "Garment swap",
};

const BEST_FOR_LABELS: Record<string, string> = {
  dresses: "Dresses",
  tops: "Tops",
  blouses: "Blouses",
  tailoring: "Tailoring",
  outerwear: "Outerwear",
  knitwear: "Knitwear",
  skirts: "Skirts",
  trousers: "Trousers",
  bags: "Bags",
  accessories: "Accessories",
};

// ── Helpers ──

function getStabilityBadge(family: TemplateFamilyDefinition): string {
  const allSafe = family.shots.every((s) => s.replacementSafety === "safe");
  const hasMotion = family.shots.some(
    (s) => s.role === "motion_drape_proof" || s.role === "seated_drape_proof",
  );
  if (allSafe && family.stylingStrictness === "identical") return STABILITY_LABELS.very_stable;
  if (hasMotion) return STABILITY_LABELS.motion_friendly;
  return STABILITY_LABELS.flexible;
}

function getSwapSafetySummary(family: TemplateFamilyDefinition): string {
  const safeCount = family.shots.filter((s) => s.replacementSafety === "safe").length;
  const cautionShots = family.shots.filter((s) => s.replacementSafety === "caution");

  if (safeCount === family.shots.length) return `${safeCount}/${family.shots.length} safe`;

  if (cautionShots.length > 0) {
    const cautionRoles = cautionShots
      .map((s) => SHOT_ROLE_SHORT[s.role])
      .join(", ");
    return `${safeCount} safe, ${cautionShots.length} caution (${cautionRoles})`;
  }

  return `${safeCount}/${family.shots.length} safe`;
}

function buildCoverageSummary(family: TemplateFamilyDefinition): string {
  const sorted = [...family.shots].sort((a, b) => a.position - b.position);
  // Deduplicate roles (e.g. two detail_construction shots become one "Detail")
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const s of sorted) {
    const label = SHOT_ROLE_SHORT[s.role];
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.join(" + ");
}

// ── Props ──

export type ExtractionStatus = "idle" | "analysing" | "ready" | "error";

interface TemplateFamilyPickerProps {
  families: TemplateFamilyDefinition[];
  productFamily: ProductFamily;
  genderPresentation: GenderPresentation;
  selectedFamilyId?: string;
  fingerprint?: ProductFingerprint | Record<string, unknown>;
  extractionStatus?: ExtractionStatus;
  onSelect: (family: TemplateFamilyDefinition) => void;
}

export default function TemplateFamilyPicker({
  families,
  productFamily,
  genderPresentation,
  selectedFamilyId,
  fingerprint,
  extractionStatus = "idle",
  onSelect,
}: TemplateFamilyPickerProps) {
  const [showAll, setShowAll] = useState(false);

  const criteria: SelectionCriteria = useMemo(
    () => ({ productFamily, genderPresentation }),
    [productFamily, genderPresentation],
  );

  const rankedFamilies = useMemo(
    () => selectTemplateFamilies(criteria, families),
    [criteria, families],
  );

  const strongCount = useMemo(
    () => countStrongCandidates(criteria, families),
    [criteria, families],
  );

  // Compute compatibility for each family
  const compatMap = useMemo(() => {
    const map = new Map<string, FamilyCompatibility>();
    for (const f of rankedFamilies) {
      map.set(f.id, computeFamilyCompatibility(f, fingerprint));
    }
    return map;
  }, [rankedFamilies, fingerprint]);

  // Group families by compatibility status
  const groups = useMemo(() => {
    const recommended: TemplateFamilyDefinition[] = [];
    const willSkip: TemplateFamilyDefinition[] = [];
    const notCompatible: TemplateFamilyDefinition[] = [];
    const unknown: TemplateFamilyDefinition[] = [];

    for (const f of rankedFamilies) {
      const c = compatMap.get(f.id)!;
      switch (c.status) {
        case "compatible": recommended.push(f); break;
        case "partial": willSkip.push(f); break;
        case "incompatible": notCompatible.push(f); break;
        case "unknown": unknown.push(f); break;
      }
    }

    return { recommended, willSkip, notCompatible, unknown };
  }, [rankedFamilies, compatMap]);

  const isThinLibrary = strongCount < 3;
  const hasAnyFamilies = rankedFamilies.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--text-primary]">
          Choose a Template
        </h3>
        {isThinLibrary && (
          <span className="text-[11px] text-[--status-warning-text] bg-[--status-warning-bg] px-2 py-0.5 rounded-full">
            Limited templates for this category
          </span>
        )}
      </div>

      {!hasAnyFamilies ? (
        <div className="text-sm text-[--text-tertiary] bg-[--surface-inset] rounded-xl p-6 text-center">
          No approved template families match this product type and gender.
          {!showAll && families.length > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="block mx-auto mt-2 text-xs text-[--text-secondary] underline"
            >
              Show all families
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {/* Recommended */}
          {groups.recommended.length > 0 && (
            <FamilyGroup
              heading="Recommended"
              groupStyle="recommended"
              families={groups.recommended}
              compatMap={compatMap}
              selectedFamilyId={selectedFamilyId}
              onSelect={onSelect}
              showBestMatch
            />
          )}

          {/* Divider between recommended and will-skip */}
          {groups.recommended.length > 0 && groups.willSkip.length > 0 && (
            <hr className="border-[--border-subtle] my-1" />
          )}

          {/* Will skip shots */}
          {groups.willSkip.length > 0 && (
            <FamilyGroup
              heading="Will skip shots"
              groupStyle="warning"
              families={groups.willSkip}
              compatMap={compatMap}
              selectedFamilyId={selectedFamilyId}
              onSelect={onSelect}
            />
          )}

          {/* Divider before not-compatible */}
          {(groups.recommended.length > 0 || groups.willSkip.length > 0) && groups.notCompatible.length > 0 && (
            <hr className="border-[--border-subtle] my-1" />
          )}

          {/* Not compatible */}
          {groups.notCompatible.length > 0 && (
            <FamilyGroup
              heading="Not compatible"
              groupStyle="error"
              families={groups.notCompatible}
              compatMap={compatMap}
              selectedFamilyId={selectedFamilyId}
              onSelect={onSelect}
            />
          )}

          {/* Divider before unknown */}
          {(groups.recommended.length > 0 || groups.willSkip.length > 0 || groups.notCompatible.length > 0) && groups.unknown.length > 0 && (
            <hr className="border-[--border-subtle] my-1" />
          )}

          {/* Compatibility unknown */}
          {groups.unknown.length > 0 && (
            <FamilyGroup
              heading="Compatibility unknown"
              groupStyle="neutral"
              families={groups.unknown}
              compatMap={compatMap}
              selectedFamilyId={selectedFamilyId}
              onSelect={onSelect}
              extractionStatus={extractionStatus}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Family Group (section heading + cards) ──

type GroupStyle = "recommended" | "warning" | "error" | "neutral";

const GROUP_ICON: Record<GroupStyle, React.ReactNode> = {
  recommended: null,
  warning: (
    <svg className="w-4 h-4 text-[--status-warning-text] shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-[--status-error-text] shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
  neutral: null,
};

const GROUP_HEADING_CLASS: Record<GroupStyle, string> = {
  recommended: "text-xs font-semibold uppercase tracking-wider text-[--status-success-text]",
  warning: "text-sm font-bold text-[--status-warning-text]",
  error: "text-sm font-bold text-[--text-tertiary]",
  neutral: "text-xs font-semibold uppercase tracking-wider text-[--text-tertiary]",
};

function FamilyGroup({
  heading,
  groupStyle,
  families,
  compatMap,
  selectedFamilyId,
  onSelect,
  showBestMatch,
  extractionStatus,
}: {
  heading: string;
  groupStyle: GroupStyle;
  families: TemplateFamilyDefinition[];
  compatMap: Map<string, FamilyCompatibility>;
  selectedFamilyId?: string;
  onSelect: (family: TemplateFamilyDefinition) => void;
  showBestMatch?: boolean;
  extractionStatus?: ExtractionStatus;
}) {
  const icon = GROUP_ICON[groupStyle];
  const headingClass = GROUP_HEADING_CLASS[groupStyle];

  const containerClass = groupStyle === "warning"
    ? "border-l-[3px] border-l-[--status-warning-text] pl-3 space-y-2"
    : "space-y-2";

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2">
        {icon}
        <h4 className={headingClass}>
          {heading}
        </h4>
        {extractionStatus === "analysing" && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border border-[--text-tertiary] border-t-[--text-primary] rounded-full animate-spin" />
            <span className="text-[11px] text-[--text-tertiary]">Checking...</span>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {families.map((family, idx) => (
          <FamilyCard
            key={family.id}
            family={family}
            isSelected={selectedFamilyId === family.id}
            compatibility={compatMap.get(family.id)!}
            badge={getBadgeForCard(compatMap.get(family.id)!, idx === 0 && !!showBestMatch)}
            onSelect={() => onSelect(family)}
          />
        ))}
      </div>
    </div>
  );
}

function getBadgeForCard(
  compat: FamilyCompatibility,
  isTopRanked: boolean,
): { label: string; className: string } | null {
  switch (compat.status) {
    case "compatible":
      return isTopRanked
        ? { label: "Best match", className: "bg-[--status-success-bg] text-[--status-success-text]" }
        : { label: "Compatible", className: "bg-[--surface-inset] text-[--text-secondary]" };
    case "partial":
      return { label: "Some shots will be skipped", className: "bg-[--status-warning-bg] text-[--status-warning-text]" };
    case "incompatible":
      return { label: "Not compatible", className: "bg-[--surface-inset] text-[--text-tertiary]" };
    case "unknown":
      return null;
  }
}

// ── Family Card ──

function FamilyCard({
  family,
  isSelected,
  compatibility,
  badge,
  onSelect,
}: {
  family: TemplateFamilyDefinition;
  isSelected: boolean;
  compatibility: FamilyCompatibility;
  badge: { label: string; className: string } | null;
  onSelect: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isDisabled = compatibility.status === "incompatible";

  const handleDetailsToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDetailsOpen((prev) => !prev);
    },
    [],
  );

  const sortedShots = useMemo(
    () => [...family.shots].sort((a, b) => a.position - b.position),
    [family.shots],
  );

  const coverageSummary = useMemo(() => buildCoverageSummary(family), [family]);
  const headline = family.userDescription ?? family.description;
  const productTags = family.bestForProductTypes
    .map((t) => BEST_FOR_LABELS[t] ?? t)
    .join(", ");

  const shotCountLabel = compatibility.status === "partial"
    ? `${compatibility.effectiveShots} of ${family.shots.length} shots`
    : `${family.shots.length} shots`;

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onClick={isDisabled ? undefined : onSelect}
      onKeyDown={isDisabled ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      aria-disabled={isDisabled}
      className={`
        text-left w-full p-4 rounded-xl border-2 transition-all
        ${isDisabled
          ? "border-[--border-subtle] bg-[--surface-inset] opacity-50 cursor-not-allowed"
          : isSelected
            ? "border-[color:var(--accent)] shadow-md cursor-pointer"
            : compatibility.status === "partial"
              ? "border-[--border-subtle] bg-[--surface-card] hover:border-[--text-tertiary] cursor-pointer opacity-90"
              : "border-[--border-subtle] bg-[--surface-card] hover:border-[--text-tertiary] cursor-pointer"
        }
      `}
      style={isSelected && !isDisabled ? {
        backgroundColor: "color-mix(in srgb, var(--accent) 6%, var(--surface-card))",
      } : undefined}
    >
      {/* Badge */}
      {badge && (
        <div className="mb-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      )}

      {/* Thumbnail Grid: 3 columns x 2 rows */}
      <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden mb-3">
        {sortedShots.slice(0, 6).map((shot) => (
          <div
            key={shot.position}
            className={`
              relative aspect-[3/4] bg-[--surface-inset] rounded overflow-hidden
              ${shot.isAnchor ? "ring-2 ring-[color:var(--accent)]" : ""}
            `}
          >
            {shot.thumbnailPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/commerce-refs/${shot.thumbnailPath}`}
                alt={SHOT_ROLE_SHORT[shot.role]}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-[--text-tertiary]">
                {SHOT_ROLE_SHORT[shot.role]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Headline: user description (first visible text) */}
      <p className="text-sm font-semibold text-[--text-primary] leading-snug mb-1">
        {headline}
      </p>

      {/* Coverage summary */}
      <p className="text-xs text-[--text-secondary] mb-2">
        {coverageSummary}
        <span className="mx-1.5 text-[--text-tertiary]">&middot;</span>
        {shotCountLabel}
      </p>

      {/* Compatibility warning band (only full explanation location per warning hierarchy) */}
      {compatibility.status === "partial" && compatibility.conflictSummary && isSelected && (
        <div className="border-l-4 border-l-[--status-warning-text] bg-[--status-warning-bg] rounded-r-lg px-4 py-3 mb-2">
          <p className="text-xs text-[--status-warning-text] font-medium leading-snug">
            {compatibility.conflictSummary}
          </p>
          <p className="text-[11px] text-[--status-warning-text] mt-1 opacity-80">
            {compatibility.effectiveShots}-shot set ({compatibility.skippedCount} skipped)
          </p>
        </div>
      )}

      {/* Product type tags + family name row */}
      <div className="flex items-center flex-wrap gap-1.5">
        {productTags && (
          <span className="text-[11px] text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800 px-2 py-0.5 rounded">
            {productTags}
          </span>
        )}
        <span className="text-[11px] text-[--text-tertiary] ml-auto">
          {family.name}
        </span>
      </div>

      {/* Details toggle */}
      <div className="border-t border-[--border-subtle] pt-2 mt-3">
        <button
          type="button"
          onClick={handleDetailsToggle}
          className="text-[11px] text-[--text-tertiary] underline hover:text-[--text-secondary] transition-colors"
        >
          {detailsOpen ? "Hide details" : "Details"}
        </button>

        {detailsOpen && <DetailsPanel family={family} />}
      </div>
    </div>
  );
}

// ── Details Panel (internal metadata, hidden by default) ──

function DetailsPanel({ family }: { family: TemplateFamilyDefinition }) {
  const stability = getStabilityBadge(family);
  const swapSummary = getSwapSafetySummary(family);
  const coverage = COVERAGE_LABELS[family.coverageQuality];
  const cameraInfo = [
    family.cameraLogic.primaryLens,
    family.cameraLogic.aperture,
    family.cameraLogic.heightRange,
  ].filter(Boolean).join(" / ");

  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
      <DetailRow label="Swap safety" value={swapSummary} />
      <DetailRow label="Stability" value={stability} />
      <DetailRow label="Coverage" value={coverage} />
      <DetailRow label="Coherence" value={`${family.coherenceScore}/10`} />
      <DetailRow label="Background" value={family.backgroundFamily.replace(/_/g, " ")} />
      <DetailRow label="Lighting" value={family.lightingFamily.replace(/_/g, " ")} />
      {cameraInfo && <DetailRow label="Camera" value={cameraInfo} />}
      <DetailRow label="Styling" value={family.stylingStrictness} />

      {/* Per-shot safety breakdown */}
      <div className="col-span-2 mt-1">
        <span className="text-[--text-tertiary] font-medium">Shot safety:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {[...family.shots]
            .sort((a, b) => a.position - b.position)
            .map((shot) => (
              <span
                key={shot.position}
                className={`
                  px-1.5 py-0.5 rounded text-[10px]
                  ${shot.replacementSafety === "safe"
                    ? "bg-[--status-success-bg] text-[--status-success-text]"
                    : shot.replacementSafety === "caution"
                      ? "bg-[--status-warning-bg] text-[--status-warning-text]"
                      : "bg-[--surface-inset] text-[--text-tertiary]"
                  }
                `}
              >
                {SHOT_ROLE_SHORT[shot.role]}: {shot.replacementSafety}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[--text-tertiary]">{label}</span>
      <span className="text-[--text-secondary] font-medium text-right">{value}</span>
    </div>
  );
}
