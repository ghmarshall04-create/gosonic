#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=../lib/common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../lib/common.sh"
load_local_env
need cast

CHAIN="$(require_arg --chain "$@")"
TOKEN_A="$(require_arg --token-a "$@")"
TOKEN_B="$(require_arg --token-b "$@")"
ROUTER="$(require_arg --router "$@")"
AMOUNT_A="$(require_arg --amount-a-base "$@")"
AMOUNT_B="$(require_arg --amount-b-base "$@")"
RECIPIENT="$(require_arg --recipient "$@")"
MIN_A="$(arg_value --min-a-base "$@" || printf '0')"
MIN_B="$(arg_value --min-b-base "$@" || printf '0')"
DEADLINE="$(arg_value --deadline "$@" || date -u -v+20M +%s 2>/dev/null || date -u -d '+20 minutes' +%s)"

valid_chain "$CHAIN" || fail "Unsupported EVM chain: $CHAIN"
for address in "$TOKEN_A" "$TOKEN_B" "$ROUTER" "$RECIPIENT"; do valid_evm_address "$address" || fail "One address is invalid"; done
for amount in "$AMOUNT_A" "$AMOUNT_B" "$MIN_A" "$MIN_B"; do [[ "$amount" =~ ^[0-9]+$ ]] || fail "Amounts must be base-unit integers"; done

RPC_ENV="$(chain_field "$CHAIN" rpcEnv)"
RPC_URL="$(require_env "$RPC_ENV")"
PRIVATE_KEY="$(require_env SONICBLAST_EVM_PRIVATE_KEY)"
assert_evm_chain "$CHAIN" "$RPC_URL"
assert_contract_code "$ROUTER" "$RPC_URL"

printf 'Approving token A…\n'
cast send "$TOKEN_A" "approve(address,uint256)" "$ROUTER" "$AMOUNT_A" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
printf 'Approving token B…\n'
cast send "$TOKEN_B" "approve(address,uint256)" "$ROUTER" "$AMOUNT_B" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
printf 'Adding pair liquidity…\n'
cast send "$ROUTER" "addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)" \
  "$TOKEN_A" "$TOKEN_B" "$AMOUNT_A" "$AMOUNT_B" "$MIN_A" "$MIN_B" "$RECIPIENT" "$DEADLINE" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
printf '\nLiquidity transaction submitted.\n'
