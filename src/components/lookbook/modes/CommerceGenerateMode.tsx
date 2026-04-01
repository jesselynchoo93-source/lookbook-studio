"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { ReferenceAsset } from "@/lib/lookbook/types";
import type {
  CommerceGenerationPlan,
  CommercePromptPackage,
  CommerceShotRole,
} from "@/lib/commerce/referenceLibrary.types";
import {
  formatCommerceClipboard,
  formatSingleShotClipboard,
} from "@/lib/commerce/commerceClipboard";
import { addGeneratedBlob } from "@/lib/lookbook/projectStore";
import { needsAnchorForConsistency, isIdentityBearingDetail, DETAIL_ROLES } from "@/lib/commerce/commercePromptCompiler";

// ── Presentation Maps ──

const SHOT_ROLE_SHORT: Record<CommerceShotRole, string> = {
  front_seller: "Front",
  three_quarter_seller: "3/4 View",
  side_fit_proof: "Side",
  back_fit_proof: "Back",
  detail_construction: "Detail",
  detail_material: "Texture",
  motion_drape_proof: "Movement",
  seated_drape_proof: "Seated",
};

const SHOT_PURPOSE: Record<CommerceShotRole, string> = {
  front_seller: "Front view, hero shot",
  three_quarter_seller: "Three-quarter angle, shows shape",
  side_fit_proof: "Side profile, shows fit",
  back_fit_proof: "Back view, full coverage",
  detail_construction: "Close-up, construction detail",
  detail_material: "Material and texture close-up",
  motion_drape_proof: "Motion, shows drape",
  seated_drape_proof: "Seated pose, relaxed fit",
};

// ── Types ──

type StudioMode = "setup" | "plan" | "generate" | "finalise";

type SetPhase =
  | "idle"
  | "preparing"
  | "creating_anchor"
  | "creating_set"
  | "creating_details"
  | "complete"
  | "failed";

type ShotGenerationStatus =
  | "waiting"
  | "creating"
  | "adjusting"
  | "done"
  | "retry_needed";

interface ShotState {
  status: ShotGenerationStatus;
  imageUrl?: string;
  error?: string;
  driftWarning?: boolean;
}

interface PreparedReferences {
  product?: { base64: string; mimeType: string };
  model?: { base64: string; mimeType: string };
}

interface CommerceGenerateModeProps {
  plan: CommerceGenerationPlan;
  references: {
    model: ReferenceAsset[];
    product: ReferenceAsset[];
    styling: ReferenceAsset[];
  };
  projectId: string;
  projectName: string;
  generatedImages: Record<
    number,
    { previewUrl: string; familyId?: string; runId?: string; configHash?: string }
  >;
  familyId: string;
  runId: string;
  configHash: string;
  onModeChange: (mode: StudioMode) => void;
  onImageGenerated: (
    shotPosition: number,
    blob: Blob,
    mimeType: string,
    referenceImageId?: string,
  ) => void;
}

// ── Helpers ──

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function urlToBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  const base64 = await blobToBase64(blob);
  return { base64, mimeType: blob.type || "image/jpeg" };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteStr = atob(base64);
  const bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

// ── Anchor Consistency Helpers ──

async function extractAnchorSignature(
  anchorBase64: string,
  anchorMimeType: string,
): Promise<string | null> {
  try {
    const res = await fetch("/api/check-anchor-consistency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "extract", anchorBase64, anchorMimeType }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.signature || null;
  } catch {
    return null;
  }
}

async function checkDrift(
  anchorBase64: string,
  anchorMimeType: string,
  shotBase64: string,
  shotMimeType: string,
  anchorSignature?: string | null,
  strictMode?: boolean,
): Promise<{ score: number; consistent: boolean; reason?: string }> {
  try {
    const res = await fetch("/api/check-anchor-consistency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "compare",
        anchorBase64,
        anchorMimeType,
        shotBase64,
        shotMimeType,
        anchorSignature: anchorSignature ?? undefined,
        strictMode: strictMode ?? false,
      }),
    });
    if (!res.ok) return { score: 5, consistent: true };
    return res.json();
  } catch {
    return { score: 5, consistent: true };
  }
}

// ── Component ──

