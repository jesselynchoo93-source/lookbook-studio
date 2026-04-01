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
import { resolveArchetypeTitle, resolveArchetypeRole } from "./shotBlueprints";
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

  if (input.poseDirection === "safe" && archetype.creativityBand.includes("safe")) {
    badges.push("Safe");
  }
  if (input.poseDirection === "balanced" && archetype.creativityBand.includes("balanced")) {
    badges.push("Balanced");
  }
  if (input.poseDirection === "directional" && archetype.creativityBand.includes("directional")) {
    badges.push("Directional");
  }
  if (archetype.logoVisibilitySuitability === "high" && input.brandVisibility !== "low") {
    badges.push("Logo-safe");
  }
  if (archetype.detailSuitability === "high") {
    badges.push("High detail");
  }
  if (archetype.shotCategory === "motion") {
    badges.push("Motion");
  }
  // Exactly one reliability label per shot
  if (archetype.difficulty === "hard" || archetype.higgsfieldReliability === "low") {
    badges.push("Higher risk");
  } else if (archetype.higgsfieldReliability === "high") {
    badges.push("High reliability");
  } else {
    badges.push("Moderate reliability");
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
      const moodCap = mood[0].toUpperCase() + mood.slice(1);
      const envSells: Partial<Record<string, string>> = {
        watches: `The ${item} in its world: ${moodCap}. Environment tells the buyer who wears this.`,
        belts: `The ${item} grounding a full look in context. ${moodCap} and outfit completeness.`,
        headwear: `The ${item} in its natural setting. ${moodCap} and street-level authenticity.`,
        scarves: `The ${item} styled within an environment. ${moodCap} and visual storytelling.`,
        small_accessories: `The ${item} in context: ${moodCap}. The environment signals taste and intentionality.`,
      };
      return envSells[input.productFamily] || `The ${item} in an environment that tells the buyer where this product lives. ${moodCap} in context.`;
    }
    if (archetype.id === "torso_turn_editorial") {
      const turnVerbs: Partial<Record<string, string>> = {
        watches: `Wrist presence in motion. The turn catches ${vocab.material} from a new angle.`,
        belts: `Waist definition through movement. The turn reveals ${vocab.material} from a new angle.`,
        headwear: `The ${item} anchoring a styled turn. The rotation shows ${vocab.material} from a new perspective.`,
        scarves: `Fabric in motion: the ${item} responds to the turn, revealing ${vocab.material}.`,
        small_accessories: `Styled confidence with the ${item}. The turn reveals ${vocab.material} from a new angle.`,
      };
      return turnVerbs[input.productFamily] || `Movement energy and styled confidence with the ${item}. The turn reveals ${vocab.material} from a new angle.`;
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
  const vocab = FAMILY_VOCABULARY[input.productFamily];
  const cat = archetype.shotCategory;

  if (priority === 1) {
    if (cat === "hero") {
      return `Validates the ${item} renders accurately. If ${vocab.product} shape or proportion is off, stop here.`;
    }
    if (cat === "product_focus") {
      return `Tests core ${vocab.product} rendering. If ${vocab.detail_focus} looks wrong, adjust before the full set.`;
    }
    return `Anchors the set. Confirms the ${item} renders correctly at this framing.`;
  }

  if (priority === 2) {
    return `Second angle confirms the ${item} renders consistently. Catches single-perspective flukes early.`;
  }

  if (priority === 3) {
    const firstTwoCats = allShots.slice(0, 2).map((s) => s.archetype.shotCategory);
    if (!firstTwoCats.includes("detail")) {
      return `First close-up. Tests ${vocab.material} rendering at close range before committing to the rest.`;
    }
    return `Completes the core trio. The set is commercially usable even if generation stops here.`;
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

  // Cross-shot trailing sentence repetition: CORRECTIVE (iterative)
  // Stripping one repeated trailing phrase may expose the next sentence as the new
  // trailing phrase, which itself may be repeated. Loop until stable.
  const MAX_TRAILING_PASSES = 4;
  for (let pass = 0; pass < MAX_TRAILING_PASSES; pass++) {
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
        if (!entry.rawSentence) {
          const sentences = shotRef.deltaBrief.split(/\.\s+/).filter(Boolean);
          entry.rawSentence = sentences[sentences.length - 1]?.trim() || "";
        }
        trailingCounts.set(sentence, entry);
      }
    }
    let correctedThisPass = false;
    for (const [, { positions, shotRefs, rawSentence }] of trailingCounts) {
      if (positions.length >= 3) {
        for (let i = 1; i < shotRefs.length; i++) {
          const shot = shotRefs[i];
          const escaped = rawSentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = new RegExp(`\\.?\\s*${escaped}\\.?\\s*$`, "i");
          const cleaned = shot.deltaBrief.replace(pattern, "").trim();
          if (cleaned !== shot.deltaBrief && cleaned.length > 20) {
            shot.deltaBrief = cleaned.endsWith(".") ? cleaned : cleaned + ".";
            correctedThisPass = true;
          }
        }
        issues.push({
          shotPosition: positions[0],
          issue: `[CORRECTED] Trailing phrase "${rawSentence.slice(0, 50)}..." was repeated in ${positions.length} shots; stripped from shots ${positions.slice(1).join(", ")}`,
        });
      }
    }
    if (!correctedThisPass) break;
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
        shot.whatItSells = `${shot.resolvedRole ?? shot.archetype.role} ${vocab.editorial_mood}.`;
      }

      // If the rewrite STILL matches, append archetype name as last resort
      if (shot.whatItSells.toLowerCase() === key) {
        shot.whatItSells = `${shot.whatItSells} (${(shot.resolvedTitle ?? shot.archetype.title).toLowerCase()})`;
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
    productEmphasis: resolveArchetypeRole(archetype, input.specificItem),
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
    whyGenerateNow: deriveWhyGenerateNow(archetype, priority, input, allShots || []),
    resolvedTitle: resolveArchetypeTitle(archetype, input.specificItem),
    resolvedRole: resolveArchetypeRole(archetype, input.specificItem),
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
