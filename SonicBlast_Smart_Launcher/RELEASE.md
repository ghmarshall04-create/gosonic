# SonicBlast Smart Launcher 1.4.0

This is the complete deployable package for **SonicBlast Smart Launcher**, powered by **No Doubt Solutions**.

Project reference: `0x018ea8d2f38f696b2d201a01e5cd04f6272742b7`

## Included

- Light-spectrum browser interface and installable PWA with white favicon.
- One-field-at-a-time launch popup for Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche, and Solana.
- Sonic IQ readiness guidance for chain choice, public owner format, supply, liquidity lane, metadata, and the next local runner action.
- Network-token and stablecoin liquidity toggle in the launch popup.
- Ranked creation board with community heat, creator management, creation rooms, and approved HTTPS Buy links.
- Bright Buy SNBL action, enabled only by the operator-supplied `SNBL_BUY_URL` Worker variable.
- Persistent Sonic chat rooms plus direct WebRTC voice and video calls.
- Cloudflare Durable Objects for chat, signaling, and the creation registry.
- Local Bash/CLI runner for fixed-supply EVM token deployment, EVM V2 liquidity handoffs, and Solana token creation.
- Fixed-supply ERC-20 source, tests, deployment guide, and security guidance.

## Start here

```bash
npm install
npm run verify
npx wrangler login
npm run deploy
```

For Cloudflare Git builds, set the repository root as the Root directory, use `npm run verify` as the Build command, and use `npm run deploy` as the Deploy command.

Read [README.md](README.md) for the full product map, [DEPLOYMENT.md](DEPLOYMENT.md) for Cloudflare and TURN configuration, and [runner/README.md](runner/README.md) before a token or liquidity transaction.

The browser application does not accept recovery phrases or private keys. Signing inputs remain in the local runner environment on the operator machine.
