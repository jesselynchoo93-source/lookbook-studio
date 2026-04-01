/**
 * V4.1 + V4.2: IndexedDB persistence via Dexie.js.
 *
 * Three object stores:
 *   - projects: ProjectRecord (indexed by id, updatedAt, status)
 *   - referenceBlobs: ReferenceBlobRecord (indexed by id, projectId)
 *   - generatedBlobs: GeneratedBlobRecord (indexed by id, projectId)
 *
 * Save strategy:
 *   - Blob writes (references + generated images): IMMEDIATE
 *   - Project-state writes (input, plan, tracker, metadata): DEBOUNCED (500ms)
 *
 * Status is always recomputed on save, never trusted from storage.
 */

import Dexie, { type EntityTable } from "dexie";
import type {
  LookbookInput,
  LookbookPlanResult,
  TrackerState,
  ProjectRecord,
  ProjectStatus,
  StudioEngine,
  ReferenceBlobRecord,
  PersistedReferenceAsset,
  ReferenceAsset,
  ShotStatus,
  GeneratedBlobRecord,
  PersistedGeneratedImage,
  GeneratedImageAsset,
} from "./types";
import { PROJECT_SCHEMA_VERSION } from "./types";

// ── Database ──

/** Vision API cache entry. Keyed by SHA-256 hash + endpoint. */
export interface VisionCacheEntry {
  /** Composite key: `${hash}:${endpoint}` */
  id: string;
  hash: string;
  endpoint: string;
  result: unknown;
  cachedAt: string;
}

const VISION_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const db = new Dexie("LookbookStudio") as Dexie & {
  projects: EntityTable<ProjectRecord, "id">;
  referenceBlobs: EntityTable<ReferenceBlobRecord, "id">;
  generatedBlobs: EntityTable<GeneratedBlobRecord, "id">;
  visionCache: EntityTable<VisionCacheEntry, "id">;
};

db.version(1).stores({
  projects: "id, updatedAt, status",
  referenceBlobs: "id, projectId",
});

db.version(2).stores({
  projects: "id, updatedAt, status",
  referenceBlobs: "id, projectId",
  generatedBlobs: "id, projectId",
});

db.version(3).stores({
  projects: "id, updatedAt, status",
  referenceBlobs: "id, projectId",
  generatedBlobs: "id, projectId",
  visionCache: "id, hash, endpoint",
});

// ── Vision Cache Helpers ──

export async function getVisionCache(hash: string, endpoint: string): Promise<unknown | null> {
  const key = `${hash}:${endpoint}`;
  const entry = await db.visionCache.get(key);
  if (!entry) return null;
  // Check expiry
  const age = Date.now() - new Date(entry.cachedAt).getTime();
  if (age > VISION_CACHE_MAX_AGE_MS) {
    await db.visionCache.delete(key);
    return null;
  }
  return entry.result;
}

export async function setVisionCache(hash: string, endpoint: string, result: unknown): Promise<void> {
  const key = `${hash}:${endpoint}`;
  await db.visionCache.put({
    id: key,
    hash,
    endpoint,
    result,
    cachedAt: new Date().toISOString(),
  });
}

export { db };

// ── Shared hash utility ──

export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const arr = new Uint8Array(hash);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Status computation ──

/**
 * Derive ProjectStatus from plan + tracker state.
 * Called on every save; the result is a cached convenience field, never authoritative.
 *
 * Derivation rules (evaluated top-to-bottom, first match wins):
 *
 *   "draft"       — project has no plan (plan is null).
 *                   The user created a project but hasn't submitted the form yet.
 *
 *   "planned"     — project has a plan but either no tracker, no shots in the
 *                   tracker, or every shot is still "pending".
 *                   The plan was generated but no generation work has started.
 *
 *   "complete"    — every shot in the tracker has status "done".
 *                   All shots have passed generation, continuity review,
 *                   and skin polish.
 *
 *   "in_progress" — at least one shot has moved past "pending" (generating,
 *                   accepted, needs_retry, enhancing, or done) but not all
 *                   shots are "done" yet.
 */
