import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const jsonPath = process.argv[2] ?? "/tmp/dead-feeds.json";
const opmlPath = resolve(process.cwd(), "feeds.opml");

const deadUrls: string[] = JSON.parse(readFileSync(jsonPath, "utf-8"));

if (deadUrls.length === 0) {
  console.log("No dead feeds to remove.");
  process.exit(0);
}

const lines = readFileSync(opmlPath, "utf-8").split("\n");
const removed: string[] = [];

const filtered = lines.filter((line) => {
  for (const url of deadUrls) {
    if (line.includes(`xmlUrl="${url}"`)) {
      const nameMatch = line.match(/text="([^"]*)"/);
      removed.push(nameMatch ? nameMatch[1] : url);
      return false;
    }
  }
  return true;
});

writeFileSync(opmlPath, filtered.join("\n"));

for (const name of removed) {
  console.log(`Removed: ${name}`);
}
console.log(`\n${removed.length} feed(s) removed from feeds.opml`);
