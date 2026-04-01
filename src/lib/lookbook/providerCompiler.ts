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
  ShotWorldSlice,
  ProviderPromptOutput,
  ProviderPromptConfig,
  ProviderCompilationMode,
  ProviderPromptOutputV2,
  ProductFamily,
  BagShotClass,
  SurfaceTone,
  EmotionalRegister,
  SecondaryObjectPolicy,
  LightAttitude,
  EditorialBeat,
} from "./types";
import { STYLE_LABELS, PRODUCT_FAMILY_LABELS } from "./types";
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
} from "./realismNormalizer";
import { runProviderCritic } from "./providerCritic";
import { deriveShotWorldSlice } from "./worldProfiles";
import { deriveApparelSubtype, APPAREL_SUBTYPE_LOCK } from "./apparelSubtypes";
import { normalizeSubtypeKey, resolveArchetypeRole } from "./shotBlueprints";

// ── Default Provider Config ──

export const HIGGSFIELD_CONFIG: ProviderPromptConfig = {
  provider: "higgsfield",
  model: "nano_banana_pro",
  maxPromptWords: 150, // F8: raised from 120 for bag shots
  renderLogoText: false,
};

// ── Accessory-Led Families ──

const ACCESSORY_FAMILIES: Set<ProductFamily> = new Set([
  "bags", "watches", "belts", "jewelry", "eyewear",
]);

// ── Prompt Hygiene ──

/** Fix blank template variables, double spaces, and malformed phrases in compiled prompts. */
function sanitizePromptText(text: string): string {
  return text
    .replace(/\bon\s*,/g, "on the")    // "on ," -> "on the"
    .replace(/\bof\s+on\b/g, "of")     // "of on" -> "of"
    .replace(/\s{2,}/g, " ")           // collapse multiple spaces
    .replace(/\.\s*\./g, ".")          // collapse double periods
    .trim();
}

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

// ── Shot-aware realism config helpers ──

function getShotCameraHeight(shot: RecommendedShot): string | undefined {
  return shot.archetype.defaultCameraHeight || undefined;
}

function getShotCameraLens(shot: RecommendedShot): string | undefined {
  return shot.archetype.defaultLens || undefined;
}

function getShotCameraAperture(shot: RecommendedShot): string | undefined {
  return shot.archetype.defaultAperture || undefined;
}

function getShotCameraDistance(shot: RecommendedShot): string | undefined {
  return shot.archetype.defaultCameraDistance || undefined;
}

function getShotLighting(shot: RecommendedShot): string | undefined {
  return shot.archetype.defaultLighting || undefined;
}

function isShotMotion(shot: RecommendedShot): boolean {
  const arch = shot.archetype;
  return arch.movementSuitability === "high" || arch.shotCategory === "motion";
}

function getShotGazeDirection(shot: RecommendedShot): string | undefined {
  const head = shot.archetype.headDirection;
  if (!head || head === "N/A" || head.toLowerCase().includes("not visible")) return undefined;
  return head;
}

// ── F9: Identity Lock Tiers ──
// Shot-class-specific identity strength. Anchor/hero gets strongest lock.

type IdentityLockTier = "strong" | "medium" | "light" | "none";

function deriveIdentityLockTier(shot: RecommendedShot, hasModelRef: boolean, input?: LookbookInput): IdentityLockTier {
  // No model reference = no identity lock regardless of shot class
  if (!hasModelRef) return "none";

  const mode = detectCompilationMode(shot);
  if (mode === "product-only") return "none";

  // Detail shots: accessory families (bags, watches, jewelry, etc.) are product-only
  // details that don't need a body. Apparel/footwear/scarves details (neckline, hem,
  // collar) need the garment on a body to show drape and fit.
  if (mode === "detail") {
    if (input && ACCESSORY_FAMILIES.has(input.productFamily)) return "none";
    return "light";
  }

  const cat = shot.archetype.shotCategory;
  if (cat === "hero") return "strong";
  if (cat === "product_focus" || cat === "silhouette") return "medium";
  if (cat === "motion" || cat === "editorial") return "light";
  return "medium";
}

// ── Hair Visibility Profile ──
// Rule-based v1 implementation. When vision structural hints are available,
// they should refine this. Current logic uses bodyDirection, title, display
// zones, and pose bucket inference, which is approximate.

interface HairVisibilityProfile {
  visible: boolean;
  frontal: boolean;            // true frontal (straight/front)
  threeQuarterVisible: boolean; // 3/4 angle, weaker than true frontal
  sideVisible: boolean;
  backVisible: boolean;
  occluded: boolean;           // hair hidden by headwear etc.
}

