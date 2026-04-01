"use client";

import { useState, useCallback } from "react";
import type {
  ProductFamily,
  ProductFingerprint,
  BagFingerprint,
  WatchFingerprint,
  BeltFingerprint,
  JewelryFingerprint,
  EyewearFingerprint,
  ApparelFingerprint,
  FootwearFingerprint,
  HeadwearFingerprint,
  ScarfFingerprint,
  SmallAccessoryFingerprint,
  FullLookFingerprint,
} from "@/lib/lookbook/types";

interface ProductFingerprintFormProps {
  family: ProductFamily;
  value?: ProductFingerprint;
  onChange: (fp: ProductFingerprint | undefined) => void;
}

// ── Shared fields ──

function BaseFields({
  fp,
  onUpdate,
}: {
  fp: Partial<ProductFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Material Finish"
          placeholder="smooth, pebbled, suede..."
          value={(fp as any).materialFinish || ""}
          onChange={(v) => onUpdate({ materialFinish: v })}
        />
        <Field
          label="Material Colour"
          placeholder="cognac, black, navy..."
          value={(fp as any).materialColour || ""}
          onChange={(v) => onUpdate({ materialColour: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Hardware Finish"
          value={(fp as any).hardwareFinish || "none"}
          options={["gold", "silver", "gunmetal", "rose-gold", "brass", "matte-black", "none"]}
          onChange={(v) => onUpdate({ hardwareFinish: v })}
        />
        <Select
          label="Logo Scale"
          value={(fp as any).logoScale || "none"}
          options={["subtle", "medium", "prominent", "none"]}
          onChange={(v) => onUpdate({ logoScale: v })}
        />
        <Select
          label="Logo Style"
          value={(fp as any).logoStyle || "none"}
          options={["foil", "embossed", "engraved", "metal-plate", "printed", "none"]}
          onChange={(v) => onUpdate({ logoStyle: v })}
        />
      </div>
      {(fp as any).logoScale !== "none" && (
        <Field
          label="Logo Placement"
          placeholder="centre-front, tongue, side..."
          value={(fp as any).logoPlacement || ""}
          onChange={(v) => onUpdate({ logoPlacement: v })}
        />
      )}
      <div>
        <label className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1">
          Forbidden Elements (comma-separated)
        </label>
        <input
          type="text"
          className="w-full text-sm bg-[--surface-inset] border border-[--border-default] rounded-lg px-3 py-2 text-[--text-primary] placeholder-[--text-tertiary]"
          placeholder="crossbody strap, zipper, chain..."
          value={((fp as any).forbiddenElements || []).join(", ")}
          onChange={(e) =>
            onUpdate({
              forbiddenElements: e.target.value
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </div>
  );
}

// ── Bag-specific fields ──

function BagFields({
  fp,
  onUpdate,
}: {
  fp: Partial<BagFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Silhouette Primary"
          placeholder="tote, crossbody, clutch..."
          value={fp.silhouettePrimary || ""}
          onChange={(v) => onUpdate({ silhouettePrimary: v })}
        />
        <Field
          label="Silhouette Shape"
          placeholder="trapezoid, rectangular, bucket..."
          value={fp.silhouetteShape || ""}
          onChange={(v) => onUpdate({ silhouetteShape: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Handle Count"
          value={String(fp.handleCount ?? 2)}
          options={["0", "1", "2"]}
          onChange={(v) => onUpdate({ handleCount: Number(v) })}
        />
        <Field
          label="Handle Type"
          placeholder="rolled, flat, chain..."
          value={fp.handleType || ""}
          onChange={(v) => onUpdate({ handleType: v })}
        />
        <Field
          label="Handle Attachment"
          placeholder="covered-studs, ring..."
          value={fp.handleAttachment || ""}
          onChange={(v) => onUpdate({ handleAttachment: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fp.strapPresent ?? false}
            onChange={(e) => onUpdate({ strapPresent: e.target.checked })}
            className="rounded border-[--border-default]"
          />
          <span className="text-xs text-[--text-secondary]">Strap Present</span>
        </div>
        {fp.strapPresent && (
          <Field
            label="Strap Type"
            placeholder="adjustable, chain..."
            value={fp.strapType || ""}
            onChange={(v) => onUpdate({ strapType: v })}
          />
        )}
        <Select
          label="Closure Type"
          value={fp.closureType || "open-top"}
          options={["open-top", "zipper", "flap", "magnetic", "drawstring", "buckle"]}
          onChange={(v) => onUpdate({ closureType: v })}
        />
      </div>
      <Field
        label="Construction Style"
        placeholder="clean-minimal, quilted, structured..."
        value={fp.constructionStyle || ""}
        onChange={(v) => onUpdate({ constructionStyle: v })}
      />
    </div>
  );
}

// ── Watch-specific fields ──

function WatchFields({
  fp,
  onUpdate,
}: {
  fp: Partial<WatchFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Case Shape"
          value={fp.caseShape || "round"}
          options={["round", "rectangular", "cushion", "tonneau", "square"]}
          onChange={(v) => onUpdate({ caseShape: v })}
        />
        <Field
          label="Case Size"
          placeholder="36mm, 40mm, 42mm..."
          value={fp.caseSize || ""}
          onChange={(v) => onUpdate({ caseSize: v })}
        />
        <Field
          label="Dial Colour"
          placeholder="white, black, blue..."
          value={fp.dialColour || ""}
          onChange={(v) => onUpdate({ dialColour: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Dial Type"
          placeholder="sunburst, matte, guilloche..."
          value={fp.dialType || ""}
          onChange={(v) => onUpdate({ dialType: v })}
        />
        <Field
          label="Strap Type"
          placeholder="leather, bracelet, rubber..."
          value={fp.strapType || ""}
          onChange={(v) => onUpdate({ strapType: v })}
        />
        <Field
          label="Strap Colour"
          placeholder="brown, black, silver..."
          value={fp.strapColour || ""}
          onChange={(v) => onUpdate({ strapColour: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Bezel Type"
          value={fp.bezelType || "fixed-smooth"}
          options={["fixed-smooth", "rotating", "fluted", "none"]}
          onChange={(v) => onUpdate({ bezelType: v })}
        />
        <Field
          label="Crown Position"
          placeholder="3 o'clock, 4 o'clock..."
          value={fp.crownPosition || ""}
          onChange={(v) => onUpdate({ crownPosition: v })}
        />
        <Select
          label="Complications"
          value={String(fp.complicationCount ?? 0)}
          options={["0", "1", "2", "3"]}
          onChange={(v) => onUpdate({ complicationCount: Number(v) })}
        />
      </div>
      <Field
        label="Construction Style"
        placeholder="dress, sport, dive..."
        value={fp.constructionStyle || ""}
        onChange={(v) => onUpdate({ constructionStyle: v })}
      />
    </div>
  );
}

// ── Belt-specific fields ──

function BeltFields({
  fp,
  onUpdate,
}: {
  fp: Partial<BeltFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Belt Width"
          placeholder="narrow, medium, wide..."
          value={fp.beltWidth || ""}
          onChange={(v) => onUpdate({ beltWidth: v })}
        />
        <Field
          label="Buckle Type"
          placeholder="pin, plate, D-ring..."
          value={fp.buckleType || ""}
          onChange={(v) => onUpdate({ buckleType: v })}
        />
        <Field
          label="Buckle Shape"
          placeholder="rectangular, round, oval..."
          value={fp.buckleShape || ""}
          onChange={(v) => onUpdate({ buckleShape: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Tip Style"
          placeholder="pointed, square, rounded..."
          value={fp.tipStyle || ""}
          onChange={(v) => onUpdate({ tipStyle: v })}
        />
        <Field
          label="Construction Style"
          placeholder="single-layer, double-layer..."
          value={fp.constructionStyle || ""}
          onChange={(v) => onUpdate({ constructionStyle: v })}
        />
      </div>
    </div>
  );
}

// ── Jewelry-specific fields ──

function JewelryFields({
  fp,
  onUpdate,
}: {
  fp: Partial<JewelryFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Jewelry Type"
          placeholder="earring, necklace, ring..."
          value={fp.jewelryType || ""}
          onChange={(v) => onUpdate({ jewelryType: v })}
        />
        <Field
          label="Setting Type"
          placeholder="prong, bezel, channel..."
          value={fp.settingType || ""}
          onChange={(v) => onUpdate({ settingType: v })}
        />
        <Field
          label="Construction Style"
          placeholder="cast, wire-wrapped..."
          value={fp.constructionStyle || ""}
          onChange={(v) => onUpdate({ constructionStyle: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fp.stonePresent ?? false}
            onChange={(e) => onUpdate({ stonePresent: e.target.checked })}
            className="rounded border-[--border-default]"
          />
          <span className="text-xs text-[--text-secondary]">Stone Present</span>
        </div>
        {fp.stonePresent && (
          <Field
            label="Stone Type"
            placeholder="diamond, pearl, ruby..."
            value={fp.stoneType || ""}
            onChange={(v) => onUpdate({ stoneType: v })}
          />
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fp.pairSymmetry ?? false}
            onChange={(e) => onUpdate({ pairSymmetry: e.target.checked })}
            className="rounded border-[--border-default]"
          />
          <span className="text-xs text-[--text-secondary]">Pair Symmetry</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Chain Type"
          placeholder="cable, curb, rope, none..."
          value={fp.chainType || ""}
          onChange={(v) => onUpdate({ chainType: v })}
        />
        <Field
          label="Drop Length"
          placeholder="short, medium, shoulder..."
          value={fp.dropLength || ""}
          onChange={(v) => onUpdate({ dropLength: v })}
        />
      </div>
    </div>
  );
}

// ── Eyewear-specific fields ──

function EyewearFields({
  fp,
  onUpdate,
}: {
  fp: Partial<EyewearFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Eyewear Type"
          placeholder="sunglasses, optical..."
          value={fp.eyewearType || ""}
          onChange={(v) => onUpdate({ eyewearType: v })}
        />
        <Field
          label="Frame Shape"
          placeholder="aviator, wayfarer, cat-eye..."
          value={fp.frameShape || ""}
          onChange={(v) => onUpdate({ frameShape: v })}
        />
        <Field
          label="Frame Material"
          placeholder="acetate, metal, titanium..."
          value={fp.frameMaterial || ""}
          onChange={(v) => onUpdate({ frameMaterial: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Lens Type"
          placeholder="tinted, gradient, mirrored..."
          value={fp.lensType || ""}
          onChange={(v) => onUpdate({ lensType: v })}
        />
        <Field
          label="Lens Colour"
          placeholder="grey, brown, blue..."
          value={fp.lensColour || ""}
          onChange={(v) => onUpdate({ lensColour: v })}
        />
        <Field
          label="Temple Style"
          placeholder="straight, curved, wire..."
          value={fp.templeStyle || ""}
          onChange={(v) => onUpdate({ templeStyle: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Bridge Type"
          placeholder="keyhole, saddle, nose-pad..."
          value={fp.bridgeType || ""}
          onChange={(v) => onUpdate({ bridgeType: v })}
        />
        <Field
          label="Construction Style"
          placeholder="moulded, assembled..."
          value={fp.constructionStyle || ""}
          onChange={(v) => onUpdate({ constructionStyle: v })}
        />
      </div>
    </div>
  );
}

// ── Apparel-specific fields ──

function ApparelFields({
  fp,
  onUpdate,
}: {
  fp: Partial<ApparelFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Apparel Type"
          placeholder="jacket, dress, blazer..."
          value={fp.apparelType || ""}
          onChange={(v) => onUpdate({ apparelType: v })}
        />
        <Field
          label="Fit Type"
          placeholder="slim, oversized, tailored..."
          value={fp.fitType || ""}
          onChange={(v) => onUpdate({ fitType: v })}
        />
        <Field
          label="Neckline"
          placeholder="crew, v-neck, collar..."
          value={fp.neckline || ""}
          onChange={(v) => onUpdate({ neckline: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Sleeve Length"
          placeholder="short, long, sleeveless..."
          value={fp.sleeveLength || ""}
          onChange={(v) => onUpdate({ sleeveLength: v })}
        />
        <Field
          label="Hem Length"
          placeholder="cropped, hip, knee..."
          value={fp.hemLength || ""}
          onChange={(v) => onUpdate({ hemLength: v })}
        />
        <Select
          label="Closure Type"
          value={fp.closureType || "button"}
          options={["button", "zip", "snap", "pull-on", "wrap", "toggle", "hook"]}
          onChange={(v) => onUpdate({ closureType: v })}
        />
      </div>
      <Field
        label="Construction Style"
        placeholder="tailored, knit, woven..."
        value={fp.constructionStyle || ""}
        onChange={(v) => onUpdate({ constructionStyle: v })}
      />
    </div>
  );
}

// ── Footwear-specific fields ──

function FootwearFields({
  fp,
  onUpdate,
}: {
  fp: Partial<FootwearFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Footwear Type"
          placeholder="sneaker, boot, loafer..."
          value={fp.footwearType || ""}
          onChange={(v) => onUpdate({ footwearType: v })}
        />
        <Field
          label="Heel Height"
          placeholder="flat, low, mid, high..."
          value={fp.heelHeight || ""}
          onChange={(v) => onUpdate({ heelHeight: v })}
        />
        <Field
          label="Toe Shape"
          placeholder="round, pointed, square..."
          value={fp.toeShape || ""}
          onChange={(v) => onUpdate({ toeShape: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Sole Type"
          placeholder="rubber, leather, platform..."
          value={fp.soleType || ""}
          onChange={(v) => onUpdate({ soleType: v })}
        />
        <Select
          label="Closure Type"
          value={fp.closureType || "slip-on"}
          options={["lace-up", "slip-on", "buckle", "zip", "strap", "velcro"]}
          onChange={(v) => onUpdate({ closureType: v })}
        />
        <Field
          label="Ankle Height"
          placeholder="low, ankle, mid-calf..."
          value={fp.ankleHeight || ""}
          onChange={(v) => onUpdate({ ankleHeight: v })}
        />
      </div>
      <Field
        label="Construction Style"
        placeholder="cemented, stitched, welted..."
        value={fp.constructionStyle || ""}
        onChange={(v) => onUpdate({ constructionStyle: v })}
      />
    </div>
  );
}

// ── Headwear-specific fields ──

function HeadwearFields({
  fp,
  onUpdate,
}: {
  fp: Partial<HeadwearFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Headwear Type"
          placeholder="cap, beanie, fedora..."
          value={fp.headwearType || ""}
          onChange={(v) => onUpdate({ headwearType: v })}
        />
        <Field
          label="Crown Shape"
          placeholder="structured, unstructured..."
          value={fp.crownShape || ""}
          onChange={(v) => onUpdate({ crownShape: v })}
        />
        <Field
          label="Brim Style"
          placeholder="flat, curved, wide, none..."
          value={fp.brimStyle || ""}
          onChange={(v) => onUpdate({ brimStyle: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Closure Type"
          placeholder="snapback, fitted, elastic..."
          value={fp.closureType || ""}
          onChange={(v) => onUpdate({ closureType: v })}
        />
        <Field
          label="Construction Style"
          placeholder="woven, knit, felt..."
          value={fp.constructionStyle || ""}
          onChange={(v) => onUpdate({ constructionStyle: v })}
        />
      </div>
    </div>
  );
}

// ── Scarf-specific fields ──

function ScarfFields({
  fp,
  onUpdate,
}: {
  fp: Partial<ScarfFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Scarf Type"
          placeholder="scarf, shawl, bandana..."
          value={fp.scarfType || ""}
          onChange={(v) => onUpdate({ scarfType: v })}
        />
        <Field
          label="Dimensions"
          placeholder="square, rectangular..."
          value={fp.dimensions || ""}
          onChange={(v) => onUpdate({ dimensions: v })}
        />
        <Field
          label="Fabric Weight"
          placeholder="sheer, lightweight, heavy..."
          value={fp.fabricWeight || ""}
          onChange={(v) => onUpdate({ fabricWeight: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Pattern Type"
          placeholder="solid, printed, jacquard..."
          value={fp.patternType || ""}
          onChange={(v) => onUpdate({ patternType: v })}
        />
        <Field
          label="Edge Finish"
          placeholder="fringed, hemmed, rolled..."
          value={fp.edgeFinish || ""}
          onChange={(v) => onUpdate({ edgeFinish: v })}
        />
        <Field
          label="Construction Style"
          placeholder="woven, knit, printed..."
          value={fp.constructionStyle || ""}
          onChange={(v) => onUpdate({ constructionStyle: v })}
        />
      </div>
    </div>
  );
}

// ── Small Accessory-specific fields ──

function SmallAccessoryFields({
  fp,
  onUpdate,
}: {
  fp: Partial<SmallAccessoryFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Accessory Type"
          placeholder="wallet, card-holder..."
          value={fp.accessoryType || ""}
          onChange={(v) => onUpdate({ accessoryType: v })}
        />
        <Field
          label="Opening Type"
          placeholder="fold, zip, snap..."
          value={fp.openingType || ""}
          onChange={(v) => onUpdate({ openingType: v })}
        />
        <Field
          label="Construction Style"
          placeholder="stitched, bonded..."
          value={fp.constructionStyle || ""}
          onChange={(v) => onUpdate({ constructionStyle: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Card Slots"
          value={String(fp.cardSlots ?? 0)}
          options={["0", "1", "2", "3", "4", "5", "6", "8", "10", "12"]}
          onChange={(v) => onUpdate({ cardSlots: Number(v) || undefined })}
        />
        <Select
          label="Compartments"
          value={String(fp.compartmentCount ?? 0)}
          options={["0", "1", "2", "3", "4", "5"]}
          onChange={(v) => onUpdate({ compartmentCount: Number(v) || undefined })}
        />
      </div>
    </div>
  );
}

// ── Full Look-specific fields ──

function FullLookFields({
  fp,
  onUpdate,
}: {
  fp: Partial<FullLookFingerprint>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Primary Piece"
          placeholder="blazer, coat, dress..."
          value={fp.primaryPiece || ""}
          onChange={(v) => onUpdate({ primaryPiece: v })}
        />
        <Field
          label="Style Direction"
          placeholder="casual, formal, editorial..."
          value={fp.styleDirection || ""}
          onChange={(v) => onUpdate({ styleDirection: v })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Layering Count"
          value={String(fp.layeringCount ?? 1)}
          options={["1", "2", "3", "4", "5"]}
          onChange={(v) => onUpdate({ layeringCount: Number(v) })}
        />
        <Field
          label="Colour Palette"
          placeholder="monochrome, tonal..."
          value={fp.colourPalette || ""}
          onChange={(v) => onUpdate({ colourPalette: v })}
        />
        <Field
          label="Construction Style"
          placeholder="tailored, casual, mixed..."
          value={fp.constructionStyle || ""}
          onChange={(v) => onUpdate({ constructionStyle: v })}
        />
      </div>
    </div>
  );
}

// ── Shared form primitives ──

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1">
        {label}
      </label>
      <input
        type="text"
        className="w-full text-sm bg-[--surface-inset] border border-[--border-default] rounded-lg px-3 py-2 text-[--text-primary] placeholder-[--text-tertiary]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1">
        {label}
      </label>
      <select
        className="w-full text-sm bg-[--surface-inset] border border-[--border-default] rounded-lg px-3 py-2 text-[--text-primary]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Supported families ──

const SUPPORTED_FAMILIES = new Set<ProductFamily>([
  "bags", "watches", "belts", "jewelry",
  "eyewear", "apparel", "footwear", "headwear",
  "scarves", "small_accessories", "full_look",
]);

// ── Default fingerprints ──

function defaultFingerprint(family: ProductFamily): ProductFingerprint | undefined {
  const base = {
    materialFinish: "",
    materialColour: "",
    hardwareFinish: "none" as const,
    logoPlacement: "",
    logoScale: "none" as const,
    logoStyle: "none" as const,
    forbiddenElements: [] as string[],
  };

  switch (family) {
    case "bags":
      return {
        ...base,
        family: "bags",
        silhouettePrimary: "",
        silhouetteShape: "",
        handleCount: 2,
        handleType: "",
        handleAttachment: "",
        strapPresent: false,
        closureType: "open-top",
        constructionStyle: "",
      };
    case "watches":
      return {
        ...base,
        family: "watches",
        caseShape: "round",
        caseSize: "",
        dialColour: "",
        dialType: "",
        bezelType: "fixed-smooth",
        strapType: "",
        strapColour: "",
        crownPosition: "3 o'clock",
        complicationCount: 0,
        constructionStyle: "",
      };
    case "belts":
      return {
        ...base,
        family: "belts",
        beltWidth: "",
        buckleType: "",
        buckleShape: "",
        tipStyle: "",
        constructionStyle: "",
      };
    case "jewelry":
      return {
        ...base,
        family: "jewelry",
        jewelryType: "",
        stonePresent: false,
        constructionStyle: "",
      };
    case "eyewear":
      return {
        ...base,
        family: "eyewear",
        eyewearType: "",
        frameShape: "",
        frameMaterial: "",
        lensType: "",
        lensColour: "",
        templeStyle: "",
        bridgeType: "",
        constructionStyle: "",
      };
    case "apparel":
      return {
        ...base,
        family: "apparel",
        apparelType: "",
        fitType: "",
        neckline: "",
        sleeveLength: "",
        hemLength: "",
        closureType: "",
        constructionStyle: "",
      };
    case "footwear":
      return {
        ...base,
        family: "footwear",
        footwearType: "",
        heelHeight: "",
        toeShape: "",
        soleType: "",
        closureType: "",
        ankleHeight: "",
        constructionStyle: "",
      };
    case "headwear":
      return {
        ...base,
        family: "headwear",
        headwearType: "",
        crownShape: "",
        brimStyle: "",
        closureType: "",
        constructionStyle: "",
      };
    case "scarves":
      return {
        ...base,
        family: "scarves",
        scarfType: "",
        dimensions: "",
        fabricWeight: "",
        patternType: "",
        edgeFinish: "",
        constructionStyle: "",
      };
    case "small_accessories":
      return {
        ...base,
        family: "small_accessories",
        accessoryType: "",
        openingType: "",
        constructionStyle: "",
      };
    case "full_look":
      return {
        ...base,
        family: "full_look",
        primaryPiece: "",
        layeringCount: 1,
        colourPalette: "",
        styleDirection: "",
        constructionStyle: "",
      };
    default:
      return undefined;
  }
}

// ── Main Component ──

export default function ProductFingerprintForm({
  family,
  value,
  onChange,
}: ProductFingerprintFormProps) {
  const [enabled, setEnabled] = useState(!!value);

  const handleToggle = useCallback(() => {
    if (enabled) {
      onChange(undefined);
      setEnabled(false);
    } else {
      onChange(defaultFingerprint(family));
      setEnabled(true);
    }
  }, [enabled, family, onChange]);

  const handleUpdate = useCallback(
    (patch: Record<string, unknown>) => {
      if (!value) return;
      onChange({ ...value, ...patch } as ProductFingerprint);
    },
    [value, onChange],
  );

  if (!SUPPORTED_FAMILIES.has(family)) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-[--text-primary]">
            Product Fingerprint
          </span>
          <p className="text-[10px] text-[--text-tertiary] mt-0.5">
            Structured product identity for precise prompt generation. Optional.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            enabled
              ? "bg-[--text-primary] text-[--text-inverted] border-transparent"
              : "border-[--border-default] text-[--text-secondary] hover:border-[--text-tertiary]"
          }`}
        >
          {enabled ? "Enabled" : "Add Fingerprint"}
        </button>
      </div>

      {enabled && value && (
        <div className="space-y-4 pt-2">
          {/* Family-specific fields */}
          {value.family === "bags" && (
            <BagFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "watches" && (
            <WatchFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "belts" && (
            <BeltFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "jewelry" && (
            <JewelryFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "eyewear" && (
            <EyewearFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "apparel" && (
            <ApparelFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "footwear" && (
            <FootwearFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "headwear" && (
            <HeadwearFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "scarves" && (
            <ScarfFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "small_accessories" && (
            <SmallAccessoryFields fp={value} onUpdate={handleUpdate} />
          )}
          {value.family === "full_look" && (
            <FullLookFields fp={value} onUpdate={handleUpdate} />
          )}

          {/* Shared base fields */}
          <BaseFields fp={value} onUpdate={handleUpdate} />
        </div>
      )}
    </div>
  );
}
