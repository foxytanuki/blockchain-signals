const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "blockchain-signals/2.0" },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

export function isRssOrAtom(body: string): boolean {
  return /<rss[\s>]/.test(body) || /<feed[\s>]/.test(body);
}

export function extractLastPostDate(body: string): Date | null {
  // RSS <pubDate>
  const pubDateMatch = body.match(/<pubDate>([^<]+)<\/pubDate>/);
  if (pubDateMatch) {
    const d = new Date(pubDateMatch[1]);
    if (!isNaN(d.getTime())) return d;
  }

  // Atom <updated>
  const updatedMatch = body.match(/<updated>([^<]+)<\/updated>/);
  if (updatedMatch) {
    const d = new Date(updatedMatch[1]);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function extractFeedTitle(body: string): string | null {
  const titleMatch = body.match(/<title>([^<]+)<\/title>/);
  return titleMatch ? titleMatch[1].trim() : null;
}

export interface VerifyResult {
  ok: boolean;
  title: string | null;
  lastPost: Date | null;
  httpStatus?: number;
  error?: string;
}

export async function verifyFeed(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<VerifyResult> {
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (!res.ok) {
      return {
        ok: false,
        title: null,
        lastPost: null,
        httpStatus: res.status,
        error: `HTTP ${res.status}`,
      };
    }
    const body = await res.text();
    if (!isRssOrAtom(body)) {
      return {
        ok: false,
        title: null,
        lastPost: null,
        httpStatus: res.status,
        error: "Not RSS/Atom",
      };
    }
    return {
      ok: true,
      title: extractFeedTitle(body),
      lastPost: extractLastPostDate(body),
      httpStatus: res.status,
    };
  } catch (e) {
    return {
      ok: false,
      title: null,
      lastPost: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
