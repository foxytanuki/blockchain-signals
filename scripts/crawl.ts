import FireCrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import dotenv from "dotenv";
import ora from "ora";

dotenv.config();

const app = new FireCrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const schema = z.object({
  project: z.object({
    name: z.string(),
    official_website: z.string(),
    rss_feed_url: z.string().optional(),
    newsletter_url: z.string().optional(),
    twitter: z.string(),
    discord_invite_link: z.string(),
    telegram: z.string().optional(),
    github: z.string(),
    grants: z.string().optional(),
    docs: z.string().optional(),
    youtube: z.string().optional(),
    reddit: z.string().optional(),
    other_links: z.array(z.string()).optional(),
    notes: z.string(),
  }),
});

const URLS = ["https://solana.com"];
const PROMPT =
  "Extract information about projects including their name, official website, RSS feed URL, newsletter URL, Twitter handle, Discord invite link, Telegram link, GitHub repository, Grants, Docs, Youtube link, Reddit link, other links, and any additional notes.";

async function main() {
  let timer: NodeJS.Timeout;

  // Add signal handlers for cleanup
  process.on("SIGINT", () => {
    clearInterval(timer);
    spinner.stop();
    console.log("\nCrawler stopped by user");
    process.exit(0);
  });

  console.log("\n🔍 Starting crawler for the following URLs:");
  console.log(URLS.map((url) => `  • ${url}`).join("\n"), "\n");

  const spinner = ora("Extracting data...").start();
  const startTime = Date.now();

  // Update spinner text with elapsed time every second
  timer = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    spinner.text = `Extracting data... (${elapsedSeconds}s elapsed)`;
  }, 1000);

  try {
    const extractResult = await app.extract(URLS, {
      prompt: PROMPT,
      schema,
      enableWebSearch: true,
    });
    clearInterval(timer);
    spinner.succeed(
      `Extraction completed in ${Math.floor((Date.now() - startTime) / 1000)}s`
    );
    console.log(extractResult);
  } catch (error) {
    clearInterval(timer);
    spinner.fail("Extraction failed");
    throw error;
  }
}

main()
  .catch(console.error)
  .then(() => {
    console.log("Done");
  });
