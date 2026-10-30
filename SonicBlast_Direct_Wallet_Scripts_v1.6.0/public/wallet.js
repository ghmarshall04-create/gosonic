export const EVM_CHAINS = Object.freeze({
  ethereum: { chainId: 1, chainIdHex: "0x1", label: "Ethereum", nativeSymbol: "ETH", explorer: "https://etherscan.io" },
  base: { chainId: 8453, chainIdHex: "0x2105", label: "Base", nativeSymbol: "ETH", explorer: "https://basescan.org" },
  arbitrum: { chainId: 42161, chainIdHex: "0xa4b1", label: "Arbitrum One", nativeSymbol: "ETH", explorer: "https://arbiscan.io" },
  optimism: { chainId: 10, chainIdHex: "0xa", label: "Optimism", nativeSymbol: "ETH", explorer: "https://optimistic.etherscan.io" },
  polygon: { chainId: 137, chainIdHex: "0x89", label: "Polygon", nativeSymbol: "POL", explorer: "https://polygonscan.com" },
  bsc: { chainId: 56, chainIdHex: "0x38", label: "BNB Chain", nativeSymbol: "BNB", explorer: "https://bscscan.com" },
  avalanche: { chainId: 43114, chainIdHex: "0xa86a", label: "Avalanche C-Chain", nativeSymbol: "AVAX", explorer: "https://snowtrace.io" }
});

export const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export function isEvmAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}

