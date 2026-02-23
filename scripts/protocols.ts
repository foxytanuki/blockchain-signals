export type SourceType =
  | "blog"
  | "github"
  | "forum"
  | "governance"
  | "security"
  | "research";

export type Category = "L1" | "L2" | "DeFi" | "Infrastructure" | "Privacy";

export interface ProtocolSource {
  type: SourceType;
  url?: string; // explicit RSS URL (omit if unknown → Brave Search補完)
  repo?: string; // github type: "org/repo"
}

export interface Protocol {
  name: string;
  slug: string;
  homepage: string;
  category: Category;
  sources: ProtocolSource[];
}

export interface ResolvedFeed {
  protocol: string;
  sourceType: SourceType;
  label: string; // e.g. "Ethereum - Blog", "Ethereum - go-ethereum Releases"
  xmlUrl: string;
  htmlUrl: string;
}

function deriveHtmlUrl(feedUrl: string, homepage: string): string {
  const cleaned = feedUrl.replace(/\/+$/, "");
  // medium.com/feed/xxx → medium.com/xxx
  const mediumStrip = cleaned.replace(/\/feed\//, "/");
  if (mediumStrip !== cleaned) return mediumStrip;
  // Strip common feed suffixes
  const stripped = cleaned.replace(
    /\/(feed|rss|atom|index)\.(xml|json|rss|atom)$|\/latest\.(rss|atom)$|\/?(feed|rss|atom)\/?$/i,
    ""
  );
  return stripped || homepage;
}

/**
 * URL解決: source定義 → 実際のfeed URL
 */
export function resolveSourceUrl(
  protocol: Protocol,
  source: ProtocolSource
): ResolvedFeed | null {
  switch (source.type) {
    case "github": {
      if (!source.repo) return null;
      const repoName = source.repo.split("/").pop() ?? source.repo;
      return {
        protocol: protocol.name,
        sourceType: source.type,
        label: `${protocol.name} - ${repoName} Releases`,
        xmlUrl: `https://github.com/${source.repo}/releases.atom`,
        htmlUrl: `https://github.com/${source.repo}/releases`,
      };
    }
    case "forum":
    case "governance": {
      if (!source.url) return null;
      const base = source.url.replace(/\/+$/, "");
      const typeLabel =
        source.type === "governance" ? "Governance" : "Forum";
      return {
        protocol: protocol.name,
        sourceType: source.type,
        label: `${protocol.name} - ${typeLabel}`,
        xmlUrl: `${base}/latest.rss`,
        htmlUrl: `${base}/latest`,
      };
    }
    case "blog":
    case "security":
    case "research": {
      if (!source.url) return null;
      const typeLabel =
        source.type === "blog"
          ? "Blog"
          : source.type === "security"
            ? "Security"
            : "Research";
      return {
        protocol: protocol.name,
        sourceType: source.type,
        label: `${protocol.name} - ${typeLabel}`,
        xmlUrl: source.url,
        htmlUrl: deriveHtmlUrl(source.url, protocol.homepage),
      };
    }
    default:
      return null;
  }
}

/**
 * Registry全体を解決
 */
export function resolveAllFeeds(protocols: Protocol[]): ResolvedFeed[] {
  const feeds: ResolvedFeed[] = [];
  for (const proto of protocols) {
    for (const source of proto.sources) {
      const resolved = resolveSourceUrl(proto, source);
      if (resolved) feeds.push(resolved);
    }
  }
  return feeds;
}

/**
 * URL未定義のソースを抽出（Brave Search補完対象）
 */
export function findUnresolvedSources(
  protocols: Protocol[]
): { protocol: Protocol; source: ProtocolSource }[] {
  const unresolved: { protocol: Protocol; source: ProtocolSource }[] = [];
  for (const proto of protocols) {
    for (const source of proto.sources) {
      if (source.type === "github") {
        if (!source.repo) unresolved.push({ protocol: proto, source });
      } else {
        if (!source.url) unresolved.push({ protocol: proto, source });
      }
    }
  }
  return unresolved;
}

// ── Protocol Registry ──

export const PROTOCOLS: Protocol[] = [
  // ── L1 ──
  {
    name: "Ethereum",
    slug: "ethereum",
    homepage: "https://ethereum.org",
    category: "L1",
    sources: [
      { type: "blog", url: "https://blog.ethereum.org/feed.xml" },
      { type: "github", repo: "ethereum/go-ethereum" },
      { type: "forum", url: "https://ethresear.ch" },
      { type: "governance", url: "https://ethereum-magicians.org" },
    ],
  },
  {
    name: "Solana",
    slug: "solana",
    homepage: "https://solana.com",
    category: "L1",
    sources: [
      { type: "blog" }, // URL不明 → Brave Search補完
      { type: "github", repo: "solana-labs/solana" },
    ],
  },
  {
    name: "Avalanche",
    slug: "avalanche",
    homepage: "https://www.avax.network",
    category: "L1",
    sources: [
      { type: "blog", url: "https://medium.com/feed/avalancheavax" },
      { type: "github", repo: "ava-labs/avalanchego" },
    ],
  },
  {
    name: "Cosmos",
    slug: "cosmos",
    homepage: "https://cosmos.network",
    category: "L1",
    sources: [
      { type: "blog", url: "https://blog.cosmos.network/feed" },
      { type: "github", repo: "cosmos/cosmos-sdk" },
      { type: "forum", url: "https://forum.cosmos.network" },
    ],
  },
  {
    name: "Polkadot",
    slug: "polkadot",
    homepage: "https://polkadot.com",
    category: "L1",
    sources: [
      { type: "blog", url: "https://medium.com/feed/polkadot-network" },
      { type: "github", repo: "polkadot-fellows/runtimes" },
    ],
  },
  {
    name: "Sui",
    slug: "sui",
    homepage: "https://sui.io",
    category: "L1",
    sources: [
      { type: "blog", url: "https://blog.sui.io/rss/" },
      { type: "github", repo: "MystenLabs/sui" },
    ],
  },
  {
    name: "Aptos",
    slug: "aptos",
    homepage: "https://aptosfoundation.org",
    category: "L1",
    sources: [
      { type: "blog", url: "https://medium.com/feed/aptoslabs" },
      { type: "github", repo: "aptos-labs/aptos-core" },
    ],
  },
  {
    name: "NEAR",
    slug: "near",
    homepage: "https://near.org",
    category: "L1",
    sources: [
      { type: "blog", url: "https://medium.com/feed/nearprotocol" },
      { type: "github", repo: "near/nearcore" },
    ],
  },
  {
    name: "Algorand",
    slug: "algorand",
    homepage: "https://algorand.co",
    category: "L1",
    sources: [
      { type: "blog", url: "https://algorand.co/blog/rss.xml" },
      { type: "github", repo: "algorand/go-algorand" },
    ],
  },

  // ── L2 ──
  {
    name: "Arbitrum",
    slug: "arbitrum",
    homepage: "https://arbitrum.io",
    category: "L2",
    sources: [
      { type: "blog", url: "https://offchain.medium.com/feed" },
      { type: "github", repo: "OffchainLabs/nitro" },
      { type: "governance", url: "https://forum.arbitrum.foundation" },
    ],
  },
  {
    name: "Optimism",
    slug: "optimism",
    homepage: "https://optimism.io",
    category: "L2",
    sources: [
      { type: "blog", url: "https://blog.optimism.io/rss/" },
      { type: "github", repo: "ethereum-optimism/optimism" },
      { type: "governance", url: "https://gov.optimism.io" },
    ],
  },
  {
    name: "Base",
    slug: "base",
    homepage: "https://base.org",
    category: "L2",
    sources: [
      { type: "blog" }, // URL不明
      { type: "github", repo: "base-org/node" },
    ],
  },
  {
    name: "zkSync",
    slug: "zksync",
    homepage: "https://zksync.io",
    category: "L2",
    sources: [
      { type: "blog", url: "https://blog.matter-labs.io/feed" },
      { type: "github", repo: "matter-labs/zksync-era" },
    ],
  },
  {
    name: "StarkNet",
    slug: "starknet",
    homepage: "https://starknet.io",
    category: "L2",
    sources: [
      { type: "blog" }, // starknet.io/blog/feed/ returns HTML not RSS
      { type: "github", repo: "starkware-libs/cairo" },
      { type: "forum", url: "https://community.starknet.io" },
    ],
  },
  {
    name: "Polygon",
    slug: "polygon",
    homepage: "https://polygon.technology",
    category: "L2",
    sources: [
      { type: "blog" }, // blog.polygon.technology/feed/ returns HTML not RSS
      { type: "github", repo: "0xPolygon/polygon-edge" },
    ],
  },
  {
    name: "Scroll",
    slug: "scroll",
    homepage: "https://scroll.io",
    category: "L2",
    sources: [
      { type: "blog" }, // scroll.io/blog/feed returns HTML not RSS
      { type: "github", repo: "scroll-tech/scroll" },
    ],
  },

  // ── DeFi ──
  {
    name: "Uniswap",
    slug: "uniswap",
    homepage: "https://uniswap.org",
    category: "DeFi",
    sources: [
      { type: "blog" }, // blog.uniswap.org/rss.xml returns 404
      { type: "github", repo: "Uniswap/v4-core" },
      { type: "governance", url: "https://gov.uniswap.org" },
    ],
  },
  {
    name: "Aave",
    slug: "aave",
    homepage: "https://aave.com",
    category: "DeFi",
    sources: [
      { type: "blog" }, // URL不明
      { type: "github", repo: "aave/aave-v3-core" },
      { type: "governance", url: "https://governance.aave.com" },
    ],
  },
  {
    name: "MakerDAO",
    slug: "makerdao",
    homepage: "https://makerdao.com",
    category: "DeFi",
    sources: [
      { type: "blog" }, // blog.makerdao.com/feed/ returns HTML not RSS
      { type: "governance", url: "https://forum.makerdao.com" },
    ],
  },
  {
    name: "Compound",
    slug: "compound",
    homepage: "https://compound.finance",
    category: "DeFi",
    sources: [
      { type: "blog", url: "https://medium.com/feed/compound-finance" },
      { type: "github", repo: "compound-finance/compound-protocol" },
      { type: "governance", url: "https://comp.xyz" },
    ],
  },
  {
    name: "Synthetix",
    slug: "synthetix",
    homepage: "https://synthetix.io",
    category: "DeFi",
    sources: [
      { type: "blog", url: "https://blog.synthetix.io/rss/" },
      { type: "github", repo: "Synthetixio/synthetix" },
    ],
  },
  {
    name: "Lido",
    slug: "lido",
    homepage: "https://lido.fi",
    category: "DeFi",
    sources: [
      { type: "blog", url: "https://blog.lido.fi/rss/" },
      { type: "github", repo: "lidofinance/lido-dao" },
      { type: "research", url: "https://research.lido.fi/latest.rss" },
    ],
  },
  {
    name: "Curve",
    slug: "curve",
    homepage: "https://curve.fi",
    category: "DeFi",
    sources: [
      { type: "blog" }, // URL不明
      { type: "github", repo: "curvefi/curve-contract" },
    ],
  },
  {
    name: "Rocket Pool",
    slug: "rocket-pool",
    homepage: "https://rocketpool.net",
    category: "DeFi",
    sources: [
      { type: "blog", url: "https://medium.com/feed/rocket-pool" },
      { type: "github", repo: "rocket-pool/rocketpool" },
    ],
  },

  // ── Infrastructure ──
  {
    name: "Chainlink",
    slug: "chainlink",
    homepage: "https://chain.link",
    category: "Infrastructure",
    sources: [
      { type: "blog", url: "https://blog.chain.link/rss/" },
      { type: "github", repo: "smartcontractkit/chainlink" },
    ],
  },
  {
    name: "The Graph",
    slug: "the-graph",
    homepage: "https://thegraph.com",
    category: "Infrastructure",
    sources: [
      { type: "blog" }, // thegraph.com/blog/rss.xml returns 404
      { type: "github", repo: "graphprotocol/graph-node" },
      { type: "forum", url: "https://forum.thegraph.com" },
    ],
  },
  {
    name: "Celestia",
    slug: "celestia",
    homepage: "https://celestia.org",
    category: "Infrastructure",
    sources: [
      { type: "blog", url: "https://blog.celestia.org/rss/" },
      { type: "github", repo: "celestiaorg/celestia-node" },
    ],
  },
  {
    name: "EigenLayer",
    slug: "eigenlayer",
    homepage: "https://eigenlayer.xyz",
    category: "Infrastructure",
    sources: [
      { type: "blog", url: "https://www.blog.eigenlayer.xyz/rss/" },
      { type: "github", repo: "Layr-Labs/eigenlayer-contracts" },
      { type: "forum", url: "https://forum.eigenlayer.xyz" },
    ],
  },
  {
    name: "OpenZeppelin",
    slug: "openzeppelin",
    homepage: "https://www.openzeppelin.com",
    category: "Infrastructure",
    sources: [
      { type: "blog", url: "https://blog.openzeppelin.com/rss.xml" },
      { type: "github", repo: "OpenZeppelin/openzeppelin-contracts" },
      { type: "security" }, // security-audits/rss.xml returns 404
    ],
  },
  {
    name: "Flashbots",
    slug: "flashbots",
    homepage: "https://www.flashbots.net",
    category: "Infrastructure",
    sources: [
      { type: "blog", url: "https://writings.flashbots.net/rss.xml" },
      { type: "github", repo: "flashbots/mev-boost" },
      { type: "forum", url: "https://collective.flashbots.net" },
    ],
  },
  {
    name: "IPFS",
    slug: "ipfs",
    homepage: "https://ipfs.tech",
    category: "Infrastructure",
    sources: [
      { type: "blog", url: "https://blog.ipfs.io/index.xml" },
      { type: "github", repo: "ipfs/kubo" },
    ],
  },

  // ── Privacy ──
  {
    name: "Zcash",
    slug: "zcash",
    homepage: "https://z.cash",
    category: "Privacy",
    sources: [
      { type: "blog", url: "https://electriccoin.co/feed/" },
      { type: "github", repo: "zcash/zcash" },
    ],
  },
  {
    name: "Brave",
    slug: "brave",
    homepage: "https://brave.com",
    category: "Privacy",
    sources: [
      { type: "blog", url: "https://brave.com/blog/index.xml" },
    ],
  },
];
