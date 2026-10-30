import {
  BrowserWallet,
  chainForId,
  decimalToBaseUnits,
  decodeUint256,
  encodeErc20Approve,
  encodeErc20Allowance,
  explorerTransactionUrl,
  factoryAddressFromReceipt,
  formatUnits,
  isEvmAddress,
  shortAddress
} from "./wallet.js";
import { SonicTerminal, terminalHelp } from "./console.js";
import { buildLaunchPlan } from "./launch-plan.js";
import { directWalletConfig } from "./network-config.js";
import { FACTORY_ARTIFACT } from "./factory-artifact.js";
import {
  buildDirectV2PurchaseScript,
  buildDirectV2QuoteScript,
  buildTokenDeploymentScript,
  buildV2LiquidityScript,
  quotedV2Amounts,
  scriptLines
} from "./chain-scripts.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const toast = $("#toast");
const installButton = $("#installButton");
const launchModal = $("#launchModal");
const launchFlow = $("#launchFlow");
const flowSteps = $$(".flow-step");
const flowNav = $("#flowNav");
const flowBack = $("#flowBack");
const flowNext = $("#flowNext");
const flowReview = $("#flowReview");
const flowStepLabel = $("#flowStepLabel");
const flowStepHint = $("#flowStepHint");
const flowProgressBar = $("#flowProgressBar");
const fieldMessage = $("#fieldMessage");
const flowChain = $("#flowChain");
const flowDecimals = $("#flowDecimals");
const flowQuoteAsset = $("#flowQuoteAsset");
const flowLiquidityMode = $("#flowLiquidityMode");
const nativeAssetToggle = $("#nativeAssetToggle");
const stableAssetToggle = $("#stableAssetToggle");
const nativeAssetLabel = $("#nativeAssetLabel");
const stablecoinList = $("#stablecoinList");
const liquidityAmountLabel = $("#liquidityAmountLabel");
const flowLiquidity = $("#flowLiquidity");
const buySNBLButton = $("#buySNBL");
const flowOwner = $("#flowOwner");
const flowOwnerLabel = $("#flowOwnerLabel");
const supplyCaption = $("#supplyCaption");
const liquidityCaption = $("#liquidityCaption");
const listingDetails = $("#listingDetails");
const listingRoom = $("#listingRoom");
const listingTokenAddress = $("#listingTokenAddress");
const listingTokenAddressLabel = $("#tokenAddressLabel");
const listingBuyUrl = $("#listingBuyUrl");
const planChecklist = $("#planChecklist");
const smartNudge = $("#smartNudge");
const smartNudgeTitle = $("#smartNudgeTitle");
const smartNudgeText = $("#smartNudgeText");
const smartReview = $("#smartReview");
const smartScore = $("#smartScore");
const smartLabel = $("#smartLabel");
const smartSummary = $("#smartSummary");
const smartSignals = $("#smartSignals");
const smartNextAction = $("#smartNextAction");
const creationGrid = $("#creationGrid");
const creationCount = $("#creationCount");
const heatTotal = $("#heatTotal");
const connectWalletButton = $("#connectWalletButton");
const walletModal = $("#walletModal");
const buyModal = $("#buyModal");
const walletCurrentState = $("#walletCurrentState");
const walletReviewCopy = $("#walletReviewCopy");
const buyCheckout = $("#buyCheckout");
const buyCheckoutStatus = $("#buyCheckoutStatus");
const buyWalletAddress = $("#buyWalletAddress");
const buyPaymentAsset = $("#buyPaymentAsset");
const buyAmount = $("#buyAmount");
const buySlippage = $("#buySlippage");
const snblQuote = $("#snblQuote");
const quoteSellAmount = $("#quoteSellAmount");
const quoteBuyAmount = $("#quoteBuyAmount");
const quoteWarning = $("#quoteWarning");
const approveSnblPayment = $("#approveSnblPayment");
const executeSnblBuy = $("#executeSnblBuy");
const pairTokenAmount = $("#pairTokenAmount");
const pairQuoteAmount = $("#pairQuoteAmount");

const roomName = $("#roomName");
const displayName = $("#displayName");
const activeRoom = $("#activeRoom");
const presence = $("#presence");
const roomStatus = $("#roomStatus");
const messageList = $("#messageList");
const messageForm = $("#messageForm");
const messageInput = $("#messageInput");
const sendButton = messageForm.querySelector("button");
const shareRoomButton = $("#shareRoom");
const voiceCallButton = $("#voiceCallButton");
const videoCallButton = $("#videoCallButton");
const muteButton = $("#muteButton");
const cameraButton = $("#cameraButton");
const endCallButton = $("#endCallButton");
const callStatus = $("#callStatus");
const callEmpty = $("#callEmpty");
const localTile = $("#localTile");
const localPreview = $("#localPreview");
const remotePeers = $("#remotePeers");

const TOTAL_FLOW_STEPS = 7;
const flowHints = [
  "Choose a chain",
  "Name the creation",
  "Set the ticker",
  "Lock the supply",
  "Set the public owner",
  "Set opening liquidity",
  "Optional metadata"
];
const chainDefaults = {
  ethereum: { decimals: "18", quote: "ETH", native: "ETH" },
  base: { decimals: "18", quote: "ETH", native: "ETH" },
  arbitrum: { decimals: "18", quote: "ETH", native: "ETH" },
  optimism: { decimals: "18", quote: "ETH", native: "ETH" },
  polygon: { decimals: "18", quote: "POL", native: "POL" },
  bsc: { decimals: "18", quote: "BNB", native: "BNB" },
  avalanche: { decimals: "18", quote: "AVAX", native: "AVAX" },
  solana: { decimals: "9", quote: "SOL", native: "SOL" }
};

const liquidityProfiles = {
  ethereum: { stables: [{ symbol: "USDC", name: "USD Coin" }, { symbol: "USDT", name: "Tether" }, { symbol: "DAI", name: "Dai" }] },
  base: { stables: [{ symbol: "USDC", name: "USD Coin" }, { symbol: "USDbC", name: "Bridged USDC" }, { symbol: "DAI", name: "Dai" }] },
  arbitrum: { stables: [{ symbol: "USDC", name: "USD Coin" }, { symbol: "USDT", name: "Tether" }, { symbol: "DAI", name: "Dai" }] },
  optimism: { stables: [{ symbol: "USDC", name: "USD Coin" }, { symbol: "USDT", name: "Tether" }, { symbol: "DAI", name: "Dai" }] },
  polygon: { stables: [{ symbol: "USDC", name: "USD Coin" }, { symbol: "USDT", name: "Tether" }, { symbol: "DAI", name: "Dai" }] },
  bsc: { stables: [{ symbol: "USDT", name: "Tether" }, { symbol: "USDC", name: "USD Coin" }, { symbol: "FDUSD", name: "First Digital USD" }] },
  avalanche: { stables: [{ symbol: "USDC", name: "USD Coin" }, { symbol: "USDT", name: "Tether" }, { symbol: "DAI", name: "Dai" }] },
  solana: { stables: [{ symbol: "USDC", name: "USD Coin" }, { symbol: "USDT", name: "Tether" }, { symbol: "PYUSD", name: "PayPal USD" }] }
};

let deferredInstall;
let flowStep = 0;
let currentPlan;
let currentPublishedCreation;
let editingCreation;
let activeLiquidityMode = "native";
let selectedStablecoin = "";
let snblConfig = { checkoutEnabled: false };
let factoryConfig = {};
let pairingConfig = {};
let currentSnblScript;
let socket;
let currentRoom;
let localStream;
let callMode = "off";
let muted = false;
let cameraOff = false;
let rtcConfig = { iceServers: [] };
const peerDirectory = new Map();
const peerConnections = new Map();
const pendingCandidates = new Map();
const makingOffers = new Set();
const clientId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `peer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const wallet = new BrowserWallet({ onChange: handleWalletStateChange });
const sonicTerminal = new SonicTerminal({ container: $("#xtermConsole"), onCommand: handleTerminalCommand });

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 2_600);
}

function readLocal(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeLocal(key, value) {
  try { localStorage.setItem(key, value); } catch { /* a private browser may decline local storage */ }
}

function closeBodyModalIfIdle() {
  if (!$$(".modal.open").length) document.body.classList.remove("modal-open");
}

function openWalletModal() {
  walletModal.classList.add("open");
  walletModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  updateWalletUi(wallet.state);
  setTimeout(() => $("#connectEvmWallet")?.focus(), 60);
}

function closeWalletModal() {
  walletModal.classList.remove("open");
  walletModal.setAttribute("aria-hidden", "true");
  closeBodyModalIfIdle();
}

function openBuyModal() {
  buyModal.classList.add("open");
  buyModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  refreshBuyCheckout();
  setTimeout(() => (snblConfig.checkoutEnabled ? $("#buyConnectWallet") : $("#closeBuy"))?.focus(), 60);
}

function closeBuyModal() {
  buyModal.classList.remove("open");
  buyModal.setAttribute("aria-hidden", "true");
  closeBodyModalIfIdle();
}

function openWalletBrowser() {
  const dappPath = `${location.host}${location.pathname}${location.search}${location.hash}`;
  location.assign(`https://metamask.app.link/dapp/${dappPath}`);
}