export function shortAddress(value = "") {
  const address = String(value || "");
  return address.length <= 13 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function chainForKey(key) {
  return EVM_CHAINS[String(key || "").toLowerCase()] || null;
}

export function chainForId(chainId) {
  return Object.entries(EVM_CHAINS).find(([, chain]) => chain.chainId === Number(chainId)) || null;
}

function normalizedChainId(value) {
  if (typeof value === "number") return value;
  const text = String(value || "");
  return text.startsWith("0x") ? Number.parseInt(text, 16) : Number.parseInt(text, 10);
}

function browserEvmProvider() {
  const candidate = window.ethereum;
  if (!candidate) return null;
  const providers = Array.isArray(candidate.providers) ? candidate.providers : [candidate];
  return providers.find((provider) => provider?.isMetaMask) || providers.find((provider) => provider?.isCoinbaseWallet) || providers[0] || null;
}

function browserSolanaProvider() {
  return window.phantom?.solana || window.solana || null;
}

function errorText(error, fallback) {
  if (error?.code === 4001 || error?.rpcCode === 4001) return "Wallet connection was cancelled.";
  return error?.message || fallback;
}

export class BrowserWallet {
  constructor({ onChange = () => {} } = {}) {
    this.onChange = onChange;
    this.state = { connected: false, family: "", address: "", chainId: null };
    this.evmProvider = null;
    this.solanaProvider = null;
    this.evmEventsBound = false;
    this.solanaEventsBound = false;
  }

  emit(next) {
    this.state = { ...this.state, ...next };
    this.onChange({ ...this.state });
    return this.state;
  }

  async connect(chainKey = "base") {
    return String(chainKey).toLowerCase() === "solana" ? this.connectSolana() : this.connectEvm();
  }

  async connectEvm() {
    const provider = browserEvmProvider();
    if (!provider?.request) {
      throw new Error("Open SonicBlast in MetaMask, Coinbase Wallet, or another EVM wallet browser, then tap Connect wallet again.");
    }
    this.evmProvider = provider;
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const address = accounts?.[0];
    if (!isEvmAddress(address)) throw new Error("Your wallet did not provide a public EVM address.");
    const chainId = normalizedChainId(await provider.request({ method: "eth_chainId" }));
    this.bindEvmEvents(provider);
    return this.emit({ connected: true, family: "evm", address, chainId });
  }

  async connectSolana() {
    const provider = browserSolanaProvider();
    if (!provider?.connect) {
      throw new Error("Open SonicBlast in Phantom or another Solana wallet browser, then tap Connect wallet again.");
    }
    this.solanaProvider = provider;
    const result = await provider.connect();
    const address = result?.publicKey?.toString?.() || provider.publicKey?.toString?.();
    if (!address) throw new Error("Your wallet did not provide a public Solana address.");
    this.bindSolanaEvents(provider);
    return this.emit({ connected: true, family: "solana", address, chainId: "mainnet-beta" });
  }

  bindEvmEvents(provider) {
    if (this.evmEventsBound || !provider?.on) return;
    this.evmEventsBound = true;
    provider.on("accountsChanged", async (accounts) => {
      const address = accounts?.[0];
      if (!isEvmAddress(address)) return this.emit({ connected: false, family: "", address: "", chainId: null });
      let chainId = this.state.chainId;
      try { chainId = normalizedChainId(await provider.request({ method: "eth_chainId" })); } catch { /* Wallet state remains usable. */ }
      this.emit({ connected: true, family: "evm", address, chainId });
    });
    provider.on("chainChanged", (chainId) => {
      this.emit({ connected: Boolean(this.state.address), family: "evm", chainId: normalizedChainId(chainId) });
    });
  }

  bindSolanaEvents(provider) {
    if (this.solanaEventsBound || !provider?.on) return;
    this.solanaEventsBound = true;
    provider.on("accountChanged", (publicKey) => {
      const address = publicKey?.toString?.() || "";
      this.emit({ connected: Boolean(address), family: address ? "solana" : "", address, chainId: address ? "mainnet-beta" : null });
    });
    provider.on("disconnect", () => this.emit({ connected: false, family: "", address: "", chainId: null }));
  }

  async switchEvmChain(chainKey) {
    const chain = chainForKey(chainKey);
    if (!chain) throw new Error("Choose a supported EVM network.");
    const provider = this.evmProvider || browserEvmProvider();
    if (!provider?.request) throw new Error("Connect an EVM wallet first.");
    this.evmProvider = provider;
    const current = normalizedChainId(await provider.request({ method: "eth_chainId" }));
    if (current !== chain.chainId) {
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.chainIdHex }] });
      } catch (error) {
        if (error?.code === 4902) throw new Error(`Add ${chain.label} in your wallet, then switch to it and try again.`);
        throw new Error(errorText(error, `Could not switch to ${chain.label}.`));
      }
    }
    const accounts = await provider.request({ method: "eth_accounts" });
    const address = accounts?.[0] || this.state.address;
    if (!isEvmAddress(address)) throw new Error("Connect an EVM wallet first.");
    return this.emit({ connected: true, family: "evm", address, chainId: chain.chainId });
  }

  async sendEvmTransaction(transaction) {
    if (this.state.family !== "evm" || !isEvmAddress(this.state.address)) throw new Error("Connect an EVM wallet first.");
    const provider = this.evmProvider || browserEvmProvider();
    if (!provider?.request) throw new Error("Wallet connection is unavailable. Reconnect and try again.");
    const payload = { from: this.state.address, ...transaction };
    return provider.request({ method: "eth_sendTransaction", params: [payload] });
  }

  async getReceipt(hash) {
    const provider = this.evmProvider || browserEvmProvider();
    if (!provider?.request) throw new Error("Wallet connection is unavailable.");
    return provider.request({ method: "eth_getTransactionReceipt", params: [hash] });
  }

  /** Read-only RPC call routed through the connected wallet's selected network. */
  async callEvm(transaction, blockTag = "latest") {
    if (this.state.family !== "evm" || !isEvmAddress(this.state.address)) throw new Error("Connect an EVM wallet first.");
    const provider = this.evmProvider || browserEvmProvider();
    if (!provider?.request) throw new Error("Wallet connection is unavailable. Reconnect and try again.");
    return provider.request({ method: "eth_call", params: [{ ...transaction }, blockTag] });
  }

  /** Confirms that a reviewed address currently has code on the chosen chain. */
  async getCode(address, blockTag = "latest") {
    if (!isEvmAddress(address)) throw new Error("A valid contract address is required.");
    const provider = this.evmProvider || browserEvmProvider();
    if (!provider?.request) throw new Error("Wallet connection is unavailable. Reconnect and try again.");
    return provider.request({ method: "eth_getCode", params: [address, blockTag] });
  }

  async watchAsset({ address, symbol, decimals, image }) {
    if (!isEvmAddress(address)) throw new Error("SNBL contract address is not configured.");
    const provider = this.evmProvider || browserEvmProvider();
    if (!provider?.request) throw new Error("Connect an EVM wallet first.");
    return provider.request({
      method: "wallet_watchAsset",
      params: { type: "ERC20", options: { address, symbol: String(symbol || "SNBL").slice(0, 11), decimals: Number(decimals), image: image || undefined } }
    });
  }
}

