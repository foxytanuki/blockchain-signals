import FireCrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import dotenv from "dotenv";

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

async function main() {
  const extractResult = await app.extract(["https://solana.com"], {
    prompt:
      "Extract information about projects including their name, official website, RSS feed URL, newsletter URL, Twitter handle, Discord invite link, Telegram link, GitHub repository, Grants, Docs, Youtube link, Reddit link, other links, and any additional notes.",
    schema,
    enableWebSearch: true,
  });

  // {
  //   success: true,
  //   data: {
  //     project: {
  //       docs: 'https://solana.com/docs',
  //       name: 'Solana',
  //       notes: 'Solana is a high-performance blockchain supporting decentralized applications and crypto projects.',
  //       github: 'https://github.com/solana-labs/solana',
  //       grants: 'https://solana.org/grants',
  //       reddit: 'https://www.reddit.com/r/solana',
  //       twitter: 'https://twitter.com/solana',
  //       youtube: 'https://www.youtube.com/SolanaFndn',
  //       telegram: 'https://t.me/solana',
  //       other_links: [],
  //       rss_feed_url: '/news/rss',
  //       newsletter_url: 'https://solana.com/newsletter',
  //       official_website: 'https://solana.com/',
  //       discord_invite_link: 'https://discord.com/invite/kBbATFA7PW'
  //     }
  //   },
  //   warning: undefined,
  //   error: undefined
  // }
  console.log(extractResult);
}

main()
  .catch(console.error)
  .then(() => {
    console.log("Done");
  });
