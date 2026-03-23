/**
 * F7+F8: Provider-Facing Prompt Compiler (Reference-Locked Generation Controller)
 *
 * Compiles internal planning data into compressed high-control prompts
 * optimised for Higgsfield (or other providers). The reference images carry
 * identity; the text prompt acts as a shot controller.
 *
 * F8 additions:
 *   - Reference lock preamble (hard, concise)
 *   - Bag-specific compilers for 6 shot classes (5 proof + 1 editorial)
 *   - Deterministic realism normalization (camera, lighting, human, material)
 *   - Physical behavior constraints per shot type
 *   - Fingerprint-aware detail prompts with ONE proof target
 *   - Deterministic critic integration (auto-fix + warnings)
 *   - Proof vs editorial priority separation
 *
 * 3 compilation modes:
 *   - on-body:      model wearing/carrying the product
 *   - product-only: flatlay, tabletop, no model
 *   - detail:       macro/close-up of a specific zone
 */
import type {
  RecommendedShot,
  MasterShootDNA,
  LookbookInput,
  ProductFingerprint,
  BagFingerprint,
  ContinuityWorldTokens,
  ProviderPromptOutput,
  ProviderPromptConfig,
  ProviderCompilationMode,
  ProviderPromptOutputV2,
  ProductFamily,
  BagShotClass,
} from "./types";
import { STYLE_LABELS } from "./types";
import { derivePoseBucket } from "./scoring";
import {
  classifyBagShot,
  getBagPhysicsConstraints,
  compilePhysicsBlock,
  compilePhysicsNegatives,
  buildDetailFocus,
} from "./bagProofZones";
import {
  normalizePositive,
  normalizeNegative,
  compileCameraLock,
  compileLightingLock,
  compileMaterialRealism,
  compileHumanRealismBlock,
  EXPOSURE_CONTROL,
} from "./realismNormalizer";
import { runProviderCritic } from "./providerCritic";

// ── Default Provider Config ──

export const HIGGSFIELD_CONFIG: ProviderPromptConfig = {
  provider: "higgsfield",
  model: "nano_banana_pro",
  maxPromptWords: 150, // F8: raised from 120 for bag shots
  renderLogoText: false,
};

// ── World Presets ──

import type { WorldPreset } from "./types";

export const WORLD_PRESETS: WorldPreset[] = [
  {
    id: "neutral_studio",
    label: "Neutral Studio",
    tokens: {
      backdrop: "seamless grey backdrop, clean floor",
      lighting: "even soft lighting, minimal shadows",
      tonalTemperature: "neutral",
      styling: "clean minimal, dark or neutral tones",
      modelTokens: "",
    },
  },
  {
    id: "warm_editorial",
    label: "Warm Editorial",
    tokens: {
      backdrop: "warm concrete wall, matte grey floor",
      lighting: "key light camera-right, soft warm",
      tonalTemperature: "warm neutral",
      styling: "earth tones, tailored, textured fabrics",
      modelTokens: "",
    },
  },
  {
    id: "cool_modern",
    label: "Cool Modern",
    tokens: {
      backdrop: "dark slate wall, polished concrete",
      lighting: "hard directional, cool 5500K",
      tonalTemperature: "cool neutral",
      styling: "monochrome, structured, minimal",
      modelTokens: "",
    },
  },
  {
    id: "natural_light",
    label: "Natural Light",
    tokens: {
      backdrop: "light plaster wall, wood floor",
      lighting: "window camera-left, daylight",
      tonalTemperature: "warm daylight",
      styling: "relaxed, linen and cotton, organic palette",
      modelTokens: "",
    },
  },
];

// ── Accessory-Led Families ──

const ACCESSORY_FAMILIES: Set<ProductFamily> = new Set([
  "bags", "watches", "belts", "jewelry", "eyewear",
]);

// ── Mode Detection ──

export function detectCompilationMode(
  shot: RecommendedShot,
): ProviderCompilationMode {
  if (shot.archetype.shotCategory === "detail") return "detail";
  const pose = derivePoseBucket(
    shot.archetype.poseFamily,
    shot.archetype.primaryDisplayZones,
  );
  if (pose === "product_only") return "product-only";
  return "on-body";
}

// ── F8: Reference Lock Preamble ──
// Hard, concise instruction for Case A (model ref + product ref uploaded).

