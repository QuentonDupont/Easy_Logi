/**
 * Extract a single JSON object from a model's text response. Agents are told to return JSON only,
 * but we defensively strip markdown fences and surrounding prose before parsing — never by raw
 * string matching on escapes (model JSON escaping varies), always via JSON.parse.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // 1. Straight parse.
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  // 2. Strip a ```json ... ``` or ``` ... ``` fence.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence && fence[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // fall through
    }
  }

  // 3. Last resort: the substring from the first { to the last }.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {
      // fall through
    }
  }

  throw new SyntaxError("No parseable JSON object found in model output");
}
