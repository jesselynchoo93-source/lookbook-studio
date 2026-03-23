/**
 * F8: Bag Proof Zones — shot classification + proof zone resolution + physics constraints.
 *
 * Classifies each bag shot into one of 6 classes (5 proof, 1 editorial) and
 * resolves the appropriate proof targets, physical behavior constraints, and
 * detail focus for that class.
 */
import type {
  RecommendedShot,
  BagFingerprint,
  BagShotClass,
  BagProofZone,
  PhysicalBehaviorConstraint,
} from "./types";

// ── Shot Classification ──

/**
 * Classify a bag shot into one of the 6 classes based on its archetype.
 * Falls back to editorial_desire for unrecognised patterns.
 */
export function classifyBagShot(shot: RecommendedShot): BagShotClass {
  const title = shot.archetype.title.toLowerCase();
  const id = shot.archetype.id.toLowerCase();
  const category = shot.archetype.shotCategory;
  const zones = shot.archetype.primaryDisplayZones.map(z => z.toLowerCase()).join(" ");

  // Macro / detail shots
  if (category === "detail") {
    if (title.includes("hardware") || title.includes("attachment") || title.includes("logo") || title.includes("brand")) {
      return "proof_macro_attachment_or_brand_zone";
    }
    if (title.includes("construction") || title.includes("texture") || title.includes("stitch")) {
      return "proof_macro_construction";
    }
    // Generic detail — classify by what the fingerprint needs most
    return "proof_macro_construction";
  }

  // Product-only: open-top / flatlay / capacity
  if (category === "product_focus") {
    if (title.includes("open") || title.includes("flatlay") || title.includes("flat") || title.includes("interior")) {
      return "proof_open_top_or_capacity";
    }
    return "proof_open_top_or_capacity";
  }

  // Hero / full body
  if (category === "hero" || id.includes("hero") || title.includes("hero")) {
    return "proof_hero";
  }

  // Profile / side carry
  if (title.includes("profile") || title.includes("side") || zones.includes("side_body")) {
    return "proof_profile";
  }

  // Silhouette standing shots that emphasise the bag
  if (category === "silhouette" && !title.includes("walk") && !title.includes("stride") && !title.includes("seat")) {
    return "proof_hero";
  }

  // Editorial / motion / seated / walking
  return "editorial_desire";
}

// ── Proof Zone Resolution ──

/**
 * Resolve proof targets for a detail or macro shot based on the
 * shot class and the actual fingerprint. Returns ordered by priority.
 */
export function resolveProofTargets(
  shotClass: BagShotClass,
  fp: BagFingerprint,
): BagProofZone[] {
  switch (shotClass) {
    case "proof_macro_construction": {
      const zones: BagProofZone[] = ["panel_seam", "edge_finishing", "leather_surface"];
      return zones;
    }

    case "proof_macro_attachment_or_brand_zone": {
      const zones: BagProofZone[] = ["handle_attachment"];
      if (fp.logoScale !== "none" && fp.logoPlacement) zones.push("logo_zone");
      zones.push("hardware_finish");
      return zones;
    }

    case "proof_open_top_or_capacity":
      return ["opening_geometry", "interior", "leather_surface"];

    case "proof_hero":
      return ["silhouette", "handle_attachment", "hardware_finish"];

    case "proof_profile":
      return ["silhouette", "hardware_finish", "leather_surface"];

    case "editorial_desire":
      return ["silhouette"]; // editorial still proves shape
  }
}

/**
 * Build a one-line detail focus string for a macro/detail shot.
 * Selects ONE primary proof target, not a laundry list.
 */
export function buildDetailFocus(
  shotClass: BagShotClass,
  fp: BagFingerprint,
): string {
  switch (shotClass) {
    case "proof_macro_construction":
      return [
        `Panel seam transition on ${fp.materialFinish} ${fp.materialColour} surface`,
        fp.constructionStyle ? `${fp.constructionStyle} construction visible` : "",
        "edge finishing in sharp focus",
      ].filter(Boolean).join(". ") + ".";

    case "proof_macro_attachment_or_brand_zone": {
      const parts: string[] = [];
      if (fp.handleAttachment) {
        parts.push(`${fp.handleAttachment} handle attachment`);
      }
      if (fp.logoScale !== "none" && fp.logoPlacement) {
        const hw = fp.hardwareFinish !== "none" ? fp.hardwareFinish : "";
        const style = fp.logoStyle !== "none" ? fp.logoStyle : "";
        parts.push(`${fp.logoScale} ${hw} ${style} mark at ${fp.logoPlacement}`.replace(/\s+/g, " ").trim());
      }
      if (parts.length === 0) parts.push("hardware attachment point");
      return parts.join(", ") + ". Leather texture around attachment visible.";
    }

    case "proof_open_top_or_capacity":
      return [
        "Opening geometry and top rim behavior",
        "interior lining visible",
        "base reads heavier than upper rim",
        fp.closureType === "open-top" ? "no closure hardware" : `${fp.closureType} closure mechanism`,
      ].join(". ") + ".";

    default:
      return "";
  }
}

