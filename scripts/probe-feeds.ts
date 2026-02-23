import { fetchWithTimeout, isRssOrAtom, extractFeedTitle } from "./feed-utils.js";

const COMMON_FEED_PATHS = [
  "/feed",
  "/feed.xml",
  "/rss",
  "/rss.xml",
  "/atom.xml",
  "/blog/rss",
  "/blog/feed",
  "/blog/rss.xml",
  "/blog/feed.xml",
  "/blog/atom.xml",
  "/index.xml",
  "/blog/index.xml",
];

export interface ProbeResult {
  homepage: string;
  feedUrl: string | null;
  feedTitle: string | null;
  method: "link-tag" | "common-path" | null;
}

/**
 * HTMLから<link rel="alternate" type="application/rss+xml">を抽出
 */
function extractRssLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const pattern =
    /<link\s[^>]*type=["']application\/(rss|atom)\+xml["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const hrefMatch = match[0].match(/href=["']([^"']+)["']/);
    if (hrefMatch) {
      try {
        const url = new URL(hrefMatch[1], baseUrl).toString();
        links.push(url);
      } catch {
        // ignore invalid URLs
      }
    }
  }
  return links;
}

/**
 * homepage URLからRSSフィードを自動検出
 */
export async function probeFeed(homepage: string): Promise<ProbeResult> {
  const base = homepage.replace(/\/+$/, "");
  const result: ProbeResult = {
    homepage,
    feedUrl: null,
    feedTitle: null,
    method: null,
  };

  // Phase 1: HTMLからlink tagを探す
  try {
    const res = await fetchWithTimeout(base, 10_000);
    if (res.ok) {
      const html = await res.text();
      const rssLinks = extractRssLinks(html, base);

      for (const link of rssLinks) {
        try {
          const feedRes = await fetchWithTimeout(link, 10_000);
          if (feedRes.ok) {
            const body = await feedRes.text();
            if (isRssOrAtom(body)) {
              result.feedUrl = link;
              result.feedTitle = extractFeedTitle(body);
              result.method = "link-tag";
              return result;
            }
          }
        } catch {
          // try next link
        }
      }
    }
  } catch {
    // homepage fetch failed, try common paths
  }

  // Phase 2: 既知パスをprobe
  for (const path of COMMON_FEED_PATHS) {
    const url = `${base}${path}`;
    try {
      const res = await fetchWithTimeout(url, 8_000);
      if (res.ok) {
        const body = await res.text();
        if (isRssOrAtom(body)) {
          result.feedUrl = url;
          result.feedTitle = extractFeedTitle(body);
          result.method = "common-path";
          return result;
        }
      }
    } catch {
      // try next path
    }
  }

  return result;
}

// CLI
if (import.meta.main) {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error("Usage: bun scripts/probe-feeds.ts <homepage-url> [...]");
    process.exit(1);
  }

  for (const url of urls) {
    console.error(`Probing: ${url}`);
    const result = await probeFeed(url);
    if (result.feedUrl) {
      console.log(
        `  Found: ${result.feedUrl} (${result.method}, title: ${result.feedTitle ?? "unknown"})`
      );
    } else {
      console.log("  No feed found");
    }
  }
}
