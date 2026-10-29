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
let snblBuyUrl = "";
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

function shortAddress(value = "") {
  if (value.length <= 13) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
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
    ? `Pair your new token with ${activeAsset}. The local runner will require the approved ${activeAsset} contract or mint address and base-unit amount.`
    : `Pair your new token with ${profile.native}. The local runner will require the selected venue and token base units before adding liquidity.`;
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
    ["Chain-aware setup", `${chain} profile selected. Sonic IQ will keep the public address and runner lane aligned with this chain.`],
    ["Clear token identity", "A short name and recognizable symbol make the creation easy to find on the board and inside its room."],
    ["Fixed-supply check", "The total supply is passed to the fixed-supply contract or mint command. Review it before building the runner handoff."],
    ["Supply delivery", "Sonic IQ checks only the public recipient format. Signing material stays on the operator’s local device."],
    [activeLiquidityMode === "stable" ? "Stablecoin pair lane" : "Network-token pair lane", activeLiquidityMode === "stable" ? `${asset} is selected. The runner will require its reviewed address and exact base-unit amount.` : `${asset} is selected as the network token. The runner will use the native-asset liquidity lane after deployment.`],
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
}

function showLaunchModal() {
  launchModal.classList.add("open");
  launchModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const focusTarget = flowReview.hidden ? flowSteps[flowStep]?.querySelector("input, select") : $("#downloadCommand");
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

async function loadMarketConfig() {
  try {
    const response = await fetch("/api/market-config");
    const data = await response.json();
    if (response.ok && typeof data.snblBuyUrl === "string") snblBuyUrl = data.snblBuyUrl;
  } catch { /* The board remains available if a market configuration is absent. */ }
}

function buySNBL() {
  if (snblBuyUrl) {
    window.open(snblBuyUrl, "_blank", "noopener,noreferrer");
    return;
  }
  document.querySelector("#creations").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Set SNBL_BUY_URL in Cloudflare to activate the SNBL market link.");
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
  flowNext.innerHTML = flowStep === TOTAL_FLOW_STEPS - 1 ? "Build secure plan <span>→</span>" : "Continue <span>→</span>";
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
  flowNext.textContent = "Building plan…";
  try {
    const response = await fetch("/api/launch-intents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not build the launch plan.");
    currentPlan = data;
    updateReview();
    showReview();
  } catch (error) {
    setFieldMessage(error.message || "Could not build the launch plan.");
    flowNext.disabled = false;
    flowNext.innerHTML = "Build secure plan <span>→</span>";
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
  flowStepHint.textContent = "Review + publish";
  flowProgressBar.style.width = "100%";
  setFieldMessage();
}

function downloadRunnerFile() {
  if (!currentPlan) return;
  const body = [
    "#!/usr/bin/env bash",
    "# SonicBlast reviewed local runner handoff",
    "# This file contains no signing material. Configure runner/.env locally first.",
    "set -euo pipefail",
    "",
    "# Create the fixed-supply token",
    ...currentPlan.commands,
    "",
    "# After confirming the deployed address and selected venue, add liquidity:",
    currentPlan.liquidityCommand,
    ""
  ].join("\n");
  const href = URL.createObjectURL(new Blob([body], { type: "text/x-shellscript" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = `sonicblast-${currentPlan.chain}-${currentPlan.token.symbol.toLowerCase()}-runner.sh`;
  link.click();
  URL.revokeObjectURL(href);
  showToast("Reviewed runner file downloaded.");
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
window.addEventListener("keydown", (event) => { if (event.key === "Escape" && launchModal.classList.contains("open")) closeLaunch(); });
flowChain.addEventListener("change", applyChainDefaults);
nativeAssetToggle.addEventListener("click", () => setLiquidityMode("native"));
stableAssetToggle.addEventListener("click", () => setLiquidityMode("stable"));
buySNBLButton.addEventListener("click", buySNBL);
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
$("#downloadCommand").addEventListener("click", downloadRunnerFile);
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
loadMarketConfig();
