import type {
  ShotArchetype,
  ShotCategory,
  ProductFamily,
  LookbookInput,
  MasterShootDNA,
  RecommendedShot,
  ScoredArchetype,
  ResolvedBlueprint,
  EvidenceType,
} from "./types";
import { PRODUCT_FAMILY_LABELS } from "./types";
import {
  composeEvidenceSells,
  FAMILY_FALLBACK_SELLS,
  EVIDENCE_SELL_PHRASES,
} from "./productEvidence";

// ── V2 Family-Native Vocabulary ──

const FAMILY_VOCABULARY: Record<ProductFamily, Record<string, string>> = {
  eyewear: {
    product: "frames",
    material: "acetate and metal finish",
    hero_verb: "sits on the face",
    detail_focus: "temple arm, hinge engineering, and lens coating",
    editorial_mood: "attitude and face-framing confidence",
  },
  bags: {
    product: "bag",
    material: "leather grain and hardware",
    hero_verb: "hangs against the body",
    detail_focus: "buckle finish, stitching, and edge paint",
    editorial_mood: "ease and everyday carry",
  },
  watches: {
    product: "watch",
    material: "case finishing and dial texture",
    hero_verb: "sits on the wrist",
    detail_focus: "dial indices, crown, and bezel detailing",
    editorial_mood: "wrist presence and personal style",
  },
  jewelry: {
    product: "piece",
    material: "metal finish and stone setting",
    hero_verb: "catches light against the skin",
    detail_focus: "setting, clasp, and surface sparkle",
    editorial_mood: "adornment and personal expression",
  },
  footwear: {
    product: "shoes",
    material: "upper construction and sole profile",
    hero_verb: "grounds the look from the feet up",
    detail_focus: "sole tread, stitching, and lacing system",
    editorial_mood: "ground energy and street confidence",
  },
  apparel: {
    product: "garment",
    material: "fabric hand and construction",
    hero_verb: "drapes on the body",
    detail_focus: "seam finishing, button quality, and fabric weave",
    editorial_mood: "personal style and occasion",
  },
  headwear: {
    product: "headpiece",
    material: "material texture and structure",
    hero_verb: "frames the face from above",
    detail_focus: "brim edge, inner band, and material grain",
    editorial_mood: "face framing and identity",
  },
  belts: {
    product: "belt",
    material: "leather grain and buckle finish",
    hero_verb: "anchors the waist",
    detail_focus: "buckle mechanism, edge finishing, and hole punching",
    editorial_mood: "waist definition and polish",
  },
  scarves: {
    product: "scarf",
    material: "weave, drape weight, and print clarity",
    hero_verb: "falls across the body",
    detail_focus: "hemming, fabric weight, and print registration",
    editorial_mood: "layering and colour story",
  },
  small_accessories: {
    product: "accessory",
    material: "material finish and surface quality",
    hero_verb: "sits in or on the hand",
    detail_focus: "hinge, clasp, and surface finishing",
    editorial_mood: "personal detail and intentionality",
  },
  full_look: {
    product: "ensemble",
    material: "fabric interplay and layering",
    hero_verb: "comes together on the body",
    detail_focus: "fabric interaction, proportion, and finish quality",
    editorial_mood: "total look and styled intention",
  },
};

// ── V2 Shot-Specific Realism Guardrails ──

