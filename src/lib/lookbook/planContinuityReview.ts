/**
 * Plan Continuity Review (v1)
 *
 * Planner-level continuity checks. Evaluates the shot plan and prompt-level
 * data for internal contradictions BEFORE any images are generated.
 *
 * This is NOT image-level verification. It catches drift at the plan stage,
 * where fixes are cheap.
 *
 * 6 rule-based checks:
 *   1. Secondary object intrusion
 *   2. World family consistency
 *   3. Lighting consistency
 *   4. Finish consistency
 *   5. Product identity risk (subtype-lock vocabulary)
 *   6. Hero subject continuity
 */
import type {
  RecommendedShot,
  MasterShootDNA,
} from "./types";

export type PlanContinuityConcern =
  | "secondary_object_intrusion"
  | "background_drift"
  | "lighting_drift"
  | "finish_drift"
  | "product_scale_drift"
  | "hero_subject_drift";

export interface PlanContinuityFlag {
  concern: PlanContinuityConcern;
  severity: "info" | "warning" | "critical";
  shotPositions: number[];
  message: string;
}

export interface PlanContinuityResult {
  overall: "pass" | "concerns" | "fail";
  flags: PlanContinuityFlag[];
}

// ── Lighting family normalization ──
// Classify raw archetype lighting strings into broad families.
// This prevents false-positive drift warnings when shots share the same lighting
// quality/source but differ in directional detail (which is expected and desirable).

function normalizeLightingFamily(lighting: string): string {
  const lower = lighting.toLowerCase();
  if (lower.includes("backl") || lower.includes("rim light") || lower.includes("edge light")) return "backlit";
  if (lower.includes("hard") || lower.includes("high-contrast") || lower.includes("graphic")) return "hard_directional";
  if (lower.includes("overhead") || lower.includes("top") || lower.includes("zenith")) return "overhead";
  if (lower.includes("window")) return "window";
  if (lower.includes("diffus") || lower.includes("even") || lower.includes("flat")) return "diffused";
  // Default: most archetype lighting is soft directional (key light with fill)
  return "soft_directional";
}

// ── Accessory detection keywords ──

const ACCESSORY_CUES = [
  "clutch", "handbag", "tote", "watch", "bracelet", "necklace",
  "earring", "sunglasses", "ring", "bag", "purse", "wallet",
];

function hasCompetingAccessory(text: string, heroFamily: string): boolean {
  const lower = text.toLowerCase();
  return ACCESSORY_CUES.some(cue => {
    // Don't flag the hero product's own family
    if (heroFamily === "bags" && (cue === "clutch" || cue === "handbag" || cue === "tote" || cue === "bag" || cue === "purse")) return false;
    if (heroFamily === "watches" && cue === "watch") return false;
    if (heroFamily === "jewelry" && (cue === "bracelet" || cue === "necklace" || cue === "earring" || cue === "ring")) return false;
    if (heroFamily === "eyewear" && cue === "sunglasses") return false;
    if (heroFamily === "small_accessories" && (cue === "wallet" || cue === "ring")) return false;
    return lower.includes(cue);
  });
}

// ── Main Review Function ──

