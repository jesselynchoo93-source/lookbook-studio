"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  LookbookInput,
  LookbookPlanResult,
  GenerationStatus,
  RetryReason,
  TrackerState,
  ContinuityVerdict,
  ContinuityConcern,
  SkinPolishStatus,
  FinalMark,
  ReferenceAsset,
  ReferenceType,
  ProjectRecord,
  GeneratedImageAsset,
  FingerprintMeta,
  StudioEngine,
} from "@/lib/lookbook/types";
import { generateLookbookPlan } from "@/lib/lookbook/recommendShots";
import {
  createTracker,
  updateShotStatus,
  updateShotContinuity,
  updateShotSkinPolish,
  updateShotFinalMark,
} from "@/lib/lookbook/trackerStore";
import {
  createProject,
  loadProject,
  listProjects,
  deleteProject as deleteProjectFromDB,
  saveProject,
  debouncedSave,
  flushPendingSave,
  addReferenceBlob,
  removeReferenceBlob,
  loadProjectBlobs,
  restoreReferencesFromBlobs,
  toPersistedReferences,
  toPersistedGeneratedImages,
  generateProjectName,
  cleanupOrphanBlobs,
  addGeneratedBlob,
  removeGeneratedBlob,
  loadGeneratedBlobs,
  restoreGeneratedImages,
  resetShotForNewImage,
  computeRunConfigHash,
  clearGeneratedBlobsForProject,
} from "@/lib/lookbook/projectStore";
import ModeNavigator from "./ModeNavigator";
import type { WorkflowMode } from "./ModeNavigator";
import SetupMode from "./modes/SetupMode";
import PlanMode from "./modes/PlanMode";
import GenerateMode from "./modes/GenerateMode";
import FinaliseMode from "./modes/FinaliseMode";
import CommerceSetupMode from "./modes/CommerceSetupMode";
// CommercePlanMode deleted: commerce flow goes directly from setup to generate
import CommerceGenerateMode from "./modes/CommerceGenerateMode";
import EngineSelector from "./EngineSelector";
import ProjectListPanel from "./ProjectListPanel";
import type { TemplateFamilyDefinition, CommerceGenerationPlan } from "@/lib/commerce/referenceLibrary.types";
import { loadCatalog } from "@/lib/commerce/catalogLoader";
import { compileCommercePlan } from "@/lib/commerce/commercePromptCompiler";
import { writeCommerceSnapshot, readCommerceSnapshot, clearCommerceSnapshot } from "@/lib/lookbook/commerceSnapshot";
import { mergeCommerceSnapshot } from "@/lib/lookbook/commerceSnapshotMerge";

type View = "list" | "project";

const DEFAULT_INPUT: LookbookInput = {
  productFamily: "apparel",
  specificItem: "",
  genderPresentation: "menswear",
  targetStyle: "commercial",
  primaryObjective: "sell_clearly",
  brandVisibility: "medium",
  poseDirection: "balanced",
  shotCount: 6,
  notes: "",
};

