import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  buildExtractionPrompt,
  normaliseExtractedFingerprint,
} from "@/lib/lookbook/fingerprintSchema";
import { parseModelJSON } from "@/lib/lookbook/parseModelJSON";
import type { ProductFamily } from "@/lib/lookbook/types";

const VALID_FAMILIES = new Set<ProductFamily>([
  "bags",
  "watches",
  "belts",
  "jewelry",
  "eyewear",
  "apparel",
  "footwear",
  "headwear",
  "scarves",
  "small_accessories",
  "full_look",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, family, quality, specificItem } = body as {
      imageBase64: string;
      mimeType: string;
      family: ProductFamily;
      quality?: "standard" | "high";
      specificItem?: string;
    };

    if (!imageBase64 || !mimeType || !family) {
      return NextResponse.json(
        { error: "Missing required fields: imageBase64, mimeType, family" },
        { status: 400 },
      );
    }

    if (!VALID_FAMILIES.has(family)) {
      return NextResponse.json(
        { error: `Unsupported family for extraction: ${family}. Supported: ${[...VALID_FAMILIES].join(", ")}` },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 },
      );
    }

    const anthropic = createAnthropic({ apiKey });
    const modelId =
      quality === "high"
        ? "claude-opus-4-6"
        : "claude-sonnet-4-6";

    const systemPrompt = buildExtractionPrompt(family, specificItem);

    const { text } = await generateText({
      model: anthropic(modelId),
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
              text: "Analyse this product image and extract all visible attributes into JSON. Respond with ONLY a valid JSON object, no markdown fencing, no explanation.",
            },
          ],
        },
      ],
      maxOutputTokens: 1024,
    });

    // Parse model response as JSON
    let rawJson: Record<string, unknown>;
    try {
      rawJson = parseModelJSON(text) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          error: "Model returned invalid JSON",
          raw: text,
          confidence: "low" as const,
          notes: ["Model output was not valid JSON. Try Re-run with higher quality."],
        },
        { status: 422 },
      );
    }

    // Stage 2: Deterministic normaliser
    const result = normaliseExtractedFingerprint(family, rawJson);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[extract-fingerprint]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
