/**
 * Shared compatibility checking for commerce template families.
 *
 * Single source of truth for all skip/compatibility math.
 * Used by: TemplateFamilyPicker, CommerceSetupMode, CommerceGenerateMode.
 * No component should duplicate this logic.
 */

import type {
  TemplateFamilyDefinition,
  CommerceShotRole,
} from "./referenceLibrary.types";
import type { ProductFingerprint } from "@/lib/lookbook/types";
import { checkShotCompatibility } from "./commercePromptCompiler";

// ── Types ──

export type CompatibilityStatus = "compatible" | "partial" | "incompatible" | "unknown";

export interface FamilyCompatibility {
  status: CompatibilityStatus;
  skippedCount: number;
  warnedCount: number;
  effectiveShots: number;
  conflictSummary: string | null;
  /** Specific feature tokens that conflict (e.g., ["pockets"]) */
  conflictFeatures: string[];
}

const REQUIRED_ROLES: CommerceShotRole[] = [
  "front_seller", "three_quarter_seller", "side_fit_proof", "back_fit_proof",
];

// ── Public API ──

/**
 * Compute compatibility between a template family and a garment fingerprint.
 *
 * Rules:
 * - No fingerprint = "unknown". Never fake "compatible".
 * - Fingerprint present = real check using checkShotCompatibility.
 * - All required roles conflicting = "incompatible".
 * - Some conflicts = "partial".
 * - No conflicts = "compatible".
 */
export function computeFamilyCompatibility(
  family: TemplateFamilyDefinition,
  fingerprint?: ProductFingerprint | Record<string, unknown>,
): FamilyCompatibility {
  const total = family.shots.length;

  if (!fingerprint) {
    return { status: "unknown", skippedCount: 0, warnedCount: 0, effectiveShots: total, conflictSummary: null, conflictFeatures: [] };
  }

  let skipped = 0;
  let warned = 0;
  let requiredConflicts = 0;
  const allConflicts: string[] = [];

  const requiredInFamily = family.shots.filter((s) => REQUIRED_ROLES.includes(s.role)).length;

  for (const shot of family.shots) {
    const result = checkShotCompatibility(shot, fingerprint);
    if (!result.compatible) {
      for (const c of result.conflicts) {
        if (!allConflicts.includes(c)) allConflicts.push(c);
      }
      if (result.severity === "skip") {
        skipped++;
        if (REQUIRED_ROLES.includes(shot.role)) requiredConflicts++;
      } else {
        warned++;
      }
    }
  }

  if (requiredConflicts === requiredInFamily && requiredInFamily > 0) {
    return {
      status: "incompatible",
      skippedCount: skipped,
      warnedCount: warned,
      effectiveShots: total - skipped,
      conflictSummary: "Not compatible with this garment",
      conflictFeatures: allConflicts,
    };
  }

  if (skipped > 0) {
    const featureList = allConflicts.map((f) => f.replace(/_/g, " ")).join(", ");
    return {
      status: "partial",
      skippedCount: skipped,
      warnedCount: warned,
      effectiveShots: total - skipped,
      conflictSummary: `${skipped} shot${skipped !== 1 ? "s" : ""} will be skipped because this garment has no ${featureList}`,
      conflictFeatures: allConflicts,
    };
  }

  if (warned > 0) {
    // Warn-only: no shots skipped, but some shots will adapt prompts.
    // Status remains "compatible" so the family sorts into "Recommended".
    // warnedCount and conflictFeatures preserved for future UI use.
    return {
      status: "compatible",
      skippedCount: 0,
      warnedCount: warned,
      effectiveShots: total,
      conflictSummary: null,
      conflictFeatures: allConflicts,
    };
  }

  return { status: "compatible", skippedCount: 0, warnedCount: 0, effectiveShots: total, conflictSummary: null, conflictFeatures: [] };
}
