import FireCrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import dotenv from "dotenv";
import cliSpinners from "cli-spinners";
import ansiEscapes from "ansi-escapes";

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

const URLS = [
  "https://solana.com",
  "https://www.near.org",
  "https://www.avax.network",
  // "https://www.polygon.technology",
  // "https://www.avalanche.com",
  // "https://www.polkadot.network",
  // "https://www.cosmos.network",
  // "https://www.stellar.org",
  // "https://www.tezos.com",
];
const PROMPT =
  "Extract information about projects including their name, official website, RSS feed URL, newsletter URL, Twitter handle, Discord invite link, Telegram link, GitHub repository, Grants, Docs, Youtube link, Reddit link, other links, and any additional notes.";

class MultiSpinner {
  private frames: string[];
  private interval: number;
  private currentFrame: number;
  private timer: NodeJS.Timeout | null;
  private states: Map<
    string,
    { status: "spinning" | "success" | "error"; message: string }
  >;
  private urls: string[];

  constructor(urls: string[]) {
    this.frames = cliSpinners.dots.frames;
    this.interval = cliSpinners.dots.interval;
    this.currentFrame = 0;
    this.timer = null;
    this.states = new Map();
    this.urls = urls;

    urls.forEach((url) => {
      this.states.set(url, {
        status: "spinning",
        message: `Extracting data from ${url}...`,
      });
    });
  }

  start() {
    if (this.timer) return;

    // Clear lines for all spinners
    process.stdout.write(ansiEscapes.cursorHide);
    this.urls.forEach(() => {
      console.log();
    });
    process.stdout.write(ansiEscapes.cursorUp(this.urls.length));

    this.timer = setInterval(() => {
      this.render();
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      process.stdout.write(ansiEscapes.cursorShow);
    }
  }

  succeed(url: string, message: string) {
    this.states.set(url, { status: "success", message });
    this.render();
  }

  fail(url: string, message: string) {
    this.states.set(url, { status: "error", message });
    this.render();
  }

  private render() {
    this.urls.forEach((url) => {
      const state = this.states.get(url)!;
      let symbol: string;

      switch (state.status) {
        case "spinning":
          symbol = this.frames[this.currentFrame];
          break;
        case "success":
          symbol = "✓";
          break;
        case "error":
          symbol = "✗";
          break;
      }

      process.stdout.write(`${symbol} ${state.message}\n`);
    });
    process.stdout.write(ansiEscapes.cursorUp(this.urls.length));
  }
}

async function processUrl(url: string, spinner: MultiSpinner) {
  const startTime = Date.now();

  try {
    const extractResult = await app.extract([url], {
      prompt: PROMPT,
      schema,
      enableWebSearch: true,
    });
    spinner.succeed(
      url,
      `Extraction completed for ${url} in ${Math.floor(
        (Date.now() - startTime) / 1000
      )}s`
    );
    return extractResult;
  } catch (error) {
    spinner.fail(url, `Extraction failed for ${url}`);
    throw error;
  }
}

async function main() {
  // Add signal handlers for cleanup
  process.on("SIGINT", () => {
    console.log("\nCrawler stopped by user");
    process.exit(0);
  });

  console.log("\n🔍 Starting crawler for the following URLs:");
  console.log(URLS.map((url) => `  • ${url}`).join("\n"), "\n");

  const spinner = new MultiSpinner(URLS);
  spinner.start();

  try {
    const results = await Promise.all(
      URLS.map((url) => processUrl(url, spinner))
    );

    spinner.stop();
    console.log("\n"); // Add some spacing after spinners

    console.log("\n📊 Results:");
    results.forEach((result, index) => {
      console.log(`\nResults for ${URLS[index]}:`);
      console.log(result);
    });
  } catch (error) {
    spinner.stop();
    console.error("\nOne or more extractions failed:", error);
    throw error;
  }
}

main()
  .catch(console.error)
  .then(() => {
    console.log("Done");
  });
