import type {
  MasterShootDNA,
  RecommendedShot,
  LookbookInput,
  PlanDiagnostics,
  TrackerState,
  SetReadinessResult,
  FinalMark,
} from "./types";
import {
  PRODUCT_FAMILY_LABELS,
  STYLE_LABELS,
  GENDER_LABELS,
  PRIMARY_OBJECTIVE_LABELS,
  BRAND_VISIBILITY_LABELS,
  POSE_DIRECTION_LABELS,
} from "./types";
import type { ProductFamily } from "./types";
import { NEGATIVE_DEFAULTS } from "./realismRules";
import { runBriefQualityPass } from "./buildShotDelta";
import { getSelectedShots, getLeadShot } from "./setReadiness";

// ── Category-native display names for generic archetypes ──
// When a generic archetype is used for a specific family, show a better name in the export.
const DISPLAY_NAME_OVERRIDES: Record<string, Partial<Record<ProductFamily, string>>> = {
  detail_crop_logo_focus: {
    eyewear: "Frame and Temple Mark Detail",
    watches: "Dial and Case Mark Detail",
    footwear: "Tongue and Heel Tab Detail",
    bags: "Logo and Hardware Detail",
    jewelry: "Hallmark and Setting Detail",
    headwear: "Badge and Label Detail",
    belts: "Buckle Stamp Detail",
  },
  hero_full_body_seller: {
    bags: "Carry and Proportion Hero",
    watches: "Wrist Presence Hero",
    jewelry: "Placement and Scale Hero",
    eyewear: "Face-Framing Hero",
    belts: "Full-Body Belt Context",
  },
  accessory_hand_interaction: {
    watches: "Wrist and Hand Interaction",
    jewelry: "Hand and Piece Interaction",
    eyewear: "Frames in Hand",
  },
  portrait_hero_clean: {
    eyewear: "Clean Frame Portrait",
    jewelry: "Jewelry Portrait",
    headwear: "Headwear Portrait",
  },
};

function getDisplayName(archetypeId: string, archetypeTitle: string, family: ProductFamily): string {
  const override = DISPLAY_NAME_OVERRIDES[archetypeId]?.[family];
  return override || archetypeTitle;
}

