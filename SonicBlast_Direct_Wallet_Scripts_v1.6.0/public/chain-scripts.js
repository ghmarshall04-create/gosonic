import {
  amountAfterSlippage,
  decimalToBaseUnits,
  decodeUint256Array,
  encodeCreateTokenCall,
  encodeErc20Approve,
  encodeV2AddLiquidityErc20,
  encodeV2AddLiquidityNative,
  encodeV2GetAmountsOut,
  encodeV2SwapExactNativeForTokens,
  encodeV2SwapExactTokensForTokens,
  isEvmAddress
} from "./wallet.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rpcQuantity(value) {
  return `0x${BigInt(String(value)).toString(16)}`;
}

function deadlineInTwentyMinutes() {
  return Math.floor(Date.now() / 1_000) + 20 * 60;
}

function verifiedPath(values) {
  assert(Array.isArray(values) && values.length >= 2 && values.length <= 5, "A direct V2 script needs a route of 2–5 verified token addresses.");
  values.forEach((value) => assert(isEvmAddress(value), "The direct V2 script contains an invalid token address."));
  for (let index = 1; index < values.length; index += 1) {
    assert(values[index].toLowerCase() !== values[index - 1].toLowerCase(), "The direct V2 script route cannot repeat adjacent assets.");
  }
  return values;
}

function directPath(config) {
  const input = config.paymentIsNative ? config.wrappedNative : config.paymentAddress;
  return verifiedPath([input, ...(config.route || []), config.tokenAddress]);
}

/**
 * A transparent description for xterm.js. These are fixed transaction plans,
 * not arbitrary shell code and not a remote execution format.
 */
export function scriptLines(script) {
  const rows = [
    `\x1b[1;36mSCRIPT ${script.kind}\x1b[0m`,
    `chain: ${script.chainLabel || script.chain}`,
    `signer: ${script.signer || "connect wallet"}`
  ];
  for (const line of script.lines || []) rows.push(line);
  return rows;
}

/** Builds the reviewed factory/token deployment plan from local form input. */
export function buildTokenDeploymentScript({ plan, artifact, factoryAddress = "", signer = "" }) {
  assert(plan?.chain && plan?.token, "Build a launch plan before creating a script.");
  assert(/^0x[0-9a-fA-F]+$/.test(artifact?.bytecode || ""), "The reviewed factory bytecode is unavailable.");
  const useExistingFactory = isEvmAddress(factoryAddress);
  const createData = encodeCreateTokenCall(artifact, plan.token);
  return {
    kind: "DEPLOY",
    chain: plan.chain,
    chainLabel: plan.chainLabel,
    signer,
    factoryAddress: useExistingFactory ? factoryAddress : "",
    factoryDeployment: useExistingFactory ? null : { data: artifact.bytecode },
    createToken: { to: factoryAddress || "<new factory>", data: createData },
    lines: [
      `token: ${plan.token.name} ($${plan.token.symbol})`,
      `supply: ${plan.token.supply} · decimals: ${plan.token.decimals}`,
      `owner: ${plan.token.ownerAddress}`,
      useExistingFactory ? `factory: ${factoryAddress}` : "factory: deploy the reviewed SonicBlastFactory first",
      "steps: wallet approves factory (if needed), then token creation"
    ]
  };
}

/** Builds exact approvals and a V2 liquidity call from the already-reviewed route configuration. */
export function buildV2LiquidityScript({ plan, tokenAddress, tokenAmount, quoteAmount, config, recipient, deadline = deadlineInTwentyMinutes() }) {
  assert(plan?.liquidity && plan?.token, "Build a launch plan before creating a pairing script.");
  assert(isEvmAddress(tokenAddress), "Deploy the token before creating a pairing script.");
  assert(isEvmAddress(config?.router), "A reviewed V2 router is required for pairing.");
  assert(isEvmAddress(recipient), "Connect the wallet that owns the initial token supply.");
  const tokenUnits = decimalToBaseUnits(tokenAmount, plan.token.decimals);
  const slippageBps = Number(config.slippageBps || 100);
  const approvals = [{ token: tokenAddress, spender: config.router, amount: tokenUnits, label: plan.token.symbol }];
  let transaction;
  let quoteUnits;
  if (plan.liquidity.mode === "native") {
    quoteUnits = decimalToBaseUnits(quoteAmount, 18);
    transaction = {
      to: config.router,
      value: rpcQuantity(quoteUnits),
      data: encodeV2AddLiquidityNative({
        token: tokenAddress,
        tokenAmount: tokenUnits,
        tokenAmountMin: amountAfterSlippage(tokenUnits, slippageBps),
        nativeAmountMin: amountAfterSlippage(quoteUnits, slippageBps),
        recipient,
        deadline
      })
    };
  } else {
    const asset = config.assets?.[String(plan.liquidity.quoteAsset || "").toUpperCase()];
    assert(isEvmAddress(asset?.address), `${plan.liquidity.quoteAsset} is not in the reviewed pairing configuration for ${plan.chainLabel}.`);
    quoteUnits = decimalToBaseUnits(quoteAmount, asset.decimals);
    approvals.push({ token: asset.address, spender: config.router, amount: quoteUnits, label: plan.liquidity.quoteAsset });
    transaction = {
      to: config.router,
      data: encodeV2AddLiquidityErc20({
        tokenA: tokenAddress,
        tokenB: asset.address,
        amountADesired: tokenUnits,
        amountBDesired: quoteUnits,
        amountAMin: amountAfterSlippage(tokenUnits, slippageBps),
        amountBMin: amountAfterSlippage(quoteUnits, slippageBps),
        recipient,
        deadline
      })
    };
  }
  return {
    kind: "PAIR",
    chain: plan.chain,
    chainLabel: plan.chainLabel,
    signer: recipient,
    router: config.router,
    approvals,
    transaction,
    deadline,
    lines: [
      `router: ${config.router}`,
      `pair: ${tokenAmount} ${plan.token.symbol} + ${quoteAmount} ${plan.liquidity.quoteAsset}`,
      `slippage protection: ${slippageBps / 100}% · deadline: ${new Date(deadline * 1_000).toLocaleTimeString()}`,
      `approvals: ${approvals.map((approval) => `${approval.label} exact amount`).join(", ")}`,
      "final step: wallet-approved V2 add-liquidity transaction"
    ]
  };
}