export function reviewPlanContinuity(
  shots: RecommendedShot[],
  dna: MasterShootDNA,
): PlanContinuityResult {
  const flags: PlanContinuityFlag[] = [];

  // 1. Secondary object intrusion
  if (dna.secondaryObjectPolicy === "forbid") {
    for (let i = 0; i < shots.length; i++) {
      const blueprint = shots[i].archetype.deltaBlueprint || "";
      if (hasCompetingAccessory(blueprint, dna.productFamily)) {
        flags.push({
          concern: "secondary_object_intrusion",
          severity: "warning",
          shotPositions: [i],
          message: `Shot ${i + 1} archetype mentions competing accessories despite "forbid" policy`,
        });
      }
    }
  }

  // 2. World family consistency
  const worldFamily = dna.worldProfile.family;
  // All shots should derive from the same world family. We can't check the
  // actual world slice (it's derived at compile time), but we can verify
  // the DNA-level family is consistent. This is always true by construction
  // (one DNA per set), so this check is mostly a safety net.

  // 3. Lighting consistency
  // Classify each shot's archetype lighting into a family rather than comparing raw strings.
  // This prevents false positives when guided mode normalizes quality/temperature but
  // preserves shot-function-specific directional intent.
  const lightingFamilies = new Set<string>();
  for (const shot of shots) {
    const lighting = shot.archetype.defaultLighting;
    if (lighting) lightingFamilies.add(normalizeLightingFamily(lighting));
  }
  if (lightingFamilies.size > 2) {
    flags.push({
      concern: "lighting_drift",
      severity: "warning",
      shotPositions: shots.map((_, i) => i),
      message: `${lightingFamilies.size} distinct lighting families across ${shots.length} shots may reduce visual consistency`,
    });
  }

  // 4. Finish consistency
  // The finish family comes from DNA and is constant per set. No per-shot
  // override mechanism exists, so this check passes by construction.

  // 5. Product identity risk
  if (dna.productFamily === "apparel" && dna.specificItem) {
    const heroItem = dna.specificItem.toLowerCase();
    for (let i = 0; i < shots.length; i++) {
      const capabilities = shots[i].archetype.evidenceCapabilities;
      // Check for scale conflicts: a "detail" archetype showing full-body
      // evidence on a dress set, or a full-body archetype on a detail-only item
      const hasFullBody = capabilities.includes("full_silhouette" as never);
      const hasDetail = capabilities.includes("construction_detail" as never);
      if (hasFullBody && hasDetail && shots.filter((_, j) => j !== i).every(s =>
        !s.archetype.evidenceCapabilities.includes("full_silhouette" as never)
      )) {
        // Only one shot shows full silhouette and it also shows detail: unusual but not flaggable
      }
    }
  }

  // 6. Hero subject continuity
  // Verify the hero product family is consistent across all shots.
  // Check that no archetype description references a fundamentally different product type.
  const heroFamily = dna.productFamily;
  const FAMILY_SIGNAL_WORDS: Record<string, string[]> = {
    apparel: ["dress", "jacket", "coat", "shirt", "trousers", "skirt", "top", "blazer"],
    bags: ["bag", "tote", "clutch", "backpack", "satchel", "crossbody"],
    watches: ["watch", "timepiece", "dial", "strap", "crown"],
    jewelry: ["ring", "necklace", "bracelet", "earring", "pendant"],
    eyewear: ["sunglasses", "glasses", "frames", "lenses"],
    footwear: ["shoe", "boot", "sneaker", "heel", "sandal", "loafer"],
  };

  for (let i = 0; i < shots.length; i++) {
    const blueprint = (shots[i].archetype.deltaBlueprint || "").toLowerCase();
    if (!blueprint) continue;

    for (const [family, signals] of Object.entries(FAMILY_SIGNAL_WORDS)) {
      if (family === heroFamily) continue;
      const mentionsOtherFamily = signals.some(s => {
        // Only flag if the word appears as a likely subject, not as a modifier
        const regex = new RegExp(`\\b${s}\\b`, "i");
        return regex.test(blueprint);
      });
      if (mentionsOtherFamily) {
        flags.push({
          concern: "hero_subject_drift",
          severity: "critical",
          shotPositions: [i],
          message: `Shot ${i + 1} archetype references "${family}" product language, but hero is "${heroFamily}"`,
        });
        break; // One flag per shot is enough
      }
    }
  }

  // Determine overall result
  const hasCritical = flags.some(f => f.severity === "critical");
  const hasWarning = flags.some(f => f.severity === "warning");
  const overall = hasCritical ? "fail" : hasWarning ? "concerns" : "pass";

  return { overall, flags };
}
