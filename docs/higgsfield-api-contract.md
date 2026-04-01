# Commerce Generation API Contract

*Last verified: 2026-03-30*

## Status: FULLY VERIFIED

## Provider

Google Gemini API (direct), using the `nano-banana-pro-preview` model. Replaced Higgsfield API due to credit cost.

## Authentication

- **Method:** API key as query parameter (`?key=API_KEY`)
- **Env var:** `GEMINI_API_KEY` (already in `.env.local`)

## Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key={API_KEY}
```

## Request Format

```json
{
  "contents": [{
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "<base64-encoded-image>"
        }
      },
      {
        "text": "prompt text describing what to generate"
      }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]
  }
}
```

### Input variations

- **Text-only:** single text part in parts array
- **Image-conditioned:** one or more `inlineData` parts + text part
- **Multi-image:** multiple `inlineData` parts interleaved with text labels + final generation prompt

### Verified capabilities

| Capability | Status | Notes |
|-----------|--------|-------|
| Text-to-image | Confirmed | 442KB output |
| Image-conditioned (1 ref) | Confirmed | 464KB output |
| Multi-image (2+ refs) | Confirmed | 593KB output |

## Response Format

```json
{
  "candidates": [{
    "content": {
      "parts": [
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": "<base64-encoded-result>"
          }
        }
      ]
    }
  }]
}
```

The generated image is returned as base64 inline data in `candidates[0].content.parts[].inlineData`. Parts may include text alongside images.

## Image Authority Model

For commerce generation, parts are structured as:
1. **Template reference image** (inlineData) + label: composition authority (pose, framing, background)
2. **Product reference image** (inlineData) + label: garment authority (what to swap)
3. **Model reference image** (inlineData, optional) + label: identity authority (face, body)
4. **Generation prompt** (text): ties references together with specific instructions

## No Upload Step Required

Unlike Higgsfield, Gemini accepts images inline as base64. No separate file upload step needed. Images are sent directly in the request body.

## Known Limitations

- Images are sent as base64 in the request body, which increases payload size
- No polling needed: response is synchronous (may take 10-30 seconds)
- Model name may change in future API versions (`nano-banana-pro-preview` is current)
- NSFW content may be blocked by Gemini safety filters

## Alternative Models

If `nano-banana-pro-preview` is unavailable or rate-limited:
- `gemini-3.1-flash-image-preview` (faster, slightly lower quality)
- `gemini-3-pro-image-preview` (higher quality, slower)