function walletExpectedFamily(chain = flowChain.value) {
  return chain === "solana" ? "solana" : "evm";
}

function walletText(state = wallet.state) {
  if (!state?.connected) return "No wallet connected yet.";
  const network = state.family === "evm" ? chainForId(state.chainId)?.[1]?.label || `Chain ${state.chainId}` : "Solana";
  return `${shortAddress(state.address)} connected on ${network}.`;
}

function updateWalletUi(state = wallet.state) {
  const connected = Boolean(state?.connected && state.address);
  connectWalletButton.textContent = connected ? shortAddress(state.address) : "Connect wallet";
  connectWalletButton.classList.toggle("connected", connected);
  connectWalletButton.setAttribute("aria-label", connected ? `Wallet connected: ${state.address}` : "Connect wallet");
  walletCurrentState.textContent = walletText(state);
  buyWalletAddress.textContent = connected ? shortAddress(state.address) : "Not connected";
  if (currentPlan) {
    walletReviewCopy.textContent = connected
      ? `${shortAddress(state.address)} is connected. Review every address, amount, and network in your wallet before confirming.`
      : "Connect a wallet to use its public address and review the exact on-chain transaction. SonicBlast never asks for a recovery phrase.";
  }
}

function handleWalletStateChange(state) {
  updateWalletUi(state);
  const expected = walletExpectedFamily();
  if (state.connected && state.family === expected && !flowOwner.value.trim()) {
    flowOwner.value = state.address;
    updateSmartNudge();
  }
}

async function connectWalletForChain(chain = flowChain.value, { close = true } = {}) {
  const requestedChain = chain === "solana" ? "solana" : chain;
  const state = await wallet.connect(requestedChain);
  if (requestedChain !== "solana") await wallet.switchEvmChain(requestedChain);
  if (walletExpectedFamily(requestedChain) === wallet.state.family && !flowOwner.value.trim()) flowOwner.value = wallet.state.address;
  updateWalletUi(wallet.state);
  if (close) closeWalletModal();
  showToast(`Wallet connected: ${shortAddress(wallet.state.address)}.`);
  return wallet.state;
}

function useConnectedWalletAsOwner() {
  const expected = walletExpectedFamily();
  if (!wallet.state.connected || wallet.state.family !== expected) throw new Error("Connect a wallet for the selected network first.");
  flowOwner.value = wallet.state.address;
  if (currentPlan?.token) currentPlan.token.ownerAddress = wallet.state.address;
  updateReview();
  sonicTerminal.success(`Using ${shortAddress(wallet.state.address)} as the public token owner.`);
}

function loadDirectWalletConfig() {
  const config = directWalletConfig();
  snblConfig = config.snbl;
  factoryConfig = config.factories;
  pairingConfig = config.pairing;
  refreshBuyCheckout();
}

function refreshBuyCheckout() {
  const enabled = Boolean(snblConfig?.checkoutEnabled);
  buyCheckout.hidden = !enabled;
  buyCheckoutStatus.className = `checkout-status${enabled ? " ready" : " error"}`;
  if (!enabled) {
    buyCheckoutStatus.textContent = "SNBL direct purchase is not open yet. Add the verified V2 router, wrapped native asset, and SNBL address to public/network-config.js, then redeploy.";
    snblQuote.hidden = true;
    return;
  }
  buyCheckoutStatus.textContent = `Buy ${snblConfig.tokenSymbol || "SNBL"} with ${snblConfig.paymentSymbol || "the network token"} through the reviewed V2 router on ${snblConfig.chainLabel || "the configured network"}. The quote and transaction are read directly through your wallet's network connection.`;
  buyPaymentAsset.textContent = snblConfig.paymentSymbol || "network token";
  if (!buyAmount.placeholder || buyAmount.placeholder === "0.10") buyAmount.placeholder = snblConfig.paymentIsNative ? "0.10" : "100";
  const configuredSlippage = String(snblConfig.defaultSlippageBps || "100");
  buySlippage.value = [...buySlippage.options].some((option) => option.value === configuredSlippage) ? configuredSlippage : "100";
  updateWalletUi(wallet.state);
}

async function connectForSnblCheckout() {
  if (!snblConfig.checkoutEnabled) throw new Error("SNBL checkout is not configured yet.");
  await connectWalletForChain(snblConfig.chain, { close: false });
  buyWalletAddress.textContent = shortAddress(wallet.state.address);
}

function hasContractCode(code) {
  return /^0x[0-9a-fA-F]{2,}$/.test(String(code || ""));
}

async function prepareSnblPurchase() {
  if (!snblConfig.checkoutEnabled) throw new Error("SNBL checkout is not configured yet.");
  if (!wallet.state.connected || wallet.state.family !== "evm") await connectForSnblCheckout();
  await wallet.switchEvmChain(snblConfig.chain);
  const amount = buyAmount.value.trim();
  if (!amount) throw new Error(`Enter the amount of ${snblConfig.paymentSymbol || "the payment asset"} to use.`);
  const amountIn = decimalToBaseUnits(amount, snblConfig.paymentDecimals);
  const button = $("#prepareSnblBuy");
  button.disabled = true;
  button.textContent = "Reading router…";
  try {
    const quoteScript = buildDirectV2QuoteScript({ config: snblConfig, amountIn, signer: wallet.state.address });
    sonicTerminal.focus();
    scriptLines(quoteScript).forEach((line) => sonicTerminal.write(line));
    sonicTerminal.info("Reading getAmountsOut directly from the reviewed V2 router through your connected wallet…");
    if (!hasContractCode(await wallet.getCode(snblConfig.router))) throw new Error("The reviewed SNBL router has no contract code on this network.");
    const quoteAmounts = quotedV2Amounts(quoteScript, await wallet.callEvm(quoteScript.transaction));
    currentSnblScript = buildDirectV2PurchaseScript({
      config: snblConfig,
      quoteScript,
      quoteAmounts,
      recipient: wallet.state.address,
      slippageBps: Number(buySlippage.value)
    });
    scriptLines(currentSnblScript).forEach((line) => sonicTerminal.write(line));
    quoteSellAmount.textContent = `${formatUnits(currentSnblScript.amountIn, snblConfig.paymentDecimals)} ${snblConfig.paymentSymbol}`;
    quoteBuyAmount.textContent = `${formatUnits(currentSnblScript.minOutput, snblConfig.tokenDecimals)} ${snblConfig.tokenSymbol}`;
    quoteWarning.hidden = false;
    quoteWarning.textContent = "Direct router read only: pool reserves can change before signing. The script expires in 20 minutes; review the final router, route, minimum output, and network in your wallet.";
    approveSnblPayment.hidden = !currentSnblScript.approval;
    executeSnblBuy.hidden = Boolean(currentSnblScript.approval);
    snblQuote.hidden = false;
    sonicTerminal.success(`Direct SNBL script ready: receive at least ${quoteBuyAmount.textContent}.`);
  } finally {
    button.disabled = false;
    button.innerHTML = "Build direct wallet script <span>→</span>";
  }
}

async function waitForWalletReceipt(hash, label = "Transaction") {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const receipt = await wallet.getReceipt(hash);
    if (!receipt) continue;
    if (receipt.status === "0x0" || receipt.status === 0) throw new Error(`${label} reverted on-chain.`);
    return receipt;
  }
  throw new Error(`${label} was submitted but is still pending. Check the transaction in your wallet or explorer before trying again.`);
}

