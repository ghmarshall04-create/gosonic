#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=../lib/common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/../lib/common.sh"
load_local_env
need cast

CHAIN="$(require_arg --chain "$@")"
ROUTER="$(arg_value --router "$@" || true)"
valid_chain "$CHAIN" || fail "Unsupported EVM chain: $CHAIN"
RPC_ENV="$(chain_field "$CHAIN" rpcEnv)"
RPC_URL="$(require_env "$RPC_ENV")"
assert_evm_chain "$CHAIN" "$RPC_URL"
printf '✓ %s RPC chain id matches profile\n' "$CHAIN"
if [[ -n "$ROUTER" ]]; then
  valid_evm_address "$ROUTER" || fail "Router address is invalid"
  assert_contract_code "$ROUTER" "$RPC_URL"
  printf '✓ router has deployed contract code\n'
fi