function padWord(hex) {
  const normalized = String(hex).replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]*$/.test(normalized) || normalized.length > 64) throw new Error("Invalid ABI value.");
  return normalized.padStart(64, "0");
}

function padBytes(hex) {
  const normalized = String(hex).replace(/^0x/i, "");
  return normalized.padEnd(Math.ceil(normalized.length / 64) * 64, "0");
}

function encodeString(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${padWord(bytes.length.toString(16))}${padBytes(hex)}`;
}

function encodeAddress(value) {
  if (!isEvmAddress(value)) throw new Error("A valid public EVM address is required.");
  return padWord(value.slice(2).toLowerCase());
}

function encodeUint(value) {
  const amount = BigInt(String(value));
  if (amount < 0n) throw new Error("A token amount cannot be negative.");
  return padWord(amount.toString(16));
}

/** Encode the reviewed SonicBlastFactory call without loading a signing library in the browser. */
export function encodeCreateTokenCall(artifact, { name, symbol, decimals, supply, ownerAddress }) {
  const selector = artifact?.methodIdentifiers?.["createToken(string,string,uint8,uint256,address)"];
  if (!/^[a-fA-F0-9]{8}$/.test(selector || "")) throw new Error("SonicBlast factory artifact is unavailable.");
  const nameData = encodeString(name);
  const symbolData = encodeString(symbol);
  const nameOffset = 32n * 5n;
  const symbolOffset = nameOffset + BigInt(nameData.length / 2);
  const decimalValue = BigInt(Number(decimals));
  const supplyValue = BigInt(String(supply));
  if (decimalValue < 0n || decimalValue > 18n || supplyValue <= 0n) throw new Error("Token supply or decimals are invalid.");
  const head = [
    padWord(nameOffset.toString(16)),
    padWord(symbolOffset.toString(16)),
    padWord(decimalValue.toString(16)),
    padWord(supplyValue.toString(16)),
    encodeAddress(ownerAddress)
  ].join("");
  return `0x${selector}${head}${nameData}${symbolData}`;
}

export function decimalToBaseUnits(value, decimals = 18) {
  const amount = String(value || "").trim();
  const places = Number(decimals);
  if (!Number.isInteger(places) || places < 0 || places > 18) throw new Error("Token decimals are invalid.");
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(amount)) throw new Error("Enter a valid decimal amount.");
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > places) throw new Error(`Use no more than ${places} decimal places.`);
  const units = BigInt(`${whole}${fraction.padEnd(places, "0")}`.replace(/^0+(?=\d)/, "") || "0");
  if (units <= 0n) throw new Error("Enter an amount greater than zero.");
  return units.toString();
}

export function amountAfterSlippage(amount, slippageBps = 100) {
  const units = BigInt(String(amount));
  const bps = BigInt(Number(slippageBps));
  if (units <= 0n || bps < 0n || bps >= 10_000n) throw new Error("Liquidity protection is invalid.");
  return ((units * (10_000n - bps)) / 10_000n).toString();
}

/** ERC-20 approve(spender, amount), using the exact amount rather than an unlimited allowance. */
export function encodeErc20Approve({ spender, amount }) {
  return `0x095ea7b3${encodeAddress(spender)}${encodeUint(amount)}`;
}

/** ERC-20 allowance(owner, spender) read call for exact-approval handling. */
export function encodeErc20Allowance({ owner, spender }) {
  return `0xdd62ed3e${encodeAddress(owner)}${encodeAddress(spender)}`;
}

export function decodeUint256(data) {
  const hex = String(data || "").replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 64) throw new Error("The contract returned an invalid uint256 value.");
  return BigInt(`0x${hex.slice(0, 64)}`);
}

/** Uniswap V2-compatible addLiquidityETH(address,uint256,uint256,uint256,address,uint256). */
export function encodeV2AddLiquidityNative({ token, tokenAmount, tokenAmountMin, nativeAmountMin, recipient, deadline }) {
  return `0xf305d719${encodeAddress(token)}${encodeUint(tokenAmount)}${encodeUint(tokenAmountMin)}${encodeUint(nativeAmountMin)}${encodeAddress(recipient)}${encodeUint(deadline)}`;
}

/** Uniswap V2-compatible addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256). */
export function encodeV2AddLiquidityErc20({ tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, recipient, deadline }) {
  return `0xe8e33700${encodeAddress(tokenA)}${encodeAddress(tokenB)}${encodeUint(amountADesired)}${encodeUint(amountBDesired)}${encodeUint(amountAMin)}${encodeUint(amountBMin)}${encodeAddress(recipient)}${encodeUint(deadline)}`;
}

function encodeAddressArray(values) {
  if (!Array.isArray(values) || values.length < 2 || values.length > 5) throw new Error("A V2 route must contain 2–5 verified token addresses.");
  return `${encodeUint(values.length)}${values.map(encodeAddress).join("")}`;
}

/** Uniswap V2-compatible getAmountsOut(uint256,address[]) read call. */
export function encodeV2GetAmountsOut({ amountIn, path }) {
  const encodedPath = encodeAddressArray(path);
  return `0xd06ca61f${encodeUint(amountIn)}${padWord("40")}${encodedPath}`;
}

/** Uniswap V2-compatible swapExactETHForTokens(uint256,address[],address,uint256). */
export function encodeV2SwapExactNativeForTokens({ amountOutMin, path, recipient, deadline }) {
  const encodedPath = encodeAddressArray(path);
  return `0x7ff36ab5${encodeUint(amountOutMin)}${padWord("80")}${encodeAddress(recipient)}${encodeUint(deadline)}${encodedPath}`;
}

/** Uniswap V2-compatible swapExactTokensForTokens(uint256,uint256,address[],address,uint256). */
export function encodeV2SwapExactTokensForTokens({ amountIn, amountOutMin, path, recipient, deadline }) {
  const encodedPath = encodeAddressArray(path);
  return `0x38ed1739${encodeUint(amountIn)}${encodeUint(amountOutMin)}${padWord("a0")}${encodeAddress(recipient)}${encodeUint(deadline)}${encodedPath}`;
}

/** Decodes the dynamic uint256[] result returned by a V2 getAmountsOut call. */
export function decodeUint256Array(data) {
  const hex = String(data || "").replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 128 || hex.length % 64 !== 0) throw new Error("The V2 router returned an invalid quote.");
  const wordAt = (byteOffset) => {
    const start = byteOffset * 2;
    const word = hex.slice(start, start + 64);
    if (word.length !== 64) throw new Error("The V2 router returned an incomplete quote.");
    return BigInt(`0x${word}`);
  };
  const offset = wordAt(0);
  if (offset > BigInt(Number.MAX_SAFE_INTEGER) || offset % 32n !== 0n) throw new Error("The V2 router returned an invalid quote offset.");
  const length = wordAt(Number(offset));
  if (length < 2n || length > 5n || length > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("The V2 router returned an invalid route quote.");
  const values = [];
  for (let index = 0; index < Number(length); index += 1) values.push(wordAt(Number(offset) + 32 + index * 32).toString());
  return values;
}

export function factoryAddressFromReceipt(receipt, factoryAddress) {
  const expectedFactory = String(factoryAddress || "").toLowerCase();
  const log = (receipt?.logs || []).find((entry) => String(entry?.address || "").toLowerCase() === expectedFactory && Array.isArray(entry?.topics) && entry.topics.length >= 3);
  const tokenTopic = log?.topics?.[1];
  if (!/^0x[a-fA-F0-9]{64}$/.test(tokenTopic || "")) return "";
  return `0x${tokenTopic.slice(-40)}`;
}

export function formatUnits(value, decimals = 18, maximumFractionDigits = 6) {
  try {
    const raw = BigInt(String(value ?? "0"));
    const places = BigInt(10) ** BigInt(decimals);
    const whole = raw / places;
    const fraction = (raw % places).toString().padStart(Number(decimals), "0").slice(0, maximumFractionDigits).replace(/0+$/, "");
    return fraction ? `${whole.toLocaleString()}.${fraction}` : whole.toLocaleString();
  } catch {
    return "—";
  }
}

export function explorerTransactionUrl(chainKey, hash) {
  const chain = chainForKey(chainKey);
  return chain && /^0x[a-fA-F0-9]{64}$/.test(String(hash || "")) ? `${chain.explorer}/tx/${hash}` : "";
}