export function formatExportText(
  dna: MasterShootDNA,
  shots: RecommendedShot[],
  generationOrder: number[],
  input: LookbookInput,
  diagnostics?: PlanDiagnostics
): string {
  const lines: string[] = [];

  lines.push("LOOKBOOK STUDIO PLAN v2");
  lines.push("=======================");
  lines.push("");

  // ── Master Shoot DNA ──
  lines.push("MASTER SHOOT DNA");
  lines.push("-----------------");
  lines.push(`Campaign direction: ${dna.campaignDirection}`);
  lines.push(
    `Product: ${dna.specificItem ? `${dna.specificItem} (${PRODUCT_FAMILY_LABELS[dna.productFamily]})` : PRODUCT_FAMILY_LABELS[dna.productFamily]}`
  );
  lines.push(`Gender: ${GENDER_LABELS[dna.genderPresentation]}`);
  lines.push(`Style: ${STYLE_LABELS[dna.targetStyle]}`);
  lines.push(`Goal: ${PRIMARY_OBJECTIVE_LABELS[dna.primaryObjective]}`);
  lines.push(`Logo priority: ${BRAND_VISIBILITY_LABELS[dna.brandVisibility]}`);
  lines.push(`Creativity: ${POSE_DIRECTION_LABELS[dna.poseDirection]}`);
  lines.push("");
  lines.push(`World: ${dna.worldSummary}`);
  lines.push(`Lighting: ${dna.lightingSummary}`);
  lines.push(`Lens family: ${dna.lensFamily}`);
  lines.push(`Framing family: ${dna.framingFamily}`);
  lines.push(`Motion allowance: ${dna.motionAllowance}`);
  lines.push(`Finish: ${dna.finishFamily}`);
  lines.push(`Realism: ${dna.realismProfile}`);
  lines.push(`Branding rules: ${dna.brandingVisibilityRules}`);
  lines.push("");

  // V2: Global negative cues live here, not per-shot
  lines.push("GLOBAL NEGATIVE CUES (apply to every shot):");
  lines.push(`  ${NEGATIVE_DEFAULTS}`);
  lines.push("");

  // Generation order with "why generate now" for first 3
  const firstThree = generationOrder.slice(0, 3);
  lines.push("GENERATION ORDER");
  lines.push("-----------------");
  lines.push(`Recommended first shots: ${firstThree.map((i) => `#${i + 1}`).join(", ")}`);
  lines.push(`${dna.generationPriorityNotes}`);
  lines.push("");

  // Show why-generate-now for first 3
  for (const genIdx of firstThree) {
    const shot = shots.find((s) => s.position === genIdx + 1);
    if (shot?.whyGenerateNow) {
      const name = getDisplayName(shot.archetype.id, shot.archetype.title, input.productFamily);
      lines.push(`  #${shot.position} ${name}: ${shot.whyGenerateNow}`);
    }
  }
  if (firstThree.some((i) => shots.find((s) => s.position === i + 1)?.whyGenerateNow)) {
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // ── Individual Shots ──
  for (const shot of shots) {
    const displayName = getDisplayName(shot.archetype.id, shot.archetype.title, input.productFamily);
    lines.push(`SHOT ${shot.position}: ${displayName.toUpperCase()}`);
    lines.push(`Category: ${shot.archetype.shotCategory} | Priority: #${shot.generationPriority} | ${shot.archetype.difficulty} difficulty`);
    if (shot.badges.length > 0) {
      lines.push(`Badges: ${shot.badges.join(", ")}`);
    }
    lines.push("");

    // Why this shot was selected (1-liner)
    if (shot.whySelected) {
      lines.push(`WHY: ${shot.whySelected}`);
    }

    // What it sells (separated from brief)
    lines.push(`WHAT IT SELLS:`);
    lines.push(`  ${shot.whatItSells}`);
    lines.push("");

    // Evidence
    if (shot.evidenceProvided.length > 0) {
      lines.push(`EVIDENCE: ${shot.evidenceProvided.join(", ")}`);
      lines.push("");
    }

    // The brief itself (the image to create)
    lines.push(`BRIEF:`);
    lines.push(`  ${shot.deltaBrief}`);
    lines.push("");

    // Technical
    lines.push(`FRAMING: ${shot.framingDelta}`);
    lines.push(`POSE: ${shot.poseDelta}`);
    lines.push(`BRANDING: ${shot.brandingSafety}`);
    lines.push("");

    // V2: Shot-specific negative cues only (global cues are in DNA section)
    if (shot.negativeCues && shot.negativeCues !== "(see global negative cues)") {
      lines.push(`SHOT-SPECIFIC NEGATIVE CUES:`);
      lines.push(`  ${shot.negativeCues}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  // ── Brief Quality Pass (corrective) ──
  const qualityIssues = runBriefQualityPass(shots);
  const corrections = qualityIssues.filter((i) => i.issue.startsWith("[CORRECTED]"));
  const remaining = qualityIssues.filter((i) => !i.issue.startsWith("[CORRECTED]"));
  if (qualityIssues.length > 0) {
    lines.push("BRIEF QUALITY PASS");
    lines.push("==================");
    if (corrections.length > 0) {
      lines.push(`  Auto-corrected (${corrections.length}):`);
      for (const c of corrections) {
        lines.push(`    Shot ${c.shotPosition}: ${c.issue}`);
      }
    }
    if (remaining.length > 0) {
      lines.push(`  Remaining issues (${remaining.length}):`);
      for (const r of remaining) {
        lines.push(`    Shot ${r.shotPosition}: ${r.issue}`);
      }
    }
    if (remaining.length === 0 && corrections.length > 0) {
      lines.push(`  All detected issues were auto-corrected.`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // ── Compact Coverage Summary ──
  if (diagnostics) {
    // COVERAGE line
    const reqTotal = diagnostics.requiredEvidenceCovered.length + diagnostics.uncoveredRequired.length;
    const recTotal = diagnostics.recommendedEvidenceCovered.length + diagnostics.uncoveredRecommended.length;
    const optGaps = diagnostics.uncoveredOptional.length;
    let coverageLine = `COVERAGE: ${diagnostics.requiredEvidenceCovered.length}/${reqTotal} required, ${diagnostics.recommendedEvidenceCovered.length}/${recTotal} recommended`;
    if (diagnostics.uncoveredRequired.length > 0) {
      const n = diagnostics.uncoveredRequired.length;
      coverageLine += `, ${n} required gap${n > 1 ? "s" : ""} (${diagnostics.uncoveredRequired.join(", ")})`;
    }
    if (diagnostics.uncoveredRecommended.length > 0) {
      const n = diagnostics.uncoveredRecommended.length;
      coverageLine += `, ${n} recommended gap${n > 1 ? "s" : ""} (${diagnostics.uncoveredRecommended.join(", ")})`;
    }
    if (optGaps > 0 && diagnostics.uncoveredRequired.length === 0 && diagnostics.uncoveredRecommended.length === 0) {
      coverageLine += `, ${optGaps} optional gap${optGaps > 1 ? "s" : ""}`;
    }
    lines.push(coverageLine);

    // ROLE MIX line
    const allCategories = new Set([
      ...Object.keys(diagnostics.roleMixTarget),
      ...Object.keys(diagnostics.roleMixActual),
    ]);
    const roleParts: string[] = [];
    for (const cat of allCategories) {
      const actual = (diagnostics.roleMixActual as Record<string, number>)[cat] ?? 0;
      if (actual > 0) roleParts.push(`${cat} ${actual}`);
    }
    lines.push(`ROLE MIX: ${roleParts.join(", ")}`);

    // OVERLAP line
    const criticalWarnings = diagnostics.redundancyWarnings.filter((w) => w.severity === "critical");
    const warningWarnings = diagnostics.redundancyWarnings.filter((w) => w.severity === "warning");
    if (criticalWarnings.length > 0) {
      lines.push(`OVERLAP: critical duplication detected (${criticalWarnings.length} issue${criticalWarnings.length > 1 ? "s" : ""})`);
    } else if (warningWarnings.length > 0) {
      lines.push(`OVERLAP: moderate, ${warningWarnings.length} warning${warningWarnings.length > 1 ? "s" : ""}`);
    } else {
      lines.push("OVERLAP: clean, no critical redundancy");
    }

    lines.push("");
  }

  lines.push("Generated by Lookbook Studio v2");

  return lines.join("\n");
}

// ── V4.3: Final summary export (presentation-ready, selected shots only) ──

const FINAL_MARK_LABELS: Record<NonNullable<FinalMark>, string> = {
  keep: "Keep",
  replace_later: "Replace Later",
  best_in_set: "Lead Shot",
};

const READINESS_LABELS: Record<string, string> = {
  not_ready: "Not Ready",
  ready_with_issues: "Ready (with issues)",
  ready_to_finalise: "Ready to Finalise",
};

/**
 * V4.3: Presentation-ready export of the selected final set.
 * Includes only keep + best_in_set shots. No internal workflow noise.
 */
export function formatFinalExport(
  input: LookbookInput,
  shots: RecommendedShot[],
  tracker: TrackerState,
  readiness: SetReadinessResult,
  projectName?: string,
): string {
  const lines: string[] = [];
  const selectedPositions = new Set(getSelectedShots(tracker));
  const leadPosition = getLeadShot(tracker);

  const selectedShots = shots.filter((s) => selectedPositions.has(s.position));

  // ── Header ──
  lines.push("LOOKBOOK FINAL SUMMARY");
  lines.push("======================");
  lines.push("");
  if (projectName) {
    lines.push(`Project: ${projectName}`);
  }
  const productLabel = input.specificItem?.trim()
    ? `${input.specificItem} (${PRODUCT_FAMILY_LABELS[input.productFamily]})`
    : PRODUCT_FAMILY_LABELS[input.productFamily];
  lines.push(`Product: ${productLabel}`);
  lines.push(`Style: ${STYLE_LABELS[input.targetStyle]}`);
  lines.push(`Goal: ${PRIMARY_OBJECTIVE_LABELS[input.primaryObjective]}`);
  lines.push(`Selected shots: ${selectedShots.length} of ${shots.length}`);
  lines.push(`Status: ${READINESS_LABELS[readiness.tier] || readiness.tier}`);
  if (leadPosition !== null) {
    const leadShot = shots.find((s) => s.position === leadPosition);
    if (leadShot) {
      const leadName = getDisplayName(leadShot.archetype.id, leadShot.archetype.title, input.productFamily);
      lines.push(`Lead shot: #${leadPosition} ${leadName}`);
    }
  }
  lines.push("");

  if (readiness.reasons.length > 0) {
    lines.push("Notes:");
    for (const reason of readiness.reasons) {
      lines.push(`  - ${reason}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // ── Selected shots ──
  for (const shot of selectedShots) {
    const displayName = getDisplayName(shot.archetype.id, shot.archetype.title, input.productFamily);
    const status = tracker.shots[shot.position];
    const mark = status?.finalMark;
    const markLabel = mark ? FINAL_MARK_LABELS[mark] : "Unmarked";

    lines.push(`SHOT ${shot.position}: ${displayName.toUpperCase()}`);
    lines.push(`${markLabel} | ${shot.archetype.shotCategory}`);
    lines.push("");
    lines.push(`  ${shot.whatItSells}`);
    lines.push("");
  }

  lines.push("Generated by Lookbook Studio");

  return lines.join("\n");
}
