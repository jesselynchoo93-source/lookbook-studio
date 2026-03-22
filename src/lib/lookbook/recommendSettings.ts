/**
 * Smart recommendation engine for Campaign Goal, Logo Visibility, and Creativity Level.
 *
 * Uses product family, specific item, and target style to suggest settings
 * that a fashion creative director would pick for the combination.
 */

import type {
  ProductFamily,
  TargetStyle,
  GenderPresentation,
  CampaignGoal,
  LogoVisibilityPriority,
  CreativityLevel,
} from "./types";

export interface RecommendedSettings {
  campaignGoal: CampaignGoal;
  logoVisibilityPriority: LogoVisibilityPriority;
  creativityLevel: CreativityLevel;
  title: string;
  reason: string;
  warning?: string;
}

export interface SettingsWarning {
  message: string;
}

interface RecommendationInput {
  productFamily: ProductFamily;
  specificItem?: string;
  genderPresentation: GenderPresentation;
  targetStyle: TargetStyle;
}

// ── Core Recommendation Logic ──

export function getRecommendedSettings(input: RecommendationInput): RecommendedSettings {
  const { productFamily, specificItem, targetStyle } = input;
  const item = specificItem?.toLowerCase() || "";

  // Item-specific overrides first, then family + style matrix

  // ── Watches ──
  if (productFamily === "watches") {
    if (targetStyle === "luxury" || targetStyle === "tailoring") {
      return {
        campaignGoal: "detail_focus",
        logoVisibilityPriority: "medium",
        creativityLevel: "safe",
        title: "Precision detail set",
        reason: "Luxury watches sell through dial clarity, case finishing, and wrist presence. Safe creativity reduces rendering risk on small details. Medium branding keeps the dial logo readable without forcing stiff compositions.",
      };
    }
    return {
      campaignGoal: "detail_focus",
      logoVisibilityPriority: "low",
      creativityLevel: "safe",
      title: "Detail-first watch set",
      reason: "Watches sell through wrist presence, dial clarity, case detail, and strap rendering. Safe creativity reduces risk on small mechanical details. Low branding priority lets the watch design speak for itself.",
    };
  }

  // ── Jewelry ──
  if (productFamily === "jewelry") {
    if (item.includes("earring")) {
      if (targetStyle === "editorial" || targetStyle === "avant_garde") {
        return {
          campaignGoal: "styling_story",
          logoVisibilityPriority: "low",
          creativityLevel: "balanced",
          title: "Editorial earring set",
          reason: "Earrings sell through proximity, sparkle, and face-framing placement. Low branding keeps focus on the piece itself. Balanced creativity allows both a clean hero and editorial mood shots.",
        };
      }
      return {
        campaignGoal: "detail_focus",
        logoVisibilityPriority: "low",
        creativityLevel: "balanced",
        title: "Detail-led earring set",
        reason: "Earrings need close-up scale, ear placement, and pair symmetry. Low branding priority because jewelry usually doesn't have visible logos. Balanced creativity gives clean detail shots with some editorial variety.",
      };
    }
    if (item.includes("necklace")) {
      return {
        campaignGoal: "detail_focus",
        logoVisibilityPriority: "low",
        creativityLevel: "balanced",
        title: "Neckline-focused set",
        reason: "Necklaces sell through neckline placement, chain drape, and pendant detail. Balanced creativity allows multiple neckline angles and one mood shot.",
      };
    }
    // Generic jewelry
    if (targetStyle === "editorial" || targetStyle === "avant_garde") {
      return {
        campaignGoal: "styling_story",
        logoVisibilityPriority: "low",
        creativityLevel: "balanced",
        title: "Editorial jewelry set",
        reason: "Jewelry sells through sparkle, setting, and how it complements skin and clothing. Editorial style benefits from balanced creativity for desirability shots.",
      };
    }
    return {
      campaignGoal: "detail_focus",
      logoVisibilityPriority: "low",
      creativityLevel: "balanced",
      title: "Detail-led jewelry set",
      reason: "Jewelry needs close-up craftsmanship proof, scale reference, and surface reflection. Low branding because most fine jewelry doesn't feature visible logos.",
    };
  }

  // ── Eyewear ──
  if (productFamily === "eyewear") {
    if (targetStyle === "luxury" || targetStyle === "editorial") {
      return {
        campaignGoal: "styling_story",
        logoVisibilityPriority: "medium",
        creativityLevel: "balanced",
        title: "Lifestyle eyewear set",
        reason: "Luxury eyewear sells through face framing, mood, and frame attitude. Medium logo priority keeps branding readable without forcing stiff shots. Balanced creativity allows a clean hero, a product-focus angle, and editorial support.",
      };
    }
    return {
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      title: "Clear commercial eyewear set",
      reason: "Commercial eyewear needs frame shape, lens tint, and temple arm detail clearly visible. Medium branding ensures the logo on the temple arm is readable. Safe creativity keeps shots reliable.",
    };
  }

  // ── Bags ──
  if (productFamily === "bags") {
    if (targetStyle === "luxury") {
      return {
        campaignGoal: "premium_branding",
        logoVisibilityPriority: "medium",
        creativityLevel: "balanced",
        title: "Premium bag set",
        reason: "Luxury bags sell through carry method, hardware quality, and brand recognition. Medium branding balances logo visibility with natural carry poses. Balanced creativity allows carry profiles and editorial context.",
      };
    }
    if (item.includes("clutch")) {
      return {
        campaignGoal: "detail_focus",
        logoVisibilityPriority: "medium",
        creativityLevel: "balanced",
        title: "Clutch detail set",
        reason: "Clutches are small and need close-up hardware and closure detail. Balanced creativity allows hand interaction and editorial styling shots.",
      };
    }
    return {
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      title: "Commercial bag set",
      reason: "Commercial bags need carry method, body scale, and hardware readability first. Safe creativity gives cleaner product-selling shots. Medium branding keeps logos naturally visible.",
    };
  }

  // ── Footwear ──
  if (productFamily === "footwear") {
    if (item.includes("sneaker") && (targetStyle === "street" || targetStyle === "contemporary")) {
      return {
        campaignGoal: "styling_story",
        logoVisibilityPriority: "medium",
        creativityLevel: "balanced",
        title: "Street sneaker set",
        reason: "Sneakers in a street context sell through on-foot energy, sole profile, and styling attitude. Balanced creativity allows a motion shot alongside clean product shots.",
      };
    }
    if (item.includes("heel") || item.includes("sandal")) {
      return {
        campaignGoal: "product_clarity",
        logoVisibilityPriority: "low",
        creativityLevel: "balanced",
        title: "Elevated footwear set",
        reason: "Heels and sandals need clear on-foot presence and sole profile. Low branding because these products rarely feature prominent logos. Balanced creativity allows some editorial variety.",
      };
    }
    return {
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      title: "Commercial footwear set",
      reason: "Footwear needs on-foot presence, sole profile, and material detail clearly visible. Safe creativity reduces rendering risk on shoe-to-ground contact.",
    };
  }

  // ── Apparel ──
  if (productFamily === "apparel") {
    if (item.includes("blazer") || item.includes("suit") || item.includes("coat") || item.includes("trench")) {
      if (targetStyle === "luxury" || targetStyle === "tailoring") {
        return {
          campaignGoal: "premium_branding",
          logoVisibilityPriority: "high",
          creativityLevel: "balanced",
          title: "Premium tailoring set",
          reason: "Tailoring and branded apparel benefit from clear silhouette plus controlled premium presentation. High branding ensures labels and construction details are visible. Balanced creativity keeps it polished without becoming rigid.",
        };
      }
      return {
        campaignGoal: "product_clarity",
        logoVisibilityPriority: "medium",
        creativityLevel: "balanced",
        title: "Structured garment set",
        reason: "Structured garments need clear silhouette, construction quality, and fit visibility. Balanced creativity allows both a clean hero and editorial styling.",
      };
    }
    if (item.includes("dress")) {
      return {
        campaignGoal: "styling_story",
        logoVisibilityPriority: "low",
        creativityLevel: "balanced",
        title: "Dress styling set",
        reason: "Dresses sell through drape, movement, and how they transform the silhouette. Balanced creativity allows a motion shot to show fabric behaviour.",
      };
    }
    if (item.includes("hoodie") || item.includes("sweatshirt")) {
      if (targetStyle === "street") {
        return {
          campaignGoal: "premium_branding",
          logoVisibilityPriority: "high",
          creativityLevel: "safe",
          title: "Brand-forward streetwear set",
          reason: "Hoodies and sweatshirts in streetwear are often logo-driven. High branding ensures front graphics stay readable. Safe creativity gives reliable front-facing shots.",
        };
      }
    }
    // Editorial apparel
    if (targetStyle === "editorial" || targetStyle === "avant_garde") {
      return {
        campaignGoal: "mood",
        logoVisibilityPriority: "low",
        creativityLevel: "directional",
        title: "Editorial apparel set",
        reason: "Editorial apparel sells through mood, styling, and desirability. Directional creativity allows stronger fashion energy. Low branding lets the styling tell the story.",
      };
    }
    // Default apparel
    return {
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      title: "Clean commercial set",
      reason: "Commercial apparel needs silhouette, fit, and fabric clearly visible. Safe creativity gives reliable, clean selling images.",
    };
  }

  // ── Belts ──
  if (productFamily === "belts") {
    return {
      campaignGoal: "detail_focus",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      title: "Belt detail set",
      reason: "Belts sell through buckle quality, leather texture, and waist anchoring. Medium branding keeps buckle logos visible. Safe creativity ensures clean product shots.",
    };
  }

  // ── Scarves ──
  if (productFamily === "scarves") {
    if (targetStyle === "editorial" || targetStyle === "luxury") {
      return {
        campaignGoal: "styling_story",
        logoVisibilityPriority: "low",
        creativityLevel: "balanced",
        title: "Styled scarf set",
        reason: "Scarves sell through drape, colour, and how they layer into a look. Balanced creativity allows motion and styling shots. Low branding because scarves rarely feature prominent logos.",
      };
    }
    return {
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "low",
      creativityLevel: "balanced",
      title: "Scarf product set",
      reason: "Scarves need fabric drape and texture clearly visible. Balanced creativity allows a drape shot alongside clean product views.",
    };
  }

  // ── Headwear ──
  if (productFamily === "headwear") {
    return {
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      title: "Headwear product set",
      reason: "Headwear needs face framing and fit clearly visible. Medium branding keeps any front logos readable. Safe creativity gives reliable head-and-shoulders shots.",
    };
  }

  // ── Small Accessories ──
  if (productFamily === "small_accessories") {
    return {
      campaignGoal: "detail_focus",
      logoVisibilityPriority: "low",
      creativityLevel: "balanced",
      title: "Accessory detail set",
      reason: "Small accessories need scale reference and texture detail. Low branding because these items rarely feature large logos. Balanced creativity allows hand interaction shots.",
    };
  }

  // ── Full Look ──
  if (productFamily === "full_look") {
    if (targetStyle === "editorial" || targetStyle === "avant_garde") {
      return {
        campaignGoal: "mood",
        logoVisibilityPriority: "low",
        creativityLevel: "directional",
        title: "Editorial full look",
        reason: "Full-look editorials sell through styling story and overall mood. Directional creativity creates stronger fashion energy across the set.",
      };
    }
    return {
      campaignGoal: "styling_story",
      logoVisibilityPriority: "medium",
      creativityLevel: "balanced",
      title: "Styled full look",
      reason: "Full looks sell through how pieces work together. Balanced creativity allows both a clear full-body hero and editorial context shots.",
    };
  }

  // ── Style-based fallbacks ──
  if (targetStyle === "luxury" || targetStyle === "tailoring") {
    return {
      campaignGoal: "premium_branding",
      logoVisibilityPriority: "medium",
      creativityLevel: "balanced",
      title: "Premium product set",
      reason: "Luxury and tailoring styles benefit from controlled premium presentation with readable branding.",
    };
  }

  if (targetStyle === "editorial" || targetStyle === "avant_garde") {
    return {
      campaignGoal: "mood",
      logoVisibilityPriority: "low",
      creativityLevel: "directional",
      title: "Editorial set",
      reason: "Editorial styles prioritise mood and desirability over product clarity.",
    };
  }

  // Ultimate fallback
  return {
    campaignGoal: "product_clarity",
    logoVisibilityPriority: "medium",
    creativityLevel: "safe",
    title: "Clean product set",
    reason: "A safe starting point: clear product visibility with moderate branding and reliable commercial poses.",
  };
}

