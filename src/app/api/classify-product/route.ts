import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { parseModelJSON } from "@/lib/lookbook/parseModelJSON";
import { PRODUCT_ITEMS } from "@/lib/lookbook/taxonomy";

/**
 * Lightweight product classification endpoint.
 * Uses Gemini 2.5 Flash (cheapest vision model) to detect product family,
 * specific item, gender presentation, and target style from an uploaded image.
 *
 * Cost: ~$0.0001-0.0005 per call (8-10x cheaper than Haiku).
 */

const VALID_FAMILIES = Object.keys(PRODUCT_ITEMS) as (keyof typeof PRODUCT_ITEMS)[];
const VALID_GENDERS = ["menswear", "womenswear", "unisex"] as const;
const VALID_STYLES = ["commercial", "editorial", "luxury", "minimal", "street", "resort", "tailoring", "contemporary", "avant_garde"] as const;

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
3. The gender presentation (who this product is designed for based on its cut, styling, and silhouette)
4. The target style (the visual/commercial style that best fits this product)

Valid families: ${VALID_FAMILIES.join(", ")}

Valid items per family:
${Object.entries(PRODUCT_ITEMS).map(([f, items]) => `${f}: ${items.join(", ")}`).join("\n")}

Valid genderPresentation values: ${VALID_GENDERS.join(", ")}
Valid targetStyle values: ${VALID_STYLES.join(", ")}

Respond with ONLY a JSON object like: {"family": "bags", "specificItem": "tote", "genderPresentation": "womenswear", "targetStyle": "luxury", "confidence": "high"}
confidence is "high" if you're certain, "medium" if somewhat unsure, "low" if guessing.
If the image doesn't show a fashion product, return: {"family": "apparel", "specificItem": "", "genderPresentation": "unisex", "targetStyle": "commercial", "confidence": "low"}`;

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

    const result = parseModelJSON(text) as {
      family?: string;
      specificItem?: string;
      genderPresentation?: string;
      targetStyle?: string;
      confidence?: string;
    };

    // Validate family
    const family = (result.family && VALID_FAMILIES.includes(result.family as typeof VALID_FAMILIES[number]))
      ? result.family as typeof VALID_FAMILIES[number]
      : "apparel";
    const validItems = PRODUCT_ITEMS[family] || [];
    const specificItem = (result.specificItem && validItems.includes(result.specificItem)) ? result.specificItem : "";

    // Validate gender and style
    const genderPresentation = (result.genderPresentation && (VALID_GENDERS as readonly string[]).includes(result.genderPresentation))
      ? result.genderPresentation
      : "unisex";
    const targetStyle = (result.targetStyle && (VALID_STYLES as readonly string[]).includes(result.targetStyle))
      ? result.targetStyle
      : "commercial";

    return NextResponse.json({
      family,
      specificItem,
      genderPresentation,
      targetStyle,
      confidence: result.confidence || "medium",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[classify-product]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
