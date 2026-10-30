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

test("creates a direct wallet-script EVM launch plan", () => {
  const plan = buildLaunchPlan(baseInput);
  assert.equal(plan.walletOnly, true);
  assert.equal(plan.apiFree, true);
  assert.equal(plan.execution.type, "evm-direct-wallet-script");
  assert.equal(plan.execution.available, true);
  assert.match(plan.execution.detail, /wallet/i);
});

test("marks Solana direct creation as requiring its wallet adapter", () => {
  const plan = buildLaunchPlan({
    ...baseInput,
    chain: "solana",
    decimals: "9",
    ownerAddress: "11111111111111111111111111111111",
    quoteAsset: "SOL"
  });
  assert.equal(plan.execution.type, "solana-wallet-adapter");
  assert.equal(plan.execution.available, false);
});

test("rejects a recovery phrase shaped owner value", () => {
  assert.throws(() => normalizeLaunchInput({ ...baseInput, ownerAddress: "word word word word word word word word word word word word" }), /valid EVM owner address/);
});

test("creates a direct wallet-script stablecoin pairing plan", () => {
  const plan = buildLaunchPlan({ ...baseInput, liquidityMode: "stable", quoteAsset: "USDC" });
  assert.equal(plan.liquidity.mode, "stable");
  assert.match(plan.intelligence.nextAction, /USDC address/);
  assert.match(plan.checklist.join(" "), /USDC address/);
});

test("returns operational launch intelligence without using wallet secrets", () => {
  const insight = buildLaunchIntelligence({ ...baseInput, liquidityMode: "stable", quoteAsset: "USDC" });
  assert.equal(insight.score, 100);
  assert.match(insight.summary, /USDC/);
  assert.match(insight.nextAction, /USDC address/);
});