function isFaceVisible(shot: RecommendedShot): boolean {
  const arch = shot.archetype;
  const body = arch.bodyDirection?.toLowerCase() || "";
  const zones = [...arch.primaryDisplayZones, ...arch.secondaryDisplayZones].map(z => z.toLowerCase());

  if (body.includes("back")) return false;
  if (zones.includes("face") || zones.includes("full_body") || zones.includes("upper_body")) return true;
  if (body.includes("profile") || body.includes("side")) return true;
  return false;
}

function deriveHairVisibility(shot: RecommendedShot): HairVisibilityProfile {
  const arch = shot.archetype;
  const body = arch.bodyDirection?.toLowerCase() || "";
  const zones = [...arch.primaryDisplayZones, ...arch.secondaryDisplayZones].map(z => z.toLowerCase());
  const title = (shot.resolvedTitle ?? arch.title).toLowerCase();

  const isBack = body.includes("back") || title.includes("back");
  const isTrueFrontal = body.includes("straight") || body.includes("front") || body.includes("square");
  const isThreeQuarter = body.includes("3/4") || body.includes("three-quarter");
  const isProfile = body.includes("profile") || body.includes("side");
  const isDetailOrProductOnly =
    arch.shotCategory === "detail" ||
    derivePoseBucket(arch.poseFamily, arch.primaryDisplayZones) === "product_only";
  const faceZone = zones.includes("face") || zones.includes("full_body") || zones.includes("upper_body");

  return {
    visible: !isDetailOrProductOnly && (isTrueFrontal || isThreeQuarter || isProfile || isBack || faceZone),
    frontal: isTrueFrontal && faceZone,
    threeQuarterVisible: isThreeQuarter && faceZone,
    sideVisible: isProfile,
    backVisible: isBack,
    occluded: false, // Can be enhanced with headwear detection later
  };
}

// ── Hair Lock (visibility-aware) ──

function compileHairLock(tier: IdentityLockTier, profile: HairVisibilityProfile): string {
  if (tier === "none" || !profile.visible) return "";

  // Strong tier: true frontal gets the heaviest lock
  if (tier === "strong" && profile.frontal) {
    return (
      "Hair: match reference exactly for colour, parting side, length, texture, and volume. " +
      "Preserve wear state around ears and shoulders. " +
      "Do not recolour, restyle, shorten, curl, straighten, or re-part."
    );
  }

  // Strong tier: three-quarter gets strong but slightly lighter lock
  if (tier === "strong" && profile.threeQuarterVisible) {
    return "Hair: match reference colour, length, texture, and volume. Parting side consistent. Natural movement allowed.";
  }

  if (tier === "strong" && profile.sideVisible) {
    return "Hair: match reference colour, length, and texture. Natural movement allowed.";
  }

  if (tier === "strong" && profile.backVisible) {
    return "Hair: match reference colour, length, and overall silhouette from behind.";
  }

  if (tier === "medium") {
    return "Hair: match reference colour, parting, and length. Natural movement allowed.";
  }

  // light
  return "Hair: same colour and approximate length as reference.";
}

// ── Model Identity Lock (structured sub-blocks) ──

function compileModelIdentityLock(
  tier: IdentityLockTier,
  hairProfile: HairVisibilityProfile,
  shot: RecommendedShot,
): string {
  if (tier === "none") return "";

  const blocks: string[] = [];
  const faceVisible = isFaceVisible(shot);
  const bodyVisible = detectCompilationMode(shot) === "on-body";

  // Face sub-block (priority 1)
  if (faceVisible) {
    const faceLock: Record<Exclude<IdentityLockTier, "none">, string> = {
      strong: "Face: match reference exactly for bone structure, skin tone, eye shape, nose bridge, and lip shape.",
      medium: "Face: match reference for bone structure, skin tone, and proportions.",
      light: "Face: same person as reference, natural expression allowed.",
    };
    blocks.push(faceLock[tier]);
  }

  // Hair sub-block (priority 2, visibility-aware)
  const hairLock = compileHairLock(tier, hairProfile);
  if (hairLock) blocks.push(hairLock);

  // Body sub-block (priority 4, may be dropped under budget pressure)
  if (bodyVisible) {
    const bodyLock: Record<Exclude<IdentityLockTier, "none">, string> = {
      strong: "Body: match reference build, skin tone, and proportions exactly.",
      medium: "Body: match reference build and skin tone.",
      light: "Body: same build as reference.",
    };
    blocks.push(bodyLock[tier]);
  }

  // Gaze is handled by the realism normalizer (compileHumanRealismBlock),
  // not duplicated here in identity lock.

  // Budget-priority enforcement: if identity lock is getting long,
  // drop body sub-block. Face + hair always survive.
  const MAX_IDENTITY_WORDS = 80;
  let result = blocks.filter(Boolean).join(" ");
  if (result.split(/\s+/).length > MAX_IDENTITY_WORDS && blocks.length > 2) {
    // Drop body (lowest priority among remaining sub-blocks)
    const bodyIdx = blocks.findIndex(b => b.startsWith("Body:"));
    if (bodyIdx >= 0) blocks.splice(bodyIdx, 1);
    result = blocks.filter(Boolean).join(" ");
  }

  return result;
}

