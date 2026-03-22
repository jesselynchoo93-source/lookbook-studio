/**
 * V4.3: Set readiness computation.
 *
 * Pure workflow derivation from tracker state and generated image metadata.
 * No persistence, no side effects, no projectId dependency.
 */

import type {
  TrackerState,
  PersistedGeneratedImage,
  SetReadinessResult,
  SetReadinessTier,
  ShotStatus,
} from "./types";

/**
 * Get positions of shots in the selected final set (keep + best_in_set).
 */
export function getSelectedShots(tracker: TrackerState): number[] {
  return Object.entries(tracker.shots)
    .filter(([, s]) => s.finalMark === "keep" || s.finalMark === "best_in_set")
    .map(([posStr]) => Number(posStr))
    .sort((a, b) => a - b);
}

/**
 * Get the position of the lead shot (best_in_set), or null if none designated.
 */
export function getLeadShot(tracker: TrackerState): number | null {
  for (const [posStr, shot] of Object.entries(tracker.shots)) {
    if (shot.finalMark === "best_in_set") return Number(posStr);
  }
  return null;
}

/**
 * Compute set readiness from tracker state and generated image metadata.
 *
 * Evaluates the selected set (keep + best_in_set) only.
 * Shots marked replace_later are excluded from evaluation.
 *
 * Tiers (evaluated in order):
 *
 * NOT READY (red):
 *   - No selected shots
 *   - No best_in_set designated
 *   - Any selected shot has no attached generated image
 *   - Any selected shot has status needs_retry
 *
 * READY WITH ISSUES (amber):
 *   - Any selected shot has continuity verdict "concern"
 *   - Selected shots have inconsistent polish state
 *
 * READY TO FINALISE (green):
 *   - None of the above triggered
 */
export function computeSetReadiness(
  tracker: TrackerState,
  generatedImages: Record<number, PersistedGeneratedImage>,
): SetReadinessResult {
  const selectedPositions = getSelectedShots(tracker);
  const leadShot = getLeadShot(tracker);
  const reasons: string[] = [];

  // ── Red checks ──

  if (selectedPositions.length === 0) {
    reasons.push("No shots marked as keep or best in set");
    return { tier: "not_ready", reasons };
  }

  if (leadShot === null) {
    reasons.push("No lead shot (best in set) designated");
  }

  for (const pos of selectedPositions) {
    if (!generatedImages[pos]) {
      reasons.push(`Shot ${pos} has no attached image`);
    }
  }

  for (const pos of selectedPositions) {
    const shot = tracker.shots[pos];
    if (shot?.status === "needs_retry") {
      reasons.push(`Shot ${pos} is blocked on needs_retry`);
    }
  }

  if (reasons.length > 0) {
    return { tier: "not_ready", reasons };
  }

  // ── Amber checks ──

  const selectedShots: ShotStatus[] = selectedPositions.map(
    (pos) => tracker.shots[pos],
  );

  for (const pos of selectedPositions) {
    const shot = tracker.shots[pos];
    if (shot?.continuity === "concern" && shot.continuityConcerns.length > 0) {
      reasons.push(`Shot ${pos} has unresolved continuity concerns`);
    }
  }

  // Inconsistent polish: some selected shots have skinPolish "done" while others don't
  const polishedCount = selectedShots.filter(
    (s) => s.skinPolish === "done",
  ).length;
  if (polishedCount > 0 && polishedCount < selectedShots.length) {
    reasons.push(
      "Inconsistent skin polish across selected shots",
    );
  }

  if (reasons.length > 0) {
    return { tier: "ready_with_issues", reasons };
  }

  // ── Green ──

  return { tier: "ready_to_finalise", reasons: [] };
}
