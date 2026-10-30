# Deploy SonicBlast Smart Launcher 1.6.0

## First deployment

From the repository root:

```bash
npm install
npm run verify
npx wrangler login
npm run deploy
```

For Git-connected Cloudflare Workers, use `/` as the root directory, `npm run verify` as the build command, and `npm run deploy` as the deploy command.

## Direct wallet-script configuration

All configuration for token deployment, V2 pairing, and direct SNBL buying lives in [public/network-config.js](public/network-config.js). It is compiled into the public app rather than returned from a Worker endpoint.

This matters: anyone can inspect those addresses in the deployed site, so put only public, reviewed contract addresses there. Do not put an RPC API key, private key, recovery phrase, password, or any secret in this file.

### Factory (optional)

Without a configured factory, the first creator’s wallet deploys the included `SonicBlastFactory` and the browser stores that address locally. To reuse an independently reviewed factory across visitors:

```js
factories: {
  base: "0xYOUR_REVIEWED_FACTORY_ADDRESS"
}
```

Verify its bytecode and source against `contracts/evm/src/SonicBlastFactory.sol`, `contracts/evm/src/SonicBlastToken.sol`, and `public/factory-artifact.js` before adding it.

### V2 liquidity pairing

Pairing accepts no router address from a visitor or an xterm command. Add only a reviewed V2-compatible router and payment assets:

```js
pairing: {
  base: {
    router: "0xYOUR_REVIEWED_V2_ROUTER",
    slippageBps: 100,
    assets: {
      USDC: { address: "0xYOUR_REVIEWED_USDC", decimals: 6 },
      USDT: { address: "0xYOUR_REVIEWED_USDT", decimals: 6 }
    }
  }
}
```

Native pairing uses `addLiquidityETH`; stablecoin pairing uses `addLiquidity`. The generated script asks for exact ERC-20 approvals, never an unlimited approval, and sets a 20-minute deadline.

### Direct SNBL buy

The Buy SNBL UI is a direct exact-input V2 route. It uses a wallet-routed `eth_call` to `getAmountsOut` and then creates either `swapExactETHForTokens` or `swapExactTokensForTokens` for the connected wallet to approve.

```js
snbl: {
  chain: "base",
  tokenAddress: "0xYOUR_VERIFIED_SNBL",
  tokenSymbol: "SNBL",
  tokenDecimals: 18,
  router: "0xYOUR_REVIEWED_V2_ROUTER",
  wrappedNative: "0xYOUR_REVIEWED_WRAPPED_NATIVE",
  payment: { address: "", symbol: "ETH", decimals: 18 },
  route: [],
  slippageBps: 100
}
```

An empty `payment.address` uses the chain-native asset. For ERC-20 payments, set `payment.address`, symbol, and decimals. `route` may list optional verified intermediates only, for example `["0xVERIFIED_USDC"]`; the script automatically builds `input → intermediates → SNBL`. The site disables Buy SNBL until the essential addresses are present and valid.

There is no 0x integration, quote-service credential, or Worker route to configure. The user’s wallet is the direct network client.

## Voice and video configuration

WebRTC media is peer-to-peer; Durable Objects handle signaling and room state. For stronger cross-network calls, configure:

| Variable | Storage | Purpose |
| --- | --- | --- |
| `RTC_ICE_SERVERS_JSON` | Worker variable | Optional STUN-server JSON array |
| `TURN_URLS` | Worker variable | `turn:` / `turns:` URL JSON array |
| `TURN_SHARED_SECRET` | Worker secret | Short-lived TURN credential HMAC secret |

```bash
npx wrangler secret put TURN_SHARED_SECRET
```

TURN is unrelated to chain scripts. Do not reuse or expose a wallet/RPC credential in TURN settings.

## Post-deploy verification

1. Open the Worker URL on desktop and an in-wallet mobile browser. Confirm the PWA and `public/network-config.js` load from the same site.
2. Build an EVM test profile and run `script deploy`. Confirm it prints the fixed token inputs and the intended factory without opening a transaction.
3. On a testnet, run `deploy` and inspect each factory/token transaction in the wallet. Confirm the factory event supplies the token address to the listing screen.
4. Configure a reviewed testnet V2 router. Run `script pair <tokenAmount> <quoteAmount>`, then `pair`. Inspect exact approvals, router, recipient, minimums, deadline, and value before signing.
5. Configure a test SNBL token and V2 route. Build an SNBL direct script, verify `getAmountsOut` succeeds, then inspect the final exact-input swap in the wallet without performing a mainnet purchase.
6. Confirm `/api/wallet-config`, `/api/snbl/quote`, and `/api/launch-intents` return 404: chain actions must not be routed through the Worker.
7. Publish a test creation, join the same Sonic room from a second browser profile, and verify chat, voice, video, and PWA install.

Direct Solana token creation and pairing remain disabled in this EVM-first release. Use a dedicated audited Solana adapter rather than a phrase form, a remote shell, or a generic console command.
