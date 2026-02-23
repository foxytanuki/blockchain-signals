# blockchain-signals

A curated registry of blockchain protocol RSS feeds.

## Protocol Registry

`scripts/protocols.ts` is the source of truth. It defines ~30 protocols with typed feed sources:

- **Blog** - Official protocol blogs
- **Releases** - GitHub release feeds (auto-generated from `org/repo`)
- **Forum** - Development/research forums (Discourse)
- **Governance** - Governance forums and proposals
- **Security** - Security research and audits
- **Research** - Academic/technical research

`feeds.opml` is generated from the registry and can be imported into any RSS reader (Inoreader, Feedly, etc.).

## Scripts

### Feed Discovery

Resolves feeds from the protocol registry, diffs against current OPML, and optionally uses Brave Search to find feeds for protocols with missing URLs.

```bash
bun run discover-feeds                    # registry resolution + diff report
bun run discover-feeds -- --verify        # + verify each feed URL is alive
bun run discover-feeds -- --verify --write # + write feeds.opml
```

### Generate OPML

Shortcut to regenerate `feeds.opml` from the registry:

```bash
bun run generate-opml
```

### Feed Health Check

Checks all feeds in `feeds.opml` for availability and staleness:

```bash
bun run check-feeds
```

### Probe Feeds

Auto-detect RSS feeds from a protocol's homepage:

```bash
bun run probe-feeds -- https://ethereum.org https://uniswap.org
```

## Automated Monitoring

Two GitHub Actions workflows run weekly (Monday 09:00 UTC):

- **Feed Health Check** - Checks feed availability, auto-removes dead feeds via PR
- **Feed Discovery** - Resolves registry, verifies feeds, updates OPML via PR

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
cp .env.example .env  # Set BRAVE_SEARCH_API_KEY for Brave Search complement
```

## Secrets

| Variable | Where | Purpose |
|---|---|---|
| `BRAVE_SEARCH_API_KEY` | GitHub Secrets | Brave Search complement in feed discovery |