async function approveSnblSpend() {
  const approval = currentSnblScript?.approval;
  if (!approval) throw new Error("No payment-token approval is needed for this quote.");
  await wallet.switchEvmChain(snblConfig.chain);
  approveSnblPayment.disabled = true;
  approveSnblPayment.textContent = "Approve in wallet…";
  try {
    await approveForRouter(approval.token, approval.spender, approval.amount, approval.label || "payment token");
    sonicTerminal.success("Payment token approved. Rebuilding the direct router script with a fresh on-chain read.");
    await prepareSnblPurchase();
  } finally {
    approveSnblPayment.disabled = false;
    approveSnblPayment.textContent = "Approve payment token";
  }
}

async function executeSnblPurchase() {
  if (!currentSnblScript?.transaction) throw new Error("Build a current direct wallet script first.");
  if (currentSnblScript.approval) throw new Error("Approve the exact payment amount before buying SNBL.");
  if (currentSnblScript.deadline <= Math.floor(Date.now() / 1_000)) throw new Error("This direct wallet script expired. Build a fresh one before buying SNBL.");
  await wallet.switchEvmChain(snblConfig.chain);
  if (wallet.state.address.toLowerCase() !== currentSnblScript.signer.toLowerCase()) throw new Error("Reconnect the wallet that built this direct purchase script, or build a new script.");
  executeSnblBuy.disabled = true;
  executeSnblBuy.textContent = "Confirm in wallet…";
  try {
    const hash = await wallet.sendEvmTransaction(currentSnblScript.transaction);
    const explorer = explorerTransactionUrl(snblConfig.chain, hash);
    sonicTerminal.success(`SNBL purchase submitted: ${explorer || hash}`);
    showToast("SNBL purchase submitted. Check your wallet for confirmation.");
    currentSnblScript = undefined;
    snblQuote.hidden = true;
  } finally {
    executeSnblBuy.disabled = false;
    executeSnblBuy.innerHTML = "Buy SNBL <span>↗</span>";
  }
}

async function addSnblToWallet() {
  if (!snblConfig?.tokenAddress) throw new Error("SNBL contract address is not configured yet.");
  await wallet.switchEvmChain(snblConfig.chain);
  const added = await wallet.watchAsset({ address: snblConfig.tokenAddress, symbol: snblConfig.tokenSymbol, decimals: snblConfig.tokenDecimals });
  showToast(added ? "SNBL was added to your wallet." : "Your wallet did not add SNBL.");
}

function factoryForChain(chain) {
  const configured = factoryConfig?.[chain];
  if (isEvmAddress(configured)) return configured;
  const localFactory = readLocal(`sonicblast:factory:${chain}`);
  return isEvmAddress(localFactory) ? localFactory : "";
}

function currentTokenAddress() {
  return isEvmAddress(listingTokenAddress.value.trim()) ? listingTokenAddress.value.trim() : "";
}

function printScript(script) {
  sonicTerminal.focus();
  scriptLines(script).forEach((line) => sonicTerminal.write(line));
}

async function requireContractCode(address, label) {
  if (!hasContractCode(await wallet.getCode(address))) throw new Error(`The reviewed ${label} has no contract code on this network.`);
}

async function launchWithWallet() {
  if (!currentPlan) throw new Error("Build a launch plan before deploying.");
  if (!currentPlan.execution?.available || currentPlan.chain === "solana") {
    throw new Error("This browser release deploys the reviewed EVM factory. Direct Solana creation requires the Solana adapter.");
  }
  sonicTerminal.focus();
  sonicTerminal.info(`Preparing ${currentPlan.token.name} on ${currentPlan.chainLabel}.`);
  await connectWalletForChain(currentPlan.chain, { close: false });
  let factory = factoryForChain(currentPlan.chain);
  printScript(buildTokenDeploymentScript({ plan: currentPlan, artifact: FACTORY_ARTIFACT, factoryAddress: factory, signer: wallet.state.address }));
  if (!factory) {
    sonicTerminal.info("No reviewed factory address is configured for this network. Your wallet will deploy the embedded SonicBlastFactory script once.");
    const factoryHash = await wallet.sendEvmTransaction({ data: FACTORY_ARTIFACT.bytecode });
    sonicTerminal.info(`Factory deployment submitted: ${shortAddress(factoryHash)}. Waiting for confirmation…`);
    const factoryReceipt = await waitForWalletReceipt(factoryHash, "Factory deployment");
    factory = factoryReceipt.contractAddress;
    if (!isEvmAddress(factory)) throw new Error("The factory deployment did not return a contract address.");
    await requireContractCode(factory, "new SonicBlast factory");
    writeLocal(`sonicblast:factory:${currentPlan.chain}`, factory);
    sonicTerminal.success(`SonicBlast factory is ready at ${shortAddress(factory)}.`);
  } else {
    await requireContractCode(factory, "SonicBlast factory");
    sonicTerminal.info(`Using reviewed SonicBlast factory ${shortAddress(factory)}.`);
  }
  const script = buildTokenDeploymentScript({ plan: currentPlan, artifact: FACTORY_ARTIFACT, factoryAddress: factory, signer: wallet.state.address });
  printScript(script);
  sonicTerminal.info(`Opening the ${currentPlan.token.symbol} token-creation transaction in your wallet…`);
  const hash = await wallet.sendEvmTransaction(script.createToken);
  sonicTerminal.info(`Token deployment submitted: ${shortAddress(hash)}. Waiting for confirmation…`);
  const receipt = await waitForWalletReceipt(hash, "Token deployment");
  const tokenAddress = factoryAddressFromReceipt(receipt, factory);
  if (!tokenAddress) throw new Error("The token deployment succeeded, but SonicBlast could not read the token address. Open the transaction in your wallet and add the address before pairing.");
  listingTokenAddress.value = tokenAddress;
  listingDetails.hidden = false;
  sonicTerminal.success(`${currentPlan.token.symbol} deployed at ${tokenAddress}. Add liquidity next or publish it to the board.`);
  showToast(`${currentPlan.token.symbol} deployed. The token address is ready for pairing.`);
}

async function approveForRouter(token, router, amount, label) {
  const requested = BigInt(String(amount));
  let current = null;
  try {
    current = decodeUint256(await wallet.callEvm({ to: token, data: encodeErc20Allowance({ owner: wallet.state.address, spender: router }) }));
  } catch {
    sonicTerminal.warn(`Could not read the existing ${label} allowance. Your wallet will still show the exact approval.`);
  }
  if (current === requested) {
    sonicTerminal.success(`${label} already has the exact approval amount.`);
    return;
  }
  if (current && current > 0n) {
    sonicTerminal.info(`Resetting the existing ${label} allowance to zero before setting the exact amount…`);
    const resetHash = await wallet.sendEvmTransaction({ to: token, data: encodeErc20Approve({ spender: router, amount: "0" }) });
    sonicTerminal.info(`${label} allowance reset submitted: ${shortAddress(resetHash)}. Waiting for confirmation…`);
    await waitForWalletReceipt(resetHash, `${label} allowance reset`);
  }
  sonicTerminal.info(`Opening exact ${label} approval in your wallet…`);
  const hash = await wallet.sendEvmTransaction({ to: token, data: encodeErc20Approve({ spender: router, amount: requested }) });
  sonicTerminal.info(`${label} approval submitted: ${shortAddress(hash)}. Waiting for confirmation…`);
  await waitForWalletReceipt(hash, `${label} approval`);
  sonicTerminal.success(`${label} approved for the exact script amount.`);
}

