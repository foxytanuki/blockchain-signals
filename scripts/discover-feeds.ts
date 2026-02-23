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
  reachable: boolean | null;
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
  // Keep URLs that look like RSS/Atom feeds
  if (/\.(xml|atom|rss)$/i.test(url)) return url;
  if (/\/(feed|rss|atom)(\/|$)/i.test(url)) return url;
  if (/\/latest\.rss$/i.test(url)) return url;
  return null;
}

async function verifyFeed(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "blockchain-signals-discovery/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return false;
    const body = await res.text();
    return /<rss[\s>]/.test(body) || /<feed[\s>]/.test(body);
  } catch {
    return false;
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
  const existingDomains = new Set(
    feeds.map((f) => {
      try {
        return new URL(f.xmlUrl).hostname;
      } catch {
        return "";
      }
    })
  );

  const candidateMap = new Map<string, Candidate>();

  for (const query of SEARCH_QUERIES) {
    console.error(`Searching: "${query}"...`);
    const results = await braveSearch(query, apiKey);

    for (const r of results) {
      // Try the URL directly as a feed, or common feed paths
      const urls = [r.url];
      const feedUrl = extractFeedUrl(r.url);
      if (feedUrl) urls.unshift(feedUrl);

      // Also try common feed paths for the domain
      try {
        const base = new URL(r.url).origin;
        urls.push(`${base}/feed`, `${base}/rss`, `${base}/feed.xml`, `${base}/rss.xml`, `${base}/atom.xml`);
      } catch {
        // ignore invalid URLs
      }

      for (const url of urls) {
        const normalized = url.toLowerCase().replace(/\/+$/, "");
        if (existingUrls.has(normalized)) continue;

        // Skip if we already have a feed from this domain
        try {
          const hostname = new URL(url).hostname;
          if (existingDomains.has(hostname)) continue;
        } catch {
          continue;
        }

        if (!candidateMap.has(normalized)) {
          candidateMap.set(normalized, {
            title: r.title,
            url,
            query,
            reachable: null,
          });
        }
      }
    }

    // Rate limit between searches
    await new Promise((r) => setTimeout(r, 1000));
  }

  const candidates = [...candidateMap.values()];
  console.error(`Verifying ${candidates.length} candidate URLs...`);

  // Verify in batches of 5
  const verified: Candidate[] = [];
  for (let i = 0; i < candidates.length; i += 5) {
    const batch = candidates.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (c) => {
        c.reachable = await verifyFeed(c.url);
        return c;
      })
    );
    verified.push(...results);
  }

  const confirmedFeeds = verified.filter((c) => c.reachable);
  const unverified = verified.filter((c) => !c.reachable);

  // Output report
  const lines: string[] = [];
  lines.push("# Feed Discovery Report");
  lines.push("");
  lines.push(`**Date**: ${new Date().toISOString().split("T")[0]}`);
  lines.push(
    `**Candidates found**: ${candidates.length} | **Verified feeds**: ${confirmedFeeds.length}`
  );
  lines.push("");

  if (confirmedFeeds.length > 0) {
    lines.push("## Verified Feeds");
    lines.push("");
    lines.push("| # | Title | Feed URL | Found via |");
    lines.push("|---|-------|----------|-----------|");
    confirmedFeeds.forEach((c, i) => {
      lines.push(`| ${i + 1} | ${c.title} | ${c.url} | ${c.query} |`);
    });
    lines.push("");
  }

  if (unverified.length > 0) {
    lines.push("<details>");
    lines.push("<summary>Unverified candidates (" + unverified.length + ")</summary>");
    lines.push("");
    lines.push("| Title | URL | Found via |");
    lines.push("|-------|-----|-----------|");
    for (const c of unverified) {
      lines.push(`| ${c.title} | ${c.url} | ${c.query} |`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  console.log(lines.join("\n"));
}

main();
