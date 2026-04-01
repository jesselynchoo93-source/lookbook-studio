/**
 * Smart recommendation engine for Primary Objective, Secondary Emphasis,
 * Brand Visibility, and Pose Direction.
 *
 * Uses product family, specific item, and target style to suggest settings
 * that a fashion creative director would pick for the combination.
 */

import type {
  ProductFamily,
  TargetStyle,
  GenderPresentation,
  PrimaryObjective,
  SecondaryEmphasis,
  BrandVisibility,
  PoseDirection,
} from "./types";

export interface RecommendedSettings {
  primaryObjective: PrimaryObjective;
  secondaryEmphasis?: SecondaryEmphasis;
  brandVisibility: BrandVisibility;
  poseDirection: PoseDirection;
  genderPresentation: GenderPresentation;
  targetStyle: TargetStyle;
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
  genderPresentation?: GenderPresentation;
  targetStyle?: TargetStyle;
}

// ── Gender & Style Derivation ──
// When the user hasn't set these manually, derive sensible defaults
// from product family and specific item.

function recommendGender(family: ProductFamily, item: string): GenderPresentation {
  // Item-specific signals
  if (item.includes("dress") || item.includes("skirt") || item.includes("blouse") || item.includes("cami") || item.includes("gown")) return "womenswear";
  if (item.includes("bra") || item.includes("bikini") || item.includes("lingerie")) return "womenswear";
  if (item.includes("suit") && !item.includes("swimsuit")) return "menswear";
  if (item.includes("tie") || item.includes("cufflink")) return "menswear";

  // Family-level defaults
  switch (family) {
    case "jewelry": return "womenswear";
    case "bags": return "womenswear";
    case "eyewear": return "unisex";
    case "watches": return "unisex";
    case "scarves": return "womenswear";
    case "belts": return "unisex";
    case "headwear": return "unisex";
    case "small_accessories": return "unisex";
    case "footwear": return "unisex";
    case "full_look": return "womenswear";
    case "apparel":
    default:
      return "womenswear";
  }
}

function recommendStyle(family: ProductFamily, item: string): TargetStyle {
  // Item-specific signals
  if (item.includes("sneaker") || item.includes("hoodie") || item.includes("sweatshirt") || item.includes("cap") || item.includes("bucket hat")) return "street";
  if (item.includes("blazer") || item.includes("suit") || item.includes("trousers") || item.includes("trench")) return "tailoring";
  if (item.includes("gown") || item.includes("evening")) return "luxury";

  // Family-level defaults
  switch (family) {
    case "jewelry": return "luxury";
    case "watches": return "luxury";
    case "bags": return "commercial";
    case "eyewear": return "commercial";
    case "scarves": return "commercial";
    case "belts": return "commercial";
    case "headwear": return "commercial";
    case "small_accessories": return "commercial";
    case "footwear": return "commercial";
    case "full_look": return "editorial";
    case "apparel":
    default:
      return "commercial";
  }
}

// ── Core Recommendation Logic ──

export function getRecommendedSettings(input: RecommendationInput): RecommendedSettings {
  const { productFamily, specificItem } = input;
  const item = specificItem?.toLowerCase() || "";
  // Derive gender and style: use provided values if available, otherwise recommend
  const genderPresentation = input.genderPresentation ?? recommendGender(productFamily, item);
  const targetStyle = input.targetStyle ?? recommendStyle(productFamily, item);
  // Use the specific item name in titles when available, otherwise fall back to family name
  const itemLabel = specificItem || productFamily;

  // All internal returns produce a base result. Gender and style are spread on at the end.
  const base = _getBaseSettings(productFamily, item, itemLabel, targetStyle);
  return { ...base, genderPresentation, targetStyle };
}

type BaseSettings = Omit<RecommendedSettings, "genderPresentation" | "targetStyle">;