const REFERENCE_LOCK_PREAMBLE = [
  "Use the uploaded model reference exactly for face, body, and identity.",
  "Use the uploaded product reference exactly for product shape, panel layout, handle design, attachment points, logo placement, and material truth.",
  "Do not redesign, simplify, reinterpret, or invent missing product features.",
  "Same exact object across all 6 shots.",
].join(" ");

function compileReferenceLock(hasProductRef: boolean, hasModelRef?: boolean): string {
  if (!hasProductRef) return "";
  // Full lock when both refs present
  if (hasModelRef !== false) return REFERENCE_LOCK_PREAMBLE;
  // Product-only lock
  return "Use the uploaded product reference exactly for product shape, construction, hardware, logo placement, and material truth. Do not redesign or invent features. Same exact object across all shots.";
}

// ── Compact Product Lock ──
// ~12 words max. Reinforces reference image, not restates it.

export function buildCompactProductLock(
  fp: ProductFingerprint,
): string {
  const parts: string[] = [];

  if (fp.family === "bags") {
    const shape = [fp.silhouetteShape, fp.silhouettePrimary].filter(Boolean).join(" ");
    if (shape) parts.push(`Structured ${shape}`);
    if (fp.handleCount > 0) {
      parts.push(`${fp.handleCount === 1 ? "one" : "two"} ${fp.handleType} handle${fp.handleCount > 1 ? "s" : ""}`);
    }
  } else if (fp.family === "watches") {
    if (fp.caseShape) parts.push(`${fp.caseShape} case`);
    if (fp.strapType) parts.push(`${fp.strapType} strap`);
  } else if (fp.family === "belts") {
    if (fp.beltWidth) parts.push(`${fp.beltWidth} belt`);
    if (fp.buckleType !== "none") parts.push(`${fp.buckleType} buckle`);
  } else if (fp.family === "jewelry") {
    if (fp.jewelryType) parts.push(fp.jewelryType);
    if (fp.dropLength) parts.push(fp.dropLength);
  }

  // Logo treatment
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    const finish = fp.hardwareFinish !== "none" ? fp.hardwareFinish : "";
    parts.push(`${fp.logoScale} ${finish} mark ${fp.logoPlacement}`.replace(/\s+/g, " ").trim());
  }

  return parts.join(", ") + ".";
}

// ── Fingerprint Exclusions ──

export function buildFingerprintExclusions(
  fp: ProductFingerprint,
): string[] {
  const exclusions: string[] = [];

  for (const el of fp.forbiddenElements) {
    exclusions.push(`no ${el}`);
  }

  if (fp.family === "bags") {
    if (!fp.strapPresent) {
      if (!exclusions.some(e => e.includes("strap"))) {
        exclusions.push("no crossbody strap", "no shoulder strap");
      }
    }
    if (fp.closureType === "open-top") {
      if (!exclusions.some(e => e.includes("zipper"))) {
        exclusions.push("no zipper", "no flap closure");
      }
    }
  }

  if (fp.family === "watches") {
    if (fp.bezelType === "fixed-smooth" || fp.bezelType === "none") {
      if (!exclusions.some(e => e.includes("bezel"))) {
        exclusions.push("no rotating bezel");
      }
    }
  }

  return exclusions.slice(0, 8);
}

// ── Branding Negatives ──

const BRANDING_NEGATIVES = "no readable text, no invented logo, no oversized wordmark, no pseudo-text, no fake typography, no mirrored text";

// ── Core Negatives ──

const CORE_NEGATIVES = "distorted anatomy, warped hands, plastic skin, CGI lighting, washed-out HDR";

// ── Family Drift Negatives ──

const COMPRESSED_DRIFT: Record<string, string> = {
  bags: "hardware colour shifting, bag shape morphing, handle count changing",
  watches: "dial indices shifting, crown migrating, case shape changing",
  belts: "buckle shape changing, leather width inconsistent",
  jewelry: "metal colour mismatch, stone count changing",
  eyewear: "lens tint mismatch, frame shape warping",
  footwear: "sole profile changing, lacing pattern inconsistent",
  apparel: "button count changing, collar shape morphing, pattern scale shifting",
  headwear: "crown shape changing, brim width inconsistent",
  scarves: "print pattern scale shifting, fringe length changing",
  small_accessories: "dimensions changing, hardware colour drifting",
  full_look: "layering order changing, colour palette drifting",
};

