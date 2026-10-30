import test from "node:test";
import assert from "node:assert/strict";
import { buildLaunchPlan } from "../public/launch-plan.js";
import { directWalletConfig } from "../public/network-config.js";
import { FACTORY_ARTIFACT } from "../public/factory-artifact.js";
import {
  buildDirectV2PurchaseScript,
  buildDirectV2QuoteScript,
  buildTokenDeploymentScript,
  buildV2LiquidityScript,
  quotedV2Amounts
} from "../public/chain-scripts.js";

const owner = "0x1111111111111111111111111111111111111111";
const router = "0x2222222222222222222222222222222222222222";
const wrapped = "0x3333333333333333333333333333333333333333";
const snbl = "0x4444444444444444444444444444444444444444";
const usdc = "0x5555555555555555555555555555555555555555";

function abiUintArray(values) {
  const word = (value) => BigInt(value).toString(16).padStart(64, "0");
  return `0x${word(32)}${word(values.length)}${values.map(word).join("")}`;
}

function launchPlan() {
  return buildLaunchPlan({
    chain: "base",
    name: "Midnight Signal",
    symbol: "SIGNAL",
    supply: "1000000",
    decimals: "18",
    liquidityMode: "native",
    liquidityAmount: "0.5",
    quoteAsset: "ETH",
    ownerAddress: owner
  });
}

test("direct configuration is embedded and enables only verified addresses", () => {
  const config = directWalletConfig({
    factories: { base: owner },
    pairing: { base: { router, slippageBps: 75, assets: { USDC: { address: usdc, decimals: 6 } } } },
    snbl: {
      chain: "base", tokenAddress: snbl, tokenSymbol: "SNBL", tokenDecimals: 18,
      router, wrappedNative: wrapped, payment: { address: "", symbol: "ETH", decimals: 18 }, route: [], slippageBps: 100
    }
  });
  assert.equal(config.factories.base, owner);
  assert.equal(config.pairing.base.assets.USDC.decimals, 6);
  assert.equal(config.snbl.checkoutEnabled, true);
  assert.equal(config.snbl.paymentIsNative, true);

  const malformedPayment = directWalletConfig({
    snbl: {
      chain: "base", tokenAddress: snbl, router, wrappedNative: wrapped,
      payment: { address: "not-an-address", symbol: "USDC", decimals: 6 }, route: []
    }
  });
  assert.equal(malformedPayment.snbl.checkoutEnabled, false);
});

test("deployment and pairing scripts use fixed reviewed contract calls", () => {
  const plan = launchPlan();
  const deploy = buildTokenDeploymentScript({ plan, artifact: FACTORY_ARTIFACT, factoryAddress: router, signer: owner });
  assert.equal(deploy.createToken.to, router);
  assert.ok(deploy.createToken.data.startsWith("0x5165749e"));

  const pair = buildV2LiquidityScript({
    plan,
    tokenAddress: snbl,
    tokenAmount: "100000",
    quoteAmount: "0.5",
    config: { router, slippageBps: 100, assets: {} },
    recipient: owner,
    deadline: 2_000_000_000
  });
  assert.equal(pair.approvals.length, 1);
  assert.ok(pair.approvals[0].amount.endsWith("000000000000000000"));
  assert.equal(pair.transaction.to, router);
  assert.ok(pair.transaction.data.startsWith("0xf305d719"));
  assert.equal(pair.transaction.value, "0x6f05b59d3b20000");
});

test("direct V2 quote and buy scripts do not depend on a quote API", () => {
  const config = directWalletConfig({
    snbl: {
      chain: "base", tokenAddress: snbl, tokenSymbol: "SNBL", tokenDecimals: 18,
      router, wrappedNative: wrapped, payment: { address: "", symbol: "ETH", decimals: 18 }, route: [], slippageBps: 100
    }
  }).snbl;
  const quote = buildDirectV2QuoteScript({ config, amountIn: "100000000000000000", signer: owner });
  assert.deepEqual(quote.path, [wrapped, snbl]);
  assert.ok(quote.transaction.data.startsWith("0xd06ca61f"));

  const amounts = quotedV2Amounts(quote, abiUintArray([quote.amountIn, "250000000000000000000"]));
  const buy = buildDirectV2PurchaseScript({ config, quoteScript: quote, quoteAmounts: amounts, recipient: owner, slippageBps: 100, deadline: 2_000_000_000 });
  assert.equal(buy.approval, null);
  assert.equal(buy.transaction.value, "0x16345785d8a0000");
  assert.ok(buy.transaction.data.startsWith("0x7ff36ab5"));
  assert.equal(buy.minOutput, "247500000000000000000");
});