function _getBaseSettings(
  productFamily: ProductFamily,
  item: string,
  itemLabel: string,
  targetStyle: TargetStyle,
): BaseSettings {

  // Item-specific overrides first, then family + style matrix

  // ── Watches ──
  if (productFamily === "watches") {
    if (targetStyle === "luxury" || targetStyle === "tailoring") {
      return {
        primaryObjective: "craftsmanship",
        brandVisibility: "medium",
        poseDirection: "safe",
        title: "Precision detail set",
        reason: "Luxury watches sell through dial clarity, case finishing, and wrist presence. Safe pose direction reduces rendering risk on small details. Medium branding keeps the dial logo readable without forcing stiff compositions.",
      };
    }
    return {
      primaryObjective: "craftsmanship",
      brandVisibility: "low",
      poseDirection: "safe",
      title: "Detail-first watch set",
      reason: "Watches sell through wrist presence, dial clarity, case detail, and strap rendering. Safe pose direction reduces risk on small mechanical details. Low branding priority lets the watch design speak for itself.",
    };
  }

  // ── Jewelry ──
  if (productFamily === "jewelry") {
    if (item.includes("earring")) {
      if (targetStyle === "editorial" || targetStyle === "avant_garde") {
        return {
          primaryObjective: "editorial_story",
          secondaryEmphasis: "styling",
          brandVisibility: "low",
          poseDirection: "balanced",
          title: "Editorial earring set",
          reason: "Earrings sell through proximity, sparkle, and face-framing placement. Low branding keeps focus on the piece itself. Balanced pose direction allows both a clean hero and editorial mood shots.",
        };
      }
      return {
        primaryObjective: "craftsmanship",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: "Detail-led earring set",
        reason: "Earrings need close-up scale, ear placement, and pair symmetry. Low branding priority because jewelry usually doesn't have visible logos. Balanced pose direction gives clean detail shots with some editorial variety.",
      };
    }
    if (item.includes("necklace")) {
      return {
        primaryObjective: "craftsmanship",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: "Neckline-focused set",
        reason: "Necklaces sell through neckline placement, chain drape, and pendant detail. Balanced pose direction allows multiple neckline angles and one mood shot.",
      };
    }
    // Generic jewelry
    if (targetStyle === "editorial" || targetStyle === "avant_garde") {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: "Editorial jewelry set",
        reason: "Jewelry sells through sparkle, setting, and how it complements skin and clothing. Editorial style benefits from balanced pose direction for desirability shots.",
      };
    }
    return {
      primaryObjective: "craftsmanship",
      brandVisibility: "low",
      poseDirection: "balanced",
      title: "Detail-led jewelry set",
      reason: "Jewelry needs close-up craftsmanship proof, scale reference, and surface reflection. Low branding because most fine jewelry doesn't feature visible logos.",
    };
  }

  // ── Eyewear ──
  if (productFamily === "eyewear") {
    if (targetStyle === "luxury" || targetStyle === "editorial") {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "medium",
        poseDirection: "balanced",
        title: `${itemLabel} attitude and face-framing set`,
        reason: "Luxury eyewear sells through face framing, mood, and frame attitude. Medium logo priority keeps branding readable without forcing stiff shots. Balanced pose direction allows a clean hero, a product-focus angle, and editorial support.",
      };
    }
    return {
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "safe",
      title: `Clean commercial ${itemLabel} set`,
      reason: "Commercial eyewear needs frame shape, lens tint, and temple arm detail clearly visible. Medium branding ensures the logo on the temple arm is readable. Safe pose direction keeps shots reliable.",
    };
  }

  // ── Bags ──
  if (productFamily === "bags") {
    if (targetStyle === "luxury") {
      return {
        primaryObjective: "sell_clearly",
        secondaryEmphasis: "branding",
        brandVisibility: "medium",
        poseDirection: "balanced",
        title: `Premium ${itemLabel} set`,
        reason: "Luxury bags sell through carry method, hardware quality, and brand recognition. Medium branding balances logo visibility with natural carry poses. Balanced pose direction allows carry profiles and editorial context.",
      };
    }
    if (item.includes("clutch")) {
      return {
        primaryObjective: "craftsmanship",
        brandVisibility: "medium",
        poseDirection: "balanced",
        title: `${itemLabel} detail set`,
        reason: "Clutches are small and need close-up hardware and closure detail. Balanced pose direction allows hand interaction and editorial styling shots.",
      };
    }
    return {
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "safe",
      title: `Commercial ${itemLabel} set`,
      reason: "Commercial bags need carry method, body scale, and hardware readability first. Safe pose direction gives cleaner product-selling shots. Medium branding keeps logos naturally visible.",
    };
  }

  // ── Footwear ──
  if (productFamily === "footwear") {
    if (item.includes("sneaker") && (targetStyle === "street" || targetStyle === "contemporary")) {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "medium",
        poseDirection: "balanced",
        title: `Street ${itemLabel} set`,
        reason: "Sneakers in a street context sell through on-foot energy, sole profile, and styling attitude. Balanced pose direction allows a motion shot alongside clean product shots.",
      };
    }
    if (item.includes("heel") || item.includes("sandal")) {
      return {
        primaryObjective: "sell_clearly",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: `Elevated ${itemLabel} set`,
        reason: "Heels and sandals need clear on-foot presence and sole profile. Low branding because these products rarely feature prominent logos. Balanced pose direction allows some editorial variety.",
      };
    }
    return {
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "safe",
      title: `Commercial ${itemLabel} set`,
      reason: "Footwear needs on-foot presence, sole profile, and material detail clearly visible. Safe pose direction reduces rendering risk on shoe-to-ground contact.",
    };
  }

  // ── Apparel ──
  if (productFamily === "apparel") {
    if (item.includes("blazer") || item.includes("suit") || item.includes("coat") || item.includes("trench")) {
      if (targetStyle === "luxury" || targetStyle === "tailoring") {
        return {
          primaryObjective: "sell_clearly",
          secondaryEmphasis: "branding",
          brandVisibility: "high",
          poseDirection: "balanced",
          title: `Premium ${itemLabel} tailoring set`,
          reason: "Tailoring and branded apparel benefit from clear silhouette plus controlled premium presentation. High branding ensures labels and construction details are visible. Balanced pose direction keeps it polished without becoming rigid.",
        };
      }
      return {
        primaryObjective: "sell_clearly",
        brandVisibility: "medium",
        poseDirection: "balanced",
        title: "Structured garment set",
        reason: "Structured garments need clear silhouette, construction quality, and fit visibility. Balanced pose direction allows both a clean hero and editorial styling.",
      };
    }
    if (item.includes("dress")) {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: "Dress styling set",
        reason: "Dresses sell through drape, movement, and how they transform the silhouette. Balanced pose direction allows a motion shot to show fabric behaviour.",
      };
    }
    if (item.includes("hoodie") || item.includes("sweatshirt")) {
      if (targetStyle === "street") {
        return {
          primaryObjective: "sell_clearly",
          secondaryEmphasis: "branding",
          brandVisibility: "high",
          poseDirection: "safe",
          title: `Brand-forward ${itemLabel} set`,
          reason: "Hoodies and sweatshirts in streetwear are often logo-driven. High branding ensures front graphics stay readable. Safe pose direction gives reliable front-facing shots.",
        };
      }
    }
    // Editorial apparel
    if (targetStyle === "editorial" || targetStyle === "avant_garde") {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "mood",
        brandVisibility: "low",
        poseDirection: "directional",
        title: "Editorial apparel set",
        reason: "Editorial apparel sells through mood, styling, and desirability. Directional pose direction allows stronger fashion energy. Low branding lets the styling tell the story.",
      };
    }
    // Default apparel
    return {
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "safe",
      title: "Clean commercial set",
      reason: "Commercial apparel needs silhouette, fit, and fabric clearly visible. Safe pose direction gives reliable, clean selling images.",
    };
  }

  // ── Belts ──
  if (productFamily === "belts") {
    if (item.includes("statement") || item.includes("chain")) {
      if (targetStyle === "editorial" || targetStyle === "avant_garde") {
        return {
          primaryObjective: "editorial_story",
          secondaryEmphasis: "styling",
          brandVisibility: "medium",
          poseDirection: "balanced",
          title: `Editorial ${itemLabel} styling set`,
          reason: "Statement belts sell through visual impact and how they transform an outfit. Balanced pose direction allows both a clean waist hero and editorial context. Medium branding keeps any hardware marks readable.",
        };
      }
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "medium",
        poseDirection: "safe",
        title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} styling set`,
        reason: "Statement belts are bought for their visual impact. Styling emphasis shows how the belt transforms the outfit. Safe pose direction gives reliable waist-level product shots.",
      };
    }
    if (targetStyle === "luxury" || targetStyle === "tailoring") {
      return {
        primaryObjective: "sell_clearly",
        secondaryEmphasis: "branding",
        brandVisibility: "high",
        poseDirection: "safe",
        title: `Premium ${itemLabel} set`,
        reason: "Luxury belts sell through buckle quality, brand recognition, and leather craftsmanship. High branding keeps the buckle logo consistently readable. Safe pose direction ensures clean, reliable product shots.",
      };
    }
    if (targetStyle === "editorial" || targetStyle === "avant_garde") {
      return {
        primaryObjective: "craftsmanship",
        brandVisibility: "medium",
        poseDirection: "balanced",
        title: `Editorial ${itemLabel} detail set`,
        reason: "Editorial belts benefit from close-up craftsmanship proof alongside styled context. Balanced pose direction allows a buckle hero, leather texture shot, and one editorial styling frame.",
      };
    }
    // Default commercial belt
    return {
      primaryObjective: "craftsmanship",
      brandVisibility: "medium",
      poseDirection: "safe",
      title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} buckle and leather set`,
      reason: "Belts sell through buckle quality, leather texture, and waist anchoring. Medium branding keeps buckle logos visible. Safe pose direction ensures clean product shots.",
    };
  }

  // ── Scarves ──
  if (productFamily === "scarves") {
    if (targetStyle === "editorial" || targetStyle === "luxury") {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: "Styled scarf set",
        reason: "Scarves sell through drape, colour, and how they layer into a look. Balanced pose direction allows motion and styling shots. Low branding because scarves rarely feature prominent logos.",
      };
    }
    return {
      primaryObjective: "sell_clearly",
      brandVisibility: "low",
      poseDirection: "balanced",
      title: "Scarf product set",
      reason: "Scarves need fabric drape and texture clearly visible. Balanced pose direction allows a drape shot alongside clean product views.",
    };
  }

  // ── Headwear ──
  if (productFamily === "headwear") {
    if (item.includes("beanie") || item.includes("knit")) {
      return {
        primaryObjective: "sell_clearly",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} texture and fit set`,
        reason: "Knit headwear sells through texture, warmth, and fit. Low branding because beanies rarely feature prominent logos. Balanced pose direction allows a portrait hero, profile, and texture detail.",
      };
    }
    if (item.includes("bucket") || item.includes("sun hat") || item.includes("fedora") || item.includes("wide brim")) {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} styling set`,
        reason: "Brimmed hats sell through shape, shade effect, and styling attitude. Low branding because brim hats are about silhouette, not logos. Balanced pose direction allows a portrait hero, side profile, and lifestyle shot.",
      };
    }
    if (targetStyle === "street") {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "high",
        poseDirection: "balanced",
        title: `Street ${itemLabel} set`,
        reason: "Street headwear is often logo-driven. High branding keeps the front logo readable. Balanced pose direction allows a portrait hero and styled editorial shots.",
      };
    }
    if (targetStyle === "luxury" || targetStyle === "editorial") {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "styling",
        brandVisibility: "medium",
        poseDirection: "balanced",
        title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} styling set`,
        reason: "Luxury and editorial headwear benefit from styled presentation. Medium branding ensures any logos are readable without forcing stiff compositions.",
      };
    }
    return {
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "balanced",
      title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} face-framing set`,
      reason: "Headwear needs face framing and fit clearly visible. Medium branding keeps any front logos readable. Balanced pose direction allows a clean face portrait hero plus profile and detail shots.",
    };
  }

  // ── Small Accessories ──
  if (productFamily === "small_accessories") {
    if (item.includes("wallet") || item.includes("cardholder") || item.includes("card holder")) {
      if (targetStyle === "luxury") {
        return {
          primaryObjective: "sell_clearly",
          secondaryEmphasis: "branding",
          brandVisibility: "medium",
          poseDirection: "safe",
          title: `Premium ${itemLabel} set`,
          reason: "Luxury leather goods sell through material quality, logo stamp, and edge finishing. Medium branding ensures the logo is readable. Safe pose direction gives reliable product shots.",
        };
      }
      return {
        primaryObjective: "craftsmanship",
        brandVisibility: "low",
        poseDirection: "balanced",
        title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} detail set`,
        reason: "Wallets and cardholders sell through leather quality, construction detail, and slim profile. Low branding because small leather goods rarely feature large logos. Balanced pose direction allows a hand-held hero, flat lay, and texture macro.",
      };
    }
    if (item.includes("keychain") || item.includes("key holder") || item.includes("key fob")) {
      return {
        primaryObjective: "craftsmanship",
        brandVisibility: "low",
        poseDirection: "safe",
        title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} hardware set`,
        reason: "Keychains sell through hardware quality, attachment mechanism, and tactile weight. Safe pose direction gives reliable close-up product shots.",
      };
    }
    if (targetStyle === "luxury" || targetStyle === "editorial") {
      return {
        primaryObjective: "sell_clearly",
        secondaryEmphasis: "branding",
        brandVisibility: "medium",
        poseDirection: "balanced",
        title: `Premium ${itemLabel} set`,
        reason: "Luxury small accessories benefit from premium presentation with readable branding. Balanced pose direction allows a hero, detail, and lifestyle shot.",
      };
    }
    return {
      primaryObjective: "craftsmanship",
      brandVisibility: "low",
      poseDirection: "balanced",
      title: `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} detail set`,
      reason: "Small accessories need scale reference and texture detail. Low branding because these items rarely feature large logos. Balanced pose direction allows hand interaction and flat-lay detail shots.",
    };
  }

  // ── Full Look ──
  if (productFamily === "full_look") {
    if (targetStyle === "editorial" || targetStyle === "avant_garde") {
      return {
        primaryObjective: "editorial_story",
        secondaryEmphasis: "mood",
        brandVisibility: "low",
        poseDirection: "directional",
        title: "Editorial full look",
        reason: "Full-look editorials sell through styling story and overall mood. Directional pose direction creates stronger fashion energy across the set.",
      };
    }
    return {
      primaryObjective: "editorial_story",
      secondaryEmphasis: "styling",
      brandVisibility: "medium",
      poseDirection: "balanced",
      title: "Styled full look",
      reason: "Full looks sell through how pieces work together. Balanced pose direction allows both a clear full-body hero and editorial context shots.",
    };
  }

  // ── Style-based fallbacks ──
  if (targetStyle === "luxury" || targetStyle === "tailoring") {
    return {
      primaryObjective: "sell_clearly",
      secondaryEmphasis: "branding",
      brandVisibility: "medium",
      poseDirection: "balanced",
      title: "Premium product set",
      reason: "Luxury and tailoring styles benefit from controlled premium presentation with readable branding.",
    };
  }

  if (targetStyle === "editorial" || targetStyle === "avant_garde") {
    return {
      primaryObjective: "editorial_story",
      secondaryEmphasis: "mood",
      brandVisibility: "low",
      poseDirection: "directional",
      title: "Editorial set",
      reason: "Editorial styles prioritise mood and desirability over product clarity.",
    };
  }

  // Ultimate fallback
  return {
    primaryObjective: "sell_clearly",
    brandVisibility: "medium",
    poseDirection: "safe",
    title: "Clean product set",
    reason: "A safe starting point: clear product visibility with moderate branding and reliable commercial poses.",
  };
}

