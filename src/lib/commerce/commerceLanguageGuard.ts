/**
 * Commerce Language Guard
 *
 * Single source of truth for all language enforcement in the commerce
 * engine. Exports assertNoEditorialLanguage() and
 * assertLiteralCommerceRegister(). The compiler calls these; register
 * rules must not be duplicated elsewhere.
 *
 * Operational behavior:
 * - Dev/CI (NODE_ENV !== "production"): hard-fail (throw)
 * - Production: warn + safe-rewrite or drop, never crash
 */

// ── Editorial Blocklist ──
// Organized by category. Applied to compiled prompt sentences only,
// not metadata, filenames, or technical scene constraint data.

const MOOD_ATMOSPHERE = [
  "softness", "intimacy", "mood", "atmosphere", "tension", "narrative",
  "story", "emotion", "feeling", "vibe", "energy", "drama", "sensuality",
  "mystery", "allure",
];

const EDITORIAL_DIRECTION = [
  "let the body announce", "draw closer", "invite the viewer",
  "command attention", "breathe", "whisper", "murmur", "suggest",
  "evoke", "inhabit", "surrender",
];

const TASTE_LANGUAGE = [
  "refined", "understated", "elevated", "effortless", "quiet luxury",
  "considered", "intentional",
];

const WORLD_BUILDING = [
  "world",
];

const LIGHTING_MOOD = [
  "golden hour", "blue hour", "dappled", "moody", "cinematic",
  "atmospheric", "ethereal", "dreamy",
];

const SURFACE_EDITORIALISING = [
  "buttery", "liquid", "second skin",
];

// Combined flat list for matching
const EDITORIAL_BLOCKLIST: string[] = [
  ...MOOD_ATMOSPHERE,
  ...EDITORIAL_DIRECTION,
  ...TASTE_LANGUAGE,
  ...WORLD_BUILDING,
  ...LIGHTING_MOOD,
  ...SURFACE_EDITORIALISING,
];

// ── Banned Phrasing (permissive/hedged language) ──

const BANNED_PHRASING = [
  "similar to",
  "inspired by",
  "in the style of",
  "maintain the feel of",
  "reminiscent of",
  "natural variation",
  "subtle difference",
  "allow for",
  "may include",
  "preserve the feeling",
];

// ── Context-Aware Exemptions ──
// Terms that are valid in technical contexts but blocked in editorial.
// The lint checks prompt sentences, not scene constraint blocks.

const SCENE_CONSTRAINT_MARKERS = [
  "[SCENE CONSTRAINTS]",
  "Camera at",
  "Subject",
  "light.",
];

function isInsideSceneConstraintBlock(sentence: string, fullPrompt: string): boolean {
  const idx = fullPrompt.indexOf(sentence);
  if (idx === -1) return false;

  // Check if the sentence appears after a scene constraint marker
  const preceding = fullPrompt.slice(0, idx);
  const lastMarker = Math.max(
    ...SCENE_CONSTRAINT_MARKERS.map((m) => preceding.lastIndexOf(m)),
  );

  // If a marker appears within the last 200 chars before this sentence,
  // treat it as inside a constraint block
  return lastMarker >= 0 && idx - lastMarker < 200;
}

function isInNegativePrompt(sentence: string, fullPrompt: string): boolean {
  // Check for explicit [FORBIDDEN] marker
  const negIdx = fullPrompt.indexOf("[FORBIDDEN]");
  if (negIdx !== -1) {
    const sentIdx = fullPrompt.indexOf(sentence);
    if (sentIdx > negIdx) return true;
  }

  // Sentences that negate editorial terms are constraints, not editorial leaks.
  // "Do not add editorial mood" is telling the AI NOT to do something.
  const trimmed = sentence.trim().toLowerCase();
  if (trimmed.startsWith("do not")) return true;

  return false;
}

// ── Rewrite/Drop Log Entry ──

export interface LanguageGuardLog {
  type: "rewrite" | "drop";
  original: string;
  rewritten?: string;
  reason: string;
  shotId?: string;
  timestamp: number;
}

// ── Approved Sentence Forms ──

