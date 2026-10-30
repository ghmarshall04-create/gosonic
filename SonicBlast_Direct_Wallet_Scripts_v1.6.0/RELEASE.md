# SonicBlast Smart Launcher 1.6.0

This release moves SonicBlast chain operations to direct, browser-built wallet scripts.

## Included

- Local browser launch-plan validation; no `/api/launch-intents` or `/api/launch-insights` dependency.
- Static `public/network-config.js` allowlist for factories, V2 pairing routers, assets, direct SNBL route, and slippage.
- `public/chain-scripts.js` for transparent deploy, pair, direct V2 quote, and direct V2 purchase script construction.
- Wallet-routed contract-code checks, `getAmountsOut` reads, receipt checks, exact ERC-20 approvals, token deployment, V2 liquidity, and direct SNBL purchase.
- Self-hosted xterm.js console with `script deploy` and `script pair <token> [quote]` previews before any wallet approval.
- No 0x Swap API, `ZEROX_API_KEY`, server quote proxy, server transaction signer, recovery phrase, private key, or arbitrary browser-to-shell execution.
- Light-spectrum PWA, creation board, Sonic rooms, direct voice/video, and Cloudflare Durable Objects.

## Before publishing

1. Run `npm install` and `npm run verify`.
2. Review and complete `public/network-config.js` with verified testnet addresses first.
3. Run the post-deployment tests in [DEPLOYMENT.md](DEPLOYMENT.md), including `script deploy`, `script pair`, and direct SNBL router reads.
4. Audit the factory/token source, bundled artifact, V2 script calls, router, assets, and route before mainnet use.
5. Read [README.md](README.md), [DEPLOYMENT.md](DEPLOYMENT.md), and [SECURITY.md](SECURITY.md) before production use.

Direct Solana token creation remains intentionally unavailable in this EVM-first release. Use a dedicated audited Solana adapter rather than any phrase form, remote shell, or generic console command.
