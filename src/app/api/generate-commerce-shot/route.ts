import { NextRequest, NextResponse } from "next/server";

// ── Model Endpoints ──
// Default: nano-banana-pro-preview (Higgsfield via Gemini API)
// Experiment: gemini-2.5-flash-image for edit-preserve testing
const MODEL_ENDPOINTS: Record<string, string> = {
  "nano-banana-pro-preview":
    "https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent",
  "gemini-2.5-flash-preview-image-generation":
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image-generation:generateContent",
};

const DEFAULT_MODEL = "nano-banana-pro-preview";

interface ImageInput {
  base64: string;
  mimeType: string;
}

/**
 * Generation mode controls how the template image is framed in the request.
 *
 * - "reference_guided" (default): Template is a reference for composition/background.
 *   Gemini generates a new image guided by all references. Current behavior.
 *
 * - "edit_base": Template is framed as the base image to edit.
 *   Gemini is instructed to edit image 1, preserving background/pose/framing
 *   and changing only the garment (and optionally face identity).
 *   This aligns with Gemini's documented edit capabilities.
 */
type GenerationMode = "reference_guided" | "edit_base";

type ShotClass = "body" | "worn_detail" | "flat_lay" | "macro";

const VALID_SHOT_CLASSES: ShotClass[] = ["body", "worn_detail", "flat_lay", "macro"];

interface GenerateRequest {
  prompt: string;
  negativePrompt?: string;
  templateImage: ImageInput;
  productImage?: ImageInput;
  modelImage?: ImageInput;
  anchorImage?: ImageInput;
  isWornDetail?: boolean;
  /** Shot class for route-level annotation selection. */
  shotClass?: ShotClass;
  /** Generation mode. Default: "reference_guided". */
  generationMode?: GenerationMode;
  /** Model override for experiments. Default: "nano-banana-pro-preview". */
  modelOverride?: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const { prompt, templateImage, productImage, modelImage, anchorImage } = body;
    const generationMode: GenerationMode = body.generationMode ?? "reference_guided";
    const modelKey = body.modelOverride ?? DEFAULT_MODEL;
    const shotClass: ShotClass = body.shotClass ?? (body.isWornDetail ? "worn_detail" : "body");

    if (!VALID_SHOT_CLASSES.includes(shotClass)) {
      return NextResponse.json(
        { error: `Unknown shotClass: ${shotClass}. Valid: ${VALID_SHOT_CLASSES.join(", ")}` },
        { status: 400 },
      );
    }

    if (!prompt || !templateImage?.base64 || !templateImage?.mimeType) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, templateImage (base64 + mimeType)" },
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

    const endpoint = MODEL_ENDPOINTS[modelKey];
    if (!endpoint) {
      return NextResponse.json(
        { error: `Unknown model: ${modelKey}. Available: ${Object.keys(MODEL_ENDPOINTS).join(", ")}` },
        { status: 400 },
      );
    }

    const parts: GeminiPart[] = [];

    if (generationMode === "edit_base") {
      // ── Edit-base mode: template is the canvas to edit ──
      // The template image goes FIRST as "the image to edit."
      // Gemini is instructed to preserve everything except the garment
      // (and optionally face identity).
      buildEditBaseParts(parts, body);
    } else {
      // ── Reference-guided mode (default): base-scene framing with shotClass ──
      buildReferenceGuidedParts(parts, body, shotClass);
    }

    // Authority boundary preamble: frames the compiled prompt with ownership rules
    if (shotClass === "flat_lay" || shotClass === "macro") {
      parts.push({
        text: "AUTHORITY: Surface reference = surface to preserve (colour, texture, lighting). Product image = garment only. Do not transfer garment appearance from the surface reference.",
      });
    } else {
      parts.push({
        text: "AUTHORITY: Template image = base scene to preserve (background, lighting, pose, camera). Product image = garment authority only. Model image = identity authority only. Do not transfer properties across these domains.",
      });
    }

