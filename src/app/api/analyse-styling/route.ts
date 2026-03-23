import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Styling reference analyser.
 * Uses Gemini 2.5 Flash to extract mood, lighting, and brand direction
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

Extract the visual mood and brand direction from this image.

Return a JSON object with these exact fields:

worldPreset: one of "neutral_studio", "warm_editorial", "cool_modern", "natural_light", or null.
- "neutral_studio" = clean grey/white backdrop, even lighting, no mood bias
- "warm_editorial" = warm tones, directional light, fashion editorial feel
- "cool_modern" = dark/cool tones, hard light, architectural/contemporary
- "natural_light" = daylight, organic textures, relaxed and approachable
- null = if the image doesn't clearly match any preset

worldTokens: object with these string fields:
- backdrop: brief description of background/setting
- lighting: brief description of lighting setup and quality
- tonalTemperature: one of "warm", "cool", "neutral", "warm neutral", "cool neutral", "warm daylight"
- styling: brief wardrobe/styling direction

brandGuidelines: 2-4 concise sentences describing the visual brand rules. Focus on colour palette, aesthetic, mood, composition. Write as instructions, e.g. "Maintain warm earth tones. Keep backgrounds clean."

confidence: one of "high", "medium", "low"

Example response:
{"worldPreset":"warm_editorial","worldTokens":{"backdrop":"warm concrete wall","lighting":"directional key light, soft warm","tonalTemperature":"warm","styling":"earth tones, tailored"},"brandGuidelines":"Maintain warm earth tones throughout. Keep backgrounds clean and textured. Favour directional lighting with soft shadows.","confidence":"high"}

Respond with ONLY valid JSON. No markdown, no comments, no extra text.`;

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
              text: "Analyse this styling reference. JSON only.",
            },
          ],
        },
      ],
      maxOutputTokens: 512,
    });

    // Strip markdown fencing, trailing commas, and any text before/after JSON
    let cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    // Extract JSON object if surrounded by other text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    // Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
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
