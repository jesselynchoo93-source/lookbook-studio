# V3.2B Cost Audit: Gemini Request Architecture, Caching, and Per-Shot Cost Control

## Context

Gemini billing is rising too quickly relative to the number of generated shots ($3.96 AUD on a small number of generations). This is likely an architecture problem before it is a provider problem. Gemini 2.5 already supports implicit caching by default, and Google exposes cache-hit usage metadata. If costs are still high, the likely causes are repeated long static prefixes, unstable prompt structure, poor cache locality, oversized multimodal payloads, or generating more shots than the user actually needs.

**Rule: Do not guess about cost. Instrument it. Measure real per-request token usage, cache-hit usage, image payload size, and cost per completed shot before changing providers.**

## Primary Questions

1. Are we resending the same long static instructions every shot?
2. Is the static prefix stable enough to hit Gemini implicit caching?
3. Are we sending too many images / oversized image payloads on every request?
4. What is the actual cost per shot, per set, and per retry?
5. Can we reduce cost materially without lowering output quality?

---

## Workstream 1: Instrumentation (required first)

### Files
- Generation pipeline / Gemini call site
- New: cost logging utility

### Step 1: Log real Gemini usage metadata for every request

Capture and persist per request:
- model name
- shot position + role
- request type (anchor, body, worn detail, flat detail, retry, single-shot, generate-all)
- `promptTokenCount`
- `candidatesTokenCount`
- `totalTokenCount`
- `cachedContentTokenCount` / cache-hit tokens if present
- number of input images
- approximate image byte size / base64 size sent
- request duration
- success/failure

### Step 2: Derive cost metrics

For each request, compute:
- input cost
- cached-input cost
- output cost
- total request cost

Then aggregate:
- cost per successful shot
- cost per completed set
- cost per retry
- cost of abandoned / skipped work
- cache hit rate by shot type

### Step 3: Add a dev-only cost summary panel or log dump

At the end of Generate All, print:
- total cost estimate
- total uncached input tokens
- total cached input tokens
- total output tokens
- most expensive shot
- retries and their cost

---

## Workstream 2: Prompt Architecture Audit

### Files
- commercePromptCompiler.ts
- Role strategy builder
- Any Gemini request assembly code

### Step 4: Split prompt content into STATIC vs DYNAMIC

Classify every prompt block:

**STATIC:**
- core system instructions
- anti-contamination rules
- role-independent safety rules
- family-level invariant rules

**DYNAMIC:**
- shot role/framing
- garment fingerprint
- anchor signature
- per-shot compatibility warnings
- per-shot absence constraints

### Step 5: Measure static-prefix stability

For a full set generation, compare the first N characters / tokens of each request.

Goal:
- same opening structure across all shots of the same run
- dynamic differences pushed later in the prompt

If the prefix changes too early, implicit caching will underperform.

### Step 6: Reduce repeated prompt bulk

Refactor so long static blocks are:
- deduplicated
- consistently ordered
- moved to the front
- not regenerated with minor formatting differences

No string churn, no reordering, no shot-specific interpolation inside the static prefix.

---

## Workstream 3: Multimodal Payload Audit

### Problem

Cost may not be only text. Repeated image inputs can also make requests expensive.

### Step 7: Audit image reuse

For each shot type, log:
- which images are attached
- whether the same product/model/anchor images are resent
- whether images are resized/compressed consistently

Questions:
- are we resending the same large model/product images unnecessarily?
- are flat detail shots receiving anchor/model images they do not need?
- are skipped shots still paying prep cost indirectly?

### Step 8: Shrink payloads safely

Rules:
- body shots: send only required images
- worn detail shots: send anchor + model only if needed
- flat/macro detail shots: omit model image and omit anchor unless proven necessary
- resize or compress reference images to the minimum resolution that preserves quality

No "send everything just in case" requests.

---

## Workstream 4: Generation Flow Cost Control

### Files
- CommerceGenerateMode.tsx
- Generation scheduler

### Step 9: Per-shot generation as a cost-control feature

Make per-shot generation first-class:
- each eligible shot can be generated independently
- skipped shots are never billable
- Generate All means remaining eligible shots only
- show estimated remaining shot count before user commits

### Step 10: Stop unnecessary retries

Log and cap retries by reason:
- coherence retry
- API retry
- manual regenerate

Audit whether retries are consuming disproportionate cost. If one shot type is unstable, fix that shot type instead of paying for repeated retries.

---

## Workstream 5: Caching Strategy

### Step 11: Verify implicit caching first

Using the logged cache metadata, answer:
- do shots 2+ actually show cache-hit tokens?
- what percentage of prompt tokens are cached?
- is cache-hit rate materially better for Generate All than isolated per-shot generation?

### Step 12: Add explicit Gemini caching only if needed

If implicit cache hit rate is weak after prompt restructuring:
- test explicit Gemini caching for the large static prompt prefix
- compare total cost before/after
- keep only if savings are real and implementation complexity is justified

### Step 13: OpenRouter evaluation only after direct Gemini audit

Only if direct Gemini still performs poorly:
- test OpenRouter sticky routing with the same workload
- compare effective cache-hit behaviour
- compare real total cost, not just token price
- compare latency and reliability too

Do not migrate on theory alone.

---

## Success Criteria

1. We can state actual cost per shot and per set with evidence.
2. Cache-hit rate is visible and measurable.
3. Static prefix is stable across same-run shot requests.
4. Flat/macro detail shots send fewer inputs than body shots.
5. Generate All cost drops materially after prompt/payload optimisation.
6. Per-shot generation allows users to avoid paying for unwanted shots.
7. Any provider change is justified by measured savings, not assumptions.

## Verification

Run three scenarios:

**A. Generate All on a 4-shot reduced set**
**B. Generate only 1 body shot + 1 worn detail shot**
**C. Generate only 1 flat detail shot**

For each scenario, record:
- total tokens
- cached tokens
- total cost
- time to completion
- number of images sent per request

## Decision Gate

Do not switch to OpenRouter unless:
- direct Gemini prompt/payload optimisation is done
- implicit caching is measured and still weak
- explicit Gemini caching is tested or ruled out
- OpenRouter shows clear real-world savings without hurting quality or reliability
