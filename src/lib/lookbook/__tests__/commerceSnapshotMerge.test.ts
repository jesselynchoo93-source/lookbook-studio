/**
 * Regression tests for mergeCommerceSnapshot.
 *
 * Verifies the pure merge helper's precedence rules:
 * 1. IndexedDB has selectedFamilyId, snapshot doesn't or matches -> no merge
 * 2. IndexedDB lost it, snapshot has it -> use snapshot
 * 3. Both exist, differ -> prefer newer updatedAt
 */

import { describe, it, expect } from "vitest";
import { mergeCommerceSnapshot } from "../commerceSnapshotMerge";
import type { ProjectRecord } from "../types";
import type { CommerceSnapshot } from "../commerceSnapshot";

function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: "proj-1",
    schemaVersion: 1,
    name: "Test Project",
    nameEdited: false,
    createdAt: "2026-03-30T08:00:00Z",
    updatedAt: "2026-03-30T09:00:00Z",
    status: "draft",
    engine: "commerce",
    input: {} as ProjectRecord["input"],
    references: { model: [], product: [], styling: [] },
    generatedImages: {},
    ...overrides,
  } as ProjectRecord;
}

function makeSnapshot(overrides: Partial<CommerceSnapshot> = {}): CommerceSnapshot {
  return {
    engine: "commerce",
    restoreStep: "family",
    updatedAt: "2026-03-30T10:00:00Z",
    ...overrides,
  };
}

describe("mergeCommerceSnapshot", () => {
  it("snapshot restores selectedFamilyId when IndexedDB is stale", () => {
    const project = makeProject({ selectedFamilyId: undefined });
    const snapshot = makeSnapshot({ selectedFamilyId: "family-abc" });

    const result = mergeCommerceSnapshot(project, snapshot);

    expect(result.selectedFamilyId).toBe("family-abc");
    expect(result).not.toBe(project); // new object returned
  });

  it("no merge when IndexedDB has selectedFamilyId and snapshot doesn't", () => {
    const project = makeProject({ selectedFamilyId: "family-xyz" });
    const snapshot = makeSnapshot({ selectedFamilyId: undefined });

    const result = mergeCommerceSnapshot(project, snapshot);

    expect(result).toBe(project); // same reference, no merge
    expect(result.selectedFamilyId).toBe("family-xyz");
  });

  it("no merge when both have the same selectedFamilyId", () => {
    const project = makeProject({ selectedFamilyId: "family-abc" });
    const snapshot = makeSnapshot({ selectedFamilyId: "family-abc" });

    const result = mergeCommerceSnapshot(project, snapshot);

    expect(result).toBe(project); // same reference
  });

  it("IndexedDB wins when both have selectedFamilyId and IndexedDB is newer", () => {
    const project = makeProject({
      selectedFamilyId: "family-xyz",
      updatedAt: "2026-03-31T10:00:00Z",
    });
    const snapshot = makeSnapshot({
      selectedFamilyId: "family-abc",
      updatedAt: "2026-03-31T09:00:00Z",
    });

    const result = mergeCommerceSnapshot(project, snapshot);

    expect(result.selectedFamilyId).toBe("family-xyz");
    expect(result).toBe(project); // IndexedDB wins, same reference
  });

  it("snapshot wins when both have selectedFamilyId and snapshot is newer", () => {
    const project = makeProject({
      selectedFamilyId: "family-xyz",
      updatedAt: "2026-03-31T09:00:00Z",
    });
    const snapshot = makeSnapshot({
      selectedFamilyId: "family-abc",
      updatedAt: "2026-03-31T10:00:00Z",
    });

    const result = mergeCommerceSnapshot(project, snapshot);

    expect(result.selectedFamilyId).toBe("family-abc");
    expect(result).not.toBe(project); // new object
  });

  it("snapshot wins when IndexedDB updatedAt is unparseable", () => {
    const project = makeProject({
      selectedFamilyId: "family-xyz",
      updatedAt: "not-a-date",
    });
    const snapshot = makeSnapshot({
      selectedFamilyId: "family-abc",
      updatedAt: "2026-03-31T10:00:00Z",
    });

    const result = mergeCommerceSnapshot(project, snapshot);

    expect(result.selectedFamilyId).toBe("family-abc");
  });

  it("snapshot wins when snapshot updatedAt is unparseable", () => {
    const project = makeProject({
      selectedFamilyId: "family-xyz",
      updatedAt: "2026-03-31T10:00:00Z",
    });
    const snapshot = makeSnapshot({
      selectedFamilyId: "family-abc",
      updatedAt: "garbage",
    });

    const result = mergeCommerceSnapshot(project, snapshot);

    expect(result.selectedFamilyId).toBe("family-abc");
  });

  it("reopen merge produces correct selectedFamilyId for mode derivation inputs", () => {
    // Simulates: IndexedDB lost selectedFamilyId (async race), snapshot has it
    const project = makeProject({
      selectedFamilyId: undefined,
      // No commercePlan -> derived mode would be "setup"
    });
    const snapshot = makeSnapshot({
      selectedFamilyId: "family-abc",
      restoreStep: "family",
    });

    const result = mergeCommerceSnapshot(project, snapshot);

    expect(result.selectedFamilyId).toBe("family-abc");
    // No commercePlan + no restoredGen -> derived mode is "setup"
    // CommerceSetupMode receives initialSelectedFamilyId: "family-abc"
    expect(result.commercePlan).toBeUndefined();
  });

  it("IndexedDB wins when both timestamps are identical", () => {
    const ts = "2026-03-31T10:00:00Z";
    const project = makeProject({
      selectedFamilyId: "family-xyz",
      updatedAt: ts,
    });
    const snapshot = makeSnapshot({
      selectedFamilyId: "family-abc",
      updatedAt: ts,
    });

    const result = mergeCommerceSnapshot(project, snapshot);

    // "same age or newer" -> keep IndexedDB
    expect(result.selectedFamilyId).toBe("family-xyz");
    expect(result).toBe(project);
  });
});
