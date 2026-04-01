/**
 * Curation Gate Validation Script
 *
 * Runs catalog validation and coherence validation on all entries
 * and families in the commerce-refs directory.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load JSON data
const refsDir = resolve(__dirname, "../public/commerce-refs");
const catalog = JSON.parse(readFileSync(resolve(refsDir, "catalog.json"), "utf-8"));
const families = JSON.parse(readFileSync(resolve(refsDir, "families.json"), "utf-8"));

// Inline validators (adapted from source for standalone execution)

const REQUIRED_ROLES = ["front_seller", "three_quarter_seller", "side_fit_proof", "back_fit_proof"];
const BLOCKED_DOMAINS = ["pinterest.com", "instagram.com", "tumblr.com", "tiktok.com", "reddit.com", "flickr.com"];

function validateEntry(entry: any) {
  const issues: string[] = [];
  if (!entry.id) issues.push("Missing ID");
  if (!entry.fileName) issues.push("Missing fileName");
  if (!entry.relativePath) issues.push("Missing relativePath");
  if (!entry.sourceUrl) issues.push("Missing sourceUrl");

  try {
    const hostname = new URL(entry.sourceUrl).hostname.toLowerCase();
    if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
      issues.push("Blocked domain");
    }
  } catch {}

  if (!["pdp", "catalog", "wholesale_linesheet", "press_kit"].includes(entry.sourceType)) {
    issues.push(`Invalid sourceType: ${entry.sourceType}`);
  }
  if (!["A", "B", "C"].includes(entry.sourceTier)) {
    issues.push(`Invalid sourceTier: ${entry.sourceTier}`);
  }
  if (entry.qualityScore < 3) issues.push("Quality score below 3");

  const s = entry.safetyScores;
  if (!s) {
    issues.push("Missing safety scores");
  } else {
    for (const f of ["productVisibilityScore", "backgroundNeutralityScore", "poseDeviationRisk",
      "stylingContaminationRisk", "garmentReplacementDifficulty", "faceSwapDifficulty", "fullIdentitySwapDifficulty"]) {
      if (s[f] == null || s[f] < 1 || s[f] > 5) issues.push(`Invalid ${f}: ${s[f]}`);
    }
    if (s.backgroundNeutralityScore < 3) issues.push("backgroundNeutrality < 3");
    if (s.productVisibilityScore < 3) issues.push("productVisibility < 3");
  }

  const anchorEligible = s && entry.sourceTier === "A" && s.productVisibilityScore >= 4 && s.poseDeviationRisk <= 2;

  return { valid: issues.length === 0, issues, anchorEligible };
}

function validateFamily(family: any, images: any[]) {
  const issues: { check: string; message: string; severity: string }[] = [];
  const familyImages = images.filter((i: any) => family.shots.some((s: any) => s.referenceImageId === i.id));

  // Shot count
  if (family.shots.length !== 6) {
    issues.push({ check: "shot_count", message: `${family.shots.length} shots (need 6)`, severity: "hard_fail" });
  }

  // Anchor checks
  const anchor = family.shots.find((s: any) => s.isAnchor);
  if (!anchor) {
    issues.push({ check: "anchor", message: "No anchor", severity: "hard_fail" });
  } else {
    if (anchor.role !== "front_seller" && anchor.role !== "three_quarter_seller") {
      issues.push({ check: "anchor_role", message: `Anchor role: ${anchor.role}`, severity: "hard_fail" });
    }
    if (anchor.replacementSafety !== "safe") {
      issues.push({ check: "anchor_safety", message: `Anchor safety: ${anchor.replacementSafety}`, severity: "hard_fail" });
    }
    const anchorImg = familyImages.find((i: any) => i.id === anchor.referenceImageId);
    if (anchorImg && anchorImg.sourceTier !== "A") {
      issues.push({ check: "anchor_tier", message: `Anchor tier: ${anchorImg.sourceTier}`, severity: "hard_fail" });
    }
  }

  // Required roles
  const roles = family.shots.map((s: any) => s.role);
  for (const req of REQUIRED_ROLES) {
    if (!roles.includes(req)) {
      issues.push({ check: "missing_role", message: `Missing: ${req}`, severity: "hard_fail" });
    }
  }

  // Background/lighting match
  for (const shot of family.shots) {
    const img = familyImages.find((i: any) => i.id === shot.referenceImageId);
    if (img) {
      if (img.backgroundClass !== family.backgroundFamily) {
        issues.push({ check: "bg_mismatch", message: `Shot ${shot.position} bg: ${img.backgroundClass}`, severity: "hard_fail" });
      }
      if (img.lightingClass !== family.lightingFamily) {
        issues.push({ check: "light_mismatch", message: `Shot ${shot.position} light: ${img.lightingClass}`, severity: "hard_fail" });
      }
    }
  }

  // Max 1 Tier C
  const tierC = family.shots.filter((s: any) => s.sourceTier === "C").length;
  if (tierC > 1) {
    issues.push({ check: "tier_c", message: `${tierC} Tier C images`, severity: "hard_fail" });
  }

  // Body direction diversity
  const bodyDirs = new Set(familyImages.map((i: any) => i.bodyDirection));
  if (bodyDirs.size < 3) {
    issues.push({ check: "pose_diversity", message: `${bodyDirs.size} body directions (need 3)`, severity: "score_degrade" });
  }

  const hasHardFail = issues.some(i => i.severity === "hard_fail");
  const coverageQuality = REQUIRED_ROLES.every(r => roles.includes(r)) ? "strong" : "partial";

  return { pass: !hasHardFail, issues, coverageQuality };
}

// Run validation
console.log("=== CATALOG VALIDATION ===\n");
let allValid = true;
let anchorCount = 0;
for (const entry of catalog) {
  const result = validateEntry(entry);
  if (!result.valid) {
    console.log(`FAIL: ${entry.relativePath} - ${result.issues.join(", ")}`);
    allValid = false;
  }
  if (result.anchorEligible) anchorCount++;
}
console.log(`\nEntries: ${catalog.length} | All valid: ${allValid} | Anchor-eligible: ${anchorCount}`);

console.log("\n=== FAMILY COHERENCE VALIDATION ===\n");
for (const family of families) {
  const result = validateFamily(family, catalog);
  const hardFails = result.issues.filter((i: any) => i.severity === "hard_fail");
  const degrades = result.issues.filter((i: any) => i.severity === "score_degrade");

  console.log(`Family: ${family.name}`);
  console.log(`  Pass: ${result.pass}`);
  console.log(`  Coverage: ${result.coverageQuality}`);
  console.log(`  Shots: ${family.shots.length}/6`);
  if (hardFails.length > 0) {
    console.log(`  Hard fails (${hardFails.length}):`);
    for (const f of hardFails) console.log(`    - [${f.check}] ${f.message}`);
  }
  if (degrades.length > 0) {
    console.log(`  Score degrades (${degrades.length}):`);
    for (const d of degrades) console.log(`    - [${d.check}] ${d.message}`);
  }
  console.log();
}
