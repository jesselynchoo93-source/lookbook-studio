# Curation Gate Report

**Date:** 2026-03-30
**Status:** PARTIAL PASS (code works, library needs manual curation to fully pass)

## Summary

The commerce engine code (Phases 1-6) is complete and working. The validation pipeline catches real gaps. The reference library has been populated with 17 real catalog entries from Everlane across 3 template families and 2 product subcategories (dresses, tops/blouses). All individual catalog entries pass validation. All 3 families fail coherence validation on the same structural issue: **no `side_fit_proof` exists in any sourced PDP set.**

## What Passed

| Check | Result |
|-------|--------|
| Catalog entries (17 total) | All valid, no errors |
| Anchor eligibility (8 Tier A entries) | All 8 are anchor-eligible |
| Background class consistency | All entries: `seamless_grey` |
| Lighting class consistency | All entries: `soft_even` |
| Source domain validation | All from everlane.com (allowed) |
| Source type validation | All `pdp` (valid) |
| Safety scores populated | All 7 scores present, integers 1-5 |
| No Tier C images | Zero Tier C in any family |
| No editorial contamination | Zero editorial expressions detected |
| Styling consistency | All families pass `identical` strictness |
| Anchor roles | All anchors are `front_seller` (valid) |
| Anchor tiers | All anchors are Tier A |
| Anchor safety | All anchors rated `safe` |

## What Failed

| Family | Failure | Root Cause |
|--------|---------|------------|
| Riviera Dress | Missing `side_fit_proof` | Everlane PDP does not include 90-degree side profile |
| Silk Shirt | Missing `side_fit_proof` | Same |
| Weekend Tee Dress | Missing `side_fit_proof`, missing `three_quarter_seller`, only 5 shots | PDP only has 3 on-model angles + flat lay + texture |

**The single common failure across all families is the absence of `side_fit_proof` (full side profile at 90 degrees).**

## Why Side Profiles Are Missing

After scraping 5 Everlane PDP sets (Riviera Dress, Workwear Dress, Silk Shirt, Cashmere Crew, Weekend Tee Dress), the finding is clear: **Everlane's standard PDP photography does not include a true 90-degree side profile.** Their angle coverage is typically:

- Front (direct to camera)
- Back (direct away)
- Three-quarter (30-45 degree turn)
- Detail crops (construction, fabric texture)
- Flat lay

This is consistent across all products examined. The same limitation is expected for most fast-fashion and contemporary brands (COS, Zara, Uniqlo, ARKET, Massimo Dutti), all of which blocked automated scraping (403 responses).

Side profiles at 90 degrees are more common in:
- Wholesale/linesheet photography (where buyers need silhouette data)
- Plus-size inclusive brands (where fit visibility is a selling point)
- Technical/performance apparel brands

## Families Assembled

### Family 1: Everlane Riviera Grey Studio (BENCHMARK)
- **Product:** Riviera Dress (fitted bodice, flared skirt, midi length)
- **Shots:** 6/6
- **Roles covered:** front_seller, three_quarter_seller, back_fit_proof, 2x detail_construction, detail_material
- **Roles missing:** side_fit_proof
- **Quality:** Best available. Zero styling contamination. Same model across all on-model shots. Excellent background/lighting consistency. Clean garment visibility.
- **Designation:** Benchmark exemplar family for V1 quality standard.

### Family 2: Everlane Silk Shirt Grey Studio
- **Product:** Must-Have Shirt in Washable Silk (button-front blouse)
- **Shots:** 6/6
- **Roles covered:** front_seller, three_quarter_seller (upper body crop), back_fit_proof, 2x detail_construction, detail_material
- **Roles missing:** side_fit_proof
- **Quality:** Strong. Olive trousers visible in full-body shots (consistent, acceptable for tops). Same model throughout.

### Family 3: Everlane Weekend Tee Dress Grey Studio
- **Product:** Organic Cotton Weekend Tee Dress (simple T-shirt dress)
- **Shots:** 5/6 (one short)
- **Roles covered:** front_seller, back_fit_proof, detail_construction, 2x detail_material
- **Roles missing:** side_fit_proof, three_quarter_seller
- **Quality:** Excellent individual shot quality but thin angle coverage. Zero contamination.