// ── Warning Logic for Risky Overrides ──

export function getSettingsWarnings(
  objective: PrimaryObjective,
  brandVisibility: BrandVisibility,
  poseDirection: PoseDirection,
  productFamily: ProductFamily,
  secondaryEmphasis?: SecondaryEmphasis,
): SettingsWarning[] {
  const warnings: SettingsWarning[] = [];

  // Jewelry + high branding: jewelry rarely has visible logos
  if (productFamily === "jewelry" && brandVisibility === "high") {
    warnings.push({
      message: "Most jewelry doesn't feature visible logos. High branding priority may force awkward compositions.",
    });
  }

  // Watches + high branding: dial logos are small, high priority may constrain angles
  if (productFamily === "watches" && brandVisibility === "high") {
    warnings.push({
      message: "Watch dial logos are small. High branding priority may over-constrain shot angles.",
    });
  }

  // Craftsmanship + directional: risky combination
  if (objective === "craftsmanship" && poseDirection === "directional") {
    warnings.push({
      message: "Directional pose direction increases rendering risk on close-up detail shots. Consider balanced or safe for more reliable results.",
    });
  }

  // Branding emphasis + low brand visibility: contradictory
  if (secondaryEmphasis === "branding" && brandVisibility === "low") {
    warnings.push({
      message: "Low brand visibility may conflict with a branding emphasis. The planner might deprioritise logo-safe shots.",
    });
  }

  // Sell clearly + directional: reduces clarity
  if (objective === "sell_clearly" && poseDirection === "directional") {
    warnings.push({
      message: "Directional pose direction prioritises editorial energy over clean product visibility. Consider safe or balanced for clearer selling images.",
    });
  }

  // Editorial story + high branding: may force stiff compositions
  if (objective === "editorial_story" && brandVisibility === "high") {
    warnings.push({
      message: "High brand visibility may limit the editorial and mood shots this objective is designed for.",
    });
  }

  // Scarves/small_accessories + high branding
  if ((productFamily === "scarves" || productFamily === "small_accessories") && brandVisibility === "high") {
    warnings.push({
      message: "This product category rarely features prominent branding. High brand visibility may not produce visible results.",
    });
  }

  return warnings;
}