async function pairWithWallet({ tokenAmount, quoteAmount } = {}) {
  if (!currentPlan) throw new Error("Build and deploy a launch plan before pairing liquidity.");
  if (!currentPlan.execution?.available || currentPlan.chain === "solana") throw new Error("Browser pairing is available for supported EVM chains only.");
  const token = currentTokenAddress();
  if (!token) throw new Error("Deploy the token first so SonicBlast has its contract address.");
  const enteredTokenAmount = String(tokenAmount || pairTokenAmount.value || "").trim();
  const enteredQuoteAmount = String(quoteAmount || pairQuoteAmount.value || currentPlan.liquidity.amount || "").trim();
  if (!enteredTokenAmount) throw new Error("Enter the number of new tokens to pair.");
  await connectWalletForChain(currentPlan.chain, { close: false });
  if (wallet.state.address.toLowerCase() !== currentPlan.token.ownerAddress.toLowerCase()) {
    throw new Error("For initial pairing, connect the wallet that received the token supply or set the connected wallet as the public token owner before deployment.");
  }
  const config = pairingConfig?.[currentPlan.chain];
  if (!config?.router) throw new Error(`Pairing is not configured for ${currentPlan.chainLabel}. Add its reviewed V2 router to public/network-config.js before using pair.`);
  const script = buildV2LiquidityScript({
    plan: currentPlan,
    tokenAddress: token,
    tokenAmount: enteredTokenAmount,
    quoteAmount: enteredQuoteAmount,
    config,
    recipient: wallet.state.address
  });
  printScript(script);
  await requireContractCode(config.router, "V2 router");
  for (const approval of script.approvals) await approveForRouter(approval.token, approval.spender, approval.amount, approval.label);
  sonicTerminal.info("Opening the final V2 liquidity script in your wallet. Confirm the router, token amounts, minimums, deadline, and price impact before signing.");
  const hash = await wallet.sendEvmTransaction(script.transaction);
  sonicTerminal.info(`Liquidity pairing submitted: ${shortAddress(hash)}. Waiting for confirmation…`);
  await waitForWalletReceipt(hash, "Liquidity pairing");
  sonicTerminal.success("Liquidity pairing confirmed. Review the pool and liquidity receipt in your wallet or explorer.");
  showToast("Liquidity pairing confirmed.");
}

function previewTerminalScript(args, term) {
  if (!currentPlan) throw new Error("Build a launch plan before previewing a script.");
  const action = String(args[0] || "deploy").toLowerCase();
  if (action === "deploy") {
    scriptLines(buildTokenDeploymentScript({
      plan: currentPlan,
      artifact: FACTORY_ARTIFACT,
      factoryAddress: factoryForChain(currentPlan.chain),
      signer: wallet.state.address || "connect wallet"
    })).forEach((line) => term.write(line));
    return;
  }
  if (action === "pair") {
    const token = currentTokenAddress();
    const config = pairingConfig?.[currentPlan.chain];
    const enteredTokenAmount = String(args[1] || pairTokenAmount.value || "").trim();
    const enteredQuoteAmount = String(args[2] || pairQuoteAmount.value || currentPlan.liquidity.amount || "").trim();
    if (!token || !config?.router || !enteredTokenAmount) {
      throw new Error("Deploy the token, configure the reviewed router, and provide a token amount before previewing pair.");
    }
    scriptLines(buildV2LiquidityScript({
      plan: currentPlan,
      tokenAddress: token,
      tokenAmount: enteredTokenAmount,
      quoteAmount: enteredQuoteAmount,
      config,
      recipient: wallet.state.address || currentPlan.token.ownerAddress
    })).forEach((line) => term.write(line));
    return;
  }
  throw new Error("Use script deploy or script pair <tokenAmount> [quoteAmount].");
}

async function handleTerminalCommand(command, args, term) {
  if (command === "help") {
    term.write("\x1b[1;32mApproved wallet actions\x1b[0m");
    terminalHelp.forEach((line) => term.write(line));
    return;
  }
  if (command === "status") {
    term.info(walletText());
    if (!currentPlan) return term.warn("No launch plan loaded. Open Launch and build one first.");
    term.info(`Plan: ${currentPlan.token.name} ($${currentPlan.token.symbol}) on ${currentPlan.chainLabel}.`);
    term.info(`Token: ${currentTokenAddress() || "not deployed"}. Liquidity: ${currentPlan.liquidity.amount} ${currentPlan.liquidity.quoteAsset}.`);
    return;
  }
  if (command === "connect") {
    await connectWalletForChain(currentPlan?.chain || flowChain.value, { close: false });
    return term.success("Wallet connected for the selected launch network.");
  }
  if (command === "script") return previewTerminalScript(args, term);
  if (command === "deploy") return launchWithWallet();
  if (command === "pair") return pairWithWallet({ tokenAmount: args[0], quoteAmount: args[1] });
  term.warn(`"${command}" is not an approved direct wallet-script action. Type help.`);
}

async function runWalletAction(action) {
  try {
    return await action();
  } catch (error) {
    const message = error?.message || "Wallet action could not be completed.";
    showToast(message);
    sonicTerminal.error(message);
    return undefined;
  }
}

function formatQuantity(value = "") {
  try { return BigInt(String(value)).toLocaleString(); } catch { return String(value); }
}

function chainInfo() {
  return chainDefaults[flowChain.value] || chainDefaults.base;
}

function liquidityProfile() {
  const network = chainInfo();
  return { native: network.native, stables: liquidityProfiles[flowChain.value]?.stables || [] };
}