/** Builds the direct router read call; no HTTP quote API or aggregator is involved. */
export function buildDirectV2QuoteScript({ config, amountIn, signer = "" }) {
  assert(config?.checkoutEnabled, "Direct SNBL purchase is not configured in network-config.js.");
  assert(isEvmAddress(config.router), "A reviewed direct V2 router is required.");
  const path = directPath(config);
  const inputAmount = BigInt(String(amountIn));
  assert(inputAmount > 0n, "Enter an amount greater than zero.");
  return {
    kind: "BUY QUOTE",
    chain: config.chain,
    chainLabel: config.chainLabel,
    signer,
    router: config.router,
    path,
    amountIn: inputAmount.toString(),
    transaction: { to: config.router, data: encodeV2GetAmountsOut({ amountIn: inputAmount, path }) },
    lines: [
      `router: ${config.router}`,
      `route: ${path.join(" → ")}`,
      `input: ${inputAmount.toString()} base units`,
      "read-only step: getAmountsOut through the connected wallet's network"
    ]
  };
}

/** Validates a direct V2 read result before it is used to form a signed transaction. */
export function quotedV2Amounts(quoteScript, result) {
  const amounts = decodeUint256Array(result);
  assert(amounts.length === quoteScript.path.length, "The V2 router returned a quote for a different route.");
  assert(amounts[0] === quoteScript.amountIn, "The V2 router returned a quote for a different input amount.");
  assert(BigInt(amounts.at(-1)) > 0n, "The direct V2 route currently returns zero SNBL.");
  return amounts;
}

/** Builds the wallet-signed direct V2 swap after the wallet's own RPC supplied a quote. */
export function buildDirectV2PurchaseScript({ config, quoteScript, quoteAmounts, recipient, slippageBps, deadline = deadlineInTwentyMinutes() }) {
  assert(isEvmAddress(recipient), "Connect an EVM wallet before building the purchase script.");
  assert(quoteScript?.router === config?.router, "The quote was not built for the configured direct V2 router.");
  const amounts = Array.isArray(quoteAmounts) ? quoteAmounts : [];
  assert(amounts.length === quoteScript.path.length, "Build a fresh direct quote before buying SNBL.");
  const inputAmount = quoteScript.amountIn;
  const quotedOutput = amounts.at(-1);
  const protection = Number(slippageBps ?? config.defaultSlippageBps);
  const minOutput = amountAfterSlippage(quotedOutput, protection);
  const approval = config.paymentIsNative ? null : {
    token: config.paymentAddress,
    spender: config.router,
    amount: inputAmount,
    label: config.paymentSymbol
  };
  const transaction = config.paymentIsNative
    ? {
      to: config.router,
      value: rpcQuantity(inputAmount),
      data: encodeV2SwapExactNativeForTokens({ amountOutMin: minOutput, path: quoteScript.path, recipient, deadline })
    }
    : {
      to: config.router,
      data: encodeV2SwapExactTokensForTokens({ amountIn: inputAmount, amountOutMin: minOutput, path: quoteScript.path, recipient, deadline })
    };
  return {
    kind: "BUY SNBL",
    chain: config.chain,
    chainLabel: config.chainLabel,
    signer: recipient,
    router: config.router,
    path: quoteScript.path,
    amountIn: inputAmount,
    quotedOutput,
    minOutput,
    approval,
    transaction,
    deadline,
    lines: [
      `router: ${config.router}`,
      `route: ${quoteScript.path.join(" → ")}`,
      `quoted output: ${quotedOutput} base units`,
      `minimum output: ${minOutput} base units (${protection / 100}% protection)`,
      approval ? `approval: exact ${approval.label} input only` : "payment: chain-native asset; no ERC-20 approval",
      "final step: wallet-approved direct V2 exact-input swap"
    ]
  };
}
