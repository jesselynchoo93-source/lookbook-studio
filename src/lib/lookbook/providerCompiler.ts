/**
 * F7: Provider-Facing Prompt Compiler (2-Reference Workflow)
 *
 * Compiles internal planning data into compressed high-control prompts
 * optimised for Higgsfield (or other providers). The reference images carry
 * identity; the text prompt acts as a shot controller.
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
  ContinuityWorldTokens,
  ProviderPromptOutput,
  ProviderPromptConfig,
  ProviderCompilationMode,
  ProductFamily,
} from "./types";
import { STYLE_LABELS } from "./types";
import { derivePoseBucket } from "./scoring";

// ── Default Provider Config ──

export const HIGGSFIELD_CONFIG: ProviderPromptConfig = {
  provider: "higgsfield",
  model: "nano_banana_pro",
  maxPromptWords: 120,
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

  // From forbiddenElements
  for (const el of fp.forbiddenElements) {
    exclusions.push(`no ${el}`);
  }

  // Auto-derive from structured fields
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

  // Cap at 8 exclusions max
  return exclusions.slice(0, 8);
}

// ── Branding Negatives (capped at 3 tokens) ──

const BRANDING_NEGATIVES = "no readable text, no invented logo, no oversized wordmark";

// ── Core Negatives (5 tokens) ──

const CORE_NEGATIVES = "distorted anatomy, warped hands, plastic skin, CGI lighting, washed-out HDR";

// ── Realism Anchor ──
// Distilled photographic direction from getRealismProfile(), keyed on style x mode.

const REALISM_ANCHORS: Record<string, Record<ProviderCompilationMode, string>> = {
  editorial: {
    "on-body": "Skin with pores and tonal variation, soft directional light, expressive movement allowed.",
    "product-only": "Soft directional light, visible material grain, natural surface reflections.",
    "detail": "Crisp edge detail, natural surface grain, light raking across texture.",
  },
  avant_garde: {
    "on-body": "Skin with pores and tonal variation, soft directional light, expressive movement allowed.",
    "product-only": "Soft directional light, visible material grain, natural surface reflections.",
    "detail": "Crisp edge detail, natural surface grain, light raking across texture.",
  },
  luxury: {
    "on-body": "Skin with natural pores, controlled specular highlights, fabric weave visible under light.",
    "product-only": "Even specular highlights, visible thread and grain, material catches light naturally.",
    "detail": "Metal catches directional light, surface imperfections visible, sharp at the plane of focus.",
  },
  tailoring: {
    "on-body": "Skin with natural pores, controlled specular highlights, fabric weave visible under light.",
    "product-only": "Even specular highlights, visible thread and grain, material catches light naturally.",
    "detail": "Metal catches directional light, surface imperfections visible, sharp at the plane of focus.",
  },
  street: {
    "on-body": "Skin reads natural, ambient light with minor grain, relaxed depth of field.",
    "product-only": "Ambient light, allow minor grain, surface texture reads organic.",
    "detail": "Natural grain, sharp focus on subject, ambient spill on edges.",
  },
  contemporary: {
    "on-body": "Skin reads natural, ambient light with minor grain, relaxed depth of field.",
    "product-only": "Ambient light, allow minor grain, surface texture reads organic.",
    "detail": "Natural grain, sharp focus on subject, ambient spill on edges.",
  },
  minimal: {
    "on-body": "Clean skin tones, flat even light, negative space breathing around subject.",
    "product-only": "Flat even light, clean tones, product isolated on negative space.",
    "detail": "Even light, sharp plane of focus, clean negative space.",
  },
};

const DEFAULT_REALISM: Record<ProviderCompilationMode, string> = {
  "on-body": "Natural skin tones, soft key light, gentle optical falloff behind subject.",
  "product-only": "Soft key light, material reads true to touch, gentle highlight roll-off.",
  "detail": "Sharp at contact point, soft key light, natural highlight roll-off.",
};

function compileRealismAnchor(dna: MasterShootDNA, mode: ProviderCompilationMode): string {
  const styleAnchors = REALISM_ANCHORS[dna.targetStyle];
  if (styleAnchors) return styleAnchors[mode];
  return DEFAULT_REALISM[mode];
}

// ── Scale Hint ──
// Distilled from FAMILY_SCALE_RULES, keyed on family x mode.

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

// ── Family Drift Negatives ──
// Top 2-3 most impactful drift patterns per family, capped.

const COMPRESSED_DRIFT: Record<string, string> = {
  bags: "hardware colour shifting, bag shape morphing",
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
// For accessory-led families: explicit product visibility instruction.
// Only generated for on-body mode.

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

  if (input.productFamily === "belts") {
    return "Buckle centred and unobstructed.";
  }

  if (input.productFamily === "jewelry") {
    if (item.includes("earring")) return "Both earrings visible.";
    if (item.includes("necklace") || item.includes("pendant")) return "Pendant visible against chest.";
    if (item.includes("bracelet")) return "Bracelet visible on wrist.";
    if (item.includes("ring")) return "Ring visible on hand.";
    return "Jewelry piece fully visible.";
  }

  if (input.productFamily === "eyewear") {
    return "Both lenses visible, frame unobstructed.";
  }

  return "Product fully visible.";
}

// ── Compile Shot Directive ──
// Converts archetype technical defaults into visual tokens.

function compileShotDirective(shot: RecommendedShot): string {
  const arch = shot.archetype;
  const parts: string[] = [];

  // Framing
  const framing = arch.defaultFraming.split(",")[0].trim().toLowerCase();
  parts.push(framing);

  // Camera height
  if (arch.defaultCameraHeight) {
    parts.push(`camera ${arch.defaultCameraHeight.toLowerCase()}`);
  }

  // Camera angle (from body direction or pose)
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

  // Lens
  if (arch.defaultLens && arch.defaultAperture) {
    parts.push(`${arch.defaultLens} ${arch.defaultAperture}`);
  }

  return parts.join(", ") + ".";
}

// ── Product Interaction ──
// What the model does with the product in this specific shot.

function compileProductInteraction(
  shot: RecommendedShot,
  fp?: ProductFingerprint,
): string {
  const arch = shot.archetype;
  const mode = detectCompilationMode(shot);

  if (mode === "product-only" || mode === "detail") return "";

  // Extract interaction from pose/hand/body direction
  const hand = arch.handBehavior?.toLowerCase() || "";
  const body = arch.bodyDirection?.toLowerCase() || "";
  const pose = arch.poseFamily?.toLowerCase() || "";

  // Build compact interaction
  const parts: string[] = [];

  if (pose.includes("seated")) {
    if (fp?.family === "bags") {
      parts.push("bag resting on lap");
      if (hand.includes("on") || hand.includes("resting")) {
        parts.push("one hand on bag");
      }
      parts.push("relaxed editorial moment");
    } else if (fp?.family === "watches") {
      parts.push("wrist resting on knee, dial angled toward camera");
    } else {
      parts.push("seated, relaxed posture");
    }
  } else if (pose.includes("walking") || pose.includes("stride")) {
    if (fp?.family === "bags") {
      parts.push("natural stride, bag swinging gently");
    } else {
      parts.push("natural stride");
    }
  } else if (pose.includes("profile")) {
    if (fp?.family === "bags") {
      parts.push("bag side facing lens, hand holding handle naturally");
    } else if (fp?.family === "watches") {
      parts.push("wrist profile, strap visible");
    } else {
      parts.push("profile stance");
    }
  } else {
    // Standing default
    // Use string comparison to avoid TS union narrowing exhaustion
    const fam = fp?.family as string | undefined;
    if (fam === "bags") {
      if (hand.includes("side")) {
        parts.push("bag in right hand at side");
      } else if (hand.includes("shoulder")) {
        parts.push("bag on shoulder");
      } else {
        parts.push("natural stance, bag in hand at side");
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
// Strengthened: covers outfit family, palette, silhouette, accessories, mood.

function compileStylingLock(world?: ContinuityWorldTokens): string {
  if (!world?.styling) return "";
  return `Same outfit throughout: ${world.styling}. Same silhouette, same colour palette, same accessories, same styling mood across all six shots.`;
}

// ── Derive World Tokens from DNA ──

export function deriveWorldTokensFromDNA(dna: MasterShootDNA): ContinuityWorldTokens {
  // Extract compact tokens from verbose DNA strings
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
// Used when no fingerprint is provided.

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

// ── Detail Zone ──

function compileDetailZone(shot: RecommendedShot, fp?: ProductFingerprint): string {
  const arch = shot.archetype;
  const title = arch.title.toLowerCase();

  // Try to identify the detail from the archetype
  if (title.includes("hardware")) {
    if (fp?.family === "bags") {
      const attachment = (fp as any).handleAttachment || "hardware";
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

  // Generic detail fallback
  return `Close-up of ${arch.role.split(".")[0]?.toLowerCase() || "product detail"}.`;
}

// ── Main Compiler Functions ──

function compileOnBody(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
  hasProductRef: boolean,
): string {
  const fp = input.productFingerprint;
  const world = input.continuityWorld;
  const isAccessory = ACCESSORY_FAMILIES.has(input.productFamily);

  const blocks: string[] = [];

  // 1. Style tag
  blocks.push(compileStyleTag(dna, "on-body"));

  // 2. Realism anchor
  blocks.push(compileRealismAnchor(dna, "on-body"));

  if (isAccessory) {
    // Accessory-led: product lock -> scale -> directive -> visibility -> interaction -> world

    // 3. Compact product lock
    if (fp) {
      blocks.push(buildCompactProductLock(fp));
    } else {
      blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
    }

    // 4. Scale hint
    blocks.push(compileScaleHint(input, "on-body"));

    // 5. Shot directive
    blocks.push(compileShotDirective(shot));

    // 6. Visibility cue
    const visibility = compileVisibilityCue(shot, input);
    if (visibility) blocks.push(visibility);

    // 7. Product interaction
    const interaction = compileProductInteraction(shot, fp);
    if (interaction) blocks.push(interaction + ".");

    // 8. World anchor
    const worldAnchor = compileWorldAnchor(world);
    if (worldAnchor) blocks.push(worldAnchor);
  } else {
    // Apparel-led: directive -> product lock -> scale -> world

    // 3. Shot directive
    blocks.push(compileShotDirective(shot));

    // 4. Product lock or styling lock
    if (fp) {
      blocks.push(buildCompactProductLock(fp));
    } else if (!hasProductRef) {
      const stylingLock = compileStylingLock(world);
      if (stylingLock) blocks.push(stylingLock);
    } else {
      blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
    }

    // 5. Scale hint
    blocks.push(compileScaleHint(input, "on-body"));

    // 6. World anchor
    const worldAnchor = compileWorldAnchor(world);
    if (worldAnchor) blocks.push(worldAnchor);
  }

  // Case B styling lock for accessory families (when no product ref)
  if (!hasProductRef && isAccessory) {
    const stylingLock = compileStylingLock(world);
    if (stylingLock) blocks.push(stylingLock);
  }

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileProductOnly(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
): string {
  const fp = input.productFingerprint;
  const blocks: string[] = [];

  // 1. Style tag
  blocks.push(compileStyleTag(dna, "product-only"));

  // 2. Product identity
  if (fp) {
    blocks.push(buildCompactProductLock(fp));
    // Add construction for product-only (more detail allowed)
    if ("constructionStyle" in fp && fp.constructionStyle) {
      blocks.push(`${fp.constructionStyle} construction.`);
    }
  } else {
    blocks.push(getCompactFallbackLock(input.productFamily, input.specificItem) + ".");
  }

  // 3. Realism anchor
  blocks.push(compileRealismAnchor(dna, "product-only"));

  // 4. Scale hint
  blocks.push(compileScaleHint(input, "product-only"));

  // 5. Surface/backdrop
  const world = input.continuityWorld;
  if (world?.backdrop) {
    blocks.push(world.backdrop + ".");
  } else {
    blocks.push("Clean white surface.");
  }

  // 6. Camera + composition
  blocks.push(compileShotDirective(shot));

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

function compileDetail(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  input: LookbookInput,
): string {
  const fp = input.productFingerprint;
  const blocks: string[] = [];

  // 1. Style tag
  blocks.push(compileStyleTag(dna, "detail"));

  // 2. Detail zone
  blocks.push(compileDetailZone(shot, fp));

  // 3. Realism anchor
  blocks.push(compileRealismAnchor(dna, "detail"));

  // 4. Scale context
  blocks.push(compileScaleHint(input, "detail"));

  // 5. Camera + lighting
  const arch = shot.archetype;
  const lens = arch.defaultLens || "85mm";
  const aperture = arch.defaultAperture || "f/2.8";
  blocks.push(`${lens} ${aperture}, directional light, shallow depth of field.`);

  return blocks.join(" ").replace(/\s+/g, " ").trim();
}

// ── Negative Prompt Compiler ──

export function compileProviderNegative(
  shot: RecommendedShot,
  input: LookbookInput,
  mode: ProviderCompilationMode,
  hasProductRef?: boolean,
): string {
  const parts: string[] = [];

  // 1. Mode-specific prefix
  if (mode === "product-only") {
    parts.push("no model, no hands, no person");
  } else if (mode === "detail") {
    parts.push("no full body, no face, no background elements");
  }

  // 2. Core negatives (5 tokens)
  parts.push(CORE_NEGATIVES);

  // 3. Fingerprint exclusions (capped at 8)
  const fp = input.productFingerprint;
  if (fp) {
    const exclusions = buildFingerprintExclusions(fp);
    if (exclusions.length > 0) {
      parts.push(exclusions.join(", "));
    }
  }

  // 4. Family drift negatives (top 2-3)
  const drift = compileFamilyDriftNegatives(input);
  if (drift) parts.push(drift);

  // 5. Branding negatives (3 tokens)
  parts.push(BRANDING_NEGATIVES);

  // 6. Case B: styling consistency negatives
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

  let positive: string;
  switch (mode) {
    case "on-body":
      positive = compileOnBody(shot, dna, input, hasProductRef);
      break;
    case "product-only":
      positive = compileProductOnly(shot, dna, input);
      break;
    case "detail":
      positive = compileDetail(shot, dna, input);
      break;
  }

  const negative = compileProviderNegative(shot, input, mode, hasProductRef);

  return {
    positive,
    negative,
    mode,
    wordCount: positive.split(/\s+/).length,
  };
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