## Rejected Sets

| Set | Reason |
|-----|--------|
| Everlane Workwear Dress | High styling contamination: large tote bag in 3/4 on-model shots, red necklace in all. `stylingContaminationRisk` 4-5. |
| Everlane Cashmere Crew | Moderate contamination: baseball cap in every on-model shot. Increases `faceSwapDifficulty` to 4+. Usable for garment_only only. |

## Higgsfield End-to-End Tests

**NOT CONDUCTED.** Higgsfield testing requires manual UI interaction (uploading reference images + pasting prompts in their web interface). This cannot be automated via CLI. The commerce prompt compiler is ready to produce Higgsfield-format prompts, but the actual generation test must be done manually by Jess.

**Recommended test plan:**
1. Open Higgsfield Create Image (nano banana pro model)
2. Pick Family 1 (Riviera Dress), Shot 1 (front_seller anchor)
3. Upload the reference image (`shot-02.jpg`)
4. Paste the commerce prompt (use clipboard format from CommerceGenerateMode)
5. Specify a DIFFERENT dress (e.g., a floral print) as the garment to swap
6. Evaluate: Does pose, background, lighting, and camera angle match the reference?
7. Repeat for Shot 3 (back_fit_proof) to test angle consistency

## V1 Scope Recommendation

### Honest Assessment

The commerce engine code is architecturally correct and ready. The validators work and catch real issues. But the V1 reference library is not yet viable for the strict 4-required-roles definition. Here is what I recommend:

### Recommended V1 Adjustments

1. **Relax required roles for V1.** Change the minimum from 4 required roles to 3: `front_seller` + `back_fit_proof` + at least 1 of (`three_quarter_seller` OR `side_fit_proof`). This reflects the reality that most brand PDP photography covers front, back, and three-quarter, but rarely includes a true 90-degree side profile. The `v1ScopeConfig.ts` can gate this.

2. **Accept `partial` coverage families in V1.** The template family picker already has a "Show all families" toggle for thin libraries. For V1, surface partial-coverage families by default since no complete families exist yet.

3. **Launch with `garment_only` swap as the primary path.** Identity swaps require more testing. Garment-only swap is the simplest and most reliable mode. Present `identity_and_garment` as experimental/warned.

4. **V1 backgrounds:** `seamless_grey` only (all sourced families use this). Add `seamless_white` when manually curated families are available.

5. **V1 product categories:** Dresses and tops/blouses only (both proven with sourced families).

6. **Manual curation needed for side profiles.** To achieve "complete" coverage, Jess would need to manually source or commission 90-degree side profile shots for each family. This could be:
   - Found on wholesale/linesheet sites
   - Commissioned from a photographer
   - Generated via AI using the existing front/back as reference (meta-usage of the tool)

### What's Ready Now

- Commerce engine code: all 15+ files, zero TypeScript errors
- Catalog validation: working, catches bad entries
- Coherence validation: working, catches real gaps
- Commerce prompt compiler: produces reference-locked Higgsfield prompts
- Commerce clipboard format: ready to copy/paste
- Frontend: EngineSelector, TemplateFamilyPicker, CommerceSetupMode, CommercePlanMode, CommerceGenerateMode all implemented
- StudioShell routing: editorial/commerce mode split working
- 17 curated catalog entries with full metadata and safety scores
- 3 template families (2 dresses, 1 tops/blouses) from Everlane

### What's NOT Ready

- No family passes strict coherence validation (all missing side_fit_proof)
- No Higgsfield end-to-end test (requires manual interaction)
- Only 1 brand sourced (Everlane); most brands block automated scraping
- No identity_and_garment swap testing
- Only `seamless_grey` background proven; `seamless_white` and `concrete_minimal` unproven

## Next Steps

1. Jess manually tests 1 garment-only swap via Higgsfield using Family 1
2. If swap quality is acceptable: relax V1 required roles and ship
3. If swap quality is poor: investigate whether the reference lock holds, and adjust prompt formula
4. To grow the library: manually source side profiles, or add brands as Firecrawl becomes available