export function computeProjectStatus(record: {
  plan: LookbookPlanResult | null;
  tracker: TrackerState | null;
}): ProjectStatus {
  if (!record.plan) return "draft";
  if (!record.tracker) return "planned";

  const shots = Object.values(record.tracker.shots) as ShotStatus[];
  if (shots.length === 0) return "planned";

  const allDone = shots.every((s) => s.status === "done");
  if (allDone) return "complete";

  const anyActivity = shots.some((s) => s.status !== "pending");
  if (anyActivity) return "in_progress";

  return "planned";
}

// ── Project name generation ──

const FAMILY_LABELS: Record<string, string> = {
  apparel: "Apparel",
  footwear: "Footwear",
  bags: "Bags",
  jewelry: "Jewelry",
  eyewear: "Eyewear",
  watches: "Watches",
  headwear: "Headwear",
  belts: "Belts",
  scarves: "Scarves",
  small_accessories: "Accessories",
  full_look: "Full Look",
};

export function generateProjectName(input: LookbookInput): string {
  const family = FAMILY_LABELS[input.productFamily] || input.productFamily;
  const item = input.specificItem?.trim();
  const base = item ? `${item} ${family}` : family;
  const date = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
  return `${base} — ${date}`;
}

// ── CRUD: Projects ──

export async function createProject(
  input: LookbookInput,
  engine: StudioEngine = "editorial",
): Promise<ProjectRecord> {
  const now = new Date().toISOString();
  const record: ProjectRecord = {
    id: crypto.randomUUID(),
    schemaVersion: PROJECT_SCHEMA_VERSION,
    name: generateProjectName(input),
    nameEdited: false,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    engine,
    input,
    references: { model: [], product: [], styling: [] },
    plan: null,
    tracker: null,
    generatedImages: {},
  };
  await db.projects.add(record);
  return record;
}

export async function saveProject(record: ProjectRecord): Promise<ProjectRecord> {
  const status = computeProjectStatus(record);
  const updated: ProjectRecord = {
    ...record,
    status,
    updatedAt: new Date().toISOString(),
  };
  await db.projects.put(updated);
  return updated;
}

export async function loadProject(id: string): Promise<ProjectRecord | null> {
  const record = await db.projects.get(id);
  if (!record) return null;
  // Backfill generatedImages for projects created before V4.2
  if (!record.generatedImages) {
    record.generatedImages = {};
  }
  // Backfill engine for projects created before V4 (commerce engine)
  if (!record.engine) {
    record.engine = "editorial";
  }
  return record;
}