function renderLiquidityPicker() {
  const profile = liquidityProfile();
  if (!profile.stables.some((asset) => asset.symbol === selectedStablecoin)) selectedStablecoin = profile.stables[0]?.symbol || "";
  if (activeLiquidityMode === "stable" && !selectedStablecoin) activeLiquidityMode = "native";

  const activeAsset = activeLiquidityMode === "stable" ? selectedStablecoin : profile.native;
  flowLiquidityMode.value = activeLiquidityMode;
  flowQuoteAsset.value = activeAsset;
  nativeAssetLabel.textContent = profile.native;
  nativeAssetToggle.classList.toggle("active", activeLiquidityMode === "native");
  stableAssetToggle.classList.toggle("active", activeLiquidityMode === "stable");
  nativeAssetToggle.setAttribute("aria-pressed", String(activeLiquidityMode === "native"));
  stableAssetToggle.setAttribute("aria-pressed", String(activeLiquidityMode === "stable"));
  stablecoinList.hidden = activeLiquidityMode !== "stable";
  stablecoinList.replaceChildren(...profile.stables.map((asset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stablecoin-option${asset.symbol === selectedStablecoin ? " active" : ""}`;
    button.setAttribute("aria-pressed", String(asset.symbol === selectedStablecoin));
    const symbol = document.createElement("b");
    symbol.textContent = asset.symbol;
    const name = document.createElement("span");
    name.textContent = asset.name;
    button.append(symbol, name);
    button.addEventListener("click", () => {
      selectedStablecoin = asset.symbol;
      activeLiquidityMode = "stable";
      renderLiquidityPicker();
    });
    return button;
  }));
  liquidityAmountLabel.childNodes[0].nodeValue = `Amount in ${activeAsset} `;
  flowLiquidity.placeholder = activeLiquidityMode === "stable" ? "500" : "0.50";
  liquidityCaption.textContent = activeLiquidityMode === "stable"
    ? `Pair your new token with ${activeAsset}. SonicBlast will use the operator-reviewed asset address and ask your wallet to approve the exact amount.`
    : `Pair your new token with ${profile.native}. SonicBlast will show the reviewed V2 transaction in your wallet before anything is sent.`;
  updateSmartNudge();
}

function setLiquidityMode(mode) {
  activeLiquidityMode = mode === "stable" ? "stable" : "native";
  renderLiquidityPicker();
  updateSmartNudge();
}

function updateSmartNudge() {
  if (!smartNudge || smartNudge.hidden) return;
  const asset = flowQuoteAsset.value || chainInfo().native;
  const chain = flowChain.options[flowChain.selectedIndex]?.text || "selected chain";
  const messages = [
    ["Chain-aware setup", `${chain} profile selected. Sonic IQ will keep the public address and wallet lane aligned with this chain.`],
    ["Clear token identity", "A short name and recognizable symbol make the creation easy to find on the board and inside its room."],
    ["Fixed-supply check", "The total supply is passed to the fixed-supply contract. Review it before opening the wallet transaction."],
    ["Supply delivery", "Sonic IQ checks only the public recipient format. Recovery phrases and signing material stay inside the wallet app."],
    [activeLiquidityMode === "stable" ? "Stablecoin pair lane" : "Network-token pair lane", activeLiquidityMode === "stable" ? `${asset} is selected. The wallet will require its reviewed address and exact base-unit amount.` : `${asset} is selected as the network token. The wallet will show the native-asset liquidity transaction after deployment.`],
    ["Metadata signal", "Metadata is optional, but an HTTPS URI gives the launch workflow a validated place to reference token details."]
  ];
  const [title, text] = messages[flowStep] || messages[0];
  smartNudgeTitle.textContent = title;
  smartNudgeText.textContent = text;
}

function renderSmartReview(intelligence) {
  if (!intelligence) {
    smartReview.hidden = true;
    return;
  }
  smartReview.hidden = false;
  smartScore.textContent = `${intelligence.score}%`;
  smartScore.style.setProperty("--score", `${intelligence.score}%`);
  smartLabel.textContent = intelligence.label;
  smartSummary.textContent = intelligence.summary;
  smartNextAction.textContent = intelligence.nextAction;
  smartSignals.replaceChildren(...(intelligence.signals || []).map((signal) => {
    const item = document.createElement("li");
    item.className = signal.state;
    const marker = document.createElement("span");
    marker.textContent = signal.state === "ready" ? "✓" : "＋";
    const copy = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = signal.label;
    const detail = document.createElement("p");
    detail.textContent = signal.detail;
    copy.append(label, detail);
    item.append(marker, copy);
    return item;
  }));
}

function applyChainDefaults() {
  const selected = chainInfo();
  const isSolana = flowChain.value === "solana";
  flowDecimals.value = selected.decimals;
  flowOwner.placeholder = isSolana ? "Solana public address" : "0x public address";
  flowOwnerLabel.childNodes[0].nodeValue = isSolana ? "Solana token recipient" : "Public owner address";
  listingTokenAddress.placeholder = isSolana ? "Solana token mint" : "0x deployed contract";
  listingTokenAddressLabel.childNodes[0].nodeValue = isSolana ? "Token mint " : "Token address ";
  supplyCaption.textContent = isSolana ? "Solana tokens use 9 decimals by default." : `${selected.native} chain profile uses 18 decimals by default.`;
  activeLiquidityMode = "native";
  selectedStablecoin = "";
  renderLiquidityPicker();
  if (wallet.state.connected && wallet.state.family === walletExpectedFamily(flowChain.value) && !flowOwner.value.trim()) flowOwner.value = wallet.state.address;
}

function showLaunchModal() {
  launchModal.classList.add("open");
  launchModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const focusTarget = flowReview.hidden ? flowSteps[flowStep]?.querySelector("input, select") : $("#reviewConnectWallet");
  setTimeout(() => focusTarget?.focus(), 60);
}

function clearManageMode() {
  editingCreation = undefined;
  flowReview.classList.remove("manage-mode");
  $("#launchModalTitle").innerHTML = "Build the <span>signal.</span>";
  $("#publishCreation").innerHTML = "Publish creation <span>↗</span>";
}

function resetLaunchFlow() {
  currentPlan = undefined;
  currentPublishedCreation = undefined;
  clearManageMode();
  launchFlow.reset();
  applyChainDefaults();
  showFlowStep(0);
}

function buySNBL() {
  openBuyModal();
}

function openLaunch() {
  if (editingCreation || currentPublishedCreation) resetLaunchFlow();
  showLaunchModal();
}

function closeLaunch() {
  const shouldReset = Boolean(editingCreation || currentPublishedCreation);
  launchModal.classList.remove("open");
  launchModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (shouldReset) resetLaunchFlow();
}

function setFieldMessage(message = "") {
  fieldMessage.textContent = message;
}

function showFlowStep(nextStep) {
  flowStep = Math.max(0, Math.min(nextStep, TOTAL_FLOW_STEPS - 1));
  flowReview.hidden = true;
  flowNav.hidden = false;
  listingDetails.hidden = true;
  smartNudge.hidden = false;
  flowSteps.forEach((step, index) => step.classList.toggle("active", index === flowStep));
  flowStepLabel.textContent = `Step ${flowStep + 1} of ${TOTAL_FLOW_STEPS}`;
  flowStepHint.textContent = flowHints[flowStep];
  flowProgressBar.style.width = `${((flowStep + 1) / TOTAL_FLOW_STEPS) * 100}%`;
  flowBack.hidden = flowStep === 0;
  flowNext.innerHTML = flowStep === TOTAL_FLOW_STEPS - 1 ? "Review wallet launch <span>→</span>" : "Continue <span>→</span>";
  flowNext.disabled = false;
  setFieldMessage();
  updateSmartNudge();
  const target = flowSteps[flowStep]?.querySelector("input, select");
  setTimeout(() => target?.focus(), 20);
}

function validateCurrentStep() {
  const value = (name) => String(launchFlow.elements[name]?.value || "").trim();
  const chain = value("chain");
  const name = value("name");
  const symbol = value("symbol").toUpperCase();
  const supply = value("supply");
  const owner = value("ownerAddress");
  const liquidity = value("liquidityAmount");
  const metadata = value("metadataUri");

  let message = "";
  if (flowStep === 0 && !chainDefaults[chain]) message = "Choose one of the supported chains.";
  if (flowStep === 1 && !/^[\p{L}\p{N}][\p{L}\p{N} .,'&!_-]{1,63}$/u.test(name)) message = "Use 2–64 letters, numbers, or simple punctuation.";
  if (flowStep === 2 && !/^[A-Z0-9]{2,12}$/.test(symbol)) message = "Use 2–12 uppercase letters or numbers.";
  if (flowStep === 3 && !/^(0|[1-9]\d*)$/.test(supply || "") || supply === "0") message = "Enter a whole number greater than zero.";
  if (flowStep === 4) {
    const valid = chain === "solana" ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(owner) : /^0x[a-fA-F0-9]{40}$/.test(owner);
    if (!valid) message = chain === "solana" ? "Enter a valid Solana public address." : "Enter a valid EVM public address.";
  }
  if (flowStep === 5 && (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(liquidity) || Number(liquidity) <= 0)) message = "Enter a liquidity amount greater than zero.";
  if (flowStep === 6 && metadata) {
    try {
      if (new URL(metadata).protocol !== "https:") message = "Use a complete HTTPS metadata URL.";
    } catch { message = "Use a complete HTTPS metadata URL."; }
  }
  if (message) setFieldMessage(message);
  return !message;
}

async function buildPlan() {
  if (!validateCurrentStep()) return;
  const payload = Object.fromEntries(new FormData(launchFlow));
  flowNext.disabled = true;
  flowNext.textContent = "Building local plan…";
  try {
    currentPlan = buildLaunchPlan(payload);
    updateReview();
    showReview();
  } catch (error) {
    setFieldMessage(error.message || "Could not build the launch plan.");
    flowNext.disabled = false;
    flowNext.innerHTML = "Review wallet launch <span>→</span>";
  }
}

function updateReview() {
  if (!currentPlan) return;
  $("#reviewSymbol").textContent = currentPlan.token.symbol.slice(0, 3);
  $("#reviewName").textContent = `${currentPlan.token.name} · $${currentPlan.token.symbol}`;
  $("#reviewChain").textContent = currentPlan.chainLabel;
  $("#reviewSupply").textContent = `${formatQuantity(currentPlan.token.supply)} ${currentPlan.token.symbol}`;
  $("#reviewOwner").textContent = shortAddress(currentPlan.token.ownerAddress);
  $("#reviewLiquidity").textContent = `${currentPlan.liquidity.amount} ${currentPlan.liquidity.quoteAsset}`;
  const suggestedRoom = `launch-${currentPlan.token.symbol.toLowerCase()}`;
  if (!listingRoom.value) listingRoom.value = suggestedRoom;
  $("#reviewRoom").textContent = `#${listingRoom.value}`;
  renderSmartReview(currentPlan.intelligence);
  const launchButton = $("#launchOnChain");
  const browserLaunchAvailable = Boolean(currentPlan.execution?.available && !editingCreation);
  launchButton.disabled = !browserLaunchAvailable;
  launchButton.hidden = Boolean(editingCreation);
  launchButton.innerHTML = currentPlan.chain === "solana" ? "Solana adapter pending" : "Launch with wallet <span>↗</span>";
  $("#reviewConnectWallet").textContent = wallet.state.connected ? shortAddress(wallet.state.address) : "Connect wallet";
  planChecklist.replaceChildren(...currentPlan.checklist.map((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  }));
}

function showReview() {
  flowSteps.forEach((step) => step.classList.remove("active"));
  flowNav.hidden = true;
  smartNudge.hidden = true;
  flowReview.hidden = false;
  flowStepLabel.textContent = "Plan ready";
  flowStepHint.textContent = "Review + deploy";
  flowProgressBar.style.width = "100%";
  setFieldMessage();
}

async function publishCreation() {
  if (!currentPlan) return;
  const button = $("#publishCreation");
  const editing = editingCreation;
  button.disabled = true;
  button.textContent = editing ? "Updating…" : "Publishing…";
  try {
    let response;
    if (editing) {
      const managementToken = readLocal(`sonicblast:manage:${editing.id}`);
      if (!managementToken) throw new Error("This browser does not have the creator key for that listing.");
      response = await fetch(`/api/creations/${editing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-sonicblast-manage": managementToken },
        body: JSON.stringify({ room: listingRoom.value, tokenAddress: listingTokenAddress.value, buyUrl: listingBuyUrl.value })
      });
    } else {
      const payload = { ...Object.fromEntries(new FormData(launchFlow)) };
      response = await fetch("/api/creations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not publish the creation.");
    currentPublishedCreation = data.creation;
    if (data.managementToken) writeLocal(`sonicblast:manage:${data.creation.id}`, data.managementToken);
    await fetchCreations();
    const action = editing ? "updated" : "live on the board";
    closeLaunch();
    document.querySelector("#creations").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`${data.creation.name} is ${action}.`);
  } catch (error) {
    setFieldMessage(error.message || "Could not publish the creation.");
  } finally {
    button.disabled = false;
    button.innerHTML = editing ? "Update creation <span>↗</span>" : "Publish creation <span>↗</span>";
  }
}

function creationStatusLabel(status) {
  if (status === "live") return "Live";
  if (status === "deployed") return "Deployed";
  return "Planned";
}

function creationCard(creation, index) {
  const card = document.createElement("article");
  card.className = "creation-card";
  const top = document.createElement("div");
  top.className = "creation-top";
  const rank = document.createElement("span");
  rank.className = "rank-number";
  rank.textContent = `#${String(index + 1).padStart(2, "0")} HEAT`;
  const status = document.createElement("span");
  status.className = `creation-status ${creation.status}`;
  status.textContent = creationStatusLabel(creation.status);
  top.append(rank, status);

  const token = document.createElement("div");
  token.className = "creation-token";
  const mark = document.createElement("div");
  mark.className = "token-mark";
  mark.textContent = creation.symbol.slice(0, 3);
  const tokenText = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = creation.name;
  const symbol = document.createElement("p");
  symbol.textContent = `$${creation.symbol}`;
  tokenText.append(title, symbol);
  token.append(mark, tokenText);

  const details = document.createElement("ul");
  details.className = "creation-details";
  const detailRows = [
    ["Chain", creation.chainLabel],
    ["Supply", `${formatQuantity(creation.supply)} ${creation.symbol}`],
    ["Owner", shortAddress(creation.ownerAddress)]
  ];
  detailRows.forEach(([label, value], detailIndex) => {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = label;
    const right = document.createElement("b");
    right.textContent = value;
    if (detailIndex === 0) right.className = "chain-tag";
    li.append(left, right);
    details.append(li);
  });

  const foot = document.createElement("div");
  foot.className = "creation-foot";
  const heated = readLocal(`sonicblast:heat:${creation.id}`) === "1";
  const heat = document.createElement("button");
  heat.className = "heat-button";
  heat.type = "button";
  heat.disabled = heated;
  heat.textContent = heated ? `✦ ${creation.heat}` : `✦ ${creation.heat} heat`;
  heat.addEventListener("click", () => pulseCreation(creation.id, heat));

  const room = document.createElement("button");
  room.className = "room-link";
  room.type = "button";
  room.textContent = "Room";
  room.addEventListener("click", () => openCreationRoom(creation));

  const manageToken = readLocal(`sonicblast:manage:${creation.id}`);
  if (manageToken) {
    const manage = document.createElement("button");
    manage.className = "room-link";
    manage.type = "button";
    manage.textContent = "Manage";
    manage.addEventListener("click", () => openManageCreation(creation));
    foot.append(heat, room, manage);
  } else {
    foot.append(heat, room);
  }

  if (creation.status === "live" && creation.buyUrl) {
    const buy = document.createElement("a");
    buy.className = "buy-button";
    buy.href = creation.buyUrl;
    buy.target = "_blank";
    buy.rel = "noopener noreferrer";
    buy.textContent = "Buy ↗";
    foot.append(buy);
  } else {
    const buy = document.createElement("span");
    buy.className = "buy-button disabled";
    buy.textContent = creation.status === "deployed" ? "Market link pending" : "Pre-launch";
    foot.append(buy);
  }
  card.append(top, token, details, foot);
  return card;
}

function renderCreations(creations) {
  const totalHeat = creations.reduce((sum, creation) => sum + Number(creation.heat || 0), 0);
  creationCount.textContent = String(creations.length);
  heatTotal.textContent = String(totalHeat);
  if (!creations.length) {
    creationGrid.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "empty-board";
    const title = document.createElement("strong");
    title.textContent = "The board is ready for its first signal.";
    const copy = document.createElement("p");
    copy.textContent = "Publish a launch plan to give the community something to watch, rank, and gather around.";
    const button = document.createElement("button");
    button.className = "button primary";
    button.type = "button";
    button.textContent = "Launch a creation";
    button.addEventListener("click", openLaunch);
    empty.append(title, copy, button);
    creationGrid.append(empty);
    return;
  }
  creationGrid.replaceChildren(...creations.map(creationCard));
}

async function fetchCreations() {
  const refresh = $("#refreshCreations");
  refresh.disabled = true;
  try {
    const response = await fetch("/api/creations?limit=36");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load the board.");
    renderCreations(data.creations || []);
  } catch (error) {
    creationCount.textContent = "—";
    heatTotal.textContent = "—";
    creationGrid.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "empty-board";
    const title = document.createElement("strong");
    title.textContent = "The board could not load.";
    const copy = document.createElement("p");
    copy.textContent = "Refresh the board after the Worker is online.";
    empty.append(title, copy);
    creationGrid.append(empty);
  } finally {
    refresh.disabled = false;
  }
}

async function pulseCreation(id, button) {
  if (readLocal(`sonicblast:heat:${id}`) === "1") return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/creations/${id}/pulse`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not add heat.");
    writeLocal(`sonicblast:heat:${id}`, "1");
    showToast("Heat added.");
    await fetchCreations();
  } catch (error) {
    button.disabled = false;
    showToast(error.message || "Could not add heat.");
  }
}

function openManageCreation(creation) {
  const managementToken = readLocal(`sonicblast:manage:${creation.id}`);
  if (!managementToken) {
    showToast("This browser does not have the creator key for that listing.");
    return;
  }
  editingCreation = creation;
  currentPlan = {
    chain: creation.chain,
    chainLabel: creation.chainLabel,
    token: {
      name: creation.name,
      symbol: creation.symbol,
      supply: creation.supply,
      decimals: creation.decimals,
      ownerAddress: creation.ownerAddress
    },
    liquidity: { amount: creation.liquidityAmount, quoteAsset: creation.quoteAsset },
    checklist: []
  };
  flowReview.classList.add("manage-mode");
  $("#launchModalTitle").innerHTML = "Update the <span>signal.</span>";
  listingRoom.value = creation.room;
  listingTokenAddress.value = creation.tokenAddress || "";
  listingBuyUrl.value = creation.buyUrl || "";
  $("#publishCreation").innerHTML = "Update creation <span>↗</span>";
  updateReview();
  showReview();
  listingDetails.hidden = false;
  showLaunchModal();
}

function openCreationRoom(creation) {
  roomName.value = creation.room;
  if (!displayName.value.trim()) displayName.value = "guest";
  history.replaceState(null, "", `#room=${encodeURIComponent(creation.room)}`);
  document.querySelector("#rooms").scrollIntoView({ behavior: "smooth", block: "start" });
  joinRoom(creation.room);
}

function currentHandle() {
  const handle = displayName.value.trim().replace(/[^\p{L}\p{N} _.-]/gu, "").slice(0, 32);
  return handle || "guest";
}

function appendMessage(message, mine = false) {
  const empty = messageList.querySelector(".welcome-message");
  if (empty) empty.remove();
  const wrap = document.createElement("article");
  wrap.className = `message${mine ? " me" : ""}`;
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const sender = document.createElement("span");
  sender.textContent = message.handle || "guest";
  const time = document.createElement("time");
  time.textContent = new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  meta.append(sender, time);
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = message.body;
  wrap.append(meta, bubble);
  messageList.append(wrap);
  messageList.scrollTop = messageList.scrollHeight;
}

function resetChat() {
  messageList.replaceChildren();
  const welcome = document.createElement("div");
  welcome.className = "welcome-message";
  const badge = document.createElement("span");
  badge.textContent = "SB";
  const copy = document.createElement("p");
  copy.textContent = "The room is ready. Start the conversation.";
  welcome.append(badge, copy);
  messageList.append(welcome);
}

function roomId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

function setRoomControls(connected) {
  messageInput.disabled = !connected;
  sendButton.disabled = !connected;
  shareRoomButton.disabled = !connected;
  updateCallControls(connected);
}

async function createRoom() {
  const requested = roomName.value.trim();
  try {
    const response = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ room: requested }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create a room.");
    roomName.value = data.room;
    history.replaceState(null, "", `#room=${encodeURIComponent(data.room)}`);
    await joinRoom(data.room);
  } catch (error) { showToast(error.message || "Could not create a room."); }
}

async function joinRoom(name = roomName.value.trim()) {
  const room = roomId(name);
  if (!room) { showToast("Enter a room name first."); return; }
  if (socket) socket.close();
  await stopMedia({ notify: false, silent: true });
  peerDirectory.clear();
  resetChat();
  roomStatus.textContent = "Connecting to the room…";
  setRoomControls(false);
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/ws/rooms/${encodeURIComponent(room)}?handle=${encodeURIComponent(currentHandle())}&peer=${encodeURIComponent(clientId)}`);
  currentRoom = room;
  socket.addEventListener("open", () => {
    activeRoom.textContent = `#${room}`;
    roomStatus.textContent = `You are live in #${room}.`;
    setRoomControls(true);
    callStatus.textContent = "Ready";
    messageInput.focus();
    showToast("Room connected.");
  });
  socket.addEventListener("message", (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (data.type === "history") data.messages.forEach((message) => appendMessage(message, message.handle === currentHandle()));
    if (data.type === "message") appendMessage(data, data.handle === currentHandle());
    if (data.type === "presence") presence.textContent = `${data.count} online`;
    if (data.type === "room-state") handleRoomState(data.peers || []);
    if (data.type === "peer-joined") handlePeerJoined(data.peer);
    if (data.type === "peer-left") handlePeerLeft(data.peerId);
    if (data.type === "media-state") handleMediaState(data.peer);
    if (data.type === "signal") handleSignal(data);
  });
  socket.addEventListener("close", () => {
    if (currentRoom === room) {
      roomStatus.textContent = "Room disconnected. Rejoin to continue.";
      callStatus.textContent = "Room offline";
      setRoomControls(false);
      stopMedia({ notify: false, silent: true });
    }
  });
  socket.addEventListener("error", () => { roomStatus.textContent = "Room connection could not be opened."; });
}

function sendRoomEvent(event) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
}

function updateCallControls(roomReady = socket?.readyState === WebSocket.OPEN) {
  const inCall = Boolean(localStream);
  voiceCallButton.disabled = !roomReady;
  videoCallButton.disabled = !roomReady;
  muteButton.disabled = !inCall;
  cameraButton.disabled = !inCall || !localStream?.getVideoTracks().length;
  endCallButton.disabled = !inCall;
  voiceCallButton.classList.toggle("active", callMode === "voice");
  videoCallButton.classList.toggle("active", callMode === "video");
  muteButton.classList.toggle("active", muted);
  cameraButton.classList.toggle("active", cameraOff);
  muteButton.textContent = muted ? "◑" : "◒";
  cameraButton.textContent = cameraOff ? "◌" : "◉";
}

function syncCallStage() {
  const hasMedia = Boolean(localStream) || remotePeers.children.length > 0;
  callEmpty.hidden = hasMedia;
  localTile.hidden = !localStream;
}

async function loadRtcConfig() {
  try {
    const response = await fetch(`/api/rtc-config?peer=${encodeURIComponent(clientId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load call configuration.");
    return { iceServers: Array.isArray(data.iceServers) ? data.iceServers : [] };
  } catch {
    return { iceServers: [] };
  }
}

async function startMedia(mode) {
  if (socket?.readyState !== WebSocket.OPEN || !currentRoom) {
    showToast("Join a room before starting a call.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    showToast("This browser does not support room calls.");
    return;
  }
  if (localStream && callMode === mode) {
    showToast(`You are already in ${mode} mode.`);
    return;
  }
  callStatus.textContent = mode === "video" ? "Opening camera…" : "Opening mic…";
  try {
    if (localStream) await stopMedia({ notify: true, silent: true });
    rtcConfig = await loadRtcConfig();
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" ? { facingMode: "user" } : false });
    callMode = mode;
    muted = false;
    cameraOff = false;
    localPreview.srcObject = localStream;
    localPreview.play().catch(() => {});
    syncCallStage();
    callStatus.textContent = mode === "video" ? "Video live" : "Voice live";
    updateCallControls();
    sendRoomEvent({ type: "media-state", mode });
    for (const [peerId, peer] of peerDirectory) {
      if (peer.media && peer.media !== "off") maybeConnect(peerId);
    }
    showToast(mode === "video" ? "Video stage is live." : "Voice stage is live.");
  } catch (error) {
    callStatus.textContent = "Permission needed";
    showToast(error.name === "NotAllowedError" ? "Allow microphone or camera access to join the call." : "Could not start the call.");
    await stopMedia({ notify: false, silent: true });
  }
}

async function stopMedia({ notify = true, silent = false } = {}) {
  const previouslyActive = callMode !== "off";
  if (notify && previouslyActive) sendRoomEvent({ type: "media-state", mode: "off" });
  closeAllPeers();
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  localStream = undefined;
  localPreview.srcObject = null;
  callMode = "off";
  muted = false;
  cameraOff = false;
  syncCallStage();
  updateCallControls();
  if (!silent) {
    callStatus.textContent = socket?.readyState === WebSocket.OPEN ? "Ready" : "Room first";
    if (previouslyActive) showToast("You left the live call.");
  }
}

function handleRoomState(peers) {
  peers.forEach((peer) => {
    if (peer?.peerId && peer.peerId !== clientId) peerDirectory.set(peer.peerId, peer);
  });
  if (localStream) {
    for (const peerId of peerDirectory.keys()) maybeConnect(peerId);
  }
}

function handlePeerJoined(peer) {
  if (!peer?.peerId || peer.peerId === clientId) return;
  peerDirectory.set(peer.peerId, peer);
}

function handlePeerLeft(peerId) {
  if (!peerId) return;
  peerDirectory.delete(peerId);
  closePeer(peerId);
}

function handleMediaState(peer) {
  if (!peer?.peerId || peer.peerId === clientId) return;
  peerDirectory.set(peer.peerId, peer);
  if (peer.media === "off") {
    closePeer(peer.peerId);
    return;
  }
  if (localStream) maybeConnect(peer.peerId);
}

function createPeerConnection(peerId) {
  const existing = peerConnections.get(peerId);
  if (existing && existing.connectionState !== "closed") return existing;
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(peerId, pc);
  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }
  pc.addEventListener("icecandidate", (event) => {
    if (!event.candidate) return;
    const candidate = typeof event.candidate.toJSON === "function" ? event.candidate.toJSON() : event.candidate;
    sendRoomEvent({ type: "signal", target: peerId, signal: { candidate } });
  });
  pc.addEventListener("track", (event) => {
    const stream = event.streams?.[0] || new MediaStream([event.track]);
    renderRemotePeer(peerId, stream);
  });
  pc.addEventListener("connectionstatechange", () => {
    if (["failed", "closed"].includes(pc.connectionState)) closePeer(peerId);
    if (pc.connectionState === "connected") callStatus.textContent = "Connected";
  });
  return pc;
}

async function maybeConnect(peerId) {
  const peer = peerDirectory.get(peerId);
  if (!localStream || !peer || peer.media === "off" || peerId === clientId) return;
  if (clientId >= peerId) return;
  const pc = createPeerConnection(peerId);
  if (makingOffers.has(peerId) || !["stable", "have-local-offer"].includes(pc.signalingState)) return;
  if (pc.signalingState !== "stable") return;
  makingOffers.add(peerId);
  try {
    const offer = await pc.createOffer();
    if (pc.signalingState !== "stable") return;
    await pc.setLocalDescription(offer);
    sendRoomEvent({ type: "signal", target: peerId, signal: { description: pc.localDescription } });
  } catch {
    closePeer(peerId);
  } finally {
    makingOffers.delete(peerId);
  }
}

async function handleSignal({ from, signal }) {
  if (!from || from === clientId || !signal || !localStream) return;
  const pc = createPeerConnection(from);
  if (signal.description) {
    const description = signal.description;
    const offerCollision = description.type === "offer" && (makingOffers.has(from) || pc.signalingState !== "stable");
    const polite = clientId > from;
    if (offerCollision && !polite) return;
    try {
      await pc.setRemoteDescription(description);
      const queued = pendingCandidates.get(from) || [];
      for (const candidate of queued) await pc.addIceCandidate(candidate);
      pendingCandidates.delete(from);
      if (description.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendRoomEvent({ type: "signal", target: from, signal: { description: pc.localDescription } });
      }
    } catch {
      closePeer(from);
    }
    return;
  }
  if (signal.candidate) {
    try {
      if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate);
      else pendingCandidates.set(from, [...(pendingCandidates.get(from) || []), signal.candidate]);
    } catch { /* stale ICE candidates can safely be ignored */ }
  }
}

function renderRemotePeer(peerId, stream) {
  let tile = document.getElementById(`remote-${peerId}`);
  if (!tile) {
    tile = document.createElement("article");
    tile.id = `remote-${peerId}`;
    tile.className = "media-tile";
    tile.dataset.peerId = peerId;
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    const label = document.createElement("span");
    label.textContent = peerDirectory.get(peerId)?.handle || "Room member";
    tile.append(video, label);
    remotePeers.append(tile);
  }
  const video = tile.querySelector("video");
  video.srcObject = stream;
  video.play().catch(() => {});
  tile.classList.toggle("audio-only", stream.getVideoTracks().length === 0);
  syncCallStage();
}

function closePeer(peerId) {
  const pc = peerConnections.get(peerId);
  if (pc) {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
  }
  peerConnections.delete(peerId);
  pendingCandidates.delete(peerId);
  makingOffers.delete(peerId);
  const tile = document.getElementById(`remote-${peerId}`);
  tile?.remove();
  syncCallStage();
}

function closeAllPeers() {
  [...peerConnections.keys()].forEach(closePeer);
  remotePeers.replaceChildren();
  pendingCandidates.clear();
  makingOffers.clear();
  syncCallStage();
}

async function shareRoom() {
  if (!currentRoom) return;
  const url = `${location.origin}/#room=${encodeURIComponent(currentRoom)}`;
  try {
    if (navigator.share) await navigator.share({ title: `SonicBlast Smart #${currentRoom}`, url });
    else {
      await navigator.clipboard.writeText(url);
      showToast("Room link copied.");
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast("Could not share the room link.");
  }
}

$$("[data-open-launch]").forEach((button) => button.addEventListener("click", openLaunch));
$("#closeLaunch").addEventListener("click", closeLaunch);
$("#closeLaunchBackdrop").addEventListener("click", closeLaunch);
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (launchModal.classList.contains("open")) closeLaunch();
  if (walletModal.classList.contains("open")) closeWalletModal();
  if (buyModal.classList.contains("open")) closeBuyModal();
});
connectWalletButton.addEventListener("click", openWalletModal);
$("#walletLaneConnect").addEventListener("click", openWalletModal);
$("#reviewConnectWallet").addEventListener("click", () => runWalletAction(() => connectWalletForChain(currentPlan?.chain || flowChain.value)));
$("#closeWallet").addEventListener("click", closeWalletModal);
$("#closeWalletBackdrop").addEventListener("click", closeWalletModal);
$("#connectEvmWallet").addEventListener("click", () => runWalletAction(() => connectWalletForChain(flowChain.value === "solana" ? "base" : flowChain.value)));
$("#connectSolanaWallet").addEventListener("click", () => runWalletAction(() => connectWalletForChain("solana")));
$("#openWalletBrowser").addEventListener("click", openWalletBrowser);
$("#openWalletBrowserModal").addEventListener("click", openWalletBrowser);
$("#launchOnChain").addEventListener("click", () => runWalletAction(launchWithWallet));
flowChain.addEventListener("change", applyChainDefaults);
nativeAssetToggle.addEventListener("click", () => setLiquidityMode("native"));
stableAssetToggle.addEventListener("click", () => setLiquidityMode("stable"));
buySNBLButton.addEventListener("click", buySNBL);
$("#closeBuy").addEventListener("click", closeBuyModal);
$("#closeBuyBackdrop").addEventListener("click", closeBuyModal);
$("#buyConnectWallet").addEventListener("click", () => runWalletAction(connectForSnblCheckout));
$("#prepareSnblBuy").addEventListener("click", () => runWalletAction(prepareSnblPurchase));
approveSnblPayment.addEventListener("click", () => runWalletAction(approveSnblSpend));
executeSnblBuy.addEventListener("click", () => runWalletAction(executeSnblPurchase));
$("#addSnblToWallet").addEventListener("click", () => runWalletAction(addSnblToWallet));
$("#consoleConnect").addEventListener("click", () => runWalletAction(async () => { sonicTerminal.focus(); await connectWalletForChain(currentPlan?.chain || flowChain.value, { close: false }); sonicTerminal.success("Wallet connected for the selected network."); }));
$("#consoleDeploy").addEventListener("click", () => runWalletAction(launchWithWallet));
$("#consolePair").addEventListener("click", () => runWalletAction(() => pairWithWallet({ tokenAmount: pairTokenAmount.value, quoteAmount: pairQuoteAmount.value })));
$("#clearConsole").addEventListener("click", () => sonicTerminal.clear());
applyChainDefaults();

launchFlow.addEventListener("submit", (event) => {
  event.preventDefault();
  if (flowReview.hidden) {
    if (flowStep === TOTAL_FLOW_STEPS - 1) buildPlan();
    else if (validateCurrentStep()) showFlowStep(flowStep + 1);
  }
});
flowNext.addEventListener("click", () => {
  if (flowStep === TOTAL_FLOW_STEPS - 1) buildPlan();
  else if (validateCurrentStep()) showFlowStep(flowStep + 1);
});
flowBack.addEventListener("click", () => showFlowStep(flowStep - 1));
$("#backToFlow").addEventListener("click", () => showFlowStep(TOTAL_FLOW_STEPS - 1));
$("#openListing").addEventListener("click", () => { listingDetails.hidden = false; listingDetails.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
$("#cancelListing").addEventListener("click", () => { listingDetails.hidden = true; });
$("#publishCreation").addEventListener("click", publishCreation);
listingRoom.addEventListener("input", updateReview);
launchFlow.addEventListener("input", updateSmartNudge);
launchFlow.addEventListener("change", updateSmartNudge);
$("#refreshCreations").addEventListener("click", fetchCreations);

$("#createRoom").addEventListener("click", createRoom);
$("#joinRoom").addEventListener("click", () => joinRoom());
messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const body = messageInput.value.trim();
  if (!body || socket?.readyState !== WebSocket.OPEN) return;
  sendRoomEvent({ type: "message", body });
  messageInput.value = "";
});
shareRoomButton.addEventListener("click", shareRoom);
voiceCallButton.addEventListener("click", () => startMedia("voice"));
videoCallButton.addEventListener("click", () => startMedia("video"));
muteButton.addEventListener("click", () => {
  const track = localStream?.getAudioTracks()[0];
  if (!track) return;
  muted = !muted;
  track.enabled = !muted;
  updateCallControls();
  showToast(muted ? "Microphone muted." : "Microphone live.");
});
cameraButton.addEventListener("click", () => {
  const track = localStream?.getVideoTracks()[0];
  if (!track) return;
  cameraOff = !cameraOff;
  track.enabled = !cameraOff;
  updateCallControls();
  showToast(cameraOff ? "Camera paused." : "Camera live.");
});
endCallButton.addEventListener("click", () => stopMedia());

const roomFromHash = new URLSearchParams(location.hash.slice(1)).get("room");
if (roomFromHash) {
  roomName.value = roomFromHash;
  setTimeout(() => joinRoom(roomFromHash), 250);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstall = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = undefined;
  installButton.hidden = true;
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

fetchCreations();
loadDirectWalletConfig();
