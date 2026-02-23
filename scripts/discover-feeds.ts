import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseOpml } from "./parse-opml.js";
import { verifyFeed } from "./feed-utils.js";
import {
  PROTOCOLS,
  resolveAllFeeds,
  findUnresolvedSources,
  type ResolvedFeed,
  type SourceType,
} from "./protocols.js";
import { generateOpml } from "./generate-opml.js";

const BRAVE_API = "https://api.search.brave.com/res/v1/web/search";
const CONCURRENCY = 5;

// ── Brave Search ──

async function braveSearch(
  query: string,
  apiKey: string
): Promise<{ title: string; url: string }[]> {
  try {
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
  } catch (e) {
    console.error(`Brave Search failed for "${query}": ${e}`);
    return [];
  }
}

// ── Phase 1: Registry Resolution ──

interface VerifiedFeed extends ResolvedFeed {
  verified?: boolean;
  error?: string;
}

async function resolveRegistry(
  doVerify: boolean
): Promise<{ feeds: VerifiedFeed[]; failed: VerifiedFeed[] }> {
  const resolved = resolveAllFeeds(PROTOCOLS);
  const feeds: VerifiedFeed[] = resolved.map((f) => ({ ...f }));

  if (!doVerify) {
    return { feeds, failed: [] };
  }

  console.error(`Verifying ${feeds.length} registry feeds...`);
  const failed: VerifiedFeed[] = [];

  // Verify in batches
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    const batch = feeds.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (feed) => {
        const result = await verifyFeed(feed.xmlUrl);
        feed.verified = result.ok;
        if (!result.ok) {
          feed.error = result.error;
          failed.push(feed);
        }
      })
    );
  }

  return { feeds, failed };
}

// ── Phase 2: Brave Search補完 ──

interface BraveCandidate {
  protocol: string;
  sourceType: SourceType;
  url: string;
  feedTitle: string | null;
  query: string;
}

