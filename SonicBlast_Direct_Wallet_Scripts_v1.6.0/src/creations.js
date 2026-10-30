import { SUPPORTED_CHAINS } from "./launch-plan.js";

const allowedName = /^[\p{L}\p{N}][\p{L}\p{N} .,'&!_-]{1,63}$/u;
const allowedSymbol = /^[A-Z0-9]{2,12}$/;
const integer = /^(0|[1-9]\d*)$/;
const decimal = /^(0|[1-9]\d*)(\.\d{1,18})?$/;
const evmAddress = /^0x[a-fA-F0-9]{40}$/;
const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function text(value) {
  return String(value ?? "").trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isAddressForChain(address, chain) {
  return SUPPORTED_CHAINS[chain]?.family === "solana" ? solanaAddress.test(address) : evmAddress.test(address);
}

export function cleanRoomId(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function cleanHandle(value) {
  return text(value).replace(/[^\p{L}\p{N} _.-]/gu, "").slice(0, 32) || "guest";
}

export function cleanPeerId(value) {
  const peerId = text(value).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{7,63}$/.test(peerId) ? peerId : crypto.randomUUID();
}

export function normalizeCreationInput(input) {
  const chain = text(input.chain).toLowerCase();
  const chainConfig = SUPPORTED_CHAINS[chain];
  assert(chainConfig, "Choose a supported chain.");

  const name = text(input.name);
  const symbol = text(input.symbol).toUpperCase();
  const supply = text(input.supply);
  const decimals = Number(text(input.decimals || (chainConfig.family === "solana" ? 9 : 18)));
  const ownerAddress = text(input.ownerAddress);
  const liquidityAmount = text(input.liquidityAmount);
  const quoteAsset = text(input.quoteAsset || (chainConfig.family === "solana" ? "SOL" : "ETH"));
  const room = cleanRoomId(input.room);
  const tokenAddress = text(input.tokenAddress);
  const buyUrl = text(input.buyUrl);

  assert(allowedName.test(name), "Token name must be 2–64 letters, numbers, or simple punctuation.");
  assert(allowedSymbol.test(symbol), "Symbol must use 2–12 uppercase letters or numbers.");
  assert(integer.test(supply) && supply !== "0", "Supply must be a whole number greater than zero.");
  assert(Number.isInteger(decimals) && decimals >= 0 && decimals <= 18, "Decimals must be a whole number from 0 through 18.");
  assert(isAddressForChain(ownerAddress, chain), `Enter a valid ${chainConfig.family === "solana" ? "Solana" : "EVM"} owner address.`);
  assert(decimal.test(liquidityAmount) && Number(liquidityAmount) > 0, "Liquidity amount must be greater than zero.");
  assert(quoteAsset.length >= 2 && quoteAsset.length <= 32, "Choose a quote asset.");
  if (tokenAddress) assert(isAddressForChain(tokenAddress, chain), `Enter a valid ${chainConfig.family === "solana" ? "Solana mint" : "token contract"} address.`);
  if (buyUrl) {
    let parsed;
    try { parsed = new URL(buyUrl); } catch { throw new Error("Market link must be a complete https URL."); }
    assert(parsed.protocol === "https:", "Market link must use https.");
  }
  assert(!buyUrl || tokenAddress, "Add the deployed token address before publishing a market link.");

  return {
    chain,
    chainLabel: chainConfig.label,
    name,
    symbol,
    supply,
    decimals,
    ownerAddress,
    liquidityAmount,
    quoteAsset,
    room,
    tokenAddress,
    buyUrl,
    status: buyUrl && tokenAddress ? "live" : tokenAddress ? "deployed" : "planned"
  };
}

export function creationFromRow(row) {
  return {
    id: String(row.id),
    chain: String(row.chain),
    chainLabel: String(row.chain_label),
    name: String(row.name),
    symbol: String(row.symbol),
    supply: String(row.supply),
    decimals: Number(row.decimals),
    ownerAddress: String(row.owner_address),
    liquidityAmount: String(row.liquidity_amount),
    quoteAsset: String(row.quote_asset),
    room: String(row.room),
    tokenAddress: String(row.token_address || ""),
    buyUrl: String(row.buy_url || ""),
    status: String(row.status),
    heat: Number(row.heat),
    createdAt: Number(row.created_at)
  };
}
