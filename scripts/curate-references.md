# Commerce Reference Curation Workflow

This is a Claude Code session procedure for sourcing, tagging, and assembling commerce reference families using Firecrawl MCP.

## Principles

1. **Family-first sourcing.** The preferred unit is a PDP angle set (front, side, back, detail from the same product page), not isolated clean images. Start from naturally coherent groups.
2. **Review-based tiering.** Tier assignment uses quality criteria, not brand labels. A COS image is not Tier A because it is COS.
3. **V1 scope: apparel-first.** Focus on dresses, tops, and tailoring. Use seamless_white, seamless_grey, or concrete_minimal backgrounds with soft_even or soft_directional lighting.

## Source Targets (Prioritised)

1. Brand PDP pages (COS, Zara, Uniqlo, ARKET, Massimo Dutti) for studio product shots
2. Wholesale/line-sheet galleries for neutral, consistent catalog imagery
3. Brand .com product grids for systematic front/side/back coverage
4. Brand lookbook pages (non-editorial only); marketplace listings with clean studio backgrounds

### Blocked Domains

pinterest.com, instagram.com, tumblr.com, tiktok.com, reddit.com, flickr.com

### Blocked Source Types

Editorial campaigns, influencer content, UGC, collage graphics, heavily stylized shoots

## Firecrawl Workflow Per Brand

### Step 1: Map product category page

```
firecrawl_map({
  url: "https://www.cos.com/en/women/dresses",
  limit: 50
})
```

This discovers PDP URLs within the category.

### Step 2: Extract all product image URLs per PDP

```
firecrawl_extract({
  urls: [pdp_url_1, pdp_url_2, ...],
  prompt: "Extract all product image URLs from this page. Return the highest resolution versions. Group images by the same product.",
  schema: {
    type: "object",
    properties: {
      productName: { type: "string" },
      images: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            alt: { type: "string" },
            angleGuess: { type: "string", enum: ["front", "side", "back", "detail", "other"] }
          }
        }
      }
    }
  }
})
```

Tag images from the same PDP as a candidate family group.

### Step 3: Download highest-resolution images

Preserve PDP grouping in folder structure:

```
public/commerce-refs/apparel/{brand}-{style}-{gender}/
  front.jpg
  side.jpg
  back.jpg
  detail.jpg
  ...
```

### Step 4: Run AI vision extraction

Use the extract-scene-constraints API (Phase 3) to tag each image with structured constraints. Review confidence scores.

### Step 5: Assemble families

Start from PDP groups where 4+ angles share the same visual system. Fill remaining slots from same-brand images with matching background/lighting if the PDP set is incomplete.

### Step 6: Add to catalog.json

Each image becomes a CatalogReferenceImage entry with:
- `approvalStatus: "pending"`
- `familyId` linking PDP-grouped images
- All safety scores populated
- `sourceTier` assigned based on quality criteria (not brand name)

### Step 7: Run validation

```typescript
import { validateCatalogEntry } from "@/lib/commerce/catalogValidator";

for (const entry of catalog) {
  const result = validateCatalogEntry(entry);
  if (!result.valid) {
    console.log(`FAIL: ${entry.fileName}`, result.issues);
  }
}
```

## Tier Assignment Criteria

### Tier A (anchor eligible)

ALL of:
- backgroundNeutralityScore >= 4
- productVisibilityScore >= 4
- poseDeviationRisk <= 2
- stylingContaminationRisk <= 2
- backgroundClass: seamless_white, seamless_grey, or concrete_minimal
- lightingClass: soft_even or soft_directional

### Tier B (support shots only)

- backgroundNeutralityScore >= 3
- productVisibilityScore >= 3
- Does not meet all Tier A criteria

### Tier C (max 1 per family)

- backgroundNeutralityScore >= 4
- stylingContaminationRisk <= 2
- Fails one Tier B criterion but has usable framing/pose

## Family Assembly Checklist

Before submitting a family for approval:

- [ ] Exactly 6 shots
- [ ] Anchor is Tier A, role is front_seller or three_quarter_seller
- [ ] All 4 required roles covered: front_seller, three_quarter_seller, side_fit_proof, back_fit_proof
- [ ] All images share same backgroundClass
- [ ] All images share same lightingClass
- [ ] At most 1 Tier C image
- [ ] All safety scores populated
- [ ] Vision extraction run on all 6 images
- [ ] Background and lighting in V1 allowed set
- [ ] bestForProductTypes tags assigned only if verified (omit if uncertain)

## Curation Gate (Before Phase 4)

Before scaling past Phase 3:
- At least 3 approved families across at least 2 apparel subcategories
- At least 1 end-to-end Higgsfield garment-only swap test
- At least 1 end-to-end Higgsfield identity+garment swap test
- At least 1 manually benchmarked exemplar family judged "commercially excellent"
