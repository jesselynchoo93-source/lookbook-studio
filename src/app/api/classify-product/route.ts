import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Lightweight product classification endpoint.
 * Uses Gemini 2.5 Flash (cheapest vision model) to detect product family
 * and specific item from an uploaded image. Runs before fingerprint extraction.
 *
 * Cost: ~$0.0001-0.0005 per call (8-10x cheaper than Haiku).
 */

const VALID_FAMILIES = [
  "apparel", "footwear", "bags", "jewelry", "eyewear",
  "watches", "headwear", "belts", "scarves", "small_accessories", "full_look",
] as const;

const ITEMS_BY_FAMILY: Record<string, string[]> = {
  apparel: ["t-shirt", "shirt", "polo", "knitwear", "blazer", "suit jacket", "bomber", "leather jacket", "coat", "trench", "hoodie", "sweatshirt", "dress", "skirt", "trousers", "jeans", "shorts"],
  footwear: ["sneakers", "loafers", "derby shoes", "boots", "heels", "sandals"],
  bags: ["tote", "shoulder bag", "crossbody", "clutch", "backpack"],
  jewelry: ["earrings", "necklace", "bracelet", "ring"],
  eyewear: ["sunglasses", "optical glasses"],
  watches: ["dress watch", "sport watch"],
  headwear: ["cap", "beanie", "hat"],
  belts: ["leather belt", "statement belt"],
  scarves: ["silk scarf", "knit scarf"],
  small_accessories: ["wallet", "cardholder", "charm", "phone case"],
  full_look: ["multiple pieces styled together"],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body as {
      imageBase64: string;
      mimeType: string;
    };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "Missing required fields: imageBase64, mimeType" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const systemPrompt = `You are a product classifier for fashion e-commerce photography. Given a product image, identify:
1. The product family (category)
2. The specific item type

Valid families: ${VALID_FAMILIES.join(", ")}

Valid items per family:
${Object.entries(ITEMS_BY_FAMILY).map(([f, items]) => `${f}: ${items.join(", ")}`).join("\n")}

Respond with ONLY a JSON object like: {"family": "bags", "specificItem": "tote", "confidence": "high"}
confidence is "high" if you're certain, "medium" if somewhat unsure, "low" if guessing.
If the image doesn't show a fashion product, return: {"family": "apparel", "specificItem": "", "confidence": "low"}`;

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageBase64,
              mediaType: mimeType,
            },
            {
              type: "text",
              text: "Classify this product. JSON only.",
            },
          ],
        },
      ],
      maxOutputTokens: 1024,
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
    });

    // Parse response - strip markdown fencing, extract JSON, remove trailing commas
    let cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
    const result = JSON.parse(cleaned);

    // Validate family
    const family = VALID_FAMILIES.includes(result.family) ? result.family : "apparel";
    const validItems = ITEMS_BY_FAMILY[family] || [];
    const specificItem = validItems.includes(result.specificItem) ? result.specificItem : "";

    return NextResponse.json({
      family,
      specificItem,
      confidence: result.confidence || "medium",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[classify-product]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