// ── F9: Family-Native Product Reference Locks ──
// Each family gets product-specific reference instruction derived from
// FAMILY_PRODUCT_TRUTH invariants. Apparel uses subtype-specific locks.

const FAMILY_REFERENCE_LOCK: Record<ProductFamily, string> = {
  bags: "Use the uploaded product reference exactly for bag shape, panel layout, handle design, attachment points, logo placement, and material truth.",
  watches: "Use the uploaded product reference exactly for case shape, dial layout, crown position, bezel markings, strap width, and material finish.",
  jewelry: "Use the uploaded product reference exactly for metal colour, stone count, setting style, chain pattern, and clasp design.",
  eyewear: "Use the uploaded product reference exactly for frame shape, bridge width, lens tint, temple style, and hinge design.",
  belts: "Use the uploaded product reference exactly for buckle shape, prong count, leather width, edge paint, and stitching pattern.",
  footwear: "Use the uploaded product reference exactly for shoe silhouette, sole profile, lacing system, upper construction, and heel tab.",
  apparel: "Use the uploaded product reference exactly for silhouette, neckline/opening, sleeve/strap, closure, hem, and fabric behaviour.",
  headwear: "Use the uploaded product reference exactly for crown shape, brim width, band placement, and material texture.",
  scarves: "Use the uploaded product reference exactly for print pattern, fringe detail, fabric weight, and edge hemming.",
  small_accessories: "Use the uploaded product reference exactly for product dimensions, material finish, hardware, and clasp mechanism.",
  full_look: "Use the uploaded product reference exactly for each piece's shape, colour, and construction. Maintain layering order.",
};

function compileFamilyReferenceLock(input: LookbookInput): string {
  if (input.productFamily === "apparel") {
    const subtype = deriveApparelSubtype(input);
    return APPAREL_SUBTYPE_LOCK[subtype];
  }
  return FAMILY_REFERENCE_LOCK[input.productFamily];
}

// ── Reference Lock (combines identity + product) ──

function compileReferenceLock(
  hasProductRef: boolean,
  identityTier: IdentityLockTier,
  hairProfile: HairVisibilityProfile,
  shot: RecommendedShot,
  input: LookbookInput,
): string {
  if (!hasProductRef && identityTier === "none") return "";

  const blocks: string[] = [];

  // Hero product identification sentence
  const familyLabel = PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();
  if (input.specificItem) {
    blocks.push(`The hero product is the ${input.specificItem}.`);
  } else {
    blocks.push(`The hero product is a ${familyLabel} piece.`);
  }

  // Model identity (tiered, sub-blocked, visibility-aware)
  const identityLock = compileModelIdentityLock(identityTier, hairProfile, shot);
  if (identityLock) blocks.push(identityLock);

  // Product reference (family-native, apparel-subtype-aware)
  if (hasProductRef) {
    blocks.push(compileFamilyReferenceLock(input));
    blocks.push("Do not redesign, simplify, or invent missing product features.");
  }

  return blocks.join(" ");
}

// ── Anchor Contradiction Scrubber ──
// Runs BEFORE critic so critic evaluates the cleaned prompt.
// TODO: Suppress contradictions at builder level rather than relying on regex cleanup.

