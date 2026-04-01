# Workstream B: Strategic Reference Library Expansion

## Purpose

Fixing the engine is necessary but not sufficient. Even with V3.2/V3.3 correctness fixes, the product remains weak if the template library does not contain enough safe, garment-compatible families. Workstream B exists to improve template coverage quality, not just template count.

**Rule: Do not mix this workstream into the engine-fix implementation pass. Workstream B is a separate curation and sourcing track. Engine correctness first. Library expansion second.**

## Goal

Expand the commerce reference library with strategically chosen families that fill real compatibility gaps:
- pocketless dresses / slip dresses
- soft drape / unstructured garments
- minimal grey/white studio body-shot sets with no hand-in-pocket behaviour
- true detail-material macro shots
- true detail-construction shots without pocket dependence
- clean neutral worn-detail shots with low styling contamination

## Success Criteria

- A user with a pocketless slip dress should see at least one clearly compatible family near the top of the picker without warnings.
- A user with a soft/unstructured garment should not be forced into structured-seam or pocket-dependent families.
- Detail-material and detail-construction coverage should come from real compatible references, not prompt hacks.
- New families must improve compatibility coverage measurably, not just add visual variety.

## Deliverables (in order)

1. Coverage matrix of current library vs garment traits
2. Priority gap list with severity
3. Updated metadata schema for family/shot curation
4. Shortlist of target family types to source
5. First batch of candidate families for review
6. Acceptance checklist for adding any family to production

---

## Phase 1: Coverage Matrix First

Before sourcing anything, write a coverage matrix of the current library.

Example structure:

| Garment Trait | everlane-riviera | everlane-silk-shirt | everlane-tee-dress | Gap? |
|---|---|---|---|---|
| Pocketless dresses | Conflicts (2 shots) | N/A | Safe | Thin |
| Soft drape / slip | Conflicts | N/A | Partial | Gap |
| Structured dresses | Good | N/A | Partial | OK |
| Detail-material macro | Flat lay only | Strong | Strong | Partial |
| Detail-construction no-pockets | Weak | Safe | Safe | Partial |

Output of this phase:
- Which garment types have no safe family
- Which families are over-used because they are the only "good enough" option
- Which roles are under-covered (body, worn detail, macro, construction)

---

## Phase 2: Metadata Requirements

No new family enters the library without full metadata.

**Required shot-level metadata:**
- `impliedGarmentFeatures`
- `detailPresentation`
- `replacementSafety`
- `role`
- `framingVariation`
- `poseVariation`

**Required family-level metadata:**
- `bestForGarmentTraits`
- `avoidForGarmentTraits`
- `productTypeHints`
- background family / lighting family
- overall neutrality / editorial contamination risk

**Controlled metadata rule:** All compatibility-relevant fields must use controlled vocabulary, not free text.

---

## Phase 3: Priority Gaps to Fill

Highest priority targets:

**1. Pocketless / slip-dress neutral studio family**
- no hand-in-pocket poses
- no structured waist dependence
- neutral grey or white seamless background
- clean front / 3/4 / back / worn detail / macro detail coverage

**2. Soft-drape dress family**
- bias-cut / satin / wrap / unstructured silhouettes
- movement and drape-safe
- no rigid tailoring assumptions

**3. True detail-material macro family**
- real fabric close-ups
- not flat-body substitutes
- texture / sheen / weave / drape detail

**4. True detail-construction family without pocket dependence**
- seams, straps, closures, neckline, hem, stitching
- no "pocket construction" dependency

**5. Neutral body-shot family with very low styling contamination**
- low jewellery
- low outerwear contamination
- simple pose system
- same camera / background / lighting across all shots

---

## Phase 4: Sourcing Rules

Use Firecrawl / web sourcing strategically. Do not collect random fashion images.

**Source only candidate families that:**
- form a coherent set
- share the same background / lighting / camera system
- have low styling contamination
- avoid pocket-implying poses unless intentionally tagged
- match missing compatibility gaps from the matrix

**Reject candidates that:**
- mix locations/backgrounds within one family
- rely on strong editorial styling
- include hidden garment dependencies not reflected in metadata
- lack usable detail or macro coverage
- cannot be tagged confidently

---

## Phase 5: Candidate Review Checklist

Every candidate family must be reviewed against:

| Criterion | Scale |
|---|---|
| Pocket dependence | 0-3 |
| Structured-waist dependence | 0-3 |
| Outerwear/layering contamination risk | 0-3 |
| Slip-dress suitability | 0-5 |
| Soft/unstructured suitability | 0-5 |
| Detail-material quality | 0-5 |
| Detail-construction quality | 0-5 |
| Neutral commerce usability | 0-5 |

Any family scoring poorly on hidden garment assumptions should not enter production.

---

## Phase 6: Acceptance Rules

A family is production-ready only if:
- full metadata is complete
- all detail shots are tagged with `detailPresentation`
- `impliedGarmentFeatures` are tagged on all relevant shots
- `bestForGarmentTraits` / `avoidForGarmentTraits` are filled
- the family passes compatibility review against at least 2-3 representative garment cases
- the family fills a real gap identified in the matrix

**No family is accepted just because it "looks nice."**

---

## Sequencing

- Workstream A / V3.x engine fixes remain the blocker for correctness
- Workstream B planning can run in parallel
- No new family should be added to production until the compatibility system is stable enough to validate it correctly
- Coverage matrix first, sourcing second, curation third

## Acceptance Criteria for Workstream B

- A written coverage matrix exists
- A prioritised shortlist of missing family types exists
- Metadata schema is locked
- First batch of sourced families is reviewed against the checklist
- At least one new family clearly improves the pocketless / slip-dress path
- At least one new family clearly improves true material-macro coverage

## Non-Goal

This workstream is not about increasing template count for its own sake. The goal is to increase safe, compatible, commercially useful choices.
