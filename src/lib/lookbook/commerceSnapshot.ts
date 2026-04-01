/**
 * Commerce Snapshot: synchronous localStorage fallback for refresh-race durability.
 *
 * When flushCommerceState fires, it writes to IndexedDB (async, may not complete before refresh)
 * and also writes this snapshot to localStorage (synchronous, guaranteed before page teardown).
 *
 * Only selectedFamilyId is load-bearing in restore logic.
 * restoreStep is for debugging only (not used to override mode derivation).
 */

export interface CommerceSnapshot {
  engine: "commerce";
  selectedFamilyId?: string;
  /** Debug/logging only. Cannot override mode derivation from IndexedDB state. */
  restoreStep: "setup" | "family" | "generate";
  updatedAt: string;
}

const SNAPSHOT_PREFIX = "lookbook_commerceSnapshot_";

export function writeCommerceSnapshot(projectId: string, data: CommerceSnapshot): void {
  try {
    localStorage.setItem(`${SNAPSHOT_PREFIX}${projectId}`, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable: best-effort
  }
}

export function readCommerceSnapshot(projectId: string): CommerceSnapshot | null {
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearCommerceSnapshot(projectId: string): void {
  localStorage.removeItem(`${SNAPSHOT_PREFIX}${projectId}`);
}
