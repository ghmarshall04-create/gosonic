export const PROJECT_REFERENCE = "0x018ea8d2f38f696b2d201a01e5cd04f6272742b7";

export const SUPPORTED_CHAINS = Object.freeze({
  ethereum: { label: "Ethereum", family: "evm", chainId: 1 },
  base: { label: "Base", family: "evm", chainId: 8453 },
  arbitrum: { label: "Arbitrum One", family: "evm", chainId: 42161 },
  optimism: { label: "Optimism", family: "evm", chainId: 10 },
  polygon: { label: "Polygon", family: "evm", chainId: 137 },
  bsc: { label: "BNB Chain", family: "evm", chainId: 56 },
  avalanche: { label: "Avalanche C-Chain", family: "evm", chainId: 43114 },
  solana: { label: "Solana", family: "solana", cluster: "mainnet-beta" }
});

const allowedName = /^[\p{L}\p{N}][\p{L}\p{N} .,'&!_-]{1,63}$/u;
const allowedSymbol = /^[A-Z0-9]{2,12}$/;
const integer = /^(0|[1-9]\d*)$/;
const decimal = /^(0|[1-9]\d*)(\.\d{1,18})?$/;
const evmAddress = /^0x[a-fA-F0-9]{40}$/;
const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function text(value) {
  return String(value ?? "").trim();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function normalizeLaunchInput(input) {
  const chain = text(input.chain).toLowerCase();
  const chainConfig = SUPPORTED_CHAINS[chain];
  assert(chainConfig, "Choose a supported chain.");

  const name = text(input.name);
  const symbol = text(input.symbol).toUpperCase();
  const supply = text(input.supply);
  const ownerAddress = text(input.ownerAddress);
  const decimals = Number(text(input.decimals || (chainConfig.family === "solana" ? 9 : 18)));
  const liquidityAmount = text(input.liquidityAmount);
  const liquidityMode = text(input.liquidityMode || "native").toLowerCase();
  const quoteAsset = text(input.quoteAsset || (chainConfig.family === "solana" ? "SOL" : "Native asset"));
  const metadataUri = text(input.metadataUri);

  assert(allowedName.test(name), "Token name must be 2–64 letters, numbers, or simple punctuation.");
  assert(allowedSymbol.test(symbol), "Symbol must use 2–12 uppercase letters or numbers.");
  assert(integer.test(supply) && supply !== "0", "Supply must be a whole number greater than zero.");
  assert(Number.isInteger(decimals) && decimals >= 0 && decimals <= 18, "Decimals must be a whole number from 0 through 18.");
  assert(decimal.test(liquidityAmount) && Number(liquidityAmount) > 0, "Liquidity amount must be greater than zero.");
  assert(["native", "stable"].includes(liquidityMode), "Choose the network token or a stablecoin.");
  assert(quoteAsset.length >= 2 && quoteAsset.length <= 32, "Choose a quote asset.");
  if (metadataUri) {
    let parsed;
    try { parsed = new URL(metadataUri); } catch { throw new Error("Metadata URI must be a complete https URL."); }
    assert(parsed.protocol === "https:", "Metadata URI must use https.");
  }
  if (chainConfig.family === "evm") {
    assert(evmAddress.test(ownerAddress), "Enter a valid EVM owner address.");
  } else {
    assert(solanaAddress.test(ownerAddress), "Enter a valid Solana owner address.");
  }

  return { chain, chainConfig, name, symbol, supply, decimals, ownerAddress, liquidityAmount, liquidityMode, quoteAsset, metadataUri };
}

export function buildLaunchIntelligence(input) {
  const launch = input?.chainConfig ? input : normalizeLaunchInput(input);
  const isStablePair = launch.liquidityMode === "stable";
  const metadataIncluded = Boolean(launch.metadataUri);
  const liquidityLane = launch.chainConfig.family === "solana"
    ? "DEX adapter handoff"
    : isStablePair ? "ERC-20 pair handoff" : "native-asset handoff";
  const signals = [
    {
      state: "ready",
      label: "Chain lane confirmed",
      detail: `${launch.chainConfig.label} is set with ${launch.decimals} token decimals and a valid public recipient format.`
    },
    {
      state: "ready",
      label: isStablePair ? "Stable pair selected" : "Network token selected",
      detail: isStablePair
        ? `${launch.quoteAsset} is the quoted asset. Confirm its approved address and base-unit amount in the local runner.`
        : `${launch.quoteAsset} is the network token for this launch. Confirm the selected venue before the local liquidity step.`
    },
    {
      state: "ready",
      label: "Local execution staged",
      detail: `${liquidityLane} is prepared after token creation. Signing material stays outside the browser.`
    },
    {
      state: metadataIncluded ? "ready" : "optional",
      label: metadataIncluded ? "Metadata URI attached" : "Metadata can be added",
      detail: metadataIncluded
        ? "The metadata URI passed HTTPS validation."
        : "A metadata URI is optional now and can be added before the final launch workflow."
    }
  ];
  const score = metadataIncluded ? 100 : 88;
  return {
    score,
    label: score === 100 ? "Launch profile complete" : "Launch profile ready",
    summary: isStablePair
      ? `${launch.chainConfig.label} + ${launch.quoteAsset} is staged as a stablecoin pair. Review the local address and unit requirements next.`
      : `${launch.chainConfig.label} + ${launch.quoteAsset} is staged as a native-token pair. Review the local venue requirements next.`,
    nextAction: isStablePair
      ? `Add the reviewed ${launch.quoteAsset} address and base-unit amount in the runner after deployment.`
      : "Set the reviewed router or program in the local runner after deployment.",
    signals
  };
}

export function buildLaunchPlan(input) {
  const launch = normalizeLaunchInput(input);
  const base = "./runner/bin/sonicblast.mjs";
  const values = [
    `--chain ${shellQuote(launch.chain)}`,
    `--name ${shellQuote(launch.name)}`,
    `--symbol ${shellQuote(launch.symbol)}`,
    `--supply ${shellQuote(launch.supply)}`,
    `--decimals ${shellQuote(launch.decimals)}`,
    `--owner ${shellQuote(launch.ownerAddress)}`
  ];

  const commands = [];
  let liquidityCommand;
  if (launch.chainConfig.family === "evm") {
    commands.push(`${base} evm:create ${values.join(" ")}`);
    liquidityCommand = launch.liquidityMode === "stable"
      ? `${base} evm:add-v2-erc20 --chain ${shellQuote(launch.chain)} --token-a <DEPLOYED_TOKEN_ADDRESS> --token-b <${launch.quoteAsset}_TOKEN_ADDRESS> --router <APPROVED_V2_ROUTER> --amount-a-base <TOKEN_BASE_UNITS> --amount-b-base <${launch.quoteAsset}_BASE_UNITS> --recipient ${shellQuote(launch.ownerAddress)}`
      : `${base} evm:add-v2-native --chain ${shellQuote(launch.chain)} --token <DEPLOYED_TOKEN_ADDRESS> --router <APPROVED_V2_ROUTER> --token-amount-base <TOKEN_BASE_UNITS> --native-amount ${shellQuote(`${launch.liquidityAmount}ether`)} --recipient ${shellQuote(launch.ownerAddress)}`;
  } else {
    const metadata = launch.metadataUri ? ` --metadata-uri ${shellQuote(launch.metadataUri)}` : "";
    commands.push(`${base} solana:create --cluster ${shellQuote(launch.chainConfig.cluster)} --name ${shellQuote(launch.name)} --symbol ${shellQuote(launch.symbol)} --supply ${shellQuote(launch.supply)} --decimals ${shellQuote(launch.decimals)} --owner ${shellQuote(launch.ownerAddress)}${metadata}`);
    liquidityCommand = `${base} solana:liquidity-plan --cluster ${shellQuote(launch.chainConfig.cluster)} --mint <CREATED_MINT_ADDRESS> --quote ${shellQuote(launch.quoteAsset)} --amount ${shellQuote(launch.liquidityAmount)} --owner ${shellQuote(launch.ownerAddress)}`;
  }

  return {
    projectReference: PROJECT_REFERENCE,
    status: "review_required",
    chain: launch.chain,
    chainLabel: launch.chainConfig.label,
    token: { name: launch.name, symbol: launch.symbol, supply: launch.supply, decimals: launch.decimals, ownerAddress: launch.ownerAddress },
    liquidity: { mode: launch.liquidityMode, amount: launch.liquidityAmount, quoteAsset: launch.quoteAsset },
    intelligence: buildLaunchIntelligence(launch),
    commands,
    liquidityCommand,
    checklist: [
      "Confirm the public owner address and token supply.",
      "Set the correct local RPC URL and signing method in runner/.env.",
      launch.liquidityMode === "stable" ? `Confirm the approved ${launch.quoteAsset} token or mint address and its base-unit amount.` : "Verify the selected DEX router or program before adding liquidity.",
      "Run the command on a testnet or local fork before a mainnet transaction."
    ],
    localOnly: true
  };
}