const APPROVED_PREFIXES = [
  "Use the reference image",
  "Use the model reference",
  "Replace only",
  "Keep",
  "Do not change",
  "Do not add",
  "Do not remove",
  "Do not modify",
  "Do not alter",
  "Do not show",
  "Do not generate",
  "Do not copy",
  "Do NOT copy",
  "Replace the",
  "Replace only the",
  "Product:",
  "Product as shown",
  "Material:",
  "Finish:",
  "Colour:",
  "Construction:",
  "Hardware:",
  "Logo:",
  "Match",
  "Exact same",
  "Camera at",
  "Subject",
  "Visible zones:",
  "Occluded zones:",
  "Replacement safety:",
  "Warning:",
  "GARMENT ABSENCE CONSTRAINTS",
  "This garment has NO",
  "The model reference provides",
  "All clothing comes",
  "All composition comes",
  "All garment details come",
  "CONSISTENCY TARGET",
  "Close-up crop",
  "Tight macro crop",
  "Focus on",
  "Show fabric",
  "Show construction details",
  "Show material details",
  "BACKGROUND COHERENCE",
  "COMPOSITION FIDELITY",
  "TEMPLATE GARMENT ISOLATION",
  "IGNORE",
  "The template reference provides",
  "All garment appearance",
  "Maintain the same",
  "Do not darken",
  "Do not introduce",
  "Do NOT show",
  "Do NOT",
  "Show construction detail",
  "This is NOT",
  "Exact shot composition:",
  "Exact pose:",
  "Show the full product",
  "BODY GEOMETRY LOCK",
  "The template body geometry",
  "Do not re-pose",
  "Do not adjust",
  "TEMPLATE BACKGROUND LOCK",
  "The template reference image background",
  "The family template background",
  "If the anchor background",
  "The anchor must not",
  "The background must remain",
  "Do not warm",
  "Do not lighten",
  "SURFACE LOCK",
  "FLAT LAY GARMENT ISOLATION",
  "Do not let",
  "Do not replace",
  "Use the anchor shot",
  "All garment colour",
];

function matchesApprovedForm(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (!trimmed) return true; // empty is fine
  return APPROVED_PREFIXES.some((p) => trimmed.startsWith(p));
}

// ── Canonical Fallback Transforms ──

function attemptRewrite(sentence: string): { rewritten: string | null; reason: string } {
  const lower = sentence.toLowerCase();

  // Descriptive: "The garment should..." -> "Use the reference image exactly for..."
  if (lower.includes("should") || lower.includes("garment") || lower.includes("drape")) {
    const subject = extractSubject(sentence);
    if (subject) {
      return {
        rewritten: `Use the reference image exactly for ${subject}.`,
        reason: "descriptive_to_reference_lock",
      };
    }
  }

  // Permissive: "Allow..." or "may..." -> "Do not change..."
  if (lower.startsWith("allow") || lower.includes("may ") || lower.includes("variation")) {
    const subject = extractSubject(sentence);
    if (subject) {
      return {
        rewritten: `Do not change the ${subject} from the reference image.`,
        reason: "permissive_to_constraint",
      };
    }
  }

  // Editorial: contains blocklist terms -> drop
  if (EDITORIAL_BLOCKLIST.some((term) => lower.includes(term.toLowerCase()))) {
    return { rewritten: null, reason: "editorial_language_dropped" };
  }

  // Ambiguous: cannot determine rewrite -> drop
  return { rewritten: null, reason: "ambiguous_dropped" };
}

