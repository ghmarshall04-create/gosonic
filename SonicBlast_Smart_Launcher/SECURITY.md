# SonicBlast Smart Launcher security model

## Boundaries

- The public Worker serves the PWA, launch-plan API, creation board, and Sonic rooms.
- The Worker cannot sign chain transactions and never receives wallet recovery phrases or private keys.
- The browser can download a reviewed runner file but does not execute Bash or chain CLIs.
- Sonic IQ produces deterministic operational-readiness signals from public launch inputs. It does not access secrets, price feeds, wallet balances, or make trading predictions.
- The local runner invokes allowlisted CLI commands only. It does not evaluate arbitrary browser-supplied shell text.
- Chat room Durable Objects persist chat messages and route WebRTC signaling. Direct WebRTC media does not transit through the Worker.
- TURN secrets stay in Worker secrets; the browser receives only short-lived TURN credentials when an operator configures a shared-secret TURN service.
- The included EVM contract has fixed supply and no privileged minting or transfer controls.

## Board and market links

- A board entry becomes `live` only when its submitted token address and HTTPS market URL pass validation.
- A creator browser receives a random management capability; the registry stores only its hash. The capability is required to update that creator's listing later.
- SonicBlast displays the exact market URL supplied by the operator. It does not manufacture a DEX destination, custody funds, or execute a purchase.
- Heat is a lightweight browser-level community signal. It is not a trading, trust, or safety score.

## Operating practice

Use a separate launch wallet with only the funds required for the planned action. Keep RPC credentials and signer material in `runner/.env`, which is excluded from Git. Use a hardware wallet or a local encrypted keystore when possible.

## Before a mainnet release

- Review and independently audit the Solidity contract and the selected DEX adapter.
- Set explicit slippage, deadline, token amount, and recipient values.
- Confirm the RPC endpoint, chain ID, router address, token contract address, and market URL.
- Test each selected flow on a testnet or a local fork.
- Add login, moderation, rate limiting, abuse controls, and a content policy before opening public rooms and public ranking broadly.
- Use a dedicated STUN/TURN service and test voice/video calls from separate networks before public launch.

## What the app refuses to do

The web application does not include a recovery phrase field. A recovery phrase should never be submitted to a website or Cloudflare endpoint. The local runner intentionally uses an operator-controlled signing setup instead.
