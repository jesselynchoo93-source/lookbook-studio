import type { ProjectRecord } from "./types";
import type { CommerceSnapshot } from "./commerceSnapshot";

/**
 * Merge a synchronous localStorage snapshot into a project record loaded from IndexedDB.
 * Returns the original project reference if no merge is needed, or a new object if snapshot fills a gap.
 *
 * SCOPE: This function ONLY fills gaps or resolves freshness for selectedFamilyId.
 * It is NOT a general sync mechanism. The snapshot is not a second source of truth;
 * it is a narrow durability fallback for the async IndexedDB write race on refresh.
 *
 * Precedence rules:
 * 1. If IndexedDB has selectedFamilyId and snapshot doesn't, or they match: no merge.
 * 2. If IndexedDB lost selectedFamilyId but snapshot has it: use snapshot.
 * 3. If both exist and differ: prefer the one with newer updatedAt.
 * 4. Snapshot's restoreStep is debug-only; it cannot override mode derivation.
 */
export function mergeCommerceSnapshot(
  project: ProjectRecord,
  snapshot: CommerceSnapshot,
): ProjectRecord {
  // Case 1: IndexedDB has it, snapshot doesn't or matches -> no merge
  if (project.selectedFamilyId && !snapshot.selectedFamilyId) {
    return project;
  }
  if (project.selectedFamilyId === snapshot.selectedFamilyId) {
    return project;
  }

  // Case 2: IndexedDB lost it, snapshot has it -> use snapshot
  if (!project.selectedFamilyId && snapshot.selectedFamilyId) {
    return { ...project, selectedFamilyId: snapshot.selectedFamilyId };
  }

  // Case 3: Both exist, values differ -> prefer newer updatedAt
  // project.updatedAt is always set by saveProject (projectStore.ts:212)
  const idbTime = new Date(project.updatedAt).getTime();
  const snapTime = new Date(snapshot.updatedAt).getTime();

  if (Number.isNaN(idbTime) || Number.isNaN(snapTime)) {
    // Unparseable timestamp: prefer snapshot (it was written more recently in the session)
    return { ...project, selectedFamilyId: snapshot.selectedFamilyId };
  }

  if (snapTime > idbTime) {
    return { ...project, selectedFamilyId: snapshot.selectedFamilyId };
  }

  // IndexedDB is same age or newer -> keep IndexedDB
  return project;
}