function scrubAnchorContradictions(
  positive: string,
  negative: string,
  shot: RecommendedShot,
): { positive: string; negative: string } {
  const cat = shot.archetype.shotCategory;
  if (cat !== "hero") return { positive, negative };

  const body = shot.archetype.bodyDirection?.toLowerCase() || "";
  const gaze = shot.archetype.headDirection?.toLowerCase() || "";
  const isStatic = !isShotMotion(shot);
  const isFrontal = body.includes("straight") || body.includes("front") || body.includes("square");

  // 1. Gaze contradictions
  if (isFrontal) {
    negative = negative.replace(/,?\s*direct lens stare/g, "");
  }
  if (gaze && !gaze.includes("n/a")) {
    negative = negative.replace(/,?\s*fixed AI stare/g, "");
  }

  // 2. Motion contradictions for static seller
  if (isStatic) {
    positive = positive.replace(/\bslight movement\b/gi, "");
    positive = positive.replace(/\bgentle sway\b/gi, "");
    positive = positive.replace(/\bmid-stride\b/gi, "");
    positive = positive.replace(/\bwalking\b/gi, "standing");
  }

  // 3. Editorial energy contradictions for static frontal seller
  if (isStatic && isFrontal) {
    positive = positive.replace(/\bstrong twist\b/gi, "");
    positive = positive.replace(/\bdramatic rotation\b/gi, "");
    positive = positive.replace(/\bexpressive gesture\b/gi, "");
  }

  // 4. Framing contradictions (full-body should not have crop language)
  const framing = shot.archetype.defaultFraming?.toLowerCase() || "";
  if (framing.includes("full")) {
    positive = positive.replace(/\btight crop\b/gi, "");
    positive = positive.replace(/\bclose crop\b/gi, "");
  }

  // Clean up double spaces from removals
  positive = positive.replace(/\s{2,}/g, " ").trim();
  negative = negative
    .replace(/\s{2,}/g, " ")
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "")
    .trim();

  return { positive, negative };
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
  } else if (fp.family === "eyewear") {
    if (fp.eyewearType) parts.push(fp.eyewearType);
    if (fp.frameShape && fp.frameMaterial) {
      parts.push(`${fp.frameShape} ${fp.frameMaterial} frame`);
    } else if (fp.frameShape) {
      parts.push(`${fp.frameShape} frame`);
    }
    if (fp.lensType && fp.lensColour) {
      parts.push(`${fp.lensType} ${fp.lensColour} lenses`);
    } else if (fp.lensType) {
      parts.push(`${fp.lensType} lenses`);
    }
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

const CORE_NEGATIVES = "distorted anatomy, warped hands, plastic skin, CGI lighting, washed-out HDR, exaggerated bokeh, artificial background, over-bright exposure, flat contrast, lifted shadows";

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

  const title = (shot.resolvedTitle ?? shot.archetype.title).toLowerCase();
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

// ── Shot Directive + Pose ──

function compileShotDirective(shot: RecommendedShot, emotionalRegister?: EmotionalRegister, editorialBeat?: EditorialBeat): string {
  const arch = shot.archetype;
  const framingParts: string[] = [];

  const framing = arch.defaultFraming.split(",")[0].trim().toLowerCase();
  framingParts.push(framing);

  if (arch.defaultCameraHeight) {
    framingParts.push(`camera ${arch.defaultCameraHeight.toLowerCase()}`);
  }

  const body = arch.bodyDirection?.toLowerCase() || "";
  const pose = arch.poseFamily?.toLowerCase() || "";
  if (body.includes("profile") || pose.includes("profile")) {
    framingParts.push("profile angle");
  } else if (body.includes("three-quarter") || body.includes("3/4")) {
    framingParts.push("three-quarter angle");
  } else if (pose.includes("seated")) {
    framingParts.push("angled down");
  } else if (body.includes("straight") || body.includes("front") || body.includes("square")) {
    framingParts.push("straight on");
  }

  // Use deltaBlueprint as pose direction: it's written in natural
  // photographic language that image generators understand, rather than
  // the decomposed clinical fields (poseFamily, handBehavior, etc.)
  const framingStr = framingParts.join(", ") + ".";
  const base = arch.deltaBlueprint ? `${framingStr} ${arch.deltaBlueprint}` : framingStr;

  // Append taste-driven emotional modifier for on-body shots
  // Beat-specific modifiers take priority when an editorial beat is present
  if (emotionalRegister) {
    if (editorialBeat) {
      return `${base} ${BEAT_EMOTIONAL_MODIFIERS[editorialBeat][emotionalRegister]}`;
    }
    return `${base} ${EMOTIONAL_REGISTER_MODIFIER[emotionalRegister]}`;
  }
  return base;
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

// ── World Anchor (environment-only, no styling/brand/grooming) ──

function compileWorldAnchor(slice: ShotWorldSlice): string {
  const parts = [slice.backdropClause, slice.groundClause, slice.lightingClause].filter(Boolean);
  if (slice.interactionClause) parts.push(slice.interactionClause);
  if (!parts.length) return "";
  return parts.join(". ") + ".";
}

// ── Styling Lock (Case B: model-only, no product reference) ──
// Sources from brandGuidelines, not from world tokens.

function compileStylingLock(brandGuidelines?: string): string {
  if (!brandGuidelines) return "";
  return `${brandGuidelines} Maintain this exact silhouette, colour palette, accessories, and styling mood.`;
}

// ── Compact Family Truth Fallback ──

export function getCompactFallbackLock(
  family: ProductFamily,
  item?: string,
): string {
  const itemLabel = item || family;
  const familyDefaults: Record<string, string> = {
    bags: `${itemLabel}, match reference shape and hardware exactly`,
    watches: `${itemLabel}, match reference case shape and dial exactly`,
    belts: `${itemLabel}, match reference buckle and width exactly`,
    jewelry: `${itemLabel}, match reference metal and stone exactly`,
    eyewear: `${itemLabel}, match reference frame shape exactly`,
    apparel: `${itemLabel}, match reference fit and fabric exactly`,
    footwear: `${itemLabel}, match reference shape and sole exactly`,
    headwear: `${itemLabel}, match reference crown and brim exactly`,
    scarves: `${itemLabel}, match reference pattern and drape exactly`,
    small_accessories: `${itemLabel}, match reference form exactly`,
  };
  return familyDefaults[family] || `${itemLabel}, match reference exactly`;
}

// ── Style Tag ──

const SURFACE_TONE_FINISH: Record<SurfaceTone, string> = {
  tactile: "natural grain finish, visible texture",
  polished: "premium matte finish",
  hard: "sharp contrast finish, clean edges",
  soft: "soft tonal finish, gentle transitions",
};

function compileStyleTag(dna: MasterShootDNA, mode: ProviderCompilationMode): string {
  const style = STYLE_LABELS[dna.targetStyle]?.toLowerCase() || "commercial";
  if (mode === "product-only") return `${style} product photograph, even diffused lighting.`;
  if (mode === "detail") return "Detail photograph, sharp focus.";
  const finish = SURFACE_TONE_FINISH[dna.tasteBridge.surfaceTone] ?? "premium matte finish";
  return `${style} fashion photograph, ${finish}.`;
}

// ── Emotional Register Modifier ──

const EMOTIONAL_REGISTER_MODIFIER: Record<EmotionalRegister, string> = {
  sensual: "Emphasise softness, intimacy, and fabric movement.",
  confident: "Emphasise structure, precision, and clean posture.",
  quiet: "Keep the mood understated and calm.",
  sharp: "Emphasise edge, contrast, and visual tension.",
};

// Beat-specific emotional modifiers: when an editorial beat is present,
// the modifier is shaped by both the beat's narrative role AND the emotional register.
const BEAT_EMOTIONAL_MODIFIERS: Record<EditorialBeat, Record<EmotionalRegister, string>> = {
  establish: {
    sensual: "Open with presence, let the body and fabric announce the mood.",
    confident: "Open with authority, clean stance, full product clarity.",
    quiet: "Open with stillness, let the product speak first.",
    sharp: "Open with impact, strong line, immediate visual claim.",
  },
  build: {
    sensual: "Introduce tension through a new angle, fabric catching differently.",
    confident: "Shift perspective to reveal structure from a contrasting angle.",
    quiet: "Turn slowly, let a new line emerge without force.",
    sharp: "Cut to profile or rear, reveal a harder edge.",
  },
  pivot: {
    sensual: "Draw closer, let intimacy shift the framing.",
    confident: "Reframe with precision, tighter crop showing control.",
    quiet: "Soften the framing, allow a moment of reframing.",
    sharp: "Snap to a new energy, tighter angle with visual friction.",
  },
  breathe: {
    sensual: "Settle into rest, fabric pooling, body at ease.",
    confident: "Pause with composure, seated or leaning with intention.",
    quiet: "Let the stillness hold, body resting in the environment.",
    sharp: "Controlled pause, tension in stillness rather than motion.",
  },
  resolve: {
    sensual: "Move through the space, fabric responding to the body in motion.",
    confident: "Stride with purpose, the product in dynamic clarity.",
    quiet: "Drift gently, motion as resolution rather than energy.",
    sharp: "Push through, motion as decisive release.",
  },
  reveal: {
    sensual: "Close on texture, let the surface become intimate.",
    confident: "Close on construction, proving quality and precision.",
    quiet: "Close gently, detail as quiet evidence.",
    sharp: "Close hard, the product under scrutiny.",
  },
};

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
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const worldSlice = deriveShotWorldSlice(dna.worldProfile, shot);
  const blocks: string[] = [];

  // Reference lock (highest priority for proof shots)
  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
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
  blocks.push(compileShotDirective(shot, dna.tasteBridge.emotionalRegister, shot.editorialBeat));

  // Visibility
  const visibility = compileVisibilityCue(shot, input);
  if (visibility) blocks.push(visibility);

  // Product interaction
  const interaction = compileProductInteraction(shot, fp);
  if (interaction) blocks.push(interaction + ".");

  // World anchor
  const worldAnchor = compileWorldAnchor(worldSlice);
  if (worldAnchor) blocks.push(worldAnchor);

  // Realism normalization (last: camera, lighting, human, material)
  // Hero shots use compressed realism to free prompt budget for identity lock
  blocks.push(normalizePositive({
    mode: "on-body",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: true,
    cameraHeight: getShotCameraHeight(shot),
    cameraLens: getShotCameraLens(shot),
    cameraAperture: getShotCameraAperture(shot),
    cameraDistance: getShotCameraDistance(shot),
    lightingDirection: getShotLighting(shot) || dna.worldProfile.lightingDescription || undefined,
    lightAttitude: dna.tasteBridge.lightAttitude,
    lightingConsistency: dna.lightingConsistency,
    isMotionShot: isShotMotion(shot),
    gazeDirection: getShotGazeDirection(shot),
    compressionLevel: "compressed",
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagProofProfile(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const worldSlice = deriveShotWorldSlice(dna.worldProfile, shot);
  const blocks: string[] = [];

  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
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
  blocks.push(compileShotDirective(shot, dna.tasteBridge.emotionalRegister, shot.editorialBeat));
  blocks.push("Hardware side visible to camera. Bag side profile shows depth and panel structure.");

  const interaction = compileProductInteraction(shot, fp);
  if (interaction) blocks.push(interaction + ".");

  const worldAnchor = compileWorldAnchor(worldSlice);
  if (worldAnchor) blocks.push(worldAnchor);

  blocks.push(normalizePositive({
    mode: "on-body",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: true,
    cameraHeight: getShotCameraHeight(shot),
    cameraLens: getShotCameraLens(shot),
    cameraAperture: getShotCameraAperture(shot),
    cameraDistance: getShotCameraDistance(shot),
    lightingDirection: getShotLighting(shot) || dna.worldProfile.lightingDescription || undefined,
    lightAttitude: dna.tasteBridge.lightAttitude,
    lightingConsistency: dna.lightingConsistency,
    isMotionShot: isShotMotion(shot),
    gazeDirection: getShotGazeDirection(shot),
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagProofMacroConstruction(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const blocks: string[] = [];

  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
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

  // Normalised camera + lighting for macro (use detail mode defaults, not archetype on-body specs)
  blocks.push(normalizePositive({
    mode: "detail",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
    lightAttitude: dna.tasteBridge.lightAttitude,
    lightingConsistency: dna.lightingConsistency,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagProofMacroAttachment(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const blocks: string[] = [];

  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
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

  // Detail mode: use detail defaults, not archetype on-body specs
  blocks.push(normalizePositive({
    mode: "detail",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
    lightAttitude: dna.tasteBridge.lightAttitude,
    lightingConsistency: dna.lightingConsistency,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagProofOpenTop(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const blocks: string[] = [];

  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
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

  const worldSlice = deriveShotWorldSlice(dna.worldProfile, shot);
  const worldAnchor = compileWorldAnchor(worldSlice);
  if (worldAnchor) {
    blocks.push(worldAnchor);
  } else {
    blocks.push("Clean white surface.");
  }

  // Product-only mode: use product defaults, not archetype on-body specs
  blocks.push(normalizePositive({
    mode: "product-only",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
    lightingConsistency: dna.lightingConsistency,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileBagEditorialDesire(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint as BagFingerprint | undefined;
  const worldSlice = deriveShotWorldSlice(dna.worldProfile, shot);
  const blocks: string[] = [];

  // Reference lock (still present but product accuracy is priority 1, not all-consuming)
  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
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
  blocks.push(compileShotDirective(shot, dna.tasteBridge.emotionalRegister, shot.editorialBeat));
  blocks.push(compileScaleHint(input, "on-body"));

  // Visibility
  const visibility = compileVisibilityCue(shot, input);
  if (visibility) blocks.push(visibility);

  // World anchor (priority 4: atmosphere)
  const worldAnchor = compileWorldAnchor(worldSlice);
  if (worldAnchor) blocks.push(worldAnchor);

  // Styling lock for Case B
  if (!hasProductRef) {
    const stylingLock = compileStylingLock(dna.brandGuidelines);
    if (stylingLock) blocks.push(stylingLock);
  }

  // Human realism normalization (priority 5)
  blocks.push(normalizePositive({
    mode: "on-body",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: true,
    cameraHeight: getShotCameraHeight(shot),
    cameraLens: getShotCameraLens(shot),
    cameraAperture: getShotCameraAperture(shot),
    cameraDistance: getShotCameraDistance(shot),
    lightingDirection: getShotLighting(shot) || dna.worldProfile.lightingDescription || undefined,
    lightAttitude: dna.tasteBridge.lightAttitude,
    lightingConsistency: dna.lightingConsistency,
    isMotionShot: isShotMotion(shot),
    gazeDirection: getShotGazeDirection(shot),
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
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint;
  const worldSlice = deriveShotWorldSlice(dna.worldProfile, shot);
  const isAccessory = ACCESSORY_FAMILIES.has(input.productFamily);
  const blocks: string[] = [];

  // Reference lock
  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "on-body"));

  if (isAccessory) {
    if (fp) {
      blocks.push(buildCompactProductLock(fp));
    } else {
      blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
    }
    blocks.push(compileScaleHint(input, "on-body"));
    blocks.push(compileShotDirective(shot, dna.tasteBridge.emotionalRegister, shot.editorialBeat));
    const visibility = compileVisibilityCue(shot, input);
    if (visibility) blocks.push(visibility);
    const interaction = compileProductInteraction(shot, fp);
    if (interaction) blocks.push(interaction + ".");
    const worldAnchor = compileWorldAnchor(worldSlice);
    if (worldAnchor) blocks.push(worldAnchor);
  } else {
    blocks.push(compileShotDirective(shot, dna.tasteBridge.emotionalRegister, shot.editorialBeat));
    if (fp) {
      blocks.push(buildCompactProductLock(fp));
    } else if (!hasProductRef) {
      const stylingLock = compileStylingLock(dna.brandGuidelines);
      if (stylingLock) blocks.push(stylingLock);
    } else {
      blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
    }
    blocks.push(compileScaleHint(input, "on-body"));
    const worldAnchor = compileWorldAnchor(worldSlice);
    if (worldAnchor) blocks.push(worldAnchor);
  }

  if (!hasProductRef && isAccessory) {
    const stylingLock = compileStylingLock(dna.brandGuidelines);
    if (stylingLock) blocks.push(stylingLock);
  }

  // F8: Realism normalization
  // Hero shots use compressed realism to free prompt budget for identity lock
  const isHero = shot.archetype.shotCategory === "hero";
  blocks.push(normalizePositive({
    mode: "on-body",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: true,
    cameraHeight: getShotCameraHeight(shot),
    cameraLens: getShotCameraLens(shot),
    cameraAperture: getShotCameraAperture(shot),
    cameraDistance: getShotCameraDistance(shot),
    lightingDirection: getShotLighting(shot) || dna.worldProfile.lightingDescription || undefined,
    lightAttitude: dna.tasteBridge.lightAttitude,
    lightingConsistency: dna.lightingConsistency,
    isMotionShot: isShotMotion(shot),
    gazeDirection: getShotGazeDirection(shot),
    compressionLevel: isHero ? "compressed" : "full",
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileGenericProductOnly(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint;
  const blocks: string[] = [];

  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
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

  const worldSlice = deriveShotWorldSlice(dna.worldProfile, shot);
  const worldAnchorStr = compileWorldAnchor(worldSlice);
  if (worldAnchorStr) {
    blocks.push(worldAnchorStr);
  } else {
    blocks.push("Clean white surface.");
  }

  blocks.push(compileShotDirective(shot));

  // Product-only mode: use product defaults, not archetype on-body specs
  blocks.push(normalizePositive({
    mode: "product-only",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
    lightingConsistency: dna.lightingConsistency,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileGenericDetail(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
  hasModelRef: boolean,
): string {
  const fp = input.productFingerprint;
  const blocks: string[] = [];

  const identityTier = deriveIdentityLockTier(shot, hasModelRef, input);
  const hairProfile = deriveHairVisibility(shot);
  const refLock = compileReferenceLock(hasProductRef, identityTier, hairProfile, shot, input);
  if (refLock) blocks.push(refLock);

  blocks.push(compileStyleTag(dna, "detail"));

  // Detail zone (generic fallback for non-bag families)
  blocks.push(compileDetailZoneGeneric(shot, fp, input));
  blocks.push(compileScaleHint(input, "detail"));

  // Detail mode: use detail defaults, not archetype on-body specs
  blocks.push(normalizePositive({
    mode: "detail",
    materialHint: fp ? `${fp.materialFinish} ${fp.materialColour}` : undefined,
    includeHumanRealism: false,
    lightAttitude: dna.tasteBridge.lightAttitude,
    lightingConsistency: dna.lightingConsistency,
  }));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

// ── Family-Keyed Detail Zones ──

const FAMILY_DETAIL_ZONES: Partial<Record<ProductFamily, Record<string, string>>> = {
  apparel: {
    default: "construction detail and fabric texture",
    dress: "neckline construction, strap detail, and fabric grain",
    shirt: "collar stitching, button attachment, and cuff finish",
    blazer: "lapel roll, buttonhole quality, and interior lining",
    trousers: "waistband construction, pocket finish, and hem detail",
    skirt: "waistband construction, pleat setting, and hem finish",
    knitwear: "knit stitch pattern, yarn texture, and ribbing detail",
    coat: "collar construction, button finish, and lining detail",
    top: "neckline shape, strap or sleeve detail, and fabric finish",
  },
  bags: { default: "hardware and closure mechanism" },
  watches: { default: "dial layout and case construction" },
  jewelry: { default: "metal finish, stone setting, and clasp quality" },
  eyewear: { default: "frame construction, hinge mechanism, and lens edge" },
  footwear: { default: "sole construction, stitching quality, and upper detail" },
  belts: { default: "buckle mechanism, leather edge, and stitching detail" },
};

// ── Generic Detail Zone (non-bag families) ──

function compileDetailZoneGeneric(shot: RecommendedShot, fp?: ProductFingerprint, input?: LookbookInput): string {
  const arch = shot.archetype;
  const title = (shot.resolvedTitle ?? arch.title).toLowerCase();

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
      const style = (fp as any).constructionStyle;
      const material = [fp.materialFinish, fp.materialColour].filter(Boolean).join(" ");
      if (style) return `Close-up of ${style} on ${material} surface.`.replace(/\s+/g, " ");
      return material
        ? `Close-up of construction detail on ${material} surface.`
        : "Close-up of construction detail and material texture.";
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

  // Family-aware fallback using normalized subtype keys
  if (input) {
    const zones = FAMILY_DETAIL_ZONES[input.productFamily];
    const itemKey = normalizeSubtypeKey(input.specificItem);
    const desc = (itemKey && zones?.[itemKey]) || zones?.default;
    if (desc) return `Close-up of ${desc}.`;
  }

  // Ultimate fallback: use resolved role
  const roleDesc = resolveArchetypeRole(arch, input?.specificItem).split(".")[0]?.toLowerCase();
  return `Close-up of ${roleDesc || "product detail"}.`;
}

// ── Negative Prompt Compiler ──

export function compileProviderNegative(
  shot: RecommendedShot,
  input: LookbookInput,
  mode: ProviderCompilationMode,
  hasProductRef?: boolean,
  shotClass?: BagShotClass,
  secondaryObjectPolicy?: SecondaryObjectPolicy,
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

  // Secondary object policy
  if (secondaryObjectPolicy === "forbid" && mode === "on-body") {
    parts.push("no additional bags, watches, or jewelry not in reference, no competing accessories");
  }

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
  hasModelRef: boolean = false,
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
        positive = compileBagProofHero(shot, dna, input, hasProductRef, hasModelRef);
        break;
      case "proof_profile":
        positive = compileBagProofProfile(shot, dna, input, hasProductRef, hasModelRef);
        break;
      case "proof_macro_construction":
        positive = compileBagProofMacroConstruction(shot, dna, input, hasProductRef, hasModelRef);
        break;
      case "proof_macro_attachment_or_brand_zone":
        positive = compileBagProofMacroAttachment(shot, dna, input, hasProductRef, hasModelRef);
        break;
      case "proof_open_top_or_capacity":
        positive = compileBagProofOpenTop(shot, dna, input, hasProductRef, hasModelRef);
        break;
      case "editorial_desire":
        positive = compileBagEditorialDesire(shot, dna, input, hasProductRef, hasModelRef);
        break;
    }
  } else {
    // Generic compilers for non-bag families (with F8 realism normalization)
    switch (mode) {
      case "on-body":
        positive = compileGenericOnBody(shot, dna, input, hasProductRef, hasModelRef);
        break;
      case "product-only":
        positive = compileGenericProductOnly(shot, dna, input, hasProductRef, hasModelRef);
        break;
      case "detail":
        positive = compileGenericDetail(shot, dna, input, hasProductRef, hasModelRef);
        break;
    }
  }

  let negative = compileProviderNegative(shot, input, mode, hasProductRef, shotClass, dna.secondaryObjectPolicy);

  // F9: Anchor contradiction scrubber (runs BEFORE critic so critic evaluates clean prompt)
  const scrubbed = scrubAnchorContradictions(positive, negative, shot);
  positive = scrubbed.positive;
  negative = scrubbed.negative;

  // Prompt hygiene: fix blank template variables, double spaces, malformed phrases
  positive = sanitizePromptText(positive);
  negative = sanitizePromptText(negative);

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