function buildRealismGuardrail(archetype: ShotArchetype, input: LookbookInput): string {
  const id = archetype.id;
  const family = input.productFamily;

  // Shot-specific guardrails: what to watch for in THIS shot only
  if (id === "hero_full_body_seller") {
    if (family === "bags") return "Check strap attachment points, bag-to-hip proportion, hardware not merging with clothing.";
    if (family === "footwear") return "Check shoe-to-ground contact, lacing symmetry, sole not floating.";
    if (family === "apparel") return "Check shoulder seam alignment, hem consistency, button spacing.";
    return "Check product-to-body proportion, natural weight distribution.";
  }

  if (id === "watch_wrist_hero") return "Check case-to-wrist proportion, strap sitting flush against skin, crown at 3 o'clock.";
  if (id === "watch_dial_closeup") return "Check index alignment, hand positions realistic, crystal reflection natural. Small dial text may be illegible.";
  if (id === "watch_strap_detail") return "Check bracelet link alignment, clasp hinge accuracy, strap-to-lug junction clean.";
  if (id === "accessory_hand_interaction" && family === "watches") return "Check finger count, wrist anatomy, watch face legibility at this angle.";
  if (id === "accessory_hand_interaction") return "Check finger count, natural finger curvature, small object not floating above skin.";

  if (id === "eyewear_portrait_halfbody") return "Check frame symmetry across the bridge, lens tint consistency, temple arm alignment.";
  if (id === "eyewear_temple_detail") return "Check hinge pin rendering, logo legibility on temple arm, lens-to-frame junction.";
  if (id === "portrait_hero_clean" && family === "eyewear") return "Check frame sitting naturally on the nose bridge, both lenses same tint, no frame warping.";

  if (id === "bag_carry_profile") return "Check strap attachment where it meets the bag, bag not clipping through clothing, consistent leather texture.";
  if (id === "bag_hardware_detail") return "Check buckle/clasp rendering, metal colour consistency, stitching regularity near hardware.";
  if (id === "bag_construction_detail") return "Check interior lining texture, pocket edge finishing, zipper teeth alignment.";

  if (id === "footwear_ground_focus") return "Check shoe-to-ground shadow contact, sole tread pattern clarity, lacing eyelet rendering.";
  if (id === "footwear_material_detail") return "Check stitching regularity, sole-to-upper seam, leather grain consistency.";
  if (id === "controlled_half_stride") {
    if (family === "footwear") return "Check both shoes rendered correctly, natural stride length, sole flex believable.";
    return "Check mid-stride weight distribution, fabric movement consistent with direction.";
  }

  if (id === "ear_detail_crop") return "Check earring attachment to earlobe, metal colour match if pair, no earring floating.";
  if (id === "three_quarter_ear_reveal") return "Check earring drop against jawline, both sides consistent if pair visible.";
  if (id === "pair_symmetry_validation") return "Check left-right earring size match, identical drop length, no asymmetric distortion.";
  if (id === "jewelry_neckline_focus") return "Check chain drape following gravity, pendant resting on skin, clasp hidden at back.";

  if (id === "belt_waist_hero") return "Check buckle shape accuracy, prong alignment, leather-to-buckle junction clean, belt loop spacing even.";
  if (id === "buckle_detail_closeup") return "Check prong alignment, tongue slot accuracy, logo stamping clarity, metal colour consistency. Leather-to-buckle junction must be clean.";
  if (id === "belt_leather_texture") return "Check grain consistency, stitching regularity, edge paint smoothness, hole punching uniformity.";
  if (id === "belt_waist_styling_crop") return "Check belt sitting naturally at the waist (not floating), fabric interaction at the belt line, belt width consistent.";

  if (id === "detail_crop_logo_focus") return "Check text legibility, no mirrored or scrambled characters, logo proportions accurate.";

  // Category-level fallbacks
  if (archetype.shotCategory === "detail") return "Check material texture rendering at close range, clean edges, no AI smoothing artefacts.";
  if (archetype.shotCategory === "motion") return "Check natural motion blur direction, no frozen mid-air limbs, clothing movement consistent.";
  if (archetype.shotCategory === "editorial") return "Check environment-to-subject lighting match, no compositing seams, grounded shadows.";
  if (archetype.shotCategory === "silhouette") return "Check clean edge separation from background, no phantom limbs, unbroken silhouette line.";

  return "Check product rendering accuracy, natural skin texture, grounded anatomy.";
}

