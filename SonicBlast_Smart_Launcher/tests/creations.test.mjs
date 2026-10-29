import test from "node:test";
import assert from "node:assert/strict";
import { cleanRoomId, normalizeCreationInput } from "../src/creations.js";

const baseCreation = {
  chain: "base",
  name: "Midnight Signal",
  symbol: "signal",
  supply: "1000000",
  decimals: "18",
  ownerAddress: "0x1111111111111111111111111111111111111111",
  liquidityAmount: "0.5",
  quoteAsset: "ETH",
  room: "Midnight Signal Launch",
  tokenAddress: "0x2222222222222222222222222222222222222222",
  buyUrl: "https://example.com/market"
};

test("normalizes a live creation for the public board", () => {
  const creation = normalizeCreationInput(baseCreation);
  assert.equal(creation.symbol, "SIGNAL");
  assert.equal(creation.status, "live");
  assert.equal(creation.room, "midnight-signal-launch");
});

test("does not publish a buy link without a deployed token address", () => {
  assert.throws(() => normalizeCreationInput({ ...baseCreation, tokenAddress: "" }), /deployed token address/);
});

test("keeps room ids shareable", () => {
  assert.equal(cleanRoomId("  Sonic / Blast ::: Room  "), "sonic-blast-room");
});