function compileFamilyDriftNegatives(input: LookbookInput): string {
  return COMPRESSED_DRIFT[input.productFamily] || "";
}

// ── Visibility Cue ──

function compileVisibilityCue(
  shot: RecommendedShot,
  input: LookbookInput,
): string {
  if (!ACCESSORY_FAMILIES.has(input.productFamily)) return "";

  const title = shot.archetype.title.toLowerCase();
  const zones = shot.archetype.primaryDisplayZones?.join(" ").toLowerCase() || "";
  const item = input.specificItem?.toLowerCase() || "";

  if (input.productFamily === "bags") {
    if (title.includes("profile") || title.includes("side") || zones.includes("side")) {
      return "Hardware side visible to camera.";
    }
    return "Bag fully visible and unobstructed.";
  }

  if (input.productFamily === "watches") {
    if (title.includes("wrist") || title.includes("dial")) {
      return "Dial clearly visible, face angled toward camera.";
    }
    return "Watch face visible and unobstructed.";
  }

  if (input.productFamily === "belts") return "Buckle centred and unobstructed.";

  if (input.productFamily === "jewelry") {
    if (item.includes("earring")) return "Both earrings visible.";
    if (item.includes("necklace") || item.includes("pendant")) return "Pendant visible against chest.";
    if (item.includes("bracelet")) return "Bracelet visible on wrist.";
    if (item.includes("ring")) return "Ring visible on hand.";
    return "Jewelry piece fully visible.";
  }

  if (input.productFamily === "eyewear") return "Both lenses visible, frame unobstructed.";

  return "Product fully visible.";
}

// ── Shot Directive ──

function compileShotDirective(shot: RecommendedShot): string {
  const arch = shot.archetype;
  const parts: string[] = [];

  const framing = arch.defaultFraming.split(",")[0].trim().toLowerCase();
  parts.push(framing);

  if (arch.defaultCameraHeight) {
    parts.push(`camera ${arch.defaultCameraHeight.toLowerCase()}`);
  }

  const body = arch.bodyDirection?.toLowerCase() || "";
  const pose = arch.poseFamily?.toLowerCase() || "";
  if (body.includes("profile") || pose.includes("profile")) {
    parts.push("profile angle");
  } else if (body.includes("three-quarter") || body.includes("3/4")) {
    parts.push("three-quarter angle");
  } else if (pose.includes("seated")) {
    parts.push("angled down");
  } else if (body.includes("straight") || body.includes("front")) {
    parts.push("straight on");
  }

  return parts.join(", ") + ".";
}

// ── Product Interaction ──

function compileProductInteraction(
  shot: RecommendedShot,
  fp?: ProductFingerprint,
): string {
  const arch = shot.archetype;
  const mode = detectCompilationMode(shot);

  if (mode === "product-only" || mode === "detail") return "";

  const hand = arch.handBehavior?.toLowerCase() || "";
  const pose = arch.poseFamily?.toLowerCase() || "";
  const parts: string[] = [];

  if (pose.includes("seated")) {
    if (fp?.family === "bags") {
      parts.push("bag resting on lap, visible weight and compression against body");
      if (hand.includes("on") || hand.includes("resting")) {
        parts.push("one hand on bag with natural finger pressure");
      }
    } else if (fp?.family === "watches") {
      parts.push("wrist resting on knee, dial angled toward camera");
    } else {
      parts.push("seated, relaxed posture");
    }
  } else if (pose.includes("walking") || pose.includes("stride")) {
    if (fp?.family === "bags") {
      parts.push("natural stride, bag swinging gently with visible weight");
    } else {
      parts.push("natural stride");
    }
  } else if (pose.includes("profile")) {
    if (fp?.family === "bags") {
      parts.push("bag side facing lens, hand holding handle naturally with visible grip");
    } else if (fp?.family === "watches") {
      parts.push("wrist profile, strap visible");
    } else {
      parts.push("profile stance");
    }
  } else {
    const fam = fp?.family as string | undefined;
    if (fam === "bags") {
      if (hand.includes("side")) {
        parts.push("bag in right hand at side, visible weight in wrist");
      } else if (hand.includes("shoulder")) {
        parts.push("bag on shoulder, strap contact visible");
      } else {
        parts.push("natural stance, bag in hand at side with visible carry weight");
      }
    } else if (fam === "watches") {
      parts.push("wrist visible, natural arm position");
    } else if (fam === "belts") {
      parts.push("hands away from buckle, belt visible at waist");
    } else if (fam === "jewelry") {
      parts.push("natural pose, jewelry visible");
    } else if (fam === "eyewear") {
      parts.push("wearing frames, natural expression");
    } else {
      parts.push("natural stance");
    }
  }

  return parts.join(", ");
}

