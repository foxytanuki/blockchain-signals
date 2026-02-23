import { writeFileSync } from "node:fs";
import { parseOpml, type Feed } from "./parse-opml.js";
import {
  fetchWithTimeout,
  isRssOrAtom,
  extractLastPostDate,
} from "./feed-utils.js";

const TIMEOUT_MS = 15_000;
const CONCURRENCY = 5;
const STALE_THRESHOLD_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

type Status = "healthy" | "stale" | "invalid" | "dead";

interface FeedResult {
  feed: Feed;
  status: Status;
  httpStatus?: number;
  lastPost?: string;
  error?: string;
}

async function checkFeed(feed: Feed, attempt = 0): Promise<FeedResult> {
  try {
    const res = await fetchWithTimeout(feed.xmlUrl, TIMEOUT_MS);

    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 3000));
      return checkFeed(feed, 1);
    }

    if (!res.ok) {
      return {
        feed,
        status: "dead",
        httpStatus: res.status,
        error: `HTTP ${res.status}`,
      };
    }

    const body = await res.text();

    if (!isRssOrAtom(body)) {
      return { feed, status: "invalid", httpStatus: res.status };
    }

    const lastDate = extractLastPostDate(body);
    const now = Date.now();

    if (lastDate && now - lastDate.getTime() > STALE_THRESHOLD_MS) {
      return {
        feed,
        status: "stale",
        httpStatus: res.status,
        lastPost: lastDate.toISOString().split("T")[0],
      };
    }

    return {
      feed,
      status: "healthy",
      httpStatus: res.status,
      lastPost: lastDate ? lastDate.toISOString().split("T")[0] : undefined,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { feed, status: "dead", error: message };
  }
}

async function runPool(
  feeds: Feed[],
  concurrency: number
): Promise<FeedResult[]> {
  const results: FeedResult[] = [];
  const queue = [...feeds];

  async function worker() {
    while (queue.length > 0) {
      const feed = queue.shift()!;
      results.push(await checkFeed(feed));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, feeds.length) }, () => worker())
  );
  return results;
}

function formatReport(results: FeedResult[]): string {
  const grouped: Record<Status, FeedResult[]> = {
    dead: [],
    invalid: [],
    stale: [],
    healthy: [],
  };

  for (const r of results) {
    grouped[r.status].push(r);
  }

  const lines: string[] = [];
  lines.push("# Feed Health Check Report");
  lines.push("");
  lines.push(`**Date**: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Total feeds**: ${results.length}`);
  lines.push("");

  lines.push("| Status | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Healthy | ${grouped.healthy.length} |`);
  lines.push(`| Stale | ${grouped.stale.length} |`);
  lines.push(`| Invalid | ${grouped.invalid.length} |`);
  lines.push(`| Dead | ${grouped.dead.length} |`);
  lines.push("");

  if (grouped.dead.length > 0) {
    lines.push("## Dead Feeds");
    lines.push("");
    lines.push("| Feed | Category | Error |");
    lines.push("|------|----------|-------|");
    for (const r of grouped.dead) {
      lines.push(`| ${r.feed.name} | ${r.feed.category} | ${r.error} |`);
    }
    lines.push("");
  }

  if (grouped.invalid.length > 0) {
    lines.push("## Invalid Feeds (not RSS/Atom)");
    lines.push("");
    lines.push("| Feed | Category | HTTP Status |");
    lines.push("|------|----------|-------------|");
    for (const r of grouped.invalid) {
      lines.push(
        `| ${r.feed.name} | ${r.feed.category} | ${r.httpStatus ?? "-"} |`
      );
    }
    lines.push("");
  }

  if (grouped.stale.length > 0) {
    lines.push("## Stale Feeds (>6 months)");
    lines.push("");
    lines.push("| Feed | Category | Last Post |");
    lines.push("|------|----------|-----------|");
    for (const r of grouped.stale) {
      lines.push(
        `| ${r.feed.name} | ${r.feed.category} | ${r.lastPost ?? "unknown"} |`
      );
    }
    lines.push("");
  }

  if (grouped.healthy.length > 0) {
    lines.push("## Healthy Feeds");
    lines.push("");
    lines.push("| Feed | Category | Last Post |");
    lines.push("|------|----------|-----------|");
    for (const r of grouped.healthy) {
      lines.push(
        `| ${r.feed.name} | ${r.feed.category} | ${r.lastPost ?? "date unknown"} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const feeds = parseOpml();
  console.error(`Checking ${feeds.length} feeds...`);
  const results = await runPool(feeds, CONCURRENCY);
  console.log(formatReport(results));

  // Write dead feed URLs to JSON for automation
  const deadUrls = results
    .filter((r) => r.status === "dead")
    .map((r) => r.feed.xmlUrl);
  const outPath = process.env.DEAD_FEEDS_JSON ?? "/tmp/dead-feeds.json";
  writeFileSync(outPath, JSON.stringify(deadUrls, null, 2));
  console.error(`Dead feeds written to ${outPath}`);
}

main();