// ── V2 Delta Brief Builder ──

function buildDeltaBrief(
  archetype: ShotArchetype,
  _dna: MasterShootDNA,
  input: LookbookInput,
  blueprint: ResolvedBlueprint,
  isAnchorShot: boolean
): string {
  const item = input.specificItem || PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();
  const gender =
    input.genderPresentation === "menswear" ? "Male"
    : input.genderPresentation === "womenswear" ? "Female"
    : "Model";

  let brief = archetype.deltaBlueprint;

  // Replace placeholders
  brief = brief.replace(/\{item\}/g, item);
  brief = brief.replace(/\{gender\}/g, gender.toLowerCase());
  brief = brief.replace(/\{framing\}/g, archetype.defaultFraming);
  brief = brief.replace(/\{lens\}/g, archetype.defaultLens);
  brief = brief.replace(/\{aperture\}/g, archetype.defaultAperture);

  // Branding line: only on the anchor shot (first in set) to avoid repetition
  if (isAnchorShot) {
    if (blueprint.brandingEmphasis === "product_first") {
      brief += ` ${item[0].toUpperCase() + item.slice(1)} visibility is the priority.`;
    } else if (blueprint.brandingEmphasis === "logo_first" && archetype.logoVisibilitySuitability === "high") {
      brief += " Keep all visible branding legible.";
    }
  }

  // Delta brief suffix: only append when the archetype's display zones or category
  // are relevant to the suffix content (e.g. "Hair swept behind ear" only for ear shots)
  if (blueprint.deltaBriefSuffix) {
    const suffix = blueprint.deltaBriefSuffix;
    const cat = archetype.shotCategory;
    const zones = [...archetype.primaryDisplayZones, ...archetype.secondaryDisplayZones];

    // Determine if the suffix is relevant to this specific shot
    const isRelevant =
      // Ear-related suffixes: only for shots that show the ear zone
      (suffix.toLowerCase().includes("ear") && zones.some(z => z === "ear" || z === "face")) ||
      // Neckline/chain suffixes: only for shots that show the neckline
      (suffix.toLowerCase().includes("neckline") && zones.some(z => z === "neckline" || z === "collarbone")) ||
      // Wrist suffixes: only for shots that show the wrist
      (suffix.toLowerCase().includes("wrist") && zones.some(z => z === "wrist" || z === "hand")) ||
      // Hand/finger suffixes: only for hand-interaction shots
      (suffix.toLowerCase().includes("hand") && zones.some(z => z === "hand")) ||
      // Lighting/reflection suffixes: only for hero and product_focus (face-on shots)
      (suffix.toLowerCase().includes("lighting") && (cat === "hero" || cat === "product_focus")) ||
      // Shoulder/lapel suffixes: only for shots showing the torso front
      (suffix.toLowerCase().includes("shoulder") && zones.some(z => z === "upper_body" || z === "torso_front" || z === "full_body")) ||
      // Hem suffixes: only for full-body hero shots
      (suffix.toLowerCase().includes("hem") && zones.some(z => z === "full_body")) ||
      // Shoe/lace/grounded suffixes: only for shots showing feet
      ((suffix.toLowerCase().includes("shoe") || suffix.toLowerCase().includes("lace") || suffix.toLowerCase().includes("grounded")) && zones.some(z => z === "foot" || z === "knee_down" || z === "full_body")) ||
      // Bag structure/strap suffixes: only for bag carry or hero shots
      ((suffix.toLowerCase().includes("bag") || suffix.toLowerCase().includes("strap")) && (cat === "hero" || cat === "product_focus")) ||
      // Belt/buckle/tucked suffixes: only for shots showing the waist
      ((suffix.toLowerCase().includes("belt") || suffix.toLowerCase().includes("buckle") || suffix.toLowerCase().includes("tucked")) && zones.some(z => z === "waist" || z === "waist_front" || z === "full_body")) ||
      // Dial/cuff suffixes for watches: only for wrist-focused shots
      ((suffix.toLowerCase().includes("dial") || suffix.toLowerCase().includes("cuff")) && zones.some(z => z === "wrist" || z === "hand"));

    if (isRelevant) {
      brief += ` ${suffix}`;
    }
  }

  // V2: NO generic realism boilerplate appended. Realism is in the guardrail field.

  return brief;
}