export async function listProjects(): Promise<ProjectRecord[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function deleteProject(id: string): Promise<void> {
  // Delete all blobs (references + generated), then the project record
  await db.referenceBlobs.where("projectId").equals(id).delete();
  await db.generatedBlobs.where("projectId").equals(id).delete();
  await db.projects.delete(id);
}

export async function renameProject(id: string, name: string): Promise<void> {
  await db.projects.update(id, {
    name,
    nameEdited: true,
    updatedAt: new Date().toISOString(),
  });
}

// ── CRUD: Reference Blobs ──

export async function addReferenceBlob(
  projectId: string,
  assetId: string,
  blob: Blob,
): Promise<void> {
  await db.referenceBlobs.put({ id: assetId, projectId, blob });
}

export async function removeReferenceBlob(assetId: string): Promise<void> {
  await db.referenceBlobs.delete(assetId);
}

export async function loadProjectBlobs(
  projectId: string,
): Promise<ReferenceBlobRecord[]> {
  return db.referenceBlobs.where("projectId").equals(projectId).toArray();
}

/**
 * Restore session-only ReferenceAsset[] (with previewUrl) from
 * persisted metadata + blobs. Creates Object URLs for each blob.
 *
 * Any metadata entry without a matching blob is silently dropped
 * (blob-first consistency: if the blob didn't persist, the asset is gone).
 */
export function restoreReferencesFromBlobs(
  persisted: {
    model: PersistedReferenceAsset[];
    product: PersistedReferenceAsset[];
    styling: PersistedReferenceAsset[];
  },
  blobs: ReferenceBlobRecord[],
): { model: ReferenceAsset[]; product: ReferenceAsset[]; styling: ReferenceAsset[] } {
  const blobMap = new Map(blobs.map((b) => [b.id, b.blob]));

  function restore(assets: PersistedReferenceAsset[]): ReferenceAsset[] {
    return assets
      .filter((a) => blobMap.has(a.id))
      .map((a) => ({
        ...a,
        previewUrl: URL.createObjectURL(blobMap.get(a.id)!),
      }));
  }

  return {
    model: restore(persisted.model),
    product: restore(persisted.product),
    styling: restore(persisted.styling),
  };
}

/**
 * Remove orphan blobs: blobs in the DB whose ID doesn't match
 * any current reference metadata entry for this project.
 */
export async function cleanupOrphanBlobs(
  projectId: string,
  validAssetIds: Set<string>,
): Promise<number> {
  const allBlobs = await loadProjectBlobs(projectId);
  const orphans = allBlobs.filter((b) => !validAssetIds.has(b.id));
  if (orphans.length > 0) {
    await db.referenceBlobs.bulkDelete(orphans.map((b) => b.id));
  }
  return orphans.length;
}

// ── Commerce Run Config Hash ──

/**
 * Compute a deterministic hash from all inputs that define a commerce generation run.
 * If any of these change, existing results are invalidated (aggressive kill rule).
 */
export function computeRunConfigHash(config: {
  familyId: string;
  familyRefImageIds: string[];
  fingerprint: Record<string, unknown>;
  swapMode: string;
  productRefIds: string[];
  modelRefIds: string[];
}): string {
  const payload = JSON.stringify({
    f: config.familyId,
    fr: [...config.familyRefImageIds].sort(),
    fp: config.fingerprint,
    sw: config.swapMode,
    p: [...config.productRefIds].sort(),
    m: [...config.modelRefIds].sort(),
  });
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

// ── CRUD: Generated Image Blobs ──

/**
 * Build the deterministic blob key for a shot's generated image.
 * Commerce engine: includes familyId + runId for run isolation.
 * Editorial engine: falls back to position-only key.
 */
export function generatedBlobKey(
  projectId: string,
  shotPosition: number,
  familyId?: string,
  runId?: string,
): string {
  if (familyId && runId) {
    return `${projectId}_${familyId}_${runId}_shot_${shotPosition}`;
  }
  return `${projectId}_shot_${shotPosition}`;
}

/** Write (or overwrite) the generated image blob for a shot position. */
export async function addGeneratedBlob(
  projectId: string,
  shotPosition: number,
  blob: Blob,
  familyId?: string,
  runId?: string,
): Promise<void> {
  const id = generatedBlobKey(projectId, shotPosition, familyId, runId);
  await db.generatedBlobs.put({ id, projectId, blob });
}

/** Delete the generated image blob for a shot position. */
export async function removeGeneratedBlob(
  projectId: string,
  shotPosition: number,
  familyId?: string,
  runId?: string,
): Promise<void> {
  const id = generatedBlobKey(projectId, shotPosition, familyId, runId);
  await db.generatedBlobs.delete(id);
}

/** Delete all generated image blobs for a project. */
export async function clearGeneratedBlobsForProject(projectId: string): Promise<void> {
  await db.generatedBlobs.where("projectId").equals(projectId).delete();
}

/** Load all generated image blobs for a project. */
export async function loadGeneratedBlobs(
  projectId: string,
): Promise<GeneratedBlobRecord[]> {
  return db.generatedBlobs.where("projectId").equals(projectId).toArray();
}

/**
 * Restore session-only GeneratedImageAsset map from persisted metadata + blobs.
 * Creates Object URLs for each blob. Metadata entries without matching blobs are dropped.
 *
 * For commerce engine: validates that persisted metadata matches the current run identity.
 * Non-matching entries are silently dropped (aggressive kill rule).
 */
export function restoreGeneratedImages(
  persisted: Record<number, PersistedGeneratedImage>,
  blobs: GeneratedBlobRecord[],
  projectId: string,
  runMeta?: { familyId: string; runId: string; configHash: string },
): Record<number, GeneratedImageAsset> {
  const blobMap = new Map(blobs.map((b) => [b.id, b.blob]));
  const result: Record<number, GeneratedImageAsset> = {};

  for (const [posStr, meta] of Object.entries(persisted)) {
    const pos = Number(posStr);

    // Commerce run isolation: validate metadata matches current run
    if (runMeta) {
      if (
        meta.familyId !== runMeta.familyId ||
        meta.runId !== runMeta.runId ||
        meta.configHash !== runMeta.configHash
      ) {
        continue; // Stale result from a different run, skip
      }
    }

    const key = generatedBlobKey(projectId, pos, runMeta?.familyId, runMeta?.runId);
    const blob = blobMap.get(key);
    if (blob) {
      result[pos] = {
        ...meta,
        previewUrl: URL.createObjectURL(blob),
      };
    }
  }

  return result;
}

// ── Shot reset on image replacement ──

/**
 * Reset downstream review state when a shot's generated image is replaced.
 *
 * Reset rules:
 *   - continuity → "unreviewed" (old verdict was about a different image)
 *   - continuityConcerns → [] (concerns were about the old image)
 *   - skinPolish → "not_applicable" (polish work on the old image is invalidated)
 *   - status: if "enhancing" or "done", step back to "generating"
 *             (new image needs fresh review; should not remain marked approved)
 *             all other statuses are left unchanged
 *   - retryCount / retryReasons: left unchanged (track generation history, not current image)
 *
 * Only called when replacing an EXISTING image. First upload for a shot
 * does not trigger any reset.
 */
export function resetShotForNewImage(tracker: TrackerState, position: number): TrackerState {
  const current = tracker.shots[position];
  if (!current) return tracker;

  const updated: ShotStatus = {
    ...current,
    continuity: "unreviewed",
    continuityConcerns: [],
    skinPolish: "not_applicable",
    status: current.status === "enhancing" || current.status === "done"
      ? "generating"  // new image needs fresh review, not pre-approved
      : current.status,
    lastUpdated: new Date().toISOString(),
  };

  return {
    ...tracker,
    shots: { ...tracker.shots, [position]: updated },
  };
}

// ── Helpers: convert between session and persisted reference formats ──

export function toPersistedAsset(asset: ReferenceAsset): PersistedReferenceAsset {
  const { previewUrl: _, ...rest } = asset;
  return rest;
}

export function toPersistedReferences(refs: {
  model: ReferenceAsset[];
  product: ReferenceAsset[];
  styling: ReferenceAsset[];
}): {
  model: PersistedReferenceAsset[];
  product: PersistedReferenceAsset[];
  styling: PersistedReferenceAsset[];
} {
  return {
    model: refs.model.map(toPersistedAsset),
    product: refs.product.map(toPersistedAsset),
    styling: refs.styling.map(toPersistedAsset),
  };
}

export function toPersistedGeneratedImages(
  images: Record<number, GeneratedImageAsset>,
): Record<number, PersistedGeneratedImage> {
  const result: Record<number, PersistedGeneratedImage> = {};
  for (const [posStr, asset] of Object.entries(images)) {
    const { previewUrl: _, ...rest } = asset;
    result[Number(posStr)] = rest;
  }
  return result;
}

// ── Debounced save ──

const SAVE_DEBOUNCE_MS = 500;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Schedule a debounced project save. Each call resets the timer.
 * Scoped per project ID to prevent cross-project race conditions.
 */
export function debouncedSave(record: ProjectRecord): Promise<void> {
  const existing = saveTimers.get(record.id);
  if (existing) clearTimeout(existing);
  return new Promise((resolve, reject) => {
    saveTimers.set(record.id, setTimeout(() => {
      saveTimers.delete(record.id);
      saveProject(record).then(() => resolve()).catch(reject);
    }, SAVE_DEBOUNCE_MS));
  });
}

/** Flush any pending debounced save immediately. */
export async function flushPendingSave(record: ProjectRecord): Promise<void> {
  const existing = saveTimers.get(record.id);
  if (existing) {
    clearTimeout(existing);
    saveTimers.delete(record.id);
  }
  await saveProject(record);
}