// ── World Anchor ──

function compileWorldAnchor(world?: ContinuityWorldTokens): string {
  if (!world) return "";
  const parts: string[] = [];
  if (world.backdrop) parts.push(world.backdrop);
  if (world.lighting) parts.push(world.lighting);
  if (world.tonalTemperature) parts.push(world.tonalTemperature);
  return parts.join(". ") + ".";
}

// ── Styling Lock (Case B: model-only, no product reference) ──

function compileStylingLock(world?: ContinuityWorldTokens): string {
  if (!world?.styling) return "";
  return `Same outfit throughout: ${world.styling}. Same silhouette, same colour palette, same accessories, same styling mood across all six shots.`;
}

// ── Derive World Tokens from DNA ──

export function deriveWorldTokensFromDNA(dna: MasterShootDNA): ContinuityWorldTokens {
  const env = dna.environmentFamily.split(":")[0]?.trim() || "neutral studio";
  const light = dna.lightingFamily.split(".")[0]?.trim() || "soft directional light";
  const finish = dna.finishFamily.split(":")[0]?.trim() || "premium finish";

  return {
    backdrop: env.toLowerCase(),
    lighting: light.toLowerCase(),
    tonalTemperature: finish.toLowerCase().includes("warm") ? "warm neutral" : "neutral",
    styling: "",
    modelTokens: "",
  };
}

// ── Compact Family Truth Fallback ──

export function getCompactFallbackLock(
  family: ProductFamily,
  item?: string,
): string {
  const itemLabel = item || family;
  const familyDefaults: Record<string, string> = {
    bags: `${itemLabel}, consistent shape and hardware across all shots`,
    watches: `${itemLabel}, consistent case shape and dial across all shots`,
    belts: `${itemLabel}, consistent buckle and width across all shots`,
    jewelry: `${itemLabel}, consistent metal and stone across all shots`,
    eyewear: `${itemLabel}, consistent frame shape across all shots`,
    apparel: `${itemLabel}, consistent fit and fabric across all shots`,
    footwear: `${itemLabel}, consistent shape and sole across all shots`,
    headwear: `${itemLabel}, consistent crown and brim across all shots`,
    scarves: `${itemLabel}, consistent pattern and drape across all shots`,
    small_accessories: `${itemLabel}, consistent form across all shots`,
  };
  return familyDefaults[family] || `${itemLabel}, consistent across all shots`;
}

// ── Style Tag ──

function compileStyleTag(dna: MasterShootDNA, mode: ProviderCompilationMode): string {
  const style = STYLE_LABELS[dna.targetStyle]?.toLowerCase() || "commercial";
  if (mode === "product-only") return `${style} product photograph, even diffused lighting.`;
  if (mode === "detail") return "Detail photograph, sharp focus.";
  return `${style} fashion photograph, premium matte finish.`;
}

// ── Scale Hints ──

const SCALE_HINTS_ON_BODY: Record<string, string> = {
  bags: "Bag proportional to model's frame, sits at hip height, not miniaturised.",
  watches: "Watch proportional to wrist, strap flush against skin.",
  belts: "Belt proportional to waist, buckle scaled to belt width.",
  jewelry: "Piece proportional to body, natural weight and drape.",
  eyewear: "Frame width matches face at temples, lenses proportional.",
  apparel: "Garment fits as intended, shoulder seams at correct point.",
  footwear: "Shoes proportional to feet, sole thickness matches upper.",
  headwear: "Hat at intended position on head, brim proportional.",
  scarves: "Scarf proportional to torso, drape follows gravity.",
  small_accessories: "Product proportional to hand or body part.",
  full_look: "Each piece fits its own scale, proportions look intentional.",
};

