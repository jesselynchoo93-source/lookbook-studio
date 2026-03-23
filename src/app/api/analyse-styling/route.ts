import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Styling reference analyser.
 * Uses Gemini 2.0 Flash to extract mood, lighting, and brand direction
 * from a styling reference image. Auto-derives Continuity World settings
 * and brand guidelines.
 *
 * Cost: ~$0.0002-0.0005 per call.
 */

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

    const systemPrompt = `You are a fashion photography art director analysing a styling reference image.

Extract the visual mood and brand direction from this image. Return a JSON object with:

{
  "worldPreset": "neutral_studio" | "warm_editorial" | "cool_modern" | "natural_light" | null,
  "worldTokens": {
    "backdrop": "brief description of background/setting",
    "lighting": "brief description of lighting setup and quality",
    "tonalTemperature": "warm" | "cool" | "neutral" | "warm neutral" | "cool neutral" | "warm daylight",
    "styling": "brief wardrobe/styling direction"
  },
  "brandGuidelines": "2-4 concise sentences describing the visual brand rules visible in this image. Focus on: colour palette, aesthetic (minimalist, editorial, streetwear, luxury), mood (relaxed, commanding, aspirational), composition preferences, and any consistent visual patterns. Write as instructions, e.g. 'Maintain warm earth tones. Keep backgrounds clean and uncluttered.'",
  "confidence": "high" | "medium" | "low"
}

worldPreset rules:
- "neutral_studio": clean grey/white backdrop, even lighting, no mood bias
- "warm_editorial": warm tones, directional light, fashion editorial feel
- "cool_modern": dark/cool tones, hard light, architectural/contemporary
- "natural_light": daylight, organic textures, relaxed and approachable
- null: if the image doesn't clearly match any preset

Respond with ONLY valid JSON. No markdown fencing.`;

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
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
              text: "Analyse this styling reference. JSON only.",
            },
          ],
        },
      ],
      maxOutputTokens: 512,
    });

    const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({
      worldPreset: result.worldPreset || null,
      worldTokens: result.worldTokens || null,
      brandGuidelines: result.brandGuidelines || "",
      confidence: result.confidence || "medium",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyse-styling]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