// ── V2 Negative Cues (shot-specific only, global moved to export header) ──

function buildNegativeCues(archetype: ShotArchetype, input: LookbookInput, blueprint: ResolvedBlueprint): string {
  const cues: string[] = [];

  // Shot-specific risks only
  if (archetype.anatomyRisk === "high" || archetype.anatomyRisk === "medium") {
    cues.push("warped hands", "incorrect finger count", "unnatural joint angles");
  }
  if (archetype.logoRisk === "high" || archetype.logoRisk === "medium") {
    cues.push("scrambled logo text", "mirrored brand marks");
  }
  if (archetype.occlusionRisk === "high" || archetype.occlusionRisk === "medium") {
    cues.push("product hidden by pose", "key feature occluded");
  }
  if (archetype.shotCategory === "motion") {
    cues.push("frozen mid-air pose", "unnatural stride length", "motion blur in wrong direction");
  }

  // Blueprint-driven negative cues (family/item-specific)
  cues.push(...blueprint.additionalNegativeCues);

  // Return only shot-specific cues, or "none" if clean
  return cues.length > 0 ? cues.join(", ") : "(see global negative cues)";
}

// ── Badges (unchanged) ──

function buildBadges(
  archetype: ShotArchetype,
  input: LookbookInput,
  _blueprint: ResolvedBlueprint
): string[] {
  const badges: string[] = [];

  if (input.creativityLevel === "safe" && archetype.creativityBand.includes("safe")) {
    badges.push("Safe");
  }
  if (input.creativityLevel === "balanced" && archetype.creativityBand.includes("balanced")) {
    badges.push("Balanced");
  }
  if (input.creativityLevel === "directional" && archetype.creativityBand.includes("directional")) {
    badges.push("Directional");
  }
  if (archetype.logoVisibilitySuitability === "high" && input.logoVisibilityPriority !== "low") {
    badges.push("Logo-safe");
  }
  if (archetype.detailSuitability === "high") {
    badges.push("High detail");
  }
  if (archetype.shotCategory === "motion") {
    badges.push("Motion");
  }
  if (archetype.higgsfieldReliability === "high") {
    badges.push("High reliability");
  }
  if (archetype.difficulty === "hard" || archetype.higgsfieldReliability === "low") {
    badges.push("Higher risk");
  }

  return badges;
}

// ── V2 What It Sells (family-native vocabulary, concise) ──

