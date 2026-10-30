import { SUPPORTED_CHAINS } from "./launch-plan.js";

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/**
 * This is the only chain-operation configuration file. It is bundled with the
 * site so deployment, pairing, and SNBL purchases do not call a Worker API,
 * quote service, aggregator, or API-key-backed endpoint.
 *
 * Fill only addresses you have independently verified, then redeploy the site.
 * Leave values blank to keep that route unavailable.
 */
export const SONICBLAST_DIRECT_CONFIG = Object.freeze({
  // Optional known factory deployments. If a selected chain is blank, the
  // connected wallet deploys the reviewed factory and stores it locally.
  factories: {
    // base: "0xYourReviewedFactoryAddress"
  },

  // Reviewed V2-compatible routers for token liquidity. The browser never
  // accepts a router address from a visitor or xterm command.
  pairing: {
    // base: {
    //   router: "0xYourReviewedV2Router",
    //   slippageBps: 100,
    //   assets: {
    //     USDC: { address: "0xYourReviewedUsdc", decimals: 6 },
    //     USDT: { address: "0xYourReviewedUsdt", decimals: 6 }
    //   }
    // }
  },

  // Direct, exact-input V2 purchase configuration for the visible Buy SNBL
  // button. `route` contains only optional intermediate token addresses; the
  // input asset and SNBL token are added automatically by the script builder.
  snbl: {
    chain: "base",
    tokenAddress: "",
    tokenSymbol: "SNBL",
    tokenDecimals: 18,
    router: "",
    wrappedNative: "",
    payment: {
      // Leave address empty for the chain-native asset. For an ERC-20 payment
      // token, use its verified address and exact decimals.
      address: "",
      symbol: "ETH",
      decimals: 18
    },
    route: [],
    slippageBps: 100
  }
});

function text(value) {
  return String(value ?? "").trim();
}

function address(value) {
  const candidate = text(value);
  return ADDRESS.test(candidate) ? candidate : "";
}

function integer(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function symbol(value, fallback) {
  const candidate = text(value).toUpperCase();
  return /^[A-Z0-9]{2,11}$/.test(candidate) ? candidate : fallback;
}

function nativeSymbol(chain) {
  return ({ ethereum: "ETH", base: "ETH", arbitrum: "ETH", optimism: "ETH", polygon: "POL", bsc: "BNB", avalanche: "AVAX" })[chain] || "ETH";
}

function pairingConfig(raw = {}) {
  const result = {};
  for (const [chain, chainInfo] of Object.entries(SUPPORTED_CHAINS)) {
    if (chainInfo.family !== "evm") continue;
    const entry = raw?.[chain];
    const router = address(entry?.router);
    if (!router) continue;
    const assets = {};
    for (const [assetSymbol, asset] of Object.entries(entry?.assets || {})) {
      const cleanSymbol = symbol(assetSymbol, "");
      const tokenAddress = address(asset?.address);
      if (cleanSymbol && tokenAddress) assets[cleanSymbol] = { address: tokenAddress, decimals: integer(asset?.decimals, 18, 0, 18) };
    }
    result[chain] = { router, slippageBps: integer(entry?.slippageBps, 100, 10, 1_000), assets };
  }
  return result;
}

/** Returns a validated, public configuration without requiring a network request. */
export function directWalletConfig(raw = SONICBLAST_DIRECT_CONFIG) {
  const factories = {};
  for (const [chain, chainInfo] of Object.entries(SUPPORTED_CHAINS)) {
    if (chainInfo.family !== "evm") continue;
    const factory = address(raw?.factories?.[chain]);
    if (factory) factories[chain] = factory;
  }

  const snblRaw = raw?.snbl || {};
  const chain = text(snblRaw.chain || "base").toLowerCase();
  const chainInfo = SUPPORTED_CHAINS[chain];
  const validChain = chainInfo?.family === "evm";
  const tokenAddress = address(snblRaw.tokenAddress);
  const router = address(snblRaw.router);
  const wrappedNative = address(snblRaw.wrappedNative);
  const rawPaymentAddress = text(snblRaw.payment?.address);
  const paymentAddress = address(rawPaymentAddress);
  const paymentIsNative = !paymentAddress;
  const rawRoute = (Array.isArray(snblRaw.route) ? snblRaw.route : []).filter((entry) => Boolean(text(entry)));
  const route = rawRoute.map(address);
  const routeKeys = route.map((entry) => entry.toLowerCase());
  const invalidPaymentAddress = Boolean(rawPaymentAddress && !paymentAddress);
  const invalidRoute = rawRoute.some((entry, index) => !route[index]);
  const duplicateRoute = new Set(routeKeys).size !== routeKeys.length;
  const paymentSymbol = symbol(snblRaw.payment?.symbol, validChain ? nativeSymbol(chain) : "ETH");
  const paymentDecimals = integer(snblRaw.payment?.decimals, 18, 0, 18);
  const tokenSymbol = symbol(snblRaw.tokenSymbol, "SNBL");
  const tokenDecimals = integer(snblRaw.tokenDecimals, 18, 0, 18);
  const duplicateEndpoint = route.some((entry) => entry.toLowerCase() === tokenAddress.toLowerCase() || entry.toLowerCase() === (paymentIsNative ? wrappedNative : paymentAddress).toLowerCase());
  const checkoutEnabled = Boolean(validChain && tokenAddress && router && wrappedNative && !invalidPaymentAddress && !invalidRoute && !duplicateRoute && !duplicateEndpoint);

  return {
    factories,
    pairing: pairingConfig(raw?.pairing),
    snbl: {
      checkoutEnabled,
      chain: validChain ? chain : "base",
      chainId: validChain ? chainInfo.chainId : 8453,
      chainLabel: validChain ? chainInfo.label : "Base",
      tokenAddress,
      tokenSymbol,
      tokenDecimals,
      router,
      wrappedNative,
      paymentAddress,
      paymentSymbol,
      paymentDecimals,
      paymentIsNative,
      route,
      defaultSlippageBps: integer(snblRaw.slippageBps, 100, 10, 1_000)
    }
  };
}
