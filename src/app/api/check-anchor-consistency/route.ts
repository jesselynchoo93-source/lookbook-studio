import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Two modes:
 * 1. "extract" - Extract visual signature from anchor image
 * 2. "compare" - Compare a shot against the anchor for drift
 */

interface ExtractRequest {
  mode: "extract";
  anchorBase64: string;
  anchorMimeType: string;
}

interface CompareRequest {
  mode: "compare";
  anchorBase64: string;
  anchorMimeType: string;
  shotBase64: string;
  shotMimeType: string;
  anchorSignature?: string;
  strictMode?: boolean;
}

type RequestBody = ExtractRequest | CompareRequest;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fail open
      if (body.mode === "extract") return NextResponse.json({ signature: null });
      return NextResponse.json({ score: 5, consistent: true });
    }

    const google = createGoogleGenerativeAI({ apiKey });

    if (body.mode === "extract") {
      const { anchorBase64, anchorMimeType } = body;
      if (!anchorBase64) return NextResponse.json({ signature: null });

      const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: `data:${anchorMimeType};base64,${anchorBase64}`,
              },
              {
                type: "text",
                text: "Describe this image's visual system in exactly this JSON format. Be precise and brief:\n{\"backgroundTone\": \"warm grey / cool white / etc\", \"lightingDirection\": \"soft even from upper-left / hard directional overhead / etc\", \"colourTemperature\": \"neutral-cool / warm / etc\", \"framing\": \"full-length / three-quarter / etc\", \"overallBrightness\": \"bright / medium / dim\", \"shadowDetail\": \"minimal / soft / pronounced\"}\nReturn ONLY the JSON object, nothing else.",
              },
            ],
          },
        ],
      });

      try {
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const signature = `Background tone: ${parsed.backgroundTone}. Lighting: ${parsed.lightingDirection}. Colour temperature: ${parsed.colourTemperature}. Framing: ${parsed.framing}. Overall brightness: ${parsed.overallBrightness || "medium"}. Shadow detail: ${parsed.shadowDetail || "soft"}.`;
        return NextResponse.json({ signature });
      } catch {
        return NextResponse.json({ signature: null });
      }
    }

    if (body.mode === "compare") {
      const { anchorBase64, anchorMimeType, shotBase64, shotMimeType } = body;
      if (!anchorBase64 || !shotBase64) {
        return NextResponse.json({ score: 5, consistent: true });
      }

      const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: `data:${anchorMimeType};base64,${anchorBase64}`,
              },
              {
                type: "text",
                text: "This is the anchor shot from a commerce photography set.",
              },
              {
                type: "image",
                image: `data:${shotMimeType};base64,${shotBase64}`,
              },
              {
                type: "text",
                text: `This is another shot from the same commerce photography set.${body.anchorSignature ? ` The anchor's visual signature is: ${body.anchorSignature}.` : ""}
Compare these two images on EXACTLY these dimensions:
1. Background tone (warm/cool/neutral) - must be identical
2. Colour temperature - must match within the same range
3. Lighting direction and quality - must match
4. Overall brightness/exposure level - must be within 10%
5. Pose/body orientation - must match the reference pose family
6. Crop/framing composition - must match the reference framing
Score 1-5 where 5 is perfectly matched and 3 means noticeable but minor difference.
Return ONLY a JSON object: {"score": <number>, "reason": "brief note", "backgroundToneMismatch": true/false, "framingScaleMismatch": true/false, "brightnessMismatch": true/false, "poseMismatch": true/false, "compositionMismatch": true/false}`,
              },
            ],
          },
        ],
      });

      try {
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned) as {
          score: number;
          reason?: string;
          backgroundToneMismatch?: boolean;
          framingScaleMismatch?: boolean;
          brightnessMismatch?: boolean;
          poseMismatch?: boolean;
          compositionMismatch?: boolean;
        };
        // Base check: score >= 4 + no background/framing mismatch (applies to all shots)
        const baseConsistent = parsed.score >= 4
          && parsed.backgroundToneMismatch !== true
          && parsed.framingScaleMismatch !== true;
        // Strict mode (worn-detail): additionally require no brightness/pose/composition mismatch
        const consistent = body.strictMode
          ? baseConsistent
            && parsed.brightnessMismatch !== true
            && parsed.poseMismatch !== true
            && parsed.compositionMismatch !== true
          : baseConsistent;
        return NextResponse.json({
          score: parsed.score,
          consistent,
          reason: parsed.reason,
          backgroundToneMismatch: parsed.backgroundToneMismatch ?? false,
          framingScaleMismatch: parsed.framingScaleMismatch ?? false,
          brightnessMismatch: parsed.brightnessMismatch ?? false,
          poseMismatch: parsed.poseMismatch ?? false,
          compositionMismatch: parsed.compositionMismatch ?? false,
        });
      } catch {
        return NextResponse.json({ score: 5, consistent: true });
      }
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[check-anchor-consistency]", err instanceof Error ? err.message : err);
    // Fail open
    return NextResponse.json({ score: 5, consistent: true });
  }
}
