# blockchain-signals

A curated list of blockchain-related RSS feeds and newsletters.

## RSS Feeds

`feeds.opml` contains ~50 RSS/Atom feeds across these categories:

- **Infrastructure** - Blocknative, Chainlink, ChainSafe, OpenZeppelin, etc.
- **Layer1** - Algorand, Sui, Neo, Celo
- **Layer2** - Offchain Labs (Arbitrum)
- **Privacy** - Brave, Electric Coin Company
- **Research** - Ethereum Blog, Sigma Prime, SlowMist, Coin Center
- **DeFi** - Synthetix, Rocket Pool, THORChain, etc.
- **Forum** - Ethereum Research, Flashbots, Anoma
- **GitHub Releases** - go-ethereum

Import `feeds.opml` into any RSS reader (Inoreader, Feedly, etc.).

## Automated Monitoring

Two GitHub Actions workflows run weekly (Monday 09:00 UTC):

### Feed Health Check

Checks all feeds for availability and staleness.

- **Dead**: HTTP error, timeout, or DNS failure
- **Invalid**: Responds 200 but not RSS/Atom content
- **Stale**: Last post older than 6 months
- **Healthy**: Active and valid

```
bun run check-feeds
```

### Feed Discovery

Searches for new blockchain RSS feeds using Brave Search API, verifies they serve valid RSS/Atom content, and deduplicates against existing feeds.

```
BRAVE_SEARCH_API_KEY=xxx bun run discover-feeds
```

Results are posted as GitHub Issues with labels `feed-health` and `feed-discovery`.

## Newsletters

- [Anoma](https://anoma.us7.list-manage.com/subscribe?u=69adafe0399f0f2a434d8924b&id=e30866c43d)
- [Internet Computer](https://dfinity.us16.list-manage.com/subscribe/post?u=33c727489e01ff5b6e1fb6cc6&id=7e9469a315&f_id=00bac2e1f0)
- [Solana](https://solana.com/newsletter)
- [Sui](https://sui.io/subscribe)
- [Aptos](https://aptosfoundation.org/subscribe)
- [Arbitrum](https://arbitrum.io/)
- [Optimism](https://optimism.us6.list-manage.com/subscribe/post?u=9727fa8bec4011400e57cafcb&id=ca91042234&f_id=002a19e3f0)
- [Polygon](https://polygon.technology/)
- [Cosmos](https://v1.cosmos.network/)
- [Polkadot](https://polkadot.com/community/newsroom)
- [StarkNet](https://www.starknet.io/starknet-devs-newsletter/)
- [NymVPN](https://nymtech.us19.list-manage.com/subscribe?u=8ec8f34b310293492a02a12c0&id=1c58c918aa)

## Awesome Lists

- [Web3](https://awesome-web3.com)
- [Bitcoin](https://github.com/igorbarinov/awesome-bitcoin)
- [Internet Computer](https://github.com/dfinity/awesome-internet-computer)
- [Solana](https://github.com/helius-labs/solana-awesome)
- [Sui](https://github.com/sui-foundation/awesome-sui)
- [Base](https://github.com/wbnns/awesome-base)
- [Aptos](https://github.com/BlockEdenHQ/awesome-aptos)
- [Optimism](https://github.com/lucas-op/awesome-optimism)
- [Cosmos](https://github.com/cosmos/awesome-cosmos)
- [Polkadot](https://github.com/haquefardeen/awesome-dot)
- [StarkNet](https://github.com/keep-starknet-strange/awesome-starknet)

## Setup

```bash
bun install
cp .env.example .env  # Set BRAVE_SEARCH_API_KEY for feed discovery
```

## Secrets

| Variable | Where | Purpose |
|---|---|---|
| `BRAVE_SEARCH_API_KEY` | GitHub Secrets | Feed discovery |
