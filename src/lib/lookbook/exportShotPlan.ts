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

export function formatExportText(
  dna: MasterShootDNA,
  shots: RecommendedShot[],
  generationOrder: number[],
  input: LookbookInput,
  diagnostics?: PlanDiagnostics
): string {
  const lines: string[] = [];

  lines.push("LOOKBOOK STUDIO PLAN");
  lines.push("====================");
  lines.push("");

  // Master Shoot DNA
  lines.push("Master Shoot DNA");
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

  // Generation order
  const firstThree = generationOrder.slice(0, 3).map((i) => `#${i + 1}`);
  lines.push(`Recommended first shots: ${firstThree.join(", ")}`);
  lines.push(`${dna.generationPriorityNotes}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Individual shots
  for (const shot of shots) {
    lines.push(`${shot.position}. ${shot.archetype.title}`);
    lines.push(`   Role: ${shot.archetype.role}`);
    lines.push(`   Category: ${shot.archetype.shotCategory}`);
    lines.push(`   What it sells: ${shot.whatItSells}`);
    if (shot.evidenceProvided.length > 0) {
      lines.push(`   Evidence: ${shot.evidenceProvided.join(", ")}`);
    }
    lines.push(`   Framing: ${shot.framingDelta}`);
    lines.push(`   Pose: ${shot.poseDelta}`);
    lines.push(`   Branding: ${shot.brandingSafety}`);
    lines.push(`   Reliability: ${shot.archetype.higgsfieldReliability} | Difficulty: ${shot.archetype.difficulty}`);
    lines.push(`   Priority: #${shot.generationPriority}`);
    lines.push("");
    lines.push(`   DELTA BRIEF:`);
    lines.push(`   ${shot.deltaBrief}`);
    lines.push("");
    lines.push(`   NEGATIVE CUES:`);
    lines.push(`   ${shot.negativeCues}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Evidence coverage diagnostics
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

    if (diagnostics.uncoveredEvidence.length > 0) {
      lines.push(`UNCOVERED evidence (${diagnostics.uncoveredEvidence.length}):`);
      lines.push(`  ${diagnostics.uncoveredEvidence.join(", ")}`);
      lines.push("");
    } else {
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

  lines.push("Generated by Lookbook Studio v1");

  return lines.join("\n");
}