function deriveWhatItSells(archetype: ShotArchetype, input: LookbookInput, blueprint: ResolvedBlueprint): string {
  const item = input.specificItem || PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();
  const vocab = FAMILY_VOCABULARY[input.productFamily];
  const cat = archetype.shotCategory;

  // Evidence-based composition (archetype-specific, so it differentiates shots in the same category)
  const planEvidence = blueprint.evidencePlan.orderedEvidence.map((e) => e.evidence);
  const matched = archetype.evidenceCapabilities.filter((e) => planEvidence.includes(e));

  // For categories that commonly have 2+ shots (detail, product_focus, editorial),
  // evidence composition takes priority over blueprint category text to avoid duplicates.

  if (cat === "hero") {
    // Hero is usually one per set, so blueprint text is safe
    const blueprintSells = blueprint.whatItSellsByCategory[cat];
    if (blueprintSells) return blueprintSells;
    return `How the ${item} ${vocab.hero_verb}. First impression: shape, proportion, and presence.`;
  }

  if (cat === "product_focus") {
    if (matched.length >= 2) {
      return composeEvidenceSells(matched, item, cat);
    }
    const blueprintSells = blueprint.whatItSellsByCategory[cat];
    if (blueprintSells) return blueprintSells;
    return `${item[0].toUpperCase() + item.slice(1)} in focused context. The buyer evaluates ${vocab.material}.`;
  }

  if (cat === "detail") {
    // Evidence-first: differentiates hardware detail from construction detail, etc.
    if (matched.length >= 2) {
      return composeEvidenceSells(matched, item, cat);
    }
    const blueprintSells = blueprint.whatItSellsByCategory[cat];
    if (blueprintSells) return blueprintSells;
    return `Craftsmanship proof: ${vocab.detail_focus}.`;
  }

  if (cat === "editorial") {
    // Archetype-specific editorial sells (each editorial archetype has a distinct mood)
    // Family vocabulary adds specificity so eyewear editorial reads differently from bags editorial
    if (archetype.id === "mood_environmental_hero") {
      const mood = vocab.editorial_mood;
      return `The ${item} in an environment that tells the buyer where this product lives. ${mood[0].toUpperCase() + mood.slice(1)} in context.`;
    }
    if (archetype.id === "torso_turn_editorial") {
      return `Movement energy and styled confidence with the ${item}. The turn reveals ${vocab.material} from a new angle.`;
    }
    if (archetype.id === "seated_forward_lean") {
      return `Relaxed context: the ${item} in a seated moment that signals ease. Focus shifts to ${vocab.detail_focus}.`;
    }
    if (archetype.id === "relaxed_lean") {
      return `Off-duty attitude with the ${item}. Casual confidence, ${vocab.editorial_mood}.`;
    }
    // Other editorial archetypes: use evidence composition if available
    if (matched.length >= 2) {
      return composeEvidenceSells(matched, item, cat);
    }
    const blueprintSells = blueprint.whatItSellsByCategory[cat];
    if (blueprintSells) return blueprintSells;
    return `Desirability. The ${item} in a world the buyer wants to be part of.`;
  }

  if (cat === "silhouette") {
    const blueprintSells = blueprint.whatItSellsByCategory[cat];
    if (blueprintSells) return blueprintSells;
    return `Shape language: the ${item}'s outline and how it changes the body's profile.`;
  }

  if (cat === "motion") {
    const blueprintSells = blueprint.whatItSellsByCategory[cat];
    if (blueprintSells) return blueprintSells;
    return `Energy and behaviour. How the ${item} responds to movement.`;
  }

  // Family fallback
  const familyFallback = FAMILY_FALLBACK_SELLS[input.productFamily];
  if (familyFallback) {
    const fallbackText = familyFallback[cat];
    if (fallbackText) return fallbackText;
  }

  return `The ${item} in context.`;
}

// ── V2 Why Generate Now (first 3 shots only) ──

function deriveWhyGenerateNow(
  archetype: ShotArchetype,
  priority: number,
  input: LookbookInput,
  allShots: ScoredArchetype[]
): string | undefined {
  if (priority > 3) return undefined;

  const item = input.specificItem || PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();
  const cat = archetype.shotCategory;

  if (priority === 1) {
    if (cat === "hero") {
      return `Validates that the AI can render the ${item} accurately before committing to the full set.`;
    }
    if (cat === "product_focus") {
      return `Establishes core product rendering. If the ${item} looks wrong here, stop and adjust before shooting the rest.`;
    }
    return `Anchors the set. Every other shot depends on this rendering being right.`;
  }

  if (priority === 2) {
    return `Second angle confirms the ${item} renders consistently from a different perspective. Catches single-angle flukes.`;
  }

  if (priority === 3) {
    const firstTwoCats = allShots.slice(0, 2).map((s) => s.archetype.shotCategory);
    if (!firstTwoCats.includes("detail")) {
      return `First detail shot. Tests close-range rendering quality before the remaining set.`;
    }
    return `Completes the core trio. The set is now commercially usable even if generation stops here.`;
  }

  return undefined;
}

