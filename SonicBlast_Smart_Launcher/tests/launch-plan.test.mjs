import test from "node:test";
import assert from "node:assert/strict";
import { buildLaunchIntelligence, buildLaunchPlan, normalizeLaunchInput } from "../src/launch-plan.js";

const baseInput = {
  chain: "base",
  name: "Midnight Signal",
  symbol: "signal",
  supply: "1000000",
  decimals: "18",
  liquidityAmount: "0.25",
  quoteAsset: "ETH",
  ownerAddress: "0x1111111111111111111111111111111111111111",
  metadataUri: "https://example.com/token.json"
};

test("normalizes an EVM launch input", () => {
  const data = normalizeLaunchInput(baseInput);
  assert.equal(data.symbol, "SIGNAL");
  assert.equal(data.chainConfig.family, "evm");
});

test("creates a local-only EVM command plan", () => {
  const plan = buildLaunchPlan(baseInput);
  assert.equal(plan.localOnly, true);
  assert.match(plan.commands[0], /evm:create/);
  assert.match(plan.liquidityCommand, /evm:add-v2-native/);
});

test("creates a Solana command plan", () => {
  const plan = buildLaunchPlan({
    ...baseInput,
    chain: "solana",
    decimals: "9",
    ownerAddress: "11111111111111111111111111111111",
    quoteAsset: "SOL"
  });
  assert.match(plan.commands[0], /solana:create/);
  assert.match(plan.liquidityCommand, /solana:liquidity-plan/);
});

test("rejects a recovery phrase shaped owner value", () => {
  assert.throws(() => normalizeLaunchInput({ ...baseInput, ownerAddress: "word word word word word word word word word word word word" }), /valid EVM owner address/);
});

test("creates an ERC-20 pair handoff for a stablecoin liquidity choice", () => {
  const plan = buildLaunchPlan({ ...baseInput, liquidityMode: "stable", quoteAsset: "USDC" });
  assert.equal(plan.liquidity.mode, "stable");
  assert.match(plan.liquidityCommand, /evm:add-v2-erc20/);
  assert.match(plan.liquidityCommand, /USDC_TOKEN_ADDRESS/);
});

test("returns operational launch intelligence without using wallet secrets", () => {
  const insight = buildLaunchIntelligence({ ...baseInput, liquidityMode: "stable", quoteAsset: "USDC" });
  assert.equal(insight.score, 100);
  assert.match(insight.summary, /USDC/);
  assert.match(insight.nextAction, /USDC address/);
});
