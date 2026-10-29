#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const binDir = dirname(fileURLToPath(import.meta.url));
const runnerRoot = resolve(binDir, "..");
const scripts = {
  doctor: "scripts/doctor.sh",
  "evm:preflight": "scripts/evm/preflight.sh",
  "evm:create": "scripts/evm/create-token.sh",
  "evm:add-v2-native": "scripts/evm/add-v2-liquidity-native.sh",
  "evm:add-v2-erc20": "scripts/evm/add-v2-liquidity-erc20.sh",
  "solana:create": "scripts/solana/create-token.sh",
  "solana:liquidity-plan": "scripts/solana/liquidity-plan.sh"
};

const [command, ...args] = process.argv.slice(2);
if (!command || command === "--help" || command === "help") {
  console.log(`SonicBlast local runner\n\nUsage:\n  ./runner/bin/sonicblast.mjs doctor\n  ./runner/bin/sonicblast.mjs evm:preflight --chain base --router 0x...
  ./runner/bin/sonicblast.mjs evm:create --chain base --name NAME --symbol SYMBOL --supply 1000000 --decimals 18 --owner 0x...\n  ./runner/bin/sonicblast.mjs evm:add-v2-native --chain base --token 0x... --router 0x... --token-amount-base 1000000000000000000 --native-amount 0.1ether --recipient 0x...\n  ./runner/bin/sonicblast.mjs solana:create --cluster devnet --name NAME --symbol SYMBOL --supply 1000000 --decimals 9 --owner SOLANA_ADDRESS\n  ./runner/bin/sonicblast.mjs solana:liquidity-plan --cluster mainnet-beta --mint MINT --quote SOL --amount 1 --owner ADDRESS`);
  process.exit(0);
}
const target = scripts[command];
if (!target) {
  console.error(`Unknown command: ${command}`);
  process.exit(2);
}
const result = spawnSync("bash", [resolve(runnerRoot, target), ...args], { cwd: runnerRoot, stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