// ── Framing/Pose Deltas (unchanged) ──

function deriveFramingDelta(archetype: ShotArchetype, _dna: MasterShootDNA): string {
  return `${archetype.defaultFraming} at ${archetype.defaultLens} ${archetype.defaultAperture}, ` +
    `camera at ${archetype.defaultCameraHeight}, ~${archetype.defaultCameraDistance} from subject.`;
}

function derivePoseDelta(archetype: ShotArchetype): string {
  return `${archetype.poseFamily}: ${archetype.bodyDirection}. ` +
    `Hands: ${archetype.handBehavior}. Legs: ${archetype.legBehavior}. ` +
    `Head: ${archetype.headDirection}.`;
}

// ── Risk Summary (unchanged) ──

function deriveRiskSummary(archetype: ShotArchetype): string {
  const risks: string[] = [];
  if (archetype.logoRisk !== "low") risks.push(`logo risk: ${archetype.logoRisk}`);
  if (archetype.anatomyRisk !== "low") risks.push(`anatomy risk: ${archetype.anatomyRisk}`);
  if (archetype.occlusionRisk !== "low") risks.push(`occlusion risk: ${archetype.occlusionRisk}`);
  if (risks.length === 0) return "Low risk across all dimensions.";
  return risks.join(", ") + `. Difficulty: ${archetype.difficulty}.`;
}

// ── V2 Brief Quality Pass ──

export interface BriefQualityIssue {
  shotPosition: number;
  issue: string;
}