const SCALE_HINTS_PRODUCT_ONLY: Record<string, string> = {
  bags: "Bag fills 60-80% of frame on clean surface.",
  watches: "Watch fills frame, strap laid flat naturally.",
  belts: "Belt fills frame, buckle centred.",
  jewelry: "Piece centred, fills 40-60% of frame.",
  eyewear: "Frames centred, fill 50-70% of frame.",
  apparel: "Garment fills frame, laid flat naturally.",
  footwear: "Shoe fills frame, profile visible.",
  headwear: "Hat fills frame, crown visible.",
  scarves: "Scarf draped naturally, fills frame.",
  small_accessories: "Product centred, fills 40-60% of frame.",
  full_look: "Ensemble fills frame, layering visible.",
};

const SCALE_HINTS_DETAIL: Record<string, string> = {
  bags: "Hardware proportional to handle width.",
  watches: "Detail proportional to case diameter.",
  belts: "Buckle proportional to belt width.",
  jewelry: "Detail proportional to piece.",
  eyewear: "Detail proportional to frame.",
  apparel: "Detail proportional to garment.",
  footwear: "Detail proportional to shoe.",
  headwear: "Detail proportional to crown.",
  scarves: "Detail proportional to fabric width.",
  small_accessories: "Detail proportional to product.",
  full_look: "Detail proportional to piece.",
};

function compileScaleHint(input: LookbookInput, mode: ProviderCompilationMode): string {
  const family = input.productFamily;
  if (mode === "product-only") return SCALE_HINTS_PRODUCT_ONLY[family] || "Product centred in frame.";
  if (mode === "detail") return SCALE_HINTS_DETAIL[family] || "Detail proportional to product.";
  return SCALE_HINTS_ON_BODY[family] || "Product proportional to model.";
}

// ── F8: Bag-Specific Compilers ──
// Each shot class has its own compilation priority stack.

