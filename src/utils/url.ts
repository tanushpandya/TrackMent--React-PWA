/**
 * Validates and normalizes an external resource URL.
 * Strictly allows only http: and https: schemes to prevent Stored XSS
 * via javascript:, data:, or vbscript: URIs.
 */
export function sanitizeExternalUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

export function sanitizeExternalUrlList(links?: string[] | null): string[] {
  if (!Array.isArray(links)) return [];
  const safe: string[] = [];
  for (const item of links) {
    const clean = sanitizeExternalUrl(item);
    if (clean) safe.push(clean);
  }
  return safe;
}