export function runBriefQualityPass(shots: RecommendedShot[]): BriefQualityIssue[] {
  const issues: BriefQualityIssue[] = [];

  for (const shot of shots) {
    const words = shot.deltaBrief.split(/\s+/).length;
    const cat = shot.archetype.shotCategory;

    // Length check
    if (cat === "detail") {
      if (words > 80) issues.push({ shotPosition: shot.position, issue: `Detail brief too long: ${words} words (target: 40-70)` });
    } else if (cat === "editorial" || cat === "motion") {
      if (words > 140) issues.push({ shotPosition: shot.position, issue: `Brief too long: ${words} words (max 130)` });
    } else {
      if (words > 120) issues.push({ shotPosition: shot.position, issue: `Brief too long: ${words} words (target: 70-110)` });
    }

    // Generic realism boilerplate check
    if (shot.deltaBrief.includes("Natural skin texture, no AI stare, grounded anatomy")) {
      issues.push({ shotPosition: shot.position, issue: "Contains V1 generic realism boilerplate (should be removed)" });
    }
  }

  // Cross-shot repetition check: CORRECTIVE for repeated opening phrases
  // Rewrite duplicate opening sentences by prepending archetype title context
  const openings = shots.map((s) => {
    const firstSentence = s.deltaBrief.split(/\.\s/)[0] || "";
    return { position: s.position, opening: firstSentence.slice(0, 40).toLowerCase(), shotRef: s };
  });

  const seenOpenings = new Map<string, number>(); // opening -> first position
  for (const { position, opening, shotRef } of openings) {
    if (opening.length <= 15) continue;
    const firstPos = seenOpenings.get(opening);
    if (firstPos !== undefined) {
      // Rewrite the duplicate's opening by prepending the archetype title
      const title = shotRef.archetype.title;
      const firstDot = shotRef.deltaBrief.indexOf(".");
      if (firstDot > 0 && firstDot < 120) {
        const rest = shotRef.deltaBrief.slice(firstDot + 1).trim();
        shotRef.deltaBrief = `${title} shot. ${rest}`;
      }
      issues.push({
        shotPosition: position,
        issue: `[CORRECTED] Opening phrase duplicated shot ${firstPos}; rewritten with archetype title`,
      });
    } else {
      seenOpenings.set(opening, position);
    }
  }

  // Cross-shot "what it sells" uniqueness check
  const sellsTexts = shots.map((s) => ({ position: s.position, text: s.whatItSells.toLowerCase() }));
  for (let i = 0; i < sellsTexts.length; i++) {
    for (let j = i + 1; j < sellsTexts.length; j++) {
      if (sellsTexts[i].text === sellsTexts[j].text) {
        issues.push({
          shotPosition: sellsTexts[j].position,
          issue: `"What it sells" identical to shot ${sellsTexts[i].position}`,
        });
      }
    }
  }

  // Cross-shot trailing sentence repetition: CORRECTIVE
  // Extract the last sentence from each brief. If repeated across 3+ shots,
  // strip it from all but the first occurrence and log the correction.
  const trailingSentences = shots.map((s) => {
    const sentences = s.deltaBrief.split(/\.\s+/).filter(Boolean);
    const last = sentences[sentences.length - 1]?.toLowerCase().trim() || "";
    return { position: s.position, sentence: last, shotRef: s };
  });
  const trailingCounts = new Map<string, { positions: number[]; shotRefs: RecommendedShot[]; rawSentence: string }>();
  for (const { position, sentence, shotRef } of trailingSentences) {
    if (sentence.length > 15) {
      const entry = trailingCounts.get(sentence) || { positions: [], shotRefs: [], rawSentence: "" };
      entry.positions.push(position);
      entry.shotRefs.push(shotRef);
      // Keep the original-case version from the first occurrence
      if (!entry.rawSentence) {
        const sentences = shotRef.deltaBrief.split(/\.\s+/).filter(Boolean);
        entry.rawSentence = sentences[sentences.length - 1]?.trim() || "";
      }
      trailingCounts.set(sentence, entry);
    }
  }
  for (const [, { positions, shotRefs, rawSentence }] of trailingCounts) {
    if (positions.length >= 3) {
      // Keep the trailing sentence on the first shot, strip from the rest
      for (let i = 1; i < shotRefs.length; i++) {
        const shot = shotRefs[i];
        // Remove the trailing sentence (case-insensitive match at end of brief)
        const escaped = rawSentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`\\.?\\s*${escaped}\\.?\\s*$`, "i");
        const cleaned = shot.deltaBrief.replace(pattern, "").trim();
        if (cleaned !== shot.deltaBrief && cleaned.length > 20) {
          shot.deltaBrief = cleaned.endsWith(".") ? cleaned : cleaned + ".";
        }
      }
      issues.push({
        shotPosition: positions[0],
        issue: `[CORRECTED] Trailing phrase "${rawSentence.slice(0, 50)}..." was repeated in ${positions.length} shots; stripped from shots ${positions.slice(1).join(", ")}`,
      });
    }
  }

  // Cross-shot realism guardrail uniqueness (all guardrails should be shot-specific, not identical)
  const guardrails = shots
    .filter(s => s.realismGuardrail)
    .map(s => ({ position: s.position, text: s.realismGuardrail!.toLowerCase() }));
  const guardrailCounts = new Map<string, number[]>();
  for (const { position, text } of guardrails) {
    const positions = guardrailCounts.get(text) || [];
    positions.push(position);
    guardrailCounts.set(text, positions);
  }
  for (const [, positions] of guardrailCounts) {
    if (positions.length >= 3) {
      issues.push({
        shotPosition: positions[positions.length - 1],
        issue: `Same realism guardrail used for ${positions.length} shots (${positions.join(", ")}). Should be shot-specific.`,
      });
    }
  }

  return issues;
}

// ── Deduplication: rewrite identical "what it sells" text across shots ──

