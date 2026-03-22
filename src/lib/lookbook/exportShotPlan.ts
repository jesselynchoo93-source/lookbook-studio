import type {
  MasterShootDNA,
  RecommendedShot,
  LookbookInput,
  PlanDiagnostics,
} from "./types";
import {
  PRODUCT_FAMILY_LABELS,
  STYLE_LABELS,
  GOAL_LABELS,
  GENDER_LABELS,
  LOGO_LABELS,
  CREATIVITY_LABELS,
} from "./types";
import type { ProductFamily } from "./types";
import { NEGATIVE_DEFAULTS } from "./realismRules";
import { runBriefQualityPass } from "./buildShotDelta";

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
  lines.push(`Goal: ${GOAL_LABELS[dna.campaignGoal]}`);
  lines.push(`Logo priority: ${LOGO_LABELS[dna.logoVisibilityPriority]}`);
  lines.push(`Creativity: ${CREATIVITY_LABELS[dna.creativityLevel]}`);
  lines.push("");
  lines.push(`Environment: ${dna.environmentFamily}`);
  lines.push(`Lighting: ${dna.lightingFamily}`);
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

    // V2: Shot-specific realism guardrail (replaces global boilerplate per shot)
    if (shot.realismGuardrail) {
      lines.push(`REALISM GUARDRAIL:`);
      lines.push(`  ${shot.realismGuardrail}`);
      lines.push("");
    }

    // V2: Shot-specific negative cues only (global cues are in DNA section)
    if (shot.negativeCues && shot.negativeCues !== "(see global negative cues)") {
      lines.push(`SHOT-SPECIFIC NEGATIVE CUES:`);
      lines.push(`  ${shot.negativeCues}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  // ── Brief Quality Pass ──
  const qualityIssues = runBriefQualityPass(shots);
  if (qualityIssues.length > 0) {
    lines.push("BRIEF QUALITY PASS");
    lines.push("==================");
    for (const issue of qualityIssues) {
      lines.push(`  Shot ${issue.shotPosition}: ${issue.issue}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // ── Evidence Coverage Diagnostics ──
  if (diagnostics) {
    lines.push("EVIDENCE COVERAGE DIAGNOSTICS");
    lines.push("=============================");
    lines.push("");

    lines.push(`Required evidence covered (${diagnostics.requiredEvidenceCovered.length}):`);
    if (diagnostics.requiredEvidenceCovered.length > 0) {
      lines.push(`  ${diagnostics.requiredEvidenceCovered.join(", ")}`);
    } else {
      lines.push("  (none)");
    }
    lines.push("");

    lines.push(`Recommended evidence covered (${diagnostics.recommendedEvidenceCovered.length}):`);
    if (diagnostics.recommendedEvidenceCovered.length > 0) {
      lines.push(`  ${diagnostics.recommendedEvidenceCovered.join(", ")}`);
    } else {
      lines.push("  (none)");
    }
    lines.push("");

    if (diagnostics.uncoveredRequired.length > 0) {
      lines.push(`UNCOVERED REQUIRED evidence (${diagnostics.uncoveredRequired.length}):`);
      lines.push(`  ${diagnostics.uncoveredRequired.join(", ")}`);
      lines.push("");
    }
    if (diagnostics.uncoveredRecommended.length > 0) {
      lines.push(`UNCOVERED RECOMMENDED evidence (${diagnostics.uncoveredRecommended.length}):`);
      lines.push(`  ${diagnostics.uncoveredRecommended.join(", ")}`);
      lines.push("");
    }
    if (diagnostics.uncoveredOptional.length > 0) {
      lines.push(`Uncovered optional evidence (${diagnostics.uncoveredOptional.length}):`);
      lines.push(`  ${diagnostics.uncoveredOptional.join(", ")}`);
      lines.push("");
    }
    if (diagnostics.uncoveredRequired.length === 0 && diagnostics.uncoveredRecommended.length === 0) {
      lines.push("All required and recommended evidence is covered.");
      lines.push("");
    }

    // Redundancy warnings
    const criticalWarnings = diagnostics.redundancyWarnings.filter((w) => w.severity === "critical");
    const warningWarnings = diagnostics.redundancyWarnings.filter((w) => w.severity === "warning");

    if (criticalWarnings.length > 0) {
      lines.push("CRITICAL redundancy:");
      for (const w of criticalWarnings) {
        lines.push(`  ${w.message}`);
      }
      lines.push("");
    }

    if (warningWarnings.length > 0) {
      lines.push("Redundancy warnings:");
      for (const w of warningWarnings) {
        lines.push(`  ${w.message}`);
      }
      lines.push("");
    }

    if (criticalWarnings.length === 0 && warningWarnings.length === 0) {
      lines.push("No significant redundancy detected.");
      lines.push("");
    }

    // Role mix
    lines.push("Role mix:");
    const allCategories = new Set([
      ...Object.keys(diagnostics.roleMixTarget),
      ...Object.keys(diagnostics.roleMixActual),
    ]);
    for (const cat of allCategories) {
      const target = (diagnostics.roleMixTarget as Record<string, number>)[cat] ?? 0;
      const actual = (diagnostics.roleMixActual as Record<string, number>)[cat] ?? 0;
      const status = actual >= target ? "OK" : "BELOW TARGET";
      lines.push(`  ${cat}: ${actual}/${target} ${status}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push("Generated by Lookbook Studio v2");

  return lines.join("\n");
}
