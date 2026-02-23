import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface Feed {
  name: string;
  xmlUrl: string;
  htmlUrl: string;
  category: string;
}

export function parseOpml(filePath?: string): Feed[] {
  const opmlPath = filePath ?? resolve(process.cwd(), "feeds.opml");
  const content = readFileSync(opmlPath, "utf-8");

  const feeds: Feed[] = [];
  let currentCategory = "";

  for (const line of content.split("\n")) {
    // Feed outline (check first — has xmlUrl attribute)
    const feedMatch = line.match(
      /xmlUrl="([^"]*)"[^>]*htmlUrl="([^"]*)"/
    );
    if (feedMatch) {
      const nameMatch = line.match(/text="([^"]*)"/);
      feeds.push({
        name: nameMatch ? nameMatch[1] : feedMatch[1],
        xmlUrl: feedMatch[1],
        htmlUrl: feedMatch[2],
        category: currentCategory,
      });
      continue;
    }

    // Category outline (no xmlUrl, opens a group)
    const categoryMatch = line.match(
      /<outline\s[^>]*text="([^"]*)"/
    );
    if (categoryMatch) {
      currentCategory = categoryMatch[1];
    }
  }

  return feeds;
}
