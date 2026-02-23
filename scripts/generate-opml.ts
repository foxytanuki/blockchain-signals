import type { ResolvedFeed, SourceType } from "./protocols.js";

const CATEGORY_ORDER: SourceType[] = [
  "blog",
  "github",
  "forum",
  "governance",
  "security",
  "research",
];

const CATEGORY_LABELS: Record<SourceType, string> = {
  blog: "Blog",
  github: "Releases",
  forum: "Forum",
  governance: "Governance",
  security: "Security",
  research: "Research",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateOpml(feeds: ResolvedFeed[]): string {
  const grouped = new Map<SourceType, ResolvedFeed[]>();
  for (const feed of feeds) {
    const list = grouped.get(feed.sourceType) ?? [];
    list.push(feed);
    grouped.set(feed.sourceType, list);
  }

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<opml version="1.0">');
  lines.push("  <head>");
  lines.push("    <title>blockchain-signals</title>");
  lines.push("  </head>");
  lines.push("  <body>");

  for (const type of CATEGORY_ORDER) {
    const list = grouped.get(type);
    if (!list || list.length === 0) continue;

    const label = CATEGORY_LABELS[type];
    lines.push(`    <outline text="${label}" title="${label}">`);

    const sorted = [...list].sort((a, b) => a.label.localeCompare(b.label));
    for (const feed of sorted) {
      const text = escapeXml(feed.label);
      const xmlUrl = escapeXml(feed.xmlUrl);
      const htmlUrl = escapeXml(feed.htmlUrl);
      lines.push(
        `      <outline text="${text}" title="${text}" type="rss" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}"/>`
      );
    }

    lines.push("    </outline>");
  }

  lines.push("  </body>");
  lines.push("</opml>");
  lines.push("");

  return lines.join("\n");
}