export default function CommerceGenerateMode({
  plan,
  references,
  projectId,
  projectName,
  generatedImages,
  familyId,
  runId,
  configHash,
  onModeChange,
  onImageGenerated,
}: CommerceGenerateModeProps) {
  // ── State ──

  const [shotStates, setShotStates] = useState<Record<number, ShotState>>(
    () => {
      const initial: Record<number, ShotState> = {};
      for (const shot of plan.shots) {
        const persisted = generatedImages[shot.position];
        const matchesRun =
          persisted?.previewUrl &&
          persisted.familyId === familyId &&
          persisted.runId === runId &&
          persisted.configHash === configHash;
        if (matchesRun) {
          initial[shot.position] = {
            status: "done",
            imageUrl: persisted.previewUrl,
          };
        } else {
          initial[shot.position] = { status: "waiting" };
        }
      }
      return initial;
    },
  );

  const [setPhase, setSetPhase] = useState<SetPhase>("idle");
  const [retryingShot, setRetryingShot] = useState<number | null>(null);
  const [generatingSingleShot, setGeneratingSingleShot] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedShot, setSelectedShot] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [anchorAutoNote, setAnchorAutoNote] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  // Shared generation lock: ref for closure-race protection, state for immediate UI disable.
  // Ref: checked in stale closures to prevent double-clicks between React re-renders.
  // State: triggers re-render so all Generate/Retry/Generate All controls visibly disable immediately.
  const generatingRef = useRef(false);
  const [generationLocked, setGenerationLocked] = useState(false);
  const anchorDataRef = useRef<{
    base64: string;
    mimeType: string;
    blob: Blob;
  } | null>(null);
  const sharedRefsRef = useRef<PreparedReferences | null>(null);
  const anchorSignatureRef = useRef<string | null>(null);

  // ── Derived ──

  // Single per-project job lock: only one generation job at a time.
  // Governs both "Generate All" and per-shot generation.
  const isActive =
    generationLocked ||
    (setPhase === "preparing" ||
      setPhase === "creating_anchor" ||
      setPhase === "creating_set" ||
      setPhase === "creating_details") ||
    retryingShot !== null ||
    generatingSingleShot !== null;

  const orderedShots = useMemo(
    () =>
      plan.generationOrder.map(
        (pos) => plan.shots.find((s) => s.position === pos)!,
      ),
    [plan],
  );

  // Skipped shot positions (from plan, excluded from all counts)
  const skippedPositions = useMemo(
    () => new Set(plan.skippedShots.map((s) => s.position)),
    [plan.skippedShots],
  );

  const completedCount = useMemo(
    () => Object.values(shotStates).filter((s) => s.status === "done").length,
    [shotStates],
  );

  // "remaining" = eligible AND not-yet-successfully-generated AND not-currently-generating.
  // Failed-but-retryable shots count as remaining.
  const remainingCount = useMemo(
    () =>
      Object.values(shotStates).filter(
        (s) => s.status === "waiting" || s.status === "retry_needed",
      ).length,
    [shotStates],
  );

  const totalEligibleShots = plan.shots.length; // plan.shots already excludes skipped
  const allCompleted = completedCount === totalEligibleShots;

  const hasIncomplete = remainingCount > 0;
  const isResume = completedCount > 0 && !allCompleted;

  // ── Header copy ──

  const coreBodyCount = useMemo(() => {
    const schedule = plan.generationSchedule;
    return 1 + schedule.coreBody.length; // anchor + core body
  }, [plan.generationSchedule]);

  const headerText = useMemo(() => {
    if (retryingShot !== null) return "Retrying shot...";
    switch (setPhase) {
      case "preparing":
        return `Preparing your ${totalEligibleShots}-shot set...`;
      case "creating_anchor":
        return "Creating anchor shot...";
      case "creating_set": {
        const coreReady = Math.min(completedCount, coreBodyCount);
        return `Core set in progress, ${coreReady} of ${coreBodyCount} ready`;
      }
      case "creating_details":
        return "Adding detail shots...";
      case "failed":
        return "Generation stopped";
      case "complete":
      case "idle":
      default:
        if (allCompleted) return "Your set is ready";
        if (completedCount >= coreBodyCount) return "Core set ready";
        return `${completedCount}/${totalEligibleShots} shots complete`;
    }
  }, [setPhase, completedCount, totalEligibleShots, coreBodyCount, retryingShot, allCompleted]);

  // ── Prepare shared references (encode once) ──

  const prepareSharedReferences =
    useCallback(async (): Promise<PreparedReferences> => {
      const refs: PreparedReferences = {};
      const primaryProduct =
        references.product.find((r) => r.isPrimary) ?? references.product[0];
      if (primaryProduct?.previewUrl) {
        refs.product = await urlToBase64(primaryProduct.previewUrl);
      }
      const primaryModel =
        references.model.find((r) => r.isPrimary) ?? references.model[0];
      if (primaryModel?.previewUrl) {
        refs.model = await urlToBase64(primaryModel.previewUrl);
      }
      return refs;
    }, [references]);

  // ── Generate a single shot ──

  const generateSingleShot = useCallback(
    async (
      shot: CommercePromptPackage,
      signal: AbortSignal,
      sharedRefs: PreparedReferences,
      options?: {
        anchorImage?: { base64: string; mimeType: string };
        consistencyTarget?: string;
      },
    ): Promise<{ blob: Blob; mimeType: string; base64: string } | null> => {
      const templateRes = await fetch(
        `/commerce-refs/${shot.referenceImagePath}`,
        { signal },
      );
      const templateBlob = await templateRes.blob();
      const templateBase64 = await blobToBase64(templateBlob);
      const templateMime = templateBlob.type || "image/jpeg";

      let prompt = shot.positivePrompt;
      if (options?.consistencyTarget) {
        prompt = `${prompt}\n\n${options.consistencyTarget}`;
      }

      const strategy = shot.roleStrategy;

      // Derive shotClass for route-level annotation selection
      const isDetail = DETAIL_ROLES.includes(shot.shotRole);
      const shotClass = isDetail
        ? (shot.isWornDetail ? "worn_detail" : "flat_lay")
        : "body";

      const body: Record<string, unknown> = {
        prompt,
        negativePrompt: shot.negativePrompt,
        templateImage: { base64: templateBase64, mimeType: templateMime },
        productImage: sharedRefs.product,
        modelImage: strategy.includeModelRef ? sharedRefs.model : undefined,
        isWornDetail: shot.isWornDetail ?? false,
        shotClass,
      };

      if (strategy.includeConsistencyTarget && options?.anchorImage) {
        body.anchorImage = options.anchorImage;
      }

      const res = await fetch("/api/generate-commerce-shot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(
          errorData.error || `Generation failed with status ${res.status}`,
        );
      }

      const data = await res.json();
      if (!data.imageBase64) {
        throw new Error("No image returned from generation API");
      }

      const mimeType = data.mimeType || "image/jpeg";
      const blob = base64ToBlob(data.imageBase64, mimeType);
      return { blob, mimeType, base64: data.imageBase64 };
    },
    [],
  );

  // ── Build consistency target ──

  const buildConsistencyTarget = useCallback(
    (signature: string | null): string => {
      if (signature) {
        return `CONSISTENCY TARGET (match the anchor shot): ${signature}`;
      }
      const family = plan.templateFamily;
      return `CONSISTENCY TARGET: Match the family visual system. Background: ${family.backgroundFamily}. Maintain identical background tone and lighting across all shots.`;
    },
    [plan.templateFamily],
  );

  // ── Persist a completed shot ──

  const persistShot = useCallback(
    async (
      shot: CommercePromptPackage,
      blob: Blob,
      mimeType: string,
    ): Promise<string> => {
      const objectUrl = URL.createObjectURL(blob);
      await addGeneratedBlob(projectId, shot.position, blob, familyId, runId);
      const refImageId = plan.shots.find(
        (s) => s.position === shot.position,
      )?.referenceImagePath;
      onImageGenerated(shot.position, blob, mimeType, refImageId);
      return objectUrl;
    },
    [projectId, familyId, runId, plan.shots, onImageGenerated],
  );

  // ── Generate set: anchor-first + parallel batches of 2 ──

  const handleGenerateSet = useCallback(async () => {
    if (isActive || generatingRef.current) return;
    generatingRef.current = true;
    setGenerationLocked(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const shotsToGenerate = orderedShots.filter(
        (shot) => shotStates[shot.position]?.status !== "done",
      );
      if (shotsToGenerate.length === 0) {
        setSetPhase("complete");
        return;
      }

      // Phase 1: Prepare shared references
      setSetPhase("preparing");
      const sharedRefs = await prepareSharedReferences();
      sharedRefsRef.current = sharedRefs;
      if (controller.signal.aborted) return;

      // Identify anchor (first in generation order)
      const anchorShot = orderedShots[0];
      const anchorNeedsGeneration =
        shotStates[anchorShot.position]?.status !== "done";

      // Phase 2: Generate anchor if needed
      if (anchorNeedsGeneration) {
        setSetPhase("creating_anchor");
        setShotStates((prev) => ({
          ...prev,
          [anchorShot.position]: { status: "creating" },
        }));

        try {
          const result = await generateSingleShot(
            anchorShot,
            controller.signal,
            sharedRefs,
          );
          if (!result || controller.signal.aborted) return;

          anchorDataRef.current = {
            base64: result.base64,
            mimeType: result.mimeType,
            blob: result.blob,
          };

          const objectUrl = await persistShot(
            anchorShot,
            result.blob,
            result.mimeType,
          );
          setShotStates((prev) => ({
            ...prev,
            [anchorShot.position]: { status: "done", imageUrl: objectUrl },
          }));
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          const message =
            err instanceof Error ? err.message : "Unknown error";
          setShotStates((prev) => ({
            ...prev,
            [anchorShot.position]: {
              status: "retry_needed",
              error: message,
            },
          }));
          // Anchor failure is a global blocker
          setSetPhase("failed");
          return;
        }
      } else {
        // Resume: retrieve anchor data for consistency reference
        const anchorUrl = shotStates[anchorShot.position]?.imageUrl;
        if (anchorUrl) {
          try {
            const res = await fetch(anchorUrl);
            const blob = await res.blob();
            const base64 = await blobToBase64(blob);
            anchorDataRef.current = {
              base64,
              mimeType: blob.type || "image/jpeg",
              blob,
            };
          } catch {
            anchorDataRef.current = null;
          }
        }
      }

      if (controller.signal.aborted) return;

      // Phase 3: Extract anchor signature (non-blocking, 5s timeout)
      if (anchorDataRef.current) {
        try {
          const sigPromise = extractAnchorSignature(
            anchorDataRef.current.base64,
            anchorDataRef.current.mimeType,
          );
          const raceResult = await Promise.race([
            sigPromise.then((sig) => ({ sig })),
            new Promise<{ sig: null }>((resolve) =>
              setTimeout(() => resolve({ sig: null }), 5000),
            ),
          ]);
          anchorSignatureRef.current = raceResult.sig;
        } catch {
          anchorSignatureRef.current = null;
        }
      }

      if (controller.signal.aborted) return;

      // Phase 4a: Generate core body shots in ONE parallel batch
      const schedule = plan.generationSchedule;
      const consistencyTarget = buildConsistencyTarget(
        anchorSignatureRef.current,
      );
      const anchorImageForRef = anchorDataRef.current
        ? {
            base64: anchorDataRef.current.base64,
            mimeType: anchorDataRef.current.mimeType,
          }
        : undefined;

      const coreBodyShots = shotsToGenerate.filter(
        (s) =>
          s.position !== anchorShot.position &&
          schedule.coreBody.includes(s.position),
      );
      const detailShots = shotsToGenerate.filter(
        (s) => schedule.detailTexture.includes(s.position),
      );

      // Helper to generate a batch of shots in parallel
      const generateBatch = async (batch: CommercePromptPackage[]) => {
        await Promise.all(
          batch.map(async (shot) => {
            if (controller.signal.aborted) return;

            const strategy = shot.roleStrategy;

            setShotStates((prev) => ({
              ...prev,
              [shot.position]: { status: "creating" },
            }));

            let retries = 0;

            const attempt = async (): Promise<void> => {
              try {
                let shotOptions = strategy.includeConsistencyTarget
                  ? { anchorImage: anchorImageForRef, consistencyTarget }
                  : undefined;

                const result = await generateSingleShot(
                  shot,
                  controller.signal,
                  sharedRefs,
                  shotOptions,
                );
                if (!result || controller.signal.aborted) return;

                // Drift check against anchor (only for roles that require it)
                let driftDetected = false;
                if (strategy.runDriftCheck && anchorDataRef.current) {
                  setShotStates((prev) => ({
                    ...prev,
                    [shot.position]: { status: "adjusting" },
                  }));

                  // Use stricter threshold for worn-detail shots
                  const templateShot = plan.templateFamily.shots.find((s) => s.position === shot.position);
                  const isWornDetail = templateShot && DETAIL_ROLES.includes(templateShot.role) && isIdentityBearingDetail(templateShot);

                  const drift = await checkDrift(
                    anchorDataRef.current.base64,
                    anchorDataRef.current.mimeType,
                    result.base64,
                    result.mimeType,
                    anchorSignatureRef.current,
                    isWornDetail,
                  );
                  if (process.env.NODE_ENV === "development") {
                    console.log("[drift-check]", shot.position, templateShot?.role, drift);
                  }

                  if (!drift.consistent && retries < strategy.maxDriftRetries) {
                    retries++;
                    // On retry, reinforce brightness and composition matching
                    if (shotOptions?.consistencyTarget) {
                      const brightnessHint = anchorSignatureRef.current?.match(/Overall brightness: ([^.]+)/)?.[1] || "medium";
                      shotOptions = {
                        ...shotOptions,
                        consistencyTarget: `${shotOptions.consistencyTarget}\nCRITICAL: The previous generation drifted from the anchor. The anchor's brightness is "${brightnessHint}". Match the anchor's exact brightness, background tone, and composition. Do NOT darken the background. Do NOT change the pose or crop.`,
                      };
                    }
                    setShotStates((prev) => ({
                      ...prev,
                      [shot.position]: { status: "creating" },
                    }));
                    return attempt();
                  }

                  driftDetected = !drift.consistent;
                }

                const objectUrl = await persistShot(
                  shot,
                  result.blob,
                  result.mimeType,
                );
                setShotStates((prev) => ({
                  ...prev,
                  [shot.position]: {
                    status: "done",
                    imageUrl: objectUrl,
                    driftWarning: driftDetected,
                  },
                }));
              } catch (err: unknown) {
                if (controller.signal.aborted) return;
                const message =
                  err instanceof Error ? err.message : "Unknown error";
                setShotStates((prev) => ({
                  ...prev,
                  [shot.position]: {
                    status: "retry_needed",
                    error: message,
                  },
                }));
              }
            };

            await attempt();
          }),
        );
      };

      // Core body: one parallel batch
      if (coreBodyShots.length > 0 && !controller.signal.aborted) {
        setSetPhase("creating_set");
        await generateBatch(coreBodyShots);
      }

      // Phase 4b: Detail/texture shots in one parallel batch
      if (detailShots.length > 0 && !controller.signal.aborted) {
        setSetPhase("creating_details");
        await generateBatch(detailShots);
      }

      if (!controller.signal.aborted) {
        setSetPhase("complete");
      }
    } catch (err: unknown) {
      if (!abortRef.current?.signal.aborted) {
        console.error("[CommerceGenerateMode] Generation error:", err);
        setSetPhase("failed");
      }
    } finally {
      generatingRef.current = false;
      setGenerationLocked(false);
      abortRef.current = null;
    }
  }, [
    isActive,
    orderedShots,
    shotStates,
    prepareSharedReferences,
    generateSingleShot,
    buildConsistencyTarget,
    persistShot,
  ]);

  // ── Retry single shot ──

  const handleRetryShot = useCallback(
    async (shot: CommercePromptPackage) => {
      if (isActive || generatingRef.current) return;
      generatingRef.current = true;
      setGenerationLocked(true);

      const controller = new AbortController();
      abortRef.current = controller;
      setRetryingShot(shot.position);

      try {
        // Get or prepare shared references
        let sharedRefs = sharedRefsRef.current;
        if (!sharedRefs) {
          sharedRefs = await prepareSharedReferences();
          sharedRefsRef.current = sharedRefs;
        }

        setShotStates((prev) => ({
          ...prev,
          [shot.position]: { status: "creating" },
        }));

        const isAnchorShot = shot.isAnchor;
        const strategy = shot.roleStrategy;
        const consistencyTarget = isAnchorShot || !strategy.includeConsistencyTarget
          ? undefined
          : buildConsistencyTarget(anchorSignatureRef.current);
        const anchorImageForRef =
          !isAnchorShot && strategy.includeConsistencyTarget && anchorDataRef.current
            ? {
                base64: anchorDataRef.current.base64,
                mimeType: anchorDataRef.current.mimeType,
              }
            : undefined;

        const result = await generateSingleShot(
          shot,
          controller.signal,
          sharedRefs,
          { anchorImage: anchorImageForRef, consistencyTarget },
        );

        if (!result || controller.signal.aborted) return;

        // If this is the anchor, store data and extract signature
        if (isAnchorShot) {
          anchorDataRef.current = {
            base64: result.base64,
            mimeType: result.mimeType,
            blob: result.blob,
          };
          try {
            const sig = await Promise.race([
              extractAnchorSignature(result.base64, result.mimeType),
              new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), 5000),
              ),
            ]);
            anchorSignatureRef.current = sig;
          } catch {
            anchorSignatureRef.current = null;
          }
        }

        // Drift check for non-anchor shots (only if strategy requires it)
        let driftDetected = false;
        if (!isAnchorShot && strategy.runDriftCheck && anchorDataRef.current) {
          setShotStates((prev) => ({
            ...prev,
            [shot.position]: { status: "adjusting" },
          }));
          const drift = await checkDrift(
            anchorDataRef.current.base64,
            anchorDataRef.current.mimeType,
            result.base64,
            result.mimeType,
            anchorSignatureRef.current,
          );
          driftDetected = !drift.consistent;
        }

        const objectUrl = await persistShot(shot, result.blob, result.mimeType);
        setShotStates((prev) => ({
          ...prev,
          [shot.position]: {
            status: "done",
            imageUrl: objectUrl,
            driftWarning: driftDetected,
          },
        }));

        // Reset phase so Resume Set becomes available if needed
        setSetPhase("idle");
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setShotStates((prev) => ({
          ...prev,
          [shot.position]: { status: "retry_needed", error: message },
        }));
      } finally {
        setRetryingShot(null);
        generatingRef.current = false;
        setGenerationLocked(false);
        abortRef.current = null;
      }
    },
    [
      isActive,
      prepareSharedReferences,
      generateSingleShot,
      buildConsistencyTarget,
      persistShot,
    ],
  );

  // ── Per-shot generation (Step 12) ──
  // Uses canonical anchorShotIndex/anchorImageKey from the plan.
  // If the shot needs anchor consistency and anchor doesn't exist yet,
  // generates anchor first.

  const handleGenerateSingleShot = useCallback(
    async (shotIndex: number) => {
      if (isActive || generatingRef.current) return;
      generatingRef.current = true;
      setGenerationLocked(true);

      const shot = plan.shots[shotIndex];
      if (!shot) { generatingRef.current = false; setGenerationLocked(false); return; }

      const controller = new AbortController();
      abortRef.current = controller;
      setGeneratingSingleShot(shot.position);

      try {
        // Get or prepare shared references
        let sharedRefs = sharedRefsRef.current;
        if (!sharedRefs) {
          sharedRefs = await prepareSharedReferences();
          sharedRefsRef.current = sharedRefs;
        }

        const anchorIdx = plan.anchorShotIndex;
        const anchorShot = plan.shots[anchorIdx];
        const anchorImageKey = plan.anchorImageKey;

        // Check if we need anchor first
        const shotNeedsAnchor =
          shotIndex !== anchorIdx &&
          needsAnchorForConsistency(plan.templateFamily.shots.find(
            (s) => s.position === shot.position,
          )!);

        // Generate anchor first if needed and not already generated
        if (shotNeedsAnchor && anchorShot && shotStates[anchorShot.position]?.status !== "done") {
          setAnchorAutoNote("Generating anchor shot first for consistency...");
          setShotStates((prev) => ({
            ...prev,
            [anchorShot.position]: { status: "creating" },
          }));

          try {
            const anchorResult = await generateSingleShot(
              anchorShot,
              controller.signal,
              sharedRefs,
            );
            if (!anchorResult || controller.signal.aborted) return;

            anchorDataRef.current = {
              base64: anchorResult.base64,
              mimeType: anchorResult.mimeType,
              blob: anchorResult.blob,
            };

            // Extract anchor signature
            try {
              const sig = await Promise.race([
                extractAnchorSignature(anchorResult.base64, anchorResult.mimeType),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
              ]);
              anchorSignatureRef.current = sig;
            } catch {
              anchorSignatureRef.current = null;
            }

            const objectUrl = await persistShot(anchorShot, anchorResult.blob, anchorResult.mimeType);
            setAnchorAutoNote(null);
            setShotStates((prev) => ({
              ...prev,
              [anchorShot.position]: { status: "done", imageUrl: objectUrl },
            }));
          } catch (err: unknown) {
            setAnchorAutoNote(null);
            if (controller.signal.aborted) return;
            const message = err instanceof Error ? err.message : "Unknown error";
            setShotStates((prev) => ({
              ...prev,
              [anchorShot.position]: { status: "retry_needed", error: message },
            }));
            // Anchor failure blocks the requested shot too
            return;
          }
        }

        // Now generate the requested shot
        if (controller.signal.aborted) return;

        setShotStates((prev) => ({
          ...prev,
          [shot.position]: { status: "creating" },
        }));

        const strategy = shot.roleStrategy;
        let currentConsistencyTarget = strategy.includeConsistencyTarget
          ? buildConsistencyTarget(anchorSignatureRef.current)
          : undefined;
        const anchorImageForRef =
          strategy.includeConsistencyTarget && anchorDataRef.current
            ? { base64: anchorDataRef.current.base64, mimeType: anchorDataRef.current.mimeType }
            : undefined;

        // Use stricter threshold for worn-detail shots
        const templateShot = plan.templateFamily.shots.find((s) => s.position === shot.position);
        const isWornDetail = templateShot && DETAIL_ROLES.includes(templateShot.role) && isIdentityBearingDetail(templateShot);

        let retries = 0;
        const attempt = async (): Promise<void> => {
          const result = await generateSingleShot(
            shot,
            controller.signal,
            sharedRefs!,
            { anchorImage: anchorImageForRef, consistencyTarget: currentConsistencyTarget },
          );
          if (!result || controller.signal.aborted) return;

          // Drift check
          let driftDetected = false;
          if (strategy.runDriftCheck && anchorDataRef.current) {
            setShotStates((prev) => ({
              ...prev,
              [shot.position]: { status: "adjusting" },
            }));
            const drift = await checkDrift(
              anchorDataRef.current.base64,
              anchorDataRef.current.mimeType,
              result.base64,
              result.mimeType,
              anchorSignatureRef.current,
              isWornDetail,
            );
            if (process.env.NODE_ENV === "development") {
              console.log("[drift-check]", shot.position, shot.shotRole, drift);
            }
            if (!drift.consistent && retries < strategy.maxDriftRetries) {
              retries++;
              // On retry, reinforce brightness and composition matching
              if (currentConsistencyTarget) {
                const brightnessHint = anchorSignatureRef.current?.match(/Overall brightness: ([^.]+)/)?.[1] || "medium";
                currentConsistencyTarget = `${currentConsistencyTarget}\nCRITICAL: The previous generation drifted from the anchor. The anchor's brightness is "${brightnessHint}". Match the anchor's exact brightness, background tone, and composition. Do NOT darken the background. Do NOT change the pose or crop.`;
              }
              setShotStates((prev) => ({
                ...prev,
                [shot.position]: { status: "creating" },
              }));
              return attempt();
            }
            driftDetected = !drift.consistent;
          }

          const objectUrl = await persistShot(shot, result.blob, result.mimeType);
          setShotStates((prev) => ({
            ...prev,
            [shot.position]: { status: "done", imageUrl: objectUrl, driftWarning: driftDetected },
          }));
        };

        await attempt();
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setShotStates((prev) => ({
          ...prev,
          [shot.position]: { status: "retry_needed", error: message },
        }));
      } finally {
        setGeneratingSingleShot(null);
        setAnchorAutoNote(null);
        generatingRef.current = false;
        setGenerationLocked(false);
        abortRef.current = null;
      }
    },
    [
      isActive,
      plan,
      shotStates,
      prepareSharedReferences,
      generateSingleShot,
      buildConsistencyTarget,
      persistShot,
    ],
  );

  // ── Download ──

  const handleDownloadShot = useCallback(
    (position: number) => {
      const state = shotStates[position];
      if (!state?.imageUrl) return;
      const shot = plan.shots.find((s) => s.position === position);
      const roleName = shot ? SHOT_ROLE_SHORT[shot.shotRole] : `Shot ${position}`;
      const a = document.createElement("a");
      a.href = state.imageUrl;
      a.download = `${projectName} - ${roleName}.jpg`;
      a.click();
    },
    [shotStates, plan, projectName],
  );

  const handleDownloadAll = useCallback(async () => {
    const eligible = orderedShots.filter(
      (s) => shotStates[s.position]?.status === "done" && shotStates[s.position]?.imageUrl,
    );
    for (const shot of eligible) {
      handleDownloadShot(shot.position);
      await new Promise((r) => setTimeout(r, 150));
    }
  }, [orderedShots, shotStates, handleDownloadShot]);

  // ── Clipboard ──

  const handleCopyAll = useCallback(async () => {
    const text = formatCommerceClipboard(plan);
    await navigator.clipboard.writeText(text);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  }, [plan]);

  const handleCopyShot = useCallback(
    async (shot: CommercePromptPackage) => {
      const text = formatSingleShotClipboard(shot);
      await navigator.clipboard.writeText(text);
      setCopied(`shot-${shot.position}`);
      setTimeout(() => setCopied(null), 2000);
    },
    [],
  );

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const activeShot =
    selectedShot !== null
      ? (plan.shots.find((s) => s.position === selectedShot) ?? null)
      : null;

  // ── Render ──

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[--text-primary]">
            {projectName}
          </h2>
          <p className="text-sm text-[--text-secondary] mt-0.5">
            {headerText}
          </p>
          <p className="text-xs text-[--text-tertiary] mt-0.5">
            Template: {plan.templateFamily.userDescription}
          </p>
        </div>

        <div className="flex gap-2">
          {/* Generate All (N remaining) CTA */}
          {hasIncomplete && (
            <button
              onClick={handleGenerateSet}
              disabled={isActive}
              className={`
                text-xs px-4 py-1.5 rounded-lg font-medium transition-opacity
                ${isActive
                  ? "bg-[--surface-inset] text-[--text-tertiary] cursor-not-allowed"
                  : "bg-[--text-primary] text-[--text-inverted] hover:opacity-90"
                }
              `}
            >
              {isActive
                ? "Working..."
                : `Generate All (${remainingCount} remaining)`}
            </button>
          )}

          {/* Download All (temporary patch: show at 1+; durable fix is zip export) */}
          {completedCount >= 1 && (
            <button
              onClick={handleDownloadAll}
              className="text-xs px-3 py-1.5 rounded-lg border border-[--border-subtle] text-[--text-secondary] hover:border-[--text-tertiary] transition-colors"
            >
              Download All ({completedCount})
            </button>
          )}

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[--border-subtle] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            {showAdvanced ? "Hide Advanced" : "Advanced"}
          </button>

          {/* Finalise */}
          {allCompleted && (
            <button
              onClick={() => onModeChange("finalise")}
              className="text-xs px-3 py-1.5 rounded-lg bg-[--text-primary] text-[--text-inverted] hover:opacity-90 transition-opacity"
            >
              Finalise
            </button>
          )}
        </div>
      </div>

      {/* Global error banner */}
      {setPhase === "failed" && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[--status-error-bg] border border-[--status-error-border] text-sm text-[--status-error-text]">
          Generation paused. Check your API key or try again.
        </div>
      )}

      {/* Template Contact Sheet (always visible reference strip) */}
      <div className="mb-4">
        <p className="text-[10px] font-medium text-[--text-tertiary] uppercase tracking-wider mb-2">
          Reference Set
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {orderedShots.map((shot, i) => (
            <div
              key={shot.position}
              className="flex-shrink-0 w-12 rounded overflow-hidden border border-[--border-subtle]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/commerce-refs/${shot.referenceImagePath}`}
                alt={`Ref ${i + 1}: ${SHOT_ROLE_SHORT[shot.shotRole]}`}
                className="w-full aspect-[3/4] object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Skipped shots summary (above grid) */}
      {plan.skippedShots.length > 0 && (
        <div className="mb-4 px-3 py-2 bg-[--surface-inset] rounded-lg text-xs text-[--text-tertiary]">
          {plan.skippedShots.length} shot{plan.skippedShots.length !== 1 ? "s" : ""} skipped due to garment incompatibility
        </div>
      )}

      {/* Anchor auto-generation note */}
      {anchorAutoNote && (
        <div className="mb-4 px-3 py-2 bg-[--surface-inset] rounded-lg text-xs text-[--text-secondary] flex items-center gap-2">
          <div className="w-3 h-3 border border-[--text-tertiary] border-t-[--text-primary] rounded-full animate-spin" />
          {anchorAutoNote}
        </div>
      )}

      {/* Shot Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Eligible shots */}
        {orderedShots.map((shot, i) => {
          const state = shotStates[shot.position] ?? { status: "waiting" };
          const shotIdx = plan.shots.findIndex((s) => s.position === shot.position);
          return (
            <ShotCell
              key={shot.position}
              shot={shot}
              index={i}
              state={state}
              isSelected={selectedShot === shot.position}
              isSkipped={false}
              onSelect={() =>
                setSelectedShot(
                  selectedShot === shot.position ? null : shot.position,
                )
              }
              onRetry={() => handleRetryShot(shot)}
              onDownload={() => handleDownloadShot(shot.position)}
              onGenerate={() => handleGenerateSingleShot(shotIdx)}
              isActive={isActive}
            />
          );
        })}

        {/* Skipped shots (greyed out, faded thumbnail, no Generate button) */}
        {plan.skippedShots.map((skipped) => {
          const templateShot = plan.templateFamily.shots.find(
            (s) => s.position === skipped.position,
          );
          return (
            <SkippedShotCell
              key={`skipped-${skipped.position}`}
              role={skipped.role}
              reason={skipped.reason}
              position={skipped.position}
              thumbnailPath={templateShot?.thumbnailPath}
            />
          );
        })}
      </div>

      {/* Advanced Panel (prompt text, clipboard, error detail) */}
      {showAdvanced && (
        <div className="mt-6 bg-[--surface-card] border border-[--border-subtle] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[--text-primary]">
              Prompts
            </h3>
            <button
              onClick={handleCopyAll}
              className="text-xs px-3 py-1 rounded border border-[--border-subtle] text-[--text-secondary] hover:border-[--text-tertiary] transition-colors"
            >
              {copied === "all" ? "Copied!" : "Copy All Prompts"}
            </button>
          </div>

          {activeShot ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[--text-primary]">
                  Shot {orderedShots.indexOf(activeShot) + 1}:{" "}
                  {SHOT_ROLE_SHORT[activeShot.shotRole]}
                </span>
                <button
                  onClick={() => handleCopyShot(activeShot)}
                  className="text-xs px-2 py-0.5 rounded border border-[--border-subtle] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
                >
                  {copied === `shot-${activeShot.position}`
                    ? "Copied!"
                    : "Copy"}
                </button>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[--text-secondary] uppercase tracking-wider mb-1">
                  Positive Prompt
                </div>
                <pre className="text-xs text-[--text-primary] bg-[--surface-inset] rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                  {activeShot.positivePrompt}
                </pre>
              </div>
              <div>
                <div className="text-[10px] font-medium text-[--text-secondary] uppercase tracking-wider mb-1">
                  Negative Prompt
                </div>
                <pre className="text-xs text-[--text-tertiary] bg-[--surface-inset] rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                  {activeShot.negativePrompt}
                </pre>
              </div>
              {/* Full error detail in Advanced only */}
              {shotStates[activeShot.position]?.error && (
                <div>
                  <div className="text-[10px] font-medium text-[--status-error-text] uppercase tracking-wider mb-1">
                    Error Detail
                  </div>
                  <pre className="text-xs text-[--status-error-text] bg-[--surface-inset] rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                    {shotStates[activeShot.position].error}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[--text-tertiary]">
              Select a shot in the grid above to view its prompt.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shot Cell ──

function ShotCell({
  shot,
  index,
  state,
  isSelected,
  isSkipped,
  onSelect,
  onRetry,
  onDownload,
  onGenerate,
  isActive,
}: {
  shot: CommercePromptPackage;
  index: number;
  state: ShotState;
  isSelected: boolean;
  isSkipped: boolean;
  onSelect: () => void;
  onRetry: () => void;
  onDownload: () => void;
  onGenerate: () => void;
  isActive: boolean;
}) {
  const roleName = SHOT_ROLE_SHORT[shot.shotRole];
  const purpose = SHOT_PURPOSE[shot.shotRole];
  const templateSrc = `/commerce-refs/${shot.referenceImagePath}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`
        text-left rounded-xl overflow-hidden border-2 transition-all cursor-pointer
        ${isSelected
          ? "border-[color:var(--accent)] shadow-md"
          : "border-[--border-subtle] hover:border-[--text-tertiary]"
        }
      `}
    >
      {/* Image area */}
      <div className="relative aspect-[3/4] bg-[--surface-inset]">
        {state.status === "done" && state.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.imageUrl}
              alt={`Generated ${roleName}`}
              className="w-full h-full object-cover"
            />
            {/* Drift warning badge */}
            {state.driftWarning && (
              <span className="absolute top-1.5 right-1.5 text-[10px] font-medium bg-[--status-warning-bg] text-[--status-warning-text] px-1.5 py-0.5 rounded">
                May not match set
              </span>
            )}
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={templateSrc}
              alt={`Template: ${roleName}`}
              className={`
                w-full h-full object-cover
                ${state.status === "waiting" ? "opacity-40" : "opacity-25"}
              `}
            />

            {/* Status overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {state.status === "creating" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[--text-tertiary] border-t-[--text-primary] rounded-full animate-spin" />
                  <span className="text-xs text-[--text-primary] font-medium bg-[--surface-card]/80 px-2 py-0.5 rounded">
                    Creating...
                  </span>
                </div>
              )}

              {state.status === "adjusting" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[--text-tertiary] border-t-[--text-primary] rounded-full animate-spin" />
                  <span className="text-xs text-[--text-primary] font-medium bg-[--surface-card]/80 px-2 py-0.5 rounded">
                    Adjusting...
                  </span>
                </div>
              )}

              {state.status === "waiting" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerate();
                    }}
                    disabled={isActive}
                    className={`
                      text-xs px-3 py-1 rounded font-medium transition-opacity
                      ${isActive
                        ? "bg-[--surface-inset] text-[--text-tertiary] cursor-not-allowed"
                        : "bg-[--text-primary] text-[--text-inverted] hover:opacity-90"
                      }
                    `}
                  >
                    Generate
                  </button>
                </div>
              )}

              {state.status === "retry_needed" && (
                <div className="flex flex-col items-center gap-2 px-3">
                  <span className="text-xs text-[--status-error-text] bg-[--status-error-bg] px-2 py-0.5 rounded text-center">
                    {state.error
                      ? state.error.slice(0, 40)
                      : "Couldn't create this shot"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry();
                    }}
                    disabled={isActive}
                    className={`
                      text-xs px-3 py-1 rounded font-medium transition-opacity
                      ${isActive
                        ? "bg-[--surface-inset] text-[--text-tertiary] cursor-not-allowed"
                        : "bg-[--text-primary] text-[--text-inverted] hover:opacity-90"
                      }
                    `}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Label bar */}
      <div className="px-3 py-2 bg-[--surface-card]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[--text-primary]">
              Shot {index + 1}: {roleName}
            </span>
            <p className="text-[10px] text-[--text-tertiary] mt-0.5">
              {purpose}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {state.status === "done" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                className="text-[10px] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
              >
                Download
              </button>
            )}
            {state.status === "done" && (
              <span className="text-[10px] text-[--status-success-text]">
                &#10003;
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Skipped Shot Cell (Step 10) ──

function SkippedShotCell({
  role,
  reason,
  position,
  thumbnailPath,
}: {
  role: CommerceShotRole;
  reason: string;
  position: number;
  thumbnailPath?: string;
}) {
  const roleName = SHOT_ROLE_SHORT[role];

  return (
    <div className="rounded-xl overflow-hidden border-2 border-[--border-subtle] opacity-40 cursor-not-allowed">
      <div className="relative aspect-[3/4] bg-[--surface-inset]">
        {thumbnailPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/commerce-refs/${thumbnailPath}`}
            alt={`Skipped: ${roleName}`}
            className="w-full h-full object-cover opacity-30 grayscale"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-[--text-tertiary] bg-[--surface-card]/80 px-2 py-0.5 rounded font-medium">
            Skipped
          </span>
        </div>
      </div>
      <div className="px-3 py-2 bg-[--surface-card]">
        <span className="text-xs font-medium text-[--text-tertiary]">
          {roleName}
        </span>
        <p className="text-[10px] text-[--text-tertiary] mt-0.5 truncate" title={reason}>
          {reason}
        </p>
      </div>
    </div>
  );
}