function compileBagProofHero(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const world = input.continuityWorld;
  const blocks: string[] = [];

  // Reference lock (highest priority for proof shots)
  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  // Style tag
  blocks.push(compileStyleTag(dna, "on-body"));

  // Product truth (priority 1)
  if (fp) {
    blocks.push(buildCompactProductLock(fp));
  } else {
    blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
  }

  // Physical plausibility (priority 2)
  if (fp) {
    const constraints = getBagPhysicsConstraints("proof_hero", fp);
    const physics = compilePhysicsBlock(constraints);
    if (physics) blocks.push(physics);
  }

  // Scale hint (priority 3)
  blocks.push(compileScaleHint(input, "on-body"));

  // Shot directive (priority 4)
  blocks.push(compileShotDirective(shot));

  // Visibility
  const visibility = compileVisibilityCue(shot, input);
  if (visibility) blocks.push(visibility);

  // Product interaction
  const interaction = compileProductInteraction(shot, fp);
  if (interaction) blocks.push(interaction + ".");

  // World anchor
  const worldAnchor = compileWorldAnchor(world);
  if (worldAnchor) blocks.push(worldAnchor);

  // Realism normalization (last: camera, lighting, human, material)
  blocks.push(normalizePositive({
    mode: "on-body",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: true,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagProofProfile(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const world = input.continuityWorld;
  const blocks: string[] = [];

  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "on-body"));

  if (fp) {
    blocks.push(buildCompactProductLock(fp));
    const constraints = getBagPhysicsConstraints("proof_profile", fp);
    const physics = compilePhysicsBlock(constraints);
    if (physics) blocks.push(physics);
  } else {
    blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
  }

  blocks.push(compileScaleHint(input, "on-body"));
  blocks.push(compileShotDirective(shot));
  blocks.push("Hardware side visible to camera. Bag side profile shows depth and panel structure.");

  const interaction = compileProductInteraction(shot, fp);
  if (interaction) blocks.push(interaction + ".");

  const worldAnchor = compileWorldAnchor(world);
  if (worldAnchor) blocks.push(worldAnchor);

  blocks.push(normalizePositive({
    mode: "on-body",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: true,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagProofMacroConstruction(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const blocks: string[] = [];

  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "detail"));

  // ONE primary proof target (not a laundry list)
  if (fp) {
    blocks.push(buildDetailFocus("proof_macro_construction", fp));
    const constraints = getBagPhysicsConstraints("proof_macro_construction", fp);
    const physics = compilePhysicsBlock(constraints);
    if (physics) blocks.push(physics);
  } else {
    blocks.push("Close-up of construction detail and material texture.");
  }

  blocks.push(compileScaleHint(input, "detail"));

  // Normalised camera + lighting for macro
  blocks.push(normalizePositive({
    mode: "detail",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagProofMacroAttachment(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const blocks: string[] = [];

  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "detail"));

  // ONE primary proof target
  if (fp) {
    blocks.push(buildDetailFocus("proof_macro_attachment_or_brand_zone", fp));
    const constraints = getBagPhysicsConstraints("proof_macro_attachment_or_brand_zone", fp);
    const physics = compilePhysicsBlock(constraints);
    if (physics) blocks.push(physics);
  } else {
    blocks.push("Close-up of hardware attachment point and branding zone.");
  }

  // Branding protection
  if (fp && fp.logoScale !== "none") {
    blocks.push("Preserve logo zone, scale, and treatment. Do not beautify or relocate the mark.");
  }

  blocks.push(compileScaleHint(input, "detail"));

  blocks.push(normalizePositive({
    mode: "detail",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagProofOpenTop(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const blocks: string[] = [];

  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "product-only"));

  if (fp) {
    blocks.push(buildCompactProductLock(fp));
    blocks.push(buildDetailFocus("proof_open_top_or_capacity", fp));
    const constraints = getBagPhysicsConstraints("proof_open_top_or_capacity", fp);
    const physics = compilePhysicsBlock(constraints);
    if (physics) blocks.push(physics);
  } else {
    blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
    blocks.push("Open-top view showing interior capacity and construction.");
  }

  blocks.push(compileScaleHint(input, "product-only"));

  const world = input.continuityWorld;
  if (world?.backdrop) {
    blocks.push(world.backdrop + ".");
  } else {
    blocks.push("Clean white surface.");
  }

  blocks.push(normalizePositive({
    mode: "product-only",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagEditorialDesire(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const world = input.continuityWorld;
  const blocks: string[] = [];

  // Reference lock (still present but product accuracy is priority 1, not all-consuming)
  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "on-body"));

  // Product still accurate (priority 1)
  if (fp) {
    blocks.push(buildCompactProductLock(fp));
  } else {
    blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
  }

  // Body-object relationship (priority 2)
  const interaction = compileProductInteraction(shot, fp);
  if (interaction) blocks.push(interaction + ".");

  // Physics (priority 2b)
  if (fp) {
    const constraints = getBagPhysicsConstraints("editorial_desire", fp);
    const physics = compilePhysicsBlock(constraints);
    if (physics) blocks.push(physics);
  }

  // Shot directive (priority 3: believable fashion mood)
  blocks.push(compileShotDirective(shot));
  blocks.push(compileScaleHint(input, "on-body"));

  // Visibility
  const visibility = compileVisibilityCue(shot, input);
  if (visibility) blocks.push(visibility);

  // World anchor (priority 4: atmosphere)
  const worldAnchor = compileWorldAnchor(world);
  if (worldAnchor) blocks.push(worldAnchor);

  // Styling lock for Case B
  if (!hasProductRef) {
    const stylingLock = compileStylingLock(world);
    if (stylingLock) blocks.push(stylingLock);
  }

  // Human realism normalization (priority 5)
  blocks.push(normalizePositive({
    mode: "on-body",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: true,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

// ── Generic (non-bag) Compilers ──
// For families that don't yet have shot-class-specific compilers.

function compileGenericOnBody(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint;
  const world = input.continuityWorld;
  const isAccessory = ACCESSORY_FAMILIES.has(input.productFamily);
  const blocks: string[] = [];

  // Reference lock
  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "on-body"));

  if (isAccessory) {
    if (fp) {
      blocks.push(buildCompactProductLock(fp));
    } else {
      blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
    }
    blocks.push(compileScaleHint(input, "on-body"));
    blocks.push(compileShotDirective(shot));
    const visibility = compileVisibilityCue(shot, input);
    if (visibility) blocks.push(visibility);
    const interaction = compileProductInteraction(shot, fp);
    if (interaction) blocks.push(interaction + ".");
    const worldAnchor = compileWorldAnchor(world);
    if (worldAnchor) blocks.push(worldAnchor);
  } else {
    blocks.push(compileShotDirective(shot));
    if (fp) {
      blocks.push(buildCompactProductLock(fp));
    } else if (!hasProductRef) {
      const stylingLock = compileStylingLock(world);
      if (stylingLock) blocks.push(stylingLock);
    } else {
      blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
    }
    blocks.push(compileScaleHint(input, "on-body"));
    const worldAnchor = compileWorldAnchor(world);
    if (worldAnchor) blocks.push(worldAnchor);
  }

  if (!hasProductRef && isAccessory) {
    const stylingLock = compileStylingLock(world);
    if (stylingLock) blocks.push(stylingLock);
  }

  // F8: Realism normalization
  blocks.push(normalizePositive({
    mode: "on-body",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: true,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileGenericProductOnly(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint;
  const blocks: string[] = [];

  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "product-only"));

  if (fp) {
    blocks.push(buildCompactProductLock(fp));
    if ("constructionStyle" in fp && fp.constructionStyle) {
      blocks.push(`${fp.constructionStyle} construction.`);
    }
  } else {
    blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
  }

  blocks.push(compileScaleHint(input, "product-only"));

  const world = input.continuityWorld;
  if (world?.backdrop) {
    blocks.push(world.backdrop + ".");
  } else {
    blocks.push("Clean white surface.");
  }

  blocks.push(compileShotDirective(shot));

  // F8: Realism normalization
  blocks.push(normalizePositive({
    mode: "product-only",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileGenericDetail(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint;
  const blocks: string[] = [];

  const refLock = compileReferenceLock(hasProductRef);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "detail"));

  // Detail zone (generic fallback for non-bag families)
  blocks.push(compileDetailZoneGeneric(shot, fp));
  blocks.push(compileScaleHint(input, "detail"));

  // F8: Realism normalization
  blocks.push(normalizePositive({
    mode: "detail",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

// ── Generic Detail Zone (non-bag families) ──

function compileDetailZoneGeneric(shot: RecommendedShot, fp?: ProductFingerprint): string {
  const arch = shot.archetype;
  const title = arch.title.toLowerCase();

  if (title.includes("hardware")) {
    if (fp?.family === "bags") {
      const attachment = (fp as BagFingerprint).handleAttachment || "hardware";
      const material = fp.materialColour || "leather";
      return `Close-up of ${attachment} on ${fp.materialFinish || "smooth"} ${material}. ${fp.hardwareFinish !== "none" ? fp.hardwareFinish + " finish." : ""}`;
    }
    return "Close-up of hardware detail.";
  }

  if (title.includes("construction") || title.includes("texture")) {
    if (fp) {
      return `Close-up of ${(fp as any).constructionStyle || "construction"} on ${fp.materialFinish || ""} ${fp.materialColour || ""} surface.`.replace(/\s+/g, " ");
    }
    return "Close-up of construction detail and material texture.";
  }

  if (title.includes("logo")) {
    if (fp && fp.logoScale !== "none") {
      return `Close-up of ${fp.logoScale} ${fp.hardwareFinish !== "none" ? fp.hardwareFinish : ""} ${fp.logoStyle !== "none" ? fp.logoStyle : ""} mark at ${fp.logoPlacement}.`.replace(/\s+/g, " ");
    }
    return "Close-up of branding detail.";
  }

  if (title.includes("dial")) {
    if (fp?.family === "watches") {
      return `Close-up of ${fp.dialColour} ${fp.dialType} dial. ${fp.caseShape} case.`;
    }
    return "Close-up of watch dial.";
  }

  return `Close-up of ${arch.role.split(".")[0]?.toLowerCase() || "product detail"}.`;
}

// ── Negative Prompt Compiler ──

export function compileProviderNegative(
  shot: RecommendedShot,
  input: LookbookInput,
  mode: ProviderCompilationMode,
  hasProductRef?: boolean,
  shotClass?: BagShotClass,
): string {
  const parts: string[] = [];

  // Mode-specific prefix
  if (mode === "product-only") {
    parts.push("no model, no hands, no person");
  } else if (mode === "detail") {
    parts.push("no full body, no face, no background elements");
  }

  // Core negatives
  parts.push(CORE_NEGATIVES);

  // Fingerprint exclusions
  const fp = input.productFingerprint;
  if (fp) {
    const exclusions = buildFingerprintExclusions(fp);
    if (exclusions.length > 0) {
      parts.push(exclusions.join(", "));
    }
  }

  // Family drift negatives
  const drift = compileFamilyDriftNegatives(input);
  if (drift) parts.push(drift);

  // Branding negatives
  parts.push(BRANDING_NEGATIVES);

  // F8: Physics negatives for bag shots
  if (fp?.family === "bags" && shotClass) {
    const constraints = getBagPhysicsConstraints(shotClass, fp as BagFingerprint);
    const physicsNeg = compilePhysicsNegatives(constraints);
    if (physicsNeg) parts.push(physicsNeg);
  }

  // F8: Realism negatives
  const realismNeg = normalizeNegative({
    mode,
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: mode === "on-body",
  });
  if (realismNeg) parts.push(realismNeg);

  // Case B: styling consistency negatives
  if (hasProductRef === false && mode === "on-body") {
    parts.push("outfit change, different clothing, different accessories");
  }

  return parts.join(", ");
}

// ── Main Entry Point ──

export function compileProviderPrompt(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): ProviderPromptOutput {
  const mode = detectCompilationMode(shot);
  const isBag = input.productFamily === "bags";
  let shotClass: BagShotClass | undefined;

  let positive: string;

  if (isBag) {
    // F8: Bag-specific compilers with proof/editorial split
    shotClass = classifyBagShot(shot);

    switch (shotClass) {
      case "proof_hero":
        positive = compileBagProofHero(shot, dna, input, hasProductRef);
        break;
      case "proof_profile":
        positive = compileBagProofProfile(shot, dna, input, hasProductRef);
        break;
      case "proof_macro_construction":
        positive = compileBagProofMacroConstruction(shot, dna, input, hasProductRef);
        break;
      case "proof_macro_attachment_or_brand_zone":
        positive = compileBagProofMacroAttachment(shot, dna, input, hasProductRef);
        break;
      case "proof_open_top_or_capacity":
        positive = compileBagProofOpenTop(shot, dna, input, hasProductRef);
        break;
      case "editorial_desire":
        positive = compileBagEditorialDesire(shot, dna, input, hasProductRef);
        break;
    }
  } else {
    // Generic compilers for non-bag families (with F8 realism normalization)
    switch (mode) {
      case "on-body":
        positive = compileGenericOnBody(shot, dna, input, hasProductRef);
        break;
      case "product-only":
        positive = compileGenericProductOnly(shot, dna, input, hasProductRef);
        break;
      case "detail":
        positive = compileGenericDetail(shot, dna, input, hasProductRef);
        break;
    }
  }

  const negative = compileProviderNegative(shot, input, mode, hasProductRef, shotClass);

  // F8: Run deterministic critic
  const criticResult = runProviderCritic({
    positive,
    negative,
    mode,
    fp: input.productFingerprint,
    shotClass,
  });

  // Use cleaned prompt from critic
  const finalPositive = criticResult.cleanedPositive;

  // Return base ProviderPromptOutput (V2 fields available via cast)
  const result: ProviderPromptOutputV2 = {
    positive: finalPositive,
    negative: criticResult.cleanedNegative,
    mode,
    wordCount: finalPositive.split(/\s+/).length,
    shotClass,
    criticViolations: criticResult.violations,
    normalized: true,
  };

  return result;
}

// ── Clipboard Formats ──

export function formatProviderForClipboard(
  pkg: { shotPosition: number; archetypeTitle: string; providerPrompt?: ProviderPromptOutput },
): string {
  const pp = pkg.providerPrompt;
  if (!pp) return "";

  return [
    `SHOT ${pkg.shotPosition}: ${pkg.archetypeTitle.toUpperCase()}`,
    "",
    "Positive prompt:",
    pp.positive,
    "",
    "Negative prompt:",
    pp.negative,
  ].join("\n");
}

export function formatProviderQueueForClipboard(
  pkgs: { shotPosition: number; archetypeTitle: string; providerPrompt?: ProviderPromptOutput }[],
  input: LookbookInput,
): string {
  const header = `LOOKBOOK GENERATION QUEUE\nProduct: ${input.specificItem || input.productFamily} (${input.productFamily}) | Style: ${STYLE_LABELS[input.targetStyle]} | ${pkgs.length} shots`;

  const shots = pkgs
    .filter(p => p.providerPrompt)
    .map(p => formatProviderForClipboard(p))
    .join("\n\n---\n\n");

  return `${header}\n\n---\n\n${shots}`;
}
