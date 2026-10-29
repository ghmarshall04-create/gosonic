#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=../lib/common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../lib/common.sh"
load_local_env
need forge

CHAIN="$(require_arg --chain "$@")"
NAME="$(require_arg --name "$@")"
SYMBOL="$(require_arg --symbol "$@")"
SUPPLY="$(require_arg --supply "$@")"
DECIMALS="$(require_arg --decimals "$@")"
OWNER="$(require_arg --owner "$@")"
valid_chain "$CHAIN" || fail "Unsupported EVM chain: $CHAIN"
[[ ${#NAME} -ge 2 && ${#NAME} -le 64 ]] || fail "Token name must be 2–64 characters"
valid_symbol "$SYMBOL" || fail "Token symbol must use 2–12 uppercase letters/numbers"
valid_integer "$SUPPLY" || fail "Supply must be a whole number greater than zero"
[[ "$DECIMALS" =~ ^([0-9]|1[0-8])$ ]] || fail "Decimals must be between 0 and 18"
valid_evm_address "$OWNER" || fail "Owner must be a valid EVM address"

RPC_ENV="$(chain_field "$CHAIN" rpcEnv)"
RPC_URL="$(require_env "$RPC_ENV")"
PRIVATE_KEY="$(require_env SONICBLAST_EVM_PRIVATE_KEY)"

printf 'Building fixed-supply SonicBlast token…\n'
(
  cd "$PROJECT_ROOT/contracts/evm"
  forge build
  forge create src/SonicBlastToken.sol:SonicBlastToken \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --constructor-args "$NAME" "$SYMBOL" "$DECIMALS" "$SUPPLY" "$OWNER"
)
printf '\nDeployment submitted. Save the returned contract address before running liquidity commands.\n'
