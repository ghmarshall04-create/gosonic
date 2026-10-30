import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  amountAfterSlippage,
  decodeUint256,
  decimalToBaseUnits,
  encodeCreateTokenCall,
  encodeErc20Allowance,
  encodeErc20Approve,
  encodeV2AddLiquidityErc20,
  encodeV2AddLiquidityNative,
  factoryAddressFromReceipt
} from "../public/wallet.js";

const artifact = JSON.parse(readFileSync(new URL("../public/assets/sonicblast-factory-artifact.json", import.meta.url), "utf8"));
const owner = "0x1111111111111111111111111111111111111111";
const router = "0x2222222222222222222222222222222222222222";

test("encodes a reviewed SonicBlast factory call", () => {
  const data = encodeCreateTokenCall(artifact, { name: "Midnight Signal", symbol: "SIGNAL", decimals: 18, supply: "1000000", ownerAddress: owner });
  assert.ok(data.startsWith("0x5165749e"));
  assert.equal((data.length - 2 - 8) % 64, 0);
});

test("encodes exact token approvals and V2 liquidity calls", () => {
  assert.ok(encodeErc20Approve({ spender: router, amount: "100" }).startsWith("0x095ea7b3"));
  assert.ok(encodeErc20Allowance({ owner, spender: router }).startsWith("0xdd62ed3e"));
  assert.equal(decodeUint256(`0x${"0".repeat(62)}64`), 100n);
  assert.ok(encodeV2AddLiquidityNative({ token: owner, tokenAmount: "100", tokenAmountMin: "99", nativeAmountMin: "9", recipient: owner, deadline: "2000000000" }).startsWith("0xf305d719"));
  assert.ok(encodeV2AddLiquidityErc20({ tokenA: owner, tokenB: router, amountADesired: "100", amountBDesired: "10", amountAMin: "99", amountBMin: "9", recipient: owner, deadline: "2000000000" }).startsWith("0xe8e33700"));
});

test("converts decimal values and protects pairing minimums", () => {
  assert.equal(decimalToBaseUnits("0.25", 18), "250000000000000000");
  assert.equal(decimalToBaseUnits("12.5", 6), "12500000");
  assert.equal(amountAfterSlippage("100000", 100), "99000");
});

test("reads the deployed token address from the factory event", () => {
  const token = "0x3333333333333333333333333333333333333333";
  const receipt = {
    logs: [{ address: router, topics: ["0x00", `0x${"0".repeat(24)}${token.slice(2)}`, `0x${"0".repeat(24)}${owner.slice(2)}`] }]
  };
  assert.equal(factoryAddressFromReceipt(receipt, router), token);
});
