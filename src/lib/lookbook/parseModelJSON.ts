/**
 * Shared JSON parser for AI model responses.
 *
 * Handles common model quirks: markdown fencing, trailing commas,
 * and prose wrapping around JSON objects.
 */
export function parseModelJSON(text: string): unknown {
  let cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(cleaned);
}
