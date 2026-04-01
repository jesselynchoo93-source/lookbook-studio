import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { parseModelJSON } from "@/lib/lookbook/parseModelJSON";

/**
 * Styling reference analyser.
 * Uses Gemini 2.5 Flash to extract environment tokens (ExtractedWorldTokens)
 * and brand guidelines from a styling reference image.
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

Extract the ENVIRONMENT and brand direction from this image. Focus on the physical setting, not the model's outfit or styling.

Return a JSON object with these exact fields:

extractedWorld: object describing the physical environment:
- backdrop: brief description of background/setting (e.g. "weathered masonry wall", "clean white studio")
- groundPlane: brief description of ground surface (e.g. "paved courtyard", "polished concrete floor")
- lighting: brief description of lighting quality (e.g. "soft directional daylight", "overcast outdoor", "window light from left")
- tonalTemperature: one of "warm", "cool", "neutral"
- architecturalElements: array of 0-3 notable architectural features (e.g. ["courtyard wall", "stone steps"])
- furnitureElements: array of 0-3 furniture items visible (e.g. ["wooden bench", "metal chair"])
- naturalElements: array of 0-3 natural features (e.g. ["palm trees", "sandy ground"])
- environmentMood: one short phrase describing the feel (e.g. "industrial urban", "warm Mediterranean")
- suggestedFamily: one of "studio_minimal", "architectural_interior", "architectural_exterior", "furnished_interior", "urban_exterior", "natural_exterior"

brandGuidelines: 2-4 concise sentences describing the visual brand rules. Focus on colour palette, aesthetic, mood, composition. Write as instructions, e.g. "Maintain warm earth tones. Keep backgrounds clean."

confidence: one of "high", "medium", "low"

IMPORTANT: extractedWorld is environment-only. Do NOT include outfit, wardrobe, styling, or grooming information in extractedWorld. Those belong in brandGuidelines if relevant.

Example response:
{"extractedWorld":{"backdrop":"warm concrete wall","groundPlane":"matte grey floor","lighting":"directional key light, soft warm","tonalTemperature":"warm","architecturalElements":["textured wall plane"],"furnitureElements":[],"naturalElements":[],"environmentMood":"warm editorial","suggestedFamily":"architectural_interior"},"brandGuidelines":"Maintain warm earth tones throughout. Keep backgrounds clean and textured. Favour directional lighting with soft shadows.","confidence":"high"}

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
      maxOutputTokens: 2048,
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
    });

    const result = parseModelJSON(text) as Record<string, unknown>;

    return NextResponse.json({
      extractedWorld: result.extractedWorld || null,
      brandGuidelines: result.brandGuidelines || "",
      confidence: result.confidence || "medium",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyse-styling]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
