import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { buildSceneExtractionPrompt } from "@/lib/commerce/sceneExtractionSchema";
import { parseModelJSON } from "@/lib/lookbook/parseModelJSON";
import type { CommerceShotRole, SceneConstraints } from "@/lib/commerce/referenceLibrary.types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, shotRole, quality } = body as {
      imageBase64: string;
      mimeType: string;
      shotRole?: CommerceShotRole;
      quality?: "standard" | "high";
    };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "Missing required fields: imageBase64, mimeType" },
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

    const systemPrompt = buildSceneExtractionPrompt(shotRole);

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
              text: "Analyse this reference image and extract all pose, camera, scene, and garment visibility data into JSON. Respond with ONLY a valid JSON object, no markdown fencing, no explanation.",
            },
          ],
        },
      ],
    });

    const parsed = parseModelJSON(text);
    if (!parsed) {
      return NextResponse.json(
        { error: "Failed to parse model response as JSON" },
        { status: 502 },
      );
    }

    // Basic validation of required fields
    const constraints = parsed as SceneConstraints;
    if (!constraints.poseClass || !constraints.backgroundType || !constraints.framing) {
      return NextResponse.json(
        { error: "Extraction missing required fields (poseClass, backgroundType, framing)", data: parsed },
        { status: 422 },
      );
    }

    return NextResponse.json({ constraints });
  } catch (err) {
    console.error("Scene constraint extraction failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
