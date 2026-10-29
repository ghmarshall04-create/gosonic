#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=../lib/common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../lib/common.sh"
load_local_env
need cast

CHAIN="$(require_arg --chain "$@")"
TOKEN="$(require_arg --token "$@")"
ROUTER="$(require_arg --router "$@")"
TOKEN_AMOUNT="$(require_arg --token-amount-base "$@")"
NATIVE_AMOUNT="$(require_arg --native-amount "$@")"
RECIPIENT="$(require_arg --recipient "$@")"
TOKEN_MIN="$(arg_value --token-min-base "$@" || printf '0')"
NATIVE_MIN="$(arg_value --native-min "$@" || printf '0')"
DEADLINE="$(arg_value --deadline "$@" || date -u -v+20M +%s 2>/dev/null || date -u -d '+20 minutes' +%s)"

valid_chain "$CHAIN" || fail "Unsupported EVM chain: $CHAIN"
valid_evm_address "$TOKEN" || fail "Token address is invalid"
valid_evm_address "$ROUTER" || fail "Router address is invalid"
valid_evm_address "$RECIPIENT" || fail "Recipient is invalid"
valid_integer "$TOKEN_AMOUNT" || fail "Token amount must be base units greater than zero"
[[ "$TOKEN_MIN" =~ ^[0-9]+$ ]] || fail "Token minimum must be base units"
[[ "$NATIVE_MIN" =~ ^[0-9]+$ ]] || fail "Native minimum must be wei"
[[ "$NATIVE_AMOUNT" =~ ^[0-9]+(\.[0-9]+)?(wei|gwei|ether)$ ]] || fail "Native amount must include wei, gwei, or ether (example: 0.2ether)"

RPC_ENV="$(chain_field "$CHAIN" rpcEnv)"
RPC_URL="$(require_env "$RPC_ENV")"
PRIVATE_KEY="$(require_env SONICBLAST_EVM_PRIVATE_KEY)"
assert_evm_chain "$CHAIN" "$RPC_URL"
assert_contract_code "$ROUTER" "$RPC_URL"

printf 'Step 1/2: approving the selected V2 router…\n'
cast send "$TOKEN" "approve(address,uint256)" "$ROUTER" "$TOKEN_AMOUNT" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
printf 'Step 2/2: adding native-asset liquidity…\n'
cast send "$ROUTER" "addLiquidityETH(address,uint256,uint256,uint256,address,uint256)" \
  "$TOKEN" "$TOKEN_AMOUNT" "$TOKEN_MIN" "$NATIVE_MIN" "$RECIPIENT" "$DEADLINE" \
  --value "$NATIVE_AMOUNT" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
printf '\nLiquidity transaction submitted. Confirm the transaction and resulting pool on the selected chain explorer.\n'