export function deduplicateSellsText(shots: RecommendedShot[], input: LookbookInput, blueprint: ResolvedBlueprint): void {
  const item = input.specificItem || PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();
  const vocab = FAMILY_VOCABULARY[input.productFamily];
  const seen = new Map<string, number>(); // sells text -> first position that used it

  for (const shot of shots) {
    const key = shot.whatItSells.toLowerCase();
    const firstPos = seen.get(key);

    if (firstPos !== undefined) {
      // This sells text is a duplicate. Rewrite using archetype-specific evidence.
      const planEvidence = blueprint.evidencePlan.orderedEvidence.map((e) => e.evidence);
      const matched = shot.archetype.evidenceCapabilities.filter((e) => planEvidence.includes(e));
      const cat = shot.archetype.shotCategory;

      if (matched.length >= 2) {
        shot.whatItSells = composeEvidenceSells(matched, item, cat);
      } else if (matched.length === 1) {
        // Single evidence: compose a simple sentence
        const phrase = EVIDENCE_SELL_PHRASES[matched[0]] || matched[0].replace(/_/g, " ");
        shot.whatItSells = `${item[0].toUpperCase() + item.slice(1)} ${cat}: ${phrase}.`;
      } else {
        // No matched evidence: use archetype role as differentiator
        shot.whatItSells = `${shot.archetype.role} ${vocab.editorial_mood}.`;
      }

      // If the rewrite STILL matches, append archetype name as last resort
      if (shot.whatItSells.toLowerCase() === key) {
        shot.whatItSells = `${shot.whatItSells} (${shot.archetype.title.toLowerCase()})`;
      }
    } else {
      seen.set(key, shot.position);
    }
  }
}

// ── Build Recommended Shot (V2) ──

export function buildRecommendedShot(
  scored: ScoredArchetype,
  position: number,
  priority: number,
  dna: MasterShootDNA,
  input: LookbookInput,
  blueprint: ResolvedBlueprint,
  allShots?: ScoredArchetype[]
): RecommendedShot {
  const archetype = scored.archetype;

  // Compute evidence this shot provides (intersection of capabilities and product plan)
  const planEvidence = blueprint.evidencePlan.orderedEvidence.map((e) => e.evidence);
  const evidenceProvided: EvidenceType[] = archetype.evidenceCapabilities.filter(
    (e) => planEvidence.includes(e)
  );

  return {
    position,
    archetype,
    shotPurpose: deriveShotPurpose(archetype),
    whatItSells: deriveWhatItSells(archetype, input, blueprint),
    framingDelta: deriveFramingDelta(archetype, dna),
    poseDelta: derivePoseDelta(archetype),
    productEmphasis: archetype.role,
    brandingSafety:
      archetype.logoVisibilitySuitability === "high"
        ? "Logo-safe: branding fully visible."
        : archetype.logoVisibilitySuitability === "medium"
        ? "Moderate: branding partially visible."
        : "Low visibility: branding may be obscured.",
    realismNote: archetype.realismNotes,
    riskSummary: deriveRiskSummary(archetype),
    generationPriority: priority,
    badges: buildBadges(archetype, input, blueprint),
    deltaBrief: buildDeltaBrief(archetype, dna, input, blueprint, priority === 1),
    negativeCues: buildNegativeCues(archetype, input, blueprint),
    evidenceProvided,
    realismGuardrail: buildRealismGuardrail(archetype, input),
    whyGenerateNow: deriveWhyGenerateNow(archetype, priority, input, allShots || []),
  };
}

// ── V2 Shot Purpose (tone varies by role) ──

function deriveShotPurpose(archetype: ShotArchetype): string {
  const purposes: Record<string, string> = {
    hero: "The anchor. Establishes the product clearly for the buyer.",
    silhouette: "Shape and proportion. How the product changes the body's outline.",
    detail: "Proof of craft. Texture, construction, and finish quality.",
    motion: "Energy. How the product behaves when the body moves.",
    editorial: "Desire. The world the product lives in.",
    product_focus: "Product-first. Focused commercial visibility.",
  };
  return purposes[archetype.shotCategory] || archetype.role;
}