// ── Physical Behavior Constraints ──

/**
 * Return shot-specific physics constraints for a bag shot class.
 * These are hard rules about how the bag must behave physically.
 */
export function getBagPhysicsConstraints(
  shotClass: BagShotClass,
  fp: BagFingerprint,
): PhysicalBehaviorConstraint[] {
  const base: PhysicalBehaviorConstraint[] = [
    {
      zone: "overall",
      behavior: "Same exact object across all shots, consistent panel proportions",
      antiPattern: "no morphing, no shape simplification between shots",
    },
  ];

  switch (shotClass) {
    case "proof_hero":
      return [
        ...base,
        {
          zone: "handles",
          behavior: "Visible weight in wrist/arm, slight asymmetry in handle arcs",
          antiPattern: "no floating handles, no perfectly mirrored handle curves",
        },
        {
          zone: "side_panels",
          behavior: "Slight asymmetry in side panels from carry weight",
          antiPattern: "no rigid symmetry on soft goods",
        },
        {
          zone: "bottom_edge",
          behavior: "Bottom edge follows gravity, not ruler-straight",
          antiPattern: "no perfectly flat bottom unless structured base",
        },
      ];

    case "proof_profile":
      return [
        ...base,
        {
          zone: "bottom_edge",
          behavior: "Bottom edge follows gravity, slight sag visible",
          antiPattern: "no rigid geometric bottom line",
        },
        {
          zone: "opening",
          behavior: fp.closureType === "open-top"
            ? "Top opening not unnaturally rigid, slight natural flex"
            : "Closure visible and operating as expected",
          antiPattern: "no perfectly rigid opening edge",
        },
        {
          zone: "body_contact",
          behavior: "Body contact subtly influences silhouette where bag meets hip/torso",
          antiPattern: "no floating gap between bag and body",
        },
      ];

    case "proof_open_top_or_capacity":
      return [
        ...base,
        {
          zone: "opening",
          behavior: "Opening asymmetry allowed, top rim slight sag, natural flex",
          antiPattern: "no mirror-perfect opening geometry",
        },
        {
          zone: "handles",
          behavior: "Handle torsion natural, one handle may collapse more than the other",
          antiPattern: "no perfectly upright parallel handles",
        },
        {
          zone: "interior",
          behavior: "Interior walls not mirror-perfect, base reads heavier than upper rim",
          antiPattern: "no CGI-clean interior",
        },
      ];

    case "proof_macro_construction":
      return [
        ...base,
        {
          zone: "seam",
          behavior: "Seam path must be reference-faithful, no invented stitch routes",
          antiPattern: "no decorative luxury stitching if reference does not show it",
        },
        {
          zone: "surface",
          behavior: `${fp.materialFinish} ${fp.materialColour} surface with natural grain and micro-variation`,
          antiPattern: "no CGI-smooth surface, no rubbery deformation",
        },
      ];

    case "proof_macro_attachment_or_brand_zone":
      return [
        ...base,
        {
          zone: "attachment",
          behavior: fp.handleAttachment
            ? `${fp.handleAttachment} attachment true to reference`
            : "Attachment hardware true to reference",
          antiPattern: "no invented hardware, no relocated attachment points",
        },
        {
          zone: "logo",
          behavior: fp.logoScale !== "none"
            ? `${fp.logoStyle} mark preserved at ${fp.logoPlacement}, no beautification`
            : "No logo should appear",
          antiPattern: "no readable generated text, no relocated logos, no invented marks",
        },
      ];

    case "editorial_desire":
      return [
        ...base,
        {
          zone: "bag_on_body",
          behavior: "Bag compresses slightly where it contacts body, visible weight",
          antiPattern: "no hovering, no weightless carry",
        },
        {
          zone: "handles",
          behavior: "Handle responds to grip, not rigid",
          antiPattern: "no frozen handle position",
        },
      ];
  }
}

/**
 * Compile physics constraints into a compact string for the provider prompt.
 * Target: 2-3 short sentences.
 */
export function compilePhysicsBlock(
  constraints: PhysicalBehaviorConstraint[],
): string {
  // Skip the base "overall" constraint (handled by reference lock)
  const specific = constraints.filter(c => c.zone !== "overall");
  if (specific.length === 0) return "";

  // Take top 3 constraints, combine behavior phrases
  const behaviors = specific
    .slice(0, 3)
    .map(c => c.behavior);
  return behaviors.join(". ") + ".";
}

/**
 * Compile physics anti-patterns into negative prompt fragments.
 */
export function compilePhysicsNegatives(
  constraints: PhysicalBehaviorConstraint[],
): string {
  const negatives = constraints
    .filter(c => c.zone !== "overall")
    .map(c => c.antiPattern.replace(/^no\s+/i, ""))
    .slice(0, 4);
  return negatives.join(", ");
}