// ── Warning Logic for Risky Overrides ──

export function getSettingsWarnings(
  goal: CampaignGoal,
  logo: LogoVisibilityPriority,
  creativity: CreativityLevel,
  productFamily: ProductFamily,
): SettingsWarning[] {
  const warnings: SettingsWarning[] = [];

  // Jewelry + high logo: jewelry rarely has visible logos
  if (productFamily === "jewelry" && logo === "high") {
    warnings.push({
      message: "Most jewelry doesn't feature visible logos. High branding priority may force awkward compositions.",
    });
  }

  // Watches + high logo: dial logos are small, high priority may constrain angles
  if (productFamily === "watches" && logo === "high") {
    warnings.push({
      message: "Watch dial logos are small. High branding priority may over-constrain shot angles.",
    });
  }

  // Detail focus + directional: risky combination
  if (goal === "detail_focus" && creativity === "directional") {
    warnings.push({
      message: "Directional creativity increases rendering risk on close-up detail shots. Consider balanced or safe for more reliable results.",
    });
  }

  // Premium branding + low logo: contradictory
  if (goal === "premium_branding" && logo === "low") {
    warnings.push({
      message: "Low branding priority may conflict with a premium-branding goal. The planner might deprioritise logo-safe shots.",
    });
  }

  // Product clarity + directional: reduces clarity
  if (goal === "product_clarity" && creativity === "directional") {
    warnings.push({
      message: "Directional creativity prioritises editorial energy over clean product visibility. Consider safe or balanced for clearer selling images.",
    });
  }

  // Mood/styling_story + high logo: may force stiff compositions
  if ((goal === "mood" || goal === "styling_story") && logo === "high") {
    warnings.push({
      message: "High branding priority may limit the editorial and mood shots this goal is designed for.",
    });
  }

  // Scarves/small_accessories + high logo
  if ((productFamily === "scarves" || productFamily === "small_accessories") && logo === "high") {
    warnings.push({
      message: "This product category rarely features prominent branding. High logo priority may not produce visible results.",
    });
  }

  return warnings;
}