export default function StudioShell() {
  // ── View and project list ──
  const [view, setView] = useState<View>("list");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Active project state ──
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [references, setReferences] = useState<{
    model: ReferenceAsset[];
    product: ReferenceAsset[];
    styling: ReferenceAsset[];
  }>({ model: [], product: [], styling: [] });

  // V4.2: Session-only generated image state (with preview URLs)
  const [generatedImages, setGeneratedImages] = useState<Record<number, GeneratedImageAsset>>({});

  // F3: Workflow mode state
  const [mode, setMode] = useState<WorkflowMode>("setup");

  // ── Commerce template families (loaded from public JSON) ──
  const [commerceFamilies, setCommerceFamilies] = useState<TemplateFamilyDefinition[]>([]);

  useEffect(() => {
    fetch("/commerce-refs/families.json")
      .then((r) => r.json())
      .then((data) => setCommerceFamilies(data))
      .catch(() => setCommerceFamilies([]));
  }, []);

  // ── Refs (must be declared before any callbacks that read them) ──
  const referencesRef = useRef(references);
  referencesRef.current = references;

  const generatedImagesRef = useRef(generatedImages);
  generatedImagesRef.current = generatedImages;

  const activeProjectRef = useRef(activeProject);
  activeProjectRef.current = activeProject;

  // ── Commerce plan + run isolation state ──
  const [commercePlan, setCommercePlan] = useState<CommerceGenerationPlan | null>(null);
  const [commerceRunId, setCommerceRunId] = useState<string>("");
  const [commerceConfigHash, setCommerceConfigHash] = useState<string>("");
  const commercePlanRef = useRef(commercePlan);
  commercePlanRef.current = commercePlan;

  // ── Commerce: single authoritative flush helper ──
  // All commerce state saves go through this. No other code calls saveProject() for commerce state.
  const flushCommerceState = useCallback((overrides?: Partial<ProjectRecord>) => {
    const project = activeProjectRef.current;
    if (!project || project.engine !== "commerce") return;
    const record: ProjectRecord = {
      ...project,
      ...overrides,
      commercePlan: overrides?.commercePlan ?? commercePlanRef.current ?? project.commercePlan,
      commerceRunMeta: overrides?.commerceRunMeta ?? project.commerceRunMeta,
      references: toPersistedReferences(referencesRef.current),
      generatedImages: toPersistedGeneratedImages(generatedImagesRef.current),
    };
    saveProject(record);

    // Synchronous snapshot: only selectedFamilyId is load-bearing.
    // restoreStep is for debugging only.
    const hasPlan = !!(record.commercePlan || overrides?.commercePlan);
    writeCommerceSnapshot(project.id, {
      engine: "commerce",
      selectedFamilyId: record.selectedFamilyId,
      restoreStep: hasPlan ? "generate" : (record.selectedFamilyId ? "family" : "setup"),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  // Persist family selection immediately so refresh-before-generate restores correctly.
  // Fires on every reselection, overwriting the previous choice.
  const handleCommerceFamilySelect = useCallback((familyId: string) => {
    setActiveProject((prev) => prev ? { ...prev, selectedFamilyId: familyId } : prev);
    flushCommerceState({ selectedFamilyId: familyId });
  }, [flushCommerceState]);

  const handleCommerceFingerprint = useCallback((
    fp: import("@/lib/lookbook/types").ProductFingerprint,
    meta: FingerprintMeta,
  ) => {
    if (!activeProject) return;
    setActiveProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        input: { ...prev.input, productFingerprint: fp },
        fingerprintMeta: meta,
      };
    });
    debouncedSave({
      ...activeProject,
      input: { ...activeProject.input, productFingerprint: fp },
      fingerprintMeta: meta,
    });
  }, [activeProject]);

  const handleCommerceBuildPlan = useCallback(async (
    input: LookbookInput,
    family: TemplateFamilyDefinition,
  ) => {
    const fingerprint = activeProject?.input.productFingerprint ?? {
      productFamily: input.productFamily,
      specificItem: input.specificItem || "",
      genderPresentation: input.genderPresentation,
    } as Record<string, unknown>;

    const catalog = await loadCatalog();
    const plan = compileCommercePlan({
      family,
      images: catalog,
      fingerprint,
      hasModelRef: references.model.length > 0,
      hasProductRef: references.product.length > 0,
    });

    // Run isolation: revoke old preview URLs, clear old results, mint new run
    for (const asset of Object.values(generatedImagesRef.current)) {
      URL.revokeObjectURL(asset.previewUrl);
    }
    setGeneratedImages({});

    const newRunId = crypto.randomUUID();
    const newConfigHash = computeRunConfigHash({
      familyId: family.id,
      familyRefImageIds: family.shots.map((s) => s.referenceImageId),
      fingerprint: fingerprint as Record<string, unknown>,
      swapMode: plan.defaultSwapMode,
      productRefIds: references.product.map((r) => r.id),
      modelRefIds: references.model.map((r) => r.id),
    });

    setCommerceRunId(newRunId);
    setCommerceConfigHash(newConfigHash);
    setCommercePlan(plan);

    // Persist run metadata + plan to project via single authoritative helper
    if (activeProject) {
      const runMeta = { runId: newRunId, familyId: family.id, configHash: newConfigHash };
      setActiveProject((prev) => prev ? {
        ...prev,
        commerceRunMeta: runMeta,
        commercePlan: plan,
        selectedFamilyId: family.id,
      } : prev);
      // Flush immediately (plan creation is a critical transition)
      flushCommerceState({
        commerceRunMeta: runMeta,
        commercePlan: plan,
        selectedFamilyId: family.id,
      });
    }

    // Clear old blobs in IndexedDB (fire-and-forget)
    if (activeProject) {
      clearGeneratedBlobsForProject(activeProject.id).catch(() => {});
    }

    setMode("generate");
  }, [activeProject, references, flushCommerceState]);

  // ── Commerce: generated image callback ──

  const handleCommerceImageGenerated = useCallback((
    shotPosition: number,
    blob: Blob,
    mimeType: string,
    referenceImageId?: string,
  ) => {
    if (!activeProject) return;
    const previewUrl = URL.createObjectURL(blob);
    const familyId = commercePlan?.templateFamily.id;
    setGeneratedImages((prev) => ({
      ...prev,
      [shotPosition]: {
        shotPosition,
        fileName: `shot-${shotPosition}.jpg`,
        mimeType,
        sizeBytes: blob.size,
        addedAt: new Date().toISOString(),
        previewUrl,
        familyId,
        runId: commerceRunId,
        referenceImageId,
        configHash: commerceConfigHash,
      },
    }));
  }, [activeProject, commercePlan, commerceRunId, commerceConfigHash]);

  // ── Transient error state for blob persistence failures ──
  const [blobError, setBlobError] = useState<string | null>(null);
  const blobErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBlobError = useCallback((message: string) => {
    setBlobError(message);
    if (blobErrorTimer.current) clearTimeout(blobErrorTimer.current);
    blobErrorTimer.current = setTimeout(() => setBlobError(null), 5000);
  }, []);

  // Derived from active project
  const result = activeProject?.plan ?? null;
  const tracker = activeProject?.tracker ?? null;

  // ── Load project list on mount + auto-restore last active project ──
  const didAutoRestore = useRef(false);
  useEffect(() => {
    // TEMPORARY QA INSTRUMENTATION — remove before merge (or gate behind LOOKBOOK_DEBUG_BOOT_RESTORE)
    const debugBoot = typeof window !== "undefined" && localStorage.getItem("LOOKBOOK_DEBUG_BOOT_RESTORE");
    if (debugBoot) console.log("[boot] mount, reading lastActiveProjectId");

    listProjects().then(async (list) => {
      setProjects(list);

      // Auto-restore: only on first mount when no project is already active.
      // Guard: do not clobber intentional navigation (e.g., user closed a project).
      if (!didAutoRestore.current && !activeProjectRef.current) {
        didAutoRestore.current = true;
        const lastId = localStorage.getItem("lookbook_lastActiveProjectId");
        if (debugBoot) console.log("[boot] lastActiveProjectId:", lastId);
        if (lastId) {
          const exists = list.some((p) => p.id === lastId);
          if (debugBoot) console.log("[boot] project exists in list:", exists);
          if (exists) {
            // handleOpenProject will set view, mode, and restore all sub-state
            await handleOpenProject(lastId);
            if (debugBoot) console.log("[boot] handleOpenProject completed, view should be 'project'");
            setLoading(false);
            return;
          } else {
            // Stale pointer: project was deleted externally
            localStorage.removeItem("lookbook_lastActiveProjectId");
          }
        }
      }

      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Best-effort flush on page unload. The synchronous localStorage write inside
  // flushCommerceState guarantees the snapshot survives; the IndexedDB write
  // is best-effort (may or may not complete before the page tears down).
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeProjectRef.current?.engine === "commerce") {
        flushCommerceState();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushCommerceState]);

  const refreshProjects = useCallback(async () => {
    const list = await listProjects();
    setProjects(list);
  }, []);

  // ── Object URL cleanup ──
  const revokeAllPreviewUrls = useCallback(() => {
    for (const type of ["model", "product", "styling"] as const) {
      for (const asset of referencesRef.current[type]) {
        URL.revokeObjectURL(asset.previewUrl);
      }
    }
    for (const asset of Object.values(generatedImagesRef.current)) {
      URL.revokeObjectURL(asset.previewUrl);
    }
  }, []);

  useEffect(() => {
    return () => revokeAllPreviewUrls();
  }, [revokeAllPreviewUrls]);

  // ── Commerce: flush after each shot generation completes ──
  const prevGenCountRef = useRef(Object.keys(generatedImages).length);
  useEffect(() => {
    if (!activeProject || activeProject.engine !== "commerce") return;
    const newCount = Object.keys(generatedImages).length;
    if (newCount > prevGenCountRef.current) {
      prevGenCountRef.current = newCount;
      flushCommerceState();
    }
  }, [generatedImages, activeProject, flushCommerceState]);

  // ── Auto-save: debounced save when activeProject or references change ──
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!activeProject) {
      isInitialLoad.current = true;
      return;
    }
    // Skip the initial load (project just opened, no user changes yet)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    const record: ProjectRecord = {
      ...activeProject,
      references: toPersistedReferences(references),
      generatedImages: toPersistedGeneratedImages(generatedImages),
    };
    debouncedSave(record);
  }, [activeProject, references, generatedImages]);

  // ── Project lifecycle ──

  // ── Engine selector for new projects ──
  const [showEngineSelector, setShowEngineSelector] = useState(false);

  const handleNewProject = useCallback(() => {
    setShowEngineSelector(true);
    setView("project");
  }, []);

  const handleEngineSelected = useCallback(async (engine: StudioEngine) => {
    const input = engine === "commerce"
      ? { ...DEFAULT_INPUT, genderPresentation: "womenswear" as const }
      : DEFAULT_INPUT;
    const project = await createProject(input, engine);
    setActiveProject(project);
    localStorage.setItem("lookbook_lastActiveProjectId", project.id);
    setReferences({ model: [], product: [], styling: [] });
    setGeneratedImages({});
    setMode("setup");
    setShowEngineSelector(false);
  }, []);

  const handleOpenProject = useCallback(async (id: string) => {
    const project = await loadProject(id);
    if (!project) return;

    // Load reference blobs and restore preview URLs
    const blobs = await loadProjectBlobs(project.id);
    const restored = restoreReferencesFromBlobs(project.references, blobs);

    // Load generated image blobs and restore preview URLs (with run isolation for commerce)
    const genBlobs = await loadGeneratedBlobs(project.id);
    const restoredGen = restoreGeneratedImages(
      project.generatedImages,
      genBlobs,
      project.id,
      project.commerceRunMeta,
    );

    // Cleanup orphan reference blobs
    const validIds = new Set<string>();
    for (const type of ["model", "product", "styling"] as const) {
      for (const asset of project.references[type]) {
        validIds.add(asset.id);
      }
    }
    await cleanupOrphanBlobs(project.id, validIds);

    // ── Snapshot merge via pure helper ──
    let effectiveProject = project;
    if (project.engine === "commerce") {
      const snapshot = readCommerceSnapshot(project.id);
      if (snapshot) {
        const merged = mergeCommerceSnapshot(project, snapshot);
        if (merged !== project) {
          effectiveProject = merged;
          // Persist merge back to IndexedDB so future loads don't need snapshot
          saveProject(effectiveProject);
        }
      }
    }

    setActiveProject(effectiveProject);
    setReferences(restored);
    setGeneratedImages(restoredGen);

    // Persist last active project ID (pointer only, no commerce state in localStorage)
    localStorage.setItem("lookbook_lastActiveProjectId", effectiveProject.id);

    // Restore commerce session state if present
    if (effectiveProject.commerceRunMeta) {
      setCommerceRunId(effectiveProject.commerceRunMeta.runId);
      setCommerceConfigHash(effectiveProject.commerceRunMeta.configHash);
    }
    if (effectiveProject.commercePlan) {
      setCommercePlan(effectiveProject.commercePlan);
    }

    // Commerce-aware mode derivation (uses effectiveProject which may have merged snapshot)
    if (effectiveProject.engine === "commerce") {
      if (effectiveProject.commercePlan && Object.keys(restoredGen).length > 0) {
        // Has plan + generated images: resume generation
        setMode("generate");
      } else if (effectiveProject.commercePlan) {
        // Has plan, no images yet: start generation
        setMode("generate");
      } else {
        // No plan: go to setup. If selectedFamilyId exists, CommerceSetupMode
        // will receive it as initialSelectedFamilyId and skip to the family step.
        setMode("setup");
      }
    } else {
      // Editorial engine mode derivation (unchanged)
      if (!project.plan) {
        setMode("setup");
      } else if (!project.tracker) {
        setMode("plan");
      } else {
        const shots = Object.values(project.tracker.shots);
        if (shots.every((s) => s.status === "pending")) {
          setMode("plan");
        } else if (shots.every((s) => s.status === "done")) {
          setMode("finalise");
        } else {
          setMode("generate");
        }
      }
    }

    setView("project");
  }, []);

  const handleCloseProject = useCallback(async () => {
    // Flush commerce state immediately before generic flush
    if (activeProjectRef.current?.engine === "commerce") {
      flushCommerceState();
    }

    // Flush any pending debounced save with the latest state
    if (activeProjectRef.current) {
      const record: ProjectRecord = {
        ...activeProjectRef.current,
        commercePlan: commercePlanRef.current ?? activeProjectRef.current.commercePlan,
        references: toPersistedReferences(referencesRef.current),
        generatedImages: toPersistedGeneratedImages(generatedImagesRef.current),
      };
      await flushPendingSave(record);
    }

    // Clear snapshot before nulling state (snapshot only survives involuntary refresh)
    if (activeProjectRef.current) {
      clearCommerceSnapshot(activeProjectRef.current.id);
    }

    revokeAllPreviewUrls();
    setActiveProject(null);
    setReferences({ model: [], product: [], styling: [] });
    setGeneratedImages({});
    setCommercePlan(null);
    setCommerceRunId("");
    setCommerceConfigHash("");
    localStorage.removeItem("lookbook_lastActiveProjectId");
    await refreshProjects();
    setView("list");
  }, [revokeAllPreviewUrls, refreshProjects, flushCommerceState]);

  const handleDeleteProject = useCallback(async (id: string) => {
    // Clear localStorage pointer if deleting the last-active project
    const lastId = localStorage.getItem("lookbook_lastActiveProjectId");
    if (lastId === id) {
      localStorage.removeItem("lookbook_lastActiveProjectId");
    }
    clearCommerceSnapshot(id);
    await deleteProjectFromDB(id);
    await refreshProjects();
  }, [refreshProjects]);

  // ── Fingerprint meta update (vision extraction) ──

  const handleFingerprintMetaChange = useCallback((meta: FingerprintMeta) => {
    const project = activeProjectRef.current;
    if (!project) return;
    const updated: ProjectRecord = { ...project, fingerprintMeta: meta };
    setActiveProject(updated);
    debouncedSave({
      ...updated,
      references: toPersistedReferences(referencesRef.current),
      generatedImages: toPersistedGeneratedImages(generatedImagesRef.current),
    });
  }, []);

  // ── Plan generation ──

  const handleSubmit = useCallback((input: LookbookInput) => {
    const project = activeProjectRef.current;
    if (!project) return;

    const plan = generateLookbookPlan(input);
    const positions = plan.shots.map((s) => s.position);
    const planKey = `project_${project.id}`;
    const fresh = createTracker(planKey, positions);

    // Update name from input if the user hasn't manually edited it
    const name = project.nameEdited
      ? project.name
      : generateProjectName(input);

    const updated: ProjectRecord = {
      ...project,
      input,
      plan,
      tracker: fresh,
      name,
      references: toPersistedReferences(referencesRef.current),
      generatedImages: toPersistedGeneratedImages(generatedImagesRef.current),
    };

    setActiveProject(updated);
    setMode("plan");
    // Save immediately; plan generation is a significant event
    saveProject(updated);
  }, []);

  // ── Reset plan ──

  const handleReset = useCallback(() => {
    const project = activeProjectRef.current;
    if (!project) return;

    // Revoke generated image preview URLs before clearing
    for (const asset of Object.values(generatedImagesRef.current)) {
      URL.revokeObjectURL(asset.previewUrl);
    }

    const updated: ProjectRecord = {
      ...project,
      plan: null,
      tracker: null,
      references: toPersistedReferences(referencesRef.current),
      generatedImages: {},
    };
    setActiveProject(updated);
    setGeneratedImages({});
    setMode("setup");
    saveProject(updated);
  }, []);

  // ── Tracker handlers ──

  const handleStatusChange = useCallback(
    (position: number, status: GenerationStatus, retryReason?: RetryReason) => {
      setActiveProject((prev) => {
        if (!prev?.tracker) return prev;
        const updated = updateShotStatus(prev.tracker, position, status, retryReason);
        return { ...prev, tracker: updated };
      });
    },
    [],
  );

  const handleContinuityChange = useCallback(
    (position: number, verdict: ContinuityVerdict, concerns?: ContinuityConcern[]) => {
      setActiveProject((prev) => {
        if (!prev?.tracker) return prev;
        const updated = updateShotContinuity(prev.tracker, position, verdict, concerns);
        return { ...prev, tracker: updated };
      });
    },
    [],
  );

  const handleSkinPolishChange = useCallback(
    (position: number, status: SkinPolishStatus) => {
      setActiveProject((prev) => {
        if (!prev?.tracker) return prev;
        const updated = updateShotSkinPolish(prev.tracker, position, status);
        return { ...prev, tracker: updated };
      });
    },
    [],
  );

  // ── Final mark handler ──

  const handleFinalMarkChange = useCallback(
    (position: number, mark: FinalMark) => {
      setActiveProject((prev) => {
        if (!prev?.tracker) return prev;
        const updated = updateShotFinalMark(prev.tracker, position, mark);
        return { ...prev, tracker: updated };
      });
    },
    [],
  );

  // ── Generated image handlers ──

  const handleUploadImage = useCallback(
    (position: number, file: File) => {
      const projectId = activeProjectRef.current?.id;
      if (!projectId) return;

      const previewUrl = URL.createObjectURL(file);
      const asset: GeneratedImageAsset = {
        shotPosition: position,
        fileName: file.name,
        mimeType: file.type || "image/unknown",
        sizeBytes: file.size,
        addedAt: new Date().toISOString(),
        previewUrl,
      };

      // Check if replacing an existing image
      const existing = generatedImagesRef.current[position];
      if (existing) {
        URL.revokeObjectURL(existing.previewUrl);
        // Reset downstream review state on replacement
        setActiveProject((prev) => {
          if (!prev?.tracker) return prev;
          const resetTracker = resetShotForNewImage(prev.tracker, position);
          return { ...prev, tracker: resetTracker };
        });
      }

      setGeneratedImages((prev) => ({ ...prev, [position]: asset }));

      // Persist blob immediately (deterministic key overwrites on replace)
      addGeneratedBlob(projectId, position, file).catch((err) => {
        console.warn(`[LookbookStudio] Failed to save generated image blob for shot ${position}:`, err);
        showBlobError(`Could not save image for shot ${position}. It may not persist across sessions.`);
      });
    },
    [showBlobError],
  );

  const handleRemoveImage = useCallback(
    (position: number) => {
      const projectId = activeProjectRef.current?.id;
      const existing = generatedImagesRef.current[position];
      if (!existing) return;

      URL.revokeObjectURL(existing.previewUrl);
      setGeneratedImages((prev) => {
        const next = { ...prev };
        delete next[position];
        return next;
      });

      // Reset downstream review state
      setActiveProject((prev) => {
        if (!prev?.tracker) return prev;
        const current = prev.tracker.shots[position];
        if (!current) return prev;
        const needsStatusReset =
          current.status === "accepted" ||
          current.status === "enhancing" ||
          current.status === "done";
        const updated = {
          ...current,
          continuity: "unreviewed" as const,
          continuityConcerns: [],
          skinPolish: "not_applicable" as const,
          finalMark: needsStatusReset ? null : current.finalMark,
          status: needsStatusReset ? ("generating" as const) : current.status,
          lastUpdated: new Date().toISOString(),
        };
        return {
          ...prev,
          tracker: {
            ...prev.tracker,
            shots: { ...prev.tracker.shots, [position]: updated },
          },
        };
      });

      if (projectId) {
        removeGeneratedBlob(projectId, position).catch((err) => {
          console.warn(`[LookbookStudio] Failed to delete generated image blob for shot ${position}:`, err);
        });
      }
    },
    [],
  );

  // ── Reference handlers ──

  const MAX_REF_FILES: Record<ReferenceType, number> = {
    model: 3,
    product: 10,
    styling: 6,
  };

  const handleAddReferences = useCallback(
    (type: ReferenceType, files: File[]) => {
      setReferences((prev) => {
        const remaining = MAX_REF_FILES[type] - prev[type].length;
        if (remaining <= 0) return prev;

        const supportsPrimary = type === "model" || type === "product";
        const hasPrimary = prev[type].some((a) => a.isPrimary);
        const filesToAdd = files.slice(0, remaining);

        const newAssets: ReferenceAsset[] = filesToAdd.map((file, i) => ({
          id: crypto.randomUUID(),
          type,
          fileName: file.name,
          mimeType: file.type || "image/unknown",
          sizeBytes: file.size,
          previewUrl: URL.createObjectURL(file),
          isPrimary: supportsPrimary && !hasPrimary && i === 0,
          isSourceOfTruth: type === "product",
          addedAt: new Date().toISOString(),
        }));

        // Persist blobs immediately (fire-and-forget with error logging)
        const projectId = activeProjectRef.current?.id;
        if (projectId) {
          for (let j = 0; j < filesToAdd.length; j++) {
            addReferenceBlob(projectId, newAssets[j].id, filesToAdd[j]).catch((err) => {
              console.warn(`[LookbookStudio] Failed to save reference blob "${newAssets[j].fileName}":`, err);
              showBlobError(`Could not save "${newAssets[j].fileName}". It may not persist across sessions.`);
            });
          }
        }

        return {
          ...prev,
          [type]: [...prev[type], ...newAssets],
        };
      });
    },
    [],
  );

  const handleRemoveReference = useCallback((id: string) => {
    setReferences((prev) => {
      for (const type of ["model", "product", "styling"] as const) {
        const asset = prev[type].find((a) => a.id === id);
        if (asset) {
          URL.revokeObjectURL(asset.previewUrl);
          const remaining = prev[type].filter((a) => a.id !== id);
          // If the removed asset was primary, promote the first remaining
          if (
            asset.isPrimary &&
            remaining.length > 0 &&
            (type === "model" || type === "product")
          ) {
            remaining[0] = { ...remaining[0], isPrimary: true };
          }

          // Delete blob immediately
          removeReferenceBlob(id).catch((err) => {
            console.warn(`[LookbookStudio] Failed to delete reference blob "${asset.fileName}":`, err);
          });

          return { ...prev, [type]: remaining };
        }
      }
      return prev;
    });
  }, []);

  const handleSetPrimary = useCallback((id: string) => {
    setReferences((prev) => {
      for (const type of ["model", "product", "styling"] as const) {
        const asset = prev[type].find((a) => a.id === id);
        if (asset) {
          return {
            ...prev,
            [type]: prev[type].map((a) => ({
              ...a,
              isPrimary: a.id === id,
            })),
          };
        }
      }
      return prev;
    });
  }, []);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[--text-tertiary] text-sm">Loading projects...</p>
      </div>
    );
  }

  // ── Engine Selector (shown when creating new project) ──
  if (showEngineSelector) {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => { setShowEngineSelector(false); setView("list"); }}
            className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            &larr; Back to Projects
          </button>
        </div>
        <EngineSelector onSelect={handleEngineSelected} />
      </div>
    );
  }

  // ── Project List View ──
  if (view === "list" || !activeProject) {
    return (
      <ProjectListPanel
        projects={projects}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onDeleteProject={handleDeleteProject}
      />
    );
  }

  // ── Project View ──
  return (
    <div>
      {/* Back to projects */}
      <div className="mb-4">
        <button
          onClick={handleCloseProject}
          className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
        >
          &larr; Back to Projects
        </button>
      </div>

      {/* Non-blocking blob persistence warning */}
      {blobError && (
        <div className="mb-4 px-4 py-2.5 bg-[--status-warning-bg] rounded-lg flex items-center justify-between">
          <p className="text-xs text-[--status-warning-text]">{blobError}</p>
          <button
            onClick={() => setBlobError(null)}
            className="text-[--status-warning-text]/50 hover:text-[--status-warning-text] text-xs ml-3 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <ModeNavigator
        mode={mode}
        onModeChange={setMode}
        hasPlan={activeProject.engine === "commerce" ? !!commercePlan : !!result}
        hasTracker={!!tracker}
        engine={activeProject.engine}
      />

      {/* ── Editorial Engine (default) ── */}
      {activeProject.engine !== "commerce" && (
        <>
          {mode === "setup" && (
            <SetupMode
              projectId={activeProject.id}
              initialInput={activeProject.input}
              references={references}
              fingerprintMeta={activeProject.fingerprintMeta}
              onSubmit={handleSubmit}
              onFingerprintMetaChange={handleFingerprintMetaChange}
              onAddReferences={handleAddReferences}
              onRemoveReference={handleRemoveReference}
              onSetPrimary={handleSetPrimary}
            />
          )}

          {mode === "plan" && result && (
            <PlanMode
              result={result}
              references={references}
              onModeChange={setMode}
              onReset={handleReset}
              onAddReferences={handleAddReferences}
              onRemoveReference={handleRemoveReference}
              onSetPrimary={handleSetPrimary}
            />
          )}

          {mode === "generate" && result && (
            <GenerateMode
              plan={result}
              tracker={tracker}
              generatedImages={generatedImages}
              references={references}
              projectName={activeProject.name}
              onModeChange={setMode}
              onStatusChange={handleStatusChange}
              onContinuityChange={handleContinuityChange}
              onSkinPolishChange={handleSkinPolishChange}
              onUploadImage={handleUploadImage}
              onRemoveImage={handleRemoveImage}
              onFinalMarkChange={handleFinalMarkChange}
              onAddReferences={handleAddReferences}
              onRemoveReference={handleRemoveReference}
              onSetPrimary={handleSetPrimary}
            />
          )}
        </>
      )}

      {/* ── Commerce Engine ── */}
      {activeProject.engine === "commerce" && (
        <>
          {mode === "setup" && (
            <CommerceSetupMode
              projectId={activeProject.id}
              initialInput={activeProject.input}
              references={references}
              families={commerceFamilies}
              fingerprintMeta={activeProject.fingerprintMeta}
              currentFingerprint={activeProject.input.productFingerprint}
              initialSelectedFamilyId={activeProject.selectedFamilyId}
              onFingerprintChange={handleCommerceFingerprint}
              onSubmit={handleCommerceBuildPlan}
              onFamilySelect={handleCommerceFamilySelect}
              onAddReferences={handleAddReferences}
              onRemoveReference={handleRemoveReference}
            />
          )}

          {mode === "generate" && commercePlan && (
            <CommerceGenerateMode
              plan={commercePlan}
              references={references}
              projectId={activeProject.id}
              projectName={activeProject.name}
              generatedImages={generatedImages}
              familyId={commercePlan.templateFamily.id}
              runId={commerceRunId}
              configHash={commerceConfigHash}
              onModeChange={setMode}
              onImageGenerated={handleCommerceImageGenerated}
            />
          )}
        </>
      )}

      {/* ── Shared: Finalise (both engines) ── */}
      {mode === "finalise" && result && (
        <FinaliseMode
          plan={result}
          tracker={tracker}
          generatedImages={generatedImages}
          projectName={activeProject.name}
          onModeChange={setMode}
          onFinalMarkChange={handleFinalMarkChange}
        />
      )}
    </div>
  );
}