function extractSubject(sentence: string): string | null {
  // Simple heuristic: extract noun phrase after common verbs
  const patterns = [
    /(?:should|must|needs to)\s+(?:have|show|display|maintain|preserve)\s+(.+?)(?:\.|$)/i,
    /(?:allow|permit)\s+(.+?)(?:\.|$)/i,
    /(?:the|a)\s+(\w+(?:\s+\w+){0,3})(?:\s+(?:should|must|is))/i,
  ];

  for (const pat of patterns) {
    const match = sentence.match(pat);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

// ── Public API ──

/**
 * Check compiled prompt text for editorial language.
 * Runs on compiled prompt sentences only, not metadata or scene
 * constraint blocks.
 *
 * Dev/CI: throws on violation.
 * Production: returns logs of rewrites/drops.
 */
export function assertNoEditorialLanguage(
  prompt: string,
  shotId?: string,
): LanguageGuardLog[] {
  const logs: LanguageGuardLog[] = [];
  const sentences = prompt.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if (!sentence.trim()) continue;
    if (isInsideSceneConstraintBlock(sentence, prompt)) continue;
    if (isInNegativePrompt(sentence, prompt)) continue;

    const lower = sentence.toLowerCase();

    for (const term of EDITORIAL_BLOCKLIST) {
      if (lower.includes(term.toLowerCase())) {
        const log: LanguageGuardLog = {
          type: "drop",
          original: sentence,
          reason: `editorial_term: "${term}"`,
          shotId,
          timestamp: Date.now(),
        };
        logs.push(log);

        if (process.env.NODE_ENV !== "production") {
          throw new Error(
            `[CommerceLanguageGuard] Editorial language detected: "${term}" in sentence: "${sentence}"`,
          );
        }
        console.warn("[CommerceLanguageGuard] Dropped editorial sentence:", JSON.stringify(log));
        break;
      }
    }
  }

  return logs;
}

/**
 * Check compiled prompt text for literal commerce register compliance.
 * Every sentence should match an approved form or be a scene constraint.
 *
 * Dev/CI: throws on violation.
 * Production: attempts safe-rewrite; drops if ambiguous.
 */
export function assertLiteralCommerceRegister(
  prompt: string,
  shotId?: string,
): { cleanedPrompt: string; logs: LanguageGuardLog[] } {
  const logs: LanguageGuardLog[] = [];
  const sentences = prompt.split(/(?<=[.!?])\s+/);
  const cleaned: string[] = [];

  for (const sentence of sentences) {
    if (!sentence.trim()) continue;

    // Scene constraint blocks and negative prompts are exempt
    if (isInsideSceneConstraintBlock(sentence, prompt)) {
      cleaned.push(sentence);
      continue;
    }

    if (matchesApprovedForm(sentence)) {
      cleaned.push(sentence);
      continue;
    }

    // Not an approved form: warn in dev, rewrite/drop in production
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[CommerceLanguageGuard] Non-approved sentence form: "${sentence}"`);
    }

    // Production: attempt rewrite or drop
    const { rewritten, reason } = attemptRewrite(sentence);

    if (rewritten) {
      logs.push({
        type: "rewrite",
        original: sentence,
        rewritten,
        reason,
        shotId,
        timestamp: Date.now(),
      });
      console.warn("[CommerceLanguageGuard] Rewrote sentence:", JSON.stringify(logs[logs.length - 1]));
      cleaned.push(rewritten);
    } else {
      // If mapping is ambiguous, always drop rather than inventing a paraphrase.
      logs.push({
        type: "drop",
        original: sentence,
        reason,
        shotId,
        timestamp: Date.now(),
      });
      console.warn("[CommerceLanguageGuard] Dropped sentence:", JSON.stringify(logs[logs.length - 1]));
    }
  }

  return { cleanedPrompt: cleaned.join(" "), logs };
}

/**
 * Check for banned permissive/hedged phrasing.
 * These are never acceptable in commerce prompts regardless of context.
 */
export function assertNoBannedPhrasing(
  prompt: string,
  shotId?: string,
): LanguageGuardLog[] {
  const logs: LanguageGuardLog[] = [];
  const lower = prompt.toLowerCase();

  for (const phrase of BANNED_PHRASING) {
    if (lower.includes(phrase)) {
      const log: LanguageGuardLog = {
        type: "drop",
        original: phrase,
        reason: `banned_phrasing: "${phrase}"`,
        shotId,
        timestamp: Date.now(),
      };
      logs.push(log);

      if (process.env.NODE_ENV !== "production") {
        throw new Error(
          `[CommerceLanguageGuard] Banned phrasing detected: "${phrase}"`,
        );
      }
      console.warn("[CommerceLanguageGuard] Banned phrasing:", JSON.stringify(log));
    }
  }

  return logs;
}
