"use client";

import type { ProductFamily, ShotCategory, SkinPolishStatus } from "@/lib/lookbook/types";

interface SkinPolishBlockProps {
  family: ProductFamily;
  shotCategory: ShotCategory;
  skinPolish: SkinPolishStatus;
  onStatusChange: (status: SkinPolishStatus) => void;
}

// ── Family-aware skin-polish guidance ──
// What to focus on, what to protect, what to avoid.
// Skin-only: no product, garment, or background corrections.

interface SkinPolishGuidance {
  focus: string;
  protect: string[];
  avoid: string[];
}

const SKIN_POLISH_GUIDANCE: Record<ProductFamily, SkinPolishGuidance> = {
  belts: {
    focus: "Hands and waist area where skin is visible near the belt",
    protect: [
      "Leather grain and edge paint at belt-to-skin boundary",
      "Buckle metal finish and prong detail",
      "Natural shadow under the belt edge",
    ],
    avoid: [
      "Smoothing skin so much that the belt edge looks pasted on",
      "Altering belt colour or leather texture while retouching nearby skin",
    ],
  },
  headwear: {
    focus: "Face, forehead, and hairline where the hat meets skin",
    protect: [
      "Hat-to-head contact line and hair-to-hat transition",
      "Brim shadow falling naturally across the face",
      "Material surface texture (knit, woven, felt)",
    ],
    avoid: [
      "Removing natural brim shadow from the face",
      "Over-smoothing the forehead where the hat sits",
    ],
  },
  bags: {
    focus: "Shoulder, hands, and arm skin near strap contact",
    protect: [
      "Strap-to-shoulder contact and natural skin compression",
      "Leather grain and hardware at the product-to-body boundary",
      "Natural shadow where the bag rests against the body",
    ],
    avoid: [
      "Smoothing skin where the strap presses, which removes realism",
      "Altering bag colour or hardware finish while retouching nearby skin",
    ],
  },
  watches: {
    focus: "Wrist and hand skin around the watch",
    protect: [
      "Strap-to-wrist contact and natural skin compression",
      "Dial reflections and case metal finish",
      "Vein and tendon detail on the wrist and hand",
    ],
    avoid: [
      "Over-smoothing wrist skin, which makes the watch look floating",
      "Removing natural wrist creases near the strap edge",
    ],
  },
  jewelry: {
    focus: "Skin at the point of contact: ear, neck, wrist, or finger",
    protect: [
      "Metal-to-skin contact (earring weight, necklace drape, ring fit)",
      "Stone facets and metal reflections",
      "Natural skin shadow under the piece",
    ],
    avoid: [
      "Smoothing ear or neck skin so much the jewelry looks weightless",
      "Altering metal colour while retouching nearby skin",
    ],
  },
  eyewear: {
    focus: "Face skin, nose bridge, and temple area",
    protect: [
      "Frame-to-skin contact at nose bridge and temples",
      "Lens coating and hinge hardware",
      "Natural shadow cast by the frames on the face",
    ],
    avoid: [
      "Removing frame shadow from the cheekbones",
      "Over-smoothing the nose bridge where frames sit",
    ],
  },
  footwear: {
    focus: "Ankle and foot skin visible near the shoe",
    protect: [
      "Shoe-to-foot contact and natural ankle creases",
      "Lacing, eyelets, and sole tread detail",
      "Natural shadow at the shoe opening",
    ],
    avoid: [
      "Over-smoothing ankle skin, which makes the shoe look detached",
      "Altering shoe colour while retouching nearby skin",
    ],
  },
  apparel: {
    focus: "Exposed skin at neckline, cuffs, and hem",
    protect: [
      "Fabric-to-skin contact at collar, cuffs, and hemline",
      "Button, zipper, and seam detail near skin edges",
      "Natural fabric drape and shadow",
    ],
    avoid: [
      "Smoothing skin at the neckline so much the collar looks painted on",
      "Altering garment colour while retouching nearby skin",
    ],
  },
  scarves: {
    focus: "Neck and shoulder skin where the scarf drapes",
    protect: [
      "Scarf-to-skin drape line and natural folds",
      "Weave pattern and fringe detail",
      "Natural shadow under the scarf edge",
    ],
    avoid: [
      "Removing natural neck creases under the scarf",
      "Over-smoothing shoulder skin where the fabric rests",
    ],
  },
  small_accessories: {
    focus: "Hand and finger skin near the accessory",
    protect: [
      "Product-to-hand contact and natural grip",
      "Clasp, hinge, and hardware detail",
      "Natural skin creases at finger joints",
    ],
    avoid: [
      "Over-smoothing hand skin, which removes realism",
      "Altering accessory finish while retouching nearby skin",
    ],
  },
  full_look: {
    focus: "All exposed skin: face, arms, hands, legs",
    protect: [
      "Fabric-to-skin contact at all garment edges",
      "Accessory hardware and trim near skin",
      "Layering contact points where clothing overlaps skin",
    ],
    avoid: [
      "Making all skin uniformly smooth across different body areas",
      "Altering garment or accessory colour while retouching",
    ],
  },
};