async function braveSearchComplement(
  apiKey: string
): Promise<BraveCandidate[]> {
  const unresolved = findUnresolvedSources(PROTOCOLS);
  const candidates: BraveCandidate[] = [];

  // Protocol-specific queries for unresolved sources
  for (const { protocol, source } of unresolved) {
    const query = `"${protocol.name}" official ${source.type} RSS feed`;
    console.error(`Searching: "${query}"...`);

    const results = await braveSearch(query, apiKey);

    for (const r of results) {
      // Try to extract feed-like URLs
      const feedPatterns = [
        r.url,
        r.url.replace(/\/?$/, "/feed"),
        r.url.replace(/\/?$/, "/rss"),
        r.url.replace(/\/?$/, "/feed.xml"),
        r.url.replace(/\/?$/, "/rss.xml"),
      ];

      for (const url of feedPatterns) {
        const result = await verifyFeed(url, 8_000);
        if (result.ok) {
          candidates.push({
            protocol: protocol.name,
            sourceType: source.type,
            url,
            feedTitle: result.title,
            query,
          });
          break; // one per search result
        }
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  // New protocol discovery
  const discoveryQueries = [
    "new blockchain protocol launch 2026 blog RSS",
    "new DeFi protocol blog RSS feed",
  ];

  for (const query of discoveryQueries) {
    console.error(`Searching: "${query}"...`);
    const results = await braveSearch(query, apiKey);

    for (const r of results) {
      const result = await verifyFeed(r.url, 8_000);
      if (result.ok) {
        candidates.push({
          protocol: "Unknown",
          sourceType: "blog",
          url: r.url,
          feedTitle: result.title,
          query,
        });
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return candidates;
}

// ── Diff with existing OPML ──

interface DiffResult {
  added: ResolvedFeed[];
  removed: { name: string; xmlUrl: string }[];
  unchanged: number;
}

function diffWithExisting(newFeeds: ResolvedFeed[]): DiffResult {
  let existingFeeds: { name: string; xmlUrl: string }[];
  try {
    existingFeeds = parseOpml().map((f) => ({
      name: f.name,
      xmlUrl: f.xmlUrl,
    }));
  } catch {
    return { added: newFeeds, removed: [], unchanged: 0 };
  }

  const existingUrls = new Set(
    existingFeeds.map((f) => f.xmlUrl.toLowerCase().replace(/\/+$/, ""))
  );
  const newUrls = new Set(
    newFeeds.map((f) => f.xmlUrl.toLowerCase().replace(/\/+$/, ""))
  );

  const added = newFeeds.filter(
    (f) => !existingUrls.has(f.xmlUrl.toLowerCase().replace(/\/+$/, ""))
  );
  const removed = existingFeeds.filter(
    (f) => !newUrls.has(f.xmlUrl.toLowerCase().replace(/\/+$/, ""))
  );
  const unchanged = newFeeds.length - added.length;

  return { added, removed, unchanged };
}

// ── Report ──

function formatReport(
  feeds: VerifiedFeed[],
  failed: VerifiedFeed[],
  diff: DiffResult,
  braveCandidates: BraveCandidate[],
  doVerify: boolean
): string {
  const lines: string[] = [];
  lines.push("# Feed Discovery Report");
  lines.push("");
  lines.push(`**Date**: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Registry feeds**: ${feeds.length}`);
  lines.push("");

  // Diff summary
  lines.push("## Registry vs Current OPML");
  lines.push("");
  lines.push(`- Unchanged: ${diff.unchanged}`);
  lines.push(`- New (to be added): ${diff.added.length}`);
  lines.push(`- Removed (no longer in registry): ${diff.removed.length}`);
  lines.push("");

  if (diff.added.length > 0) {
    lines.push("### New Feeds");
    lines.push("");
    lines.push("| # | Feed | URL |");
    lines.push("|---|------|-----|");
    diff.added.forEach((f, i) => {
      lines.push(`| ${i + 1} | ${f.label} | ${f.xmlUrl} |`);
    });
    lines.push("");
  }

  if (diff.removed.length > 0) {
    lines.push("### Removed Feeds");
    lines.push("");
    lines.push("| # | Feed | URL |");
    lines.push("|---|------|-----|");
    diff.removed.forEach((f, i) => {
      lines.push(`| ${i + 1} | ${f.name} | ${f.xmlUrl} |`);
    });
    lines.push("");
  }

  // Verification failures
  if (doVerify && failed.length > 0) {
    lines.push("## Verification Failures");
    lines.push("");
    lines.push("| Feed | URL | Error |");
    lines.push("|------|-----|-------|");
    for (const f of failed) {
      lines.push(`| ${f.label} | ${f.xmlUrl} | ${f.error ?? "unknown"} |`);
    }
    lines.push("");
  }

  // Brave Search candidates
  if (braveCandidates.length > 0) {
    lines.push("## Brave Search Candidates (manual review)");
    lines.push("");
    lines.push("| # | Protocol | Type | URL | Title | Found via |");
    lines.push("|---|----------|------|-----|-------|-----------|");
    braveCandidates.forEach((c, i) => {
      lines.push(
        `| ${i + 1} | ${c.protocol} | ${c.sourceType} | ${c.url} | ${c.feedTitle ?? "-"} | ${c.query} |`
      );
    });
    lines.push("");
  }

  return lines.join("\n");
}

// ── Main ──

async function main() {
  const args = new Set(process.argv.slice(2));
  const doVerify = args.has("--verify");
  const doWrite = args.has("--write");

  // Phase 1: Registry resolution
  const { feeds, failed } = await resolveRegistry(doVerify);
  console.error(
    `Registry: ${feeds.length} feeds resolved${doVerify ? `, ${failed.length} failed verification` : ""}`
  );

  // Diff with existing OPML
  const resolvedFeeds = resolveAllFeeds(PROTOCOLS);
  const diff = diffWithExisting(resolvedFeeds);

  // Phase 2: Brave Search (optional)
  let braveCandidates: BraveCandidate[] = [];
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (apiKey) {
    braveCandidates = await braveSearchComplement(apiKey);
    console.error(
      `Brave Search: ${braveCandidates.length} candidates found`
    );
  } else {
    console.error(
      "BRAVE_SEARCH_API_KEY not set, skipping Brave Search complement"
    );
  }

  // Report
  const report = formatReport(feeds, failed, diff, braveCandidates, doVerify);
  console.log(report);

  // Write OPML (registry-confirmed feeds only, not Brave candidates)
  if (doWrite) {
    // If --verify was used, exclude feeds that failed verification
    const failedUrls = new Set(failed.map((f) => f.xmlUrl));
    const writeFeeds = doVerify
      ? resolvedFeeds.filter((f) => !failedUrls.has(f.xmlUrl))
      : resolvedFeeds;
    const opml = generateOpml(writeFeeds);
    const outPath = resolve(process.cwd(), "feeds.opml");
    writeFileSync(outPath, opml);
    console.error(`Written: ${outPath} (${writeFeeds.length} feeds)`);
  }
}

main();
