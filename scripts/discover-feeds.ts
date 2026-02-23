import { parseOpml } from "./parse-opml.js";

const BRAVE_API = "https://api.search.brave.com/res/v1/web/search";
const VERIFY_TIMEOUT_MS = 10_000;

const SEARCH_QUERIES = [
  "blockchain protocol blog RSS feed",
  "crypto security research RSS atom feed",
  "ethereum L2 rollup blog RSS feed",
  "web3 developer tooling blog RSS feed",
  "DeFi protocol engineering blog RSS",
];

interface Candidate {
  title: string;
  url: string;
  query: string;
  feedTitle: string | null;
}

async function braveSearch(
  query: string,
  apiKey: string
): Promise<{ title: string; url: string }[]> {
  const params = new URLSearchParams({ q: query, count: "20" });
  const res = await fetch(`${BRAVE_API}?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) {
    console.error(`Brave Search error for "${query}": HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as {
    web?: { results?: { title: string; url: string }[] };
  };
  return data.web?.results ?? [];
}

function extractFeedUrl(url: string): string | null {
  if (/\.(xml|atom|rss)$/i.test(url)) return url;
  if (/\/(feed|rss|atom)(\/|$)/i.test(url)) return url;
  if (/\/latest\.rss$/i.test(url)) return url;
  return null;
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function verifyAndExtractTitle(
  url: string
): Promise<{ ok: boolean; title: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "blockchain-signals-discovery/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, title: null };
    const body = await res.text();
    const isValid = /<rss[\s>]/.test(body) || /<feed[\s>]/.test(body);
    if (!isValid) return { ok: false, title: null };

    // Extract feed title
    const titleMatch = body.match(/<title>([^<]+)<\/title>/);
    return { ok: true, title: titleMatch ? titleMatch[1].trim() : null };
  } catch {
    return { ok: false, title: null };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.error("BRAVE_SEARCH_API_KEY is required");
    process.exit(1);
  }

  const feeds = parseOpml();
  const existingUrls = new Set(
    feeds.map((f) => f.xmlUrl.toLowerCase().replace(/\/+$/, ""))
  );
  const seenDomains = new Set(
    feeds.map((f) => getHostname(f.xmlUrl)).filter(Boolean) as string[]
  );

  // Collect candidate URLs, dedup by domain (keep first seen)
  const candidateMap = new Map<string, Candidate>();

  for (const query of SEARCH_QUERIES) {
    console.error(`Searching: "${query}"...`);
    const results = await braveSearch(query, apiKey);

    for (const r of results) {
      const urls: string[] = [];

      const feedUrl = extractFeedUrl(r.url);
      if (feedUrl) urls.push(feedUrl);

      // Try common feed paths
      try {
        const base = new URL(r.url).origin;
        urls.push(
          `${base}/feed`,
          `${base}/rss`,
          `${base}/feed.xml`,
          `${base}/rss.xml`,
          `${base}/atom.xml`
        );
      } catch {
        // ignore
      }

      for (const url of urls) {
        const hostname = getHostname(url);
        if (!hostname) continue;
        if (seenDomains.has(hostname)) continue;

        const normalized = url.toLowerCase().replace(/\/+$/, "");
        if (existingUrls.has(normalized)) continue;

        // First candidate for this domain wins
        seenDomains.add(hostname);
        candidateMap.set(normalized, {
          title: r.title,
          url,
          query,
          feedTitle: null,
        });
        break; // one per domain per search result
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  const candidates = [...candidateMap.values()];
  console.error(`Verifying ${candidates.length} candidate URLs...`);

  // Verify in batches of 5, extract feed title
  const confirmed: Candidate[] = [];
  for (let i = 0; i < candidates.length; i += 5) {
    const batch = candidates.slice(i, i + 5);
    await Promise.all(
      batch.map(async (c) => {
        const result = await verifyAndExtractTitle(c.url);
        if (result.ok) {
          c.feedTitle = result.title;
          confirmed.push(c);
        }
      })
    );
  }

  // Output report
  const lines: string[] = [];
  lines.push("# Feed Discovery Report");
  lines.push("");
  lines.push(`**Date**: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Verified feeds**: ${confirmed.length}`);
  lines.push("");

  if (confirmed.length > 0) {
    lines.push("| # | Feed | URL | Found via |");
    lines.push("|---|------|-----|-----------|");
    confirmed.forEach((c, i) => {
      const name = c.feedTitle ?? c.title;
      lines.push(`| ${i + 1} | ${name} | ${c.url} | ${c.query} |`);
    });
  } else {
    lines.push("No new feeds found this week.");
  }

  lines.push("");
  console.log(lines.join("\n"));
}

main();
