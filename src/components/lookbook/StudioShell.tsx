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
} from "@/lib/lookbook/projectStore";
import ModeNavigator from "./ModeNavigator";
import type { WorkflowMode } from "./ModeNavigator";
import SetupMode from "./modes/SetupMode";
import PlanMode from "./modes/PlanMode";
import GenerateMode from "./modes/GenerateMode";
import FinaliseMode from "./modes/FinaliseMode";
import ProjectListPanel from "./ProjectListPanel";

type View = "list" | "project";

const DEFAULT_INPUT: LookbookInput = {
  productFamily: "apparel",
  specificItem: "",
  genderPresentation: "menswear",
  targetStyle: "commercial",
  campaignGoal: "product_clarity",
  logoVisibilityPriority: "medium",
  creativityLevel: "balanced",
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

  // ── Load project list on mount ──
  useEffect(() => {
    listProjects().then((list) => {
      setProjects(list);
      setLoading(false);
    });
  }, []);

  const refreshProjects = useCallback(async () => {
    const list = await listProjects();
    setProjects(list);
  }, []);

  // ── Object URL cleanup ──
  const referencesRef = useRef(references);
  referencesRef.current = references;

  const generatedImagesRef = useRef(generatedImages);
  generatedImagesRef.current = generatedImages;

  const activeProjectRef = useRef(activeProject);
  activeProjectRef.current = activeProject;

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

  const handleNewProject = useCallback(async () => {
    const project = await createProject(DEFAULT_INPUT);
    setActiveProject(project);
    setReferences({ model: [], product: [], styling: [] });
    setGeneratedImages({});
    setMode("setup");
    setView("project");
  }, []);

  const handleOpenProject = useCallback(async (id: string) => {
    const project = await loadProject(id);
    if (!project) return;

    // Load reference blobs and restore preview URLs
    const blobs = await loadProjectBlobs(project.id);
    const restored = restoreReferencesFromBlobs(project.references, blobs);

    // Load generated image blobs and restore preview URLs
    const genBlobs = await loadGeneratedBlobs(project.id);
    const restoredGen = restoreGeneratedImages(
      project.generatedImages,
      genBlobs,
      project.id,
    );

    // Cleanup orphan reference blobs
    const validIds = new Set<string>();
    for (const type of ["model", "product", "styling"] as const) {
      for (const asset of project.references[type]) {
        validIds.add(asset.id);
      }
    }
    await cleanupOrphanBlobs(project.id, validIds);

    setActiveProject(project);
    setReferences(restored);
    setGeneratedImages(restoredGen);

    // Derive initial workflow mode from project state
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

    setView("project");
  }, []);

  const handleCloseProject = useCallback(async () => {
    // Flush any pending debounced save with the latest state
    if (activeProjectRef.current) {
      const record: ProjectRecord = {
        ...activeProjectRef.current,
        references: toPersistedReferences(referencesRef.current),
        generatedImages: toPersistedGeneratedImages(generatedImagesRef.current),
      };
      await flushPendingSave(record);
    }

    revokeAllPreviewUrls();
    setActiveProject(null);
    setReferences({ model: [], product: [], styling: [] });
    setGeneratedImages({});
    await refreshProjects();
    setView("list");
  }, [revokeAllPreviewUrls, refreshProjects]);

  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProjectFromDB(id);
    await refreshProjects();
  }, [refreshProjects]);

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
        hasPlan={!!result}
        hasTracker={!!tracker}
      />

      {mode === "setup" && (
        <SetupMode
          initialInput={activeProject.input}
          references={references}
          onSubmit={handleSubmit}
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
