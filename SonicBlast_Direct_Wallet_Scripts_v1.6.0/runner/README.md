# SonicBlast Smart local runner

The runner executes reviewed, allowlisted chain commands from a machine you control. It is deliberately separate from the web app.

## Setup

```bash
cp runner/.env.example runner/.env
find runner -type f \( -name "*.mjs" -o -name "*.sh" \) -exec chmod +x {} +
./runner/bin/sonicblast.mjs doctor
```

The doctor command shows which command-line tools are available. Install the exact official versions of Foundry (`forge`, `cast`) and the Solana CLI (`solana`, `spl-token`) before running a chain action.

## EVM preflight

```bash
./runner/bin/sonicblast.mjs evm:preflight --chain base --router 0xAPPROVED_V2_ROUTER
```

The preflight reads the RPC chain ID and confirms that the supplied router contains contract code before a liquidity command runs.

## EVM launch command

```bash
./runner/bin/sonicblast.mjs evm:create \
  --chain base \
  --name "Midnight Signal" \
  --symbol "SIGNAL" \
  --supply 1000000000 \
  --decimals 18 \
  --owner 0xYOUR_PUBLIC_OWNER_ADDRESS
```

This compiles and deploys the included fixed-supply ERC-20 using Foundry. It reads the selected chain RPC URL and `SONICBLAST_EVM_PRIVATE_KEY` only from local `runner/.env`.

## Generic V2 native-asset liquidity

```bash
./runner/bin/sonicblast.mjs evm:add-v2-native \
  --chain base \
  --token 0xDEPLOYED_TOKEN \
  --router 0xAPPROVED_V2_ROUTER \
  --token-amount-base 500000000000000000000000000 \
  --native-amount 0.25ether \
  --recipient 0xYOUR_PUBLIC_OWNER_ADDRESS
```

The script first approves the selected router, then invokes `addLiquidityETH`. Use this only with an actual V2-compatible router whose ABI matches that method.

When the launch popup selects a stablecoin, SonicBlast generates an `evm:add-v2-erc20` handoff instead. Supply the deployed launch token as `--token-a`, the reviewed stablecoin address as `--token-b`, and both values in base units. The runner deliberately does not hardcode third-party stablecoin addresses or a router.

## Solana token creation

```bash
./runner/bin/sonicblast.mjs solana:create \
  --cluster devnet \
  --name "Midnight Signal" \
  --symbol "SIGNAL" \
  --supply 1000000000 \
  --decimals 9 \
  --owner YOUR_SOLANA_PUBLIC_ADDRESS \
  --metadata-uri https://example.com/token.json
```

The command creates a Token-2022 mint when metadata is given, creates the local token account, mints the requested supply, delivers it to the supplied public owner address, and permanently disables the mint authority. Use devnet first. Solana liquidity is selected by the DEX adapter because the pool account model and instruction format differ by venue.

## Signing material

Do not type a recovery phrase into the browser app. Use a hardware wallet, a local encrypted keystore, or a dedicated local launch wallet. This runner reads local environment values only and does not send them through the Cloudflare Worker.
