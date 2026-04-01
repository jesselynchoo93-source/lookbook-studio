/**
 * V3.2: localStorage tracker for generation workflow state.
 *
 * Persists per-shot status (pending → done) across page refreshes.
 * No backend, no API, no sync. Intentionally ephemeral.
 */

import type {
  LookbookInput,
  TrackerState,
  ShotStatus,
  GenerationStatus,
  RetryReason,
  ContinuityVerdict,
  ContinuityConcern,
  SkinPolishStatus,
  FinalMark,
} from "./types";

const STORAGE_PREFIX = "lookbook_tracker_";

/**
 * Build a stable localStorage key from plan input parameters.
 *
 * Key structure: lookbook_tracker_{hash}
 *
 * The hash is a simple string digest of the 6 defining input fields.
 * Two plans with the same product, style, goal, gender, creativity, and
 * shot count will share a key (and thus restore the same tracker state).
 * Changing any field produces a different key.
 *
 * Notes field is excluded: it's freeform flavour text and shouldn't
 * affect plan identity. specificItem IS included because "shoulder bag"
 * and "tote" for the same family produce meaningfully different plans.
 */
export function buildPlanKey(input: LookbookInput): string {
  const parts = [
    input.productFamily,
    input.specificItem?.toLowerCase().trim() || "_",
    input.genderPresentation,
    input.targetStyle,
    input.primaryObjective,
    input.secondaryEmphasis || "none",
    input.brandVisibility,
    input.poseDirection,
    String(input.shotCount),
    input.worldLockMode || "auto",
  ];
  const raw = parts.join("|");

  // Simple string hash (djb2). Not cryptographic, just stable and collision-resistant.
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return `${STORAGE_PREFIX}${hash.toString(36)}`;
}

/**
 * Load tracker state from localStorage. Returns null if none exists
 * or if the stored data is malformed.
 */
export function loadTracker(planKey: string): TrackerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(planKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.planKey === planKey && parsed.shots) {
      return parsed as TrackerState;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save tracker state to localStorage.
 */
export function saveTracker(state: TrackerState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(state.planKey, JSON.stringify(state));
  } catch {
    // localStorage full or blocked; fail silently
  }
}

/**
 * Remove tracker state for a given plan key.
 */
export function clearTracker(planKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(planKey);
  } catch {
    // fail silently
  }
}

/**
 * Create a fresh tracker state for a new plan.
 */
export function createTracker(
  planKey: string,
  shotPositions: number[],
): TrackerState {
  const now = new Date().toISOString();
  const shots: Record<number, ShotStatus> = {};
  for (const pos of shotPositions) {
    if (pos < 1) continue; // positions are 1-based
    shots[pos] = {
      status: "pending",
      retryCount: 0,
      retryReasons: [],
      continuity: "unreviewed",
      continuityConcerns: [],
      skinPolish: "not_applicable",
      finalMark: null,
      lastUpdated: now,
    };
  }
  return { planKey, createdAt: now, shots };
}

/**
 * Update a single shot's status in the tracker.
 * Handles retry count increment and reason tracking.
 */
export function updateShotStatus(
  state: TrackerState,
  position: number,
  newStatus: GenerationStatus,
  retryReason?: RetryReason,
): TrackerState {
  const current = state.shots[position];
  if (!current) return state;

  const updated: ShotStatus = {
    ...current,
    status: newStatus,
    lastUpdated: new Date().toISOString(),
  };

  // Track retries
  if (newStatus === "needs_retry") {
    updated.retryCount = current.retryCount + 1;
    if (retryReason) {
      updated.retryReasons = [...current.retryReasons, retryReason];
    }
  }

  return {
    ...state,
    shots: { ...state.shots, [position]: updated },
  };
}

/**
 * Update a single shot's continuity review.
 */
export function updateShotContinuity(
  state: TrackerState,
  position: number,
  verdict: ContinuityVerdict,
  concerns?: ContinuityConcern[],
): TrackerState {
  const current = state.shots[position];
  if (!current) return state;

  const updated: ShotStatus = {
    ...current,
    continuity: verdict,
    continuityConcerns: verdict === "concern" && concerns ? concerns : [],
    lastUpdated: new Date().toISOString(),
  };

  return {
    ...state,
    shots: { ...state.shots, [position]: updated },
  };
}

/**
 * Update a single shot's skin polish status.
 */
export function updateShotSkinPolish(
  state: TrackerState,
  position: number,
  skinPolish: SkinPolishStatus,
): TrackerState {
  const current = state.shots[position];
  if (!current) return state;

  const updated: ShotStatus = {
    ...current,
    skinPolish,
    lastUpdated: new Date().toISOString(),
  };

  return {
    ...state,
    shots: { ...state.shots, [position]: updated },
  };
}

/**
 * V4.3: Demote the current best_in_set shot (if any) to "keep".
 * Called before setting a new best_in_set to enforce the at-most-one constraint.
 */
export function clearBestInSet(state: TrackerState): TrackerState {
  const now = new Date().toISOString();
  let changed = false;
  const shots = { ...state.shots };

  for (const [posStr, shot] of Object.entries(shots)) {
    if (shot.finalMark === "best_in_set") {
      shots[Number(posStr)] = { ...shot, finalMark: "keep", lastUpdated: now };
      changed = true;
    }
  }

  return changed ? { ...state, shots } : state;
}

/**
 * V4.3: Update a single shot's final review mark.
 *
 * Enforces: at most one best_in_set (clears previous, demoting to "keep").
 * Only callable when status is accepted, enhancing, or done.
 */
export function updateShotFinalMark(
  state: TrackerState,
  position: number,
  mark: FinalMark,
): TrackerState {
  const current = state.shots[position];
  if (!current) return state;

  // Guard: finalMark only allowed on accepted/enhancing/done
  const eligible =
    current.status === "accepted" ||
    current.status === "enhancing" ||
    current.status === "done";
  if (!eligible) return state;

  // If setting best_in_set, clear any existing one first (demotes to keep)
  let base = state;
  if (mark === "best_in_set") {
    base = clearBestInSet(state);
  }

  const updated: ShotStatus = {
    ...base.shots[position],
    finalMark: mark,
    lastUpdated: new Date().toISOString(),
  };

  return {
    ...base,
    shots: { ...base.shots, [position]: updated },
  };
}
