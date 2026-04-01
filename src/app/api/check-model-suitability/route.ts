import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Lightweight model-ref suitability check.
 * Detects if a model reference photo contains visible outerwear, layering,
 * or complex accessories that could contaminate generated commerce shots.
 *
 * Returns { suitable: boolean, reason?: string }
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
      // Fail open: if no API key, assume suitable
      return NextResponse.json({ suitable: true });
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: `data:${mimeType};base64,${imageBase64}`,
            },
            {
              type: "text",
              text: "Look at this photo of a person. Does the person have visible outerwear (blazer, jacket, coat), heavy layering, or complex accessories (large bags, scarves, hats)? Answer with ONLY a JSON object: {\"hasOuterwear\": true/false, \"reason\": \"brief description of what you see\"}. If the person is wearing simple clothing (t-shirt, tank top, plain dress) or is a headshot, answer false.",
            },
          ],
        },
      ],
    });

    // Parse the response
    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned) as { hasOuterwear: boolean; reason?: string };
      return NextResponse.json({
        suitable: !parsed.hasOuterwear,
        reason: parsed.reason,
      });
    } catch {
      // If parsing fails, assume suitable (fail open)
      return NextResponse.json({ suitable: true });
    }
  } catch (err: unknown) {
    // Fail open on any error
    console.error("[check-model-suitability]", err instanceof Error ? err.message : err);
    return NextResponse.json({ suitable: true });
  }
}