// Universal rules that apply to every family
const UNIVERSAL_AVOID = [
  "Do not plastic-smooth the face or body",
  "Keep skin tone consistent across the set",
  "Keep lighting and shadow transitions believable",
];

export default function SkinPolishBlock({
  family,
  shotCategory,
  skinPolish,
  onStatusChange,
}: SkinPolishBlockProps) {
  const guidance = SKIN_POLISH_GUIDANCE[family];

  // Determine if this is a detail/product_focus shot (less skin visible)
  const isDetailShot = shotCategory === "detail" || shotCategory === "product_focus";

  return (
    <div className="bg-[--surface-inset] rounded-lg p-3 space-y-3">
      {/* Header with status toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[--text-secondary] uppercase tracking-wider">
          Skin Polish
        </span>
        <div className="flex gap-1.5">
          {skinPolish === "not_applicable" && (
            <button
              onClick={() => onStatusChange("ready")}
              className="text-[10px] px-2 py-0.5 rounded-full border border-[--border-default] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
            >
              Mark ready
            </button>
          )}
          {skinPolish === "ready" && (
            <>
              <button
                onClick={() => onStatusChange("done")}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[--status-success-bg] text-[--status-success-text] hover:opacity-80 transition-opacity"
              >
                Mark polished
              </button>
              <button
                onClick={() => onStatusChange("not_applicable")}
                className="text-[10px] px-2 py-0.5 rounded-full border border-[--border-default] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
              >
                Skip
              </button>
            </>
          )}
          {skinPolish === "done" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--status-success-bg] text-[--status-success-text]">
              Polished
            </span>
          )}
        </div>
      </div>

      {/* Guidance (shown when ready, collapsed when done) */}
      {skinPolish === "ready" && (
        <div className="space-y-2">
          {isDetailShot && (
            <p className="text-[10px] text-[--text-tertiary] italic">
              Detail shot with limited skin visible. Polish may not be needed.
            </p>
          )}

          {/* Focus */}
          <div>
            <span className="text-[10px] text-[--text-tertiary]">Focus:</span>
            <p className="text-[11px] text-[--text-secondary] mt-0.5">{guidance.focus}</p>
          </div>

          {/* Protect these details */}
          <div>
            <span className="text-[10px] text-[--text-tertiary]">Protect:</span>
            <ul className="mt-0.5 space-y-0.5">
              {guidance.protect.map((item, i) => (
                <li key={i} className="text-[11px] text-[--text-secondary] flex items-start gap-1.5">
                  <span className="text-[--text-tertiary] mt-0.5 shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Avoid */}
          <div>
            <span className="text-[10px] text-[--text-tertiary]">Avoid:</span>
            <ul className="mt-0.5 space-y-0.5">
              {[...guidance.avoid, ...UNIVERSAL_AVOID].map((item, i) => (
                <li key={i} className="text-[11px] text-[--text-secondary] flex items-start gap-1.5">
                  <span className="text-[--status-error-text]/50 mt-0.5 shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