    // Final text part: the compiled prompt
    parts.push({ text: prompt });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Gemini API request timed out after 60 seconds" },
          { status: 504 },
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[generate-commerce-shot] Gemini API error:", response.status, errorBody);
      return NextResponse.json(
        { error: `Gemini API returned ${response.status}: ${errorBody}` },
        { status: 502 },
      );
    }

    const data = await response.json();

    // Extract the generated image from the response
    const candidateParts: GeminiPart[] | undefined =
      data?.candidates?.[0]?.content?.parts;

    if (!candidateParts || candidateParts.length === 0) {
      return NextResponse.json(
        { error: "Gemini returned no content in the response" },
        { status: 502 },
      );
    }

    const imagePart = candidateParts.find(
      (p: GeminiPart) => p.inlineData?.data && p.inlineData?.mimeType,
    );

    if (!imagePart?.inlineData) {
      return NextResponse.json(
        { error: "Gemini response did not contain a generated image" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-commerce-shot]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Reference-Guided Mode (default, base-scene framing with shotClass) ──

function buildReferenceGuidedParts(parts: GeminiPart[], body: GenerateRequest, shotClass: ShotClass): void {
  const { templateImage, productImage, modelImage, anchorImage } = body;

  switch (shotClass) {
    case "worn_detail": {
      // ── Worn-detail: product FIRST (garment authority), template SECOND (scene) ──
      if (productImage?.base64 && productImage?.mimeType) {
        parts.push({
          inlineData: { mimeType: productImage.mimeType, data: productImage.base64 },
        });
        parts.push({
          text: "This is the product reference. It is the ONLY source for garment colour, material, texture, sheen, and construction. Generate this exact garment.",
        });
      }

      parts.push({
        inlineData: { mimeType: templateImage.mimeType, data: templateImage.base64 },
      });
      parts.push({
        text: "This image defines the base scene. Preserve its background, framing, crop, camera angle, and body orientation as closely as possible. The garment shown here is a DIFFERENT garment. IGNORE its colour, material, texture, and construction entirely.",
      });
      break;
    }

    case "flat_lay":
    case "macro": {
      // ── Flat-lay / macro: template is a surface reference, not a pose reference ──
      parts.push({
        inlineData: { mimeType: templateImage.mimeType, data: templateImage.base64 },
      });
      parts.push({
        text: "This image defines the surface. Reproduce this surface as closely as possible: same colour, same texture, same lighting. This is NOT a pose or body reference. Ignore any garment shown on this surface.",
      });

      if (productImage?.base64 && productImage?.mimeType) {
        parts.push({
          inlineData: { mimeType: productImage.mimeType, data: productImage.base64 },
        });
        parts.push({
          text: "This is the product reference. Place this garment on the surface. Match its colour, material, and texture exactly. Do not copy garment appearance from the surface reference.",
        });
      }
      break;
    }

    default: {
      // ── Body shots: template is the base scene to preserve ──
      parts.push({
        inlineData: { mimeType: templateImage.mimeType, data: templateImage.base64 },
      });
      parts.push({
        text: "This image defines the base scene. Preserve its background, lighting, framing, and body pose as closely as possible. The person in this image is a placeholder; replace their face, skin tone, hair, and garment according to the other reference images. Do not reinterpret the background. Do not synthesize a new studio setup.",
      });

      if (productImage?.base64 && productImage?.mimeType) {
        parts.push({
          inlineData: { mimeType: productImage.mimeType, data: productImage.base64 },
        });
        parts.push({
          text: "This is the product reference. It is the garment authority. Replace the garment in the base scene with this garment. Match its colour, material, texture, and construction exactly.",
        });
      }
      break;
    }
  }

  // Model reference image (identity authority only), if provided
  // Not applicable to flat_lay or macro shots
  if (modelImage?.base64 && modelImage?.mimeType && shotClass !== "flat_lay" && shotClass !== "macro") {
    parts.push({
      inlineData: { mimeType: modelImage.mimeType, data: modelImage.base64 },
    });
    parts.push({
      text: "This is the identity reference. The generated person MUST match this image's face, skin tone, hair colour, and hair style, even if they differ from the person in the base scene. Do NOT copy clothing, accessories, background, pose, or lighting from this image.",
    });
  }

  // ── Anchor shot: continuity hint only, never overrides template background ──
  // The anchor helps cross-shot face/hair consistency within a family.
  // The template image is the sole authority for background, lighting, and backdrop.
  if (anchorImage?.base64 && anchorImage?.mimeType && shotClass !== "flat_lay" && shotClass !== "macro") {
    parts.push({
      inlineData: { mimeType: anchorImage.mimeType, data: anchorImage.base64 },
    });

    if (shotClass === "worn_detail") {
      parts.push({
        text: "This is a previously generated shot from this family. Use it ONLY as a continuity hint for face, skin tone, and hair across this family's shots. The template image is the sole authority for background, lighting temperature, and backdrop identity. The anchor must not override the template background under any circumstances.",
      });
    } else {
      parts.push({
        text: "This is a previously generated shot from this family. Use it ONLY for face and hair continuity. Do NOT copy background, lighting, colour temperature, or brightness from this image. The template image is the sole authority for the background.",
      });
    }
  }
}

// ── Edit-Base Mode (experiment: template as canvas to edit) ──

function buildEditBaseParts(parts: GeminiPart[], body: GenerateRequest): void {
  const { templateImage, productImage, modelImage } = body;

  // Image 1: the template as the base canvas
  parts.push({
    inlineData: {
      mimeType: templateImage.mimeType,
      data: templateImage.base64,
    },
  });
  parts.push({
    text: "This is image 1, the base image. Edit this image. Keep the background, pose, framing, lighting, body geometry, camera angle, and shoes identical to this image. Change ONLY the garment.",
  });

  // Image 2: product reference (garment to swap in)
  if (productImage?.base64 && productImage?.mimeType) {
    parts.push({
      inlineData: {
        mimeType: productImage.mimeType,
        data: productImage.base64,
      },
    });
    parts.push({
      text: "This is image 2, the product reference. Replace the garment in image 1 with this garment. Match its colour, material, texture, and construction exactly.",
    });
  }

  // Image 3: model reference (identity only, if needed)
  if (modelImage?.base64 && modelImage?.mimeType) {
    parts.push({
      inlineData: {
        mimeType: modelImage.mimeType,
        data: modelImage.base64,
      },
    });
    parts.push({
      text: "This is image 3, the model identity reference. Use ONLY for face, skin tone, hair colour, and hair style. Keep the body pose, background, and everything else from image 1 unchanged.",
    });
  }

  // No anchor in edit-base mode. The template IS the base, so cross-shot
  // consistency comes from using the same template, not from anchor matching.
}
